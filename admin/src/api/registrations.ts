import { supabase } from '../lib/supabase'
import type { SportType } from '../types'

export type RegistrationRow = {
  id: string
  sport: SportType
  team_id: string
  full_name: string
  position: string
  age: number
  jersey_number: string | null
  photo_url: string | null
  created_at: string
  team?: { name_th: string; short_name: string } | null
}

export async function fetchRegistrations(sport: SportType): Promise<RegistrationRow[]> {
  if (!supabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase')
  const { data, error } = await supabase
    .from('registrations')
    .select(
      'id, sport, team_id, full_name, position, age, jersey_number, photo_url, created_at, team:teams!team_id(name_th, short_name)',
    )
    .eq('sport', sport)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => {
    const team = Array.isArray(row.team) ? row.team[0] : row.team
    return { ...row, team: team ?? null } as RegistrationRow
  })
}
