// SPECTRA — YouTube 음악 비주얼라이저 웹앱 UI 셸
import { useState, useEffect, useRef } from 'react'
import './App.css'

const VIZ_TYPES = [
  { id: 'bars',     label: 'BARS',     desc: '주파수 바' },
  { id: 'circular', label: 'CIRCLE',   desc: '원형 스펙트럼' },
  { id: 'wave',     label: 'WAVE',     desc: '파형' },
  { id: 'particles',label: 'PARTICLE', desc: '파티클' },
]

const COLOR_PRESETS = [
  { name: 'NEBULA',   colors: ['#7C5CFC', '#00D4FF', '#FF006E'] },
  { name: 'INFERNO',  colors: ['#FF4D00', '#FF8E00', '#FFE600'] },
  { name: 'AURORA',   colors: ['#00FFB9', '#00D4FF', '#7C5CFC'] },
  { name: 'LUNAR',    colors: ['#CCCCFF', '#8888CC', '#444488'] },
  { name: 'SOLAR',    colors: ['#FFE600', '#FF8E53', '#FF3366'] },
]

const RESOLUTIONS = ['3840×2160 (4K)', '1920×1080 (FHD)', '1280×720 (HD)']

const EFFECTS = [
  { id: 'beatPulse',  label: '비트 펄스' },
  { id: 'filmGrain',  label: '필름 그레인' },
  { id: 'chromatic',  label: '색수차' },
  { id: 'bassRipple', label: '베이스 파동' },
]

