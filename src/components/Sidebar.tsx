// src/components/Sidebar.tsx — 패널 5개 조합 컨테이너
import type { VizType, EffectsConfig, ExportConfig, ExportStatus } from '../types'
import { AudioPanel }      from './panels/AudioPanel'
import { VisualizerPanel } from './panels/VisualizerPanel'
import { ColorPanel }      from './panels/ColorPanel'
import { EffectsPanel }    from './panels/EffectsPanel'
import { ExportPanel }     from './panels/ExportPanel'

interface Props {
  fileName:      string
  vizType:       VizType
  colorPreset:   number
  effects:       EffectsConfig
  exportConfig:  ExportConfig
  exportStatus:  ExportStatus
  exportProgress:number
  onFileLoad:    (file: File) => Promise<void>
  onVizType:     (v: VizType) => void
  onColorPreset: (i: number) => void
  onEffects:     (e: EffectsConfig) => void
  onExportConfig:(c: ExportConfig) => void
  onExport:      () => void
}

export function Sidebar(props: Props) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-icon">◈</span>
        <span className="brand-name">SPECTRA</span>
        <span className="brand-version">v1.0</span>
      </div>
      <AudioPanel      fileName={props.fileName}      onFileLoad={props.onFileLoad} />
      <VisualizerPanel vizType={props.vizType}        onChange={props.onVizType} />
      <ColorPanel      preset={props.colorPreset}     onChange={props.onColorPreset} />
      <EffectsPanel    effects={props.effects}        onChange={props.onEffects} />
      <ExportPanel
        config={props.exportConfig}
        status={props.exportStatus}
        progress={props.exportProgress}
        hasFile={!!props.fileName}
        onChange={props.onExportConfig}
        onExport={props.onExport}
      />
    </aside>
  )
}
