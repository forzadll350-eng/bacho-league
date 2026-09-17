import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  isSupabaseConfigured,
  loadSportBundle,
  subscribeSportUpdates,
  emptyBundle,
} from '../api/sportsApi'
import type { AppPage, SportBundle, SportType, ThemeMode } from '../types/sports'

const THEME_KEY = 'bacho-league-theme'

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
    setLoading(true)
    void loadSportBundle(sport)
      .then((bundle) => {
        if (!cancelled) {
          setData(bundle)
          setUsingLiveData(isSupabaseConfigured)
          setUpdateSeconds(0)
        }
      })
      .catch((err: unknown) => {
        console.warn('[AppContext] Supabase fetch failed', err)
        if (!cancelled) setUsingLiveData(false)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [sport, reloadToken])

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
