// src/renderers/overlay.ts — 배경/로고/스티커 오버레이 렌더 함수
import type { OverlayConfig } from '../types'
import { BG_SCENES } from '../constants'

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

export function drawBackground(
  ctx: Ctx,
  overlay: OverlayConfig,
  width: number,
  height: number,
  colors?: [string, string, string],
): void {
  ctx.save()
  switch (overlay.bgType) {
    case 'image':
      if (overlay.bgImage) {
        ctx.drawImage(overlay.bgImage, 0, 0, width, height)
      } else {
        ctx.fillStyle = '#07070f'
        ctx.fillRect(0, 0, width, height)
      }
      break
    case 'gradient': {
      const grad = ctx.createLinearGradient(0, 0, 0, height)
      grad.addColorStop(0, overlay.bgGradient[0])
      grad.addColorStop(1, overlay.bgGradient[1])
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, width, height)
      break
    }
    case 'scene': {
      const scene = BG_SCENES[overlay.bgSceneIndex] ?? BG_SCENES[0]
      const grad = ctx.createLinearGradient(0, 0, 0, height)
      grad.addColorStop(0, scene.colors[0])
      grad.addColorStop(1, scene.colors[1])
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, width, height)
      break
    }
    default: {
      ctx.fillStyle = '#07070f'
      ctx.fillRect(0, 0, width, height)
      if (colors) {
        const bg = ctx.createRadialGradient(
          width * 0.5, height * 0.45, 0,
          width * 0.5, height * 0.45, width * 0.65,
        )
        bg.addColorStop(0, colors[0] + '14')
        bg.addColorStop(1, 'transparent')
        ctx.fillStyle = bg
        ctx.fillRect(0, 0, width, height)
      }
    }
  }
  ctx.restore()
}

export function drawLogo(
  ctx: Ctx,
  logo: ImageBitmap | null,
  width: number,
  height: number,
): void {
  if (!logo) return
  const size   = 80
  const margin = 16
  ctx.save()
  ctx.globalAlpha = 0.85
  ctx.drawImage(logo, width - size - margin, height - size - margin, size, size)
  ctx.restore()
}

export function drawStickers(ctx: Ctx, stickers: ImageBitmap[]): void {
  if (stickers.length === 0) return
  const size   = 64
  const gap    = 8
  const margin = 16
  ctx.save()
  stickers.forEach((sticker, i) => {
    ctx.drawImage(sticker, margin + i * (size + gap), margin, size, size)
  })
  ctx.restore()
}
