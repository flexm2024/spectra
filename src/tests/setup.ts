// Canvas 2D context 메서드 mock — happy-dom은 canvas를 미지원

function makeMockContext(canvas: MockCanvas) {
  return {
    canvas,
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
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    roundRect: () => {},
    putImageData: () => {},
    createImageData: (_w: number, _h: number) => ({
      data: new Uint8ClampedArray(_w * _h * 4),
    }),
    drawImage: () => {},
    shadowBlur: 0,
    shadowColor: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    globalAlpha: 1,
    lineCap: 'butt',
    globalCompositeOperation: 'source-over',
  }
}

class MockCanvas {
  width = 300
  height = 150

  getContext(_type: string) {
    return makeMockContext(this)
  }
}

Object.defineProperty(window, 'HTMLCanvasElement', {
  value: MockCanvas,
  writable: true,
})

// OffscreenCanvas mock — encoder.worker.ts에서 사용
class MockOffscreenCanvas {
  width: number
  height: number
  constructor(width: number, height: number) {
    this.width = width
    this.height = height
  }
  getContext(_type: string) {
    return makeMockContext(new MockCanvas())
  }
}

Object.defineProperty(globalThis, 'OffscreenCanvas', {
  value: MockOffscreenCanvas,
  writable: true,
})