export default function App() {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const animRef    = useRef<number>(0)
  const timeRef    = useRef(0)

  const [vizType,   setVizType]   = useState('bars')
  const [preset,    setPreset]    = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [progress,  setProgress]  = useState(0.28)
  const [resolution,setResolution]= useState(RESOLUTIONS[1])
  const [bitrate,   setBitrate]   = useState(8)
  const [hasFile,   setHasFile]   = useState(false)
  const [isDragging,setIsDragging]= useState(false)
  const [fileName,  setFileName]  = useState('')
  const [effects,   setEffects]   = useState<Record<string,boolean>>({
    beatPulse: true, filmGrain: false, chromatic: false, bassRipple: true,
  })

  // 데모 비주얼라이저 애니메이션
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const syncSize = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    syncSize()
    const ro = new ResizeObserver(syncSize)
    ro.observe(canvas)

    const colors = COLOR_PRESETS[preset].colors
    const bands  = 72

    const fakeFreqs = () =>
      Array.from({ length: bands }, (_, i) => {
        const t = timeRef.current
        const a = Math.sin(t * 2.1 + i * 0.28) * 0.38
        const b = Math.sin(t * 1.4 + i * 0.51) * 0.28
        const c = Math.sin(t * 3.7 + i * 0.14) * 0.14
        const d = Math.sin(t * 0.7 + i * 0.08) * 0.12
        return Math.max(0.04, Math.min(1, 0.5 + a + b + c + d))
      })

    const draw = () => {
      timeRef.current += isPlaying ? 0.038 : 0.007
      const t = timeRef.current
      const W = canvas.width
      const H = canvas.height
      const freqs = fakeFreqs()

      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = '#07070f'
      ctx.fillRect(0, 0, W, H)

      // 배경 앰비언트 글로우
      const bgGrad = ctx.createRadialGradient(W * 0.5, H * 0.45, 0, W * 0.5, H * 0.45, W * 0.65)
      bgGrad.addColorStop(0, colors[0] + '14')
      bgGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, W, H)

      ctx.save()

      // ── BARS ────────────────────────────────
      if (vizType === 'bars') {
        const slotW = W / bands
        const barW  = slotW * 0.62

        freqs.forEach((f, i) => {
          const h = f * H * 0.74
          const x = i * slotW + slotW * 0.19
          const t2 = i / bands

          const grad = ctx.createLinearGradient(0, H - h, 0, H)
          grad.addColorStop(0,   colors[0] + 'FF')
          grad.addColorStop(0.45, colors[1] + 'BB')
          grad.addColorStop(1,   colors[2] + '22')

          ctx.shadowBlur  = 18
          ctx.shadowColor = colors[0] + '66'
          ctx.fillStyle   = grad
          ctx.beginPath()
          ;(ctx as any).roundRect?.(x, H - h, barW, h, 2) ?? ctx.rect(x, H - h, barW, h)
          ctx.fill()

          // 상단 발광 캡
          ctx.shadowBlur  = 10
          ctx.shadowColor = colors[0]
          ctx.fillStyle   = '#ffffff99'
          ctx.fillRect(x, H - h, barW, 1.5)

          // 반사
          ctx.save()
          ctx.globalAlpha = 0.07
          ctx.shadowBlur  = 0
          ctx.fillStyle   = grad
          ctx.scale(1, -1)
          ctx.beginPath()
          ;(ctx as any).roundRect?.(x, -H, barW, h * 0.3, 2) ?? ctx.rect(x, -H, barW, h * 0.3)
          ctx.fill()
          ctx.restore()
        })

      // ── CIRCULAR ─────────────────────────────
      } else if (vizType === 'circular') {
        const cx = W / 2, cy = H / 2
        const base = Math.min(W, H) * 0.22

        // 내부 글로우
        const ig = ctx.createRadialGradient(cx, cy, 0, cx, cy, base * 1.6)
        ig.addColorStop(0, colors[0] + '2A')
        ig.addColorStop(0.6, colors[1] + '0A')
        ig.addColorStop(1, 'transparent')
        ctx.fillStyle = ig
        ctx.beginPath()
        ctx.arc(cx, cy, base * 1.6, 0, Math.PI * 2)
        ctx.fill()

        // 기준 원
        ctx.strokeStyle = colors[0] + '30'
        ctx.lineWidth   = 1
        ctx.beginPath()
        ctx.arc(cx, cy, base, 0, Math.PI * 2)
        ctx.stroke()

        freqs.forEach((f, i) => {
          const angle = (i / bands) * Math.PI * 2 - Math.PI / 2
          const len   = f * base * 1.05
          const x1 = cx + Math.cos(angle) * (base + 2)
          const y1 = cy + Math.sin(angle) * (base + 2)
          const x2 = cx + Math.cos(angle) * (base + 2 + len)
          const y2 = cy + Math.sin(angle) * (base + 2 + len)
          const ci = Math.floor((i / bands) * colors.length) % colors.length

          ctx.strokeStyle = colors[ci]
          ctx.lineWidth   = Math.max(1.5, (W / bands) * 0.38)
          ctx.lineCap     = 'round'
          ctx.shadowBlur  = 14
          ctx.shadowColor = colors[ci]
          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.stroke()
        })

        // 중앙 점
        ctx.fillStyle   = colors[0]
        ctx.shadowBlur  = 28
        ctx.shadowColor = colors[0]
        ctx.beginPath()
        ctx.arc(cx, cy, 5, 0, Math.PI * 2)
        ctx.fill()

      // ── WAVE ──────────────────────────────────
      } else if (vizType === 'wave') {
        const layers = [
          { phaseOffset: 0,           alpha: 1,    lw: 2.5, blur: 18, ci: 0 },
          { phaseOffset: Math.PI * 0.33, alpha: 0.45, lw: 1.5, blur: 0,  ci: 1 },
          { phaseOffset: Math.PI * 0.66, alpha: 0.22, lw: 1,   blur: 0,  ci: 2 },
        ]

        layers.forEach(({ phaseOffset, alpha, lw, blur, ci }) => {
          ctx.beginPath()
          ctx.lineWidth    = lw
          ctx.strokeStyle  = colors[ci]
          ctx.globalAlpha  = alpha
          ctx.shadowBlur   = blur
          ctx.shadowColor  = colors[ci]

          const samples = 320
          for (let i = 0; i <= samples; i++) {
            const xi  = i / samples
            const x   = xi * W
            const bi  = Math.floor(xi * bands)
            const f   = freqs[bi] ?? 0.5
            const y   = H / 2
              + Math.sin(xi * Math.PI * 7 + t * 2.1 + phaseOffset) * f * H * 0.27
              + Math.sin(xi * Math.PI * 3.5 + t * 1.3 + phaseOffset * 1.4) * f * H * 0.11
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
          }
          ctx.stroke()
        })
        ctx.globalAlpha = 1
        ctx.shadowBlur  = 0

        // 중앙 참조선
        ctx.strokeStyle = colors[0] + '18'
        ctx.lineWidth   = 1
        ctx.beginPath()
        ctx.moveTo(0, H / 2)
        ctx.lineTo(W, H / 2)
        ctx.stroke()

      // ── PARTICLES ──────────────────────────────
      } else if (vizType === 'particles') {
        const N = 200
        for (let i = 0; i < N; i++) {
          const phi = i * 2.39996
          const fi  = freqs[i % bands]
          const r   = Math.sqrt(i / N) * Math.min(W, H) * 0.4 * (0.45 + fi * 0.55)
          const angle = phi + t * (0.18 + (i % 7) * 0.025)
          const px  = W / 2 + Math.cos(angle) * r
          const py  = H / 2 + Math.sin(angle) * r
          const sz  = fi * 3.5 + 0.8
          const ci  = i % colors.length

          ctx.fillStyle  = colors[ci]
          ctx.shadowBlur = 10
          ctx.shadowColor = colors[ci]
          ctx.globalAlpha = 0.65 + fi * 0.35
          ctx.beginPath()
          ctx.arc(px, py, sz, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1
        ctx.shadowBlur  = 0
      }

      ctx.restore()

      // 필름 그레인 효과
      if (effects.filmGrain) {
        const imgData = ctx.createImageData(W, H)
        for (let i = 0; i < imgData.data.length; i += 4) {
          const n = (Math.random() - 0.5) * 28
          imgData.data[i] = imgData.data[i+1] = imgData.data[i+2] = 128 + n
          imgData.data[i+3] = 18
        }
        ctx.putImageData(imgData, 0, 0)
      }

      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(animRef.current)
      ro.disconnect()
    }
  }, [vizType, preset, isPlaying, effects])

  const handleAudioDrop = (file: File) => {
    setHasFile(true)
    setFileName(file.name)
  }

  const openFilePicker = () => {
    const inp = document.createElement('input')
    inp.type   = 'file'
    inp.accept = 'audio/*'
    inp.onchange = e => {
      const f = (e.target as HTMLInputElement).files?.[0]
      if (f) handleAudioDrop(f)
    }
    inp.click()
  }

  const toggleEffect = (id: string) =>
    setEffects(prev => ({ ...prev, [id]: !prev[id] }))

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setProgress(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)))
  }

  return (
    <div className="app">
      {/* ── 사이드바 ── */}
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">◈</span>
          <span className="brand-name">SPECTRA</span>
          <span className="brand-version">v1.0</span>
        </div>

        {/* 오디오 업로드 */}
        <section className="panel">
          <h3 className="panel-label">AUDIO</h3>
          <div
            className={`dropzone${isDragging ? ' dragover' : ''}`}
            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => {
              e.preventDefault()
              setIsDragging(false)
              const f = e.dataTransfer.files[0]
              if (f) handleAudioDrop(f)
            }}
            onClick={openFilePicker}
          >
            {hasFile ? (
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

        {/* 비주얼라이저 유형 */}
        <section className="panel">
          <h3 className="panel-label">VISUALIZER</h3>
          <div className="viz-grid">
            {VIZ_TYPES.map(v => (
              <button
                key={v.id}
                className={`viz-btn${vizType === v.id ? ' active' : ''}`}
                onClick={() => setVizType(v.id)}
              >
                <span className="viz-label">{v.label}</span>
                <span className="viz-desc">{v.desc}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 색상 프리셋 */}
        <section className="panel">
          <h3 className="panel-label">COLOR</h3>
          <div className="preset-list">
            {COLOR_PRESETS.map((p, i) => (
              <button
                key={i}
                className={`preset-btn${preset === i ? ' active' : ''}`}
                onClick={() => setPreset(i)}
              >
                <div className="preset-swatches">
                  {p.colors.map((c, j) => (
                    <span key={j} className="swatch" style={{ background: c }} />
                  ))}
                </div>
                <span className="preset-name">{p.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 이펙트 */}
        <section className="panel">
          <h3 className="panel-label">EFFECTS</h3>
          <div className="effects-list">
            {EFFECTS.map(ef => (
              <div key={ef.id} className="effect-row">
                <span className="effect-name">{ef.label}</span>
                <input
                  type="checkbox"
                  className="toggle"
                  checked={!!effects[ef.id]}
                  onChange={() => toggleEffect(ef.id)}
                />
              </div>
            ))}
          </div>
        </section>

        {/* 내보내기 */}
        <section className="panel">
          <h3 className="panel-label">EXPORT</h3>
          <div className="export-field">
            <label className="setting-label">RESOLUTION</label>
            <select
              className="setting-select"
              value={resolution}
              onChange={e => setResolution(e.target.value)}
            >
              {RESOLUTIONS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="export-field">
            <label className="setting-label">VIDEO BITRATE</label>
            <div className="bitrate-row">
              <input
                type="range" min={2} max={20} step={1}
                value={bitrate}
                onChange={e => setBitrate(Number(e.target.value))}
                className="slider"
              />
              <span className="bitrate-val">{bitrate}M</span>
            </div>
          </div>
          <button className="export-btn" disabled={!hasFile}>
            ⬇ EXPORT MP4
          </button>
        </section>
      </aside>

      {/* ── 메인 영역 ── */}
      <main className="main">
        <div className="canvas-wrapper">
          <canvas ref={canvasRef} className="visualizer-canvas" />
          {!hasFile && (
            <div className="canvas-overlay">
              <span className="overlay-badge">DEMO MODE</span>
              <span className="overlay-hint">좌측 패널에서 오디오 파일을 불러오세요</span>
            </div>
          )}
        </div>

        {/* 트랜스포트 바 */}
        <div className="transport">
          <span className="transport-time">
            {hasFile ? '01:23' : '00:00'}
          </span>
          <div className="transport-controls">
            <button className="ctrl-btn" onClick={() => setProgress(0)}>⏮</button>
            <button className="ctrl-btn play-btn" onClick={() => setIsPlaying(p => !p)}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button className="ctrl-btn">⏭</button>
          </div>
          <div className="transport-scrubber">
            <div className="scrubber-track" onClick={handleScrub}>
              <div className="scrubber-fill" style={{ width: `${progress * 100}%` }} />
              <div className="scrubber-cursor" style={{ left: `${progress * 100}%` }} />
            </div>
          </div>
          <span className="transport-duration">
            {hasFile ? '03:45' : '--:--'}
          </span>
        </div>
      </main>
    </div>
  )
}
