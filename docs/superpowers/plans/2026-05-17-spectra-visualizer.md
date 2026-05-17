# SPECTRA Music Visualizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로컬 오디오 파일을 실시간 비주얼라이저로 렌더링하고 MP4로 내보내는 웹앱을 완성한다.

**Architecture:** Web Audio API AnalyserNode → Canvas 2D 렌더러 4종 → rAF 루프로 미리보기. MP4 내보내기는 OffscreenCanvas Web Worker에서 WebCodecs + mp4-muxer로 처리해 메인 스레드 블로킹 없이 고속 인코딩.

**Tech Stack:** React 19 + TypeScript 5.6 + Vite 6, Web Audio API, Canvas 2D API, WebCodecs API, mp4-muxer, Vitest

---

## 파일 구조

```
src/
  App.tsx                     수정 — 상태 관리 + 레이아웃 조립
  App.css                     완성 (미수정)
  types.ts                    재작성 — 공통 타입 전체 정의
  constants.ts                신규 — COLOR_PRESETS, VIZ_TYPES, RESOLUTIONS
  components/
    Sidebar.tsx               신규 — 패널 5개 조합
    panels/
      AudioPanel.tsx          신규 — 파일 드롭존
      VisualizerPanel.tsx     신규 — 타입 4종 버튼
      ColorPanel.tsx          신규 — 색상 프리셋
      EffectsPanel.tsx        신규 — 이펙트 토글
      ExportPanel.tsx         신규 — 해상도·비트레이트·MP4 버튼
    CanvasPreview.tsx         신규 — canvas ref + 오버레이
    Transport.tsx             신규 — 재생·스크러버
  hooks/
    useAudioEngine.ts         신규 — 파일 로드·디코딩·재생·시크·analyser
    useVisualizerLoop.ts      신규 — rAF 루프, 데모/실제 모드
    useExport.ts              신규 — Worker 통신 + Blob 다운로드
  renderers/
    utils.ts                  신규 — 주파수 정규화, 색상 보간, 밴드 평균
    bars.ts                   신규 — BARS 렌더러
    circular.ts               신규 — CIRCULAR 렌더러
    wave.ts                   신규 — WAVE 렌더러
    particles.ts              신규 — PARTICLES 렌더러
    effects.ts                신규 — 후처리 (비트 펄스·베이스 파동·그레인·색수차)
  workers/
    encoder.worker.ts         신규 — WebCodecs + mp4-muxer 오프라인 인코딩
  tests/
    renderers/utils.test.ts   신규
```

---

## Task 1: 의존성 설치 및 Vitest 설정

**Files:**
- Modify: `package.json` (scripts 추가)
- Create: `vite.config.ts`
- Create: `src/tests/setup.ts`

- [ ] **Step 1: mp4-muxer와 Vitest 설치**

```bash
cd C:\claudecode\port_app
npm install mp4-muxer
npm install -D vitest @vitest/ui happy-dom
```

Expected: `node_modules/mp4-muxer` 생성, `package.json` devDependencies 업데이트

- [ ] **Step 2: vite.config.ts 생성**

`vite.config.ts` 파일을 생성한다. Vite 설정에 Vitest 테스트 환경을 추가한다.

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    setupFiles: ['src/tests/setup.ts'],
    globals: true,
  },
})
```

- [ ] **Step 3: 테스트 setup 파일 생성**

```typescript
// src/tests/setup.ts
// Canvas 2D context 메서드 mock — happy-dom은 canvas를 미지원
class MockCanvas {
  getContext() {
    return {
      clearRect: () => {},
      fillRect: () => {},
      fillText: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fill: () => {},
      arc: () => {},
      scale: () => {},
      save: () => {},
      restore: () => {},
      createLinearGradient: () => ({
        addColorStop: () => {},
      }),
      createRadialGradient: () => ({
        addColorStop: () => {},
      }),
      roundRect: () => {},
      putImageData: () => {},
      createImageData: (_w: number, _h: number) => ({
        data: new Uint8ClampedArray(_w * _h * 4),
      }),
      shadowBlur: 0,
      shadowColor: '',
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      globalAlpha: 0,
      lineCap: '',
    }
  }
}
Object.defineProperty(window, 'HTMLCanvasElement', {
  value: MockCanvas,
})
```

- [ ] **Step 4: package.json test 스크립트 추가**

`package.json`의 `scripts` 블록을 아래와 같이 수정한다.

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:ui": "vitest --ui"
}
```

- [ ] **Step 5: 테스트 실행 확인**

```bash
npm test
```

Expected: `No test files found` 메시지 (아직 테스트 파일 없음, 오류 없음)

- [ ] **Step 6: Commit**

```bash
git add vite.config.ts src/tests/setup.ts package.json package-lock.json
git commit -m "chore: add mp4-muxer and vitest setup"
```

---

## Task 2: 공통 타입 및 상수 정의

**Files:**
- Modify: `src/types.ts`
- Create: `src/constants.ts`

- [ ] **Step 1: src/types.ts 전체 재작성**

```typescript
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
  resolution: ExportResolution
  bitrateM:   number
}

export type ExportStatus = 'idle' | 'encoding' | 'done' | 'error'

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
  audioBuffer:       ArrayBuffer   // AudioBuffer를 직렬화한 raw PCM Float32
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
}

export interface WorkerProgressMessage {
  type:     'progress'
  progress: number   // 0–1
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

- [ ] **Step 2: src/constants.ts 생성**

```typescript
// src/constants.ts — 앱 전역 상수
import type { ColorPreset, VizType, ExportResolution } from './types'

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

