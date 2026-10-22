-- Update the activity_logs policies to allow users to update their own entries (for resuming sessions)

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'activity_logs'
      and policyname = 'Users can update own activities'
  ) then
    execute $policy$
      create policy "Users can update own activities"
      on public.activity_logs for update
      using (auth.uid() = user_id);
    $policy$;
  end if;
end $$;
