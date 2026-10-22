-- Clean up and fix the user registration trigger
-- This version handles potential nulls and type mismatches safely

-- 1. Drop the old trigger if it exists under the name from 01_profiles
drop trigger if exists on_auth_user_created on auth.users;

-- 2. Create or replace the function with better error handling and safety
create or replace function public.handle_new_user()
returns trigger as $$
declare
  is_valid_role boolean;
  final_role user_role;
  meta_role text;
begin
  -- Get the role from metadata
  meta_role := new.raw_user_meta_data->>'role';
  
  -- Safe role conversion: check if meta_role is a valid enum value
  if meta_role is not null and exists (
    select 1 from pg_enum 
    where enumtypid = 'user_role'::regtype 
      and enumlabel = meta_role
  ) then
    final_role := meta_role::user_role;
  else
    final_role := 'CITIZEN'::user_role;
  end if;

  -- Insert or Update (upsert) the profile
  insert into public.profiles (
    id, 
    full_name, 
    role, 
    phone_number, 
    bar_council_id
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Unknown User'),
    final_role,
    new.raw_user_meta_data->>'phone_number',
    new.raw_user_meta_data->>'bar_council_id'
  )
  on conflict (id) do update
    set
      full_name    = coalesce(excluded.full_name, profiles.full_name),
      role         = coalesce(excluded.role, profiles.role),
      phone_number = coalesce(excluded.phone_number, profiles.phone_number),
      bar_council_id = coalesce(excluded.bar_council_id, profiles.bar_council_id);
      
  return new;
exception when others then
  -- Even if the trigger fails, we don't want to block the AUTH user creation
  -- The register API will try to upsert as a fallback anyway
  return new;
end;
$$ language plpgsql security definer;

-- 3. Re-create the trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
