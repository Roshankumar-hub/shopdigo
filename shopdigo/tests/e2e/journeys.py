"""
UI journey smoke tests (Playwright, Python). Run against a running server:
    BASE_URL=http://localhost:3000 python3 tests/e2e/journeys.py
Requires: pip install playwright && python -m playwright install chromium
"""
import os, sys, time, random, string
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get("BASE_URL", "http://localhost:3000")
PRODUCT_SLUG = os.environ.get("FIX_PRODUCT_SLUG", "")
PRODUCT_NAME = os.environ.get("FIX_PRODUCT_NAME", "")
SELLER_EMAIL = os.environ.get("FIX_SELLER_EMAIL", "")
SELLER_PASSWORD = os.environ.get("FIX_SELLER_PASSWORD", "")
STORE = os.environ.get("FIX_STORE", "")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")
if not (PRODUCT_SLUG and SELLER_EMAIL and ADMIN_EMAIL):
    sys.exit("Run through tests/e2e/run_isolated.sh so TEST FIXTURE data is created in an isolated DB.")
RUN = "".join(random.choices(string.ascii_lowercase, k=6))
errors = []
results = []

def check(name, fn):
    try:
        fn()
        results.append((name, "PASS", ""))
        print(f"PASS  {name}")
    except Exception as e:  # noqa
        results.append((name, "FAIL", str(e)[:300]))
        print(f"FAIL  {name}: {str(e)[:300]}")

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={"width": 1280, "height": 900})
        page = ctx.new_page()
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.set_default_timeout(15000)

        def home():
            page.goto(BASE + "/")
            expect(page.get_by_text("Shop by category")).to_be_visible()
            expect(page.locator("a[href^='/product/']").first).to_be_visible()
        check("home page renders featured products and categories", home)

        def search_filter():
            page.goto(BASE + "/search?category=electronics")
            expect(page.get_by_text("products", exact=False).first).to_be_visible()
            page.select_option("#sort", "price_low")
            page.wait_for_url("**sort=price_low**")
            expect(page.locator("a[href^='/product/']").first).to_be_visible()
        check("search: category filter and sorting update results", search_filter)

        def header_search():
            page.goto(BASE + "/")
            page.fill("#site-search", "fixture")
            page.keyboard.press("Enter")
            page.wait_for_url("**/search?q=fixture**")
            expect(page.get_by_role("heading", name="Results for “fixture”")).to_be_visible()
        check("header search navigates to results", header_search)

        email = f"e2e_{RUN}@example.com"
        def register():
            page.goto(BASE + "/register")
            page.fill("#name", "E2E Customer")
            page.fill("#email", email)
            page.fill("#password", "abcd1234")
            page.check("input[type=checkbox]")
            page.get_by_role("button", name="Create account").click()
            expect(page.get_by_role("link", name="Cart")).to_be_visible()
            page.wait_for_url(BASE + "/", timeout=15000)
        check("customer registers via UI", register)

        def add_address_and_buy():
            page.goto(BASE + "/product/" + PRODUCT_SLUG)
            expect(page.get_by_role("heading", name=PRODUCT_NAME)).to_be_visible()
            page.get_by_role("button", name="Add to Cart", exact=True).first.click()
            expect(page.get_by_text("Added to cart")).to_be_visible()
            page.goto(BASE + "/cart")
            expect(page.get_by_text("Price details")).to_be_visible()
            page.get_by_role("link", name="Proceed to Checkout").click()
            page.wait_for_url("**/checkout")
            if page.get_by_role("button", name="+ Add new address").count():
                page.get_by_role("button", name="+ Add new address").click()
            page.fill("#a-name", "E2E Customer")
            page.fill("#a-phone", "9876543210")
            page.fill("#a-l1", "12 Test Street")
            page.fill("#a-city", "Bengaluru")
            page.fill("#a-state", "Karnataka")
            page.fill("#a-pin", "560001")
            page.get_by_role("button", name="Save address").click()
            expect(page.get_by_text("Address saved")).to_be_visible()
            page.get_by_label("Cash on Delivery").check()
            page.get_by_role("button", name="Place order (COD)").click()
            page.wait_for_url("**/account/orders/**?placed=1", timeout=20000)
            expect(page.get_by_text("Thank you! Your order")).to_be_visible()
        check("customer adds address, checks out with COD, sees confirmation", add_address_and_buy)

        def razorpay_not_configured():
            page.goto(BASE + "/product/" + PRODUCT_SLUG)
            page.get_by_role("button", name="Add to Cart", exact=True).first.click()
            expect(page.get_by_text("Added to cart")).to_be_visible()
            page.goto(BASE + "/checkout")
            page.get_by_role("button", name="Pay ").click()
            expect(page.get_by_role("alert").filter(has_text="not configured")).to_be_visible()
        check("online payment shows setup message when Razorpay keys missing", razorpay_not_configured)

        def orders_page():
            page.goto(BASE + "/account/orders")
            expect(page.get_by_text("Your orders")).to_be_visible()
        check("order history page lists orders", orders_page)

        def seller_login_dashboard():
            ctx2 = browser.new_context()
            p2 = ctx2.new_page()
            p2.set_default_timeout(15000)
            p2.goto(BASE + "/login")
            p2.fill("#email", SELLER_EMAIL)
            p2.fill("#password", SELLER_PASSWORD)
            p2.get_by_role("button", name="Log in").click()
            p2.wait_for_url(BASE + "/", timeout=15000)
            p2.goto(BASE + "/seller")
            expect(p2.get_by_text("Delivered revenue")).to_be_visible()
            p2.goto(BASE + "/seller/products/new")
            expect(p2.get_by_role("heading", name="Add a product")).to_be_visible()
            p2.get_by_role("button", name="Submit for review").click()
            expect(p2.get_by_text("Product name needs at least 3 characters")).to_be_visible()
            ctx2.close()
        check("approved seller reaches dashboard; product form validates", seller_login_dashboard)

        def admin_guard_and_dashboard():
            anon = browser.new_context().new_page()
            anon.set_default_timeout(15000)
            anon.goto(BASE + "/admin")
            expect(anon.get_by_text("Redirecting to login")).to_be_visible()
            ctx3 = browser.new_context()
            p3 = ctx3.new_page()
            p3.set_default_timeout(15000)
            p3.goto(BASE + "/login")
            p3.fill("#email", ADMIN_EMAIL)
            p3.fill("#password", ADMIN_PASSWORD)
            p3.get_by_role("button", name="Log in").click()
            p3.wait_for_url(BASE + "/", timeout=15000)
            p3.goto(BASE + "/admin")
            expect(p3.get_by_text("Paid revenue")).to_be_visible()
            p3.get_by_role("tab", name="Sellers").click()
            expect(p3.get_by_text(STORE).first).to_be_visible()
            ctx3.close()
        check("admin route is guarded; admin sees dashboard and sellers", admin_guard_and_dashboard)

        def mobile_menu():
            m = browser.new_context(viewport={"width": 390, "height": 844}).new_page()
            m.set_default_timeout(15000)
            m.goto(BASE + "/")
            m.get_by_label("Open menu").click()
            expect(m.get_by_role("link", name="Log in / Register")).to_be_visible()
        check("mobile navigation menu opens", mobile_menu)

        browser.close()

if __name__ == "__main__":
    run()
    failed = [r for r in results if r[1] == "FAIL"]
    print(f"\n{len(results) - len(failed)}/{len(results)} journeys passed")
    if errors:
        print("Uncaught page errors:")
        for e in errors[:10]:
            print("  -", e)
    sys.exit(1 if failed else 0)
