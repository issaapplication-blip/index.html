-- Keep the existing frontend compatible with the database enum/check constraint.
-- Applicant submissions are normalized and always start pending.

create or replace function public.guard_application_workflow()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if (select auth.uid()) is not null and new.user_id <> (select auth.uid()) then
      raise exception 'application owner must be the signed-in user';
    end if;
    new.application_type := lower(trim(new.application_type));
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
