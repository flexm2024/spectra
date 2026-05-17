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
