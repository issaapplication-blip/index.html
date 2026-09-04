-- RLS performance hardening: evaluate auth.uid() once per statement where possible.

alter policy "Families can view own patients" on public.patients using (((select public.is_admin()) or exists (select 1 from public.families f where f.id = patients.family_id and f.user_id = (select auth.uid()))));
alter policy "Families can create own patients" on public.patients with check (exists (select 1 from public.families f where f.id = patients.family_id and f.user_id = (select auth.uid())));
alter policy "Families can update own patients" on public.patients using (exists (select 1 from public.families f where f.id = patients.family_id and f.user_id = (select auth.uid()))) with check (exists (select 1 from public.families f where f.id = patients.family_id and f.user_id = (select auth.uid())));
alter policy "Families can delete own patients" on public.patients using (exists (select 1 from public.families f where f.id = patients.family_id and f.user_id = (select auth.uid())));

alter policy "Families can view own care requests" on public.care_requests using (((select public.is_admin()) or exists (select 1 from public.families f where f.id = care_requests.family_id and f.user_id = (select auth.uid()))));
alter policy "Families can create own care requests" on public.care_requests with check (exists (select 1 from public.families f where f.id = care_requests.family_id and f.user_id = (select auth.uid())));
alter policy "Families can update own care requests" on public.care_requests using (exists (select 1 from public.families f where f.id = care_requests.family_id and f.user_id = (select auth.uid()))) with check (exists (select 1 from public.families f where f.id = care_requests.family_id and f.user_id = (select auth.uid())));
alter policy "Families can delete own care requests" on public.care_requests using (exists (select 1 from public.families f where f.id = care_requests.family_id and f.user_id = (select auth.uid())));

alter policy "Families can view matches for own requests" on public.matches using (((select public.is_admin()) or exists (select 1 from public.care_requests cr join public.families f on f.id = cr.family_id where cr.id = matches.care_request_id and f.user_id = (select auth.uid())) or exists (select 1 from public.caregivers c where c.id = matches.caregiver_id and c.user_id = (select auth.uid())) or exists (select 1 from public.nurses n where n.id = matches.nurse_id and n.user_id = (select auth.uid()))));
