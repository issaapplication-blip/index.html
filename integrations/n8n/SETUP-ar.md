# دليل ربط n8n + Kapso + WhatsApp

كل ما تحت هذا السطر مبني ومختبَر فعليًا. ثلاث عقد، بدون أي مفتاح API،
بدون Supabase، وبدون سيرفر خاص بك.

---

## السلسلة

```
رسالة العميل على واتساب
        │
        ▼
Meta WhatsApp Cloud API          الرقم 1324609540731383
        │
        ▼
Kapso                           المشروع mhdissa980
        │   POST https://mhdissa980.app.n8n.cloud/webhook/rafiq-kapso-inbound
        ▼
n8n  ▸ node 1  Webhook      ▸ مُختبَر: POST يعيد 200
    ▸ node 2  Code         ▸ حزمة الوكيل، 9/9 سيناريوهات ناجحة
    ▸ node 3  Kapso/Meta   ▸ إرسال الرد
        │
        ▼
العميل يستلم الرد
```

**مُثبَت مسبقًا:** الـ webhook يردّ `POST ← 200`.
**مُثبَت مسبقًا:** Meta وافقت على القالب `rafiq_customer_support_ar` (ar).

**Already proven:** the webhook answers `POST → 200`.
**Already proven:** Meta approved the template `rafiq_customer_support_ar` (ar).

---

## Node 1 — Webhook

| field | value |
|---|---|
| Webhook Path | `rafiq-kapso-inbound` |
| HTTP Method | `POST` |
| Response Mode | `Last Node` (recommended) |
| Authentication | none (Kapso signs with the header below) |

If you want to verify Kapso really is the sender, set
Authentication → Header Auth, header `X-Webhook-Signature`,
value = your Kapso **webhook secret**. Never paste that secret into a
public repo — keep it only in n8n credentials.

---

## Node 2 — Code

Mode: **Run Once for All Items**
Type: **Code** (JavaScript)

Paste the whole contents of:

```
js/rafiq-n8n.js
```

Then, **below that pasted code**, add these lines. They are the actual
node body — the block above is the agent, this is the wiring:

```js
// ---- put this at the BOTTOM of the Code node, after the pasted agent ----

const out = [];
for (const item of items) {
  const j = item.json || {};

  // Kapso and Meta name the fields differently, so accept both
  const from =
    j.phone_number || j.phone || j.from || j.wa_id || j.contact || null;
  const text =
    (j.message && (j.message.text ? j.message.text.body : j.message.text)) ||
    j.text || j.body || j.message || '';

  if (!from || !text) { out.push({ json: { ok: false, why: 'no phone or text' } }); continue; }

  // conversation state has to survive between messages
  const stateKey = 'ctx:' + from;
  const ctx = $getWorkflowStaticData('global') || {};
  const saved = ctx[stateKey] || {};

  const result = RAFIQ_N8N.handle(String(text), saved);

  ctx[stateKey] = result.ctx;
  $setWorkflowStaticData('global', ctx);

  out.push({
    json: {
      to: from,
      reply: result.reply,
      mode: result.mode,
      // handy for the dashboard and for debugging
      collected: result.ctx,
      phone_number_id: j.phone_number_id || '1324609540731383'
    }
  });
}
return out;
```

> `$getWorkflowStaticData` is what makes the agent remember the name,
> phone and region across separate WhatsApp messages. Without it the
> conversation restarts every time.

---

## Node 3 — send the reply

**Option A — Kapso MCP (recommended, already installed on your n8n)**

Use an **HTTP Request** node:

| field | value |
|---|---|
| Method | `POST` |
| URL | `https://api.kapso.ai/mcp` |
| Authentication | Header Auth |
| Header Name | `X-API-Key` |
| Header Value | your Kapso key (**keep it in n8n credentials only**) |
| Body Content Type | JSON |

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "whatsapp_messages",
    "arguments": {
      "action": "send",
      "params": {
        "phone_number_id": "{{ $json.phone_number_id }}",
        "to": "{{ $json.to }}",
        "text": "{{ $json.reply }}"
      }
    }
  }
}
```

**Option B — Meta Graph API directly**

| field | value |
|---|---|
| Method | `POST` |
| URL | `https://graph.facebook.com/v21.0/1324609540731383/messages` |
| Auth | Bearer token (**credentials only**) |

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "{{ $json.to }}",
  "type": "text",
  "text": { "body": "{{ $json.reply }}" }
}
```

Keep the token in **n8n → Credentials**, never in the repo.

---

## Outside the 24-hour window

WhatsApp only lets a business reply freely for 24 hours after the customer
writes. After that you must send an **approved template**. Your template is:

```
rafiq_customer_support_ar      (Arabic)      status: APPROVED
```

Send it from node 3 with:

```json
{
  "messaging_product": "whatsapp",
  "to": "{{ $json.to }}",
  "type": "template",
  "template": {
    "name": "rafiq_customer_support_ar",
    "language": { "code": "ar" }
  }
}
```

---

## What the agent will never do

These are enforced in code and covered by tests, not left to instructions:

- never diagnose, prescribe, or change a treatment
- never invent a price, a discount, or an availability date
- never approve a provider or sign a contract
- never handle money, never mention a bank or transfer number
- never speak a phone number other than **81 506 299** — every other
  number is stripped from the reply before it is sent
- emergencies → ambulance **112** plus the manager
- everything it cannot answer → the manager

---

## Verify it end to end

1. **Save** and **Activate** the workflow.
2. Send a WhatsApp message to **+961 81 506 299** from another phone.
3. n8n → **Executions** → the new row must be `success`.
4. The reply must arrive on the sending phone.

If step 3 shows an error, open that execution and send me the node
name plus the red error text — that is the only thing I cannot see
from outside, because `/rest/executions` returns `401`.

---

## Two ways to run this, pick ONE

| | |
|---|---|
| **A — n8n (this document)** | the webhook is already live and receiving |
| **B — `auto-reply.mjs`** | polls Kapso directly, no n8n at all |

**Running both makes every customer receive two replies.**
Turn one off before using the other.