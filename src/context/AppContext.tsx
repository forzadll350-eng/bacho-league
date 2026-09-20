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
import {
  isSupabaseConfigured,
  loadLatestMatchRevision,
  loadSportBundle,
  subscribeSportUpdates,
  emptyBundle,
} from '../api/sportsApi'
import type { AppPage, SportBundle, SportType, ThemeMode } from '../types/sports'

const THEME_KEY = 'bacho-league-theme'
const SCORE_FALLBACK_INTERVAL_MS = 10_000

function latestMatchRevision(matches: SportBundle['matches']): string | null {
  return matches.reduce<string | null>((latest, match) => {
    const updated = match.updatedAt
    return updated && (!latest || updated > latest) ? updated : latest
  }, null)
}

function readStoredTheme(): ThemeMode {
  try {
    if (localStorage.getItem(THEME_KEY) === 'light') return 'light'
  } catch {
    /* ignore */
  }
  return 'dark'
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.setAttribute('data-theme', theme)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme === 'light' ? '#f2f3f5' : '#000000')
}

interface AppContextValue {
  sport: SportType
  setSport: (sport: SportType) => void
  page: AppPage
  setPage: (page: AppPage) => void
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  data: SportBundle
  loading: boolean
  usingLiveData: boolean
  notifOpen: boolean
  openNotif: () => void
  closeNotif: () => void
  updateText: string
  homeGroup: 'A' | 'B' | 'knockout'
  setHomeGroup: (group: 'A' | 'B' | 'knockout') => void
  refresh: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [sport, setSportState] = useState<SportType>('football')
  const [page, setPageState] = useState<AppPage>('home')
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const initial = readStoredTheme()
    applyTheme(initial)
    return initial
  })
  const [data, setData] = useState<SportBundle>(() => emptyBundle('football'))
  const [loading, setLoading] = useState(true)
  const [usingLiveData, setUsingLiveData] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [updateSeconds, setUpdateSeconds] = useState(0)
  const [homeGroup, setHomeGroup] = useState<'A' | 'B' | 'knockout'>('A')
  const [reloadToken, setReloadToken] = useState(0)
  const loadedRevisionRef = useRef<{ sport: SportType; revision: string | null } | null>(null)
  const pendingRevisionRef = useRef<{ sport: SportType; revision: string | null } | null>(null)
  const loadingSportRef = useRef<SportType | null>(null)

  const setSport = useCallback((next: SportType) => {
    setSportState(next)
  }, [])

  const setPage = useCallback((next: AppPage) => {
    setPageState(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const fromQuery = params.get('page')
    const fromHash = window.location.hash.replace(/^#/, '')
    const raw = (fromQuery || fromHash || '').trim().toLowerCase()
    const kind = (params.get('kind') || params.get('mode') || '').trim().toLowerCase()
    if (
      raw === 'attendee' ||
      raw === 'participant' ||
      raw === 'เข้าร่วม' ||
      kind === 'attendee' ||
      kind === 'participant'
    ) {
      setPageState('attendee')
    } else if (raw === 'register' || raw === 'ลงทะเบียน' || raw === 'athlete') {
      setPageState('register')
    } else if (
      raw === 'players' ||
      raw === 'roster' ||
      raw === 'รายชื่อนักกีฬา' ||
      kind === 'players' ||
      kind === 'roster'
    ) {
      setPageState('players')
    } else if (
      raw === 'evaluation' ||
      raw === 'survey' ||
      raw === 'ประเมิน' ||
      kind === 'evaluation' ||
      kind === 'survey'
    ) {
      setPageState('evaluation')
    }
  }, [])

  const setTheme = useCallback((next: ThemeMode) => {
    setThemeState(next)
    applyTheme(next)
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  const openNotif = useCallback(() => setNotifOpen(true), [])
  const closeNotif = useCallback(() => setNotifOpen(false), [])
  const refresh = useCallback(() => setReloadToken((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false
    loadingSportRef.current = sport
    setLoading(true)
    void loadSportBundle(sport)
      .then((bundle) => {
        if (!cancelled) {
          loadedRevisionRef.current = {
            sport,
            revision: latestMatchRevision(bundle.matches),
          }
          pendingRevisionRef.current = null
          setData(bundle)
          setUsingLiveData(isSupabaseConfigured)
          setUpdateSeconds(0)
        }
      })
      .catch((err: unknown) => {
        console.warn('[AppContext] Supabase fetch failed', err)
        if (!cancelled) {
          loadedRevisionRef.current = null
          pendingRevisionRef.current = null
          setUsingLiveData(false)
        }
      })
      .finally(() => {
        if (!cancelled) {
          loadingSportRef.current = null
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [sport, reloadToken])

  useEffect(() => {
    if (
      !isSupabaseConfigured ||
      (page !== 'home' && page !== 'fixtures' && page !== 'standings')
    ) return
    let active = true
    let checking = false

    async function checkForMissedScore() {
      if (!active || checking || document.visibilityState === 'hidden') return
      if (loadingSportRef.current === sport) return
      checking = true
      try {
        const revision = await loadLatestMatchRevision(sport)
        if (!active) return
        const loaded = loadedRevisionRef.current
        const pending = pendingRevisionRef.current
        const changed = loaded?.sport !== sport || loaded.revision !== revision
        const alreadyRequested = pending?.sport === sport && pending.revision === revision
        if (changed && !alreadyRequested) {
          pendingRevisionRef.current = { sport, revision }
          setReloadToken((n) => n + 1)
        }
      } catch (err) {
        console.warn('[AppContext] Score fallback check failed', err)
      } finally {
        checking = false
      }
    }

    const interval = window.setInterval(() => void checkForMissedScore(), SCORE_FALLBACK_INTERVAL_MS)
    const onFocus = () => void checkForMissedScore()
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void checkForMissedScore()
    }
    window.addEventListener('focus', onFocus)
    window.addEventListener('online', onFocus)
    document.addEventListener('visibilitychange', onVisibilityChange)
    void checkForMissedScore()
    return () => {
      active = false
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('online', onFocus)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [sport, page])

  useEffect(() => {
    const unsub = subscribeSportUpdates(sport, () => {
      setReloadToken((n) => n + 1)
    })
    return () => {
      unsub?.()
    }
  }, [sport])

  useEffect(() => {
    const id = window.setInterval(() => {
      setUpdateSeconds((s) => s + 1)
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  const updateText =
    updateSeconds < 5
      ? 'อัปเดตเมื่อสักครู่'
      : updateSeconds < 60
        ? `อัปเดตเมื่อ ${updateSeconds} วินาทีที่แล้ว`
        : `อัปเดตเมื่อ ${Math.floor(updateSeconds / 60)} นาทีที่แล้ว`

  const value = useMemo<AppContextValue>(
    () => ({
      sport,
      setSport,
      page,
      setPage,
      theme,
      setTheme,
      data,
      loading,
      usingLiveData,
      notifOpen,
      openNotif,
      closeNotif,
      updateText,
      homeGroup,
      setHomeGroup,
      refresh,
    }),
    [
      sport,
      setSport,
      page,
      setPage,
      theme,
      setTheme,
      data,
      loading,
      usingLiveData,
      notifOpen,
      openNotif,
      closeNotif,
      updateText,
      homeGroup,
      refresh,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
