// src/hooks/useExport.ts — Worker 통신 + Blob 다운로드
import { useRef, useState, useCallback } from 'react'
import type { VizType, EffectsConfig, ExportConfig, ExportStatus, OverlayConfig, WorkerOutMessage, WorkerStartMessage } from '../types'
import { RESOLUTIONS, FPS } from '../constants'

interface Options {
  audioBuffer:      AudioBuffer | null
  vizType:          VizType
  colorPresetIndex: number
  effects:          EffectsConfig
  overlay:          OverlayConfig
  exportConfig:     ExportConfig
}

export interface ExportAPI {
  status:      ExportStatus
  progress:    number
  startExport: () => void
}

export function useExport({
  audioBuffer, vizType, colorPresetIndex, effects, overlay, exportConfig,
}: Options): ExportAPI {
  const workerRef = useRef<Worker | null>(null)
  const [status,   setStatus]   = useState<ExportStatus>('idle')
  const [progress, setProgress] = useState(0)

  const startExport = useCallback(async () => {
    if (!audioBuffer || status === 'encoding') return

    if (typeof VideoEncoder === 'undefined') {
      alert('이 브라우저는 WebCodecs를 지원하지 않습니다.\nChrome 94+ 또는 Edge 94+를 사용해주세요.')
      return
    }

    const res = RESOLUTIONS.find(r => r.value === exportConfig.resolution) ?? RESOLUTIONS[1]

    const { numberOfChannels, sampleRate, length: sampleLength, duration } = audioBuffer
    const rawPCM = new ArrayBuffer(numberOfChannels * sampleLength * 4)
    for (let ch = 0; ch < numberOfChannels; ch++) {
      const dst = new Float32Array(rawPCM, ch * sampleLength * 4, sampleLength)
      dst.set(audioBuffer.getChannelData(ch))
    }

    // ImageBitmap은 transfer 시 main thread에서 detach됨 → clone 후 전송
    const bgImage  = overlay.bgImage  ? await createImageBitmap(overlay.bgImage)  : null
    const logo     = overlay.logo     ? await createImageBitmap(overlay.logo)     : null
    const stickers = await Promise.all(overlay.stickers.map(s => createImageBitmap(s)))

    workerRef.current?.terminate()
    workerRef.current = new Worker(
      new URL('../workers/encoder.worker.ts', import.meta.url),
      { type: 'module' },
    )

    workerRef.current.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
      const msg = e.data
      if (msg.type === 'progress') {
        setProgress(msg.progress)
      } else if (msg.type === 'done') {
        setStatus('done')
        setProgress(1)
        const blob = new Blob([msg.buffer], { type: 'video/mp4' })
        const url  = URL.createObjectURL(blob)
        const a    = document.createElement('a')
        a.href     = url
        a.download = `spectra-${Date.now()}.mp4`
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 10_000)
      } else if (msg.type === 'error') {
        console.error('Export error:', msg.error)
        setStatus('error')
      }
    }

    const transferables: Transferable[] = [rawPCM]
    if (bgImage)  transferables.push(bgImage)
    if (logo)     transferables.push(logo)
    stickers.forEach(s => transferables.push(s))

    const msg: WorkerStartMessage = {
      type:             'start',
      audioBuffer:      rawPCM,
      sampleRate,
      numberOfChannels,
      duration,
      vizType,
      colorPresetIndex,
      effects,
      width:            res.w,
      height:           res.h,
      bitrateM:         exportConfig.bitrateM,
      fps:              FPS,
      loopCount:        exportConfig.loopCount,
      audioBitrateK:    exportConfig.audioBitrateK,
      bgType:           overlay.bgType,
      bgImage,
      bgGradient:       overlay.bgGradient,
      bgSceneIndex:     overlay.bgSceneIndex,
      logo,
      stickers,
    }
    workerRef.current.postMessage(msg, transferables)
    setStatus('encoding')
    setProgress(0)
  }, [audioBuffer, status, exportConfig, vizType, colorPresetIndex, effects, overlay])

  return { status, progress, startExport }
}
