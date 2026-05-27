#!/usr/bin/env bash
# Auto-resume Google Imagen art generation until every creature (200) and
# spell (24) has art, then exit. Each pass skips already-done items and fails
# fast on a quota cap; between passes we sleep so a daily/hourly quota reset is
# picked up automatically. Keeps one consistent painted style (all Imagen).
#
#   GOOGLE_API_KEY=... bash scripts/resume-art.sh
#
# Env: RESUME_INTERVAL (seconds between passes, default 1200),
#      RESUME_MAX_PASSES (safety cap, default 300).
set -u
cd "$(dirname "$0")/.."

INTERVAL="${RESUME_INTERVAL:-1200}"
MAX_PASSES="${RESUME_MAX_PASSES:-300}"

for ((p = 1; p <= MAX_PASSES; p++)); do
  echo "[resume] === pass $p · $(date '+%H:%M:%S') ==="
  node scripts/generate-art.js --provider google --upload --concurrency 1

  N=$(ls client/assets/creatures/*.webp 2>/dev/null | wc -l | tr -d ' ')
  echo "[resume] creatures with art: ${N}/200"

  if [ "${N}" -ge 200 ]; then
    node scripts/generate-extras.js spells || true
    SP=$(node -e '
      require("dotenv").config();const{createClient}=require("@supabase/supabase-js");
      const sb=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY,{auth:{persistSession:false}});
      sb.storage.from("creatures").list("spells",{limit:100}).then(({data})=>{console.log((data||[]).filter(o=>o.name.endsWith(".webp")).length)});
    ' 2>/dev/null || echo 0)
    echo "[resume] spells with art: ${SP}/24"
    if [ "${SP}" -ge 24 ]; then
      echo "[resume] ✅ ALL ART COMPLETE after ${p} pass(es)"
      exit 0
    fi
  fi

  echo "[resume] sleeping ${INTERVAL}s before next attempt…"
  sleep "${INTERVAL}"
done

echo "[resume] reached MAX_PASSES (${MAX_PASSES}) — stopping"
exit 1
