-- Clerk user ID is the canonical user identity. Email can be reused across
-- historical/dev/prod Clerk users during account migration and testing.
alter table public.user_profiles
  drop constraint if exists user_profiles_email_key;

create index if not exists user_profiles_email_idx
  on public.user_profiles(email);
