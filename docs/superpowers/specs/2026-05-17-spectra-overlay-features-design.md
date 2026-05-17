# SPECTRA — Overlay & Export 기능 추가 설계

**날짜:** 2026-05-17  
**상태:** 승인됨  
**범위:** 기존 SPECTRA v1.0에 6개 기능 추가

---

## 배경

레퍼런스 앱(SPECTRUM STUDIO PRO V2)과 비교하여 다음 기능이 누락되어 있음.
기존 코드 구조를 유지하면서 기능만 추가한다.

---

## 추가할 기능

| 기능 | 설명 |
|------|------|
| 재생 횟수 | 내보내기 시 반복 횟수 (1/2/3회) |
| 오디오 품질 | AAC 비트레이트 (96k/128k/192k) |
| 렌더링 프로파일 | 비트레이트 슬라이더 → 품질(16M)/균형(8M)/속도(6M) 버튼 |
| 배경 이미지/영상 | 이미지 or MP4 첫 프레임을 캔버스 배경으로 표시 |
| 채널 로고 | PNG 업로드 → 캔버스 우하단 오버레이 (80px) |
| 스티커 최대 5개 | PNG 업로드 → 캔버스 좌상단부터 순서 배치 (64px) |

---

## 아키텍처: Approach A — 오버레이 레이어 패턴

preview 루프와 export worker가 동일한 렌더 로직을 공유.
미리보기 결과와 내보내기 결과가 일치함.

### 렌더 순서

```
1. 배경 (이미지 or 그라디언트 or 씬 색상)
2. 비주얼라이저 (기존 bars/circular/wave/particles)
3. 채널 로고 (우하단 고정)
4. 스티커 (좌상단부터 순서대로)
```

---

## 타입 변경

### ExportConfig 확장 (`src/types.ts`)

```ts
export interface ExportConfig {
  resolution:    ExportResolution
  bitrateM:      8 | 16 | 6        // 렌더링 프로파일
  loopCount:     1 | 2 | 3         // 재생 횟수 (신규)
  audioBitrateK: 96 | 128 | 192    // 오디오 품질 (신규)
}
```

### OverlayConfig 신규 추가 (`src/types.ts`)

```ts
export type BgType = 'none' | 'image' | 'gradient' | 'scene'

export interface OverlayConfig {
  bgType:       BgType
  bgImage:      ImageBitmap | null      // 미디어 탭: 이미지/영상 첫 프레임
  bgGradient:   [string, string]        // 그라디언트 탭: 시작/끝 색
  bgSceneIndex: number                  // 씬 탭: 프리셋 인덱스 (0~5)
  logo:         ImageBitmap | null      // 채널 로고
  stickers:     ImageBitmap[]           // PNG 스티커 (최대 5개)
}
```

### WorkerStartMessage 확장 (`src/types.ts`)

ImageBitmap은 Transferable이므로 worker로 직접 전달 가능.

```ts
export interface WorkerStartMessage {
  // 기존 필드 유지 ...
  loopCount:     number
  audioBitrateK: number
  // 오버레이 필드 추가
  bgType:        BgType
  bgImage:       ImageBitmap | null
  bgGradient:    [string, string]
  bgSceneIndex:  number
  logo:          ImageBitmap | null
  stickers:      ImageBitmap[]
}
```

---

## 컴포넌트 변경

### 신규 컴포넌트

| 파일 | 역할 |
|------|------|
| `src/components/panels/BackgroundPanel.tsx` | 배경 탭 4개 (없음/미디어/그라디언트/씬) |
| `src/components/panels/LogoStickerPanel.tsx` | 로고 업로드 + 스티커 슬롯 5개 |

### 수정 컴포넌트

| 파일 | 변경 내용 |
|------|-----------|
| `src/components/panels/ExportPanel.tsx` | 슬라이더 → 프로파일 버튼 3개, 재생횟수/오디오품질 버튼 추가 |
| `src/components/Sidebar.tsx` | 새 패널 2개 추가 |
| `src/components/CanvasPreview.tsx` | overlayConfig prop 추가 (미사용, 오버레이는 loop에서 처리) |
| `src/App.tsx` | overlayConfig 상태 추가, 관련 props 전달 |

### BackgroundPanel 탭 구성

