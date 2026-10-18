#!/usr/bin/env bash
# Runs the browser journeys against an ISOLATED production server with a temp database.
# The live data/shopdigo-db.json is never touched. Requires a prior `npm run build`.
set -euo pipefail
cd "$(dirname "$0")/../.."
PORT="${PORT:-3100}"
TMP="$(mktemp -d /tmp/shopdigo-e2e.XXXXXX)"
export SHOPDIGO_DB_FILE="$TMP/db.json"
export SHOPDIGO_UPLOAD_DIR="$TMP/uploads"
export SHOPDIGO_DISABLE_RATE_LIMIT=1
export SHOPDIGO_ADMIN_EMAIL="admin-e2e@test.dev"
export SHOPDIGO_ADMIN_PASSWORD="TestAdmin123"
export FIX_SELLER_EMAIL="seller-e2e@test.dev"
export FIX_SELLER_PASSWORD="SellerTest123"
export BASE_URL="http://127.0.0.1:$PORT"
if curl -s -o /dev/null "http://127.0.0.1:$PORT/"; then echo "Port $PORT is already in use; stop that server first." >&2; exit 1; fi
set -m  # own process group so cleanup also stops next-server children
npx next start -p "$PORT" -H 127.0.0.1 > "$TMP/server.log" 2>&1 &
SERVER_PID=$!
cleanup() { kill -- -"$SERVER_PID" 2>/dev/null || true; }
trap cleanup EXIT
for _ in $(seq 1 60); do curl -s -o /dev/null "$BASE_URL/" && break; sleep 1; done
# Visual audit first, on the still-empty isolated DB, so no test record appears in screenshots.
SHOTS_DIR="${SHOTS_DIR:-$TMP/shots}" python3 tests/e2e/ui_audit.py
SHOTS_DIR="${SHOTS_DIR:-$TMP/shots}" python3 tests/e2e/auth_check.py
SHOTS_DIR="${SHOTS_DIR:-$TMP/shots}" python3 tests/e2e/loader_check.py
export ADMIN_EMAIL="$SHOPDIGO_ADMIN_EMAIL" ADMIN_PASSWORD="$SHOPDIGO_ADMIN_PASSWORD" FIX_DB_FILE="$SHOPDIGO_DB_FILE"
FIX_SLUG="$(python3 tests/e2e/setup_fixtures.py)"
export FIX_PRODUCT_SLUG="$FIX_SLUG" FIX_PRODUCT_NAME="TEST FIXTURE Headphones" FIX_STORE="TEST FIXTURE STORE"
echo "Fixture product slug: $FIX_SLUG (temp DB: $TMP)"
python3 tests/e2e/journeys.py
