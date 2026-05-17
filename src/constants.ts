// src/constants.ts — 앱 전역 상수
import type { ColorPreset, VizType, ExportResolution, OverlayConfig } from './types'

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

export const BG_SCENES: { colors: [string, string] }[] = [
  { colors: ['#07070f', '#1a1a2e'] },
  { colors: ['#0f0f1e', '#2a1a3a'] },
  { colors: ['#1a0f2e', '#3a1a4a'] },
  { colors: ['#1a1a2e', '#3a3a5e'] },
  { colors: ['#0a0a14', '#1a0a2a'] },
]
