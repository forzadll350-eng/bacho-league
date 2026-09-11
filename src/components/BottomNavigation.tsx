import { BarChart3, CalendarDays, Home, MoreHorizontal } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { AppPage } from '../types/sports'

const ITEMS: { id: AppPage; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'หน้าหลัก', icon: Home },
  { id: 'fixtures', label: 'การแข่งขัน', icon: CalendarDays },
  { id: 'standings', label: 'ตารางคะแนน', icon: BarChart3 },
  { id: 'more', label: 'เพิ่มเติม', icon: MoreHorizontal },
]

export function BottomNavigation() {
  const { page, setPage } = useApp()

  return (
    <nav className="bottom-nav" aria-label="เมนูหลัก">
      {ITEMS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className={`nav-btn${page === id ? ' active' : ''}`}
          aria-current={page === id ? 'page' : undefined}
          onClick={() => setPage(id)}
        >
          <Icon size={19} strokeWidth={1.8} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
