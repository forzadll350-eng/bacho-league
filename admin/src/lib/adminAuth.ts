/** อีเมลจริงใน Supabase Auth สำหรับไอดีแอดมิน lubo1–lubo8 */
export const ADMIN_EMAIL_DOMAIN = 'bacholeague.app'

export function adminEmailFromLogin(login: string): string {
  const raw = login.trim().toLowerCase()
  if (!raw) return ''
  if (raw.includes('@')) return raw
  return `${raw}@${ADMIN_EMAIL_DOMAIN}`
}

export function adminDisplayName(email: string | undefined | null): string {
  if (!email) return 'ผู้ดูแลระบบ'
  const local = email.split('@')[0] ?? email
  return local
}

export const ADMIN_SESSION_KEY = 'bacho-admin-session-key'