export const DEFAULT_EFFECTS: import('./types').EffectsConfig = {
  beatPulse:  true,
  filmGrain:  false,
  chromatic:  false,
  bassRipple: true,
}

export const FFT_SIZE = 2048
export const BAND_COUNT = 72
export const FPS = 30
```

- [ ] **Step 3: Commit**

```bash
git add src/types.ts src/constants.ts
git commit -m "feat: define shared types and constants"
```

---

## Task 3: 렌더러 유틸리티 함수 (TDD)

**Files:**
- Create: `src/renderers/utils.ts`
- Create: `src/tests/renderers/utils.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```typescript
// src/tests/renderers/utils.test.ts
import { describe, it, expect } from 'vitest'
import {
  normalizeFreqData,
  averageBands,
  hexToRgb,
  bassEnergy,
} from '../../renderers/utils'

describe('normalizeFreqData', () => {
  it('0–255 범위를 0–1로 변환한다', () => {
    const input = new Uint8Array([0, 128, 255])
    const result = normalizeFreqData(input)
    expect(result[0]).toBeCloseTo(0)
    expect(result[1]).toBeCloseTo(128 / 255)
    expect(result[2]).toBeCloseTo(1)
  })

  it('입력 길이를 유지한다', () => {
    const input = new Uint8Array(64)
    expect(normalizeFreqData(input)).toHaveLength(64)
  })
})

describe('averageBands', () => {
  it('256개 주파수를 72개 밴드로 축소한다', () => {
    const freqs = new Float32Array(256).fill(0.5)
    const bands = averageBands(freqs, 72)
    expect(bands).toHaveLength(72)
    bands.forEach(b => expect(b).toBeCloseTo(0.5))
  })

  it('각 밴드는 해당 구간의 평균이다', () => {
    const freqs = new Float32Array(256)
    freqs.fill(1, 0, 128)
    freqs.fill(0, 128)
    const bands = averageBands(freqs, 2)
    expect(bands[0]).toBeCloseTo(1)
    expect(bands[1]).toBeCloseTo(0)
  })
})

describe('hexToRgb', () => {
  it('#7C5CFC를 [124, 92, 252]로 변환한다', () => {
    expect(hexToRgb('#7C5CFC')).toEqual([124, 92, 252])
  })

  it('#000000을 [0, 0, 0]으로 변환한다', () => {
    expect(hexToRgb('#000000')).toEqual([0, 0, 0])
  })
})

describe('bassEnergy', () => {
  it('낮은 주파수 밴드 평균을 반환한다', () => {
    const freqs = new Float32Array(72).fill(0)
    freqs.fill(1, 0, 6)   // 처음 8%만 1
    const energy = bassEnergy(freqs)
    expect(energy).toBeGreaterThan(0)
    expect(energy).toBeLessThanOrEqual(1)
  })

  it('모두 0이면 0을 반환한다', () => {
    expect(bassEnergy(new Float32Array(72))).toBe(0)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../../renderers/utils'`

- [ ] **Step 3: utils.ts 구현**

```typescript
// src/renderers/utils.ts — 렌더러 공용 유틸리티

export function normalizeFreqData(data: Uint8Array): Float32Array {
  const out = new Float32Array(data.length)
  for (let i = 0; i < data.length; i++) {
    out[i] = data[i] / 255
  }
  return out
}

export function averageBands(freqs: Float32Array, bandCount: number): Float32Array {
  const out  = new Float32Array(bandCount)
  const step = Math.floor(freqs.length / bandCount)
  for (let i = 0; i < bandCount; i++) {
    let sum = 0
    for (let j = 0; j < step; j++) sum += freqs[i * step + j]
    out[i] = step > 0 ? sum / step : 0
  }
  return out
}

export function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

export function bassEnergy(bands: Float32Array): number {
  const end = Math.max(1, Math.floor(bands.length * 0.08))
  let sum = 0
  for (let i = 0; i < end; i++) sum += bands[i]
  return sum / end
}

export function makeFreqBands(freqData: Uint8Array, bandCount: number): Float32Array {
  return averageBands(normalizeFreqData(freqData), bandCount)
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npm test
```

Expected: PASS — 8 tests passed

- [ ] **Step 5: Commit**

```bash
git add src/renderers/utils.ts src/tests/renderers/utils.test.ts
git commit -m "feat: add renderer utility functions (TDD)"
```

---

## Task 4: BARS 렌더러

**Files:**
- Create: `src/renderers/bars.ts`

- [ ] **Step 1: bars.ts 작성**

```typescript
// src/renderers/bars.ts — 주파수 막대 렌더러
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
```

- [ ] **Step 2: Commit**

```bash
git add src/renderers/bars.ts
git commit -m "feat: add BARS visualizer renderer"
```

---

## Task 5: CIRCULAR 렌더러

**Files:**
- Create: `src/renderers/circular.ts`

