-- Add the alif1-alif8 operator accounts to the server-side admin allowlist.
-- Supabase Auth users are created separately; this migration only grants
-- database access after those users authenticate.

create or replace function public.is_bacho_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = any (array[
    'lubo1@bacholeague.app',
    'lubo2@bacholeague.app',
    'lubo3@bacholeague.app',
    'lubo4@bacholeague.app',
    'lubo5@bacholeague.app',
    'lubo6@bacholeague.app',
    'lubo7@bacholeague.app',
    'lubo8@bacholeague.app',
    'alif1@bacholeague.app',
    'alif2@bacholeague.app',
    'alif3@bacholeague.app',
    'alif4@bacholeague.app',
    'alif5@bacholeague.app',
    'alif6@bacholeague.app',
    'alif7@bacholeague.app',
    'alif8@bacholeague.app',
    'nitikornluboksawo@gmail.com'
  ]::text[])
$$;

revoke execute on function public.is_bacho_admin() from public, anon;
grant execute on function public.is_bacho_admin() to authenticated;

notify pgrst, 'reload schema';
