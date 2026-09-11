import { TEAM_LIST } from '../data/teams'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { PlayerPosition, SportType } from '../types/sports'

export const POSITION_OPTIONS: { value: PlayerPosition; label: string }[] = [
  { value: 'admin_exec', label: 'ฝ่ายบริหาร' },
  { value: 'council', label: 'สมาชิกสภา' },
  { value: 'civil_servant', label: 'ข้าราชการ' },
  { value: 'mission', label: 'ภารกิจ' },
  { value: 'general', label: 'ทั่วไป' },
  { value: 'contract', label: 'จ้างเหมา' },
]

export const FUTSAL_REG_LIMIT = 20

export async function countTeamRegistrations(
  sport: SportType,
  teamId: string,
): Promise<number> {
  if (!supabase) return 0
  const { count, error } = await supabase
    .from('registrations')
    .select('*', { count: 'exact', head: true })
    .eq('sport', sport)
    .eq('team_id', teamId)
  if (error) throw error
  return count ?? 0
}

export async function uploadPlayerPhoto(file: File, teamId: string): Promise<string> {
  if (!supabase) throw new Error('ยังไม่ได้เชื่อม Supabase')
  if (file.size > 2 * 1024 * 1024) throw new Error('รูปต้องไม่เกิน 2 MB')

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${teamId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from('player-photos').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  })
  if (error) throw error

  const { data } = supabase.storage.from('player-photos').getPublicUrl(path)
  return data.publicUrl
}

export type RegistrationInput = {
  sport: SportType
  teamId: string
  fullName: string
  position: PlayerPosition
  age: number
  jerseyNumber?: string
  photoUrl?: string
}

export async function submitRegistration(input: RegistrationInput): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('ยังไม่ได้เชื่อมฐานข้อมูล')
  }

  if (input.sport === 'football') {
    const n = await countTeamRegistrations('football', input.teamId)
    if (n >= FUTSAL_REG_LIMIT) {
      throw new Error('อปท.นี้ลงทะเบียนฟุตซอลครบ 20 คนแล้ว')
    }
  }

  const { error } = await supabase.from('registrations').insert({
    sport: input.sport,
    team_id: input.teamId,
    full_name: input.fullName.trim(),
    position: input.position,
    age: input.age,
    jersey_number: input.jerseyNumber?.trim() || null,
    photo_url: input.photoUrl || null,
  })

  if (error) {
    if (error.message?.includes('check') || error.code === '42501') {
      throw new Error('ลงทะเบียนไม่สำเร็จ — อาจครบโควต้าแล้ว')
    }
    throw error
  }
}

export function teamsForSelect(sport?: SportType) {
  if (sport === 'volleyball') {
    // บาเระใต้ถอนตัววอลเลย์
    return TEAM_LIST.filter((t) => t.id !== 'barehtai')
  }
  return TEAM_LIST
}
