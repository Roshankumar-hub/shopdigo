"""UI audit: loads key pages at phone/tablet/desktop widths and reports image loading,
console errors, failed API requests and horizontal overflow. Usage: BASE_URL=http://localhost:3000 python3 tests/e2e/ui_audit.py"""
import os, sys, json
from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE_URL', 'http://localhost:3000')
SHOTS = os.environ.get('SHOTS_DIR', '/tmp/shots')
os.makedirs(SHOTS, exist_ok=True)
VIEWPORTS = {'phone': (390, 844), 'tablet': (820, 1180), 'desktop': (1440, 900)}
# Visual audit runs on an EMPTY marketplace (no fixture products), so screenshots never show test records.
# With zero products, home and listing must show the premium empty state.
PAGES = [('home', '/'), ('listing', '/search'), ('listing-electronics', '/search?category=electronics')]
EMPTY_TEXT = 'Your next favourite find is coming soon.'
failures = []

def audit(page, name, url, vw):
    errors, bad = [], []
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.on('response', lambda r: bad.append(f'{r.status} {r.url}') if r.status >= 400 and '/api/media/' in r.url or (r.status >= 500) else None)
    page.goto(BASE + url, wait_until='networkidle', timeout=60000)
    page.wait_for_timeout(600)
    info = page.evaluate("""() => {
        const imgs = [...document.querySelectorAll('img')];
        const broken = imgs.filter(i => !i.complete || i.naturalWidth === 0).map(i => i.getAttribute('src'));
        const overflow = document.documentElement.scrollWidth > window.innerWidth + 1;
        const placeholders = [...document.querySelectorAll('[role=img][aria-label^="Image unavailable."]')].length;
        const empty = document.body.innerText.includes('Your next favourite find is coming soon.');
        const productLinks = document.querySelectorAll("a[href^='/product/']").length;
        return { imgs: imgs.length, broken, overflow, placeholders, title: document.title, empty, productLinks };
    }""")
    page.screenshot(path=f'{SHOTS}/{name}-{vw}.png', full_page=False)
    real_errors = [e for e in errors if 'favicon' not in e and 'Failed to load resource' not in e]
    res = {'page': name, 'viewport': vw, 'title': info['title'], 'imgs': info['imgs'], 'broken_imgs': info['broken'],
           'placeholders': info['placeholders'], 'horizontal_overflow': info['overflow'],
           'console_errors': real_errors[:5], 'failed_media_or_5xx': bad[:5]}
    res['empty_state'] = info['empty']
    res['product_links'] = info['productLinks']
    if not info['empty'] or info['productLinks']:
        real_errors.append('expected empty-state only (no products)')
    if info['broken'] or info['overflow'] or real_errors or bad:
        failures.append(res)
    return res

with sync_playwright() as p:
    browser = p.chromium.launch()
    results = []
    for vw, (w, h) in VIEWPORTS.items():
        ctx = browser.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1)
        page = ctx.new_page()
        for name, url in PAGES:
            results.append(audit(page, name, url, vw))
        ctx.close()
    browser.close()
for r in results:
    print(json.dumps(r, ensure_ascii=False))
print('FAILURES:', len(failures))
sys.exit(1 if failures else 0)
