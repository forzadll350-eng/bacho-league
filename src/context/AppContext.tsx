import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { MOCK } from '../data/mock'
import {
  isSupabaseConfigured,
  loadSportBundle,
  subscribeSportUpdates,
} from '../api/sportsApi'
import type { AppPage, SportBundle, SportType, ThemeMode } from '../types/sports'

const THEME_KEY = 'bacho-league-theme'

function readStoredTheme(): ThemeMode {
  try {
    // First open / no preference → dark (standard for this app)
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
  detailOpen: boolean
  openDetail: () => void
  closeDetail: () => void
  notifOpen: boolean
  openNotif: () => void
  closeNotif: () => void
  streamOpen: boolean
  openStream: () => void
  closeStream: () => void
  updateText: string
  liveTab: 'events' | 'stats' | 'table'
  setLiveTab: (tab: 'events' | 'stats' | 'table') => void
  detailTab: 'events' | 'stats' | 'lineup'
  setDetailTab: (tab: 'events' | 'stats' | 'lineup') => void
  fixturesTab: 'today' | 'upcoming' | 'results'
  setFixturesTab: (tab: 'today' | 'upcoming' | 'results') => void
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
  const [data, setData] = useState<SportBundle>(MOCK.football)
  const [loading, setLoading] = useState(true)
  const [detailOpen, setDetailOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [streamOpen, setStreamOpen] = useState(false)
  const [updateSeconds, setUpdateSeconds] = useState(0)
  const [liveTab, setLiveTab] = useState<'events' | 'stats' | 'table'>('events')
  const [detailTab, setDetailTab] = useState<'events' | 'stats' | 'lineup'>('events')
  const [fixturesTab, setFixturesTab] = useState<'today' | 'upcoming' | 'results'>('today')
  const [reloadToken, setReloadToken] = useState(0)

  const setSport = useCallback((next: SportType) => {
    setSportState(next)
    setLiveTab('events')
    setDetailTab('events')
  }, [])

  const setPage = useCallback((next: AppPage) => {
    setPageState(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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

  const openDetail = useCallback(() => {
    setStreamOpen(false)
    setDetailOpen(true)
    document.body.style.overflow = 'hidden'
  }, [])

  const closeDetail = useCallback(() => {
    setDetailOpen(false)
    if (!streamOpen) document.body.style.overflow = ''
  }, [streamOpen])

  const openNotif = useCallback(() => setNotifOpen(true), [])
  const closeNotif = useCallback(() => setNotifOpen(false), [])

  const openStream = useCallback(() => {
    setNotifOpen(false)
    setStreamOpen(true)
    document.body.style.overflow = 'hidden'
  }, [])

  const closeStream = useCallback(() => {
    setStreamOpen(false)
    if (!detailOpen) document.body.style.overflow = ''
  }, [detailOpen])

  const refresh = useCallback(() => setReloadToken((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void loadSportBundle(sport).then((bundle) => {
      if (!cancelled) {
        setData(bundle)
        setLoading(false)
        setUpdateSeconds(0)
      }
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
      setUpdateSeconds((s) => (s >= 8 ? 0 : s + 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  const updateText =
    updateSeconds < 5 ? 'อัปเดตเมื่อสักครู่' : `อัปเดตเมื่อ ${updateSeconds} วินาทีที่แล้ว`

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
      usingLiveData: isSupabaseConfigured,
      detailOpen,
      openDetail,
      closeDetail,
      notifOpen,
      openNotif,
      closeNotif,
      streamOpen,
      openStream,
      closeStream,
      updateText,
      liveTab,
      setLiveTab,
      detailTab,
      setDetailTab,
      fixturesTab,
      setFixturesTab,
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
      detailOpen,
      openDetail,
      closeDetail,
      notifOpen,
      openNotif,
      closeNotif,
      streamOpen,
      openStream,
      closeStream,
      updateText,
      liveTab,
      detailTab,
      fixturesTab,
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
