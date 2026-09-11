import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { castFavoriteVote, hasVotedLocally } from '../api/voteApi'

export function VotePage() {
  const { page, setPage, data, sport, refresh } = useApp()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [voted, setVoted] = useState(() => hasVotedLocally())

  async function vote(id: string) {
    setBusyId(id)
    setMessage(null)
    try {
      await castFavoriteVote(id)
      setVoted(true)
      setMessage('โหวตเรียบร้อย ขอบคุณครับ')
      refresh()
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'โหวตไม่สำเร็จ')
      if (err instanceof Error && err.message.includes('โหวตไปแล้ว')) setVoted(true)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className={`page${page === 'vote' ? ' active' : ''}`} id="page-vote">
      <div className="section-head">
        <div>
          <h1>นักกีฬาขวัญใจ</h1>
          <p>อำเภอบาเจาะ · โหวตได้ 1 คน</p>
        </div>
        <button type="button" className="text-btn" onClick={() => setPage('home')}>
          กลับ
        </button>
      </div>

      {sport !== 'football' ? (
        <div className="card" style={{ padding: 16, fontSize: 13, color: 'var(--muted)' }}>
          โหวตเปิดเฉพาะฟุตซอล — สลับกีฬาเป็นฟุตซอลด้านบน
        </div>
      ) : data.voteCandidates.length === 0 ? (
        <div className="card" style={{ padding: 16, fontSize: 13, color: 'var(--muted)' }}>
          ยังไม่มีรายชื่อลงทะเบียนให้โหวต
        </div>
      ) : (
        <div className="vote-list">
          {data.voteCandidates.map((c) => (
            <div className="card vote-row" key={c.id}>
              {c.photoUrl ? (
                <img src={c.photoUrl} alt="" className="vote-photo" />
              ) : (
                <div className="vote-photo placeholder">
                  {c.jerseyNumber ? `#${c.jerseyNumber}` : '?'}
                </div>
              )}
              <div className="vote-meta">
                <b>{c.fullName}</b>
                <p>
                  {c.teamName}
                  {c.jerseyNumber ? ` · เบอร์ ${c.jerseyNumber}` : ''} · {c.votes} โหวต
                </p>
              </div>
              <button
                type="button"
                className="vote-btn"
                disabled={voted || busyId === c.id}
                onClick={() => void vote(c.id)}
              >
                {voted ? 'โหวตแล้ว' : busyId === c.id ? '…' : 'โหวต'}
              </button>
            </div>
          ))}
        </div>
      )}

      {message ? <p className="vote-msg">{message}</p> : null}
    </section>
  )
}
