// src/components/panels/AudioPanel.tsx — 오디오 파일 업로드 패널
import { useState } from 'react'

interface Props {
  fileName:    string
  onFileLoad:  (file: File) => Promise<void>
}

export function AudioPanel({ fileName, onFileLoad }: Props) {
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = (file: File) => {
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|flac|ogg|m4a)$/i)) return
    onFileLoad(file)
  }

  const openPicker = () => {
    const inp = document.createElement('input')
    inp.type   = 'file'
    inp.accept = 'audio/*'
    inp.onchange = e => {
      const f = (e.target as HTMLInputElement).files?.[0]
      if (f) handleFile(f)
    }
    inp.click()
  }

  return (
    <section className="panel">
      <h3 className="panel-label">AUDIO</h3>
      <div
        className={`dropzone${isDragging ? ' dragover' : ''}`}
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => {
          e.preventDefault(); setIsDragging(false)
          const f = e.dataTransfer.files[0]; if (f) handleFile(f)
        }}
        onClick={openPicker}
      >
        {fileName ? (
          <>
            <div className="file-icon">♪</div>
            <div className="file-name">{fileName}</div>
            <div className="file-hint">클릭하여 변경</div>
          </>
        ) : (
          <>
            <div className="drop-icon">↓</div>
            <div className="drop-text">DROP AUDIO</div>
            <div className="drop-hint">MP3 · WAV · FLAC · OGG</div>
          </>
        )}
      </div>
    </section>
  )
}
