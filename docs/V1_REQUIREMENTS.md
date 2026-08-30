# V1 Preview — Project Requirements

## 1. Governance
- The general manager/owner has final approval over sensitive, financial, contractual, employment, access-control, and publication decisions.
- AI assistants may analyze, review, recommend, and prepare drafts, but must not autonomously approve sensitive decisions.
- Sensitive actions should use an explicit pending-approval workflow and an audit trail.

## 2. Privacy and role isolation
- Families may browse approved professional profiles of caregivers and nurses.
- Professional profiles must not expose personal phone numbers, WhatsApp, email, or social-media contact details before an approved match and signed/accepted contract.
- Caregivers and nurses must not browse other applicants' private files.
- Caregivers and nurses must not receive private patient/family contact information before the required approval and contract workflow is completed.
- Private identity documents, certificates, medical documents, and other sensitive files must remain protected and accessible only according to role and case assignment.
- The public/professional profile must be separated from private account and document data.

## 3. Case staffing
- Each care case is assigned two workers according to the case requirements: two caregivers, two nurses, or an approved combination.
- Each assigned worker receives only the minimum information needed to perform the service.

## 4. Contract and communication gate
1. Case/request is created.
2. Candidates are reviewed and matched.
3. Both sides approve the match.
4. Contract is prepared.
5. Required signatures/acceptances are recorded.
6. Required payment is confirmed.
7. Only then are approved direct-contact details exposed to the relevant parties.

## 5. Payments and documents
- Weekly service payment is prepaid according to the approved contract.
- The system must support invoices, payment records, and transfer evidence.
- Whish Money is the intended transfer provider; no Western Union branding should be used.
- Any direct provider integration must use an official supported integration; otherwise transfer receipts are uploaded/recorded by an authorized user.
- Contract, invoice, and payment/transfer evidence should be available as clear PDF documents where applicable.

## 6. CV and cover-letter service
- Arabic is the base language and is represented by the Lebanese flag in the language selector.
- One foreign language is included in the base CV + cover-letter launch offer.
- Each additional standard language costs $20.
- German is an additional language priced at $25.
- Launch offer: CV + cover letter for $35 instead of the normal $60 price.
- CVs and cover letters require strict spelling, grammar, typography, structure, consistency, and ATS review.
- The review workflow should use ChatGPT, Gemini, and Claude as independent reviewers before final delivery.
- AI must not invent qualifications, employers, certificates, experience, or skills that the client did not provide.

## 7. Medical equipment coordination
- Equipment requests are coordinated between the family, the assigned nurse/caregiver, and the general manager.
- The system may collect requirements and supporting documents, but purchase/rental commitments require manager approval.
- Equipment records should be linked to the care case and relevant financial documents.

## 8. Security
- Supabase Authentication and RLS are the primary access-control layers.
- Private Storage must protect sensitive documents.
- QR/security codes may be used for document verification and controlled identification, without exposing private data.
- Additional manager-controlled security codes may be implemented as a separate layer, without replacing authentication, RLS, or server-side authorization.
- Service-role and other secret keys must never be placed in frontend code.

## 9. AI collaboration
- ChatGPT is the primary orchestrator.
- Claude and Gemini act as controlled reviewers/assistants.
- External AI services must receive only the minimum data required for the task.
- Sensitive data should not be sent to an external AI service unless the applicable authorization, privacy, and technical controls are in place.

## 10. V1 acceptance gate
V1 is not considered ready for public launch until:
- role isolation is tested;
- private Storage access is tested;
- contact information remains hidden before the contract gate;
- two-worker case assignment is tested;
- payment/invoice records are consistent;
- CV/cover-letter quality checks are demonstrated;
- manager approval gates are demonstrated;
- the UI is reviewed by the owner;
- and the owner explicitly approves the preview for the next stage.
