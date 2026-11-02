# RAFIQ — Telegram + WhatsApp relay-only recovery

## Mandatory architecture

- The RAFIQ automated assistant may run on the website and Telegram only.
- WhatsApp inbound messages must never invoke `rafiq-agent`, `js/rafiq-agent.js`, OpenAI, or any automated reply workflow.
- WhatsApp inbound webhook -> validate Meta signature -> deduplicate and persist `whatsapp_inbound_events` -> forward the message text and sender number to the Telegram manager chat.
- No code path may call the WhatsApp send/messages endpoint. The human manager replies manually from WhatsApp.
- Telegram bot updates may invoke the assistant; website chat may invoke the assistant. These are separate ingress paths.

## Repository safety change

- `auto-reply.mjs` has been replaced with a no-network shutdown stub. It no longer polls Kapso, calls the agent, or sends WhatsApp messages.
- The website agent source remains available for website use only.
- Existing n8n/Kapso workflows in external accounts are NOT changed by this repository edit. Disable any active WhatsApp auto-reply/send workflow manually before enabling the relay.

## Telegram webhook reset (run locally)

Prerequisites: Bash, curl, Python 3, and the two local environment variables `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET`. Do not paste either value into chat or commit them.

```bash
export TELEGRAM_BOT_TOKEN='(set locally; do not commit)'
export TELEGRAM_WEBHOOK_SECRET='(set locally; at least 32 characters)'
bash scripts/set-telegram-webhook.sh
```

The script sets the webhook to:

`https://qmuxaehrahfsnabyjens.supabase.co/functions/v1/telegram-webhook`

with `allowed_updates=["message","callback_query"]` and `drop_pending_updates=false`. It never prints the bot token or secret. The Supabase Edge Function must already validate the exact `X-Telegram-Bot-Api-Secret-Token` header and use the same secret.

## Required environment variables and placement

Set these in **Supabase Dashboard → Project Settings → Edge Functions → Secrets** for project `qmuxaehrahfsnabyjens`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `META_VERIFY_TOKEN`
- `META_APP_SECRET`
- `META_ACCESS_TOKEN`
- `META_PHONE_NUMBER_ID`
- `META_GRAPH_API_VERSION`
- `RAFIQ_ALLOWED_ORIGINS`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `TELEGRAM_MANAGER_CHAT_IDS`

For the local webhook reset script only, export `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET` in the terminal session. Do not put them in frontend files, GitHub, or this repository. Manager chat IDs should be the numeric Telegram chat IDs in the format expected by the webhook implementation (typically comma-separated).

## Current verification boundary

The GitHub repository currently contains the `rafiq-agent` function source, but does not contain the `telegram-webhook` or `meta-whatsapp-webhook` source files. The user-reported local patch branch `feat/telegram-agent-whatsapp-relay` was not found on GitHub at the time of this review. The connected Supabase tools returned a permission error / no accessible project listing, so the deployed Edge Function source, secrets, webhook settings, database schema, deduplication claim function and logs could not be inspected.

Therefore this repository change does NOT claim that Telegram is reconnected or that the WhatsApp relay is live. Do not deploy until the actual patch is uploaded and the webhook code is reviewed against this contract.
