-- 1. Case Types Enum (Matches the Flow Diagram)
create type case_category as enum (
  'WOMEN_SAFETY', 
  'LABOUR_DISPUTE', 
  'CYBER_FRAUD', 
  'PROPERTY_DISPUTE', 
  'CONSUMER_COMPLAINT',
  'GENERAL_INQUIRY'
);

-- 2. Case Logs / Complaints Table
create table public.case_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  category case_category not null,
  description text not null, -- The raw text/voice input transcript
  ai_generated_draft jsonb, -- The structured FIR/Complaint data
  pdf_url text, -- Link to generated document stored in Supabase Storage
  assigned_jurisdiction_id text, -- Which Police Station/Court this maps to
  status text default 'DRAFT' not null, -- DRAFT, SUBMITTED, CLOSED
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.case_logs enable row level security;

-- RLS Policies for Case Logs (THE CORE ISOLATION LOGIC)
-- 1. CITIZENS can only see their own cases
create policy "Citizens view own cases" 
on public.case_logs for select 
using (auth.uid() = user_id);

create policy "Citizens insert own cases" 
on public.case_logs for insert 
with check (auth.uid() = user_id);

-- 2. GOVT_AUTHORITY can view cases assigned to their jurisdiction
create policy "Govt views jurisdiction cases" 
on public.case_logs for select 
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.role = 'GOVT_AUTHORITY'
    and profiles.jurisdiction_id = case_logs.assigned_jurisdiction_id
  )
);

-- 3. VERIFIED_LAWYER / NGO can view cases if they are somehow assigned (Implementation Detail: Could use a junction table, but for now allow them to view all for pro-bono lookup if status is SUBMITTED)
create policy "Lawyers view submitted cases" 
on public.case_logs for select 
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.role in ('VERIFIED_LAWYER', 'NGO_LEGAL_AID')
  )
  and status = 'SUBMITTED'
);
