# SPECTRA Overlay & Export 기능 추가 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 SPECTRA v1.0에 배경/로고/스티커 오버레이, 재생횟수, 오디오품질, 렌더링 프로파일 6개 기능을 추가한다.

**Architecture:** OverlayConfig 타입 하나로 배경/로고/스티커를 묶어 preview loop(useVisualizerLoop)와 export worker(encoder.worker) 양쪽에 동일하게 전달한다. 렌더 순서: 배경 → 비주얼라이저 → 로고 → 스티커. 새 렌더 함수는 `src/renderers/overlay.ts`에 분리한다.

**Tech Stack:** React 19, TypeScript 5.6, Canvas 2D, OffscreenCanvas, ImageBitmap (Transferable), WebCodecs, Vitest

---

## 파일 맵

| 작업 | 파일 |
|------|------|
| 신규 | `src/renderers/overlay.ts` |
| 신규 | `src/tests/renderers/overlay.test.ts` |
| 신규 | `src/components/panels/BackgroundPanel.tsx` |
| 신규 | `src/components/panels/LogoStickerPanel.tsx` |
| 수정 | `src/types.ts` — OverlayConfig, BgType 추가, ExportConfig/WorkerStartMessage 확장 |
| 수정 | `src/constants.ts` — BITRATE_PROFILES, BG_SCENES, DEFAULT_OVERLAY 추가 |
| 수정 | `src/components/panels/ExportPanel.tsx` — 프로파일 버튼, 재생횟수, 오디오품질 |
| 수정 | `src/components/Sidebar.tsx` — 새 패널 2개 추가 |
| 수정 | `src/App.tsx` — overlayConfig 상태 추가 |
| 수정 | `src/hooks/useVisualizerLoop.ts` — overlayConfig 파라미터, 오버레이 렌더 호출 |
| 수정 | `src/hooks/useExport.ts` — overlay + 새 export 필드 worker 전달 |
| 수정 | `src/workers/encoder.worker.ts` — loopCount, audioBitrateK, 오버레이 렌더 |

---

## Task 1: Types & Constants 기반 구축

**Files:**
- Modify: `src/types.ts`
- Modify: `src/constants.ts`

- [ ] **Step 1: types.ts에 OverlayConfig, BgType 추가 및 ExportConfig 확장**

`src/types.ts` 전체를 아래로 교체:

```ts
// src/types.ts — 앱 전역 공통 타입
export type VizType = 'bars' | 'circular' | 'wave' | 'particles'

export interface ColorPreset {
  name:   string
  colors: [string, string, string]
}

export interface EffectsConfig {
  beatPulse:  boolean
  filmGrain:  boolean
  chromatic:  boolean
  bassRipple: boolean
}

export type ExportResolution = '3840x2160' | '1920x1080' | '1280x720'

export interface ExportConfig {
  resolution:    ExportResolution
  bitrateM:      number
  loopCount:     1 | 2 | 3
  audioBitrateK: 96 | 128 | 192
}

export type ExportStatus = 'idle' | 'encoding' | 'done' | 'error'

export type BgType = 'none' | 'image' | 'gradient' | 'scene'

export interface OverlayConfig {
  bgType:       BgType
  bgImage:      ImageBitmap | null
  bgGradient:   [string, string]
  bgSceneIndex: number
  logo:         ImageBitmap | null
  stickers:     ImageBitmap[]
}

export interface RendererOptions {
  ctx:      CanvasRenderingContext2D
  freqData: Uint8Array
  timeData: Uint8Array
  colors:   [string, string, string]
  width:    number
  height:   number
  time:     number
}

export interface WorkerStartMessage {
  type:              'start'
  audioBuffer:       ArrayBuffer
  sampleRate:        number
  numberOfChannels:  number
  duration:          number
  vizType:           VizType
  colorPresetIndex:  number
  effects:           EffectsConfig
  width:             number
  height:            number
  bitrateM:          number
  fps:               number
  loopCount:         number
  audioBitrateK:     number
  bgType:            BgType
  bgImage:           ImageBitmap | null
  bgGradient:        [string, string]
  bgSceneIndex:      number
  logo:              ImageBitmap | null
  stickers:          ImageBitmap[]
}

export interface WorkerProgressMessage {
  type:     'progress'
  progress: number
}

export interface WorkerDoneMessage {
  type:   'done'
  buffer: ArrayBuffer
}

export interface WorkerErrorMessage {
  type:  'error'
  error: string
}

export type WorkerOutMessage =
  | WorkerProgressMessage
  | WorkerDoneMessage
  | WorkerErrorMessage
```

- [ ] **Step 2: constants.ts에 BITRATE_PROFILES, BG_SCENES, DEFAULT_OVERLAY 추가**

`src/constants.ts` 상단 import에 `BgType, OverlayConfig` 추가, 파일 끝에 아래 상수 추가:

