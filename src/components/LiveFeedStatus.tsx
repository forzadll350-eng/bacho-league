import { useApp } from '../context/AppContext'

export function LiveFeedStatus() {
  const { updateText, usingLiveData, loading } = useApp()

  return (
    <div className="feed-status">
      <div className="feed-left">
        <span className="online" aria-hidden />
        <span>{loading ? 'กำลังโหลด…' : updateText}</span>
      </div>
      <span className="official">{usingLiveData ? 'Official Feed' : 'Demo Feed'}</span>
    </div>
  )
}
