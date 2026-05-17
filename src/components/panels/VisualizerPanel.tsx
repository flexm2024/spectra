// src/components/panels/VisualizerPanel.tsx — 비주얼라이저 타입 선택
import type { VizType } from '../../types'
import { VIZ_TYPES } from '../../constants'

interface Props {
  vizType:  VizType
  onChange: (v: VizType) => void
}

export function VisualizerPanel({ vizType, onChange }: Props) {
  return (
    <section className="panel">
      <h3 className="panel-label">VISUALIZER</h3>
      <div className="viz-grid">
        {VIZ_TYPES.map(v => (
          <button
            key={v.id}
            className={`viz-btn${vizType === v.id ? ' active' : ''}`}
            onClick={() => onChange(v.id)}
          >
            <span className="viz-label">{v.label}</span>
            <span className="viz-desc">{v.desc}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
