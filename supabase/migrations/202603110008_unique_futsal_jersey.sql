-- ฟุตซอล: เบอร์เสื้อซ้ำในอปท.เดียวกันไม่ได้
create unique index if not exists registrations_football_team_jersey_uidx
  on public.registrations (team_id, jersey_number)
  where sport = 'football'
    and jersey_number is not null
    and btrim(jersey_number) <> '';
