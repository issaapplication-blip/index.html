-- ==============================================================
--  RAFIQ | رفيق
--  Hard privacy: nothing public until a contract is signed
--  Migration: 20260927_public_visibility.sql
-- ==============================================================
--  A partner, a provider or a worker becomes visible on the
--  public site ONLY when:
--      1. an admin has approved them, AND
--      2. a contract has been signed (contract_status='active'),
--      3. the record has been explicitly published.
--
--  Until then their name, phone and services are invisible,
--  even to signed-in members. There is no "pending" leak.
-- ==============================================================

begin;

-- ------------------------------------------------------------
-- 1) publication flag
-- ------------------------------------------------------------
alter table public.partners
  add column if not exists is_public boolean not null default false;

alter table public.partners
  add column if not exists published_at timestamptz;

alter table public.partners
  add column if not exists published_by uuid references auth.users(id) on delete set null;

comment on column public.partners.is_public is
  'يظهر على المنصة العامة فقط بعد توقيع العقد واعتماد الإدارة.';

-- workers (caregivers / nurses / physios)
alter table public.profiles
  add column if not exists is_public boolean not null default false;

alter table public.profiles
  add column if not exists published_at timestamptz;

-- ------------------------------------------------------------
-- 2) Tighten the partners read policy
--    was: contract_status='active'
--    now: contract_status='active' AND is_public
-- ------------------------------------------------------------
drop policy if exists partners_read_active on public.partners;
create policy partners_read_active on public.partners
  for select
  to authenticated
  using (
    public.is_staff()
    or (contract_status = 'active' and status = 'active' and is_public)
  );

-- ------------------------------------------------------------
-- 3) Public partners view (still never shows a phone number)
-- ------------------------------------------------------------
create or replace view public.public_partners
with (security_barrier = true)
as
select
  p.id,
  p.name,
  p.partner_type,
  p.region,
  p.services_public,          -- may be null
  p.member_discount,
  p.currency,
  false as phone,              -- never exposed
  false as address
from public.partners p
where p.contract_status = 'active'
  and p.status = 'active'
  and p.is_public = true;

comment on view public.public_partners is
  'الجهات المعلنة. لا تحتوي أي رقم هاتف. تظهر بعد العقد فقط.';

-- add a short public description column if missing
alter table public.partners
  add column if not exists services_public text;

-- ------------------------------------------------------------
-- 4) A worker appears publicly only after approval + contract
-- ------------------------------------------------------------
create or replace view public.public_providers
with (security_barrier = true)
as
select
  p.id,
  trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')) as full_name,
  p.role,
  b.member_type
from public.profiles p
join public.member_barcodes b on b.user_id = p.id
where p.is_public = true
  and p.status = 'active'
  and b.status = 'active';

comment on view public.public_providers is
  'مقدمو الخدمات المعتمدون. بدون أي رقم هاتف أو عنوان.';

-- ------------------------------------------------------------
-- 5) Only the manager can publish
-- ------------------------------------------------------------
create or replace function public.publish_partner(
  p_partner_id uuid,
  p_publish boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'access denied: staff only' using errcode = '42501';
  end if;

  if p_publish and not exists (
    select 1 from public.partners
    where id = p_partner_id
      and contract_status = 'active'
      and status = 'active'
  ) then
    raise exception 'cannot publish: contract not signed or partner inactive'
      using errcode = '22023';
  end if;

  update public.partners
     set is_public    = p_publish,
         published_at  = case when p_publish then now() else null end,
         published_by  = case when p_publish then auth.uid() else null end,
         updated_at    = now()
   where id = p_partner_id;

  insert into public.audit_logs (action, table_name, record_id, user_id)
  values (
    case when p_publish then 'partner_published' else 'partner_unpublished' end,
    'partners', p_partner_id::text, auth.uid()
  );
end;
$$;

revoke all on function public.publish_partner(uuid, boolean) from public, anon, authenticated;
grant execute on function public.publish_partner(uuid, boolean) to authenticated;

-- ------------------------------------------------------------
-- 6) Same rule for workers
-- ------------------------------------------------------------
create or replace function public.publish_provider(
  p_user_id uuid,
  p_publish boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'access denied: staff only' using errcode = '42501';
  end if;

  if p_publish and not exists (
    select 1 from public.member_barcodes
    where user_id = p_user_id and status = 'active'
  ) then
    raise exception 'cannot publish: barcode not active'
      using errcode = '22023';
  end if;

  update public.profiles
     set is_public   = p_publish,
         published_at = case when p_publish then now() else null end
   where id = p_user_id;
end;
$$;

revoke all on function public.publish_provider(uuid, boolean) from public, anon, authenticated;
grant execute on function public.publish_provider(uuid, boolean) to authenticated;

commit;
