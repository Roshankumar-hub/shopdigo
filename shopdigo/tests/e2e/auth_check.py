"""
Browser checks for the login and registration pages.
Run against an ISOLATED server (tests/e2e/run_isolated.sh). It creates only one test customer in the temp DB.
Checks: animations running, reduced-motion fallback, password toggle, validation, wrong password,
registration, login, layout order on mobile and desktop, mouse parallax, no horizontal overflow.
"""
import os, sys, time, uuid
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get("BASE_URL", "http://localhost:3000")
SHOTS = os.environ.get("SHOTS_DIR", "/tmp/shots")
os.makedirs(SHOTS, exist_ok=True)
RUN = uuid.uuid4().hex[:6]
EMAIL = f"auth_{RUN}@example.com"
PASSWORD = "Strong1pass"
results = []
errors = []

def check(name, fn):
    try:
        fn()
        results.append((name, "PASS"))
        print(f"PASS  {name}")
    except Exception as e:
        results.append((name, "FAIL"))
        print(f"FAIL  {name}: {str(e)[:300]}")

ANIMATED = """() => {
  const names = ['.auth-wave', '.auth-bob', '.auth-float', '.auth-twinkle'];
  return names.map(sel => {
    const el = document.querySelector(sel);
    if (!el) return [sel, 'missing'];
    return [sel, getComputedStyle(el).animationName];
  });
}"""

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        desktop = browser.new_context(viewport={"width": 1440, "height": 900})
        page = desktop.new_page()
        page.set_default_timeout(15000)
        page.on("pageerror", lambda e: errors.append(str(e)))

        def login_renders_and_animates():
            page.goto(BASE + "/login", wait_until="networkidle")
            expect(page.get_by_role("heading", name="Log in to your account")).to_be_visible()
            anims = page.evaluate(ANIMATED)
            for sel, name in anims:
                assert name not in ("none", "missing"), f"{sel} not animating: {name}"
            page.screenshot(path=f"{SHOTS}/auth-login-desktop.png")
        check("login page renders and characters/decorations are animating", login_renders_and_animates)

        def svg_left_of_form_on_desktop():
            svg = page.locator("svg[role=img][aria-label*='shoppers']").bounding_box()
            form = page.get_by_role("heading", name="Log in to your account").bounding_box()
            assert svg and form, "missing elements"
            assert svg["x"] < form["x"], f"illustration x={svg['x']} should be left of form x={form['x']}"
        check("desktop: illustration on the left, form on the right", svg_left_of_form_on_desktop)

        def password_toggle():
            pw = page.locator("#password")
            assert pw.get_attribute("type") == "password"
            page.get_by_role("button", name="Show password").click()
            assert pw.get_attribute("type") == "text"
            assert page.get_by_role("button", name="Hide password").get_attribute("aria-pressed") == "true"
            page.get_by_role("button", name="Hide password").click()
            assert pw.get_attribute("type") == "password"
        check("show/hide password toggle works and sets aria-pressed", password_toggle)

        def client_validation_blocks_submit():
            page.goto(BASE + "/login", wait_until="networkidle")
            requests = []
            page.on("request", lambda r: requests.append(r.url) if "/api/action" in r.url or "/api/auth/login" in r.url else None)
            page.get_by_role("button", name="Log in", exact=True).click()
            expect(page.get_by_text("Enter your email address.")).to_be_visible()
            expect(page.get_by_text("Enter your password.")).to_be_visible()
            page.fill("#email", "not-an-email")
            page.get_by_role("button", name="Log in", exact=True).click()
            expect(page.get_by_text("Enter a valid email address")).to_be_visible()
            assert not [u for u in requests if "/api/auth/login" in u], "login request was sent despite invalid input"
        check("login validation shows field errors and sends no request", client_validation_blocks_submit)

        def wrong_password_error():
            page.goto(BASE + "/login", wait_until="networkidle")
            page.fill("#email", "nobody@example.com")
            page.fill("#password", "wrongpass1")
            page.get_by_role("button", name="Log in", exact=True).click()
            expect(page.get_by_role("alert").filter(has_text="Invalid email or password")).to_be_visible()
            assert page.url.endswith("/login"), "should stay on the login page"
        check("wrong password shows the server error and stays on login", wrong_password_error)

        def register_validation():
            page.goto(BASE + "/register", wait_until="networkidle")
            expect(page.get_by_role("heading", name="Create your account")).to_be_visible()
            page.fill("#name", "A")
            page.fill("#email", "bad")
            page.fill("#phone", "12345")
            page.fill("#password", "abcdefgh")
            page.get_by_role("button", name="Create account", exact=True).click()
            expect(page.get_by_text("Enter your full name")).to_be_visible()
            expect(page.get_by_text("Enter a valid email address")).to_be_visible()
            expect(page.get_by_text("Enter a valid 10-digit Indian mobile number")).to_be_visible()
            expect(page.get_by_text("Use at least 8 characters, with a letter and a number.")).to_be_visible()
            expect(page.get_by_text("Please accept the Terms of Use")).to_be_visible()
            page.fill("#password", "abcdefg1")
            met = page.locator("#password-rules li.text-emerald-700").count()
            assert met == 3, f"expected 3 met password rules, got {met}"
        check("register validation shows every field error and live password checklist", register_validation)

        def register_success():
            page.fill("#name", f"Auth Tester {RUN}")
            page.fill("#email", EMAIL)
            page.fill("#phone", "98765 43210")
            page.fill("#password", PASSWORD)
            page.check("#terms")
            page.get_by_role("button", name="Create account", exact=True).click()
            page.wait_for_url(BASE + "/", timeout=20000)
            expect(page.get_by_role("link", name="Cart")).to_be_visible()
        check("registration creates an account and signs in", register_success)

        def login_success_then_next():
            ctx = browser.new_context(viewport={"width": 1440, "height": 900})
            p2 = ctx.new_page()
            p2.set_default_timeout(15000)
            p2.goto(BASE + "/login?next=%2Fcart", wait_until="networkidle")
            p2.fill("#email", EMAIL)
            p2.fill("#password", PASSWORD)
            p2.get_by_role("button", name="Log in", exact=True).click()
            p2.wait_for_url(BASE + "/cart", timeout=20000)
            ctx.close()
        check("login with a valid account honours ?next=", login_success_then_next)

        def parallax_on_desktop():
            page.goto(BASE + "/login", wait_until="networkidle")
            page.mouse.move(100, 100)
            page.mouse.move(1300, 800, steps=12)
            page.wait_for_timeout(700)
            val = page.evaluate("() => document.querySelector('.auth-parallax').style.getPropertyValue('--auth-px')")
            assert val not in ("", None), "parallax variable was not set by pointer movement"
        check("desktop mouse parallax responds to pointer movement", parallax_on_desktop)

        def no_overflow_desktop():
            for path in ["/login", "/register"]:
                page.goto(BASE + path, wait_until="networkidle")
                ov = page.evaluate("document.documentElement.scrollWidth > window.innerWidth + 1")
                assert not ov, f"{path} overflows horizontally on desktop"
        check("desktop: no horizontal overflow", no_overflow_desktop)

        desktop.close()

        # ── Mobile: form first, smaller illustration after it ──
        mobile = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
        m = mobile.new_page()
        m.set_default_timeout(15000)
        m.on("pageerror", lambda e: errors.append(str(e)))

        def mobile_layout():
            for path in ["/login", "/register"]:
                m.goto(BASE + path, wait_until="networkidle")
                form = m.locator("h1").first.bounding_box()
                art = m.locator("svg[role=img][aria-label*='shoppers']").bounding_box()
                assert form and art, f"{path}: missing form or illustration"
                assert form["y"] < art["y"], f"{path}: form should come before illustration on mobile"
                assert art["width"] <= 320, f"{path}: illustration too large on mobile ({art['width']}px)"
                ov = m.evaluate("document.documentElement.scrollWidth > window.innerWidth + 1")
                assert not ov, f"{path} overflows horizontally on mobile"
                m.screenshot(path=f"{SHOTS}/auth-{path.strip('/')}-mobile.png", full_page=True)
        check("mobile: form first, smaller illustration, no overflow", mobile_layout)

        def mobile_tap_targets():
            m.goto(BASE + "/login", wait_until="networkidle")
            box = m.get_by_role("button", name="Show password").bounding_box()
            assert box and box["width"] >= 40 and box["height"] >= 40, f"show/hide target too small: {box}"
            btn = m.get_by_role("button", name="Log in", exact=True).bounding_box()
            assert btn and btn["height"] >= 44, f"login button below 44px: {btn}"
        check("mobile: touch targets are at least 40-44px", mobile_tap_targets)
        mobile.close()

        # ── Reduced motion: animations stop, layout stays readable ──
        rm = browser.new_context(viewport={"width": 1280, "height": 800}, reduced_motion="reduce")
        r = rm.new_page()
        r.set_default_timeout(15000)
        def reduced_motion():
            r.goto(BASE + "/login", wait_until="networkidle")
            r.wait_for_timeout(300)
            dur = r.evaluate("() => getComputedStyle(document.querySelector('.auth-wave')).animationDuration")
            secs = float(dur.replace('s', '')) if dur.endswith('s') and 'ms' not in dur else float(dur.replace('ms', '')) / 1000
            assert secs <= 0.001, f"reduced motion should cut animation duration, got {dur}"
            expect(r.get_by_role("heading", name="Log in to your account")).to_be_visible()
        check("reduced motion: animations are cut to instant and the form still renders", reduced_motion)
        rm.close()

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
    print(f"\n{len(results) - len(failed)}/{len(results)} auth checks passed")
    sys.exit(1 if failed or real_errors else 0)
