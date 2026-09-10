-- Admin write policies for authenticated users (email/password via Supabase Auth)
-- Public app remains SELECT-only via existing policies.
-- Do NOT use service role key in the admin client — anon key + Auth session.

create policy "Authenticated update matches"
  on public.matches
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated update standings"
  on public.standings
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated update notifications"
  on public.notifications
  for update
  to authenticated
  using (true)
  with check (true);
