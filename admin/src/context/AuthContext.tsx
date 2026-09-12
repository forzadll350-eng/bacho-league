import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import {
  ADMIN_SESSION_KEY,
  adminDisplayName,
  adminEmailFromLogin,
  isAllowedAdminEmail,
} from '../lib/adminAuth'

type AuthContextValue = {
  session: Session | null
  user: User | null
  displayName: string
  loading: boolean
  configured: boolean
  kickMessage: string | null
  clearKickMessage: () => void
  signIn: (login: string, pin: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readLocalSessionKey(): string | null {
  try {
    return localStorage.getItem(ADMIN_SESSION_KEY)
  } catch {
    return null
  }
}

function writeLocalSessionKey(key: string | null) {
  try {
    if (key) localStorage.setItem(ADMIN_SESSION_KEY, key)
    else localStorage.removeItem(ADMIN_SESSION_KEY)
  } catch {
    /* ignore */
  }
}

function newSessionKey() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [kickMessage, setKickMessage] = useState<string | null>(null)
  const checkingRef = useRef(false)

  const clearKickMessage = useCallback(() => setKickMessage(null), [])

  const forceSignOut = useCallback(async (message: string) => {
    writeLocalSessionKey(null)
    setKickMessage(message)
    if (supabase) await supabase.auth.signOut()
    setSession(null)
  }, [])

  const claimSession = useCallback(async (userId: string) => {
    if (!supabase) return null
    const sessionKey = newSessionKey()
    const { error } = await supabase.from('admin_active_sessions').upsert(
      {
        user_id: userId,
        session_key: sessionKey,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    if (error) return error.message
    writeLocalSessionKey(sessionKey)
    return null
  }, [])

  const verifyActiveSession = useCallback(async () => {
    if (!supabase || checkingRef.current) return
    const {
      data: { session: current },
    } = await supabase.auth.getSession()
    if (!current?.user) return

    checkingRef.current = true
    try {
      let localKey = readLocalSessionKey()
      if (!localKey) {
        // หลังล็อกอิน/รีเฟรชที่ยังไม่มีคีย์ — เคลมเซสชันนี้แทนการเตะ
        const claimErr = await claimSession(current.user.id)
        if (claimErr) {
          await forceSignOut('เซสชันไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่')
        }
        return
      }

      const { data, error } = await supabase
        .from('admin_active_sessions')
        .select('session_key')
        .eq('user_id', current.user.id)
        .maybeSingle()

      if (error) return

      if (!data || data.session_key !== localKey) {
        await forceSignOut('ไอดีนี้ถูกเข้าสู่ระบบจากเครื่องอื่นแล้ว')
      }
    } finally {
      checkingRef.current = false
    }
  }, [claimSession, forceSignOut])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let cancelled = false

    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) {
        if (data.session && !isAllowedAdminEmail(data.session.user.email)) {
          setKickMessage('บัญชีนี้ไม่ได้รับอนุญาตให้ใช้หน้าแอดมิน')
          setSession(null)
          void supabase?.auth.signOut()
        } else {
          setSession(data.session)
        }
        setLoading(false)
      }
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (next && !isAllowedAdminEmail(next.user.email)) {
        setKickMessage('บัญชีนี้ไม่ได้รับอนุญาตให้ใช้หน้าแอดมิน')
        setSession(null)
        window.setTimeout(() => void supabase?.auth.signOut(), 0)
      } else {
        setSession(next)
      }
      setLoading(false)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session?.user) return

    void verifyActiveSession()
    const id = window.setInterval(() => {
      void verifyActiveSession()
    }, 4000)

    const onFocus = () => {
      void verifyActiveSession()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)

    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [session?.user?.id, verifyActiveSession])

  const signIn = useCallback(
    async (login: string, pin: string) => {
      if (!supabase) return 'ยังไม่ได้ตั้งค่า VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY'
      const email = adminEmailFromLogin(login)
      if (!email) return 'ไอดีนี้ไม่ได้รับอนุญาตให้ใช้หน้าแอดมิน'
      if (!pin.trim()) return 'กรุณากรอก PIN'

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pin,
      })
      if (error) {
        if (/invalid login credentials/i.test(error.message)) {
          return 'ไอดีหรือ PIN ไม่ถูกต้อง'
        }
        return error.message
      }
      if (!data.user) return 'เข้าสู่ระบบไม่สำเร็จ'
      if (!isAllowedAdminEmail(data.user.email)) {
        await supabase.auth.signOut()
        return 'บัญชีนี้ไม่ได้รับอนุญาตให้ใช้หน้าแอดมิน'
      }

      const claimErr = await claimSession(data.user.id)
      if (claimErr) {
        await supabase.auth.signOut()
        return `เข้าสู่ระบบได้ แต่ล็อกเซสชันไม่สำเร็จ: ${claimErr}`
      }

      setKickMessage(null)
      return null
    },
    [claimSession],
  )

  const signOut = useCallback(async () => {
    const userId = session?.user.id
    const sessionKey = readLocalSessionKey()
    if (supabase && userId && sessionKey) {
      await supabase
        .from('admin_active_sessions')
        .delete()
        .eq('user_id', userId)
        .eq('session_key', sessionKey)
    }
    writeLocalSessionKey(null)
    if (!supabase) return
    await supabase.auth.signOut()
  }, [session?.user.id])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      displayName: adminDisplayName(session?.user?.email),
      loading,
      configured: isSupabaseConfigured,
      kickMessage,
      clearKickMessage,
      signIn,
      signOut,
    }),
    [session, loading, kickMessage, clearKickMessage, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth ต้องอยู่ภายใต้ AuthProvider')
  return ctx
}
