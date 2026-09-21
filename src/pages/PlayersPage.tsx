import { useEffect, useMemo, useState } from 'react'
import { ShieldCheck, Shirt, UserRound, UsersRound } from 'lucide-react'
import {
  loadPublicRegistrationRoster,
  type PublicRegistrationRosterEntry,
} from '../api/registrationApi'
import { useApp } from '../context/AppContext'
import { TEAM_LIST } from '../data/teams'

const CATEGORIES = [
  { id: 'attendee', label: 'ผู้เข้าร่วม' },
  { id: 'football', label: 'นักกีฬาฟุตซอล' },
  { id: 'volleyball', label: 'นักกีฬาวอลเลย์บอล' },
] as const

export function PlayersPage() {
  const { page } = useApp()
  const [teamId, setTeamId] = useState('all')
  const [entries, setEntries] = useState<PublicRegistrationRosterEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (page !== 'players') return
    let cancelled = false
    setLoading(true)
    setError('')
    void loadPublicRegistrationRoster()
      .then((rows) => {
        if (!cancelled) setEntries(rows)
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setEntries([])
          setError(caught instanceof Error ? caught.message : 'โหลดรายชื่อไม่สำเร็จ')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [page])

  const visibleTeams = useMemo(
    () => TEAM_LIST
      .filter((team) => teamId === 'all' || team.id === teamId)
      .map((team) => ({ team, entries: entries.filter((entry) => entry.teamId === team.id) })),
    [entries, teamId],
  )
  const visibleCount = visibleTeams.reduce((sum, group) => sum + group.entries.length, 0)

  return (
    <section className={`page${page === 'players' ? ' active' : ''}`} id="page-players">
      <div className="section-head roster-head">
        <div>
          <span className="page-kicker">ตรวจสอบข้อมูลลงทะเบียน</span>
          <h1>รายชื่อผู้ลงทะเบียน</h1>
          <p>แยกตาม อปท. และประเภทการลงทะเบียน</p>
        </div>
        <div className="roster-total" aria-label={`พบ ${visibleCount} รายชื่อ`}>
          <b>{visibleCount}</b><span>รายชื่อ</span>
        </div>
      </div>

      <div className="roster-controls" aria-label="ตัวกรองรายชื่อ">
        <label className="roster-team-filter">
          <span>เลือก อปท.</span>
          <select value={teamId} onChange={(event) => setTeamId(event.target.value)}>
            <option value="all">ทุก อปท.</option>
            {TEAM_LIST.map((team) => <option key={team.id} value={team.id}>{team.nameTh}</option>)}
          </select>
        </label>
      </div>

      {loading ? (
        <div className="card roster-state">กำลังโหลดรายชื่อ…</div>
      ) : error ? (
        <div className="card roster-state error">{error}</div>
      ) : (
        <div className="roster-groups">
          {visibleTeams.map(({ team, entries: teamEntries }) => (
            <article className="card roster-team" key={team.id}>
              <header>
                <img src={team.crestUrl} alt="" />
                <div><h2>{team.nameTh}</h2><p>รวม {teamEntries.length} รายชื่อ</p></div>
                <strong className="roster-team-total">{teamEntries.length}</strong>
              </header>

              <div className="roster-category-counts" aria-label={`สรุป ${team.nameTh}`}>
                {CATEGORIES.map((category) => (
                  <span key={category.id}>
                    <b>{teamEntries.filter((entry) => entry.category === category.id).length}</b>
                    {category.label}
                  </span>
                ))}
              </div>

              {teamId === 'all' ? (
                <button
                  type="button"
                  className="roster-open-button"
                  onClick={() => setTeamId(team.id)}
                >
                  ดูรายชื่อ {team.nameTh}
                </button>
              ) : CATEGORIES.map((category) => {
                const categoryEntries = teamEntries.filter((entry) => entry.category === category.id)
                return (
                  <section className="roster-category" key={category.id}>
                    <h3>
                      {category.id === 'attendee' ? <UserRound size={15} /> : <UsersRound size={15} />}
                      {category.label}<span>{categoryEntries.length} คน</span>
                    </h3>
                    {categoryEntries.length ? (
                      <ol className="roster-list">
                        {categoryEntries.map((entry, index) => (
                          <li key={`${entry.category}-${entry.id}`}>
                            <span className="roster-number">{String(index + 1).padStart(2, '0')}</span>
                            <div className="roster-person"><b>{entry.fullName}</b><span>{entry.positionLabel}</span></div>
                            {entry.category === 'football' && entry.jerseyNumber ? (
                              <span className="jersey-pill"><Shirt size={13} /> {entry.jerseyNumber}</span>
                            ) : null}
                          </li>
                        ))}
                      </ol>
                    ) : <p className="roster-team-empty">ยังไม่มีรายชื่อ</p>}
                  </section>
                )
              })}
            </article>
          ))}
        </div>
      )}

      <div className="roster-privacy">
        <ShieldCheck size={16} />
        <p>แสดงเฉพาะชื่อ อปท. ประเภท ตำแหน่ง และเบอร์เสื้อฟุตซอล ไม่แสดงอายุ เบอร์โทร ตำบล หรือหมายเหตุ</p>
      </div>
    </section>
  )
}