```ts
// src/constants.ts — 앱 전역 상수
import type { ColorPreset, VizType, ExportResolution, BgType, OverlayConfig } from './types'

export const COLOR_PRESETS: ColorPreset[] = [
  { name: 'NEBULA',  colors: ['#7C5CFC', '#00D4FF', '#FF006E'] },
  { name: 'INFERNO', colors: ['#FF4D00', '#FF8E00', '#FFE600'] },
  { name: 'AURORA',  colors: ['#00FFB9', '#00D4FF', '#7C5CFC'] },
  { name: 'LUNAR',   colors: ['#CCCCFF', '#8888CC', '#444488'] },
  { name: 'SOLAR',   colors: ['#FFE600', '#FF8E53', '#FF3366'] },
]

export const VIZ_TYPES: { id: VizType; label: string; desc: string }[] = [
  { id: 'bars',      label: 'BARS',     desc: '주파수 바' },
  { id: 'circular',  label: 'CIRCLE',   desc: '원형 스펙트럼' },
  { id: 'wave',      label: 'WAVE',     desc: '파형' },
  { id: 'particles', label: 'PARTICLE', desc: '파티클' },
]

export const RESOLUTIONS: { label: string; value: ExportResolution; w: number; h: number }[] = [
  { label: '3840×2160 (4K)',  value: '3840x2160', w: 3840, h: 2160 },
  { label: '1920×1080 (FHD)', value: '1920x1080', w: 1920, h: 1080 },
  { label: '1280×720 (HD)',   value: '1280x720',  w: 1280, h: 720  },
]

export const BITRATE_PROFILES: { label: string; bitrateM: number }[] = [
  { label: '품질', bitrateM: 16 },
  { label: '균형', bitrateM: 8  },
  { label: '속도', bitrateM: 6  },
]

export const BG_SCENES: { name: string; colors: [string, string] }[] = [
  { name: 'DEEP SPACE', colors: ['#0a0a1a', '#1a0a2e'] },
  { name: 'MIDNIGHT',   colors: ['#0d0d0d', '#1a1a2e'] },
  { name: 'FOREST',     colors: ['#0a1a0a', '#0d2b0d'] },
  { name: 'OCEAN',      colors: ['#0a0a2e', '#001a3a'] },
  { name: 'SUNSET',     colors: ['#1a0a00', '#2e1a00'] },
  { name: 'ROSE',       colors: ['#1a0a0a', '#2e0a1a'] },
]

export const DEFAULT_EFFECTS: import('./types').EffectsConfig = {
  beatPulse:  true,
  filmGrain:  false,
  chromatic:  false,
  bassRipple: true,
}

export const DEFAULT_OVERLAY: OverlayConfig = {
  bgType:       'none',
  bgImage:      null,
  bgGradient:   ['#0a0a1a', '#1a0a2e'],
  bgSceneIndex: 0,
  logo:         null,
  stickers:     [],
}

export const FFT_SIZE = 2048
export const BAND_COUNT = 72
export const FPS = 30
```

- [ ] **Step 3: 빌드 타입 오류 확인**

```bash
cd C:\claudecode\port_app && npx tsc --noEmit
```

오류 없으면 다음 단계. `bitrateM` 관련 타입 오류가 있으면 `ExportConfig.bitrateM`이 `number`인지 확인.

- [ ] **Step 4: 커밋**

```bash
git add src/types.ts src/constants.ts
git commit -m "feat: add OverlayConfig type and export config fields"
```

---

## Task 2: overlay.ts 렌더러 TDD

**Files:**
- Create: `src/renderers/overlay.ts`
- Create: `src/tests/renderers/overlay.test.ts`

- [ ] **Step 1: 테스트 파일 작성**

`src/tests/renderers/overlay.test.ts` 신규 생성:

```ts
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
```

- [ ] **Step 2: 테스트 실행해 FAIL 확인**

```bash
cd C:\claudecode\port_app && npx vitest run src/tests/renderers/overlay.test.ts
```

Expected: `FAIL — Cannot find module '../../renderers/overlay'`

- [ ] **Step 3: overlay.ts 구현**

`src/renderers/overlay.ts` 신규 생성:

```ts
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
```

- [ ] **Step 4: 테스트 실행해 PASS 확인**

```bash
npx vitest run src/tests/renderers/overlay.test.ts
```

Expected: `9 tests | 9 passed`

- [ ] **Step 5: 전체 테스트 통과 확인**

```bash
npx vitest run
```

Expected: `18 tests | 18 passed` (기존 9 + 신규 9)

- [ ] **Step 6: 커밋**

```bash
git add src/renderers/overlay.ts src/tests/renderers/overlay.test.ts
git commit -m "feat: add overlay renderer (drawBackground, drawLogo, drawStickers) with tests"
```

---

## Task 3: BackgroundPanel 컴포넌트

**Files:**
- Create: `src/components/panels/BackgroundPanel.tsx`

- [ ] **Step 1: BackgroundPanel.tsx 생성**