- [ ] **Step 1: circular.ts 작성**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/renderers/circular.ts
git commit -m "feat: add CIRCULAR visualizer renderer"
```

---

## Task 6: WAVE 렌더러

**Files:**
- Create: `src/renderers/wave.ts`

- [ ] **Step 1: wave.ts 작성**

시간 도메인 데이터(`timeData`)를 사용한다. `freqData`도 진폭 조절에 활용한다.

```typescript
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
  // freqData로 전체 에너지 계산 (진폭 스케일에 사용)
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
      const tdVal   = (timeData[tdIdx] ?? 128) / 128 - 1   // -1 ~ 1
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
```

- [ ] **Step 2: Commit**

```bash
git add src/renderers/wave.ts
git commit -m "feat: add WAVE visualizer renderer"
```

---

## Task 7: PARTICLES 렌더러

**Files:**
- Create: `src/renderers/particles.ts`

- [ ] **Step 1: particles.ts 작성**

```typescript
// src/renderers/particles.ts — 파티클 렌더러
import type { RendererOptions } from '../types'
import { makeFreqBands } from './utils'
import { BAND_COUNT } from '../constants'

const PARTICLE_COUNT = 200
const GOLDEN_ANGLE   = 2.39996  // 황금각 (라디안)

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
```

- [ ] **Step 2: Commit**

```bash
git add src/renderers/particles.ts
git commit -m "feat: add PARTICLES visualizer renderer"
```

---

## Task 8: 이펙트 후처리 렌더러

**Files:**
- Create: `src/renderers/effects.ts`

- [ ] **Step 1: effects.ts 작성**

```typescript
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

  // 비트 펄스 — 저주파 에너지에 비례한 화면 밝기 플래시
  if (effects.beatPulse && bass > 0.5) {
    const alpha = (bass - 0.5) * 0.18
    ctx.fillStyle   = `rgba(255,255,255,${alpha})`
    ctx.globalAlpha = 1
    ctx.fillRect(0, 0, width, height)
  }

  // 베이스 파동 — 동심원
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

  // 필름 그레인 — ImageData 노이즈 합성
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

  // 색수차 — RGB 채널 오프셋 (canvas는 직접 지원 안 함 — 근사 효과)
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
```

- [ ] **Step 2: Commit**

```bash
git add src/renderers/effects.ts
git commit -m "feat: add post-processing effects renderer"
```

---

## Task 9: Audio Engine 훅

**Files:**
- Create: `src/hooks/useAudioEngine.ts`

AudioBufferSourceNode는 재생 후 stop/재생성이 필요하다. seek는 기존 소스를 중단하고 새 소스를 offset으로 시작한다.

- [ ] **Step 1: useAudioEngine.ts 작성**

```typescript
// src/hooks/useAudioEngine.ts — Web Audio API 재생 엔진
import { useRef, useState, useCallback, useEffect } from 'react'
import { FFT_SIZE } from '../constants'

export interface AudioEngineAPI {
  analyser:    React.RefObject<AnalyserNode | null>
  duration:    number
  currentTime: number
  isPlaying:   boolean
  loadFile:    (file: File) => Promise<void>
  play:        () => void
  pause:       () => void
  seek:        (time: number) => void
}

export function useAudioEngine(): AudioEngineAPI {
  const ctxRef      = useRef<AudioContext | null>(null)
  const bufferRef   = useRef<AudioBuffer | null>(null)
  const sourceRef   = useRef<AudioBufferSourceNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)

  // 재생 시작 시각 (AudioContext.currentTime 기준)
  const startedAtRef  = useRef(0)
  // 현재 재생 오프셋 (pause/seek 시 저장)
  const offsetRef     = useRef(0)

  const [duration,    setDuration]    = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying,   setIsPlaying]   = useState(false)

  // currentTime 업데이트 타이머
  useEffect(() => {
    if (!isPlaying) return
    const id = setInterval(() => {
      if (!ctxRef.current) return
      const t = offsetRef.current + (ctxRef.current.currentTime - startedAtRef.current)
      setCurrentTime(Math.min(t, duration))
    }, 250)
    return () => clearInterval(id)
  }, [isPlaying, duration])

  const getCtx = useCallback((): AudioContext => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext()
      const analyser       = ctxRef.current.createAnalyser()
      analyser.fftSize     = FFT_SIZE
      analyser.smoothingTimeConstant = 0.8
      analyser.connect(ctxRef.current.destination)
      analyserRef.current  = analyser
    }
    return ctxRef.current
  }, [])

  const stopSource = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.onended = null
      try { sourceRef.current.stop() } catch { /* 이미 정지됨 */ }
      sourceRef.current.disconnect()
      sourceRef.current = null
    }
  }, [])

  const loadFile = useCallback(async (file: File): Promise<void> => {
    stopSource()
    const audioCtx = getCtx()
    if (audioCtx.state === 'suspended') await audioCtx.resume()

    const arrayBuf  = await file.arrayBuffer()
    const audioBuf  = await audioCtx.decodeAudioData(arrayBuf)
    bufferRef.current = audioBuf
    offsetRef.current = 0
    setDuration(audioBuf.duration)
    setCurrentTime(0)
    setIsPlaying(false)
  }, [getCtx, stopSource])

  const play = useCallback(() => {
    const audioCtx = getCtx()
    const buf      = bufferRef.current
    if (!buf || !analyserRef.current) return

    stopSource()
    const source = audioCtx.createBufferSource()
    source.buffer = buf
    source.connect(analyserRef.current)
    source.start(0, offsetRef.current)
    source.onended = () => {
      setIsPlaying(false)
      offsetRef.current = 0
      setCurrentTime(0)
    }
    sourceRef.current  = source
    startedAtRef.current = audioCtx.currentTime
    setIsPlaying(true)
    if (audioCtx.state === 'suspended') audioCtx.resume()
  }, [getCtx, stopSource])

  const pause = useCallback(() => {
    if (!ctxRef.current || !isPlaying) return
    offsetRef.current += ctxRef.current.currentTime - startedAtRef.current
    stopSource()
    setIsPlaying(false)
  }, [isPlaying, stopSource])

  const seek = useCallback((time: number) => {
    const wasPlaying = isPlaying
    if (wasPlaying) stopSource()
    offsetRef.current = Math.max(0, Math.min(time, bufferRef.current?.duration ?? 0))
    setCurrentTime(offsetRef.current)
    if (wasPlaying) {
      // play() 내부에서 offsetRef를 읽으므로 직접 호출
      const audioCtx = getCtx()
      const buf      = bufferRef.current
      if (!buf || !analyserRef.current) return
      const source = audioCtx.createBufferSource()
      source.buffer = buf
      source.connect(analyserRef.current)
      source.start(0, offsetRef.current)
      source.onended = () => { setIsPlaying(false); offsetRef.current = 0; setCurrentTime(0) }
      sourceRef.current    = source
      startedAtRef.current = audioCtx.currentTime
      setIsPlaying(true)
    }
  }, [isPlaying, stopSource, getCtx])

  return { analyser: analyserRef, duration, currentTime, isPlaying, loadFile, play, pause, seek }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useAudioEngine.ts
