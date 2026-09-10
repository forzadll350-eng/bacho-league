import { AppProvider } from './context/AppContext'
import { TopBar } from './components/TopBar'
import { BottomNavigation } from './components/BottomNavigation'
import { MatchDetailSheet } from './components/MatchDetailSheet'
import { NotificationSheet } from './components/NotificationSheet'
import { HomePage } from './pages/HomePage'
import { LivePage } from './pages/LivePage'
import { MatchesPage } from './pages/MatchesPage'
import { StandingsPage } from './pages/StandingsPage'
import { MorePage } from './pages/MorePage'

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
      </div>
      <BottomNavigation />
      <MatchDetailSheet />
      <NotificationSheet />
    </AppProvider>
  )
}
