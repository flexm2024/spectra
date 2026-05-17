// 주파수 막대 렌더러
import type { RendererOptions } from '../types'
import { makeFreqBands } from './utils'
import { BAND_COUNT } from '../constants'

export function renderBars({ ctx, freqData, colors, width, height }: RendererOptions): void {
  const bands = makeFreqBands(freqData, BAND_COUNT)
  const slotW = width / BAND_COUNT
  const barW  = slotW * 0.62

  bands.forEach((f, i) => {
    const barH = Math.max(2, f * height * 0.74)
    const x    = i * slotW + slotW * 0.19
    const y    = height - barH

    const grad = ctx.createLinearGradient(0, y, 0, height)
    grad.addColorStop(0,    colors[0] + 'FF')
    grad.addColorStop(0.45, colors[1] + 'BB')
    grad.addColorStop(1,    colors[2] + '22')

    ctx.shadowBlur  = 18
    ctx.shadowColor = colors[0] + '66'
    ctx.fillStyle   = grad
    ctx.beginPath()
    ctx.roundRect(x, y, barW, barH, 2)
    ctx.fill()

    // 상단 발광 캡
    ctx.shadowBlur  = 10
    ctx.shadowColor = colors[0]
    ctx.fillStyle   = '#ffffff99'
    ctx.fillRect(x, y, barW, 1.5)

    // 하단 반사
    ctx.save()
    ctx.globalAlpha = 0.07
    ctx.shadowBlur  = 0
    ctx.fillStyle   = grad
    ctx.scale(1, -1)
    ctx.beginPath()
    ctx.roundRect(x, -height, barW, barH * 0.3, 2)
    ctx.fill()
    ctx.restore()
  })

  ctx.shadowBlur = 0
}
