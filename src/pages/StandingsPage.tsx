import { useMemo } from 'react'
import { LEAGUE } from '../data/teams'
import { useApp } from '../context/AppContext'
import { StandingsTable } from '../components/StandingsTable'
import { MatchCard } from '../components/MatchCard'
import { compareMatchOrder } from '../lib/matchOrder'
import type { Match } from '../types/sports'

function knockoutPair(matches: Match[], id: string, pending: string): string {
  const match = matches.find((item) => item.id === id)
  if (!match || match.homeTeam.id.startsWith('slot-') || match.awayTeam.id.startsWith('slot-')) {
    return pending
  }
  return `${match.homeTeam.nameTh} พบ ${match.awayTeam.nameTh}`
}

export function StandingsPage() {
  const { page, data, sport } = useApp()

  const groupA = useMemo(
    () => data.table.filter((r) => r.groupCode === 'A').sort((a, b) => a.rank - b.rank),
    [data.table],
  )
  const groupB = useMemo(
    () => data.table.filter((r) => r.groupCode === 'B').sort((a, b) => a.rank - b.rank),
    [data.table],
  )
  const knockout = useMemo(
    () =>
      data.matches
        .filter((m) => m.stage === 'semi' || m.stage === 'third' || m.stage === 'final')
        .sort(compareMatchOrder),
    [data.matches],
  )

  const rowsA = groupA.length ? groupA : data.table.slice(0, 4)
  const rowsB = groupB.length ? groupB : data.table.slice(4, 8)
  const isVolleyball = sport === 'volleyball'

  return (
    <section className={`page${page === 'standings' ? ' active' : ''}`} id="page-standings">
      <div className="section-head">
        <div>
          <h1>ตารางคะแนน</h1>
          <p>
            {LEAGUE.seasonName} · 21 ก.ย. 2569 · เสมอกันจับฉลาก
          </p>
        </div>
      </div>

      <div className="standings-stack">
        <StandingsTable title="สาย A" rows={rowsA} sport={sport} />
        <StandingsTable title="สาย B" rows={rowsB} sport={sport} />
      </div>

      <p className="standings-note">
        {isVolleyball
          ? 'เซตได้ / เซตเสีย / +/− ไว้ดูประกอบ · ชนะแมตช์ได้ 3 แต้ม · แต้มเท่ากันจับฉลาก'
          : 'ได้ / เสีย / +/− ไว้ดูประกอบ · จัดอันดับเมื่อแต้มเท่ากันใช้จับฉลาก'}
      </p>

      <div className="section-head">
        <h2>เส้นทางชิงชนะเลิศ</h2>
      </div>
      <div className="card knockout-board">
        <div className="knockout-path">
          {isVolleyball ? (
            <div className="knockout-step">
              <span className="knockout-label">นัดชิง</span>
              <p>{knockoutPair(knockout, 'vb-final', 'ที่ 1 สาย A พบ ที่ 1 สาย B · รอยืนยันทีม')}</p>
            </div>
          ) : (
            <>
              <div className="knockout-step">
                <span className="knockout-label">รองฯ</span>
                <p>{knockoutPair(knockout, 'fb-sf-1', 'A1 พบ B2 · รอยืนยันทีม')} · {knockoutPair(knockout, 'fb-sf-2', 'B1 พบ A2 · รอยืนยันทีม')}</p>
              </div>
              <div className="knockout-arrow" aria-hidden>
                →
              </div>
              <div className="knockout-step">
                <span className="knockout-label">ชิงอันดับ 3</span>
                <p>{knockoutPair(knockout, 'fb-third', 'ผู้แพ้รองฯ 1 พบ ผู้แพ้รองฯ 2 · รอยืนยันทีม')}</p>
              </div>
              <div className="knockout-arrow" aria-hidden>
                →
              </div>
              <div className="knockout-step">
                <span className="knockout-label">นัดชิง</span>
                <p>{knockoutPair(knockout, 'fb-final', 'ผู้ชนะรองฯ พบกัน · รอยืนยันทีม')}</p>
              </div>
            </>
          )}
        </div>
        {knockout.length ? (
          <div className="knockout-matches">
            {knockout.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        ) : (
          <p className="knockout-empty">จะอัปเดตคู่จริงหลังจบสาย + จับฉลาก (ถ้าจำเป็น)</p>
        )}
      </div>
    </section>
  )
}
