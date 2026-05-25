#!/usr/bin/env bash
# One-shot Vercel deploy for realm-tcg. Run from the repo root in a shell where
# `vercel login` has already succeeded (your interactive session — it can read
# the Keychain token):
#
#   bash scripts/deploy-vercel.sh
#
# Reads Supabase creds from the local .env (gitignored) — no secrets on the CLI.
# Links/creates the `realm-tcg` project under your current Vercel team, pushes
# env vars, deploys to production, then fixes RP_ID/ORIGIN to the real domain
# and redeploys (passkeys require RP_ID to match the exact host).
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT="realm-tcg"

echo "==> Checking Vercel auth"
vercel whoami >/dev/null 2>&1 || { echo "Not logged in. Run: vercel login"; exit 1; }
echo "    signed in as: $(vercel whoami 2>/dev/null)"

echo "==> Loading .env"
[ -f .env ] || { echo "Missing .env (SUPABASE_URL / SUPABASE_SERVICE_KEY / SESSION_SECRET)"; exit 1; }
set -a; . ./.env; set +a

echo "==> Linking project $PROJECT"
vercel link --yes --project "$PROJECT" >/dev/null

setenv() {  # setenv NAME VALUE  -> idempotent for production
  local name="$1" val="$2"
  vercel env rm "$name" production -y >/dev/null 2>&1 || true
  printf '%s' "$val" | vercel env add "$name" production >/dev/null
  echo "    set $name"
}

echo "==> Pushing environment (production)"
setenv SUPABASE_URL          "$SUPABASE_URL"
setenv SUPABASE_SERVICE_KEY  "$SUPABASE_SERVICE_KEY"
setenv SESSION_SECRET        "$SESSION_SECRET"
setenv NODE_ENV              "production"

echo "==> First production deploy"
DEPLOY_OUT="$(vercel deploy --prod --yes 2>&1)"
echo "$DEPLOY_OUT"
HOST="$(printf '%s\n' "$DEPLOY_OUT" | grep -oE 'https://[a-z0-9.-]+\.vercel\.app' | tail -1 | sed 's#https://##')"
if [ -z "$HOST" ]; then echo "Could not determine deploy host; set RP_ID/ORIGIN manually."; exit 1; fi
echo "==> Production host: $HOST"

echo "==> Setting passkey domain env to match the real host and redeploying"
setenv RP_ID  "$HOST"
setenv ORIGIN "https://$HOST"
vercel deploy --prod --yes

echo
echo "==> Done. Live at: https://$HOST"
echo "    Smoke check:  curl https://$HOST/api/bestiary/size   (expect {\"size\":32})"
