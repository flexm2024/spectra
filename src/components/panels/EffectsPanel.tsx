// src/components/panels/EffectsPanel.tsx — 이펙트 온/오프 토글
import type { EffectsConfig } from '../../types'

const EFFECTS: { id: keyof EffectsConfig; label: string }[] = [
  { id: 'beatPulse',  label: '비트 펄스' },
  { id: 'filmGrain',  label: '필름 그레인' },
  { id: 'chromatic',  label: '색수차' },
  { id: 'bassRipple', label: '베이스 파동' },
]

interface Props {
  effects:  EffectsConfig
  onChange: (effects: EffectsConfig) => void
}

export function EffectsPanel({ effects, onChange }: Props) {
  const toggle = (id: keyof EffectsConfig) =>
    onChange({ ...effects, [id]: !effects[id] })

  return (
    <section className="panel">
      <h3 className="panel-label">EFFECTS</h3>
      <div className="effects-list">
        {EFFECTS.map(ef => (
          <div key={ef.id} className="effect-row">
            <span className="effect-name">{ef.label}</span>
            <input
              type="checkbox"
              className="toggle"
              checked={effects[ef.id]}
              onChange={() => toggle(ef.id)}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
