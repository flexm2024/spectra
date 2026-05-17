// src/renderers/effects.ts — 후처리 이펙트
import type { EffectsConfig } from '../types'
import { bassEnergy, makeFreqBands } from './utils'
import { BAND_COUNT } from '../constants'

export function applyEffects(
  ctx:      CanvasRenderingContext2D,
  freqData: Uint8Array,
  effects:  EffectsConfig,
  width:    number,
  height:   number,
  time:     number,
): void {
  const bands = makeFreqBands(freqData, BAND_COUNT)
  const bass  = bassEnergy(bands)

  if (effects.beatPulse && bass > 0.5) {
    const alpha = (bass - 0.5) * 0.18
    ctx.fillStyle   = `rgba(255,255,255,${alpha})`
    ctx.globalAlpha = 1
    ctx.fillRect(0, 0, width, height)
  }

  if (effects.bassRipple && bass > 0.45) {
    const cx     = width / 2
    const cy     = height / 2
    const maxR   = Math.min(width, height) * 0.45
    const phase  = time * 3
    const rings  = 3

    for (let r = 0; r < rings; r++) {
      const progress = ((phase + r / rings) % 1)
      const radius   = progress * maxR
      const alpha    = (1 - progress) * bass * 0.3

      ctx.strokeStyle = `rgba(124,92,252,${alpha})`
      ctx.lineWidth   = 1.5
      ctx.shadowBlur  = 0
      ctx.globalAlpha = 1
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  if (effects.filmGrain) {
    const imgData = ctx.createImageData(width, height)
    for (let i = 0; i < imgData.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 30
      imgData.data[i]     = 128 + n
      imgData.data[i + 1] = 128 + n
      imgData.data[i + 2] = 128 + n
      imgData.data[i + 3] = 16
    }
    ctx.putImageData(imgData, 0, 0)
  }

  if (effects.chromatic) {
    const shift   = Math.floor(bass * 4) + 1
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.globalAlpha = 0.06
    ctx.drawImage(ctx.canvas, shift, 0)
    ctx.globalAlpha = 0.04
    ctx.drawImage(ctx.canvas, -shift, 0)
    ctx.restore()
  }
}
