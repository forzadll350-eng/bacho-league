import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

const POSTER_SRC = '/posters/futsal-league-2026.jpg'

/**
 * แสดงโปสเตอร์ทุกครั้งที่เข้าหน้าลงทะเบียน (นักกีฬา / ผู้เข้าร่วม)
 */
export function RegistrationPosterModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="reg-poster-root" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" className="reg-poster-scrim" aria-label="ปิดโปสเตอร์" onClick={onClose} />
      <div className="reg-poster-panel">
        <button type="button" className="reg-poster-close" onClick={onClose} aria-label="ปิด">
          <X size={20} strokeWidth={2.5} />
        </button>
        <h2 id={titleId} className="sr-only">
          โปสเตอร์ฟุตซอลลีก สายใยสัมพันธ์
        </h2>
        <img
          className="reg-poster-img"
          src={POSTER_SRC}
          alt="โปสเตอร์ฟุตซอลลีก สายใยสัมพันธ์ อบต. ภายในอำเภอบาเจาะ วันที่ 21 กันยายน 2569"
          decoding="async"
        />
      </div>
    </div>,
    document.body,
  )
}

/** เปิดโปสเตอร์ทุกครั้งที่เข้าหน้า pageKey */
export function useRegistrationPoster(pageActive: boolean) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (pageActive) setOpen(true)
    else setOpen(false)
  }, [pageActive])

  return {
    posterOpen: open,
    closePoster: () => setOpen(false),
  }
}
