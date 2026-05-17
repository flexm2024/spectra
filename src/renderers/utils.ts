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
  if (bands.length === 0) return 0
  const end = Math.max(1, Math.floor(bands.length * 0.08))
  let sum = 0
  for (let i = 0; i < end; i++) sum += bands[i]
  return sum / end
}

export function makeFreqBands(freqData: Uint8Array, bandCount: number): Float32Array {
  return averageBands(normalizeFreqData(freqData), bandCount)
}
