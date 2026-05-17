// src/hooks/useAudioEngine.ts — Web Audio API 재생 엔진
import { useRef, useState, useCallback, useEffect } from 'react'
import { FFT_SIZE } from '../constants'

export interface AudioEngineAPI {
  analyser:    React.RefObject<AnalyserNode | null>
  audioBuffer: React.RefObject<AudioBuffer | null>
  duration:    number
  currentTime: number
  isPlaying:   boolean
  loadFile:    (file: File) => Promise<void>
  play:        () => void
  pause:       () => void
  seek:        (time: number) => void
}

export function useAudioEngine(): AudioEngineAPI {
  const ctxRef      = useRef<AudioContext | null>(null)
  const bufferRef   = useRef<AudioBuffer | null>(null)
  const sourceRef   = useRef<AudioBufferSourceNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)

  const startedAtRef  = useRef(0)
  const offsetRef     = useRef(0)

  const [duration,    setDuration]    = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying,   setIsPlaying]   = useState(false)

  useEffect(() => {
    if (!isPlaying) return
    const id = setInterval(() => {
      if (!ctxRef.current) return
      const t = offsetRef.current + (ctxRef.current.currentTime - startedAtRef.current)
      setCurrentTime(Math.min(t, duration))
    }, 250)
    return () => clearInterval(id)
  }, [isPlaying, duration])

  const getCtx = useCallback((): AudioContext => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext()
      const analyser       = ctxRef.current.createAnalyser()
      analyser.fftSize     = FFT_SIZE
      analyser.smoothingTimeConstant = 0.8
      analyser.connect(ctxRef.current.destination)
      analyserRef.current  = analyser
    }
    return ctxRef.current
  }, [])

  const stopSource = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.onended = null
      try { sourceRef.current.stop() } catch { /* 이미 정지됨 */ }
      sourceRef.current.disconnect()
      sourceRef.current = null
    }
  }, [])

  const loadFile = useCallback(async (file: File): Promise<void> => {
    stopSource()
    const audioCtx = getCtx()
    if (audioCtx.state === 'suspended') await audioCtx.resume()

    const arrayBuf  = await file.arrayBuffer()
    const audioBuf  = await audioCtx.decodeAudioData(arrayBuf)
    bufferRef.current = audioBuf
    offsetRef.current = 0
    setDuration(audioBuf.duration)
    setCurrentTime(0)
    setIsPlaying(false)
  }, [getCtx, stopSource])

  const play = useCallback(() => {
    const audioCtx = getCtx()
    const buf      = bufferRef.current
    if (!buf || !analyserRef.current) return

    stopSource()
    const source = audioCtx.createBufferSource()
    source.buffer = buf
    source.connect(analyserRef.current)
    source.start(0, offsetRef.current)
    source.onended = () => {
      setIsPlaying(false)
      offsetRef.current = 0
      setCurrentTime(0)
    }
    sourceRef.current  = source
    startedAtRef.current = audioCtx.currentTime
    setIsPlaying(true)
    if (audioCtx.state === 'suspended') audioCtx.resume()
  }, [getCtx, stopSource])

  const pause = useCallback(() => {
    if (!ctxRef.current || !isPlaying) return
    offsetRef.current += ctxRef.current.currentTime - startedAtRef.current
    stopSource()
    setIsPlaying(false)
  }, [isPlaying, stopSource])

  const seek = useCallback((time: number) => {
    const wasPlaying = isPlaying
    if (wasPlaying) stopSource()
    offsetRef.current = Math.max(0, Math.min(time, bufferRef.current?.duration ?? 0))
    setCurrentTime(offsetRef.current)
    if (wasPlaying) {
      const audioCtx = getCtx()
      const buf      = bufferRef.current
      if (!buf || !analyserRef.current) return
      const source = audioCtx.createBufferSource()
      source.buffer = buf
      source.connect(analyserRef.current)
      source.start(0, offsetRef.current)
      source.onended = () => { setIsPlaying(false); offsetRef.current = 0; setCurrentTime(0) }
      sourceRef.current    = source
      startedAtRef.current = audioCtx.currentTime
      setIsPlaying(true)
    }
  }, [isPlaying, stopSource, getCtx])

  return { analyser: analyserRef, audioBuffer: bufferRef, duration, currentTime, isPlaying, loadFile, play, pause, seek }
}
