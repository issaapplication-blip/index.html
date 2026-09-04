-- Defense-in-depth hardening for sensitive/personal/health data.
-- Applied to Supabase project qmuxaehrahfsnabyjens.
-- Never place secret/service-role keys in frontend code.

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;

grant select, insert, update, delete on public.profiles, public.families, public.caregivers, public.nurses, public.patients, public.care_requests, public.applications, public.documents, public.matches, public.notifications to authenticated;
revoke insert, update, delete on public.audit_logs from authenticated;
grant select on public.audit_logs to authenticated;
alter default privileges in schema public revoke all on tables from authenticated;

create index if not exists idx_applications_user_id on public.applications(user_id);
create index if not exists idx_audit_logs_user_id on public.audit_logs(user_id);
create index if not exists idx_care_requests_family_id on public.care_requests(family_id);
create index if not exists idx_care_requests_patient_id on public.care_requests(patient_id);
create index if not exists idx_matches_care_request_id on public.matches(care_request_id);
create index if not exists idx_matches_caregiver_id on public.matches(caregiver_id);
create index if not exists idx_matches_nurse_id on public.matches(nurse_id);
create index if not exists idx_patients_family_id on public.patients(family_id);

create or replace function public.current_app_role()
returns text language sql stable security definer set search_path = ''
as $$ select role from public.profiles where id = (select auth.uid()) $$;

create or replace function public.current_app_status()
returns text language sql stable security definer set search_path = ''
as $$ select status from public.profiles where id = (select auth.uid()) $$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin' and status = 'active') $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, role, status)
  values (
    new.id,
    new.email,
    case when new.raw_user_meta_data->>'requested_role' in ('caregiver','nurse') then new.raw_user_meta_data->>'requested_role' else 'family' end,
    'pending'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.guard_profile_privilege_fields()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and (select auth.uid()) = old.id then
    if new.role is distinct from old.role or new.status is distinct from old.status then
      raise exception 'role/status changes require authorized server review';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_privilege_guard on public.profiles;
create trigger profiles_privilege_guard before update on public.profiles for each row execute function public.guard_profile_privilege_fields();

create or replace function public.guard_worker_verification()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and (select auth.uid()) = old.user_id then
    if new.verification_status is distinct from old.verification_status then
      raise exception 'verification status requires authorized review';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists caregivers_verification_guard on public.caregivers;
create trigger caregivers_verification_guard before update on public.caregivers for each row execute function public.guard_worker_verification();
drop trigger if exists nurses_verification_guard on public.nurses;
create trigger nurses_verification_guard before update on public.nurses for each row execute function public.guard_worker_verification();

create or replace function public.guard_application_workflow()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if (select auth.uid()) is not null and new.user_id <> (select auth.uid()) then
      raise exception 'application owner must be the signed-in user';
    end if;
    new.application_type := lower(trim(new.application_type));
    if new.application_type = 'cv' then new.application_type := 'cv'; end if;
    new.status := 'pending';
  elsif tg_op = 'UPDATE' and (select auth.uid()) is not null and old.user_id = (select auth.uid()) then
    if new.user_id is distinct from old.user_id or new.application_type is distinct from old.application_type then
      raise exception 'application owner/type cannot be changed by the applicant';
    end if;
    if new.status is distinct from old.status then
      raise exception 'application status requires authorized review';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists applications_workflow_guard on public.applications;
create trigger applications_workflow_guard before insert or update on public.applications for each row execute function public.guard_application_workflow();

create or replace function public.guard_document_workflow()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if (select auth.uid()) is not null and new.user_id <> (select auth.uid()) then
      raise exception 'document owner must be the signed-in user';
    end if;
    new.verification_status := 'pending';
  elsif tg_op = 'UPDATE' and (select auth.uid()) is not null and old.user_id = (select auth.uid()) then
    if new.user_id is distinct from old.user_id or new.storage_path is distinct from old.storage_path or new.verification_status is distinct from old.verification_status then
      raise exception 'document owner/path/verification cannot be changed by the applicant';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists documents_workflow_guard on public.documents;
create trigger documents_workflow_guard before insert or update on public.documents for each row execute function public.guard_document_workflow();

create or replace function public.guard_care_request_workflow()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if (select auth.uid()) is not null and not exists (select 1 from public.families f where f.id = new.family_id and f.user_id = (select auth.uid())) then
      raise exception 'care request owner is invalid';
    end if;
    new.status := 'pending';
  elsif tg_op = 'UPDATE' and (select auth.uid()) is not null and exists (select 1 from public.families f where f.id = old.family_id and f.user_id = (select auth.uid())) then
    if new.status is distinct from old.status and new.status <> 'cancelled' then
      raise exception 'care request workflow status requires authorized review';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists care_requests_workflow_guard on public.care_requests;
create trigger care_requests_workflow_guard before insert or update on public.care_requests for each row execute function public.guard_care_request_workflow();

revoke insert, update, delete on public.audit_logs from anon, authenticated;

alter policy "Users can view own profile" on public.profiles using (id = (select auth.uid()));
alter policy "Users can update safe profile fields" on public.profiles using (id = (select auth.uid())) with check ((id = (select auth.uid())) and role = (select public.current_app_role()) and status = (select public.current_app_status()));
alter policy "Users can view own family" on public.families using (user_id = (select auth.uid()));
alter policy "Users can insert own family" on public.families with check (user_id = (select auth.uid()));
alter policy "Users can update own family" on public.families using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy "Users can view own caregiver profile" on public.caregivers using (user_id = (select auth.uid()));
alter policy "Users can insert own caregiver profile" on public.caregivers with check (user_id = (select auth.uid()));
alter policy "Users can update own caregiver profile" on public.caregivers using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy "Users can view own nurse profile" on public.nurses using (user_id = (select auth.uid()));
alter policy "Users can insert own nurse profile" on public.nurses with check (user_id = (select auth.uid()));
alter policy "Users can update own nurse profile" on public.nurses using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy "Users can view own applications" on public.applications using (user_id = (select auth.uid()));
alter policy "Users can create own applications" on public.applications with check (user_id = (select auth.uid()));
alter policy "Users can update own applications" on public.applications using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy "Users can view own documents" on public.documents using (user_id = (select auth.uid()));
alter policy "Users can create own documents" on public.documents with check (user_id = (select auth.uid()));
alter policy "Users can update own documents" on public.documents using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy "Users can delete own documents" on public.documents using (user_id = (select auth.uid()));
alter policy "Users can view own notifications" on public.notifications using (user_id = (select auth.uid()));
alter policy "Users can update own notifications" on public.notifications using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
