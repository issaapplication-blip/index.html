/* ==========================================================
   RAFIQ | رفيق — WhatsApp auto-reply worker
   ------------------------------------------------------------
   Polls Kapso for inbound messages, answers with the RAFIQ
   agent brain, and never touches money.

   Answer order (the agent can never go silent):
     1. rafiq-agent.js  guard  + knowledge base   (local, instant)
     2. OpenAI          only if OPENAI_API_KEY is set  (optional)
     3. Supabase Edge Function                     (optional)

   Required env:
     KAPSO_API_KEY
     KAPSO_PHONE_NUMBER_ID        (= 1324609540731383)
   Optional env:
     OPENAI_API_KEY, OPENAI_MODEL
     RAFIQ_AGENT_URL, SUPABASE_ANON_KEY
     POLL_MS
   ========================================================== */

import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));

/* the same brain the website uses - no network needed */
const RAFIQ_KB    = require(path.join(here, "js", "rafiq-kb.js"));
const RAFIQ_AGENT = require(path.join(here, "js", "rafiq-agent.js"));
RAFIQ_AGENT.configure({ kb: RAFIQ_KB, openaiKey: process.env.OPENAI_API_KEY || null });

/* ---------------- config ---------------- */
const KAPSO_MCP = "https://api.kapso.ai/mcp";
const KAPSO_KEY = process.env.KAPSO_API_KEY;
const PHONE_ID  = process.env.KAPSO_PHONE_NUMBER_ID;

const AGENT_URL = process.env.RAFIQ_AGENT_URL ||
  "https://qmuxaehrahfsnabyjens.supabase.co/functions/v1/rafiq-agent";
const ANON_KEY  = process.env.SUPABASE_ANON_KEY ||
  "sb_publishable_AYoQSOTwTF1w3RT6CglKmA_WVcYUVlD";

/* Never message a number that is not a customer. The business number is the
   only line the platform may ever write to, and the private lines are supplied
   through the environment rather than baked into the source, so no private
   number is ever published with the repository. */
const POLL_MS         = Number(process.env.POLL_MS || 20000);
const REVIEW_NUMBER   = "96181506299";
const SELF_NUMBER     = (process.env.KAPSO_PHONE_NUMBER || "").replace(/\D/g, "");
const BLOCKED_DIGITS  = new Set(
  (process.env.RAFIQ_BLOCKED_NUMBERS || "")
    .split(",")
    .map((s) => s.replace(/\D/g, ""))
    .filter(Boolean)
);

function isCustomer(to) {
  const d = String(to || "").replace(/\D/g, "");
  if (!d) return false;
  if (SELF_NUMBER && d === SELF_NUMBER) return false;   // never message ourselves
  if (BLOCKED_DIGITS.has(d)) return false;               // private / financial lines
  return true;
}

/* ---------------- Kapso MCP ---------------- */
async function kapsoRaw(name, args) {
  const r = await fetch(KAPSO_MCP, {
    method: "POST",
    headers: {
      "X-API-Key": KAPSO_KEY,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "2.0", id: Date.now(), method: "tools/call",
      params: { name, arguments: args }
    })
  });
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch { return { httpStatus: r.status, raw: text.slice(0, 600) }; }
  if (json.error) return { httpStatus: r.status, error: json.error };
  const raw = json?.result?.content?.[0]?.text;
  try { return { httpStatus: r.status, data: JSON.parse(raw).data }; }
  catch { return { httpStatus: r.status, raw: String(raw).slice(0, 600) }; }
}

async function kapso(name, args) {
  const r = await kapsoRaw(name, args);
  return r.data ?? null;
}

async function sendText(to, text) {
  if (!to || !text) return null;
  if (!isCustomer(to)) return null;          // private lines and our own number
  return kapso("whatsapp_messages", {
    action: "send",
    params: { phone_number_id: PHONE_ID, to, text }
  });
}

/* ---------------- read a conversation without knowing Kapso's exact shape ---
   The field names below are defensive on purpose: the first real response
   prints itself with KAPSO_DRY_RUN=1, so the shape can be confirmed instead of
   guessed. Several candidate names are accepted for each value. */
function readConversation(c) {
  const meta = c.kapso || c.meta || c.last_message || {};
  const flat = Object.assign({}, c, meta);

  const phone =
    c.phone_number || c.phone || c.from || flat.to || flat.contact || null;

  const text =
    meta.last_inbound_text || c.last_inbound_text ||
    meta.last_message_text || c.last_message_text ||
    meta.text || c.text || flat.body || flat.message || null;

  const id =
    meta.last_inbound_id || c.last_inbound_id ||
    meta.last_message_id || c.last_message_id ||
    meta.id || c.id || null;

  // direction, if Kapso exposes it: only ever answer an inbound message
  const dir = String(
    meta.last_direction || c.last_direction ||
    meta.direction || c.direction || ""
  ).toLowerCase();
  const inbound =
    !dir || /in|inbound|received|incoming/.test(dir);

  return { phone, text, id, inbound, raw: flat };
}

