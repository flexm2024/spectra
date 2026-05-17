// src/App.tsx — SPECTRA 앱 루트: 상태 관리 + 레이아웃
import { useState, useRef } from 'react'
import type { VizType, EffectsConfig, ExportConfig, OverlayConfig } from './types'
import { DEFAULT_EFFECTS, DEFAULT_OVERLAY } from './constants'
import { useAudioEngine }    from './hooks/useAudioEngine'
import { useVisualizerLoop } from './hooks/useVisualizerLoop'
import { useExport }         from './hooks/useExport'
import { Sidebar }           from './components/Sidebar'
import { CanvasPreview }     from './components/CanvasPreview'
import { Transport }         from './components/Transport'
import './App.css'

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const audio = useAudioEngine()

  const [fileName,     setFileName]     = useState('')
  const [vizType,      setVizType]      = useState<VizType>('bars')
  const [colorPreset,  setColorPreset]  = useState(0)
  const [effects,      setEffects]      = useState<EffectsConfig>(DEFAULT_EFFECTS)
  const [overlay,      setOverlay]      = useState<OverlayConfig>(DEFAULT_OVERLAY)
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    resolution:    '1920x1080',
    bitrateM:      8,
    loopCount:     1,
    audioBitrateK: 128,
  })

  const handleFileLoad = async (file: File) => {
    await audio.loadFile(file)
    setFileName(file.name)
  }

  const { status: exportStatus, progress: exportProgress, startExport } = useExport({
    audioBuffer:      audio.audioBuffer.current,
    vizType,
    colorPresetIndex: colorPreset,
    effects,
    overlay,
    exportConfig,
  })

  useVisualizerLoop({
    canvasRef,
    analyserRef: audio.analyser,
    vizType,
    colorPreset,
    effects,
    overlay,
    isPlaying: audio.isPlaying,
  })

  return (
    <div className="app">
      <Sidebar
        fileName={fileName}
        vizType={vizType}
        colorPreset={colorPreset}
        effects={effects}
        overlay={overlay}
        exportConfig={exportConfig}
        exportStatus={exportStatus}
        exportProgress={exportProgress}
        onFileLoad={handleFileLoad}
        onVizType={setVizType}
        onColorPreset={setColorPreset}
        onEffects={setEffects}
        onOverlay={setOverlay}
        onExportConfig={setExportConfig}
        onExport={startExport}
      />
      <main className="main">
        <CanvasPreview ref={canvasRef} hasFile={!!fileName} />
        <Transport
          isPlaying={audio.isPlaying}
          currentTime={audio.currentTime}
          duration={audio.duration}
          onPlay={audio.play}
          onPause={audio.pause}
          onSeek={audio.seek}
          onRestart={() => audio.seek(0)}
        />
      </main>
    </div>
  )
}
