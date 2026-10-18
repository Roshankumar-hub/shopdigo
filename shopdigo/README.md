# SHOPDIGO – Multi-vendor marketplace (Next.js 16 · React 19 · Tailwind v4)

> **Everything You Need. All in One Place.**

SHOPDIGO is a multi-vendor e-commerce marketplace for India: customers shop, sellers list and fulfil orders, and administrators moderate sellers and products and handle refunds. Money-related logic is enforced on the server.

---

## 1. What works today

| Area | Status |
|---|---|
| Browse: home (banners, categories, featured, trending, offers, new arrivals), category/search with filters, brand, price, rating, stock, sort, pagination | ✅ Working |
| Header search with suggestions and recent searches | ✅ Working |
| Product page: gallery with zoom, size variants, stock, specs, reviews (verified-purchase label), Q&A, similar products, PIN-code delivery check, add to cart / buy now / wishlist / compare | ✅ Working |
| Customer accounts: register, login, logout, profile, multiple addresses (with PIN validation) | ✅ Working (session cookies, bcrypt) |
| Password recovery | ❌ Not implemented (needs an email provider) |
| Cart (persisted per account), coupons, server-side price quotes | ✅ Working |
| Checkout: address selection, idempotent order creation, COD, duplicate-order protection, stock validation | ✅ Working |
| Online payments (Razorpay): server-side order creation, signature verification, gateway status check, webhook | ✅ Code complete; **needs test keys to exercise** |
| Refunds via Razorpay API (admin action) | ✅ Code complete; only sends a refund when the gateway accepts it |
| Order history, timeline, cancel (before shipping), return requests within the return window, invoice print | ✅ Working |
| Wishlist, notifications, support tickets | ✅ Working |
| Seller registration (business, GST/PAN format, bank, agreements) with admin approval | ✅ Working (manual verification; no automatic GST/PAN lookup) |
| Seller dashboard, product create/edit/draft/submit, price & stock updates for own products only | ✅ Working |
| Seller order processing: confirm → process → pack → ship (tracking required) → out for delivery → delivered; cancel unshipped; approve/reject returns | ✅ Working (manual shipping workflow) |
| Seller earnings: gross, commission, refunds, ledger, settlement list | ✅ Ledger working · settlements/payouts are records only |
| Admin: overview metrics, approve/reject/suspend/reactivate sellers, commission per seller, product moderation, featured products, orders & refunds, coupons, support tickets, customers, audit log | ✅ Working |
| Policy pages (Terms, Privacy, Returns, Shipping, Seller Policy), Help centre | ✅ Working (placeholder legal text – have counsel review) |
| Bulk CSV product import | ❌ Not implemented |
| Image upload to Supabase Storage | ❌ Not implemented – sellers paste https image URLs |
| Paid promotions, sponsored placements | ❌ Not implemented |
| Shiprocket / courier integration | ❌ Not implemented – manual tracking entry only |
| Automatic settlement payouts | ❌ Not implemented – admins must record payouts (no payout is executed) |
| Supabase Postgres production data layer | ⚠️ Draft schema in `src/lib/db/schema.sql`, **not yet applied or migrated** |

**Important:** the running data layer is a server-side JSON file (`data/shopdigo-db.json`, created automatically). It is suitable for local development and demos only. It does not work on Vercel (serverless filesystems are ephemeral and read-only). Production needs the Supabase migration described in §6.

---

## 2. Quick start (local)

```bash
npm install
cp .env.example .env.local      # fill in only what you need (see §4)
npm run dev                     # http://localhost:3000
```

A fresh database contains **no products, sellers, PIN codes, coupons or banners**. It creates the category list and one administrator. Set `SHOPDIGO_ADMIN_EMAIL` and `SHOPDIGO_ADMIN_PASSWORD` in `.env.local` before the first run; if the password is not set, a random one is printed once to the server log. Products appear only after an approved seller submits them and an admin approves them.

## 3. Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build (also type-checks Next.js routes) |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (0 errors; warnings are tracked) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test:unit` | Backend tests (vitest): signatures, pricing, inventory, idempotency, Razorpay flow with mocked gateway, authz |
| `npm run test:e2e` | Browser journeys (Python + Playwright). Needs `pip install playwright && python -m playwright install chromium` and a running server on `BASE_URL` (default `http://localhost:3000`) |

## 4. Configuration

All secrets are read from environment variables only.

### 4.1 Razorpay (test mode)
1. Create a Razorpay account and switch the dashboard to **Test mode**.
2. Settings → API Keys → Generate. Put `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `NEXT_PUBLIC_RAZORPAY_KEY_ID` in `.env.local`.
3. Settings → Webhooks → Add: URL `https://<your-domain>/api/payments/razorpay/webhook`, events `payment.captured` and `payment.failed`, set a secret → `RAZORPAY_WEBHOOK_SECRET`.
4. For local webhook testing use a tunnel (e.g. `ngrok http 3000`) and point the webhook there.
5. Test cards/UPI are listed in Razorpay's test-mode documentation. Never mark an order paid by hand.

