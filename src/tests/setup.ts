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
