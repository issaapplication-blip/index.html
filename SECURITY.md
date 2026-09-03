# Security Policy — رعاية منزلية متألقة

## Security principle
Security is a release gate. The platform must be hardened and tested against known risks; no system can honestly guarantee zero vulnerabilities.

## Defense in depth
1. Supabase Auth for identity and session management.
2. PostgreSQL Row Level Security (RLS) as the primary data-access boundary.
3. Private Storage only for identity, medical, financial and application documents.
4. Server-side/Edge Function authorization for sensitive workflow transitions.
5. No service-role key, private API secret, payment secret, WhatsApp secret, or AI provider secret in browser code.
6. Append-only audit logging for security-sensitive actions.
7. Short-lived signed URLs for private files; never expose permanent public file URLs.
8. Input validation, payload limits, MIME/type validation and safe filenames.
9. Idempotency protection for payment, application and care-request submissions.
10. Least-privilege access for managers, administrators and external AI/review services.
11. PWA/service-worker rules must never cache authenticated API responses or private documents.
12. CI security checks before production release.

## Sensitive workflow gates
The browser must never be trusted to set `payment_confirmed`, `matched`, `contract_accepted`, or `contact_unlocked`. These transitions require server-side authorization and validation of all prerequisites.

Contact information is released only after the approved match, required worker assignment, contract acceptance, payment confirmation, and suspension/cancellation checks all pass.

## Privacy
Candidate matching should use only the minimum location information needed (for example, region/district). Exact service addresses and medical details remain private until the applicable authorization gate is satisfied.

Family/doctor contact information must not be hidden inside free-text notes. Sensitive contact fields belong in structured protected columns/tables with RLS.

## Files
- Private bucket: `private_documents`.
- Per-user storage paths should be unguessable and ownership checked server-side.
- Upload validation must consider MIME spoofing, extension mismatch, size limits and malicious files.
- Failed multi-step submissions require cleanup/reconciliation so orphaned files are not left indefinitely.

## AI governance
ChatGPT is the primary orchestrator. Claude/Gemini or other services may act as reviewers/consultants with minimum necessary data only. AI may analyze, review and prepare drafts, but cannot independently approve sensitive financial, contractual, employment, access-control or publication decisions.

## Release gate
Before production:
- RLS/IDOR tests pass.
- Role-escalation tests pass.
- Workflow-tampering tests pass.
- Storage isolation tests pass.
- Payment-confirmation tampering tests pass.
- Double-submit/race-condition tests pass.
- Private medical/address/contact data is not exposed to candidates.
- CI security checks are clean or explicitly reviewed.
- Supabase security advisors are reviewed after migrations are applied.
