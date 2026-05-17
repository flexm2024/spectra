// src/hooks/useVisualizerLoop.ts — rAF 루프, analyser → 렌더러 연결
import { useEffect, useRef } from 'react'
import type { VizType, EffectsConfig, OverlayConfig } from '../types'
import { COLOR_PRESETS, FFT_SIZE } from '../constants'
import { renderBars }      from '../renderers/bars'
import { renderCircular }  from '../renderers/circular'
import { renderWave }      from '../renderers/wave'
import { renderParticles } from '../renderers/particles'
import { applyEffects }    from '../renderers/effects'
import { drawBackground, drawLogo, drawStickers } from '../renderers/overlay'

interface Options {
  canvasRef:    React.RefObject<HTMLCanvasElement | null>
  analyserRef:  React.RefObject<AnalyserNode | null>
  vizType:      VizType
  colorPreset:  number
  effects:      EffectsConfig
  overlay:      OverlayConfig
  isPlaying:    boolean
}

export function useVisualizerLoop({
  canvasRef, analyserRef, vizType, colorPreset, effects, overlay, isPlaying,
}: Options): void {
  const animRef = useRef(0)
  const timeRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const colors = COLOR_PRESETS[colorPreset].colors
    const freqData = new Uint8Array(FFT_SIZE / 2)
    const timeData = new Uint8Array(FFT_SIZE)

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

      drawBackground(ctx, overlay, W, H, colors)

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

      drawLogo(ctx, overlay.logo, W, H)
      drawStickers(ctx, overlay.stickers)

      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(animRef.current)
      ro.disconnect()
    }
  }, [canvasRef, analyserRef, vizType, colorPreset, effects, overlay, isPlaying])
}
