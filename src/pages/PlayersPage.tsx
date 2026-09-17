import { useEffect, useMemo, useState } from 'react'
import { ShieldCheck, Shirt, UsersRound } from 'lucide-react'
import {
  loadPublicPlayerRoster,
  type PublicRosterPlayer,
} from '../api/registrationApi'
import { useApp } from '../context/AppContext'
import { TEAM_LIST } from '../data/teams'
import type { SportType } from '../types/sports'

export function PlayersPage() {
  const { page } = useApp()
  const [sport, setSport] = useState<SportType>('football')
  const [teamId, setTeamId] = useState('all')
  const [players, setPlayers] = useState<PublicRosterPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (page !== 'players') return
    let cancelled = false
    setLoading(true)
    setError('')
    void loadPublicPlayerRoster(sport)
      .then((rows) => {
        if (!cancelled) setPlayers(rows)
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setPlayers([])
          setError(caught instanceof Error ? caught.message : 'โหลดรายชื่อไม่สำเร็จ')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [page, sport])

  const visibleTeams = useMemo(
    () =>
      TEAM_LIST.map((team) => ({
        team,
        players: players.filter(
          (player) => player.teamId === team.id && (teamId === 'all' || team.id === teamId),
        ),
      })).filter((group) =>
        teamId === 'all' ? group.players.length > 0 : group.team.id === teamId,
      ),
    [players, teamId],
  )

  const visibleCount = visibleTeams.reduce((sum, group) => sum + group.players.length, 0)

  return (
    <section className={`page${page === 'players' ? ' active' : ''}`} id="page-players">
      <div className="section-head roster-head">
        <div>
          <span className="page-kicker">ตรวจสอบก่อนวันแข่งขัน</span>
          <h1>รายชื่อนักกีฬา</h1>
          <p>แสดงเฉพาะผู้สมัครที่ยินยอมเผยแพร่รายชื่อ</p>
        </div>
        <div className="roster-total" aria-label={`พบ ${visibleCount} คน`}>
          <b>{visibleCount}</b>
          <span>คน</span>
        </div>
      </div>

      <div className="roster-controls" aria-label="ตัวกรองรายชื่อ">
        <div className="roster-sports" role="group" aria-label="ประเภทกีฬา">
          <button
            type="button"
            className={sport === 'football' ? 'active' : ''}
            aria-pressed={sport === 'football'}
            onClick={() => setSport('football')}
          >
            ฟุตซอล
          </button>
          <button
            type="button"
            className={sport === 'volleyball' ? 'active' : ''}
            aria-pressed={sport === 'volleyball'}
            onClick={() => setSport('volleyball')}
          >
            วอลเลย์บอล
          </button>
        </div>
        <label className="roster-team-filter">
          <span>เลือก อปท.</span>
          <select value={teamId} onChange={(event) => setTeamId(event.target.value)}>
            <option value="all">ทุก อปท.</option>
            {TEAM_LIST.map((team) => (
              <option key={team.id} value={team.id}>
                {team.nameTh}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <div className="card roster-state">กำลังโหลดรายชื่อ…</div>
      ) : error ? (
        <div className="card roster-state error">{error}</div>
      ) : visibleCount === 0 ? (
        <div className="card roster-empty">
          <UsersRound size={26} strokeWidth={1.5} />
          <h2>ยังไม่มีรายชื่อที่แสดงได้</h2>
          <p>
            อาจยังไม่มีผู้สมัคร หรือผู้สมัครของ {teamId === 'all' ? 'ประเภทกีฬานี้' : 'อปท.นี้'}
            ยังไม่ได้ยินยอมให้เผยแพร่รายชื่อ
          </p>
        </div>
      ) : (
        <div className="roster-groups">
          {visibleTeams.map(({ team, players: teamPlayers }) => (
            <article className="card roster-team" key={team.id}>
              <header>
                <img src={team.crestUrl} alt="" />
                <div>
                  <h2>{team.nameTh}</h2>
                  <p>{teamPlayers.length} คน</p>
                </div>
              </header>
              {teamPlayers.length ? (
                <ol className="roster-list">
                  {teamPlayers.map((player, index) => (
                    <li key={player.id}>
                      <span className="roster-number">{String(index + 1).padStart(2, '0')}</span>
                      <b>{player.fullName}</b>
                      {sport === 'football' && player.jerseyNumber ? (
                        <span className="jersey-pill">
                          <Shirt size={13} /> {player.jerseyNumber}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="roster-team-empty">ยังไม่มีผู้ยินยอมแสดงรายชื่อ</p>
              )}
            </article>
          ))}
        </div>
      )}

      <div className="roster-privacy">
        <ShieldCheck size={16} />
        <p>หน้านี้ไม่แสดงอายุ ตำแหน่ง เบอร์โทร หรือรูปถ่ายของนักกีฬา</p>
      </div>
    </section>
  )
}
