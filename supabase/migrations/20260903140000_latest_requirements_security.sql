-- Latest requirements layer.
-- This migration is intentionally additive and non-destructive.
-- Apply only after reconciling the live Supabase schema.

create extension if not exists pgcrypto;

-- Coarse work areas used for matching; exact home address remains private.
create table if not exists public.worker_service_areas (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references auth.users(id) on delete cascade,
  worker_type text not null check (worker_type in ('caregiver','nurse')),
  country text not null default 'Lebanon',
  region text not null,
  district text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_worker_service_areas_match
  on public.worker_service_areas(country, region, district, worker_type, active);

-- Case-specific service location. Exact address is protected by RLS/server workflow.
alter table public.care_requests
  add column if not exists service_region text,
  add column if not exists service_district text,
  add column if not exists service_address text;

-- Keep a structured family contact instead of placing phone numbers in generic notes.
alter table public.care_requests
  add column if not exists family_phone text;

-- Medical/home services requested by a family. Booking/fulfilment is coordinated with
-- an appropriately licensed provider and is subject to local law and safety rules.
create table if not exists public.medical_service_requests (
  id uuid primary key default gen_random_uuid(),
  care_request_id uuid not null references public.care_requests(id) on delete cascade,
  service_type text not null check (service_type in (
    'home_laboratory',
    'home_radiology',
    'ecg',
    'emg_nerve_conduction',
    'physical_therapy',
    'medical_equipment'
  )),
  status text not null default 'pending_review' check (status in (
    'pending_review','approved','scheduled','in_progress','completed','cancelled','rejected'
  )),
  preferred_date timestamptz,
  urgency_level text not null default 'routine' check (urgency_level in ('routine','priority','urgent')),
  clinical_notes text,
  provider_name text,
  provider_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_medical_service_requests_case
  on public.medical_service_requests(care_request_id, status, service_type);

alter table public.worker_service_areas enable row level security;
alter table public.medical_service_requests enable row level security;

-- Workers may manage only their own service-area records. Server-side checks must also
-- confirm worker_type against the authenticated profile role.
drop policy if exists worker_service_areas_owner_select on public.worker_service_areas;
create policy worker_service_areas_owner_select
on public.worker_service_areas for select
using (worker_id = auth.uid());

drop policy if exists worker_service_areas_owner_insert on public.worker_service_areas;
create policy worker_service_areas_owner_insert
on public.worker_service_areas for insert
with check (worker_id = auth.uid());

drop policy if exists worker_service_areas_owner_update on public.worker_service_areas;
create policy worker_service_areas_owner_update
on public.worker_service_areas for update
using (worker_id = auth.uid())
with check (worker_id = auth.uid());

-- No broad client policy for medical service requests. Creation/status changes should
-- go through an authorized server/Edge Function after the care request is validated.
