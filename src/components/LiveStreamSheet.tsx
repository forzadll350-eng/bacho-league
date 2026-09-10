import { X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { parseYouTubeId, youtubeEmbedUrl } from '../lib/youtube'

export function LiveStreamSheet() {
  const { streamOpen, closeStream, data } = useApp()
  const url = data.hero.liveStreamUrl
  const videoId = parseYouTubeId(url)
  const h = data.hero

  return (
    <>
      <div
        className={`stream-scrim${streamOpen ? ' show' : ''}`}
        onClick={closeStream}
        aria-hidden={!streamOpen}
      />
      <div
        className={`stream-sheet${streamOpen ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="ไลฟ์ YouTube"
        aria-hidden={!streamOpen}
      >
        <div className="stream-top">
          <div>
            <b>ไลฟ์สด</b>
            <p>
              {h.home.nameTh} {h.score} {h.away.nameTh}
            </p>
          </div>
          <button type="button" className="back" onClick={closeStream} aria-label="ปิด">
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>

        <div className="stream-score sports-num">
          <span>{h.home.shortName}</span>
          <strong>{h.score}</strong>
          <span>{h.away.shortName}</span>
        </div>

        {videoId ? (
          <div className="stream-frame">
            <iframe
              title="YouTube Live"
              src={streamOpen ? youtubeEmbedUrl(videoId) : undefined}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        ) : (
          <div className="stream-empty">ยังไม่มีลิงก์ไลฟ์ที่ใช้งานได้</div>
        )}

        <p className="stream-note">ถ่ายทอดผ่าน YouTube · แอปนี้ไม่เก็บไฟล์วิดีโอ</p>
      </div>
    </>
  )
}
