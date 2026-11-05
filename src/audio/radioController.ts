import {
  createLiveWaveformPath,
  createWaveformOverview,
  getLoopedPlaybackPosition,
  type WaveformPeaks,
} from './waveform'

export const RADIO_PREFERENCE_KEY = 'static-oath-radio-preference'
export const INITIAL_RADIO_VOLUME = 0.45

export type RadioStatus =
  'off' | 'loading' | 'starting' | 'tap-to-enable' | 'on' | 'standard-loop-on'

export interface RadioSnapshot {
  status: RadioStatus
  volume: number
  error: string | null
  waveformReady: boolean
  duration: number
  playbackActive: boolean
}

export interface DecodedRadioBuffer {
  duration: number
  getChannelData(channel: number): Float32Array
  length: number
  numberOfChannels: number
  sampleRate: number
}

interface GainParameterLike {
  value: number
  setTargetAtTime(value: number, startTime: number, timeConstant: number): void
}

interface GainNodeLike {
  gain: GainParameterLike
  connect(destination: unknown): unknown
  disconnect(): void
}

interface BufferSourceLike {
  buffer: DecodedRadioBuffer | null
  loop: boolean
  loopStart: number
  loopEnd: number
  onended: ((this: AudioScheduledSourceNode, event: Event) => unknown) | null
  connect(destination: unknown): unknown
  disconnect(): void
  start(when?: number, offset?: number): void
  stop(when?: number): void
}

interface AudioContextLike {
  currentTime: number
  destination: unknown
  state: string
  resume(): Promise<void>
  close(): Promise<void>
  addEventListener(type: 'statechange', listener: EventListener): void
  removeEventListener(type: 'statechange', listener: EventListener): void
  createGain(): GainNodeLike
  createBufferSource(): BufferSourceLike
  decodeAudioData(data: ArrayBuffer): Promise<DecodedRadioBuffer>
}

interface FallbackAudioLike {
  loop: boolean
  preload: string
  volume: number
  paused: boolean
  play(): Promise<void>
  pause(): void
  addEventListener(type: 'error', listener: EventListener): void
  removeEventListener(type: 'error', listener: EventListener): void
}

interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

interface RadioControllerOptions {
  assetUrl: string
  createAudioContext: () => AudioContextLike
  fetchAudio: (url: string) => Promise<Response>
  createFallbackAudio: (url: string) => FallbackAudioLike
  storage?: StorageLike
  storageWarning?: string
}

const decodedBufferPromises = new Map<string, Promise<DecodedRadioBuffer>>()

function getDecodedBuffer(
  assetUrl: string,
  context: AudioContextLike,
  fetchAudio: (url: string) => Promise<Response>,
): Promise<DecodedRadioBuffer> {
  const cachedBuffer = decodedBufferPromises.get(assetUrl)

  if (cachedBuffer) {
    return cachedBuffer
  }

  const bufferPromise = fetchAudio(assetUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          `Audio asset request failed with status ${response.status}.`,
        )
      }

      return response.arrayBuffer()
    })
    .then((data) => context.decodeAudioData(data))
    .catch((error: unknown) => {
      decodedBufferPromises.delete(assetUrl)
      throw error
    })

  decodedBufferPromises.set(assetUrl, bufferPromise)
  return bufferPromise
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function isAutoplayBlocked(error: unknown): boolean {
  return error instanceof Error && error.name === 'NotAllowedError'
}

function readPreference(storage: StorageLike | undefined): {
  enabled: boolean
  warning: string | null
} {
  try {
    return {
      enabled: storage?.getItem(RADIO_PREFERENCE_KEY) !== 'off',
      warning: null,
    }
  } catch {
    return {
      enabled: true,
      warning: 'The saved radio preference could not be read in this browser.',
    }
  }
}

