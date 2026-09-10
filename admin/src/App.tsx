import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import type { ThemeMode } from './types'

const THEME_KEY = 'bacho-admin-theme'

function readTheme(): ThemeMode {
  try {
    return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.setAttribute('data-theme', theme)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme === 'light' ? '#f2f3f5' : '#000000')
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    /* ignore */
  }
}

function Shell() {
  const { session, loading } = useAuth()
  const [theme, setTheme] = useState<ThemeMode>(readTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  if (loading) {
    return <div className="loading">กำลังตรวจสอบเซสชัน…</div>
  }

  if (!session) {
    return <LoginPage />
  }

  return (
    <DashboardPage
      theme={theme}
      onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
    />
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  )
}
