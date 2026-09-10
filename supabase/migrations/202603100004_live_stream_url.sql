-- Optional YouTube Live URL for a match (embed only — we do not store video)
alter table public.matches
  add column if not exists live_stream_url text;