export class RadioAmbienceController {
  private readonly listeners = new Set<(snapshot: RadioSnapshot) => void>()
  private readonly options: RadioControllerOptions
  private context: AudioContextLike | null = null
  private gain: GainNodeLike | null = null
  private source: BufferSourceLike | null = null
  private decodedBuffer: DecodedRadioBuffer | null = null
  private waveformPeaks: WaveformPeaks | null = null
  private sourceStartedAt = 0
  private sourceOffset = 0
  private lastPosition = 0
  private fallbackAudio: FallbackAudioLike | null = null
  private fallbackRequired = false
  private disposed = false
  private initialized = false
  private attempt = 0
  private status: RadioStatus = 'off'
  private volume = INITIAL_RADIO_VOLUME
  private error: string | null = null
  private storageWarning: string | null
  private contextStateChangeHandler: EventListener | null = null

  constructor(options: RadioControllerOptions) {
    this.options = options
    this.storageWarning = options.storageWarning ?? null
  }

  getSnapshot = (): RadioSnapshot => ({
    status: this.status,
    volume: this.volume,
    error: this.error,
    waveformReady: this.waveformPeaks !== null,
    duration: this.decodedBuffer?.duration ?? 0,
    playbackActive: this.source !== null && this.context?.state === 'running',
  })

  getLiveWaveformPath = (): string | null => {
    if (!this.waveformPeaks) {
      return null
    }

    const { position } = this.getPlaybackPosition()
    return createLiveWaveformPath(this.waveformPeaks, position)
  }

  getPlaybackPosition = (): { duration: number; position: number } => {
    if (this.source && this.context && this.decodedBuffer) {
      return getLoopedPlaybackPosition(
        this.context.currentTime,
        this.sourceStartedAt,
        this.sourceOffset,
        this.decodedBuffer.duration,
      )
    }

    return {
      position: this.lastPosition,
      duration: this.decodedBuffer?.duration ?? 0,
    }
  }

  subscribe = (listener: (snapshot: RadioSnapshot) => void): (() => void) => {
    this.listeners.add(listener)
    listener(this.getSnapshot())
    return () => this.listeners.delete(listener)
  }

  initialize(): void {
    if (this.initialized || this.disposed) {
      return
    }

    this.initialized = true

    const preference = readPreference(this.options.storage)
    this.storageWarning = preference.warning ?? this.storageWarning
    this.error = this.storageWarning

    if (!preference.enabled) {
      try {
        this.ensureContext()
        if (this.context) {
          this.prepareBuffer(this.context)
        }
      } catch (error: unknown) {
        this.error = `Radio waveform preparation failed: ${describeError(error)}`
      }

      this.publish('off')
      return
    }

    this.requestPlayback(false)
  }

  enable(): void {
    if (
      this.disposed ||
      this.status === 'on' ||
      this.status === 'standard-loop-on' ||
      this.status === 'starting' ||
      this.status === 'loading'
    ) {
      return
    }

    this.requestPlayback(true)
  }

  disable(): void {
    if (this.disposed) {
      return
    }

    this.attempt += 1
    this.stopSources()
    this.pendingPreference('off')
    this.publish('off')
  }

