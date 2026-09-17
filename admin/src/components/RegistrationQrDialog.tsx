import { ClipboardCheck, Download, ExternalLink, UserRound, UsersRound, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import './RegistrationQrDialog.css'

const PUBLIC_APP_ORIGIN = (
  import.meta.env.VITE_PUBLIC_APP_URL || 'https://bacho-league.vercel.app'
).replace(/\/$/, '')

const QR_ITEMS = [
  {
    key: 'athlete',
    title: 'ลงทะเบียนนักกีฬา',
    description: 'สำหรับนักกีฬาฟุตซอลและวอลเลย์บอล',
    url: `${PUBLIC_APP_ORIGIN}/#register`,
    fileName: 'bacho-league-athlete-registration-qr.png',
    Icon: UserRound,
  },
  {
    key: 'attendee',
    title: 'ลงทะเบียนพนักงาน / ผู้เข้าร่วม',
    description: 'สำหรับผู้เข้าร่วมงานที่ไม่ใช่นักกีฬาลงสนาม',
    url: `${PUBLIC_APP_ORIGIN}/#attendee`,
    fileName: 'bacho-league-staff-registration-qr.png',
    Icon: UsersRound,
  },
  {
    key: 'evaluation',
    title: 'ประเมินความพึงพอใจ',
    description: 'เปิดรับวันที่ 21 ก.ย. 2569 เวลา 08:00 น.',
    url: `${PUBLIC_APP_ORIGIN}/?page=evaluation`,
    fileName: 'bacho-league-satisfaction-evaluation-qr.png',
    Icon: ClipboardCheck,
  },
] as const

type QrKey = (typeof QR_ITEMS)[number]['key']

export function RegistrationQrDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const onCloseRef = useRef(onClose)
  const [qrImages, setQrImages] = useState<Partial<Record<QrKey, string>>>({})
  const [qrError, setQrError] = useState(false)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const handleCancel = (event: Event) => {
      event.preventDefault()
      onCloseRef.current()
    }

    dialog.addEventListener('cancel', handleCancel)
    dialog.showModal()
    return () => {
      dialog.removeEventListener('cancel', handleCancel)
      if (dialog.open) dialog.close()
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void import('qrcode')
      .then(({ toDataURL }) =>
        Promise.all(
          QR_ITEMS.map(async (item) => {
            const image = await toDataURL(item.url, {
              width: 720,
              margin: 3,
              errorCorrectionLevel: 'H',
              color: { dark: '#000000', light: '#ffffff' },
            })
            return [item.key, image] as const
          }),
        ),
      )
      .then((entries) => {
        if (!cancelled) setQrImages(Object.fromEntries(entries))
      })
      .catch(() => {
        if (!cancelled) setQrError(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="registration-qr-dialog"
      aria-labelledby="registration-qr-title"
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose()
      }}
    >
      <div className="registration-qr-dialog__sheet">
        <header className="registration-qr-dialog__header">
          <div>
            <p>ระบบแอดมิน</p>
            <h2 id="registration-qr-title">QR สำหรับผู้เข้าร่วม</h2>
            <span>ใช้ลงทะเบียนหรือเปิดแบบประเมิน และดาวน์โหลดไปพิมพ์ได้</span>
          </div>
          <button type="button" aria-label="ปิด" onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        <div className="registration-qr-list">
          {QR_ITEMS.map(({ key, title, description, url, fileName, Icon }) => {
            const image = qrImages[key]
            return (
              <section key={key} className="registration-qr-card">
                <div className="registration-qr-card__title">
                  <span className="registration-qr-card__icon">
                    <Icon size={19} aria-hidden />
                  </span>
                  <div>
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </div>
                </div>

                <div className="registration-qr-code" aria-live="polite">
                  {image ? (
                    <img src={image} alt={`คิวอาร์โค้ด ${title}`} />
                  ) : qrError ? (
                    <span role="alert">สร้าง QR ไม่สำเร็จ กรุณาลองเปิดใหม่</span>
                  ) : (
                    <span>กำลังสร้าง QR…</span>
                  )}
                </div>

                <code className="registration-qr-url">{url}</code>

                <div className="registration-qr-actions">
                  <a className="btn secondary" href={url} target="_blank" rel="noreferrer">
                    <ExternalLink size={16} aria-hidden />
                    เปิดหน้า
                  </a>
                  {image ? (
                    <a className="btn" href={image} download={fileName}>
                      <Download size={16} aria-hidden />
                      ดาวน์โหลด QR
                    </a>
                  ) : (
                    <button type="button" className="btn" disabled>
                      <Download size={16} aria-hidden />
                      ดาวน์โหลด QR
                    </button>
                  )}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </dialog>
  )
}
