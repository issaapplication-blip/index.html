-- WISAL: household benefits + secure electronic identity cards
create extension if not exists pgcrypto;
create table if not exists public.family_household_members (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, full_name text not null, relationship text not null check (relationship in ('ابن/ابنة','أب','أم','أخ/أخت','زوج/زوجة','أهل','أخرى')), status text not null default 'pending' check (status in ('pending','active','suspended','rejected')), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.identity_cards (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, member_id uuid references public.family_household_members(id) on delete cascade, public_token text not null unique default encode(gen_random_bytes(18),'hex'), card_type text not null check (card_type in ('member','household_member')), status text not null default 'active' check (status in ('active','revoked')), created_at timestamptz not null default now(), revoked_at timestamptz);
create index if not exists family_household_members_user_idx on public.family_household_members(user_id);
create index if not exists identity_cards_user_idx on public.identity_cards(user_id);
create index if not exists identity_cards_token_idx on public.identity_cards(public_token);
alter table public.family_household_members enable row level security;
alter table public.identity_cards enable row level security;
create policy household_members_owner_select on public.family_household_members for select to authenticated using (auth.uid() = user_id);
create policy household_members_owner_insert on public.family_household_members for insert to authenticated with check (auth.uid() = user_id);
create policy household_members_owner_update on public.family_household_members for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy household_members_owner_delete on public.family_household_members for delete to authenticated using (auth.uid() = user_id);
create policy identity_cards_owner_select on public.identity_cards for select to authenticated using (auth.uid() = user_id);
create policy identity_cards_owner_insert on public.identity_cards for insert to authenticated with check (auth.uid() = user_id);
revoke all on public.family_household_members from anon;
revoke all on public.identity_cards from anon;
grant select,insert,update,delete on public.family_household_members to authenticated;
grant select,insert on public.identity_cards to authenticated;