  toggle(): void {
    if (
      this.status === 'on' ||
      this.status === 'standard-loop-on' ||
      this.status === 'starting' ||
      this.status === 'loading'
    ) {
      this.disable()
      return
    }

    this.enable()
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume))

    if (this.gain && this.context) {
      this.gain.gain.setTargetAtTime(
        this.volume,
        this.context.currentTime,
        0.02,
      )
    }

    if (this.fallbackAudio) {
      this.fallbackAudio.volume = this.volume
    }

    this.emit()
  }

  dispose(): void {
    if (this.disposed) {
      return
    }

    this.disposed = true
    this.attempt += 1
    this.stopSources()

    if (this.fallbackAudio) {
      this.fallbackAudio.pause()
      this.fallbackAudio.removeEventListener('error', this.handleFallbackError)
      this.fallbackAudio = null
    }

    this.gain?.disconnect()
    this.gain = null

    if (this.context) {
      if (this.contextStateChangeHandler) {
        this.context.removeEventListener(
          'statechange',
          this.contextStateChangeHandler,
        )
        this.contextStateChangeHandler = null
      }

      if (this.context.state !== 'closed') {
        void this.context
          .close()
          .catch((error: unknown) =>
            console.error('Radio audio context could not be closed.', error),
          )
      }
    }

    this.context = null
    this.listeners.clear()
  }

  private requestPlayback(manual: boolean): void {
    if (this.disposed) {
      return
    }

    const attempt = ++this.attempt
    this.publish(manual ? 'starting' : 'loading', this.storageWarning)

    if (this.fallbackRequired) {
      void this.startFallback(attempt, manual)
      return
    }

    try {
      this.ensureContext()
    } catch (error: unknown) {
      this.fallbackRequired = true
      this.error = `Web Audio is unavailable: ${describeError(error)}`
      void this.startFallback(attempt, manual)
      return
    }

    const context = this.context

    if (!context) {
      return
    }

    let resumePromise: Promise<void>

    try {
      resumePromise =
        context.state === 'running' ? Promise.resolve() : context.resume()
    } catch (error: unknown) {
      this.handleStartError(attempt, error)
      return
    }

    const bufferPromise = this.prepareBuffer(context)

    if (!manual && context.state !== 'running') {
      this.publish('tap-to-enable')
    }

    void this.finishPlaybackAttempt(
      attempt,
      manual,
      context,
      resumePromise,
      bufferPromise,
    )
  }

  private async finishPlaybackAttempt(
    attempt: number,
    manual: boolean,
    context: AudioContextLike,
    resumePromise: Promise<void>,
    bufferPromise: Promise<DecodedRadioBuffer>,
  ): Promise<void> {
    try {
      await resumePromise

      if (!this.isCurrentAttempt(attempt)) {
        return
      }

      if (context.state !== 'running') {
        throw new DOMException(
          'The audio context is not running. Activate the radio to continue.',
          'NotAllowedError',
        )
      }

      let buffer: DecodedRadioBuffer

      try {
        buffer = await bufferPromise
      } catch (decodeError: unknown) {
        if (!this.isCurrentAttempt(attempt)) {
          return
        }

        this.fallbackRequired = true
        this.error = `Gapless buffer playback failed: ${describeError(decodeError)}. Using standard looping audio; loop interruptions may occur.`
        await this.startFallback(attempt, manual)
        return
      }

      if (!this.isCurrentAttempt(attempt)) {
        return
      }

      this.lastPosition = this.lastPosition % buffer.duration
      this.startBufferSource(attempt, manual, buffer)
    } catch (error: unknown) {
      this.handleStartError(attempt, error)
    }
  }

  private ensureContext(): void {
    if (this.context) {
      return
    }

    const context = this.options.createAudioContext()
    this.contextStateChangeHandler = () => this.emit()
    context.addEventListener('statechange', this.contextStateChangeHandler)
    this.context = context
    const gain = context.createGain()
    gain.gain.value = this.volume
    gain.connect(context.destination)
    this.gain = gain
  }

  private prepareBuffer(
    context: AudioContextLike,
  ): Promise<DecodedRadioBuffer> {
    const bufferPromise = getDecodedBuffer(
      this.options.assetUrl,
      context,
      this.options.fetchAudio,
    )

    void bufferPromise.then(
      (buffer) => {
        if (this.disposed || this.waveformPeaks) {
          return
        }

        try {
          this.decodedBuffer = buffer
          this.waveformPeaks = createWaveformOverview(buffer)
          this.emit()
        } catch (error: unknown) {
          this.error = `Radio waveform could not be generated: ${describeError(error)}`
          this.emit()
        }
      },
      (error: unknown) => {
        if (!this.disposed) {
          this.error = `Radio waveform could not be generated: ${describeError(error)}`
          this.emit()
        }
      },
    )

    return bufferPromise
  }

  private startBufferSource(
    attempt: number,
    manual: boolean,
    buffer: DecodedRadioBuffer,
  ): void {
    const context = this.context
    const gain = this.gain

    if (!context || !gain || !this.isCurrentAttempt(attempt)) {
      return
    }

    let source: BufferSourceLike | null = null

    try {
      source = context.createBufferSource()
      source.buffer = buffer
      source.loop = true
      source.loopStart = 0
      source.loopEnd = buffer.duration
      source.connect(gain)
      const offset = this.lastPosition % buffer.duration
      const sourceStartTime = context.currentTime
      source.start(0, offset)
      this.source = source
      this.sourceStartedAt = sourceStartTime
      this.sourceOffset = offset
      this.lastPosition = offset

      if (manual) {
        this.pendingPreference('on')
      }

      this.publish('on')
    } catch (error: unknown) {
      if (source && this.source !== source) {
        source.disconnect()
      }

      this.handleStartError(attempt, error)
    }
  }

  private async startFallback(attempt: number, manual: boolean): Promise<void> {
    if (!this.isCurrentAttempt(attempt)) {
      return
    }

    try {
      if (!this.fallbackAudio) {
        const audio = this.options.createFallbackAudio(this.options.assetUrl)
        audio.loop = true
        audio.preload = 'none'
        audio.volume = this.volume
        audio.addEventListener('error', this.handleFallbackError)
        this.fallbackAudio = audio
      }

      await this.fallbackAudio.play()

      if (!this.isCurrentAttempt(attempt)) {
        this.fallbackAudio.pause()
        return
      }

      if (manual) {
        this.pendingPreference('on')
      }

      this.publish('standard-loop-on')
    } catch (error: unknown) {
      if (!this.isCurrentAttempt(attempt)) {
        return
      }

      if (isAutoplayBlocked(error)) {
        this.publish('tap-to-enable')
        return
      }

      const message = this.error
        ? `${this.error} Fallback playback failed: ${describeError(error)}`
        : describeError(error)
      this.publish('off', message)
    }
  }

  private handleStartError(attempt: number, error: unknown): void {
    if (!this.isCurrentAttempt(attempt)) {
      return
    }

    if (isAutoplayBlocked(error)) {
      this.publish('tap-to-enable')
      return
    }

    this.publish('off', describeError(error))
  }

  private handleFallbackError = (): void => {
    if (this.disposed) {
      return
    }

    this.attempt += 1
    this.fallbackAudio?.pause()
    const message = this.error
      ? `${this.error} Standard-loop audio playback failed.`
      : 'Standard-loop audio playback failed.'
    this.publish('tap-to-enable', message)
  }

  private stopSources(): void {
    if (this.source) {
      this.lastPosition = this.getPlaybackPosition().position
      this.source.onended = null
      this.source.stop()
      this.source.disconnect()
      this.source = null
    }

    this.fallbackAudio?.pause()
  }

  private pendingPreference(preference: 'on' | 'off'): void {
    try {
      this.options.storage?.setItem(RADIO_PREFERENCE_KEY, preference)
    } catch {
      this.error = 'The radio preference could not be saved in this browser.'
      this.emit()
    }
  }

  private isCurrentAttempt(attempt: number): boolean {
    return !this.disposed && attempt === this.attempt
  }

  private publish(status: RadioStatus, error = this.error): void {
    this.status = status
    this.error = error
    this.emit()
  }

  private emit(): void {
    const snapshot = this.getSnapshot()

    for (const listener of this.listeners) {
      listener(snapshot)
    }
  }
}

export function createBrowserRadioController(
  assetUrl: string,
): RadioAmbienceController {
  let storage: StorageLike | undefined
  let storageWarning: string | undefined

  try {
    storage = window.localStorage
  } catch (error: unknown) {
    storage = undefined
    storageWarning = `Radio preference storage is unavailable: ${describeError(error)}`
  }

  return new RadioAmbienceController({
    assetUrl,
    createAudioContext: () => new AudioContext(),
    fetchAudio: (url) => fetch(url),
    createFallbackAudio: (url) => new Audio(url),
    ...(storage ? { storage } : {}),
    ...(storageWarning ? { storageWarning } : {}),
  })
}
