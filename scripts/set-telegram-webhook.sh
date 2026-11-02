#!/usr/bin/env bash
set -euo pipefail
: "${TELEGRAM_BOT_TOKEN:?Set TELEGRAM_BOT_TOKEN in your local shell first}"
: "${TELEGRAM_WEBHOOK_SECRET:?Set TELEGRAM_WEBHOOK_SECRET locally; never paste it into chat}"
if [[ ${#TELEGRAM_WEBHOOK_SECRET} -lt 32 ]]; then echo "TELEGRAM_WEBHOOK_SECRET must be at least 32 characters" >&2; exit 1; fi
WEBHOOK_URL="https://qmuxaehrahfsnabyjens.supabase.co/functions/v1/telegram-webhook"
ALLOWED='["message","callback_query"]'
python3 - <<'PY' > /tmp/rafiq-telegram-webhook.json
import json, os
print(json.dumps({"url":"https://qmuxaehrahfsnabyjens.supabase.co/functions/v1/telegram-webhook","secret_token":os.environ["TELEGRAM_WEBHOOK_SECRET"],"allowed_updates":["message","callback_query"],"drop_pending_updates":False}))
PY
curl --fail-with-body --silent --show-error -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" -H 'Content-Type: application/json' --data-binary @/tmp/rafiq-telegram-webhook.json | python3 -c 'import json,sys; d=json.load(sys.stdin); print(json.dumps({"ok":d.get("ok"),"description":d.get("description"),"result":d.get("result")},ensure_ascii=False,indent=2)); sys.exit(0 if d.get("ok") else 1)'
rm -f /tmp/rafiq-telegram-webhook.json
