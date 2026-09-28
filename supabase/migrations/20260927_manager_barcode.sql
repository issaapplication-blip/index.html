-- ==============================================================
--  RAFIQ | رفيق
--  Manager identity barcode + manager-only audit helpers
--  Migration: 20260927_manager_barcode.sql
-- ==============================================================
--  Creates the FIRST barcode: the manager's own.
--  This is the seed row so you can test the whole flow
--  (scan -> see type -> see what the platform knows about you)
--  before inviting anyone else.
-- ==============================================================

begin;

-- ------------------------------------------------------------
-- 1) Seed the manager barcode, linked to the admin account.
--    Uses issaapplication@gmail.com, the account that already
--    exists in profiles with role='admin'.
--    Safe to re-run: the second insert is a no-op.
-- ------------------------------------------------------------
insert into public.member_barcodes (user_id, code, member_type, status, issued_at, note)
select
  p.id,
  'RAFIQ-MGR-0001',
  'owner',
  'active',
  now(),
  'باركود مدير المنصة — أول باركود للتجربة'
from public.profiles p
where lower(p.email) = 'issaapplication@gmail.com'
  and p.role = 'admin'
on conflict (code) do nothing;

-- If the admin profile does not exist yet, create a placeholder
-- barcode that is NOT linked to any user, so it can be claimed
-- later without touching data.
insert into public.member_barcodes (user_id, code, member_type, status, issued_at, note)
select
  (select id from public.profiles where lower(email)='issaapplication@gmail.com' limit 1),
  'RAFIQ-MGR-0002',
  'owner',
  'pending',
  null,
  'باركود احتياطي للمدير — يُفعّل بعد تأكيد الحساب'
where exists (select 1 from public.profiles where lower(email)='issaapplication@gmail.com')
on conflict (code) do nothing;

-- ------------------------------------------------------------
-- 2) Manager can see the full audit trail of contact unlocks
-- ------------------------------------------------------------
create or replace view public.privacy_audit
with (security_barrier = true)
as
select
  cu.id,
  cu.status,
  cu.created_at,
  cu.decided_at,
  cu.subject_user_id,
  cu.requester_user_id
from public.contact_unlocks cu
where public.is_staff();

comment on view public.privacy_audit is
  'سجل من كشف بيانات التواصل. للمدير فقط.';

revoke all on public.privacy_audit from public, anon, authenticated;
grant select on public.privacy_audit to authenticated;

drop trigger if exists trg_privacy_audit_guard on public.privacy_audit;
create trigger trg_privacy_audit_guard
  instead of select on public.privacy_audit
  for each row execute function public.deny_non_staff();

-- ------------------------------------------------------------
-- 3) Nearest-caregiver search by region.
--    The agent needs this to answer "is there a nurse near me?"
--    without ever exposing a phone number.
-- ------------------------------------------------------------
create or replace function public.find_workers_near(
  p_region text,
  p_role   text default null
) returns table (
  worker_id uuid,
  full_name text,
  role      text,
  region    text,
  has_barcode boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')),
    p.role,
    coalesce(f.region, null),
    exists (select 1 from public.member_barcodes b
             where b.user_id = p.id and b.status = 'active')
  from public.profiles p
  left join public.families f on f.user_id = p.id
  where p.status = 'active'
    and p.role in ('caregiver','nurse','physiotherapist')
    and (p_role is null or p.role = p_role)
    and (p_region is null or f.region ilike '%' || p_region || '%')
  order by p.role, p.created_at
  limit 50;
$$;

comment on function public.find_workers_near(text, text) is
  'يجد مقدمي الخدمات حسب المنطقة. لا يُرجع أي رقم هاتف — الأرقام تبقى مخفية حتى الموافقة.';

revoke all on function public.find_workers_near(text, text) from public, anon;
grant execute on function public.find_workers_near(text, text) to authenticated;

commit;
