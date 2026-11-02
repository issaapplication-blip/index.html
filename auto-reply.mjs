/* SAFETY SHUTDOWN — WhatsApp must never invoke or receive an automated RAFIQ agent reply.
 * The approved architecture is inbound WhatsApp -> Supabase event log -> Telegram manager relay.
 * No Kapso polling, no AI call, and no WhatsApp send API call is permitted here.
 * This file intentionally exits without network access. Replace only after the
 * verified Meta webhook -> Telegram relay implementation is available in the repository.
 */
console.error("[RAFIQ] WhatsApp auto-reply worker is disabled by policy. No messages were read or sent.");
process.exitCode = 0;
