-- Which set (1–3) the live rally points belong to, plus full set history
alter table public.matches
  add column if not exists points_set int not null default 1
    check (points_set between 1 and 3);

alter table public.matches
  add column if not exists set_scores jsonb not null default '{}'::jsonb;

comment on column public.matches.points_set is 'Volleyball: which set (1–3) home_points/away_points currently show';
comment on column public.matches.set_scores is 'Volleyball: {"1":{"home":15,"away":10},...} rally points per set';
