import { isSupabaseConfigured, supabase } from '../lib/supabase'

const VOTER_KEY = 'bacho-vote-key'

export function getVoterKey(): string {
  try {
    let key = localStorage.getItem(VOTER_KEY)
    if (!key) {
      key = crypto.randomUUID()
      localStorage.setItem(VOTER_KEY, key)
    }
    return key
  } catch {
    return `anon-${Date.now()}`
  }
}

export function hasVotedLocally(): boolean {
  try {
    return Boolean(localStorage.getItem('bacho-voted-football'))
  } catch {
    return false
  }
}

export function markVotedLocally(registrationId: string) {
  try {
    localStorage.setItem('bacho-voted-football', registrationId)
  } catch {
    /* ignore */
  }
}

export async function castFavoriteVote(registrationId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('ยังไม่ได้เชื่อมฐานข้อมูล')
  }
  if (hasVotedLocally()) {
    throw new Error('คุณโหวตไปแล้ว')
  }
  const voter_key = getVoterKey()
  const { error } = await supabase.from('favorite_votes').insert({
    sport: 'football',
    registration_id: registrationId,
    voter_key,
  })
  if (error) {
    if (error.code === '23505') {
      markVotedLocally(registrationId)
      throw new Error('คุณโหวตไปแล้ว')
    }
    throw error
  }
  markVotedLocally(registrationId)
}
