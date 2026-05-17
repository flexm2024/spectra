// src/App.tsx — SPECTRA 앱 루트: 상태 관리 + 레이아웃
import { useState, useRef } from 'react'
import type { VizType, EffectsConfig, ExportConfig } from './types'
import { DEFAULT_EFFECTS } from './constants'
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
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    resolution: '1920x1080',
    bitrateM:   8,
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
    exportConfig,
  })

  useVisualizerLoop({
    canvasRef,
    analyserRef: audio.analyser,
    vizType,
    colorPreset,
    effects,
    isPlaying: audio.isPlaying,
  })

  return (
    <div className="app">
      <Sidebar
        fileName={fileName}
        vizType={vizType}
        colorPreset={colorPreset}
        effects={effects}
        exportConfig={exportConfig}
        exportStatus={exportStatus}
        exportProgress={exportProgress}
        onFileLoad={handleFileLoad}
        onVizType={setVizType}
        onColorPreset={setColorPreset}
        onEffects={setEffects}
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
