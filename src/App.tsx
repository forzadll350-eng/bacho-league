import { AppProvider } from './context/AppContext'
import { TopBar } from './components/TopBar'
import { BottomNavigation } from './components/BottomNavigation'
import { MatchDetailSheet } from './components/MatchDetailSheet'
import { NotificationSheet } from './components/NotificationSheet'
import { LiveStreamSheet } from './components/LiveStreamSheet'
import { HomePage } from './pages/HomePage'
import { LivePage } from './pages/LivePage'
import { MatchesPage } from './pages/MatchesPage'
import { StandingsPage } from './pages/StandingsPage'
import { MorePage } from './pages/MorePage'
import { RegisterPage } from './pages/RegisterPage'

export default function App() {
  return (
    <AppProvider>
      <div className="app">
        <TopBar />
        <HomePage />
        <LivePage />
        <MatchesPage />
        <StandingsPage />
        <MorePage />
        <RegisterPage />
      </div>
      <BottomNavigation />
      <MatchDetailSheet />
      <NotificationSheet />
      <LiveStreamSheet />
    </AppProvider>
  )
}
