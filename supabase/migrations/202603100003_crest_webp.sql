-- Point team crests at optimized WebP assets (public app)
update public.teams
set crest_url = regexp_replace(crest_url, '\.png$', '.webp')
where crest_url like '%.png';
