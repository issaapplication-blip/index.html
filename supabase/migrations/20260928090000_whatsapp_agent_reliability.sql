-- Additive, non-destructive WhatsApp agent state. Apply only after review to the existing RAFIQ project.
-- Edge Function/service role owns writes; public clients have no access to customer conversations.
create table if not exists public.whatsapp_conversations (
  contact text primary key, state jsonb not null default '{}'::jsonb, escalated boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(), provider_message_id text not null unique,
  direction text not null check (direction in ('inbound','outbound')), contact text not null, body text not null,
  intent text, status text not null default 'received' check (status in ('received','completed','sent','retry','failed')),
  in_reply_to uuid references public.whatsapp_messages(id) on delete set null, provider_response jsonb,
  error_message text, next_retry_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists whatsapp_messages_retry_idx on public.whatsapp_messages(status, next_retry_at) where status = 'retry';
create index if not exists whatsapp_messages_contact_idx on public.whatsapp_messages(contact, created_at desc);
alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_messages enable row level security;
revoke all on public.whatsapp_conversations, public.whatsapp_messages from anon, authenticated;
-- Active administrators can see operational state; customers retain no direct table access.
create policy "Admins can view WhatsApp conversations" on public.whatsapp_conversations
for select to authenticated using ((select public.is_admin()));
create policy "Admins can view WhatsApp messages" on public.whatsapp_messages
for select to authenticated using ((select public.is_admin()));
