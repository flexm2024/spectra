// src/tests/renderers/overlay.test.ts — 오버레이 렌더 함수 단위 테스트
import { describe, it, expect, vi } from 'vitest'
import { drawBackground, drawLogo, drawStickers } from '../../renderers/overlay'
import type { OverlayConfig } from '../../types'

function makeCtx() {
  const grad = { addColorStop: vi.fn() }
  return {
    save:                 vi.fn(),
    restore:              vi.fn(),
    fillRect:             vi.fn(),
    drawImage:            vi.fn(),
    createLinearGradient: vi.fn(() => grad),
    createRadialGradient: vi.fn(() => grad),
    fillStyle:            '' as string | CanvasGradient,
    globalAlpha:          1,
  } as unknown as CanvasRenderingContext2D
}

const base: OverlayConfig = {
  bgType:       'none',
  bgImage:      null,
  bgGradient:   ['#000011', '#110000'],
  bgSceneIndex: 0,
  logo:         null,
  stickers:     [],
}

describe('drawBackground', () => {
  it('bgType none: 검정 fillRect 호출', () => {
    const ctx = makeCtx()
    drawBackground(ctx, base, 1920, 1080)
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1920, 1080)
  })

  it('bgType none + colors: 방사형 그라디언트 추가 호출', () => {
    const ctx = makeCtx()
    drawBackground(ctx, base, 1920, 1080, ['#7C5CFC', '#00D4FF', '#FF006E'])
    expect(ctx.createRadialGradient).toHaveBeenCalled()
  })

  it('bgType image + bgImage: drawImage 호출', () => {
    const ctx = makeCtx()
    const img = {} as ImageBitmap
    drawBackground(ctx, { ...base, bgType: 'image', bgImage: img }, 1920, 1080)
    expect(ctx.drawImage).toHaveBeenCalledWith(img, 0, 0, 1920, 1080)
  })

  it('bgType image + bgImage null: fillRect 폴백', () => {
    const ctx = makeCtx()
    drawBackground(ctx, { ...base, bgType: 'image', bgImage: null }, 1920, 1080)
    expect(ctx.drawImage).not.toHaveBeenCalled()
    expect(ctx.fillRect).toHaveBeenCalled()
  })

  it('bgType gradient: createLinearGradient 호출', () => {
    const ctx = makeCtx()
    drawBackground(ctx, { ...base, bgType: 'gradient' }, 1920, 1080)
    expect(ctx.createLinearGradient).toHaveBeenCalledWith(0, 0, 0, 1080)
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1920, 1080)
  })

  it('bgType scene: createLinearGradient 호출', () => {
    const ctx = makeCtx()
    drawBackground(ctx, { ...base, bgType: 'scene', bgSceneIndex: 1 }, 1920, 1080)
    expect(ctx.createLinearGradient).toHaveBeenCalledWith(0, 0, 0, 1080)
  })
})

describe('drawLogo', () => {
  it('logo null이면 drawImage 미호출', () => {
    const ctx = makeCtx()
    drawLogo(ctx, null, 1920, 1080)
    expect(ctx.drawImage).not.toHaveBeenCalled()
  })

  it('logo 있으면 우하단(1824, 984, 80, 80)에 렌더', () => {
    const ctx = makeCtx()
    const logo = {} as ImageBitmap
    drawLogo(ctx, logo, 1920, 1080)
    // size=80, margin=16 → x=1920-80-16=1824, y=1080-80-16=984
    expect(ctx.drawImage).toHaveBeenCalledWith(logo, 1824, 984, 80, 80)
  })
})

describe('drawStickers', () => {
  it('stickers 빈 배열이면 drawImage 미호출', () => {
    const ctx = makeCtx()
    drawStickers(ctx, [])
    expect(ctx.drawImage).not.toHaveBeenCalled()
  })

  it('첫 번째 스티커: (16, 16, 64, 64)', () => {
    const ctx = makeCtx()
    drawStickers(ctx, [{} as ImageBitmap])
    expect(ctx.drawImage).toHaveBeenCalledWith({}, 16, 16, 64, 64)
  })

  it('두 번째 스티커: (88, 16, 64, 64) — x = 16 + 64 + 8', () => {
    const ctx = makeCtx()
    const s1 = { id: 1 } as unknown as ImageBitmap
    const s2 = { id: 2 } as unknown as ImageBitmap
    drawStickers(ctx, [s1, s2])
    expect(ctx.drawImage).toHaveBeenCalledWith(s2, 88, 16, 64, 64)
  })
})
