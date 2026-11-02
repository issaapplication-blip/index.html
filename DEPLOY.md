# RAFIQ | رفيق — Safe deployment and release notes

## Production hosting

- Current public site: https://index-html.issaapplication.workers.dev/
- Hosting target: Cloudflare Workers, service `index-html`.
- Frontend repository: https://github.com/issaapplication-blip/index.html
- Do not use Render for build, hosting, fallback, restart, or deployment.
- Do not deploy this draft branch or merge it into `main` without the owner's explicit approval.

## Current release blocker

The Cloudflare preview builds for PR #15 failed repeatedly on 2 November 2026. The latest recorded failure is for commit `215c059bc5cb6e531ce035c922f906319cd52dbc`.

Open Cloudflare Dashboard → Workers & Pages → `index-html` → Builds, select the failed build, and inspect the build log. The log is account-protected and is not available through this repository. Do not guess a build command or change build settings until the exact failure is known.

## Supabase integration

- Existing project: `qmuxaehrahfsnabyjens`
- Project URL: https://qmuxaehrahfsnabyjens.supabase.co
- Do not create another project.
- Do not apply migrations, change RLS, rotate secrets, or weaken authentication as part of a frontend release.
- Never commit service-role keys, bot tokens, Meta secrets, or other credentials.
- Keep private documents in the existing private Storage bucket; never expose signed URLs or applicant data in public pages.

## Messaging safety

- The automated RAFIQ agent is for the website and Telegram only.
- WhatsApp is inbound-only and may relay messages to the Telegram manager group.
- Never enable WhatsApp auto-replies, polling workers, or outbound WhatsApp API calls.
- Do not register or replace a real Telegram webhook during preview testing.
- Use mocked Telegram and WhatsApp providers for tests. Do not message real customers or users.

## Release checklist

1. Inspect and resolve the Cloudflare build failure using the actual build log.
2. Review the frontend and backend pull requests separately.
3. Confirm the website form endpoints are connected to the intended backend and existing Supabase functions.
4. Run offline tests for forms, the assistant, links, languages, and mobile layouts.
5. Verify Supabase tables, RPCs, RLS, Edge Function versions, JWT settings, and Storage policies using read-only checks.
6. Confirm that no passport document category is requested or accepted.
7. Obtain explicit approval before merging or deploying.

A successful local test or GitHub test run is not proof that the production Worker or Supabase deployment is ready.
## Repository topology — integration is not yet proven

There are two separate GitHub repositories:

- Frontend draft: `issaapplication-blip/index.html` (PR #15; static pages are at repository root).
- Backend/Cloudflare Pages project: `issaapplication-blip/-` (its documented build copies `public/` to `dist/` and supplies `functions/api/*` routes).

The backend repository's deployment guide identifies the Pages source as `issaapplication-blip/-`. PR #15 is in the other repository and is not automatically included in that Pages build. The current `index-html.issaapplication.workers.dev` URL is a Workers hostname; it has not been proven to be the same deployment as the Pages project described in the backend repository.

The updated `agent.html` calls the same-origin `/api/agent/chat` route and the intake pages call `/api/public/intake` or `/api/public/institution-intake`. These Pages Functions exist in the backend repository, not in this frontend-only repository. Do not assume those routes exist on the frontend-only Worker until the frontend files are integrated into the backend Pages build. Confirm the Cloudflare service's connected repository and build configuration before enabling forms or the assistant.
