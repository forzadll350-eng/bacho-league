import { AppProvider } from './context/AppContext'
import { TopBar } from './components/TopBar'
import { BottomNavigation } from './components/BottomNavigation'
import { NotificationSheet } from './components/NotificationSheet'
import { MatchShareHost } from './components/MatchShareHost'
import { GoalCelebrationHost } from './components/GoalCelebration'
import { HomePage } from './pages/HomePage'
import { MatchesPage } from './pages/MatchesPage'
import { StandingsPage } from './pages/StandingsPage'
import { MorePage } from './pages/MorePage'
import { RegisterPage } from './pages/RegisterPage'
import { AttendeePage } from './pages/AttendeePage'
import { VotePage } from './pages/VotePage'

export default function App() {
  return (
    <AppProvider>
      <div className="app">
        <TopBar />
        <HomePage />
        <MatchesPage />
        <StandingsPage />
        <MorePage />
        <RegisterPage />
        <AttendeePage />
        <VotePage />
      </div>
      <BottomNavigation />
      <NotificationSheet />
      <MatchShareHost />
      <GoalCelebrationHost />
    </AppProvider>
  )
}