```tsx
// src/components/panels/BackgroundPanel.tsx — 배경 설정 패널
import { useState } from 'react'
import type { OverlayConfig, BgType } from '../../types'
import { BG_SCENES } from '../../constants'

interface Props {
  overlay:   OverlayConfig
  onChange:  (o: OverlayConfig) => void
}

const TABS: { id: BgType; label: string }[] = [
  { id: 'none',     label: '없음'      },
  { id: 'image',    label: '미디어'    },
  { id: 'gradient', label: '그라디언트' },
  { id: 'scene',    label: '씬'        },
]

export function BackgroundPanel({ overlay, onChange }: Props) {
  const [isDragging, setIsDragging] = useState(false)

  const setTab = (bgType: BgType) => onChange({ ...overlay, bgType })

  const loadImageFile = async (file: File) => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) return
    let bitmap: ImageBitmap
    if (file.type.startsWith('video/')) {
      const video = document.createElement('video')
      video.src = URL.createObjectURL(file)
      await new Promise<void>(res => { video.onloadeddata = () => res() })
      video.currentTime = 0
      await new Promise<void>(res => { video.onseeked = () => res() })
      bitmap = await createImageBitmap(video)
      URL.revokeObjectURL(video.src)
    } else {
      bitmap = await createImageBitmap(file)
    }
    onChange({ ...overlay, bgType: 'image', bgImage: bitmap })
  }

  const openPicker = () => {
    const inp = document.createElement('input')
    inp.type   = 'file'
    inp.accept = 'image/*,video/mp4'
    inp.onchange = e => {
      const f = (e.target as HTMLInputElement).files?.[0]
      if (f) loadImageFile(f)
    }
    inp.click()
  }

  return (
    <section className="panel">
      <h3 className="panel-label">배경</h3>

      <div className="tab-row">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`tab-btn${overlay.bgType === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {overlay.bgType === 'image' && (
        <div
          className={`dropzone small${isDragging ? ' dragover' : ''}`}
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => {
            e.preventDefault(); setIsDragging(false)
            const f = e.dataTransfer.files[0]; if (f) loadImageFile(f)
          }}
          onClick={openPicker}
        >
          {overlay.bgImage ? (
            <span className="file-hint">배경 로드됨 — 클릭하여 변경</span>
          ) : (
            <span className="drop-text">이미지 / MP4 드롭</span>
          )}
        </div>
      )}

      {overlay.bgType === 'gradient' && (
        <div className="gradient-row">
          <label className="setting-label">시작</label>
          <input
            type="color"
            value={overlay.bgGradient[0]}
            onChange={e => onChange({ ...overlay, bgGradient: [e.target.value, overlay.bgGradient[1]] })}
          />
          <label className="setting-label">끝</label>
          <input
            type="color"
            value={overlay.bgGradient[1]}
            onChange={e => onChange({ ...overlay, bgGradient: [overlay.bgGradient[0], e.target.value] })}
          />
        </div>
      )}

      {overlay.bgType === 'scene' && (
        <div className="scene-grid">
          {BG_SCENES.map((scene, i) => (
            <button
              key={scene.name}
              className={`scene-card${overlay.bgSceneIndex === i ? ' active' : ''}`}
              style={{ background: `linear-gradient(135deg, ${scene.colors[0]}, ${scene.colors[1]})` }}
              onClick={() => onChange({ ...overlay, bgSceneIndex: i })}
            >
              <span className="scene-name">{scene.name}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 2: 빌드 오류 확인**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 커밋**

```bash
git add src/components/panels/BackgroundPanel.tsx
git commit -m "feat: add BackgroundPanel component"
```

---

## Task 4: LogoStickerPanel 컴포넌트

**Files:**
- Create: `src/components/panels/LogoStickerPanel.tsx`

- [ ] **Step 1: LogoStickerPanel.tsx 생성**

```tsx
// src/components/panels/LogoStickerPanel.tsx — 로고/스티커 업로드 패널
import type { OverlayConfig } from '../../types'

interface Props {
  overlay:  OverlayConfig
  onChange: (o: OverlayConfig) => void
}

async function fileToImageBitmap(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file)
}

function openImagePicker(onFile: (f: File) => void) {
  const inp = document.createElement('input')
  inp.type   = 'file'
  inp.accept = 'image/png,image/jpeg,image/webp'
  inp.onchange = e => {
    const f = (e.target as HTMLInputElement).files?.[0]
    if (f) onFile(f)
  }
  inp.click()
}

export function LogoStickerPanel({ overlay, onChange }: Props) {
  const handleLogoLoad = async (file: File) => {
    const bitmap = await fileToImageBitmap(file)
    onChange({ ...overlay, logo: bitmap })
  }

  const handleStickerLoad = async (file: File, index: number) => {
    const bitmap = await fileToImageBitmap(file)
    const next = [...overlay.stickers]
    next[index] = bitmap
    onChange({ ...overlay, stickers: next })
  }

  const removeLogo = () => onChange({ ...overlay, logo: null })

  const removeSticker = (index: number) => {
    const next = overlay.stickers.filter((_, i) => i !== index)
    onChange({ ...overlay, stickers: next })
  }

  return (
    <section className="panel">
      <h3 className="panel-label">로고 / 스티커</h3>

      <div className="overlay-row">
        <span className="setting-label">채널 로고</span>
        {overlay.logo ? (
          <button className="remove-btn" onClick={removeLogo}>삭제</button>
        ) : (
          <button
            className="upload-btn"
            onClick={() => openImagePicker(handleLogoLoad)}
          >
            업로드
          </button>
        )}
        {overlay.logo && <span className="loaded-badge">로드됨</span>}
      </div>

      <div className="setting-label" style={{ marginTop: '8px' }}>
        스티커 (최대 5개)
      </div>
      <div className="sticker-slots">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="sticker-slot">
            {overlay.stickers[i] ? (
              <button className="sticker-remove" onClick={() => removeSticker(i)}>✕</button>
            ) : (
              <button
                className="sticker-add"
                onClick={() => openImagePicker(f => handleStickerLoad(f, i))}
              >
                +
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: 빌드 오류 확인**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 커밋**

```bash
git add src/components/panels/LogoStickerPanel.tsx
git commit -m "feat: add LogoStickerPanel component"
```

---

## Task 5: ExportPanel UI 업데이트

**Files:**
- Modify: `src/components/panels/ExportPanel.tsx`

- [ ] **Step 1: ExportPanel.tsx 전체 교체**

```tsx
// src/components/panels/ExportPanel.tsx — MP4 내보내기 설정
import type { ExportConfig, ExportStatus } from '../../types'
import { RESOLUTIONS, BITRATE_PROFILES } from '../../constants'

interface Props {
  config:    ExportConfig
  status:    ExportStatus
  progress:  number
  hasFile:   boolean
  onChange:  (c: ExportConfig) => void
  onExport:  () => void
}

export function ExportPanel({ config, status, progress, hasFile, onChange, onExport }: Props) {
  const isEncoding = status === 'encoding'

  return (
    <section className="panel">
      <h3 className="panel-label">EXPORT</h3>

      <div className="export-field">
        <label className="setting-label">RESOLUTION</label>
        <select
          className="setting-select"
          value={config.resolution}
          disabled={isEncoding}
          onChange={e => onChange({ ...config, resolution: e.target.value as ExportConfig['resolution'] })}
        >
          {RESOLUTIONS.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      <div className="export-field">
        <label className="setting-label">렌더링 프로파일</label>
        <div className="btn-group">
          {BITRATE_PROFILES.map(p => (
            <button
              key={p.bitrateM}
              className={`profile-btn${config.bitrateM === p.bitrateM ? ' active' : ''}`}
              disabled={isEncoding}
              onClick={() => onChange({ ...config, bitrateM: p.bitrateM })}
            >
              {p.label}
              <span className="profile-sub">{p.bitrateM}M</span>
            </button>
          ))}
        </div>
      </div>

      <div className="export-field">
        <label className="setting-label">재생 횟수</label>
        <div className="btn-group">
          {([1, 2, 3] as const).map(n => (
            <button
              key={n}
              className={`profile-btn${config.loopCount === n ? ' active' : ''}`}
              disabled={isEncoding}
              onClick={() => onChange({ ...config, loopCount: n })}
            >
              {n}회
            </button>
          ))}
        </div>
      </div>

      <div className="export-field">
        <label className="setting-label">오디오 품질</label>
        <div className="btn-group">
          {([96, 128, 192] as const).map(k => (
            <button
              key={k}
              className={`profile-btn${config.audioBitrateK === k ? ' active' : ''}`}
              disabled={isEncoding}
              onClick={() => onChange({ ...config, audioBitrateK: k })}
            >
              {k}k
            </button>
          ))}
        </div>
      </div>

      {isEncoding && (
        <div className="export-progress">
          <div className="export-progress-fill" style={{ width: `${progress * 100}%` }} />
          <span className="export-progress-text">{Math.round(progress * 100)}%</span>
        </div>
      )}

      <button
        className="export-btn"
        disabled={!hasFile || isEncoding}
        onClick={onExport}
      >
        {isEncoding ? '⏳ ENCODING...' : '⬇ EXPORT MP4'}
      </button>
    </section>
  )
}
```

- [ ] **Step 2: 빌드 오류 확인**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 커밋**

```bash
git add src/components/panels/ExportPanel.tsx
git commit -m "feat: update ExportPanel with bitrate profiles, loop count, audio quality"
```

---

## Task 6: Sidebar + App.tsx 연결

**Files:**
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Sidebar.tsx 전체 교체**

```tsx
// src/components/Sidebar.tsx — 패널 7개 조합 컨테이너
import type { VizType, EffectsConfig, ExportConfig, ExportStatus, OverlayConfig } from '../types'
import { AudioPanel }        from './panels/AudioPanel'
import { VisualizerPanel }   from './panels/VisualizerPanel'
import { ColorPanel }        from './panels/ColorPanel'
import { EffectsPanel }      from './panels/EffectsPanel'
import { BackgroundPanel }   from './panels/BackgroundPanel'
import { LogoStickerPanel }  from './panels/LogoStickerPanel'
import { ExportPanel }       from './panels/ExportPanel'

interface Props {
  fileName:       string
  vizType:        VizType
  colorPreset:    number
  effects:        EffectsConfig
  overlay:        OverlayConfig
  exportConfig:   ExportConfig
  exportStatus:   ExportStatus
  exportProgress: number
  onFileLoad:     (file: File) => Promise<void>
  onVizType:      (v: VizType) => void
  onColorPreset:  (i: number) => void
  onEffects:      (e: EffectsConfig) => void
  onOverlay:      (o: OverlayConfig) => void
  onExportConfig: (c: ExportConfig) => void
  onExport:       () => void
}

export function Sidebar(props: Props) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-icon">◈</span>
        <span className="brand-name">SPECTRA</span>
        <span className="brand-version">v2.0</span>
      </div>
      <AudioPanel      fileName={props.fileName}      onFileLoad={props.onFileLoad} />
      <BackgroundPanel overlay={props.overlay}        onChange={props.onOverlay} />
      <LogoStickerPanel overlay={props.overlay}       onChange={props.onOverlay} />
      <VisualizerPanel vizType={props.vizType}        onChange={props.onVizType} />
      <ColorPanel      preset={props.colorPreset}     onChange={props.onColorPreset} />
      <EffectsPanel    effects={props.effects}        onChange={props.onEffects} />
      <ExportPanel
        config={props.exportConfig}
        status={props.exportStatus}
        progress={props.exportProgress}
        hasFile={!!props.fileName}
        onChange={props.onExportConfig}
        onExport={props.onExport}
      />
    </aside>
  )
}
```

- [ ] **Step 2: App.tsx 전체 교체**

```tsx
// src/App.tsx — SPECTRA 앱 루트: 상태 관리 + 레이아웃
import { useState, useRef } from 'react'
import type { VizType, EffectsConfig, ExportConfig, OverlayConfig } from './types'
import { DEFAULT_EFFECTS, DEFAULT_OVERLAY } from './constants'
import { useAudioEngine }    from './hooks/useAudioEngine'
import { useVisualizerLoop } from './hooks/useVisualizerLoop'
import { useExport }         from './hooks/useExport'
import { Sidebar }           from './components/Sidebar'
import { CanvasPreview }     from './components/CanvasPreview'
import { Transport }         from './components/Transport'
import './App.css'

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const audio = useAudioEngine()

  const [fileName,     setFileName]     = useState('')
  const [vizType,      setVizType]      = useState<VizType>('bars')
  const [colorPreset,  setColorPreset]  = useState(0)
  const [effects,      setEffects]      = useState<EffectsConfig>(DEFAULT_EFFECTS)
  const [overlay,      setOverlay]      = useState<OverlayConfig>(DEFAULT_OVERLAY)
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    resolution:    '1920x1080',
    bitrateM:      8,
    loopCount:     1,
    audioBitrateK: 128,
  })

  const handleFileLoad = async (file: File) => {
    await audio.loadFile(file)
    setFileName(file.name)
  }

  const { status: exportStatus, progress: exportProgress, startExport } = useExport({
    audioBuffer:      audio.audioBuffer.current,
    vizType,
    colorPresetIndex: colorPreset,
    effects,
    overlay,
    exportConfig,
  })

  useVisualizerLoop({
    canvasRef,
    analyserRef: audio.analyser,
    vizType,
    colorPreset,
    effects,
    overlay,
    isPlaying: audio.isPlaying,
  })

  return (
    <div className="app">
      <Sidebar
        fileName={fileName}
        vizType={vizType}
        colorPreset={colorPreset}
        effects={effects}
        overlay={overlay}
        exportConfig={exportConfig}
        exportStatus={exportStatus}
        exportProgress={exportProgress}
        onFileLoad={handleFileLoad}
        onVizType={setVizType}
        onColorPreset={setColorPreset}
        onEffects={setEffects}
        onOverlay={setOverlay}
        onExportConfig={setExportConfig}
        onExport={startExport}
      />
      <main className="main">
        <CanvasPreview ref={canvasRef} hasFile={!!fileName} />
        <Transport
          isPlaying={audio.isPlaying}
          currentTime={audio.currentTime}
          duration={audio.duration}
          onPlay={audio.play}
          onPause={audio.pause}
          onSeek={audio.seek}
          onRestart={() => audio.seek(0)}
        />
      </main>
    </div>
  )
}
```

- [ ] **Step 3: 빌드 오류 확인**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: 커밋**

```bash
git add src/components/Sidebar.tsx src/App.tsx
git commit -m "feat: wire overlay state through Sidebar and App"
```

---

## Task 7: useVisualizerLoop 오버레이 통합

**Files:**
- Modify: `src/hooks/useVisualizerLoop.ts`

- [ ] **Step 1: useVisualizerLoop.ts 전체 교체**

기존 인라인 배경 렌더(clearRect + fillStyle + radialGradient)를 `drawBackground`로 교체하고, 비주얼라이저 뒤/앞에 로고/스티커 호출 추가:

```ts
// src/hooks/useVisualizerLoop.ts — rAF 루프, analyser → 렌더러 연결
import { useEffect, useRef } from 'react'
import type { VizType, EffectsConfig, OverlayConfig } from '../types'
import { COLOR_PRESETS, FFT_SIZE } from '../constants'
import { renderBars }      from '../renderers/bars'
import { renderCircular }  from '../renderers/circular'
import { renderWave }      from '../renderers/wave'
import { renderParticles } from '../renderers/particles'
import { applyEffects }    from '../renderers/effects'
import { drawBackground, drawLogo, drawStickers } from '../renderers/overlay'

interface Options {
  canvasRef:    React.RefObject<HTMLCanvasElement | null>
  analyserRef:  React.RefObject<AnalyserNode | null>
  vizType:      VizType
  colorPreset:  number
  effects:      EffectsConfig
  overlay:      OverlayConfig
  isPlaying:    boolean
}

export function useVisualizerLoop({
  canvasRef, analyserRef, vizType, colorPreset, effects, overlay, isPlaying,
}: Options): void {
  const animRef = useRef(0)
  const timeRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const colors = COLOR_PRESETS[colorPreset].colors
    const freqData = new Uint8Array(FFT_SIZE / 2)
    const timeData = new Uint8Array(FFT_SIZE)

    const demoFreq = (t: number) =>
      Uint8Array.from({ length: FFT_SIZE / 2 }, (_, i) => {
        const a = Math.sin(t * 2.1 + i * 0.28) * 0.38
        const b = Math.sin(t * 1.4 + i * 0.51) * 0.28
        const c = Math.sin(t * 3.7 + i * 0.14) * 0.14
        return Math.round(Math.max(10, Math.min(255, 128 + (a + b + c) * 128)))
      })

    const demoTime = (t: number) =>
      Uint8Array.from({ length: FFT_SIZE }, (_, i) =>
        Math.round(128 + Math.sin(i / FFT_SIZE * Math.PI * 4 + t * 3) * 60)
      )

    const syncSize = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    syncSize()
    const ro = new ResizeObserver(syncSize)
    ro.observe(canvas)

    const draw = () => {
      timeRef.current += isPlaying ? 0.038 : 0.008
      const t = timeRef.current
      const W = canvas.width
      const H = canvas.height

      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(freqData)
        analyserRef.current.getByteTimeDomainData(timeData)
      } else {
        freqData.set(demoFreq(t))
        timeData.set(demoTime(t))
      }

      drawBackground(ctx, overlay, W, H, colors)

      const opts = { ctx, freqData, timeData, colors, width: W, height: H, time: t }

      ctx.save()
      switch (vizType) {
        case 'bars':      renderBars(opts);      break
        case 'circular':  renderCircular(opts);  break
        case 'wave':      renderWave(opts);      break
        case 'particles': renderParticles(opts); break
      }
      ctx.restore()

      applyEffects(ctx, freqData, effects, W, H, t)

      drawLogo(ctx, overlay.logo, W, H)
      drawStickers(ctx, overlay.stickers)

      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(animRef.current)
      ro.disconnect()
    }
  }, [canvasRef, analyserRef, vizType, colorPreset, effects, overlay, isPlaying])
}
```

- [ ] **Step 2: 빌드 + 테스트 확인**

```bash
npx tsc --noEmit && npx vitest run
```

Expected: 타입 오류 없음, 18 tests passed

- [ ] **Step 3: 커밋**

```bash
git add src/hooks/useVisualizerLoop.ts
git commit -m "feat: integrate overlay rendering into visualizer loop"
```

---

## Task 8: useExport 신규 필드 전달

**Files:**
- Modify: `src/hooks/useExport.ts`

- [ ] **Step 1: useExport.ts 전체 교체**

overlay ImageBitmap을 전송 전 클론(createImageBitmap)해서 worker에 Transferable로 전달:

```ts
// src/hooks/useExport.ts — Worker 통신 + Blob 다운로드
import { useRef, useState, useCallback } from 'react'
import type { VizType, EffectsConfig, ExportConfig, ExportStatus, OverlayConfig, WorkerOutMessage, WorkerStartMessage } from '../types'
import { RESOLUTIONS, FPS } from '../constants'

