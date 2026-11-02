#!/usr/bin/env bash
set -euo pipefail
: "${TELEGRAM_BOT_TOKEN:?Set TELEGRAM_BOT_TOKEN in your local shell first}"
: "${TELEGRAM_WEBHOOK_SECRET:?Set TELEGRAM_WEBHOOK_SECRET locally; never paste it into chat}"
if [[ ${#TELEGRAM_WEBHOOK_SECRET} -lt 32 ]]; then echo "TELEGRAM_WEBHOOK_SECRET must be at least 32 characters" >&2; exit 1; fi
WEBHOOK_URL="https://qmuxaehrahfsnabyjens.supabase.co/functions/v1/telegram-webhook"
PAYLOAD="$(mktemp)"
trap 'rm -f "$PAYLOAD"' EXIT
python3 - <<'PY' > "$PAYLOAD"
import json, os
print(json.dumps({"url":"https://qmuxaehrahfsnabyjens.supabase.co/functions/v1/telegram-webhook","secret_token":os.environ["TELEGRAM_WEBHOOK_SECRET"],"allowed_updates":["message","callback_query"],"drop_pending_updates":False}))
PY
curl --fail-with-body --silent --show-error -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" -H 'Content-Type: application/json' --data-binary @"$PAYLOAD" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(json.dumps({"ok":d.get("ok"),"description":d.get("description"),"result":d.get("result")},ensure_ascii=False,indent=2)); sys.exit(0 if d.get("ok") else 1)'

# Read back the webhook configuration without displaying the bot token or secret.
curl --fail-with-body --silent --show-error "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo" | python3 -c 'import json,sys; d=json.load(sys.stdin); r=d.get("result",{}); print(json.dumps({"ok":d.get("ok"),"url":r.get("url"),"has_custom_certificate":r.get("has_custom_certificate"),"pending_update_count":r.get("pending_update_count"),"allowed_updates":r.get("allowed_updates"),"last_error_date":r.get("last_error_date"),"last_error_message":r.get("last_error_message")},ensure_ascii=False,indent=2)); sys.exit(0 if d.get("ok") else 1)'
