-- Create an Anonymous Usage Table for Rate Limiting Free AI Tiers
create table public.anonymous_usage (
  id uuid default gen_random_uuid() primary key,
  session_id text not null, -- Frontend generated device fingerprint
  ip_address text, -- Fallback tracking if possible
  action_type text not null, -- 'CHAT_PROMPT' or 'DRAFT_GENERATION'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index the tracking columns to keep the limit checks lighting fast.
create index idx_anonymous_usage_session on public.anonymous_usage (session_id);
create index idx_anonymous_usage_ip on public.anonymous_usage (ip_address);
create index idx_anonymous_usage_created on public.anonymous_usage (created_at);

-- Enable RLS
alter table public.anonymous_usage enable row level security;

-- Rate limiting policy:
-- 1. Anonymous users can INSERT their own usage logs.
create policy "Allow anonymous inserts" 
on public.anonymous_usage for insert 
with check (true);

-- 2. Anonymous users can SELECT only their own usage limits based on session ID
create policy "Allow anonymous reads by session" 
on public.anonymous_usage for select 
using (session_id = current_setting('request.headers')::json->>'x-session-id');

-- RLS bypass for Service Role (Python API) to easily check counts
create policy "Allow service role full access" 
on public.anonymous_usage for all 
using (true);
