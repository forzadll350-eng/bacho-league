-- Single-device admin sessions (กันเข้าซ้อนเครื่อง)
create table if not exists public.admin_active_sessions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  session_key text not null,
  updated_at timestamptz not null default now()
);

alter table public.admin_active_sessions enable row level security;

create policy "Admin read own session"
  on public.admin_active_sessions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Admin upsert own session"
  on public.admin_active_sessions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Admin update own session"
  on public.admin_active_sessions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admin delete own session"
  on public.admin_active_sessions for delete
  to authenticated
  using (auth.uid() = user_id);
