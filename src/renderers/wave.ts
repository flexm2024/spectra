// src/renderers/wave.ts — 파형 렌더러
import type { RendererOptions } from '../types'

interface WaveLayer {
  phaseOffset: number
  alpha:       number
  lineWidth:   number
  shadowBlur:  number
  colorIndex:  number
}

const LAYERS: WaveLayer[] = [
  { phaseOffset: 0,              alpha: 1,    lineWidth: 2.5, shadowBlur: 18, colorIndex: 0 },
  { phaseOffset: Math.PI * 0.33, alpha: 0.45, lineWidth: 1.5, shadowBlur: 0,  colorIndex: 1 },
  { phaseOffset: Math.PI * 0.66, alpha: 0.22, lineWidth: 1,   shadowBlur: 0,  colorIndex: 2 },
]

export function renderWave({
  ctx, timeData, freqData, colors, width, height, time,
}: RendererOptions): void {
  let totalEnergy = 0
  for (let i = 0; i < freqData.length; i++) totalEnergy += freqData[i]
  const energy = Math.min(1, (totalEnergy / freqData.length) / 128)

  const samples = 320

  LAYERS.forEach(({ phaseOffset, alpha, lineWidth, shadowBlur, colorIndex }) => {
    ctx.beginPath()
    ctx.lineWidth   = lineWidth
    ctx.strokeStyle = colors[colorIndex]
    ctx.globalAlpha = alpha
    ctx.shadowBlur  = shadowBlur
    ctx.shadowColor = colors[colorIndex]

    for (let i = 0; i <= samples; i++) {
      const xi      = i / samples
      const x       = xi * width
      const tdIdx   = Math.floor(xi * timeData.length)
      const tdVal   = (timeData[tdIdx] ?? 128) / 128 - 1
      const amp     = height * 0.28 * (0.4 + energy * 0.6)
      const wave    = Math.sin(xi * Math.PI * 7 + time * 2.1 + phaseOffset)
      const wave2   = Math.sin(xi * Math.PI * 3.5 + time * 1.3 + phaseOffset * 1.4)
      const y       = height / 2 + (tdVal * amp * 0.6 + wave * amp * 0.3 + wave2 * amp * 0.1)

      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.stroke()
  })

  ctx.globalAlpha = 1
  ctx.shadowBlur  = 0

  // 중앙 참조선
  ctx.strokeStyle = colors[0] + '18'
  ctx.lineWidth   = 1
  ctx.beginPath()
  ctx.moveTo(0, height / 2)
  ctx.lineTo(width, height / 2)
  ctx.stroke()
}
