"""
Creates TEST FIXTURE records through the real API of an ISOLATED test server.
Never run against the live database. Requires:
  BASE_URL, FIX_DB_FILE (the temp DB file the test server uses),
  ADMIN_EMAIL, ADMIN_PASSWORD, FIX_SELLER_EMAIL, FIX_SELLER_PASSWORD
Prints the fixture product slug on success.
"""
import json, os, sys, urllib.request, urllib.error, http.cookiejar

BASE = os.environ["BASE_URL"].rstrip("/")
DB_FILE = os.environ["FIX_DB_FILE"]
PRODUCT_NAME = "TEST FIXTURE Headphones"
STORE = "TEST FIXTURE STORE"
class Session:
    """Keeps the session cookie as a plain header (cookie jars drop Secure cookies over http)."""
    def __init__(self):
        self.cookie = ""

jar_admin = Session()
jar_seller = Session()

def call(jar, method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json"}
    if jar.cookie:
        headers["Cookie"] = jar.cookie
    req = urllib.request.Request(BASE + path, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req) as r:
            for raw in r.headers.get_all("Set-Cookie") or []:
                pair = raw.split(";")[0]
                if "=" in pair:
                    jar.cookie = pair
            return json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        raise SystemExit(f"{method} {path} failed {e.code}: {e.read().decode()[:300]}")

def action(jar, name, payload=None):
    out = call(jar, "POST", "/api/action", {"action": name, "payload": payload or {}})
    return out.get("data", out)

# 1. Admin + seller accounts (seller account is a test fixture)
call(jar_admin, "POST", "/api/auth/login", {"email": os.environ["ADMIN_EMAIL"], "password": os.environ["ADMIN_PASSWORD"]})
call(jar_seller, "POST", "/api/auth/register", {"name": "Fixture Seller", "email": os.environ["FIX_SELLER_EMAIL"],
     "password": os.environ["FIX_SELLER_PASSWORD"], "agreedTerms": True})

# 2. Seller application, then admin approval
action(jar_seller, "seller.register", {
    "store_name": STORE, "store_description": "Automated test fixture. Not a real store.",
    "business_name": "Fixture Business", "contact_email": os.environ["FIX_SELLER_EMAIL"], "contact_phone": "9876543210",
    "gstin": "", "pan": "", "pickup_address": "1 Test Road", "pickup_city": "Bengaluru", "pickup_state": "Karnataka",
    "pickup_pincode": "560001", "bank_account_name": "Fixture Business", "bank_account_number": "123456789012",
    "bank_ifsc": "HDFC0001234", "bank_name": "Test Bank", "agreed_terms": True, "agreed_privacy": True})
sellers = action(jar_admin, "admin.sellers")
seller = next(s for s in sellers if s.get("store_name") == STORE)
action(jar_admin, "admin.sellerStatus", {"sellerId": seller["id"], "status": "approved"})

# 3. Product: submitted by seller, approved by admin
home = action(jar_seller, "catalog.home")
electronics = next(c for c in home["categories"] if c["slug"] == "electronics")
action(jar_seller, "seller.productSave", {"data": {
    "name": PRODUCT_NAME, "category_id": electronics["id"], "brand_id": None,
    "description": "Automated test fixture product. Not sold in the real marketplace.",
    "specifications": {}, "mrp": 1000, "price": 800, "stock": 50, "images": [],
    "cod_available": True, "delivery_days": 3, "return_window_days": 7, "submit": True}})
pending = action(jar_admin, "admin.products", {"status": "pending_approval"})
product = next(p for p in pending if p["name"] == PRODUCT_NAME)
action(jar_admin, "admin.productModerate", {"productId": product["id"], "approve": True})

# 4. Serviceable PIN code: no admin UI exists yet, so the TEST DB file is edited directly.
#    This happens only on the isolated temp database and is never applied to the live DB.
raw = json.load(open(DB_FILE))
raw.setdefault("pincodes", [])
if not any(p.get("pincode") == "560001" for p in raw["pincodes"]):
    raw["pincodes"].append({"pincode": "560001", "city": "Bengaluru", "state": "Karnataka",
                            "delivery_days": 2, "cod_available": True, "is_serviceable": True})
json.dump(raw, open(DB_FILE, "w"))

print(product["slug"])
