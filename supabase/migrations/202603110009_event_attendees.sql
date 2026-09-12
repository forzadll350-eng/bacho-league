-- ผู้เข้าร่วมงานฟุตซอลลีก 21 ก.ย. 2569 (ไม่ใช่นักกีฬา)
create table if not exists public.event_attendees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  position_label text not null,
  subdistrict text not null,
  note text,
  created_at timestamptz not null default now(),
  constraint event_attendees_full_name_len check (char_length(btrim(full_name)) between 2 and 120),
  constraint event_attendees_phone_len check (char_length(btrim(phone)) between 9 and 20),
  constraint event_attendees_position_len check (char_length(btrim(position_label)) between 1 and 120),
  constraint event_attendees_subdistrict_len check (char_length(btrim(subdistrict)) between 1 and 120)
);

create index if not exists event_attendees_created_idx
  on public.event_attendees (created_at desc);

alter table public.event_attendees enable row level security;

create policy "Public read event attendees"
  on public.event_attendees for select using (true);

create policy "Public insert event attendees"
  on public.event_attendees for insert
  with check (true);

create policy "Authenticated delete event attendees"
  on public.event_attendees for delete
  to authenticated
  using (true);