git commit -m "feat: add Web Audio Engine hook"
```

---

## Task 10: Visualizer Loop 훅

**Files:**
- Create: `src/hooks/useVisualizerLoop.ts`

이 훅이 App.tsx의 기존 데모 애니메이션 useEffect를 대체한다.

- [ ] **Step 1: useVisualizerLoop.ts 작성**

```typescript
// src/hooks/useVisualizerLoop.ts — rAF 루프, analyser → 렌더러 연결
import { useEffect, useRef } from 'react'
import type { VizType, EffectsConfig } from '../types'
import { COLOR_PRESETS, FFT_SIZE } from '../constants'
import { renderBars }     from '../renderers/bars'
import { renderCircular } from '../renderers/circular'
import { renderWave }     from '../renderers/wave'
import { renderParticles }from '../renderers/particles'
import { applyEffects }   from '../renderers/effects'

interface Options {
  canvasRef:    React.RefObject<HTMLCanvasElement | null>
  analyserRef:  React.RefObject<AnalyserNode | null>
  vizType:      VizType
  colorPreset:  number
  effects:      EffectsConfig
  isPlaying:    boolean
}

export function useVisualizerLoop({
  canvasRef, analyserRef, vizType, colorPreset, effects, isPlaying,
}: Options): void {
  const animRef  = useRef(0)
  const timeRef  = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const colors = COLOR_PRESETS[colorPreset].colors
    const freqData = new Uint8Array(FFT_SIZE / 2)
    const timeData = new Uint8Array(FFT_SIZE)

    // 데모용 가짜 주파수 생성 (analyser 없을 때)
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

      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = '#07070f'
      ctx.fillRect(0, 0, W, H)

      // 배경 앰비언트
      const bg = ctx.createRadialGradient(W * 0.5, H * 0.45, 0, W * 0.5, H * 0.45, W * 0.65)
      bg.addColorStop(0, colors[0] + '14')
      bg.addColorStop(1, 'transparent')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

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

      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(animRef.current)
      ro.disconnect()
    }
  }, [canvasRef, analyserRef, vizType, colorPreset, effects, isPlaying])
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useVisualizerLoop.ts
git commit -m "feat: add visualizer rAF loop hook"
```

---

## Task 11: 사이드바 패널 컴포넌트 분리

**Files:**
- Create: `src/components/panels/AudioPanel.tsx`
- Create: `src/components/panels/VisualizerPanel.tsx`
- Create: `src/components/panels/ColorPanel.tsx`
- Create: `src/components/panels/EffectsPanel.tsx`
- Create: `src/components/panels/ExportPanel.tsx`
- Create: `src/components/Sidebar.tsx`

- [ ] **Step 1: AudioPanel.tsx 작성**

```tsx
// src/components/panels/AudioPanel.tsx — 오디오 파일 업로드 패널
import { useState } from 'react'

interface Props {
  fileName:    string
  onFileLoad:  (file: File) => Promise<void>
}

