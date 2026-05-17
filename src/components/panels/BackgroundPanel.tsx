// src/components/panels/BackgroundPanel.tsx — 배경 설정 패널
import { useState } from 'react'
import type { OverlayConfig, BgType } from '../../types'
import { BG_SCENES } from '../../constants'

interface Props {
  overlay:   OverlayConfig
  onChange:  (o: OverlayConfig) => void
}

const TABS: { id: BgType; label: string }[] = [
  { id: 'none',     label: '없음'      },
  { id: 'image',    label: '미디어'    },
  { id: 'gradient', label: '그라디언트' },
  { id: 'scene',    label: '씬'        },
]

export function BackgroundPanel({ overlay, onChange }: Props) {
  const [isDragging, setIsDragging] = useState(false)

  const setTab = (bgType: BgType) => onChange({ ...overlay, bgType })

  const loadImageFile = async (file: File) => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) return
    let bitmap: ImageBitmap
    if (file.type.startsWith('video/')) {
      const video = document.createElement('video')
      video.src = URL.createObjectURL(file)
      await new Promise<void>(res => { video.onloadeddata = () => res() })
      video.currentTime = 0
      await new Promise<void>(res => { video.onseeked = () => res() })
      bitmap = await createImageBitmap(video)
      URL.revokeObjectURL(video.src)
    } else {
      bitmap = await createImageBitmap(file)
    }
    onChange({ ...overlay, bgType: 'image', bgImage: bitmap })
  }

  const openPicker = () => {
    const inp = document.createElement('input')
    inp.type   = 'file'
    inp.accept = 'image/*,video/mp4'
    inp.onchange = e => {
      const f = (e.target as HTMLInputElement).files?.[0]
      if (f) loadImageFile(f)
    }
    inp.click()
  }

  return (
    <section className="panel">
      <h3 className="panel-label">배경</h3>

      <div className="tab-row">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`tab-btn${overlay.bgType === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {overlay.bgType === 'image' && (
        <div
          className={`dropzone small${isDragging ? ' dragover' : ''}`}
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => {
            e.preventDefault(); setIsDragging(false)
            const f = e.dataTransfer.files[0]; if (f) loadImageFile(f)
          }}
          onClick={openPicker}
        >
          {overlay.bgImage ? (
            <span className="file-hint">배경 로드됨 — 클릭하여 변경</span>
          ) : (
            <span className="drop-text">이미지 / MP4 드롭</span>
          )}
        </div>
      )}

      {overlay.bgType === 'gradient' && (
        <div className="gradient-row">
          <label className="setting-label">시작</label>
          <input
            type="color"
            value={overlay.bgGradient[0]}
            onChange={e => onChange({ ...overlay, bgGradient: [e.target.value, overlay.bgGradient[1]] })}
          />
          <label className="setting-label">끝</label>
          <input
            type="color"
            value={overlay.bgGradient[1]}
            onChange={e => onChange({ ...overlay, bgGradient: [overlay.bgGradient[0], e.target.value] })}
          />
        </div>
      )}

      {overlay.bgType === 'scene' && (
        <div className="scene-grid">
          {BG_SCENES.map((scene, i) => (
            <button
              key={scene.name}
              className={`scene-card${overlay.bgSceneIndex === i ? ' active' : ''}`}
              style={{ background: `linear-gradient(135deg, ${scene.colors[0]}, ${scene.colors[1]})` }}
              onClick={() => onChange({ ...overlay, bgSceneIndex: i })}
            >
              <span className="scene-name">{scene.name}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
