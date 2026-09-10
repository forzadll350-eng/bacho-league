import { useApp } from '../context/AppContext'

export function LiveFeedStatus() {
  const { updateText } = useApp()

  return (
    <div className="feed-status">
      <div className="feed-left">
        <span className="online" aria-hidden />
        <span>{updateText}</span>
      </div>
      <span className="official">Official Feed</span>
    </div>
  )
}
