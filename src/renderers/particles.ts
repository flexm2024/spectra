// src/renderers/particles.ts — 파티클 렌더러
import type { RendererOptions } from '../types'
import { makeFreqBands } from './utils'
import { BAND_COUNT } from '../constants'

const PARTICLE_COUNT = 200
const GOLDEN_ANGLE   = 2.39996

export function renderParticles({
  ctx, freqData, colors, width, height, time,
}: RendererOptions): void {
  const bands = makeFreqBands(freqData, BAND_COUNT)
  const maxR  = Math.min(width, height) * 0.4

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const f      = bands[i % BAND_COUNT]
    const r      = Math.sqrt(i / PARTICLE_COUNT) * maxR * (0.45 + f * 0.55)
    const angle  = i * GOLDEN_ANGLE + time * (0.18 + (i % 7) * 0.025)
    const px     = width  / 2 + Math.cos(angle) * r
    const py     = height / 2 + Math.sin(angle) * r
    const size   = f * 3.5 + 0.8
    const ci     = i % colors.length

    ctx.fillStyle   = colors[ci]
    ctx.shadowBlur  = 10
    ctx.shadowColor = colors[ci]
    ctx.globalAlpha = 0.65 + f * 0.35
    ctx.beginPath()
    ctx.arc(px, py, size, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.globalAlpha = 1
  ctx.shadowBlur  = 0
}
