-- Activity Logs Table: stores all user interactions (AI chat, drafts, case tracking, etc.)
-- Guest users are NOT stored here (their usage is tracked client-side in localStorage)

create table if not exists public.activity_logs (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users on delete cascade not null,
  type        text not null check (type in ('AI_CHAT', 'DRAFT', 'CASE_TRACK', 'RIGHTS_VIEW', 'DOCUMENT')),
  title       text not null,
  summary     text,
  metadata    jsonb default '{}'::jsonb,
  created_at  timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.activity_logs enable row level security;

-- Policies: users can only see and insert their own activities
create policy "Users can view own activities"
  on public.activity_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own activities"
  on public.activity_logs for insert
  with check (auth.uid() = user_id);

-- Index for fast per-user queries sorted by time
create index if not exists idx_activity_logs_user_created
  on public.activity_logs (user_id, created_at desc);