interface Options {
  audioBuffer:      AudioBuffer | null
  vizType:          VizType
  colorPresetIndex: number
  effects:          EffectsConfig
  overlay:          OverlayConfig
  exportConfig:     ExportConfig
}

export interface ExportAPI {
  status:      ExportStatus
  progress:    number
  startExport: () => void
}

export function useExport({
  audioBuffer, vizType, colorPresetIndex, effects, overlay, exportConfig,
}: Options): ExportAPI {
  const workerRef = useRef<Worker | null>(null)
  const [status,   setStatus]   = useState<ExportStatus>('idle')
  const [progress, setProgress] = useState(0)

  const startExport = useCallback(async () => {
    if (!audioBuffer || status === 'encoding') return

    if (typeof VideoEncoder === 'undefined') {
      alert('이 브라우저는 WebCodecs를 지원하지 않습니다.\nChrome 94+ 또는 Edge 94+를 사용해주세요.')
      return
    }

    const res = RESOLUTIONS.find(r => r.value === exportConfig.resolution) ?? RESOLUTIONS[1]

    const { numberOfChannels, sampleRate, length: sampleLength, duration } = audioBuffer
    const rawPCM = new ArrayBuffer(numberOfChannels * sampleLength * 4)
    for (let ch = 0; ch < numberOfChannels; ch++) {
      const dst = new Float32Array(rawPCM, ch * sampleLength * 4, sampleLength)
      dst.set(audioBuffer.getChannelData(ch))
    }

    // ImageBitmap은 transfer 시 main thread에서 detach됨 → clone 후 전송
    const bgImage  = overlay.bgImage  ? await createImageBitmap(overlay.bgImage)  : null
    const logo     = overlay.logo     ? await createImageBitmap(overlay.logo)     : null
    const stickers = await Promise.all(overlay.stickers.map(s => createImageBitmap(s)))

    workerRef.current?.terminate()
    workerRef.current = new Worker(
      new URL('../workers/encoder.worker.ts', import.meta.url),
      { type: 'module' },
    )

    workerRef.current.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
      const msg = e.data
      if (msg.type === 'progress') {
        setProgress(msg.progress)
      } else if (msg.type === 'done') {
        setStatus('done')
        setProgress(1)
        const blob = new Blob([msg.buffer], { type: 'video/mp4' })
        const url  = URL.createObjectURL(blob)
        const a    = document.createElement('a')
        a.href     = url
        a.download = `spectra-${Date.now()}.mp4`
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 10_000)
      } else if (msg.type === 'error') {
        console.error('Export error:', msg.error)
        setStatus('error')
      }
    }

    const transferables: Transferable[] = [rawPCM]
    if (bgImage)  transferables.push(bgImage)
    if (logo)     transferables.push(logo)
    stickers.forEach(s => transferables.push(s))

    const msg: WorkerStartMessage = {
      type:             'start',
      audioBuffer:      rawPCM,
      sampleRate,
      numberOfChannels,
      duration,
      vizType,
      colorPresetIndex,
      effects,
      width:            res.w,
      height:           res.h,
      bitrateM:         exportConfig.bitrateM,
      fps:              FPS,
      loopCount:        exportConfig.loopCount,
      audioBitrateK:    exportConfig.audioBitrateK,
      bgType:           overlay.bgType,
      bgImage,
      bgGradient:       overlay.bgGradient,
      bgSceneIndex:     overlay.bgSceneIndex,
      logo,
      stickers,
    }
    workerRef.current.postMessage(msg, transferables)
    setStatus('encoding')
    setProgress(0)
  }, [audioBuffer, status, exportConfig, vizType, colorPresetIndex, effects, overlay])

  return { status, progress, startExport }
}
```

- [ ] **Step 2: App.tsx의 startExport 호출이 async임을 확인**

`useExport`의 `startExport`는 이제 `async` 함수다. `App.tsx`에서 `onExport={startExport}`로 넘겨지고 있으므로 추가 변경 없이 작동한다 (`Promise` 반환을 무시해도 됨).

- [ ] **Step 3: 빌드 + 테스트 확인**

```bash
npx tsc --noEmit && npx vitest run
```

- [ ] **Step 4: 커밋**

```bash
git add src/hooks/useExport.ts
git commit -m "feat: pass overlay and new export config to encoder worker"
```

---

## Task 9: encoder.worker 오버레이 + loopCount + audioBitrateK

**Files:**
- Modify: `src/workers/encoder.worker.ts`

- [ ] **Step 1: encoder.worker.ts 전체 교체**

loopCount 반복, audioBitrateK 적용, 오버레이 렌더 추가:

```ts
// src/workers/encoder.worker.ts — WebCodecs + mp4-muxer 오프라인 인코딩
import { Muxer, ArrayBufferTarget } from 'mp4-muxer'
import type { WorkerStartMessage, WorkerOutMessage, OverlayConfig } from '../types'
import { COLOR_PRESETS } from '../constants'
import { renderBars }      from '../renderers/bars'
import { renderCircular }  from '../renderers/circular'
import { renderWave }      from '../renderers/wave'
import { renderParticles } from '../renderers/particles'
import { applyEffects }    from '../renderers/effects'
import { drawBackground, drawLogo, drawStickers } from '../renderers/overlay'

