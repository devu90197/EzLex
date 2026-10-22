-- 1. Table for Global Admin API and UI Toggles
create table public.system_config (
  id text primary key, -- Constant value 'GLOBAL_SETTINGS' to ensure only one row
  sms_otp_enabled boolean default true not null,
  max_daily_sms int default 10 not null,
  current_daily_sms_usage int default 0 not null,
  last_sms_reset timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert the default master settings
insert into public.system_config (id, sms_otp_enabled, max_daily_sms, current_daily_sms_usage)
values ('GLOBAL_SETTINGS', true, 10, 0)
on conflict (id) do nothing;

-- Ensure RLS is enabled: Only the Python Backend (Service Role) and the Super Admin User can touch this
alter table public.system_config enable row level security;

-- Nobody can read/write except Service Role (via py api) and specific SuperAdmins
create policy "Allow Service Role and SuperAdmins" 
on public.system_config for all 
using (
  current_user = 'service_role' OR 
  -- Replace this UUID with your actual owner UUID once you sign up
  auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid
);
