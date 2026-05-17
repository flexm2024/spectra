// src/components/panels/ExportPanel.tsx — MP4 내보내기 설정
import type { ExportConfig, ExportStatus } from '../../types'
import { RESOLUTIONS, BITRATE_PROFILES } from '../../constants'

interface Props {
  config:    ExportConfig
  status:    ExportStatus
  progress:  number
  hasFile:   boolean
  onChange:  (c: ExportConfig) => void
  onExport:  () => void
}

export function ExportPanel({ config, status, progress, hasFile, onChange, onExport }: Props) {
  const isEncoding = status === 'encoding'

  return (
    <section className="panel">
      <h3 className="panel-label">EXPORT</h3>

      <div className="export-field">
        <label className="setting-label">RESOLUTION</label>
        <select
          className="setting-select"
          value={config.resolution}
          disabled={isEncoding}
          onChange={e => onChange({ ...config, resolution: e.target.value as ExportConfig['resolution'] })}
        >
          {RESOLUTIONS.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      <div className="export-field">
        <label className="setting-label">렌더링 프로파일</label>
        <div className="btn-group">
          {BITRATE_PROFILES.map(p => (
            <button
              key={p.bitrateM}
              className={`profile-btn${config.bitrateM === p.bitrateM ? ' active' : ''}`}
              disabled={isEncoding}
              onClick={() => onChange({ ...config, bitrateM: p.bitrateM })}
            >
              {p.label}
              <span className="profile-sub">{p.bitrateM}M</span>
            </button>
          ))}
        </div>
      </div>

      <div className="export-field">
        <label className="setting-label">재생 횟수</label>
        <div className="btn-group">
          {([1, 2, 3] as const).map(n => (
            <button
              key={n}
              className={`profile-btn${config.loopCount === n ? ' active' : ''}`}
              disabled={isEncoding}
              onClick={() => onChange({ ...config, loopCount: n })}
            >
              {n}회
            </button>
          ))}
        </div>
      </div>

      <div className="export-field">
        <label className="setting-label">오디오 품질</label>
        <div className="btn-group">
          {([96, 128, 192] as const).map(k => (
            <button
              key={k}
              className={`profile-btn${config.audioBitrateK === k ? ' active' : ''}`}
              disabled={isEncoding}
              onClick={() => onChange({ ...config, audioBitrateK: k })}
            >
              {k}k
            </button>
          ))}
        </div>
      </div>

      {isEncoding && (
        <div className="export-progress">
          <div className="export-progress-fill" style={{ width: `${progress * 100}%` }} />
          <span className="export-progress-text">{Math.round(progress * 100)}%</span>
        </div>
      )}

      <button
        className="export-btn"
        disabled={!hasFile || isEncoding}
        onClick={onExport}
      >
        {isEncoding ? '⏳ ENCODING...' : '⬇ EXPORT MP4'}
      </button>
    </section>
  )
}
