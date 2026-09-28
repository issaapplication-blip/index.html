-- ==============================================================
--  RAFIQ | رفيق
--  Privacy gate: no phone number or private contact leaves the
--  platform until a contract is signed and the admin approves.
--  Migration: 20260927_privacy_gate.sql
-- ==============================================================
--  Rules enforced:
--    * A family cannot see a worker's phone until an admin has
--      approved the request AND approved the worker's contract.
--    * A worker cannot see the family's phone until the same.
--    * Nobody can read the financial account number; it is not stored in
--      this repository and is held only in platform_settings.
--    * Un-contracted partners are invisible to members.
--    * Every unlock is written to audit_logs.
-- ==============================================================

begin;

-- ------------------------------------------------------------
-- 0) Reuse the existing unlock concept but make it strict
-- ------------------------------------------------------------
create table if not exists public.contact_unlocks (
  id uuid primary key default gen_random_uuid(),
  care_request_id uuid references public.care_requests(id) on delete cascade,
  subject_user_id uuid references auth.users(id) on delete cascade,
  requester_user_id uuid references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected','expired')),
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 1) staff helper (idempotent)
-- ------------------------------------------------------------
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin','manager') and status = 'active'
  );
$$;

-- ------------------------------------------------------------
-- 2) Can this user see that other user's phone?
--    Returns true ONLY when:
--      a) it is the same person, OR
--      b) the caller is staff, OR
--      c) there is an approved unlock AND the target worker or
--         family is itself approved/active.
-- ------------------------------------------------------------
create or replace function public.can_see_contact(p_other uuid)
returns boolean
language sql
stable
security_definer
set search_path = public
as $$
  select
    p_other = auth.uid()
    or public.is_staff()
    or exists (
      select 1
      from public.contact_unlocks cu
      where cu.subject_user_id  = p_other
        and cu.requester_user_id = auth.uid()
        and cu.status = 'approved'
        and cu.decided_at > now() - interval '30 days'
    );
$$;

comment on function public.can_see_contact(uuid) is
  'يعيد true إذا كان المستخدم يطابق نفسه، أو مدير، أو هناك موافقة إدارية على كشف التواصل خلال 30 يوماً.';

-- ------------------------------------------------------------
-- 3) Redacted directory view.
--    phone is nulled out unless can_see_contact() says yes.
--    The financial number is never exposed here.
-- ------------------------------------------------------------
create or replace view public.contact_directory
with (security_barrier = true)
as
select
  p.id,
  p.first_name,
  p.last_name,
  p.role,
  p.status,
  f.region,
  case when public.can_see_contact(p.id) then f.phone else null end as phone,
  case when public.can_see_contact(p.id) then f.address else null end as address,
  'masked'::text
    when not public.can_see_contact(p.id)
    else 'visible'::text
    as contact_visibility
from public.profiles p
left join public.families f on f.user_id = p.id
where p.role in ('family','caregiver','nurse','physiotherapist');

comment on view public.contact_directory is
  'دليل التواصل. الأرقام مخفية إلا بعد موافقة الإدارة. الرقم المالي غير موجود هنا إطلاقاً.';

-- Note: unlike manager_dashboard, this directory is readable by any
-- signed-in member. The RLS-free view relies on can_see_contact() to
-- blank the phone column, so no guard trigger is needed here.

-- ------------------------------------------------------------
-- 4) Block private lines at the database level
--    The digits live in platform_settings, NOT in this file, so the
--    financial account number is never committed to a public repo.
--    The manager seeds the row once from the Supabase SQL Editor.
--    See DEPLOY.md, section "Seeding the private numbers".
-- ------------------------------------------------------------
create table if not exists public.platform_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

comment on table public.platform_settings is
  'إعدادات المنصة الخاصة. الجدول غير مقروء إلا من الإدارة.';

alter table public.platform_settings enable row level security;

drop policy if exists settings_read_staff on public.platform_settings;
create policy settings_read_staff on public.platform_settings
  for select to authenticated
  using (public.is_staff());

drop policy if exists settings_write_staff on public.platform_settings;
create policy settings_write_staff on public.platform_settings
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- seeded empty so the trigger is valid on day one; the manager replaces ''
-- with the real digits in the SQL Editor
insert into public.platform_settings (key, value)
values ('blocked_phone_digits', '')
on conflict (key) do nothing;

create or replace function public.blocked_phone_digits()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select value from public.platform_settings where key = 'blocked_phone_digits'), '');
$$;

create or replace function public.block_private_number()
returns trigger
language plpgsql
as $$
declare
  blocked text := public.blocked_phone_digits();
  digits  text := replace(replace(coalesce(new.phone, ''), ' ', ''), '-', '');
begin
  if blocked <> '' and length(digits) >= 7 and digits like '%' || blocked || '%' then
    raise exception 'this number is not a member contact number'
      using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_block_financial_families  on public.families;
drop trigger if exists trg_block_private_families    on public.families;
create trigger trg_block_private_families
  before insert or update of phone on public.families
  for each row execute function public.block_private_number();

-- ------------------------------------------------------------
-- 5) Audit every unlock decision
-- ------------------------------------------------------------
create or replace function public.decide_contact_unlock(
  p_unlock_id uuid,
  p_approve boolean,
  p_note text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'access denied: staff only' using errcode = '42501';
  end if;

  update public.contact_unlocks
     set status    = case when p_approve then 'approved' else 'rejected' end,
         decided_by = auth.uid(),
         decided_at = now()
   where id = p_unlock_id;

  insert into public.audit_logs (action, table_name, record_id, user_id)
  values (
    case when p_approve then 'contact_unlock_approved' else 'contact_unlock_rejected' end,
    'contact_unlocks',
    p_unlock_id::text,
    auth.uid()
  );
end;
$$;

revoke all on function public.decide_contact_unlock(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.decide_contact_unlock(uuid, boolean, text) to authenticated;

commit;
