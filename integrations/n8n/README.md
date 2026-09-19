# RAFIQ WhatsApp Cloud API + n8n

## Target channel

- Business number: +961 81 506 299
- Meta Phone Number ID: 1324609540731383
- WhatsApp Business Account ID: 1571101954509141
- Connection target: Meta WhatsApp Cloud API
- Orchestration target: n8n
- Secondary number +961 70 600 157 is financial-only and must never be connected to this workflow.

## Architecture

Meta WhatsApp Cloud API
  -> n8n Webhook
  -> RAFIQ AI Agent / business rules
  -> Supabase
  -> n8n WhatsApp Cloud send
  -> Customer

## Security rules

- Never commit Meta access tokens, app secrets, webhook secrets, or n8n credentials.
- Store secrets only in n8n credentials / secret storage.
- The RAFIQ agent may collect information, classify requests, draft replies, and create intake records.
- Human/admin approval remains required for contracts, provider acceptance, matching decisions, money, commission, exceptions, access-control changes, publishing, and other consequential actions.

## Current Meta state

Meta Embedded Signup currently returns error #2655115:
"This account type does not support partner sharing / This number cannot be shared with this app."

Therefore the Core/Peach path is not assumed to be available. The direct Meta -> n8n path is the active fallback architecture.

## Supabase foundation

The project contains:
- public.whatsapp_integrations
- public.whatsapp_webhook_events

The integration record is pre-seeded for the RAFIQ number and intentionally contains no access token.

## Next implementation steps

1. Resolve Meta registration/Cloud API eligibility for the RAFIQ number.
2. Create Meta Developer App and WhatsApp product if required.
3. Configure n8n WhatsApp Business Cloud credentials.
4. Configure Meta webhook URL and verify token.
5. Build inbound-message workflow.
6. Add RAFIQ AI decision/approval layer.
7. Persist approved intake/events to Supabase.
8. Build outbound reply workflow.
9. Test with the RAFIQ number only.
