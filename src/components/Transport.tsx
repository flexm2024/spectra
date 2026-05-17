// src/components/Transport.tsx — 재생 컨트롤 + 프로그레스 스크러버
interface Props {
  isPlaying:   boolean
  currentTime: number
  duration:    number
  onPlay:      () => void
  onPause:     () => void
  onSeek:      (time: number) => void
  onRestart:   () => void
}

function formatTime(s: number): string {
  if (!isFinite(s)) return '--:--'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export function Transport({ isPlaying, currentTime, duration, onPlay, onPause, onSeek, onRestart }: Props) {
  const progress = duration > 0 ? currentTime / duration : 0

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const t    = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    onSeek(t * duration)
  }

  return (
    <div className="transport">
      <span className="transport-time">{formatTime(currentTime)}</span>
      <div className="transport-controls">
        <button className="ctrl-btn" onClick={onRestart}>⏮</button>
        <button
          className="ctrl-btn play-btn"
          onClick={isPlaying ? onPause : onPlay}
          disabled={duration === 0}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button className="ctrl-btn" onClick={() => onSeek(duration)}>⏭</button>
      </div>
      <div className="transport-scrubber">
        <div className="scrubber-track" onClick={handleScrub}>
          <div className="scrubber-fill"   style={{ width: `${progress * 100}%` }} />
          <div className="scrubber-cursor" style={{ left:  `${progress * 100}%` }} />
        </div>
      </div>
      <span className="transport-duration">{formatTime(duration)}</span>
    </div>
  )
}