- **없음:** 단색 검정 배경 (기본)
- **미디어:** 이미지(PNG/JPG/WebP) or 동영상(MP4) 파일 업로드 → `createImageBitmap`으로 변환
- **그라디언트:** 색상 2개 피커 → `CanvasGradient`로 렌더
- **씬:** 프리셋 6개 카드 (색상 조합, 선택 시 배경에 적용)

### LogoStickerPanel 구성

- 로고: 단일 이미지 업로드, 삭제 버튼
- 스티커: 슬롯 5개, 각각 독립적으로 업로드/삭제 가능

---

## 렌더링 변경

### useVisualizerLoop 변경 (`src/hooks/useVisualizerLoop.ts`)

`overlayConfig` 파라미터 추가. 렌더 루프 시작 시:
1. 배경 렌더 (bgType에 따라 분기)
2. 기존 비주얼라이저 렌더 (변경 없음)
3. 로고 렌더 (우하단, 80×80px, alpha 0.85)
4. 스티커 렌더 (좌상단부터 64×64px 간격 배치)

배경/오버레이 렌더 함수는 `src/renderers/overlay.ts`로 분리.

### encoder.worker 변경 (`src/workers/encoder.worker.ts`)

- `loopCount`만큼 오디오/비디오 반복 인코딩
- `audioBitrateK`로 AAC 비트레이트 설정
- 오버레이 필드를 받아 동일한 `overlay.ts` 렌더 함수 사용

---

## 상수 추가 (`src/constants.ts`)

```ts
export const BITRATE_PROFILES = [
  { label: '품질', bitrateM: 16 },
  { label: '균형', bitrateM: 8 },
  { label: '속도', bitrateM: 6 },
]

export const BG_SCENES = [
  { name: 'DEEP SPACE', colors: ['#0a0a1a', '#1a0a2e'] },
  { name: 'MIDNIGHT',   colors: ['#0d0d0d', '#1a1a2e'] },
  { name: 'FOREST',     colors: ['#0a1a0a', '#0d2b0d'] },
  { name: 'OCEAN',      colors: ['#0a0a2e', '#001a3a'] },
  { name: 'SUNSET',     colors: ['#1a0a00', '#2e1a00'] },
  { name: 'ROSE',       colors: ['#1a0a0a', '#2e0a1a'] },
]

export const DEFAULT_OVERLAY: OverlayConfig = {
  bgType:       'none',
  bgImage:      null,
  bgGradient:   ['#0a0a1a', '#1a0a2e'],
  bgSceneIndex: 0,
  logo:         null,
  stickers:     [],
}
```

---

## 파일별 작업 요약

| 파일 | 작업 |
|------|------|
| `src/types.ts` | ExportConfig 확장, OverlayConfig/BgType 추가, WorkerStartMessage 확장 |
| `src/constants.ts` | BITRATE_PROFILES, BG_SCENES, DEFAULT_OVERLAY 추가 |
| `src/renderers/overlay.ts` | 신규 — 배경/로고/스티커 렌더 함수 |
| `src/hooks/useVisualizerLoop.ts` | overlayConfig 파라미터 추가, 오버레이 렌더 호출 |
| `src/hooks/useExport.ts` | loopCount/audioBitrateK/overlay 필드 worker에 전달 |
| `src/workers/encoder.worker.ts` | loopCount 반복, audioBitrateK 적용, 오버레이 렌더 |
| `src/components/panels/BackgroundPanel.tsx` | 신규 |
| `src/components/panels/LogoStickerPanel.tsx` | 신규 |
| `src/components/panels/ExportPanel.tsx` | 프로파일 버튼, 재생횟수, 오디오품질 UI |
| `src/components/Sidebar.tsx` | 새 패널 2개 마운트 |
| `src/App.tsx` | overlayConfig 상태 추가 |

---

## 제외 범위

- 스티커 위치/크기 드래그 조작 (고정 배치만)
- GIF 애니메이션 (PNG 정적 이미지만)
- 배경 영상 재생 (MP4 첫 프레임만 스틸로 사용)
- 스티커/로고 회전

---

## 테스트 계획

- `overlay.ts` 유닛 테스트: 배경 렌더, 로고 렌더, 스티커 렌더 함수별 Canvas mock 테스트
- 기존 `utils.test.ts` 9개 통과 유지
- `npm run build` 타입 오류 없음 확인
