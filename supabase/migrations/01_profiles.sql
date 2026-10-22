-- 1. Enable Vector Extension (Requires Superuser/Platform Admin)
-- Use this for HuggingFace embeddings later
create extension if not exists vector;

-- 2. Custom Role Enums
create type user_role as enum ('CITIZEN', 'VERIFIED_LAWYER', 'NGO_LEGAL_AID', 'GOVT_AUTHORITY');

-- 3. Profiles Table (Extends Supabase Auth)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  role user_role default 'CITIZEN'::user_role not null,
  phone_number text,
  jurisdiction_id text, -- Only relevant for GOVT_AUTHORITY (e.g., 'KA-BLR-SOUTH')
  bar_council_id text, -- Only relevant for VERIFIED_LAWYER
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- RLS Policies for Profiles
-- 1. Users can view their own profile
create policy "Users can view own profile" 
on public.profiles for select 
using (auth.uid() = id);

-- 2. Users can update their own profile
create policy "Users can update own profile" 
on public.profiles for update 
using (auth.uid() = id);

-- Trigger to automatically create a profile record when a new user signs up in Supabase Auth
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'Unknown User'), 'CITIZEN');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
