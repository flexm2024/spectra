// src/components/panels/ColorPanel.tsx — 색상 프리셋 선택
import { COLOR_PRESETS } from '../../constants'

interface Props {
  preset:   number
  onChange: (i: number) => void
}

export function ColorPanel({ preset, onChange }: Props) {
  return (
    <section className="panel">
      <h3 className="panel-label">COLOR</h3>
      <div className="preset-list">
        {COLOR_PRESETS.map((p, i) => (
          <button
            key={i}
            className={`preset-btn${preset === i ? ' active' : ''}`}
            onClick={() => onChange(i)}
          >
            <div className="preset-swatches">
              {p.colors.map((c, j) => (
                <span key={j} className="swatch" style={{ background: c }} />
              ))}
            </div>
            <span className="preset-name">{p.name}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
