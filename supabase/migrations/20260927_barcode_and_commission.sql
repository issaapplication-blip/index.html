-- ==============================================================
--  RAFIQ | رفيق
--  Barcode system + daily commission settlement
--  Migration: 20260927_barcode_and_commission.sql
-- ==============================================================
--  Adds:
--    1. member_barcodes  : one barcode per member (worker or family)
--    2. partners         : labs / imaging centres / clinics / equipment shops
--    3. partner_barcodes : one barcode per partner location
--    4. service_orders   : work done by a member at a partner
--    5. settlements      : daily commission batch per partner
--  All money is settled manually by the manager via Whish Money.
--  The AI agent never touches money. It can only create a request.
-- ==============================================================

begin;

-- ------------------------------------------------------------
-- 1. Partners (labs, imaging, clinics, equipment suppliers)
-- ------------------------------------------------------------
create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  partner_type text not null check (partner_type in (
    'lab',                 -- مختبر
    'imaging',             -- مركز أشعة
    'clinic',              -- عيادة
    'equipment',           -- معدات طبية / أطراف اصطناعية
    'physio_center',       -- مركز علاج فيزيائي
    'pharmacy',            -- صيدلية
    'dental',              -- أسنان
    'nutrition',           -- تغذية
    'speech',              -- نطق
    'other'
  )),
  -- only these categories may receive a commission settlement
  commission_eligible boolean not null default false,

  contact_name text,
  phone text,
  whatsapp text,
  email text,
  address text,
  region text,

  -- financial agreement
  commission_rate numeric(5,2) not null default 20.00
    check (commission_rate > 0 and commission_rate <= 100),
  standard_price numeric(12,2) check (standard_price is null or standard_price > 0),
  member_discount numeric(5,2) not null default 0
    check (member_discount >= 0 and member_discount <= 100),
  currency text not null default 'USD',

  -- contract lifecycle
  contract_status text not null default 'not_contacted' check (contract_status in (
    'not_contacted',    -- لم يتم الاتفاق بعد
    'negotiating',      -- قيد التفاوض
    'active',           -- موقّع العقد — ظاهر للمنتسبين
    'suspended'         -- موقوف مؤقتاً
  )),
  contract_signed_at timestamptz,
  contract_notes text,

  -- payout target (Whish Money). Stored here so it is on the barcode.
  whish_number text,
  payout_enabled boolean not null default false,

  status text not null default 'active' check (status in ('active','inactive')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.partners is
  'جهات متعاقدة: مختبرات، أشعة، عيادات، معدات. العمولة 20% تُحسم بعد الاتفاق فقط.';
comment on column public.partners.commission_eligible is
  'true فقط بعد توقيع العقد. الجهات غير المتعاقدة لا تظهر للمنتسبين ولا تستحق عمولة.';

-- ------------------------------------------------------------
-- 2. Barcodes
-- ------------------------------------------------------------
create table if not exists public.member_barcodes (
  id uuid primary key default gen_random_uuid(),
  -- owner is the platform user (family, caregiver, nurse, ...)
  user_id uuid not null unique references auth.users(id) on delete cascade,
  code text not null unique,
  -- the role shown when scanning
  member_type text not null check (member_type in (
    'family',              -- أسرة / منتسب من العائلات
    'caregiver',           -- مقدم رعاية
    'nurse',               -- ممرض/ة
    'physiotherapist',     -- معالج فيزيائي
    'dentist',             -- طبيب/ة أسنان
    'nutritionist',        -- أخصائي/ة تغذية
    'speech_therapist',    -- أخصائي/ة نطق
    'other_medical',       -- مختص طبي آخر
    'owner'                -- صاحب مؤسسة
  )),
  status text not null default 'pending' check (status in (
    'pending',      -- بانتظار مراجعة المدير
    'active',       -- معتمد — الباركود يعمل
    'suspended'     -- موقوف
  )),
  issued_at timestamptz,
  issued_by uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.member_barcodes is
  'باركود واحد لكل منتسب. يُنشأ عند الاعتماد من لوحة المدير فقط.';

create table if not exists public.partner_barcodes (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  code text not null unique,
  status text not null default 'pending' check (status in (
    'pending', 'active', 'suspended'
  )),
  issued_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3. Service orders  (member X used a service at partner Y)
-- ------------------------------------------------------------
create table if not exists public.service_orders (
  id uuid primary key default gen_random_uuid(),
  order_code text unique
    default ('RAFIQ-' || to_char(now(),'YYYYMMDD') || '-' ||
             upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  partner_id uuid not null references public.partners(id) on delete restrict,
  member_user_id uuid references auth.users(id) on delete set null,
  member_barcode_id uuid references public.member_barcodes(id) on delete set null,

  service_name text not null,
  service_date date not null default current_date,

  -- money snapshot at the time of the order
  list_price numeric(12,2) not null check (list_price > 0),   -- السعر الأساسي
  discount_pct numeric(5,2) not null default 0
    check (discount_pct >= 0 and discount_pct <= 100),        -- خصم المركز
  net_price numeric(12,2) not null check (net_price > 0),     -- السعر بعد الخصم
  commission_rate numeric(5,2) not null default 20.00
    check (commission_rate > 0 and commission_rate <= 100),
  commission_amount numeric(12,2) not null default 0
    check (commission_amount >= 0),
  currency text not null default 'USD',

  status text not null default 'reported' check (status in (
    'reported',    -- بلّغ عنه المنتسب
    'verified',    -- راجعه المدير
    'disputed',    -- محلّ نزاع
    'settled'      -- دُفعت العمولة
  )),
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  settlement_id uuid,
  note text,
  created_at timestamptz not null default now()
);

comment on table public.service_orders is
  'كل خدمة استفاد منها منتسب من جهة متعاقدة. تُجمَّع يومياً وتسوّى العمولة يدوياً.';

-- ------------------------------------------------------------
-- 4. Daily settlements (per partner, per day)
-- ------------------------------------------------------------
create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete restrict,
  business_date date not null,

  orders_count integer not null default 0 check (orders_count >= 0),
  gross_total numeric(12,2) not null default 0 check (gross_total >= 0),
  commission_total numeric(12,2) not null default 0 check (commission_total >= 0),
  currency text not null default 'USD',

  -- payout channel. Whish Money only.
  payout_method text not null default 'whish_money'
    check (payout_method = 'whish_money'),
  payout_reference text,       -- رقم عملية Whish
  payout_recipient text,       -- الرقم الذي استلم

  status text not null default 'open' check (status in (
    'open',          -- مفتوح — لم يُسوَّ بعد
    'pending_payout',-- بانتظار تحويل المدير
    'paid',          -- دُفعت العمولة
    'cancelled'
  )),
  paid_at timestamptz,
  paid_by uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (partner_id, business_date)
);

comment on table public.settlements is
  'تحويل العمولة: يدوي بالكامل عبر Whish Money إلى 70 600 157. الوكيل لا يتدخل.';

-- the order_code column is created with the table above;
-- nothing further is required here.

-- ------------------------------------------------------------
-- 5. Helper: calculate net price + commission automatically
-- ------------------------------------------------------------
create or replace function public.compute_order_totals()
returns trigger
language plpgsql
as $$
begin
  new.net_price := round(new.list_price * (1 - new.discount_pct / 100), 2);
  new.commission_amount := round(new.net_price * new.commission_rate / 100, 2);
  return new;
end;
$$;

drop trigger if exists trg_compute_order_totals on public.service_orders;
create trigger trg_compute_order_totals
  before insert or update of list_price, discount_pct, commission_rate
  on public.service_orders
  for each row execute function public.compute_order_totals();

-- ------------------------------------------------------------
-- 6. Helper: close the day for a partner (aggregate to settlement)
-- ------------------------------------------------------------
create or replace function public.close_partner_day(
  p_partner_id uuid,
  p_date date
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settlement uuid;
  v_count integer;
  v_gross numeric(12,2);
  v_comm numeric(12,2);
begin
  select count(*), coalesce(sum(net_price),0), coalesce(sum(commission_amount),0)
    into v_count, v_gross, v_comm
  from public.service_orders
  where partner_id = p_partner_id
    and service_date = p_date
    and status = 'verified';

  insert into public.settlements
    (partner_id, business_date, orders_count, gross_total, commission_total, status)
  values
    (p_partner_id, p_date, v_count, v_gross, v_comm, 'open')
  on conflict (partner_id, business_date)
  do update set orders_count   = excluded.orders_count,
                  gross_total    = excluded.gross_total,
                  commission_total= excluded.commission_total,
                  updated_at     = now()
  returning id into v_settlement;

  return v_settlement;
end;
$$;

revoke all on function public.close_partner_day(uuid, date) from public, anon, authenticated;
grant execute on function public.close_partner_day(uuid, date) to service_role;

commit;
