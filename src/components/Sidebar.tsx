// src/components/Sidebar.tsx — 패널 7개 조합 컨테이너
import type { VizType, EffectsConfig, ExportConfig, ExportStatus, OverlayConfig } from '../types'
import { AudioPanel }        from './panels/AudioPanel'
import { VisualizerPanel }   from './panels/VisualizerPanel'
import { ColorPanel }        from './panels/ColorPanel'
import { EffectsPanel }      from './panels/EffectsPanel'
import { BackgroundPanel }   from './panels/BackgroundPanel'
import { LogoStickerPanel }  from './panels/LogoStickerPanel'
import { ExportPanel }       from './panels/ExportPanel'

interface Props {
  fileName:       string
  vizType:        VizType
  colorPreset:    number
  effects:        EffectsConfig
  overlay:        OverlayConfig
  exportConfig:   ExportConfig
  exportStatus:   ExportStatus
  exportProgress: number
  onFileLoad:     (file: File) => Promise<void>
  onVizType:      (v: VizType) => void
  onColorPreset:  (i: number) => void
  onEffects:      (e: EffectsConfig) => void
  onOverlay:      (o: OverlayConfig) => void
  onExportConfig: (c: ExportConfig) => void
  onExport:       () => void
}

export function Sidebar(props: Props) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-icon">◈</span>
        <span className="brand-name">SPECTRA</span>
        <span className="brand-version">v2.0</span>
      </div>
      <AudioPanel      fileName={props.fileName}      onFileLoad={props.onFileLoad} />
      <BackgroundPanel overlay={props.overlay}        onChange={props.onOverlay} />
      <LogoStickerPanel overlay={props.overlay}       onChange={props.onOverlay} />
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
