/* RAFIQ safety stop for legacy WhatsApp AI workflows.
 * WhatsApp is inbound-relay-only: it must never invoke this agent or generate
 * an automated customer reply. Do not paste an AI node after this file.
 * Use the reviewed Meta webhook -> Telegram manager relay implementation only.
 */
throw new Error("RAFIQ WhatsApp AI agent disabled: forward inbound messages to the Telegram manager only.");
