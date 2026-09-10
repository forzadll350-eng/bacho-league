import { LEAGUE, TEAM_LIST } from '../data/teams'
import { useApp } from '../context/AppContext'

export function MorePage() {
  const { page } = useApp()

  return (
    <section className={`page${page === 'more' ? ' active' : ''}`} id="page-more">
      <div className="section-head">
        <div>
          <h1>เพิ่มเติม</h1>
          <p>ข้อมูลและเมนูอื่น ๆ</p>
        </div>
      </div>

      <div className="section-head" style={{ marginTop: 4 }}>
        <h2>ทีมในลีก · 8 อปท.</h2>
      </div>
      <div className="team-grid">
        {TEAM_LIST.map((t) => (
          <div className="card team-tile" key={t.id}>
            <img src={t.crestUrl} alt={t.nameTh} />
            <b>{t.nameTh}</b>
          </div>
        ))}
      </div>

      <div className="card menu" style={{ marginTop: 16 }}>
        <div className="menu-row">
          <div className="menu-left">
            <div className="menu-icon">S</div>
            <div>
              <div className="menu-title">สถิติ</div>
              <div className="menu-sub">สถิติทีมและการแข่งขัน</div>
            </div>
          </div>
          <div className="chev">›</div>
        </div>
        <div className="menu-row">
          <div className="menu-left">
            <div className="menu-icon">R</div>
            <div>
              <div className="menu-title">รายงาน</div>
              <div className="menu-sub">รายงานผลการแข่งขัน</div>
            </div>
          </div>
          <div className="chev">›</div>
        </div>
        <div className="menu-row">
          <div className="menu-left">
            <div className="menu-icon">⚙</div>
            <div>
              <div className="menu-title">ตั้งค่า</div>
              <div className="menu-sub">ภาษา การแจ้งเตือน และการแสดงผล</div>
            </div>
          </div>
          <div className="chev">›</div>
        </div>
      </div>

      <div className="card install-card">
        <div>
          <b>เพิ่ม {LEAGUE.nameTh} ไปยังหน้าจอหลัก</b>
          <p>เปิดใช้งานแบบเต็มจอเหมือนแอปบนมือถือ</p>
        </div>
        <button
          type="button"
          className="install-btn"
          onClick={() =>
            alert(
              'บน iPhone: กด Share → Add to Home Screen\nบน Android/Chrome: เปิดเมนูเบราว์เซอร์ → Add to Home screen / Install app',
            )
          }
        >
          วิธีติดตั้ง
        </button>
      </div>

      <p className="credit-foot">Product by Alif Doloh</p>
    </section>
  )
}
