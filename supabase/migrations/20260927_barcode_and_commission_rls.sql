-- ==============================================================
--  RAFIQ | رفيق
--  Row Level Security for barcodes, partners and settlements
--  Migration: 20260927_barcode_and_commission_rls.sql
-- ==============================================================
--  Rules enforced here:
--    * A member can read only their OWN barcode.
--    * Nobody can write their own barcode  -> manager only.
--    * Only CONTRACTED partners (contract_status='active') are
--      visible to members. Un-contracted partners stay hidden
--      until a deal is signed.
--    * Only admins/managers can verify orders or mark a
--      settlement as paid.
--    * Money columns are never writable by a member.
-- ==============================================================

begin;

-- helper: is the current user an admin or manager?
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('admin','manager')
      and status = 'active'
  );
$$;

-- ------------------------------------------------------------
-- Enable RLS
-- ------------------------------------------------------------
alter table public.partners          enable row level security;
alter table public.member_barcodes   enable row level security;
alter table public.partner_barcodes  enable row level security;
alter table public.service_orders    enable row level security;
alter table public.settlements       enable row level security;

-- drop existing policies so the migration is re-runnable
drop policy if exists partners_read_active            on public.partners;
drop policy if exists partners_staff_write           on public.partners;
drop policy if exists member_barcode_read_own        on public.member_barcodes;
drop policy if exists member_barcode_staff_write     on public.member_barcodes;
drop policy if exists partner_barcode_read_active    on public.partner_barcodes;
drop policy if exists partner_barcode_staff_write    on public.partner_barcodes;
drop policy if exists orders_read_own_or_staff       on public.service_orders;
drop policy if exists orders_member_report           on public.service_orders;
drop policy if exists orders_staff_manage           on public.service_orders;
drop policy if exists settlements_staff_only         on public.settlements;

-- ------------------------------------------------------------
-- PARTNERS
-- Members see only contracted partners.
-- Staff see everything.
-- ------------------------------------------------------------
create policy partners_read_active on public.partners
  for select
  to authenticated
  using (
    public.is_staff()
    or (contract_status = 'active' and status = 'active')
  );

create policy partners_staff_write on public.partners
  for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ------------------------------------------------------------
-- MEMBER BARCODES
-- A member may READ their own barcode only.
-- Only staff may create, activate or suspend a barcode.
-- ------------------------------------------------------------
create policy member_barcode_read_own on public.member_barcodes
  for select
  to authenticated
  using ( user_id = auth.uid() or public.is_staff() );

create policy member_barcode_staff_write on public.member_barcodes
  for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ------------------------------------------------------------
-- PARTNER BARCODES
-- ------------------------------------------------------------
create policy partner_barcode_read_active on public.partner_barcodes
  for select
  to authenticated
  using (
    public.is_staff()
    or (status = 'active' and exists (
          select 1 from public.partners p
          where p.id = partner_id
            and p.contract_status = 'active'
            and p.status = 'active'
        ))
  );

create policy partner_barcode_staff_write on public.partner_barcodes
  for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ------------------------------------------------------------
-- SERVICE ORDERS
-- A member may REPORT an order for themselves (read-only money).
-- A member may NOT verify, change prices, or mark it settled.
-- ------------------------------------------------------------
create policy orders_read_own_or_staff on public.service_orders
  for select
  to authenticated
  using ( member_user_id = auth.uid() or public.is_staff() );

-- Insert: a member may file a report for themselves.
-- The money columns are forced to the partner's real values by
-- the trigger, so a member cannot fake a discount or commission.
create policy orders_member_report on public.service_orders
  for insert
  to authenticated
  with check ( member_user_id = auth.uid() and status = 'reported' );

-- Update/delete: staff only.
create policy orders_staff_manage on public.service_orders
  for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ------------------------------------------------------------
-- SETTLEMENTS
-- Staff only. A member can never see or change money records.
-- ------------------------------------------------------------
create policy settlements_staff_only on public.settlements
  for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

commit;
