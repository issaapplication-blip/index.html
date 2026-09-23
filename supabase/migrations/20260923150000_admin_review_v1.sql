-- RAFIQ Admin workflow v1
-- Secure admin review for applications and private documents.
-- Target project: qmuxaehrahfsnabyjens.

create or replace function public.admin_review_application(
  p_application_id uuid,
  p_status text,
  p_notes text default null
)
returns public.applications
language plpgsql
security definer
set search_path = public
as $$
declare v_row public.applications;
begin
  if not public.is_admin() then
    raise exception 'admin access required';
  end if;
  if p_status not in ('under_review','approved','rejected','cancelled') then
    raise exception 'invalid application status';
  end if;
  update public.applications
     set status = p_status,
         notes = coalesce(p_notes, notes),
         updated_at = now()
   where id = p_application_id
   returning * into v_row;
  if v_row.id is null then raise exception 'application not found'; end if;
  insert into public.audit_logs(actor_user_id,event_type,entity_type,entity_id,metadata)
  values(auth.uid(),'admin_application_review','application',v_row.id,
         jsonb_build_object('status',p_status));
  return v_row;
end;
$$;

create or replace function public.admin_review_document(
  p_document_id uuid,
  p_status text
)
returns public.documents
language plpgsql
security definer
set search_path = public
as $$
declare v_row public.documents;
begin
  if not public.is_admin() then
    raise exception 'admin access required';
  end if;
  if p_status not in ('verified','rejected','quarantined') then
    raise exception 'invalid document status';
  end if;
  update public.documents
     set verification_status = p_status
   where id = p_document_id
   returning * into v_row;
  if v_row.id is null then raise exception 'document not found'; end if;
  insert into public.audit_logs(actor_user_id,event_type,entity_type,entity_id,metadata)
  values(auth.uid(),'admin_document_review','document',v_row.id,
         jsonb_build_object('status',p_status));
  return v_row;
end;
$$;

grant execute on function public.admin_review_application(uuid,text,text) to authenticated;
grant execute on function public.admin_review_document(uuid,text) to authenticated;

drop policy if exists admin_profiles_select on public.profiles;
create policy admin_profiles_select on public.profiles for select to authenticated using (public.is_admin() or id = (select auth.uid()));

drop policy if exists admin_applications_select on public.applications;
create policy admin_applications_select on public.applications for select to authenticated using (public.is_admin() or user_id = (select auth.uid()));

drop policy if exists admin_documents_select on public.documents;
create policy admin_documents_select on public.documents for select to authenticated using (public.is_admin() or user_id = (select auth.uid()));

drop policy if exists admin_caregivers_select on public.caregivers;
create policy admin_caregivers_select on public.caregivers for select to authenticated using (public.is_admin() or user_id = (select auth.uid()));

drop policy if exists admin_nurses_select on public.nurses;
create policy admin_nurses_select on public.nurses for select to authenticated using (public.is_admin() or user_id = (select auth.uid()));

drop policy if exists admin_families_select on public.families;
create policy admin_families_select on public.families for select to authenticated using (public.is_admin() or user_id = (select auth.uid()));

drop policy if exists admin_audit_select on public.audit_logs;
create policy admin_audit_select on public.audit_logs for select to authenticated using (public.is_admin());

-- Private application-files bucket access for active admins.
drop policy if exists admin_private_application_files_select on storage.objects;
create policy admin_private_application_files_select on storage.objects
for select to authenticated
using (bucket_id = 'application-files' and public.is_admin());

-- Prevent direct client-side manipulation of verification state; the RPCs above are the review path.
revoke execute on function public.admin_review_application(uuid,text,text) from anon;
revoke execute on function public.admin_review_document(uuid,text) from anon;
