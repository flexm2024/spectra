// src/renderers/circular.ts — 원형 스펙트럼 렌더러
import type { RendererOptions } from '../types'
import { makeFreqBands } from './utils'
import { BAND_COUNT } from '../constants'

export function renderCircular({ ctx, freqData, colors, width, height }: RendererOptions): void {
  const bands  = makeFreqBands(freqData, BAND_COUNT)
  const cx     = width / 2
  const cy     = height / 2
  const baseR  = Math.min(width, height) * 0.22

  // 내부 앰비언트 글로우
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 1.6)
  glow.addColorStop(0,   colors[0] + '2A')
  glow.addColorStop(0.6, colors[1] + '0A')
  glow.addColorStop(1,   'transparent')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(cx, cy, baseR * 1.6, 0, Math.PI * 2)
  ctx.fill()

  // 기준원
  ctx.strokeStyle = colors[0] + '30'
  ctx.lineWidth   = 1
  ctx.shadowBlur  = 0
  ctx.beginPath()
  ctx.arc(cx, cy, baseR, 0, Math.PI * 2)
  ctx.stroke()

  // 주파수 막대 (방사형)
  ctx.lineCap = 'round'
  bands.forEach((f, i) => {
    const angle = (i / BAND_COUNT) * Math.PI * 2 - Math.PI / 2
    const len   = f * baseR * 1.05
    const ci    = Math.floor((i / BAND_COUNT) * colors.length) % colors.length

    ctx.strokeStyle = colors[ci]
    ctx.lineWidth   = Math.max(1.5, (width / BAND_COUNT) * 0.38)
    ctx.shadowBlur  = 14
    ctx.shadowColor = colors[ci]
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(angle) * (baseR + 2), cy + Math.sin(angle) * (baseR + 2))
    ctx.lineTo(cx + Math.cos(angle) * (baseR + 2 + len), cy + Math.sin(angle) * (baseR + 2 + len))
    ctx.stroke()
  })

  // 중앙 점
  ctx.fillStyle   = colors[0]
  ctx.shadowBlur  = 28
  ctx.shadowColor = colors[0]
  ctx.beginPath()
  ctx.arc(cx, cy, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0
}
