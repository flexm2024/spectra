// src/workers/encoder.worker.ts — WebCodecs + mp4-muxer 오프라인 인코딩
import { Muxer, ArrayBufferTarget } from 'mp4-muxer'
import type { WorkerStartMessage, WorkerOutMessage, OverlayConfig } from '../types'
import { COLOR_PRESETS } from '../constants'
import { renderBars }      from '../renderers/bars'
import { renderCircular }  from '../renderers/circular'
import { renderWave }      from '../renderers/wave'
import { renderParticles } from '../renderers/particles'
import { applyEffects }    from '../renderers/effects'
import { drawBackground, drawLogo, drawStickers } from '../renderers/overlay'

function simulateFreqAtTime(
  channelData: Float32Array,
  sampleRate:  number,
  time:        number,
  fftSize:     number,
): Uint8Array {
  const start = Math.floor(time * sampleRate)
  const slice = channelData.slice(start, start + fftSize)
  const out = new Uint8Array(fftSize / 2)
  for (let i = 0; i < out.length; i++) {
    const amp = Math.abs(slice[i] ?? 0)
    out[i] = Math.min(255, Math.round(amp * 255 * 3))
  }
  return out
}

self.onmessage = async (e: MessageEvent<WorkerStartMessage>) => {
  const {
    audioBuffer: rawPCM, sampleRate, numberOfChannels, duration,
    vizType, colorPresetIndex, effects, width, height, bitrateM, fps,
    loopCount, audioBitrateK,
    bgType, bgImage, bgGradient, bgSceneIndex, logo, stickers,
  } = e.data

  const overlay: OverlayConfig = { bgType, bgImage, bgGradient, bgSceneIndex, logo, stickers }

  try {
    const bytesPerChannel = rawPCM.byteLength / numberOfChannels
    const samplesPerChannel = bytesPerChannel / 4
    const channels: Float32Array[] = Array.from({ length: numberOfChannels }, (_, ch) =>
      new Float32Array(rawPCM, ch * bytesPerChannel, samplesPerChannel)
    )
    const ch0 = channels[0]

    const totalDuration = duration * loopCount
    const muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: { codec: 'avc', width, height },
      audio: { codec: 'aac', sampleRate, numberOfChannels },
      fastStart: 'in-memory',
    })

    const videoEncoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta ?? {}),
      error:  (err) => { throw err },
    })
    videoEncoder.configure({
      codec:     'avc1.42001f',
      width,     height,
      bitrate:   bitrateM * 1_000_000,
      framerate: fps,
    })

    const audioEncoder = new AudioEncoder({
      output: (chunk, meta) => muxer.addAudioChunk(chunk, meta ?? {}),
      error:  (err) => { throw err },
    })
    audioEncoder.configure({
      codec:            'mp4a.40.2',
      sampleRate,
      numberOfChannels,
      bitrate:          audioBitrateK * 1_000,
    })

    const canvas = new OffscreenCanvas(width, height)
    const ctx    = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D

    const totalFrames             = Math.floor(totalDuration * fps)
    const totalAudioSamplesNeeded = samplesPerChannel * loopCount
    const audioChunkSz            = 1024
    const colors                  = COLOR_PRESETS[colorPresetIndex].colors
    let audioSamplePos = 0

    for (let frame = 0; frame < totalFrames; frame++) {
      const timestamp  = Math.round((frame / fps) * 1_000_000)
      const loopedTime = (frame / fps) % duration

      const freqData = simulateFreqAtTime(ch0, sampleRate, loopedTime, 2048)
      const timeData = new Uint8Array(2048).fill(128)

      const rendererCtx = ctx as unknown as CanvasRenderingContext2D

      drawBackground(rendererCtx, overlay, width, height, colors)

      const opts = { ctx: rendererCtx, freqData, timeData, colors, width, height, time: loopedTime }
      switch (vizType) {
        case 'bars':      renderBars(opts);      break
        case 'circular':  renderCircular(opts);  break
        case 'wave':      renderWave(opts);      break
        case 'particles': renderParticles(opts); break
      }
      applyEffects(rendererCtx, freqData, effects, width, height, loopedTime)

      drawLogo(rendererCtx, overlay.logo, width, height)
      drawStickers(rendererCtx, overlay.stickers)

      const videoFrame = new VideoFrame(canvas, { timestamp })
      videoEncoder.encode(videoFrame, { keyFrame: frame % (fps * 2) === 0 })
      videoFrame.close()

      const audioEnd = Math.min(
        Math.floor((frame + 1) / fps * sampleRate),
        totalAudioSamplesNeeded,
      )
      while (audioSamplePos < audioEnd) {
        const chunkEnd = Math.min(audioSamplePos + audioChunkSz, audioEnd)
        const nFrames  = chunkEnd - audioSamplePos

        const audioDataArr = new Float32Array(nFrames * numberOfChannels)
        for (let ch = 0; ch < numberOfChannels; ch++) {
          for (let i = 0; i < nFrames; i++) {
            audioDataArr[ch * nFrames + i] = channels[ch][(audioSamplePos + i) % samplesPerChannel]
          }
        }

        const audioData = new AudioData({
          format:           'f32-planar',
          sampleRate,
          numberOfFrames:   nFrames,
          numberOfChannels,
          timestamp:        Math.round(audioSamplePos / sampleRate * 1_000_000),
          data:             audioDataArr,
        })
        audioEncoder.encode(audioData)
        audioData.close()
        audioSamplePos = chunkEnd
      }

      if (frame % 10 === 0) {
        const msg: WorkerOutMessage = { type: 'progress', progress: frame / totalFrames }
        self.postMessage(msg)
        await new Promise(r => setTimeout(r, 0))
      }
    }

    await videoEncoder.flush()
    await audioEncoder.flush()
    muxer.finalize()

    const mp4Buffer = (muxer.target as ArrayBufferTarget).buffer
    const done: WorkerOutMessage = { type: 'done', buffer: mp4Buffer }
    self.postMessage(done, { transfer: [mp4Buffer] })

  } catch (err) {
    const errMsg: WorkerOutMessage = { type: 'error', error: String(err) }
    self.postMessage(errMsg)
  }
}