Without keys: the site still works; online payment shows a clear setup message and **no order is created and no payment is faked**. COD works without keys.

### 4.2 Payment flow (for auditors)
1. `order.create` validates address, PIN serviceability, stock and coupon on the server, and creates a `pending` order (stock reserved). The Razorpay order is created server-side with the server-computed total (paise).
2. The browser opens Razorpay Checkout using only the public key and Razorpay order ID.
3. `POST /api/payments/razorpay/verify` checks the HMAC-SHA256 signature (`order_id|payment_id`) and fetches the payment from Razorpay's API, checking order ID, amount and currency. Only then is the order marked `paid` and ledger entries posted (idempotent).
4. The webhook independently verifies `X-Razorpay-Signature` over the raw body and re-checks the payment before marking paid. `payment.failed` releases reserved stock.

### 4.3 Refunds
Admins start refunds in *Admin → Orders & refunds*. The server calls Razorpay's refund API first; local status changes only after the gateway accepts it. Status is `refund_pending` until the gateway confirms. SHOPDIGO never displays a refund as completed without confirmation. COD refunds must be paid manually and recorded.

## 5. Security notes
- Single action endpoint (`POST /api/action`) with declared roles per action, seller-approval checks, and ownership checks inside each handler (sellers cannot read or change other sellers' products or order items; customers only their own orders, addresses, cart and tickets).
- Passwords: bcrypt (cost 10). Sessions: random tokens in HTTP-only, SameSite=Lax cookies (Secure in production), 7-day expiry.
- Input validated with zod on the server. Image URLs must be https. PIN, PAN, GSTIN, IFSC and phone formats are validated.
- Rate limiting: in-memory per process (login 30/15 min, sign-up 30/hour, actions 600/min per IP). Replace with Redis/Upstash for multi-instance deployments.
- Security headers: `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- Errors return generic messages for server faults; details are logged server-side only.
- Known limits to fix before launch: CSRF protection for cookie-authenticated POSTs (rely on SameSite=Lax plus JSON content-type checks, or add a CSRF token); file-store concurrency across multiple processes; no email verification; no account lockout beyond rate limiting.

## 6. Production deployment (Vercel + Supabase) – remaining steps
1. **Migrate data to Supabase.** Create a project, run `src/lib/db/schema.sql` in the SQL editor, then replace `src/lib/server/store.ts` with Supabase queries (service-role client on the server only). Until this is done, do not deploy as a live shop: Vercel will not persist the JSON file.
2. Use Supabase Auth or keep the current session tables, but move sessions into the database.
3. Create a Storage bucket for product images with type and size limits (5 MB; jpg/png/webp) and signed uploads.
4. Add the environment variables from `.env.example` in Vercel → Project → Settings → Environment Variables (Production and Preview). Never expose `RAZORPAY_KEY_SECRET` or `SUPABASE_SERVICE_ROLE_KEY` to the browser.
5. Connect the repository to Vercel and deploy. Set the Razorpay webhook URL to your production domain.
6. Switch Razorpay to Live mode only after end-to-end tests pass in test mode and your business KYC is approved.

## 7. No fake data; test fixtures
- SHOPDIGO does not ship sample products, sellers, prices, ratings, reviews, photos, PIN codes or coupons. Only records created by authorised sellers or admins are shown.
- Upgrading an older database: on first load, schema v3 moves the first-release sample catalogue out of the storefront. Sample products that already have orders are kept but archived (`archived_sample`) and hidden. The full pre-migration file is saved as `data/shopdigo-db.before-schema-v3.json`. Sample sellers, PIN codes, coupons and banners are removed when unused. Old sample user accounts are not deleted automatically; remove or change them in the database before launch.
- Browser tests: `npm run build`, then `bash tests/e2e/run_isolated.sh`. It starts a separate server on port 3100 with a temporary database, creates records marked **TEST FIXTURE** through the API, and never touches `data/shopdigo-db.json`. Unit tests: `npx vitest run`.

## 8. Project layout
```
src/app/            pages (customer, /seller, /admin, policies) and API routes
src/app/api/action  single authorised action endpoint (all app operations)
src/app/api/payments/razorpay/{verify,webhook}  payment verification
src/lib/server/     server-only: store, actions registry, sessions, Razorpay client, rate limits
src/lib/client/     browser API helper
src/lib/db/schema.sql  Supabase/Postgres schema draft with RLS policies
tests/unit          backend tests        tests/e2e  browser journey tests
```

## 9. Known limitations
- Product photos come only from uploads or URLs that sellers provide; products without photos show "Image unavailable."
- **No admin UI for PIN-code serviceability yet.** A fresh install delivers nowhere until PIN codes are added, so checkout is blocked by design.
- **Admins cannot create products** (they can only moderate sellers' products).
- The `Forgot password` link explains that recovery needs an email provider.
- Delivery times come from each seller's stated dispatch time and the PIN-code table. That table is empty until PIN codes are added, so no delivery estimate is shown for unserviced PIN codes.
- GST is shown as an estimate (flat 5%) and is not computed per HSN code.
