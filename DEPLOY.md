# RAFIQ | رفيق — Phase 1 deployment and operations

This repository contains the static web application and Supabase Edge Function source. Deployment status must be verified from the actual provider; a green CI run or a local preview is not proof of live service.

## Non-negotiable operating rules

- Do not use Render. Do not restart or configure the legacy Render service.
- Keep the existing Supabase project `qmuxaehrahfsnabyjens`; do not create a project or migrate data.
- Never disable Supabase email confirmation as a workaround for HTTP 429. Check Auth logs, rate limits, SMTP/provider settings, and current project limits first.
- Never put tokens, API keys, service-role keys, private phone numbers, or customer data in Git, client-side files, logs, or chat.
- Do not enable outbound WhatsApp replies, broadcasts, or marketing until tests pass and the owner explicitly approves live messaging.
- Use Telegram Bot API and official Meta WhatsApp Business Platform or an authorized Kapso integration only. No WhatsApp Web or Baileys.
- Do not run production migrations until the schema, impact, backup/rollback, and owner approval have been reviewed.

## Current architecture and Phase 1 gate

### Static frontend

The repository includes `.github/workflows/pages.yml`, which can deploy the static frontend to GitHub Pages. This is a candidate free host for the frontend only; it does not host a persistent webhook worker or replace Supabase Edge Functions.

Before calling the frontend live, verify all of the following:
1. GitHub Pages is enabled for this repository and the workflow completed successfully.
2. The deployed URL is visible in the Pages environment/deployment record.
3. The homepage, app, admin, dashboard, barcode, assets, manifest, service worker, and client-side routes load from that URL.
4. Canonical, Open Graph, sitemap, and app links use the verified production URL; do not guess the URL.
5. No production page or configuration falls back to Render.

Workflow: https://github.com/issaapplication-blip/index.html/actions/workflows/pages.yml

### Supabase

Project: https://supabase.com/dashboard/project/qmuxaehrahfsnabyjens

The existing `rafiq-agent` Edge Function is not the same as a working Telegram webhook. Verify the deployed function list and code. The Telegram endpoint previously returned HTTP 503; it is not considered repaired until the cause is identified in logs, the deployed function is corrected, and an authorized test update completes end-to-end.

Do not assume that `telegram-webhook` exists in this repository: inspect the live project and the actual deployed source first. Do not deploy an unreviewed replacement or invent tables/RPCs. Use only secrets stored in Supabase's function secrets.

### Telegram acceptance test

After repairing the live function and verifying its secrets:
1. Verify the configured webhook URL and error state without printing the bot token.
2. Verify the Telegram secret header is required and invalid requests are rejected.
3. Use one private test message only after owner approval.
4. Confirm the test request is saved exactly once.
5. Confirm the manager group receives the notification.
6. Confirm the bot replies to the test user.
7. Confirm failures are observable and do not produce a false success message.
8. Do not broadcast to the public channel during testing.

### WhatsApp acceptance test

WhatsApp remains disabled for automatic outbound messages until the official provider, webhook URL, signature verification, phone-number ID, and permissions are confirmed. Use the official Meta WhatsApp Business Platform or an authorized Kapso integration only.

Do not start `auto-reply.mjs` in live mode during setup. A dry-run or mock test must not send customer messages. Verify inbound delivery and signature handling first, then test one private test conversation after explicit owner approval. Keep channel publishing manual unless an official, account-authorized API is confirmed.

## Security and privacy rules

- The only agent escalation contact is +961 81 506 299.
- The financial transfer number must never be shown to the agent, members, customers, or public source.
- Do not publish provider phone numbers or private customer details.
- The agent must not give medical advice, diagnose, prescribe, handle money, invent prices/availability, or promise provider approval.
- Dentist, nutritionist, speech therapy, labs, imaging, and medical equipment remain labelled “انتظرونا قريبًا” until officially enabled.
- CV prices: promotional CV $25, cover letter $10, bundle $35; normal prices $35/$16/$51; extra language +$20 promotional or +$28 normal. Whish Money only. Confirm with the manager before payment; never request or process a transfer.
- Keep the approved RAFIQ logo unchanged. The PWA must work without an APK.

## Rollback and change control

- Make changes on a feature/fix branch and open a PR; never push directly to `main`.
- Review the diff, tests, migration impact, deployment settings, and secrets before merge.
- For deployment changes, record the previous workflow/configuration and verified URL before switching traffic.
- Do not switch live webhooks until the replacement is healthy and a rollback path is documented.
- Roll back the branch/deployment if health checks, security checks, or the approved test fail. Do not roll back by deleting data.

## Phase 1 completion gate

Phase 1 is complete only when dated evidence proves:
- the static frontend is published on a verified free host without Render dependencies;
- the Telegram webhook returns a successful response to a valid authorized update and rejects invalid signatures;
- the request is saved once, delivered to the correct manager group, and acknowledged to the test user;
- the official WhatsApp integration is configured and signature-verified, with outbound messaging still disabled until explicit approval;
- tests, security checks, and rollback instructions pass review;
- no secrets or provider phone numbers are exposed.

Only after the owner accepts this gate may Phase 2 platform features begin.
