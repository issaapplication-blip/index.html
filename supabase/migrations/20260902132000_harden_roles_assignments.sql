-- Hardening pass: prevent client role/status escalation and allow two workers of the same type.

alter table public.case_workers drop constraint if exists case_workers_care_request_id_worker_type_assignment_status_key;

create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and auth.uid() = old.id then
    if new.role is distinct from old.role or new.status is distinct from old.status then
      raise exception 'role/status changes require an authorized server operation';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_privilege_guard on public.profiles;
create trigger profiles_privilege_guard
before update on public.profiles
for each row execute function public.prevent_profile_privilege_escalation();

-- Prevent workers from assigning themselves to cases through direct client writes.
drop policy if exists case_workers_request_owner_select on public.case_workers;
create policy case_workers_request_owner_select on public.case_workers
for select to authenticated
using (
  worker_user_id = auth.uid()
  or exists (
    select 1
    from public.care_requests r
    join public.families f on f.id = r.family_id
    where r.id = case_workers.care_request_id
      and f.user_id = auth.uid()
  )
);

-- No INSERT/UPDATE/DELETE policy is created for case_workers on purpose.
-- Assignments must be performed by a restricted server function after verification/approval.

-- A worker may maintain only their own service-area rows; candidate matching should expose region-level data only.

-- Prevent clients from changing verification state in worker records.
create or replace function public.prevent_worker_verification_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and auth.uid() = old.user_id then
    if new.verification_status is distinct from old.verification_status then
      raise exception 'verification status requires authorized review';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists caregivers_verification_guard on public.caregivers;
create trigger caregivers_verification_guard before update on public.caregivers for each row execute function public.prevent_worker_verification_escalation();
drop trigger if exists nurses_verification_guard on public.nurses;
create trigger nurses_verification_guard before update on public.nurses for each row execute function public.prevent_worker_verification_escalation();

-- Keep audit logs append-only for clients: no client INSERT/UPDATE/DELETE policies are granted.
-- Server-side functions will write audit events with the minimum necessary metadata.
