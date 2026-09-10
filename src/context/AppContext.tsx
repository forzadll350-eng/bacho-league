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
import type { AppPage, SportBundle, SportType } from '../types/sports'

interface AppContextValue {
  sport: SportType
  setSport: (sport: SportType) => void
  page: AppPage
  setPage: (page: AppPage) => void
  data: SportBundle
  detailOpen: boolean
  openDetail: () => void
  closeDetail: () => void
  notifOpen: boolean
  openNotif: () => void
  closeNotif: () => void
  updateText: string
  liveTab: 'events' | 'stats' | 'table'
  setLiveTab: (tab: 'events' | 'stats' | 'table') => void
  detailTab: 'events' | 'stats' | 'lineup'
  setDetailTab: (tab: 'events' | 'stats' | 'lineup') => void
  fixturesTab: 'today' | 'upcoming' | 'results'
  setFixturesTab: (tab: 'today' | 'upcoming' | 'results') => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [sport, setSportState] = useState<SportType>('football')
  const [page, setPageState] = useState<AppPage>('home')
  const [detailOpen, setDetailOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [updateSeconds, setUpdateSeconds] = useState(0)
  const [liveTab, setLiveTab] = useState<'events' | 'stats' | 'table'>('events')
  const [detailTab, setDetailTab] = useState<'events' | 'stats' | 'lineup'>('events')
  const [fixturesTab, setFixturesTab] = useState<'today' | 'upcoming' | 'results'>('today')

  const setSport = useCallback((next: SportType) => {
    setSportState(next)
    setLiveTab('events')
    setDetailTab('events')
  }, [])

  const setPage = useCallback((next: AppPage) => {
    setPageState(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const openDetail = useCallback(() => {
    setDetailOpen(true)
    document.body.style.overflow = 'hidden'
  }, [])

  const closeDetail = useCallback(() => {
    setDetailOpen(false)
    document.body.style.overflow = ''
  }, [])

  const openNotif = useCallback(() => setNotifOpen(true), [])
  const closeNotif = useCallback(() => setNotifOpen(false), [])

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
      data: MOCK[sport],
      detailOpen,
      openDetail,
      closeDetail,
      notifOpen,
      openNotif,
      closeNotif,
      updateText,
      liveTab,
      setLiveTab,
      detailTab,
      setDetailTab,
      fixturesTab,
      setFixturesTab,
    }),
    [
      sport,
      setSport,
      page,
      setPage,
      detailOpen,
      openDetail,
      closeDetail,
      notifOpen,
      openNotif,
      closeNotif,
      updateText,
      liveTab,
      detailTab,
      fixturesTab,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
