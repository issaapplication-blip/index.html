-- Secure foundation for the home-care platform.
-- Apply only to the intended Supabase project: qmuxaehrahfsnabyjens.
-- No service-role secrets belong in frontend code.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  first_name text,
  last_name text,
  phone text,
  address text,
  role text not null default 'family' check (role in ('family','caregiver','nurse','admin','manager')),
  status text not null default 'pending' check (status in ('pending','active','suspended','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  phone text,
  address text,
  region text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.caregivers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  father_name text,
  birth_date date,
  mobile text,
  landline text,
  languages text,
  experience text,
  services text,
  has_car boolean not null default false,
  car_type text,
  car_year integer check (car_year is null or car_year between 1950 and extract(year from now())::integer + 1),
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nurses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  father_name text,
  birth_date date,
  mobile text,
  specialty text,
  experience text,
  services text,
  languages text,
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected','suspended')),
  license_expires_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.worker_service_areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  worker_type text not null check (worker_type in ('caregiver','nurse')),
  country text not null default 'Lebanon',
  region text not null,
  district text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(user_id, worker_type, country, region, district)
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null,
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  file_size bigint check (file_size is null or file_size between 1 and 10485760),
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected','quarantined')),
  created_at timestamptz not null default now()
);

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  age integer check (age is null or age between 0 and 130),
  case_type text not null check (case_type in ('مسن','مريض','elderly','patient')),
  residence_address text,
  residence_region text,
  doctor_name text,
  doctor_phone text,
  medical_needs text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.care_requests (
  id uuid primary key default gen_random_uuid(),
  request_number text not null unique default ('CR-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),
  family_id uuid not null references public.families(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  service_region text,
  service_address text,
  required_services text,
  notes text,
  status text not null default 'draft' check (status in ('draft','pending_review','candidate_selection','pending_match_approval','matched','contract_pending','contract_accepted','payment_pending','payment_confirmed','contact_unlocked','active','completed','closed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.case_workers (
  id uuid primary key default gen_random_uuid(),
  care_request_id uuid not null references public.care_requests(id) on delete cascade,
  worker_user_id uuid not null references auth.users(id) on delete restrict,
  worker_type text not null check (worker_type in ('caregiver','nurse')),
  assignment_status text not null default 'proposed' check (assignment_status in ('proposed','approved','rejected','active','completed','cancelled')),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique(care_request_id, worker_user_id),
  unique(care_request_id, worker_type, assignment_status)
);

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  care_request_id uuid not null unique references public.care_requests(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft','pending_acceptance','accepted','rejected','cancelled','completed')),
  terms text not null,
  accepted_by_family_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  care_request_id uuid references public.care_requests(id) on delete set null,
  application_id uuid,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'USD',
  payment_method text not null default 'whish_money',
  period_start date,
  period_end date,
  status text not null default 'pending' check (status in ('pending','evidence_submitted','verified','rejected','refunded')),
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_evidence (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  reference_text text,
  created_at timestamptz not null default now()
);

create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  care_request_id uuid references public.care_requests(id) on delete cascade,
  approval_type text not null check (approval_type in ('manager_match','family_match','worker_match','contract','payment','equipment','service_booking')),
  requested_from uuid references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected','expired')),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.contact_unlocks (
  id uuid primary key default gen_random_uuid(),
  care_request_id uuid not null unique references public.care_requests(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unlocked_by uuid references auth.users(id) on delete set null,
  reason text
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_type text not null,
  status text not null default 'pending' check (status in ('pending','under_review','approved','rejected','cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_worker_service_areas_lookup on public.worker_service_areas(worker_type,country,region,district) where active = true;
create index if not exists idx_care_requests_status on public.care_requests(status);
create index if not exists idx_case_workers_request on public.case_workers(care_request_id);
create index if not exists idx_documents_user on public.documents(user_id);
create index if not exists idx_applications_user on public.applications(user_id);
create index if not exists idx_audit_logs_entity on public.audit_logs(entity_type,entity_id);

-- Updated-at helper.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists families_updated_at on public.families;
create trigger families_updated_at before update on public.families for each row execute function public.set_updated_at();
drop trigger if exists caregivers_updated_at on public.caregivers;
create trigger caregivers_updated_at before update on public.caregivers for each row execute function public.set_updated_at();
drop trigger if exists nurses_updated_at on public.nurses;
create trigger nurses_updated_at before update on public.nurses for each row execute function public.set_updated_at();
drop trigger if exists patients_updated_at on public.patients;
create trigger patients_updated_at before update on public.patients for each row execute function public.set_updated_at();
drop trigger if exists care_requests_updated_at on public.care_requests;
create trigger care_requests_updated_at before update on public.care_requests for each row execute function public.set_updated_at();
drop trigger if exists contracts_updated_at on public.contracts;
create trigger contracts_updated_at before update on public.contracts for each row execute function public.set_updated_at();
drop trigger if exists applications_updated_at on public.applications;
create trigger applications_updated_at before update on public.applications for each row execute function public.set_updated_at();

-- RLS is mandatory on all application tables.
alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.caregivers enable row level security;
alter table public.nurses enable row level security;
alter table public.worker_service_areas enable row level security;
alter table public.documents enable row level security;
alter table public.patients enable row level security;
alter table public.care_requests enable row level security;
alter table public.case_workers enable row level security;
alter table public.contracts enable row level security;
alter table public.payments enable row level security;
alter table public.payment_evidence enable row level security;
alter table public.approval_requests enable row level security;
alter table public.contact_unlocks enable row level security;
alter table public.applications enable row level security;
alter table public.audit_logs enable row level security;

-- Basic ownership policies. Sensitive workflow transitions remain server-side and should be exposed through restricted RPC/Edge Functions later.
drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists families_self_all on public.families;
create policy families_self_all on public.families for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists caregivers_self_all on public.caregivers;
create policy caregivers_self_all on public.caregivers for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists nurses_self_all on public.nurses;
create policy nurses_self_all on public.nurses for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists service_areas_self_all on public.worker_service_areas;
create policy service_areas_self_all on public.worker_service_areas for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists documents_self_all on public.documents;
create policy documents_self_all on public.documents for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists patients_family_select on public.patients;
create policy patients_family_select on public.patients for select to authenticated using (exists (select 1 from public.families f where f.id = patients.family_id and f.user_id = auth.uid()));
drop policy if exists patients_family_insert on public.patients;
create policy patients_family_insert on public.patients for insert to authenticated with check (exists (select 1 from public.families f where f.id = patients.family_id and f.user_id = auth.uid()));
drop policy if exists patients_family_update on public.patients;
create policy patients_family_update on public.patients for update to authenticated using (exists (select 1 from public.families f where f.id = patients.family_id and f.user_id = auth.uid())) with check (exists (select 1 from public.families f where f.id = patients.family_id and f.user_id = auth.uid()));

drop policy if exists care_requests_family_all on public.care_requests;
create policy care_requests_family_all on public.care_requests for all to authenticated using (exists (select 1 from public.families f where f.id = care_requests.family_id and f.user_id = auth.uid())) with check (exists (select 1 from public.families f where f.id = care_requests.family_id and f.user_id = auth.uid()));

drop policy if exists case_workers_request_owner_select on public.case_workers;
create policy case_workers_request_owner_select on public.case_workers for select to authenticated using (exists (select 1 from public.care_requests r join public.families f on f.id=r.family_id where r.id=case_workers.care_request_id and f.user_id=auth.uid()) or worker_user_id=auth.uid());

drop policy if exists contracts_request_owner_select on public.contracts;
create policy contracts_request_owner_select on public.contracts for select to authenticated using (exists (select 1 from public.care_requests r join public.families f on f.id=r.family_id where r.id=contracts.care_request_id and f.user_id=auth.uid()) or exists (select 1 from public.case_workers cw where cw.care_request_id=contracts.care_request_id and cw.worker_user_id=auth.uid()));

drop policy if exists applications_self_all on public.applications;
create policy applications_self_all on public.applications for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());

-- Payment/contact/approval/audit tables intentionally do not expose broad client write access.
-- They will be completed through privileged, tightly scoped server functions after project access is available.

-- Private Storage bucket expected by the frontend. Creation is intentionally omitted here because
-- storage configuration can vary and must be verified against the actual project before mutation.