export function AudioPanel({ fileName, onFileLoad }: Props) {
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = (file: File) => {
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|flac|ogg|m4a)$/i)) return
    onFileLoad(file)
  }

  const openPicker = () => {
    const inp = document.createElement('input')
    inp.type   = 'file'
    inp.accept = 'audio/*'
    inp.onchange = e => {
      const f = (e.target as HTMLInputElement).files?.[0]
      if (f) handleFile(f)
    }
    inp.click()
  }

  return (
    <section className="panel">
      <h3 className="panel-label">AUDIO</h3>
      <div
        className={`dropzone${isDragging ? ' dragover' : ''}`}
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => {
          e.preventDefault(); setIsDragging(false)
          const f = e.dataTransfer.files[0]; if (f) handleFile(f)
        }}
        onClick={openPicker}
      >
        {fileName ? (
          <>
            <div className="file-icon">♪</div>
            <div className="file-name">{fileName}</div>
            <div className="file-hint">클릭하여 변경</div>
          </>
        ) : (
          <>
            <div className="drop-icon">↓</div>
            <div className="drop-text">DROP AUDIO</div>
            <div className="drop-hint">MP3 · WAV · FLAC · OGG</div>
          </>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: VisualizerPanel.tsx 작성**

```tsx
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
```

- [ ] **Step 3: ColorPanel.tsx 작성**

```tsx
// src/components/panels/ColorPanel.tsx — 색상 프리셋 선택
import { COLOR_PRESETS } from '../../constants'

interface Props {
  preset:   number
  onChange: (i: number) => void
}

export function ColorPanel({ preset, onChange }: Props) {
  return (
    <section className="panel">
      <h3 className="panel-label">COLOR</h3>
      <div className="preset-list">
        {COLOR_PRESETS.map((p, i) => (
          <button
            key={i}
            className={`preset-btn${preset === i ? ' active' : ''}`}
            onClick={() => onChange(i)}
          >
            <div className="preset-swatches">
              {p.colors.map((c, j) => (
                <span key={j} className="swatch" style={{ background: c }} />
              ))}
            </div>
            <span className="preset-name">{p.name}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 4: EffectsPanel.tsx 작성**

```tsx
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
```

- [ ] **Step 5: ExportPanel.tsx 작성**

```tsx
// src/components/panels/ExportPanel.tsx — MP4 내보내기 설정
import type { ExportConfig, ExportStatus } from '../../types'
import { RESOLUTIONS } from '../../constants'

interface Props {
  config:       ExportConfig
  status:       ExportStatus
  progress:     number
  hasFile:      boolean
  onChange:     (c: ExportConfig) => void
  onExport:     () => void
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
        <label className="setting-label">VIDEO BITRATE</label>
        <div className="bitrate-row">
          <input
            type="range" min={2} max={20} step={1}
            value={config.bitrateM}
            disabled={isEncoding}
            onChange={e => onChange({ ...config, bitrateM: Number(e.target.value) })}
            className="slider"
          />
          <span className="bitrate-val">{config.bitrateM}M</span>
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

ExportPanel의 progress bar 스타일을 App.css에 추가한다.

```css
/* App.css 끝에 추가 */
.export-progress {
  position: relative;
  height: 4px;
  background: var(--panel);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 8px;
}
.export-progress-fill {
  position: absolute;
  top: 0; left: 0;
  height: 100%;
  background: var(--accent);
  transition: width 0.3s;
}
.export-progress-text {
  display: block;
  text-align: right;
  font-family: 'Syne Mono', monospace;
  font-size: 10px;
  color: var(--accent);
  margin-top: 2px;
  margin-bottom: 6px;
}
```

- [ ] **Step 6: Sidebar.tsx 작성**

```tsx
// src/components/Sidebar.tsx — 패널 5개 조합 컨테이너
import type { VizType, EffectsConfig, ExportConfig, ExportStatus } from '../types'
import { AudioPanel }      from './panels/AudioPanel'
import { VisualizerPanel } from './panels/VisualizerPanel'
import { ColorPanel }      from './panels/ColorPanel'
import { EffectsPanel }    from './panels/EffectsPanel'
import { ExportPanel }     from './panels/ExportPanel'

interface Props {
  fileName:      string
  vizType:       VizType
  colorPreset:   number
  effects:       EffectsConfig
  exportConfig:  ExportConfig
  exportStatus:  ExportStatus
  exportProgress:number
  onFileLoad:    (file: File) => Promise<void>
  onVizType:     (v: VizType) => void
  onColorPreset: (i: number) => void
  onEffects:     (e: EffectsConfig) => void
  onExportConfig:(c: ExportConfig) => void
  onExport:      () => void
}

export function Sidebar(props: Props) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-icon">◈</span>
        <span className="brand-name">SPECTRA</span>
        <span className="brand-version">v1.0</span>
      </div>
      <AudioPanel      fileName={props.fileName}      onFileLoad={props.onFileLoad} />
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

- [ ] **Step 7: Commit**

```bash
git add src/components/
git commit -m "feat: decompose sidebar into panel components"
```

---

## Task 12: CanvasPreview + Transport 컴포넌트

**Files:**
- Create: `src/components/CanvasPreview.tsx`
- Create: `src/components/Transport.tsx`

- [ ] **Step 1: CanvasPreview.tsx 작성**

```tsx
// src/components/CanvasPreview.tsx — 캔버스 미리보기 + 오버레이
import { forwardRef } from 'react'

interface Props {
  hasFile: boolean
}

export const CanvasPreview = forwardRef<HTMLCanvasElement, Props>(
  ({ hasFile }, ref) => (
    <div className="canvas-wrapper">
      <canvas ref={ref} className="visualizer-canvas" />
      {!hasFile && (
        <div className="canvas-overlay">
          <span className="overlay-badge">DEMO MODE</span>
          <span className="overlay-hint">좌측 패널에서 오디오 파일을 불러오세요</span>
        </div>
      )}
    </div>
  )
)
CanvasPreview.displayName = 'CanvasPreview'
```

- [ ] **Step 2: Transport.tsx 작성**

```tsx
// src/components/Transport.tsx — 재생 컨트롤 + 프로그레스 스크러버
interface Props {
  isPlaying:   boolean
  currentTime: number
  duration:    number
  onPlay:      () => void
  onPause:     () => void
  onSeek:      (time: number) => void
  onRestart:   () => void
}

function formatTime(s: number): string {
  if (!isFinite(s)) return '--:--'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export function Transport({ isPlaying, currentTime, duration, onPlay, onPause, onSeek, onRestart }: Props) {
  const progress = duration > 0 ? currentTime / duration : 0

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const t    = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    onSeek(t * duration)
  }

  return (
    <div className="transport">
      <span className="transport-time">{formatTime(currentTime)}</span>
      <div className="transport-controls">
        <button className="ctrl-btn" onClick={onRestart}>⏮</button>
        <button
          className="ctrl-btn play-btn"
          onClick={isPlaying ? onPause : onPlay}
          disabled={duration === 0}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button className="ctrl-btn" onClick={() => onSeek(duration)}>⏭</button>
      </div>
      <div className="transport-scrubber">
        <div className="scrubber-track" onClick={handleScrub}>
          <div className="scrubber-fill"   style={{ width: `${progress * 100}%` }} />
          <div className="scrubber-cursor" style={{ left:  `${progress * 100}%` }} />
        </div>
      </div>
      <span className="transport-duration">{formatTime(duration)}</span>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/CanvasPreview.tsx src/components/Transport.tsx
git commit -m "feat: add CanvasPreview and Transport components"
```

---

## Task 13: Export Worker (WebCodecs + mp4-muxer)

**Files:**
- Create: `src/workers/encoder.worker.ts`

Worker는 오디오 전체를 오프라인 렌더링하고 WebCodecs로 인코딩한다. 메인 스레드에서 AudioBuffer를 ArrayBuffer(raw PCM float32)로 직렬화해 전달한다.

- [ ] **Step 1: encoder.worker.ts 작성**

```typescript
// src/workers/encoder.worker.ts — WebCodecs + mp4-muxer 오프라인 인코딩
import { Muxer, ArrayBufferTarget } from 'mp4-muxer'
import type { WorkerStartMessage, WorkerOutMessage } from '../types'
import { COLOR_PRESETS, BAND_COUNT } from '../constants'
import { renderBars }      from '../renderers/bars'
import { renderCircular }  from '../renderers/circular'
import { renderWave }      from '../renderers/wave'
import { renderParticles } from '../renderers/particles'
import { applyEffects }    from '../renderers/effects'
import { makeFreqBands }   from '../renderers/utils'

function simulateFreqAtTime(
  channelData: Float32Array,
  sampleRate:  number,
  time:        number,
  fftSize:     number,
): Uint8Array {
  const start = Math.floor(time * sampleRate)
  const slice = channelData.slice(start, start + fftSize)
  // 단순 진폭 매핑 (실제 FFT 대신 — 충분한 시각 품질)
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
  } = e.data

  try {
    // PCM 복원 (채널별 Float32Array)
    const bytesPerChannel = rawPCM.byteLength / numberOfChannels
    const samplesPerChannel = bytesPerChannel / 4
    const channels: Float32Array[] = Array.from({ length: numberOfChannels }, (_, ch) =>
      new Float32Array(rawPCM, ch * bytesPerChannel, samplesPerChannel)
    )
    const ch0 = channels[0]

    const muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: { codec: 'avc', width, height },
      audio: { codec: 'aac', sampleRate, numberOfChannels },
      fastStart: 'in-memory',
    })

    // VideoEncoder 설정
    const videoEncoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta ?? {}),
      error:  (err) => { throw err },
    })
    videoEncoder.configure({
      codec:   'avc1.42001f',
      width,   height,
      bitrate: bitrateM * 1_000_000,
      framerate: fps,
    })

    // AudioEncoder 설정
    const audioEncoder = new AudioEncoder({
      output: (chunk, meta) => muxer.addAudioChunk(chunk, meta ?? {}),
      error:  (err) => { throw err },
    })
    audioEncoder.configure({
      codec:            'mp4a.40.2',
      sampleRate,
      numberOfChannels,
      bitrate:          128_000,
    })

    // OffscreenCanvas
    const canvas = new OffscreenCanvas(width, height)
    const ctx    = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D

    const totalFrames  = Math.floor(duration * fps)
    const audioChunkSz = 1024
    const totalAudioSamples = samplesPerChannel
    let audioSamplePos = 0

    const colors = COLOR_PRESETS[colorPresetIndex].colors
    let time = 0

    for (let frame = 0; frame < totalFrames; frame++) {
      const timestamp = Math.round((frame / fps) * 1_000_000)  // microseconds
      time = frame / fps

      // 주파수 데이터 시뮬레이션
      const freqData = simulateFreqAtTime(ch0, sampleRate, time, 2048)
      const timeData = new Uint8Array(2048).fill(128)

      // 캔버스 렌더링
      ctx.fillStyle = '#07070f'
      ctx.fillRect(0, 0, width, height)

      const rendererCtx = ctx as unknown as CanvasRenderingContext2D
      const opts = { ctx: rendererCtx, freqData, timeData, colors, width, height, time }

      switch (vizType) {
        case 'bars':      renderBars(opts);      break
        case 'circular':  renderCircular(opts);  break
        case 'wave':      renderWave(opts);      break
        case 'particles': renderParticles(opts); break
      }
      applyEffects(rendererCtx, freqData, effects, width, height, time)

      // 비디오 프레임 인코딩
      const videoFrame = new VideoFrame(canvas, { timestamp })
      videoEncoder.encode(videoFrame, { keyFrame: frame % (fps * 2) === 0 })
      videoFrame.close()

      // 오디오 청크 인코딩 (프레임에 해당하는 오디오)
      const audioEnd = Math.min(
        Math.floor((frame + 1) / fps * sampleRate),
        totalAudioSamples,
      )
      while (audioSamplePos < audioEnd) {
        const chunkEnd = Math.min(audioSamplePos + audioChunkSz, audioEnd)
        const nFrames  = chunkEnd - audioSamplePos

        const audioDataArr = new Float32Array(nFrames * numberOfChannels)
        for (let ch = 0; ch < numberOfChannels; ch++) {
          const chData = channels[ch].slice(audioSamplePos, chunkEnd)
          audioDataArr.set(chData, ch * nFrames)
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

      // 진행률 보고 (10프레임마다)
      if (frame % 10 === 0) {
        const msg: WorkerOutMessage = { type: 'progress', progress: frame / totalFrames }
        self.postMessage(msg)
        // 브라우저에 제어권 양보
        await new Promise(r => setTimeout(r, 0))
      }
    }

    await videoEncoder.flush()
    await audioEncoder.flush()
    muxer.finalize()

    const mp4Buffer = (muxer.target as ArrayBufferTarget).buffer
    const done: WorkerOutMessage = { type: 'done', buffer: mp4Buffer }
    self.postMessage(done, [mp4Buffer])

  } catch (err) {
    const errMsg: WorkerOutMessage = { type: 'error', error: String(err) }
    self.postMessage(errMsg)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/workers/encoder.worker.ts
git commit -m "feat: add WebCodecs export worker with mp4-muxer"
```

---

## Task 14: useExport 훅

**Files:**
- Create: `src/hooks/useExport.ts`

- [ ] **Step 1: useExport.ts 작성**

AudioBuffer를 Worker로 전달할 때 raw PCM(Float32Array)으로 직렬화한다.

```typescript
// src/hooks/useExport.ts — Worker 통신 + Blob 다운로드
import { useRef, useState, useCallback } from 'react'
import type { VizType, EffectsConfig, ExportConfig, ExportStatus, WorkerOutMessage, WorkerStartMessage } from '../types'
import { RESOLUTIONS, FPS } from '../constants'

interface Options {
  audioBuffer:      AudioBuffer | null
  vizType:          VizType
  colorPresetIndex: number
  effects:          EffectsConfig
  exportConfig:     ExportConfig
}

export interface ExportAPI {
  status:   ExportStatus
  progress: number
  startExport: () => void
}

export function useExport({
  audioBuffer, vizType, colorPresetIndex, effects, exportConfig,
}: Options): ExportAPI {
  const workerRef = useRef<Worker | null>(null)
  const [status,   setStatus]   = useState<ExportStatus>('idle')
  const [progress, setProgress] = useState(0)

  const startExport = useCallback(() => {
    if (!audioBuffer || status === 'encoding') return

    // WebCodecs サポート確認
    if (typeof VideoEncoder === 'undefined') {
      alert('이 브라우저는 WebCodecs를 지원하지 않습니다.\nChrome 94+ 또는 Edge 94+를 사용해주세요.')
      return
    }

    const res   = RESOLUTIONS.find(r => r.value === exportConfig.resolution) ?? RESOLUTIONS[1]

    // AudioBuffer → raw PCM (채널별 Float32Array를 하나의 ArrayBuffer에 직렬화)
    const { numberOfChannels, sampleRate, length: sampleLength, duration } = audioBuffer
    const rawPCM = new ArrayBuffer(numberOfChannels * sampleLength * 4)
    for (let ch = 0; ch < numberOfChannels; ch++) {
      const dst = new Float32Array(rawPCM, ch * sampleLength * 4, sampleLength)
      dst.set(audioBuffer.getChannelData(ch))
    }

    // Worker 생성 (Vite ?worker 구문)
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
    }
    workerRef.current.postMessage(msg, [rawPCM])
    setStatus('encoding')
    setProgress(0)
  }, [audioBuffer, status, exportConfig, vizType, colorPresetIndex, effects])

  return { status, progress, startExport }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useExport.ts
git commit -m "feat: add useExport hook with Worker communication"
```

---

## Task 15: App.tsx 최종 통합

**Files:**
- Modify: `src/App.tsx` (전체 재작성)
- Modify: `src/App.css` (progress bar 스타일 추가)

- [ ] **Step 1: App.css에 ExportPanel progress bar 스타일 추가**

`src/App.css` 파일 끝에 다음을 추가한다.

```css
.export-progress {
  position: relative;
  height: 4px;
  background: var(--panel);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 4px;
}
.export-progress-fill {
  position: absolute;
  top: 0; left: 0;
  height: 100%;
  background: var(--accent);
  transition: width 0.3s;
  border-radius: 2px;
}
.export-progress-text {
  display: block;
  text-align: right;
  font-family: 'Syne Mono', monospace;
  font-size: 10px;
  color: var(--accent);
  margin-top: 2px;
  margin-bottom: 6px;
}
```

- [ ] **Step 2: App.tsx 재작성 — 모든 훅·컴포넌트 통합**

```tsx
// src/App.tsx — SPECTRA 앱 루트: 상태 관리 + 레이아웃
import { useState, useRef } from 'react'
import type { VizType, EffectsConfig, ExportConfig } from './types'
import { DEFAULT_EFFECTS } from './constants'
import { useAudioEngine }    from './hooks/useAudioEngine'
import { useVisualizerLoop } from './hooks/useVisualizerLoop'
import { useExport }         from './hooks/useExport'
import { Sidebar }           from './components/Sidebar'
import { CanvasPreview }     from './components/CanvasPreview'
import { Transport }         from './components/Transport'
import './App.css'

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // 오디오 엔진
  const audio = useAudioEngine()

  // UI 상태
  const [fileName,      setFileName]      = useState('')
  const [vizType,       setVizType]       = useState<VizType>('bars')
  const [colorPreset,   setColorPreset]   = useState(0)
  const [effects,       setEffects]       = useState<EffectsConfig>(DEFAULT_EFFECTS)
  const [exportConfig,  setExportConfig]  = useState<ExportConfig>({
    resolution: '1920x1080',
    bitrateM:   8,
  })

  // 파일 로드
  const handleFileLoad = async (file: File) => {
    await audio.loadFile(file)
    setFileName(file.name)
  }

  // 내보내기
  const { status: exportStatus, progress: exportProgress, startExport } = useExport({
    audioBuffer:      audio.analyser.current
      ? null   // analyser가 있으면 AudioBuffer는 hook 내부에서 관리
      : null,  // ← Task 15 보충: audioBufferRef를 useAudioEngine에서 expose해야 함
    vizType,
    colorPresetIndex: colorPreset,
    effects,
    exportConfig,
  })

  // 비주얼라이저 루프
  useVisualizerLoop({
    canvasRef,
    analyserRef: audio.analyser,
    vizType,
    colorPreset,
    effects,
    isPlaying: audio.isPlaying,
  })

  return (
    <div className="app">
      <Sidebar
        fileName={fileName}
        vizType={vizType}
        colorPreset={colorPreset}
        effects={effects}
        exportConfig={exportConfig}
        exportStatus={exportStatus}
        exportProgress={exportProgress}
        onFileLoad={handleFileLoad}
        onVizType={setVizType}
        onColorPreset={setColorPreset}
        onEffects={setEffects}
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

> **⚠️ 보충 작업**: `useAudioEngine`에서 `audioBufferRef`를 반환값에 추가하고 `useExport`에 전달해야 한다.
>
> `useAudioEngine.ts`의 반환 인터페이스와 반환문에 `audioBuffer: React.RefObject<AudioBuffer | null>` 항목을 추가한다.
> `App.tsx`의 useExport 호출에서 `audioBuffer: audio.audioBuffer.current`로 교체한다.

- [ ] **Step 3: 개발 서버에서 전체 동작 확인**

```bash
npm run dev
```

체크리스트:
- [ ] 앱이 오류 없이 로드된다
- [ ] 데모 비주얼라이저 4종이 전환된다
- [ ] 색상 프리셋 전환 시 즉시 반영된다
- [ ] 이펙트 토글이 동작한다
- [ ] 오디오 파일 드롭 후 재생 시 실제 주파수 데이터로 비주얼라이저가 반응한다
- [ ] Transport 스크러버로 시크 가능하다
- [ ] EXPORT MP4 버튼이 파일 없으면 disabled 상태다

- [ ] **Step 4: TypeScript 빌드 확인**

```bash
npm run build
```

Expected: 오류 없이 `dist/` 생성

- [ ] **Step 5: 최종 Commit**

```bash
git add src/App.tsx src/App.css src/hooks/useAudioEngine.ts
git commit -m "feat: integrate all components — SPECTRA v1.0 complete"
```

---

## Self-Review

**스펙 커버리지 점검:**
- [x] 오디오 파일 드롭존 (AudioPanel)
- [x] 비주얼라이저 4종 (bars, circular, wave, particles)
- [x] 색상 프리셋 5종
- [x] 이펙트 4종 (비트 펄스, 필름 그레인, 색수차, 베이스 파동)
- [x] MP4 내보내기 (WebCodecs + mp4-muxer Worker)
- [x] 해상도 선택 3종 (720p/1080p/4K)
- [x] 비트레이트 슬라이더
- [x] 재생/정지/시크 Transport
- [x] WebCodecs 미지원 브라우저 안내 (useExport 내 `typeof VideoEncoder` 체크)
- [x] 데모 모드 (오디오 없을 때 가짜 주파수)

**타입 일관성 점검:**
- `RendererOptions.colors`는 `[string, string, string]` — `ColorPreset.colors`와 일치
- `WorkerStartMessage.audioBuffer`는 `ArrayBuffer` — useExport에서 `rawPCM`으로 직렬화
- `ExportConfig.resolution`은 `ExportResolution` 타입 — `RESOLUTIONS[].value`와 일치

**보완 필요:**
- Task 15에서 `useAudioEngine`이 `audioBufferRef`를 expose하도록 수정 필요 (Step 2 ⚠️ 보충 참조)
- `effects.ts`의 `ctx.canvas` 참조 (chromatic 효과) — OffscreenCanvasRenderingContext2D에서 `canvas` 속성 접근 가능 확인 필요. 문제 시 Worker에서 chromatic 효과를 건너뛴다.
