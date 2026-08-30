# Security and access model

## Decision authority
The general manager is the final approver for sensitive operational decisions. AI assistants may analyze and recommend, but must not independently approve, terminate, impose penalties, publish, or change contractual/financial rules.

## Roles
- `admin`: administrative operations, protected by strong authentication and an additional security layer.
- `family`: access only to its own family/patient records and permitted professional profiles.
- `caregiver`: access only to their own profile and assigned care work; no access to other caregivers, nurses, family records, or patient documents beyond the minimum necessary.
- `nurse`: access only to their own profile and assigned care work; no access to other nurses, caregivers, family records, or patient documents beyond the minimum necessary.

## Documents
Sensitive identity and credential documents remain private. Families may see an approved professional CV/profile view, not original private documents, and must not receive unrestricted download access.

## Administrative security layer
Use server-side verification for administrator security codes. Never store administrator secrets in frontend code. Support code rotation/revocation, rate limiting, lockouts, audit logging, and preferably MFA.

## Financial workflow
Care service is paid in advance for one week. Payment state and contract state must be auditable. Cancellation, refund, deductions, and penalties must follow the approved contract and applicable law; the AI must not invent or apply penalties autonomously.

## Auditability
Record sensitive actions such as login/security events, profile/document access, approvals, rejections, suspensions, terminations, payments, and contract changes with actor, timestamp, target, and reason where appropriate.

## AI collaboration
ChatGPT is the primary orchestrator. Claude and Gemini may be used for bounded analysis/review of images, software, invoices, and contract organization. They receive only the minimum data required for a task and do not receive unrestricted production database access.

## Release policy
Production changes require validation and final approval before release. Public advertising/social publication is a separate final approval step.
