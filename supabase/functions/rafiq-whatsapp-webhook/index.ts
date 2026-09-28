// Deploy with Supabase secrets: WHATSAPP_VERIFY_TOKEN, WHATSAPP_APP_SECRET,
// WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, OPENAI_API_KEY. No secret is exposed to browsers.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const encoder = new TextEncoder();
const secret = (name: string) => Deno.env.get(name) ?? '';
const db = createClient(secret('SUPABASE_URL'), secret('SUPABASE_SERVICE_ROLE_KEY'));

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false; let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}
async function hmacHex(value: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret('WHATSAPP_APP_SECRET')), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)))].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
function classify(text: string) {
  const t = text.toLowerCase();
  if (/طوار|emergency/.test(t)) return 'emergency';
  if (/مدير|إدارة|ادارة/.test(t)) return 'manager';
  if (/سعر|تكلفة|كم/.test(t)) return 'pricing';
  if (/علاج.*فيزيائ|physio/.test(t)) return 'physiotherapy';
  if (/ممرض|تمريض|nurse/.test(t)) return 'nursing';
  if (/مسن|كبير.*سن|caregiver|مقدم.*رعاية/.test(t)) return 'elderly_care';
  if (/cv|سيرة|وظيف/.test(t)) return 'cv';
  return 'general';
}
function safetyReply(intent: string) {
  if (intent === 'emergency') return 'إذا كانت هناك حالة طارئة أو خطر مباشر، اتصلوا فورًا بخدمات الطوارئ المحلية أو بالفريق الطبي المعالج. لا تؤخروا طلب المساعدة بانتظار الرد هنا.';
  if (intent === 'manager') return 'سأسجّل طلب التحدث مع الإدارة ليتم الاطلاع عليه. لا أستطيع الادعاء بأن المدير رد قبل أن يتابع الحالة.';
  if (intent === 'pricing') return 'تُحدد الأسعار والتوفر بعد مراجعة نوع الخدمة والمنطقة والجدول؛ لا أستطيع تأكيد سعر أو موعد قبل مراجعة الفريق.';
  return '';
}
async function aiReply(text: string, intent: string, state: Record<string, unknown>) {
  const fixed = safetyReply(intent); if (fixed) return fixed;
  const response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { authorization: `Bearer ${secret('OPENAI_API_KEY')}`, 'content-type': 'application/json' }, body: JSON.stringify({ model: 'gpt-5.6-luna', input: [{ role: 'system', content: 'أنت وكيل خدمة العملاء والاستقبال في RAFIQ لبنان. أجب بالعربية باختصار. لا تشخّص ولا تصف دواء ولا تخترع أسعارًا أو توفرًا أو مواعيد. اجمع فقط أهم معلومة ناقصة واحدة، وصعّد القرارات الحساسة للإدارة.' }, { role: 'user', content: `النية: ${intent}\nالسياق: ${JSON.stringify(state)}\nرسالة العميل: ${text}` }] }) });
  if (!response.ok) throw new Error(`OpenAI ${response.status}`);
  const data = await response.json();
  return data.output_text || 'شكرًا لرسالتك. ما المنطقة والوقت المطلوبان للخدمة؟';
}
async function sendWhatsApp(to: string, text: string) {
  const response = await fetch(`https://graph.facebook.com/v21.0/${secret('WHATSAPP_PHONE_NUMBER_ID')}/messages`, { method: 'POST', headers: { authorization: `Bearer ${secret('WHATSAPP_ACCESS_TOKEN')}`, 'content-type': 'application/json' }, body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }) });
  if (!response.ok) throw new Error(`WhatsApp ${response.status}`);
  return await response.json();
}

Deno.serve(async request => {
  const url = new URL(request.url);
  if (request.method === 'GET') return url.searchParams.get('hub.verify_token') === secret('WHATSAPP_VERIFY_TOKEN') ? new Response(url.searchParams.get('hub.challenge') ?? '', { status: 200 }) : new Response('forbidden', { status: 403 });
  const raw = await request.text();
  const signature = request.headers.get('x-hub-signature-256')?.replace('sha256=', '');
  if (!signature || !constantTimeEqual(signature, await hmacHex(raw))) return new Response('invalid signature', { status: 401 });
  const payload = JSON.parse(raw);
  const message = payload.entry?.flatMap((entry: any) => entry.changes ?? []).flatMap((change: any) => change.value?.messages ?? [])[0];
  if (!message?.id || message.type !== 'text') return json({ received: true });
  const contact = message.from, text = message.text?.body?.trim(); if (!contact || !text) return json({ received: true });
  const { data: inserted, error: insertError } = await db.from('whatsapp_messages').insert({ provider_message_id: message.id, direction: 'inbound', contact, body: text, intent: classify(text), status: 'received' }).select('id,intent').maybeSingle();
  if (insertError?.code === '23505') return json({ received: true, duplicate: true });
  if (insertError || !inserted) return new Response('persistence failure', { status: 503 });
  const intent = inserted.intent, escalation = ['emergency', 'manager'].includes(intent);
  const { data: existing } = await db.from('whatsapp_conversations').select('state').eq('contact', contact).maybeSingle();
  const state = { ...(existing?.state ?? {}), last_intent: intent, last_message: text, escalation, updated_at: new Date().toISOString() };
  await db.from('whatsapp_conversations').upsert({ contact, state, escalated: escalation }, { onConflict: 'contact' });
  try {
    const reply = await aiReply(text, intent, state); const delivery = await sendWhatsApp(contact, reply);
    await db.from('whatsapp_messages').insert({ provider_message_id: `out:${message.id}`, direction: 'outbound', contact, body: reply, intent, status: 'sent', in_reply_to: inserted.id, provider_response: delivery });
    await db.from('whatsapp_messages').update({ status: 'completed' }).eq('id', inserted.id);
  } catch (error) { await db.from('whatsapp_messages').update({ status: 'retry', error_message: String(error).slice(0, 1000), next_retry_at: new Date(Date.now() + 60_000).toISOString() }).eq('id', inserted.id); }
  return json({ received: true });
});
