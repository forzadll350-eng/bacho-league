-- Current-set rally points for volleyball (sets stay in home_score / away_score)
alter table public.matches
  add column if not exists home_points int not null default 0;

alter table public.matches
  add column if not exists away_points int not null default 0;

comment on column public.matches.home_points is 'Rally points in the current set (volleyball); set wins use home_score';
comment on column public.matches.away_points is 'Rally points in the current set (volleyball); set wins use away_score';
