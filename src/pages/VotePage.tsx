import { useMemo, useState } from 'react'
import { Trophy } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { castFavoriteVote, hasVotedLocally } from '../api/voteApi'
import { TEAM_LIST } from '../data/teams'
import type { SportType, VoteCandidate } from '../types/sports'

const SPORT_OPTIONS: { id: SportType; label: string }[] = [
  { id: 'football', label: 'ฟุตซอล' },
  { id: 'volleyball', label: 'วอลเลย์บอล' },
]

type CandidateGroup = {
  teamId: string
  teamName: string
  crestUrl?: string
  candidates: VoteCandidate[]
}

type RankedCandidate = VoteCandidate & { rank: number }

export function VotePage() {
  const { page, setPage, data, sport, setSport, refresh } = useApp()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ sport: SportType; text: string } | null>(null)
  const [votedBySport, setVotedBySport] = useState<Record<SportType, boolean>>(() => ({
    football: hasVotedLocally('football'),
    volleyball: hasVotedLocally('volleyball'),
  }))
  const voted = votedBySport[sport]

  const ranking = useMemo<RankedCandidate[]>(() => {
    const candidates = data.voteCandidates
      .filter((candidate) => candidate.votes > 0)
      .sort((left, right) => (
        right.votes - left.votes || left.fullName.localeCompare(right.fullName, 'th')
      ))
    return candidates.map((candidate) => ({
      ...candidate,
      rank: candidates.findIndex((entry) => entry.votes === candidate.votes) + 1,
    }))
  }, [data.voteCandidates])

  const groups = useMemo<CandidateGroup[]>(() => {
    const byTeam = new Map<string, VoteCandidate[]>()
    for (const candidate of data.voteCandidates) {
      const list = byTeam.get(candidate.teamId) ?? []
      list.push(candidate)
      byTeam.set(candidate.teamId, list)
    }

    const known = TEAM_LIST.flatMap((team) => {
      const candidates = byTeam.get(team.id)
      if (!candidates?.length) return []
      byTeam.delete(team.id)
      return [{ teamId: team.id, teamName: team.nameTh, crestUrl: team.crestUrl, candidates }]
    })

    const extra = [...byTeam.entries()]
      .map(([teamId, candidates]) => ({
        teamId,
        teamName: candidates[0]?.teamName ?? teamId,
        candidates,
      }))
      .sort((a, b) => a.teamName.localeCompare(b.teamName, 'th'))

    return [...known, ...extra]
  }, [data.voteCandidates])

  async function vote(id: string) {
    setBusyId(id)
    setMessage(null)
    try {
      await castFavoriteVote(sport, id)
      setVotedBySport((current) => ({ ...current, [sport]: true }))
      setMessage({ sport, text: 'โหวตเรียบร้อย ขอบคุณครับ' })
      refresh()
    } catch (err: unknown) {
      setMessage({
        sport,
        text: err instanceof Error ? err.message : 'โหวตไม่สำเร็จ',
      })
      if (err instanceof Error && err.message.includes('โหวตไปแล้ว')) {
        setVotedBySport((current) => ({ ...current, [sport]: true }))
      }
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className={`page${page === 'vote' ? ' active' : ''}`} id="page-vote">
      <div className="section-head">
        <div>
          <h1>นักกีฬาขวัญใจ</h1>
          <p>อำเภอบาเจาะ · โหวตได้ 1 คนต่อชนิดกีฬา</p>
        </div>
        <button type="button" className="text-btn" onClick={() => setPage('home')}>
          กลับ
        </button>
      </div>

      <div className="vote-sport-switch" role="tablist" aria-label="เลือกประเภทนักกีฬาขวัญใจ">
        {SPORT_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={sport === option.id}
            className={sport === option.id ? 'active' : ''}
            onClick={() => {
              setMessage(null)
              setSport(option.id)
            }}
          >
            {option.label}
          </button>
        ))}
      </div>

      <section className="vote-ranking" aria-labelledby="vote-ranking-title">
        <div className="vote-ranking-head">
          <span className="vote-ranking-icon"><Trophy size={17} /></span>
          <div>
            <h2 id="vote-ranking-title">อันดับคะแนนโหวต</h2>
            <p>{sport === 'football' ? 'ฟุตซอล' : 'วอลเลย์บอล'} · อัปเดตตามคะแนนล่าสุด</p>
          </div>
        </div>

        {ranking.length ? (
          <div className="vote-ranking-list">
            {ranking.map((candidate) => (
              <div
                className={`card vote-rank-row${candidate.rank <= 3 ? ` top-${candidate.rank}` : ''}`}
                key={`rank-${candidate.id}`}
              >
                <span className="vote-rank-number">{candidate.rank}</span>
                {candidate.photoUrl ? (
                  <img src={candidate.photoUrl} alt="" className="vote-rank-photo" />
                ) : (
                  <span className="vote-rank-photo placeholder">
                    {candidate.jerseyNumber ? `#${candidate.jerseyNumber}` : '?'}
                  </span>
                )}
                <div className="vote-rank-meta">
                  <b>{candidate.fullName}</b>
                  <p>
                    {candidate.teamName}
                    {candidate.jerseyNumber ? ` · เบอร์ ${candidate.jerseyNumber}` : ''}
                  </p>
                </div>
                <strong className="vote-rank-score">
                  {candidate.votes}<span>โหวต</span>
                </strong>
              </div>
            ))}
          </div>
        ) : (
          <div className="card vote-ranking-empty">ยังไม่มีผู้ได้รับคะแนนโหวต</div>
        )}
      </section>

      {data.voteCandidates.length === 0 ? (
        <div className="card" style={{ padding: 16, fontSize: 13, color: 'var(--muted)' }}>
          ยังไม่มีรายชื่อลงทะเบียน{sport === 'football' ? 'ฟุตซอล' : 'วอลเลย์บอล'}ให้โหวต
        </div>
      ) : (
        <div className="vote-groups">
          {groups.map((group) => (
            <section className="vote-org" key={group.teamId}>
              <div className="vote-org-head">
                {group.crestUrl ? <img src={group.crestUrl} alt="" /> : null}
                <div>
                  <h2>{group.teamName}</h2>
                  <p>{group.candidates.length} คน</p>
                </div>
              </div>
              <div className="vote-list">
                {group.candidates.map((candidate) => (
                  <div className="card vote-row" key={candidate.id}>
                    {candidate.photoUrl ? (
                      <img src={candidate.photoUrl} alt="" className="vote-photo" />
                    ) : (
                      <div className="vote-photo placeholder">
                        {candidate.jerseyNumber ? `#${candidate.jerseyNumber}` : '?'}
                      </div>
                    )}
                    <div className="vote-meta">
                      <b>{candidate.fullName}</b>
                      <p>
                        {candidate.jerseyNumber ? `เบอร์ ${candidate.jerseyNumber} · ` : ''}
                        {candidate.votes} โหวต
                      </p>
                    </div>
                    <button
                      type="button"
                      className="vote-btn"
                      disabled={voted || busyId === candidate.id}
                      onClick={() => void vote(candidate.id)}
                    >
                      {voted ? 'โหวตแล้ว' : busyId === candidate.id ? '…' : 'โหวต'}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {message?.sport === sport ? <p className="vote-msg">{message.text}</p> : null}
    </section>
  )
}
