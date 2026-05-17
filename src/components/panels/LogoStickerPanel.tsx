// src/components/panels/LogoStickerPanel.tsx — 로고/스티커 업로드 패널
import type { OverlayConfig } from '../../types'

interface Props {
  overlay:  OverlayConfig
  onChange: (o: OverlayConfig) => void
}

async function fileToImageBitmap(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file)
}

function openImagePicker(onFile: (f: File) => void) {
  const inp = document.createElement('input')
  inp.type   = 'file'
  inp.accept = 'image/png,image/jpeg,image/webp'
  inp.onchange = e => {
    const f = (e.target as HTMLInputElement).files?.[0]
    if (f) onFile(f)
  }
  inp.click()
}

export function LogoStickerPanel({ overlay, onChange }: Props) {
  const handleLogoLoad = async (file: File) => {
    const bitmap = await fileToImageBitmap(file)
    onChange({ ...overlay, logo: bitmap })
  }

  const handleStickerLoad = async (file: File, index: number) => {
    const bitmap = await fileToImageBitmap(file)
    const next = [...overlay.stickers]
    next[index] = bitmap
    onChange({ ...overlay, stickers: next })
  }

  const removeLogo = () => onChange({ ...overlay, logo: null })

  const removeSticker = (index: number) => {
    const next = overlay.stickers.filter((_, i) => i !== index)
    onChange({ ...overlay, stickers: next })
  }

  return (
    <section className="panel">
      <h3 className="panel-label">로고 / 스티커</h3>

      <div className="overlay-row">
        <span className="setting-label">채널 로고</span>
        {overlay.logo ? (
          <button className="remove-btn" onClick={removeLogo}>삭제</button>
        ) : (
          <button
            className="upload-btn"
            onClick={() => openImagePicker(handleLogoLoad)}
          >
            업로드
          </button>
        )}
        {overlay.logo && <span className="loaded-badge">로드됨</span>}
      </div>

      <div className="setting-label" style={{ marginTop: '8px' }}>
        스티커 (최대 5개)
      </div>
      <div className="sticker-slots">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="sticker-slot">
            {overlay.stickers[i] ? (
              <button className="sticker-remove" onClick={() => removeSticker(i)}>✕</button>
            ) : (
              <button
                className="sticker-add"
                onClick={() => openImagePicker(f => handleStickerLoad(f, i))}
              >
                +
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
