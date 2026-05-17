// src/components/panels/ExportPanel.tsx — MP4 내보내기 설정
import type { ExportConfig, ExportStatus } from '../../types'
import { RESOLUTIONS } from '../../constants'

interface Props {
  config:       ExportConfig
  status:       ExportStatus
  progress:     number
  hasFile:      boolean
  onChange:     (c: ExportConfig) => void
  onExport:     () => void
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
        <label className="setting-label">VIDEO BITRATE</label>
        <div className="bitrate-row">
          <input
            type="range" min={2} max={20} step={1}
            value={config.bitrateM}
            disabled={isEncoding}
            onChange={e => onChange({ ...config, bitrateM: Number(e.target.value) })}
            className="slider"
          />
          <span className="bitrate-val">{config.bitrateM}M</span>
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
