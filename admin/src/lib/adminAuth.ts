/** อีเมลจริงใน Supabase Auth สำหรับผู้ดูแลที่ได้รับอนุญาต */
export const ADMIN_EMAIL_DOMAIN = 'bacholeague.app'

const ADMIN_EMAILS = new Set([
  ...Array.from({ length: 8 }, (_, index) => `lubo${index + 1}@${ADMIN_EMAIL_DOMAIN}`),
  'nitikornluboksawo@gmail.com',
])

export function isAllowedAdminEmail(email: string | undefined | null): boolean {
  return ADMIN_EMAILS.has((email ?? '').trim().toLowerCase())
}

export function adminEmailFromLogin(login: string): string {
  const raw = login.trim().toLowerCase()
  if (!raw) return ''
  const email = raw.includes('@') ? raw : `${raw}@${ADMIN_EMAIL_DOMAIN}`
  return isAllowedAdminEmail(email) ? email : ''
}

export function adminDisplayName(email: string | undefined | null): string {
  if (!email) return 'ผู้ดูแลระบบ'
  const local = email.split('@')[0] ?? email
  return local
}

export const ADMIN_SESSION_KEY = 'bacho-admin-session-key'
