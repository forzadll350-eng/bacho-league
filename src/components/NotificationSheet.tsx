import { useApp } from '../context/AppContext'

export function NotificationSheet() {
  const { data, notifOpen, closeNotif } = useApp()

  return (
    <>
      <div
        className={`scrim${notifOpen ? ' show' : ''}`}
        onClick={closeNotif}
        aria-hidden={!notifOpen}
      />
      <section
        className={`notif-drawer${notifOpen ? ' open' : ''}`}
        aria-label="การแจ้งเตือน"
        aria-hidden={!notifOpen}
      >
        <div className="grab" />
        <div className="notif-head">
          <h3>การแจ้งเตือน</h3>
          <button type="button" onClick={closeNotif}>
            ปิด
          </button>
        </div>
        <div>
          {data.notifications.length === 0 ? (
            <div className="lt-empty" style={{ padding: '1rem' }}>
              ยังไม่มีการแจ้งเตือน
            </div>
          ) : (
            data.notifications.map((n) => (
              <div className="notification" key={n.id}>
                <div className="nicon">{n.icon}</div>
                <div>
                  <b>{n.title}</b>
                  <p>{n.body}</p>
                </div>
                <span className="ntime">{n.timeLabel}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  )
}
