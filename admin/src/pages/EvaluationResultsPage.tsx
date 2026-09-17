import {
  ArrowLeft,
  ClipboardCheck,
  Download,
  LogOut,
  Moon,
  Printer,
  RefreshCw,
  Sun,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  EVALUATION_OPENS_LABEL,
  EVALUATION_QUESTIONS,
  RESPONDENT_LABELS,
  fetchEvaluationDashboard,
  setEvaluationClosed,
  type EvaluationResponse,
  type EvaluationScoreKey,
  type EvaluationSettings,
} from '../api/evaluations'
import type { ThemeMode } from '../types'

function average(rows: EvaluationResponse[], key: EvaluationScoreKey): number | null {
  if (!rows.length) return null
  return rows.reduce((sum, row) => sum + row[key], 0) / rows.length
}

function csvCell(value: string | number | boolean): string {
  return `"${String(value).replaceAll('"', '""')}"`
}

function downloadCsv(rows: EvaluationResponse[]) {
  const headers = [
    'วันที่ตอบ',
    'อปท.',
    'ประเภทผู้ตอบ',
    ...EVALUATION_QUESTIONS.map((question) => question.label),
    'เข้าร่วมครั้งต่อไป',
    'ข้อเสนอแนะ',
  ]
  const body = rows.map((row) => [
    new Date(row.created_at).toLocaleString('th-TH'),
    row.team?.name_th ?? row.team_id,
    RESPONDENT_LABELS[row.respondent_type] ?? row.respondent_type,
    ...EVALUATION_QUESTIONS.map((question) => row[question.key]),
    row.join_again ? 'ต้องการ' : 'ไม่แน่ใจ / ไม่ต้องการ',
    row.comment ?? '',
  ])
  const csv = [headers, ...body].map((line) => line.map(csvCell).join(',')).join('\r\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `bacho-evaluation-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function EvaluationResultsPage({
  theme,
  displayName,
  onBack,
  onToggleTheme,
  onSignOut,
}: {
  theme: ThemeMode
  displayName: string
  onBack: () => void
  onToggleTheme: () => void
  onSignOut: () => void
}) {
  const [rows, setRows] = useState<EvaluationResponse[]>([])
  const [settings, setSettings] = useState<EvaluationSettings | null>(null)
  const [teamFilter, setTeamFilter] = useState('all')
  const [respondentFilter, setRespondentFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loadedAt] = useState(Date.now)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const dashboard = await fetchEvaluationDashboard()
      setRows(dashboard.responses)
      setSettings(dashboard.settings)
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'โหลดผลประเมินไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void fetchEvaluationDashboard()
      .then((dashboard) => {
        if (cancelled) return
        setRows(dashboard.responses)
        setSettings(dashboard.settings)
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'โหลดผลประเมินไม่สำเร็จ')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const teams = useMemo(() => {
    const mapped = new Map<string, string>()
    rows.forEach((row) => mapped.set(row.team_id, row.team?.name_th ?? row.team_id))
    return [...mapped.entries()].sort((a, b) => a[1].localeCompare(b[1], 'th'))
  }, [rows])

  const filtered = useMemo(
    () => rows.filter((row) => (
      (teamFilter === 'all' || row.team_id === teamFilter)
      && (respondentFilter === 'all' || row.respondent_type === respondentFilter)
    )),
    [respondentFilter, rows, teamFilter],
  )

  const overallAverage = average(filtered, 'overall_score')
  const joinAgainCount = filtered.filter((row) => row.join_again).length
  const joinAgainPercent = filtered.length ? Math.round((joinAgainCount / filtered.length) * 100) : null
  const isTimeOpen = settings ? loadedAt >= new Date(settings.opens_at).getTime() : false
  const isOpen = Boolean(settings && isTimeOpen && !settings.manually_closed)

  async function toggleClosed() {
    if (!settings) return
    setSaving(true)
    setError('')
    try {
      setSettings(await setEvaluationClosed(!settings.manually_closed))
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'เปลี่ยนสถานะไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="evaluation-admin">
      <header className="topbar evaluation-admin__topbar">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="กลับหน้าจัดการการแข่งขัน">
          <ArrowLeft size={18} />
        </button>
        <div className="brand">
          <strong>ผลประเมินความพึงพอใจ</strong>
          <span>{displayName}</span>
        </div>
        <div className="top-actions">
          <button type="button" className="icon-btn" onClick={onToggleTheme} aria-label={theme === 'dark' ? 'โหมดสว่าง' : 'โหมดมืด'}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button type="button" className="icon-btn" onClick={onSignOut} aria-label="ออกจากระบบ">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <section className="evaluation-admin__hero">
        <div>
          <p>โครงการสายใยสัมพันธ์ 2569</p>
          <h1>เสียงจากผู้ร่วมงาน</h1>
          <span>คำตอบไม่ระบุตัวตน · เปิดตามกำหนด {EVALUATION_OPENS_LABEL}</span>
        </div>
        <ClipboardCheck size={34} strokeWidth={1.5} aria-hidden />
      </section>

      <section className="evaluation-admin__status card">
        <div>
          <span className={`evaluation-status-dot${isOpen ? ' open' : ''}`} aria-hidden />
          <div>
            <strong>{isOpen ? 'กำลังเปิดรับคำตอบ' : settings?.manually_closed ? 'ปิดรับโดยแอดมิน' : 'ยังไม่ถึงเวลาเปิด'}</strong>
            <small>{settings?.manually_closed ? `ปิดเมื่อ ${formatDate(settings.closed_at)}` : `เปิดอัตโนมัติ ${EVALUATION_OPENS_LABEL}`}</small>
          </div>
        </div>
        <button type="button" className={settings?.manually_closed ? 'btn' : 'btn secondary'} onClick={() => void toggleClosed()} disabled={!settings || saving}>
          {saving ? 'กำลังบันทึก…' : settings?.manually_closed ? 'เปิดรับอีกครั้ง' : 'ปิดรับคำตอบ'}
        </button>
      </section>

      <div className="evaluation-admin__filters">
        <label>
          <span>อปท.</span>
          <select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)}>
            <option value="all">ทุก อปท.</option>
            {teams.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>
        <label>
          <span>ประเภทผู้ตอบ</span>
          <select value={respondentFilter} onChange={(event) => setRespondentFilter(event.target.value)}>
            <option value="all">ทุกประเภท</option>
            {Object.entries(RESPONDENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>

      <div className="evaluation-admin__actions">
        <button type="button" className="btn secondary" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={16} aria-hidden /> รีเฟรช
        </button>
        <button type="button" className="btn secondary" onClick={() => downloadCsv(filtered)} disabled={!filtered.length}>
          <Download size={16} aria-hidden /> CSV
        </button>
        <button type="button" className="btn secondary" onClick={() => window.print()} disabled={!filtered.length}>
          <Printer size={16} aria-hidden /> พิมพ์ / บันทึก PDF
        </button>
      </div>

      {error ? <div className="error" role="alert">{error}</div> : null}
      {loading ? <div className="loading">กำลังโหลดผลประเมิน…</div> : null}

      {!loading ? (
        <>
          <section className="evaluation-summary-grid" aria-label="สรุปผลประเมิน">
            <article className="evaluation-summary-card">
              <span>คำตอบ</span>
              <strong>{filtered.length}</strong>
              <small>รายการตามตัวกรอง</small>
            </article>
            <article className="evaluation-summary-card featured">
              <span>คะแนนรวม</span>
              <strong>{overallAverage == null ? '—' : overallAverage.toFixed(2)}</strong>
              <small>จาก 5 คะแนน</small>
            </article>
            <article className="evaluation-summary-card">
              <span>อยากร่วมอีก</span>
              <strong>{joinAgainPercent == null ? '—' : `${joinAgainPercent}%`}</strong>
              <small>{joinAgainCount} จาก {filtered.length} คน</small>
            </article>
          </section>

          <section className="card evaluation-score-panel">
            <header>
              <div>
                <h2>คะแนนแยกรายหัวข้อ</h2>
                <p>ค่าเฉลี่ยจากคำตอบที่เลือกอยู่</p>
              </div>
              <span>{filtered.length} คำตอบ</span>
            </header>
            <div className="evaluation-score-list">
              {EVALUATION_QUESTIONS.map((question, index) => {
                const value = average(filtered, question.key)
                return (
                  <div className="evaluation-score-row" key={question.key}>
                    <div>
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      <strong>{question.label}</strong>
                      <b>{value == null ? '—' : value.toFixed(2)}</b>
                    </div>
                    <div className="evaluation-score-track" aria-label={value == null ? 'ยังไม่มีคะแนน' : `${value.toFixed(2)} จาก 5`}>
                      <span style={{ width: `${value == null ? 0 : (value / 5) * 100}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="evaluation-comments">
            <header>
              <div>
                <h2>ข้อเสนอแนะ</h2>
                <p>เรียงจากคำตอบล่าสุด</p>
              </div>
              <span>{filtered.filter((row) => row.comment).length} ความคิดเห็น</span>
            </header>
            {filtered.filter((row) => row.comment).length ? (
              filtered.filter((row) => row.comment).map((row) => (
                <article className="card evaluation-comment" key={row.id}>
                  <p>{row.comment}</p>
                  <footer>
                    <span>{row.team?.name_th ?? row.team_id} · {RESPONDENT_LABELS[row.respondent_type] ?? row.respondent_type}</span>
                    <time dateTime={row.created_at}>{formatDate(row.created_at)}</time>
                  </footer>
                </article>
              ))
            ) : (
              <div className="empty">ยังไม่มีข้อเสนอแนะในตัวกรองนี้</div>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}
