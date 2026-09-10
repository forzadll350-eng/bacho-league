import { Bell, Search } from 'lucide-react'
import { LEAGUE } from '../data/teams'
import { useApp } from '../context/AppContext'
import { SportSwitcher } from './SportSwitcher'
import { LiveFeedStatus } from './LiveFeedStatus'

export function TopBar() {
  const { openNotif } = useApp()

  return (
    <header className="topbar">
      <div className="topline">
        <div className="brand">
          <img className="brand-mark" src={LEAGUE.crestUrl} alt={LEAGUE.nameTh} />
          <div className="brand-text">
            <div className="brand-name">{LEAGUE.nameTh}</div>
            <div className="brand-sub">{LEAGUE.taglineTh}</div>
            <div className="brand-credit">Product by Alif Doloh</div>
          </div>
        </div>
        <div className="actions">
          <button className="icon-btn" type="button" aria-label="ค้นหา / Search">
            <Search size={18} strokeWidth={1.8} />
          </button>
          <button
            className="icon-btn"
            type="button"
            aria-label="การแจ้งเตือน / Notifications"
            onClick={openNotif}
          >
            <span className="notif-dot" />
            <Bell size={18} strokeWidth={1.8} />
          </button>
        </div>
      </div>
      <SportSwitcher />
      <LiveFeedStatus />
    </header>
  )
}
