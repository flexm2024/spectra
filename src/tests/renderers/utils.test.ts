// src/tests/renderers/utils.test.ts — 렌더러 유틸리티 함수 단위 테스트
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
