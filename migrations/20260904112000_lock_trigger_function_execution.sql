-- Trigger functions are internal implementation details and must never be callable over the Data API.
revoke execute on function public.guard_application_workflow() from public, anon, authenticated;
revoke execute on function public.guard_care_request_workflow() from public, anon, authenticated;
revoke execute on function public.guard_document_workflow() from public, anon, authenticated;
revoke execute on function public.guard_profile_privilege_fields() from public, anon, authenticated;
revoke execute on function public.guard_worker_verification() from public, anon, authenticated;