function simulateFreqAtTime(
  channelData: Float32Array,
  sampleRate:  number,
  time:        number,
  fftSize:     number,
): Uint8Array {
  const start = Math.floor(time * sampleRate)
  const slice = channelData.slice(start, start + fftSize)
  const out = new Uint8Array(fftSize / 2)
  for (let i = 0; i < out.length; i++) {
    const amp = Math.abs(slice[i] ?? 0)
    out[i] = Math.min(255, Math.round(amp * 255 * 3))
  }
  return out
}

self.onmessage = async (e: MessageEvent<WorkerStartMessage>) => {
  const {
    audioBuffer: rawPCM, sampleRate, numberOfChannels, duration,
    vizType, colorPresetIndex, effects, width, height, bitrateM, fps,
    loopCount, audioBitrateK,
    bgType, bgImage, bgGradient, bgSceneIndex, logo, stickers,
  } = e.data

  const overlay: OverlayConfig = { bgType, bgImage, bgGradient, bgSceneIndex, logo, stickers }

  try {
    const bytesPerChannel = rawPCM.byteLength / numberOfChannels
    const samplesPerChannel = bytesPerChannel / 4
    const channels: Float32Array[] = Array.from({ length: numberOfChannels }, (_, ch) =>
      new Float32Array(rawPCM, ch * bytesPerChannel, samplesPerChannel)
    )
    const ch0 = channels[0]

    const totalDuration = duration * loopCount
    const muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: { codec: 'avc', width, height },
      audio: { codec: 'aac', sampleRate, numberOfChannels },
      fastStart: 'in-memory',
    })

    const videoEncoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta ?? {}),
      error:  (err) => { throw err },
    })
    videoEncoder.configure({
      codec:     'avc1.42001f',
      width,     height,
      bitrate:   bitrateM * 1_000_000,
      framerate: fps,
    })

    const audioEncoder = new AudioEncoder({
      output: (chunk, meta) => muxer.addAudioChunk(chunk, meta ?? {}),
      error:  (err) => { throw err },
    })
    audioEncoder.configure({
      codec:            'mp4a.40.2',
      sampleRate,
      numberOfChannels,
      bitrate:          audioBitrateK * 1_000,
    })

    const canvas = new OffscreenCanvas(width, height)
    const ctx    = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D

    const totalFrames           = Math.floor(totalDuration * fps)
    const totalAudioSamplesNeeded = samplesPerChannel * loopCount
    const audioChunkSz          = 1024
    const colors                = COLOR_PRESETS[colorPresetIndex].colors
    let audioSamplePos = 0

    for (let frame = 0; frame < totalFrames; frame++) {
      const timestamp = Math.round((frame / fps) * 1_000_000)
      const loopedTime = (frame / fps) % duration

      const freqData = simulateFreqAtTime(ch0, sampleRate, loopedTime, 2048)
      const timeData = new Uint8Array(2048).fill(128)

      const rendererCtx = ctx as unknown as CanvasRenderingContext2D

      drawBackground(rendererCtx, overlay, width, height, colors)

      const opts = { ctx: rendererCtx, freqData, timeData, colors, width, height, time: loopedTime }
      switch (vizType) {
        case 'bars':      renderBars(opts);      break
        case 'circular':  renderCircular(opts);  break
        case 'wave':      renderWave(opts);      break
        case 'particles': renderParticles(opts); break
      }
      applyEffects(rendererCtx, freqData, effects, width, height, loopedTime)

      drawLogo(rendererCtx, overlay.logo, width, height)
      drawStickers(rendererCtx, overlay.stickers)

      const videoFrame = new VideoFrame(canvas, { timestamp })
      videoEncoder.encode(videoFrame, { keyFrame: frame % (fps * 2) === 0 })
      videoFrame.close()

      // audioSamplePos는 looped 공간(0..samplesPerChannel*loopCount)에서 증가
      // 1초 = sampleRate 샘플 — loopCount 곱하지 않음
      const audioEnd = Math.min(
        Math.floor((frame + 1) / fps * sampleRate),
        totalAudioSamplesNeeded,
      )
      while (audioSamplePos < audioEnd) {
        const chunkEnd = Math.min(audioSamplePos + audioChunkSz, audioEnd)
        const nFrames  = chunkEnd - audioSamplePos

        const audioDataArr = new Float32Array(nFrames * numberOfChannels)
        for (let ch = 0; ch < numberOfChannels; ch++) {
          for (let i = 0; i < nFrames; i++) {
            audioDataArr[ch * nFrames + i] = channels[ch][(audioSamplePos + i) % samplesPerChannel]
          }
        }

        const audioData = new AudioData({
          format:           'f32-planar',
          sampleRate,
          numberOfFrames:   nFrames,
          numberOfChannels,
          timestamp:        Math.round(audioSamplePos / sampleRate * 1_000_000),
          data:             audioDataArr,
        })
        audioEncoder.encode(audioData)
        audioData.close()
        audioSamplePos = chunkEnd
      }

      if (frame % 10 === 0) {
        const msg: WorkerOutMessage = { type: 'progress', progress: frame / totalFrames }
        self.postMessage(msg)
        await new Promise(r => setTimeout(r, 0))
      }
    }

    await videoEncoder.flush()
    await audioEncoder.flush()
    muxer.finalize()

    const mp4Buffer = (muxer.target as ArrayBufferTarget).buffer
    const done: WorkerOutMessage = { type: 'done', buffer: mp4Buffer }
    self.postMessage(done, { transfer: [mp4Buffer] })

  } catch (err) {
    const errMsg: WorkerOutMessage = { type: 'error', error: String(err) }
    self.postMessage(errMsg)
  }
}
```

- [ ] **Step 2: 빌드 + 전체 테스트 확인**

```bash
npx tsc --noEmit && npx vitest run
```

Expected: 타입 오류 없음, 18 tests passed

- [ ] **Step 3: 커밋**

```bash
git add src/workers/encoder.worker.ts
git commit -m "feat: update encoder worker with loopCount, audioBitrateK, overlay rendering"
```

---

## Task 10: CSS 스타일 추가 + 빌드 최종 확인

**Files:**
- Modify: `src/App.css`

- [ ] **Step 1: App.css에 신규 컴포넌트용 스타일 추가**

`src/App.css` 파일 끝에 아래 추가:

```css
/* 탭 버튼 */
.tab-row {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
}
.tab-btn {
  flex: 1;
  padding: 4px 6px;
  font-size: 11px;
  background: #1a1a2e;
  border: 1px solid #333;
  border-radius: 4px;
  color: #aaa;
  cursor: pointer;
}
.tab-btn.active {
  background: #7C5CFC;
  border-color: #7C5CFC;
  color: #fff;
}

