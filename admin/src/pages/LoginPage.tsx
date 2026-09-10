import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const { signIn, configured } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const msg = await signIn(email.trim(), password)
    setBusy(false)
    if (msg) setError(msg)
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={onSubmit}>
        <h1>แอดมิน · ฟุตซอลลีก</h1>
        <p>ล็อกอินด้วยบัญชี Supabase Auth เพื่ออัปเดตสกอร์สด</p>

        {!configured && (
          <p className="error" style={{ marginBottom: 12, padding: 0, textAlign: 'left' }}>
            ตั้งค่า VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY ใน admin/.env
          </p>
        )}

        <div className="field">
          <label htmlFor="email">อีเมล</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={!configured || busy}
          />
        </div>

        <div className="field">
          <label htmlFor="password">รหัสผ่าน</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={!configured || busy}
          />
        </div>

        {error && <p className="error" style={{ marginBottom: 12, padding: 0 }}>{error}</p>}

        <button className="btn" type="submit" disabled={!configured || busy}>
          {busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
        </button>
      </form>
    </div>
  )
}
