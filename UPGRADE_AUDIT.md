# RAFIQ unified-upgrade audit — 2026-09-28

## Sources actually reachable

- **Repository working tree:** audited. It is a static HTML/Supabase frontend with secured SQL migrations and an existing `rafiq-agent` Edge Function client call.
- **LAN source (`http://192.168.1.101/`):** unavailable from this environment: the proxy returned `403 Domain forbidden`. It was therefore not treated as GitHub or production.
- **Production (`https://rafiq-o6qd.onrender.com/`):** unavailable from this environment: the proxy rejected the CONNECT tunnel with `403`. No deployment, admin, database, file, WhatsApp, or live-AI assertion has been made.
- **GitHub:** no git remote is configured in this checkout, so the hosted repository could not be compared.

## Safe merge baseline and retained production behaviour

The checked-out local version remains the baseline. The public family/provider forms, Supabase authentication, CV validation/upload, protected admin review RPC UI, service/region/guide routes, canonical URLs, sitemap/robots, and official customer WhatsApp number (+961 81 506 299) are retained. The financial-only +961 70 600 157 remains explicitly excluded from customer messaging.

## Implemented compatibility additions

1. Versioned service worker, HTTPS-relative PWA manifest and install UX (including Safari instructions) were added without a LAN URL.
2. A **non-destructive, additive** Supabase migration defines idempotent inbound/outbound WhatsApp records and per-contact conversation state. It neither deletes nor alters existing RAFIQ data.
3. A deployable Supabase Edge Function source implements Meta verification, HMAC signature verification, unique provider-message idempotency, bounded fast-path processing, state update, safety/manager escalation, safe fallback/retry persistence, and the configured `gpt-5.6-luna` model. Secrets are environment-only.
4. The admin page gains a protected conversation-view placeholder that becomes live only after the migration and deployment are explicitly applied.

## Required operator actions before a live claim

1. Obtain the official raster asset `public/rafig-approved-logo.jpg`; it was **not present** in this checkout. The existing approved SVG is retained rather than fabricating a replacement.
2. Review/apply `supabase/migrations/20260928090000_whatsapp_agent_reliability.sql` to the existing project, then deploy `supabase/functions/rafiq-whatsapp-webhook` with the listed secrets.
3. Configure Meta WhatsApp Cloud webhook to that function and test only +961 81 506 299. Do not activate Peach and Kapso together.
4. Configure Render from the repository, deploy the branch, then validate the public site, manifest, `sw.js`, admin access, uploads, webhook and live message tests.
