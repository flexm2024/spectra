# SPECTRA — Music Visualizer 설계 문서

**날짜**: 2026-05-17  
**상태**: 승인됨  
**플랫폼**: 웹 앱 (Vite + React + TypeScript)

---

## 1. 개요

로컬 오디오 파일(MP3/WAV/FLAC/OGG)을 불러와 실시간 비주얼라이저를 렌더링하고, MP4 영상으로 내보내는 웹 앱. Spectrum Studio PRO V2와 동일한 컨셉, 웹 브라우저에서 실행.

**핵심 사용자 흐름**
1. 오디오 파일 드래그앤드롭 업로드
2. 비주얼라이저 타입·색상·이펙트 실시간 조정
3. 미리보기 캔버스에서 결과 확인
4. 해상도·비트레이트 설정 후 MP4 내보내기

---

## 2. 기술 스택

| 역할 | 선택 | 이유 |
|------|------|------|
| 빌드 | Vite + React + TypeScript | 현 프로젝트 기반 |
| 렌더링 | Canvas 2D API | 충분한 성능, WebGL 불필요 |
| 오디오 분석 | Web Audio API (AnalyserNode) | 브라우저 내장, 설치 없음 |
| MP4 인코딩 | WebCodecs API + mp4-muxer | 오프라인 인코딩, 고품질 출력 |
| 인코딩 워커 | Web Worker (OffscreenCanvas) | 메인 스레드 블로킹 방지 |

---

## 3. UI 설계 (승인됨)

**레이아웃**: 좌측 사이드바(300px) + 중앙 캔버스 + 하단 트랜스포트 바

**디자인 방향**: 다크 럭셔리 / 시네마틱 스튜디오
- 배경: `#07070f` (딥 스페이스 블랙)
- 포인트: `#7C5CFC` (바이올렛)
- 폰트: Bebas Neue (레이블) + Syne (UI 텍스트) + Syne Mono (수치)

**사이드바 패널 (위→아래)**
1. **AUDIO** — 드래그앤드롭 업로드 존 (MP3/WAV/FLAC/OGG)
2. **VISUALIZER** — 4종 타입 선택 (BARS / CIRCLE / WAVE / PARTICLE)
3. **COLOR** — 5개 색상 프리셋 (NEBULA / INFERNO / AURORA / LUNAR / SOLAR)
4. **EFFECTS** — 이펙트 토글 4종 (비트 펄스 / 필름 그레인 / 색수차 / 베이스 파동)
5. **EXPORT** — 해상도 선택 + 비트레이트 슬라이더 + EXPORT MP4 버튼

**트랜스포트 바**
- 재생/정지/처음으로 버튼
- 프로그레스 스크러버 (클릭 가능)
- 현재 시간 / 총 길이 표시

---

## 4. 핵심 모듈 설계

### 4-1. AudioEngine
```
AudioContext
  └─ MediaElementSourceNode (또는 AudioBufferSourceNode)
       └─ AnalyserNode (fftSize: 2048)
            ├─ getByteFrequencyData() → Uint8Array (주파수 데이터)
            └─ getByteTimeDomainData() → Uint8Array (파형 데이터)
```
- 파일 로드: `FileReader` → `AudioContext.decodeAudioData()`
- 매 프레임: `analyser.getByteFrequencyData(freqData)` 호출

### 4-2. VisualizerRenderer
Canvas 2D로 4가지 비주얼라이저 렌더링. 매 프레임 `requestAnimationFrame` 루프.

| 타입 | 렌더링 방식 |
|------|-------------|
| BARS | 주파수 배열 → 수직 막대, 상단 발광 캡, 하단 반사 |
| CIRCLE | 원형 배열로 막대 배치, 중앙 방사형 글로우 |
| WAVE | 시간 도메인 데이터 → 멀티 레이어 파형 |
| PARTICLE | 골든 앵글 배치 + 주파수 연동 반지름·크기 |

이펙트 후처리:
- **비트 펄스**: 저주파 에너지에 비례해 캔버스 밝기 미세 증가
- **베이스 파동**: 저주파 에너지 감지 시 동심원 파동 오버레이
- **필름 그레인**: 랜덤 노이즈 픽셀 합성 (ImageData)
- **색수차**: RGB 채널 미세 오프셋 렌더링

### 4-3. ExportEngine (Web Worker)
```
메인 스레드                        Worker
─────────────────                  ─────────────────────────────
설정 전송 (postMessage)    →       OffscreenCanvas 수신
                                   AudioBuffer 디코딩
                                   프레임별 렌더링 루프
                                   VideoEncoder (WebCodecs)
                                   mp4-muxer 패키징
완료 알림 (onmessage)      ←       ArrayBuffer (MP4 바이너리)
Blob URL → 다운로드
```
- 인코딩 속도: 실시간 재생과 무관하게 최대 속도로 처리
- 코덱: `avc1` (H.264), AudioEncoder: `mp4a.40.2` (AAC)
- 지원 해상도: 720p / 1080p / 4K

---

## 5. 상태 관리

단일 `useVisualizerStore` 훅 (Context + useReducer) 또는 단순 prop drilling (규모 작으므로 후자 우선).

```typescript
interface AppState {
  audioFile:   File | null
  audioBuffer: AudioBuffer | null
  isPlaying:   boolean
  currentTime: number
  duration:    number
  vizType:     'bars' | 'circular' | 'wave' | 'particles'
  colorPreset: number
  effects:     EffectsConfig
  exportConfig: ExportConfig
  exportStatus: 'idle' | 'encoding' | 'done' | 'error'
  exportProgress: number   // 0–1
}
```

---

## 6. 파일 구조 (목표)

```
src/
  App.tsx                  # 루트 레이아웃 + 상태 관리
  App.css                  # 전역 스타일 (완성)
  components/
    Sidebar.tsx            # 사이드바 전체
    panels/
      AudioPanel.tsx       # 오디오 업로드
      VisualizerPanel.tsx  # 타입 선택
      ColorPanel.tsx       # 색상 프리셋
      EffectsPanel.tsx     # 이펙트 토글
      ExportPanel.tsx      # 내보내기 설정
    CanvasPreview.tsx      # 캔버스 + 오버레이
    Transport.tsx          # 트랜스포트 바
  hooks/
    useAudioEngine.ts      # Web Audio API 로직
    useVisualizerLoop.ts   # rAF 렌더링 루프
    useExport.ts           # Worker 통신 + 다운로드
  workers/
    encoder.worker.ts      # WebCodecs + mp4-muxer
  renderers/
    bars.ts                # BARS 렌더러
    circular.ts            # CIRCULAR 렌더러
    wave.ts                # WAVE 렌더러
    particles.ts           # PARTICLES 렌더러
    effects.ts             # 후처리 이펙트
  types.ts                 # 공통 타입 정의
```

---

## 7. 제약 및 결정 사항

- **YouTube 오디오**: 브라우저 CORS 제약으로 직접 접근 불가 → 로컬 파일 입력으로 대체
- **WebCodecs 지원**: Chrome 94+, Edge 94+ 지원. Firefox 미지원 → 지원 안내 메시지 표시
- **필름 그레인 성능**: `ImageData` 픽셀 조작은 고해상도에서 부담 → 미리보기에서만 저해상도 적용, 인코딩 시에는 옵션
- **오디오 포맷**: `AudioContext.decodeAudioData()`로 처리 가능한 포맷만 지원 (MP3/WAV/FLAC/OGG)
