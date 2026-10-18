"""
Browser checks for the startup splash. Run against an ISOLATED server (tests/e2e/run_isolated.sh).
Covers: first paint, single loader, lift-after-ready, slow network, failed session check,
failed homepage catalogue, 12s ceiling, direct visits, logged-in session, reload, reduced motion,
no-JavaScript fallback, and mobile/tablet/desktop layout.
Requests are held with Playwright routing so each state is deterministic. Nothing is shown as a product.
"""
import os, sys, uuid
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get("BASE_URL", "http://localhost:3000")
SHOTS = os.environ.get("SHOTS_DIR", "/tmp/shots")
os.makedirs(SHOTS, exist_ok=True)
RUN = uuid.uuid4().hex[:6]
EMAIL = f"loader_{RUN}@example.com"
PASSWORD = "Loader1pass"
results, errors = [], []


def check(name, fn):
    try:
        fn()
        results.append((name, "PASS"))
        print(f"PASS  {name}")
    except Exception as e:
        results.append((name, "FAIL"))
        print(f"FAIL  {name}: {str(e)[:320]}")


def hold(page, pattern, store):
    """Holds matching requests open. Call release(store) to let them through."""
    def handler(route):
        store.append(route)
    page.route(pattern, handler)


def release(store):
    # unroute() already completes pending routes in Playwright, so a route may be handled; ignore that.
    while store:
        try:
            store.pop().continue_()
        except Exception:
            pass


def is_action(name):
    return lambda req: req.method == "POST" and f'"{name}"' in (req.post_data or "")


def splash_state(page):
    return page.evaluate("""() => {
        const s = document.getElementById('shopdigo-splash');
        if (!s) return { exists: false };
        const cs = getComputedStyle(s);
        return { exists: true, display: cs.display, visibility: cs.visibility, opacity: parseFloat(cs.opacity),
                 boot: document.documentElement.dataset.boot || '' };
    }""")


