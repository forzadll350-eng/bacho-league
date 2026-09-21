import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const { signIn, configured, kickMessage, clearKickMessage } = useAuth()
  const [login, setLogin] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (kickMessage) setError(kickMessage)
  }, [kickMessage])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    clearKickMessage()
    setBusy(true)
    const msg = await signIn(login.trim(), pin)
    setBusy(false)
    if (msg) setError(msg)
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={onSubmit}>
        <h1>แอดมิน · ฟุตซอลลีก</h1>
        <p>เข้าด้วยไอดี lubo1–lubo8, alif1–alif8 หรืออีเมลผู้ดูแลที่ได้รับอนุญาต · เข้าซ้อนเครื่องไม่ได้</p>

        {!configured && (
          <p className="error" style={{ marginBottom: 12, padding: 0, textAlign: 'left' }}>
            ตั้งค่า VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY ใน admin/.env
          </p>
        )}

        <div className="field">
          <label htmlFor="login">ไอดี</label>
          <input
            id="login"
            type="text"
            autoComplete="username"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            required
            disabled={!configured || busy}
            placeholder="เช่น lubo1 หรือ alif1"
            inputMode="text"
          />
        </div>

        <div className="field">
          <label htmlFor="pin">PIN</label>
          <input
            id="pin"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            required
            disabled={!configured || busy}
            placeholder="6 หลัก"
            maxLength={12}
          />
        </div>

        {error && (
          <p className="error" style={{ marginBottom: 12, padding: 0 }}>
            {error}
          </p>
        )}

        <button className="btn" type="submit" disabled={!configured || busy}>
          {busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
        </button>
      </form>
    </div>
  )
}
