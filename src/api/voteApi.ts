import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { SportType } from '../types/sports'

const VOTER_KEY = 'bacho-vote-key'

export function getVoterKey(): string {
  const freshKey = () => crypto.randomUUID()
  try {
    let key = localStorage.getItem(VOTER_KEY)
    if (!key) {
      key = freshKey()
      localStorage.setItem(VOTER_KEY, key)
    }
    return key
  } catch {
    // Private/restricted browsers may deny localStorage; the server still
    // requires a valid opaque UUID and applies its network rate limit.
    return freshKey()
  }
}

export function hasVotedLocally(sport: SportType): boolean {
  try {
    return Boolean(localStorage.getItem(`bacho-voted-${sport}`))
  } catch {
    return false
  }
}

export function markVotedLocally(sport: SportType, registrationId: string) {
  try {
    localStorage.setItem(`bacho-voted-${sport}`, registrationId)
  } catch {
    /* ignore */
  }
}

export async function castFavoriteVote(
  sport: SportType,
  registrationId: string,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('ยังไม่ได้เชื่อมฐานข้อมูล')
  }
  if (hasVotedLocally(sport)) {
    throw new Error('คุณโหวตไปแล้ว')
  }
  const voter_key = getVoterKey()
  const { error } = await supabase.rpc('cast_favorite_vote', {
    p_registration_id: registrationId,
    p_voter_key: voter_key,
  })
  if (error) {
    if (error.code === '23505') {
      markVotedLocally(sport, registrationId)
      throw new Error('คุณโหวตไปแล้ว')
    }
    if (error.code === 'PGRST' || error.message.includes('โหวตครบ')) {
      throw new Error('เครือข่ายนี้โหวตครบจำนวนที่อนุญาตแล้ว กรุณาลองใหม่ภายหลัง')
    }
    throw error
  }
  markVotedLocally(sport, registrationId)
}