def wait_lifted(page, timeout=20000):
    page.wait_for_function("document.documentElement.dataset.boot === 'done'", timeout=timeout)
    page.wait_for_timeout(700)  # fade-out is 0.45s
    st = splash_state(page)
    assert st["visibility"] == "hidden" or st["display"] == "none", f"splash still visible after boot: {st}"


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()

        # ── 1. Desktop: first paint, single loader, lifts when ready ──
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        page = ctx.new_page()
        page.set_default_timeout(15000)
        page.on("pageerror", lambda e: errors.append(str(e)))

        def single_loader_and_first_paint():
            held = []
            hold(page, "**/api/auth/me", held)
            page.goto(BASE + "/", wait_until="commit")
            page.wait_for_timeout(500)
            st = splash_state(page)
            assert st["exists"] and st["visibility"] == "visible" and st["opacity"] > 0.5, f"splash not showing: {st}"
            assert page.locator("#shopdigo-splash").count() == 1, "duplicate splash"
            assert page.get_by_text("Preparing your shopping experience...").count() == 1, "duplicate splash text"
            assert page.locator("#shopdigo-splash .splash-mark").is_visible(), "logo missing"
            assert page.locator("#shopdigo-splash .splash-bar").is_visible(), "progress bar missing"
            page.screenshot(path=f"{SHOTS}/loader-desktop-start.png")
            page.unroute("**/api/auth/me")
            release(held)
            wait_lifted(page)
            page.screenshot(path=f"{SHOTS}/loader-desktop-home.png")
        check("desktop: splash shows on first paint, single instance, lifts after session check", single_loader_and_first_paint)

        def no_artificial_delay():
            import time
            ctx2 = browser.new_context(viewport={"width": 1440, "height": 900})
            p2 = ctx2.new_page()
            p2.set_default_timeout(15000)
            t0 = time.time()
            p2.goto(BASE + "/login", wait_until="domcontentloaded")
            p2.wait_for_function("document.documentElement.dataset.boot === 'done'", timeout=15000)
            elapsed = time.time() - t0
            assert elapsed < 6, f"boot took {elapsed:.1f}s on a local server (should not add artificial delay)"
            ctx2.close()
        check("no artificial delay: a ready page lifts the splash quickly", no_artificial_delay)

        # ── 2. Slow network: splash stays, then the 'still connecting' line appears ──
        def slow_catalogue_shows_slow_text():
            held = []
            hold(page, "**/api/action", held)
            page.goto(BASE + "/", wait_until="commit")
            page.wait_for_timeout(1500)
            assert splash_state(page)["visibility"] == "visible", "splash should stay while homepage data is pending"
            page.wait_for_timeout(3000)
            slow = page.locator(".splash-slow")
            op = page.evaluate("() => parseFloat(getComputedStyle(document.querySelector('.splash-slow')).opacity)")
            assert op > 0.5, f"'still connecting' text not visible after 4s (opacity {op})"
            page.screenshot(path=f"{SHOTS}/loader-slow.png")
            page.unroute("**/api/action")
            release(held)
            wait_lifted(page)
            expect(page.get_by_text("Shop by category").first).to_be_visible()
        check("slow network: splash holds until the catalogue arrives, then lifts", slow_catalogue_shows_slow_text)

        # ── 3. Failed session check: page still appears with a notice and retry ──
        def failed_session_shows_notice_not_blank():
            page.route("**/api/auth/me", lambda route: route.abort())
            page.goto(BASE + "/", wait_until="domcontentloaded")
            wait_lifted(page)
            note = page.get_by_role("status").filter(has_text="We could not load your account details")
            expect(note).to_be_visible()
            assert page.get_by_text("Shop by category").count() >= 1, "homepage hidden by a failed session check"
            page.screenshot(path=f"{SHOTS}/loader-auth-failed.png")
            page.unroute("**/api/auth/me")
            page.get_by_role("button", name="Try again").click()
            expect(page.get_by_role("status").filter(has_text="We could not load your account details")).to_have_count(0, timeout=15000)
        check("failed session check: homepage stays visible, notice appears, retry clears it", failed_session_shows_notice_not_blank)

        # ── 4. Failed homepage catalogue: error with retry, splash lifted ──
        def failed_catalogue_shows_retry():
            page.route("**/api/action", lambda route: route.abort() if '"catalog.home"' in (route.request.post_data or "") else route.continue_())
            page.goto(BASE + "/", wait_until="domcontentloaded")
            wait_lifted(page)
            expect(page.get_by_role("heading", name="We could not load the store")).to_be_visible()
            page.unroute("**/api/action")
            page.get_by_role("button", name="Try again").click()
            expect(page.get_by_role("heading", name="We could not load the store")).to_have_count(0, timeout=15000)
            expect(page.get_by_text("Shop by category").first).to_be_visible()
        check("failed homepage request: splash lifts, error shows a retry, retry recovers", failed_catalogue_shows_retry)

        # ── 5. Direct visits to other routes do not wait for the homepage catalogue ──
        def direct_visit_routes():
            for path in ["/login", "/register", "/cart", "/search?q=test"]:
                held = []
                hold(page, "**/api/action", held)
                page.goto(BASE + path, wait_until="domcontentloaded")
                page.wait_for_function("document.documentElement.dataset.boot === 'done'", timeout=15000)
                page.unroute("**/api/action")
                release(held)
                assert page.url.startswith(BASE), f"unexpected url {page.url}"
        check("direct visits to other pages lift the splash without waiting for the homepage catalogue", direct_visit_routes)

        ctx.close()

        # ── 6. Logged-in session: direct visit, refresh and header counts ──
        ctx3 = browser.new_context(viewport={"width": 1280, "height": 800})
        s = ctx3.new_page()
        s.set_default_timeout(15000)
        s.on("pageerror", lambda e: errors.append(str(e)))

        def logged_in_direct_and_refresh():
            s.goto(BASE + "/register", wait_until="networkidle")
            s.fill("#name", f"Loader Tester {RUN}")
            s.fill("#email", EMAIL)
            s.fill("#password", PASSWORD)
            s.check("#terms")
            s.get_by_role("button", name="Create account", exact=True).click()
            s.wait_for_url(BASE + "/", timeout=20000)
            wait_lifted(s)
            s.goto(BASE + "/cart", wait_until="domcontentloaded")
            wait_lifted(s)
            expect(s.get_by_role("link", name="Cart")).to_be_visible()
            s.reload(wait_until="domcontentloaded")
            wait_lifted(s)
            assert s.locator("#shopdigo-splash").count() == 1, "splash duplicated after refresh"
            expect(s.get_by_role("link", name="Cart")).to_be_visible()
            s.screenshot(path=f"{SHOTS}/loader-logged-in.png")
        check("logged-in session: direct visit and refresh both lift the splash and keep the session", logged_in_direct_and_refresh)

        def no_splash_on_client_navigation():
            s.goto(BASE + "/", wait_until="networkidle")
            wait_lifted(s)
            s.get_by_role("link", name="Electronics").first.click()
            s.wait_for_url("**/search**", timeout=15000)
            st = splash_state(s)
            assert st["visibility"] == "hidden" or st["display"] == "none", f"splash reappeared on client navigation: {st}"
        check("client-side navigation does not show the splash again", no_splash_on_client_navigation)
        ctx3.close()

        # ── 7. Mobile and tablet layout ──
        for name, size, mobile in [("mobile", (390, 844), True), ("tablet", (820, 1180), False)]:
            c = browser.new_context(viewport={"width": size[0], "height": size[1]}, is_mobile=mobile, has_touch=mobile)
            m = c.new_page()
            m.set_default_timeout(15000)
            def layout(m=m, name=name, c=c):
                held = []
                hold(m, "**/api/auth/me", held)
                m.goto(BASE + "/", wait_until="commit")
                m.wait_for_timeout(600)
                box = m.locator("#shopdigo-splash .splash-stage").bounding_box()
                assert box and box["width"] <= size[0] + 1, f"{name}: splash content overflows"
                m.screenshot(path=f"{SHOTS}/loader-{name}.png")
                m.unroute("**/api/auth/me")
                release(held)
                wait_lifted(m)
                ov = m.evaluate("document.documentElement.scrollWidth > window.innerWidth + 1")
                assert not ov, f"{name}: horizontal overflow after load"
            check(f"{name}: splash fits the screen and the page loads without overflow", layout)
            c.close()

        # ── 8. Reduced motion ──
        rm = browser.new_context(viewport={"width": 1280, "height": 800}, reduced_motion="reduce")
        r = rm.new_page()
        r.set_default_timeout(15000)
        def reduced():
            r.goto(BASE + "/login", wait_until="domcontentloaded")
            r.wait_for_timeout(300)
            info = r.evaluate("""() => ({
              sweep: getComputedStyle(document.querySelector('.splash-sweep')).display,
              bar: getComputedStyle(document.querySelector('.splash-bar span')).animationName,
            })""")
            assert info["sweep"] == "none", f"sweep should be off under reduced motion: {info}"
            assert info["bar"] == "none", f"progress animation should stop under reduced motion: {info}"
            wait_lifted(r)
        check("reduced motion: sweep and bar animation stop, splash still lifts", reduced)
        rm.close()

        # ── 9. No JavaScript: splash is hidden so the page is readable ──
        nj = browser.new_context(viewport={"width": 1280, "height": 800}, java_script_enabled=False)
        n = nj.new_page()
        def no_js():
            n.goto(BASE + "/login", wait_until="domcontentloaded")
            disp = n.evaluate("() => getComputedStyle(document.getElementById('shopdigo-splash')).display")
            assert disp == "none", f"splash should be hidden without JavaScript, got {disp}"
        check("no JavaScript: splash is hidden and the page content is readable", no_js)
        nj.close()

        # ── 10. Ceiling: a request that never answers still reveals the page with a notice ──
        ceil = browser.new_context(viewport={"width": 1280, "height": 800})
        c2 = ceil.new_page()
        c2.set_default_timeout(20000)
        def ceiling():
            hang = []
            hold(c2, "**/api/auth/me", hang)
            c2.goto(BASE + "/login", wait_until="domcontentloaded")
            c2.wait_for_function("document.documentElement.dataset.boot === 'done'", timeout=20000)
            c2.wait_for_timeout(600)
            expect(c2.get_by_role("status").filter(has_text="This is taking longer than usual")).to_be_visible()
            expect(c2.get_by_role("heading", name="Log in to your account")).to_be_visible()
            c2.screenshot(path=f"{SHOTS}/loader-timeout.png")
        check("never-answering request: after 12s the page is shown with a notice, not a blank screen", ceiling)
        ceil.close()

        browser.close()

    real = [e for e in errors if "favicon" not in e and "Failed to load resource" not in e]
    if real:
        print("Uncaught page errors:")
        for e in real[:10]:
            print("  -", e)
    return real


if __name__ == "__main__":
    real_errors = run()
    failed = [r for r in results if r[1] == "FAIL"]
    print(f"\n{len(results) - len(failed)}/{len(results)} loader checks passed")
    sys.exit(1 if failed or real_errors else 0)
