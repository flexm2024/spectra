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

export type BgType = 'none' | 'image' | 'gradient' | 'scene'

export interface OverlayConfig {
  bgType:       BgType
  bgImage:      ImageBitmap | null
  bgGradient:   [string, string]
  bgSceneIndex: number
  logo:         ImageBitmap | null
  stickers:     ImageBitmap[]
}