/* ---------------- dry run: prove the wiring, send nothing ---------------- */
async function dryRun() {
  console.log("--- KAPSO DRY RUN: nothing will be sent ---");
  if (!KAPSO_KEY) { console.error("KAPSO_API_KEY is not set"); process.exit(1); }

  const ping = await kapsoRaw("whatsapp_conversations", {
    action: "list", params: { phone_number_id: PHONE_ID, limit: 5 }
  });
  console.log("HTTP status:", ping.httpStatus);
  if (ping.error) console.log("error:", JSON.stringify(ping.error));
  if (ping.raw)    console.log("raw:", ping.raw);

  const convs = Array.isArray(ping.data) ? ping.data
              : Array.isArray(ping.data?.data) ? ping.data.data
              : null;
  if (!convs) {
    console.log("\nCould not read a conversation list. Paste the 'raw' line above");
    console.log("back to the agent and the field names will be corrected.");
    return;
  }

  console.log("conversations:", convs.length);
  for (const c of convs.slice(0, 3)) {
    const r = readConversation(c);
    console.log("  phone   :", r.phone);
    console.log("  inbound :", r.inbound);
    console.log("  text    :", String(r.text).slice(0, 80));
    if (r.text) {
      const ctx = RAFIQ_AGENT.extract(r.text, {});
      console.log("  reply   :", RAFIQ_AGENT.answerSync(r.text, ctx).split("\n")[0].slice(0, 80));
    }
    console.log("  keys    :", Object.keys(r.raw).join(", "));
    console.log("");
  }
}

/* ---------------- answer ---------------- */
async function askEdgeFunction(userText, ctx) {
  try {
    const r = await fetch(AGENT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + ANON_KEY },
      body: JSON.stringify({ message: userText, ctx, locale: "ar" })
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j.reply ? RAFIQ_AGENT.clean(j.reply) : null;
  } catch { return null; }
}

async function answer(userText, ctx) {
  // 1) local brain - instant, always available, and authoritative for intake
  let reply = RAFIQ_AGENT.answerSync(userText, ctx);

  // 2) the remote agent may only speak when the local brain had nothing
  //    specific to say; a generic greeting must never overwrite a real answer
  if (String(reply) === RAFIQ_AGENT.HANDOFF) {
    const remote = await askEdgeFunction(userText, ctx);
    if (remote && remote.length > String(reply).length) reply = remote;

    if (String(reply) === RAFIQ_AGENT.HANDOFF && process.env.OPENAI_API_KEY) {
      try { reply = (await RAFIQ_AGENT.answer(userText, ctx)) || reply; } catch { /* keep local */ }
    }
  }

  // final safety sweep: the review number is the only one the agent may speak
  reply = RAFIQ_AGENT.clean(reply) || RAFIQ_AGENT.HANDOFF;
  return reply;
}

/* ---------------- per-conversation intake state ---------------- */
const state = new Map();   // phone -> ctx

/** shared with the website, so both read a conversation the same way */
const absorb = (phone, text) => {
  state.set(phone, RAFIQ_AGENT.extract(text, state.get(phone) || {}));
  return state.get(phone);
};

/* ---------------- main loop ---------------- */
/* `seen` is persisted so a restart cannot reply twice to the same message */
const SEEN_FILE = process.env.KAPSO_SEEN_FILE ||
  path.join(here, ".rafiq-seen.json");
const DRY_RUN = process.env.KAPSO_DRY_RUN === "1";

let seen = new Set();
try {
  if (fs.existsSync(SEEN_FILE)) {
    seen = new Set(JSON.parse(fs.readFileSync(SEEN_FILE, "utf8")));
    console.log("restored", seen.size, "handled message(s) from disk");
  }
} catch { seen = new Set(); }

let saving = false;
function remember(key) {
  seen.add(key);
  if (saving) return;
  saving = true;
  setTimeout(() => {
    try {
      fs.writeFileSync(SEEN_FILE, JSON.stringify([...seen].slice(-2000)));
    } catch (e) {
      console.error("could not persist seen set:", e.message);
    }
    saving = false;
  }, 500);
}

let ticking = false;

async function tick() {
  if (ticking) return;
  ticking = true;
  try {
    if (!KAPSO_KEY || !PHONE_ID) {
      console.error("missing KAPSO_API_KEY or KAPSO_PHONE_NUMBER_ID");
      return;
    }

    const res = await kapsoRaw("whatsapp_conversations", {
      action: "list", params: { phone_number_id: PHONE_ID, limit: 25 }
    });
    const convs = Array.isArray(res.data) ? res.data
                : Array.isArray(res.data?.data) ? res.data.data
                : null;
    if (!convs) {
      if (res.error) console.error("kapso:", JSON.stringify(res.error).slice(0, 200));
      return;
    }

    for (const c of convs) {
      const r = readConversation(c);

      if (!r.phone || !r.id || !r.text) continue;
      if (c.status && c.status !== "active") continue;
      if (!r.inbound) continue;             // never answer our own message
      if (!isCustomer(r.phone)) continue;
      if (DRY_RUN) continue;                // never send in dry run

      const key = r.phone + "|" + r.id;
      if (seen.has(key)) continue;

      const ctx = absorb(r.phone, r.text);
      const reply = await answer(r.text, ctx);
      const sent = await sendText(r.phone, reply);

      if (sent) {
        remember(key);
        console.log(new Date().toISOString(), "replied to", r.phone, "->",
                    reply.split("\n")[0].slice(0, 70));
      }
      await new Promise((x) => setTimeout(x, 1200));   // stay under Meta rate limits
    }
  } catch (e) {
    console.error("tick failed:", e?.message || e);
  } finally {
    ticking = false;
  }
}

if (DRY_RUN) {
  dryRun();
} else {
  console.log("RAFIQ auto-reply started; poll every", POLL_MS, "ms");
  tick();
  setInterval(tick, POLL_MS);
}
