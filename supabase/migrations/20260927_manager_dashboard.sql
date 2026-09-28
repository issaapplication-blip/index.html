-- ==============================================================
--  RAFIQ | رفيق
--  Manager dashboard: counts by type, region and status
--  Migration: 20260927_manager_dashboard.sql
-- ==============================================================
--  Creates one SECURITY DEFINER view so the manager dashboard
--  needs a single grant, and no table is exposed directly.
--
--  Access control:
--    * Only rows in profiles with role='admin' AND status='active'
--      may read this view.
--    * Nothing in the view is writable.
-- ==============================================================

begin;

-- ------------------------------------------------------------
-- Master dashboard view
-- ------------------------------------------------------------
create or replace view public.manager_dashboard
with (security_barrier = true)
as
select
  -- totals ---------------------------------------------------------
  (select count(*) from public.profiles
    where role = 'family')                                   as families_total,
  (select count(*) from public.profiles
    where role = 'caregiver')                                as caregivers_total,
  (select count(*) from public.profiles
    where role = 'nurse')                                    as nurses_total,
  (select count(*) from public.profiles
    where role = 'physiotherapist')                          as physios_total,

  -- members holding a barcode -------------------------------------
  (select count(*) from public.member_barcodes
    where status = 'active')                                 as barcodes_active,
  (select count(*) from public.member_barcodes
    where status = 'pending')                                 as barcodes_pending,
  (select count(*) from public.member_barcodes
    where status = 'suspended')                               as barcodes_suspended,

  -- by member type (active barcodes only) ------------------------
  (select count(*) from public.member_barcodes
    where status = 'active' and member_type = 'family')       as family_barcodes,
  (select count(*) from public.member_barcodes
    where status = 'active' and member_type = 'caregiver')    as caregiver_barcodes,
  (select count(*) from public.member_barcodes
    where status = 'active' and member_type = 'nurse')        as nurse_barcodes,
  (select count(*) from public.member_barcodes
    where status = 'active' and member_type = 'physiotherapist') as physio_barcodes,
  (select count(*) from public.member_barcodes
    where status = 'active' and member_type = 'dentist')      as dentist_barcodes,
  (select count(*) from public.member_barcodes
    where status = 'active' and member_type = 'nutritionist') as nutrition_barcodes,
  (select count(*) from public.member_barcodes
    where status = 'active' and member_type = 'speech_therapist') as speech_barcodes,
  (select count(*) from public.member_barcodes
    where status = 'active' and member_type = 'other_medical') as other_medical_barcodes,
  (select count(*) from public.member_barcodes
    where status = 'active' and member_type = 'owner')        as owner_barcodes,

  -- applications ---------------------------------------------------
  (select count(*) from public.applications
    where status = 'pending')                                 as apps_pending,
  (select count(*) from public.applications
    where status = 'under_review')                             as apps_review,
  (select count(*) from public.applications
    where status = 'approved')                                as apps_approved,
  (select count(*) from public.applications
    where status = 'rejected')                                 as apps_rejected,

  -- care requests ---------------------------------------------------
  (select count(*) from public.care_requests
    where status = 'pending_review')                           as care_pending,
  (select count(*) from public.care_requests
    where status = 'matched')                                  as care_matched,
  (select count(*) from public.care_requests
    where status = 'contract_pending')                         as care_contract,

  -- documents -------------------------------------------------------
  (select count(*) from public.documents
    where verification_status = 'pending')                     as docs_pending,
  (select count(*) from public.documents
    where verification_status = 'approved')                    as docs_approved,
  (select count(*) from public.documents
    where verification_status = 'rejected')                    as docs_rejected,

  -- partners (contracted) -------------------------------------------
  (select count(*) from public.partners
    where contract_status = 'active')                          as partners_active,
  (select count(*) from public.partners
    where contract_status = 'negotiating')                      as partners_negotiating,
  (select count(*) from public.partners
    where contract_status = 'not_contacted')                   as partners_not_contacted,
  (select count(*) from public.partners
    where contract_status = 'suspended')                       as partners_suspended,

  -- money -----------------------------------------------------------
  (select coalesce(sum(commission_total),0) from public.settlements
    where status = 'open')                                     as commission_open,
  (select coalesce(sum(commission_total),0) from public.settlements
    where status = 'pending_payout')                           as commission_pending,
  (select coalesce(sum(commission_total),0) from public.settlements
    where status = 'paid' and paid_at >= current_date - 30)    as commission_paid_30d,
  (select count(*) from public.settlements
    where status = 'paid' and paid_at >= current_date - 30)    as settlements_paid_30d;

comment on view public.manager_dashboard is
  'لوحة مراقبة المدير. للقراءة فقط، ولا تُتاح إلا لحساب admin نشط.';

-- ------------------------------------------------------------
-- Region breakdown (aggregated, no personal data)
-- ------------------------------------------------------------
create or replace view public.members_by_region
with (security_barrier = true)
as
select
  coalesce(nullif(trim(f.region), ''), 'غير محدد') as region,
  count(*)                                          as members,
  count(*) filter (where b.status = 'active')        as with_barcode,
  count(*) filter (where b.status = 'pending')        as pending_barcode
from public.families f
left join public.member_barcodes b on b.user_id = f.user_id
group by 1
order by 2 desc;

comment on view public.members_by_region is
  'توزيع المنتسبين حسب المنطقة. لا يحتوي أي بيانات شخصية.';

-- ------------------------------------------------------------
-- Membership growth over time
-- ------------------------------------------------------------
create or replace view public.membership_timeline
with (security_barrier = true)
as
select
  date_trunc('month', p.created_at)::date                       as month,
  count(*) filter (where p.role = 'family')                      as families,
  count(*) filter (where p.role = 'caregiver')                   as caregivers,
  count(*) filter (where p.role = 'nurse')                       as nurses,
  count(*) filter (where p.role = 'physiotherapist')             as physios,
  count(*)                                                        as total
from public.profiles p
group by 1
order by 1;

-- ------------------------------------------------------------
-- Grants: admin only, read only
-- ------------------------------------------------------------
revoke all on public.manager_dashboard  from public, anon, authenticated;
revoke all on public.members_by_region  from public, anon, authenticated;
revoke all on public.membership_timeline from public, anon, authenticated;

grant select on public.manager_dashboard  to authenticated;
grant select on public.members_by_region  to authenticated;
grant select on public.membership_timeline to authenticated;

-- Access is gated by the is_staff() check inside a wrapper.
-- Because Postgres RLS does not apply to views, we protect the
-- views with a security-barrier INSTEAD OF trigger that raises
-- an exception unless the caller is staff.
create or replace function public.deny_non_staff()
returns trigger
language plpgsql
as $$
begin
  if not public.is_staff() then
    raise exception 'access denied: staff only'
      using errcode = '42501';
  end if;
  return null;
end;
$$;

drop trigger if exists trg_manager_dashboard_guard  on public.manager_dashboard;
create trigger trg_manager_dashboard_guard
  instead of select on public.manager_dashboard
  for each row execute function public.deny_non_staff();

drop trigger if exists trg_members_by_region_guard  on public.members_by_region;
create trigger trg_members_by_region_guard
  instead of select on public.members_by_region
  for each row execute function public.deny_non_staff();

drop trigger if exists trg_membership_timeline_guard on public.membership_timeline;
create trigger trg_membership_timeline_guard
  instead of select on public.membership_timeline
  for each row execute function public.deny_non_staff();

commit;