/* 드롭존 small variant */
.dropzone.small {
  padding: 10px;
  min-height: 40px;
  font-size: 12px;
}

/* 그라디언트 피커 */
.gradient-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.gradient-row input[type="color"] {
  width: 36px;
  height: 28px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
}

/* 씬 그리드 */
.scene-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-top: 4px;
}
.scene-card {
  height: 40px;
  border-radius: 6px;
  border: 2px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: flex-end;
  padding: 4px;
}
.scene-card.active {
  border-color: #7C5CFC;
}
.scene-name {
  font-size: 9px;
  color: rgba(255,255,255,0.8);
  text-transform: uppercase;
}

/* 로고/스티커 */
.overlay-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.upload-btn, .remove-btn {
  padding: 3px 10px;
  font-size: 11px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid #555;
  background: #1a1a2e;
  color: #ccc;
}
.remove-btn {
  border-color: #ff4466;
  color: #ff4466;
}
.loaded-badge {
  font-size: 10px;
  color: #00FFB9;
}
.sticker-slots {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 4px;
}
.sticker-slot {
  width: 36px;
  height: 36px;
  border: 1px dashed #444;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sticker-add, .sticker-remove {
  width: 100%;
  height: 100%;
  background: none;
  border: none;
  color: #888;
  font-size: 16px;
  cursor: pointer;
  border-radius: 6px;
}
.sticker-remove {
  color: #ff4466;
  font-size: 12px;
}
.sticker-add:hover { color: #7C5CFC; }

/* 프로파일 버튼 그룹 */
.btn-group {
  display: flex;
  gap: 4px;
  margin-top: 4px;
}
.profile-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 5px 4px;
  font-size: 11px;
  background: #1a1a2e;
  border: 1px solid #333;
  border-radius: 4px;
  color: #aaa;
  cursor: pointer;
  line-height: 1.2;
}
.profile-btn.active {
  background: #7C5CFC;
  border-color: #7C5CFC;
  color: #fff;
}
.profile-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.profile-sub {
  font-size: 9px;
  opacity: 0.7;
}
```

- [ ] **Step 2: npm run build 최종 확인**

```bash
npm run build
```

Expected: ✅ 빌드 성공, 경고 없음

- [ ] **Step 3: 전체 테스트 최종 확인**

```bash
npx vitest run
```

Expected: 18 tests | 18 passed

- [ ] **Step 4: 최종 커밋**

```bash
git add src/App.css
git commit -m "feat: add CSS styles for overlay panels and profile buttons"
```

---

## 완료 기준

- [ ] `npx vitest run` → 18 tests passed
- [ ] `npm run build` → 오류 없음
- [ ] `npm run dev` 실행 후 브라우저에서:
  - 배경 탭 4개(없음/미디어/그라디언트/씬) 동작 확인
  - 로고/스티커 업로드 및 캔버스 오버레이 표시 확인
  - ExportPanel 버튼 UI 표시 확인
  - 오디오 로드 후 Export MP4 버튼 활성화 확인
