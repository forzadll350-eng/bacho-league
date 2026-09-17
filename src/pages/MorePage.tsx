import { Moon, Sun } from 'lucide-react'
import { LEAGUE, TEAM_LIST } from '../data/teams'
import { useApp } from '../context/AppContext'

export function MorePage() {
  const { page, theme, setTheme, setPage } = useApp()

  return (
    <section className={`page${page === 'more' ? ' active' : ''}`} id="page-more">
      <div className="section-head">
        <div>
          <h1>เพิ่มเติม</h1>
          <p>ข้อมูลและเมนูอื่น ๆ</p>
        </div>
      </div>

      <button type="button" className="card menu-cta" onClick={() => setPage('register')}>
        <div>
          <div className="menu-title">ลงทะเบียนนักกีฬา</div>
          <div className="menu-sub">ฟุตซอล / วอลเลย์ · ถึง 19 ก.ย. 2569 · 17:00 น.</div>
        </div>
        <div className="chev">›</div>
      </button>

      <button type="button" className="card menu-cta" onClick={() => setPage('attendee')}>
        <div>
          <div className="menu-title">ลงทะเบียนผู้เข้าร่วม</div>
          <div className="menu-sub">งาน 21 ก.ย. 2569 · ถึง 19 ก.ย. 2569 · 17:00 น.</div>
        </div>
        <div className="chev">›</div>
      </button>

      <button type="button" className="card menu-cta" onClick={() => setPage('players')}>
        <div>
          <div className="menu-title">เช็ครายชื่อนักกีฬา</div>
          <div className="menu-sub">เลือกประเภทกีฬาและ อปท. · แสดงเฉพาะผู้ที่ยินยอม</div>
        </div>
        <div className="chev">›</div>
      </button>

      <button type="button" className="card menu-cta" onClick={() => setPage('vote')}>
        <div>
          <div className="menu-title">โหวตนักกีฬาขวัญใจ อำเภอบาเจาะ</div>
          <div className="menu-sub">ฟุตซอล · โหวตได้ 1 คน</div>
        </div>
        <div className="chev">›</div>
      </button>

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

      <div className="section-head">
        <h2>การแสดงผล</h2>
      </div>
      <div className="card theme-card">
        <div>
          <b>โหมดธีม</b>
          <p>สลับระหว่างพื้นหลังมืดและสว่าง</p>
        </div>
        <div className="theme-toggle" role="group" aria-label="โหมดธีม">
          <button
            type="button"
            className={theme === 'dark' ? 'active' : ''}
            onClick={() => setTheme('dark')}
            aria-pressed={theme === 'dark'}
          >
            <Moon size={14} strokeWidth={1.8} />
            มืด
          </button>
          <button
            type="button"
            className={theme === 'light' ? 'active' : ''}
            onClick={() => setTheme('light')}
            aria-pressed={theme === 'light'}
          >
            <Sun size={14} strokeWidth={1.8} />
            สว่าง
          </button>
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
