import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  INITIAL_RADIO_VOLUME,
  RADIO_PREFERENCE_KEY,
  RadioAmbienceController,
  type DecodedRadioBuffer,
} from '../src/audio/radioController'

interface FakeSource {
  buffer: DecodedRadioBuffer | null
  loop: boolean
  loopStart: number
  loopEnd: number
  onended: ((this: AudioScheduledSourceNode, event: Event) => unknown) | null
  start: ReturnType<typeof vi.fn<(when?: number, offset?: number) => void>>
  stop: ReturnType<typeof vi.fn<() => void>>
  disconnect: ReturnType<typeof vi.fn<() => void>>
  connect: ReturnType<typeof vi.fn<(destination: unknown) => unknown>>
}

interface FakeAudio {
  loop: boolean
  preload: string
  volume: number
  paused: boolean
  play: ReturnType<typeof vi.fn<() => Promise<void>>>
  pause: ReturnType<typeof vi.fn<() => void>>
  addEventListener: ReturnType<
    typeof vi.fn<(type: 'error', listener: EventListener) => void>
  >
  removeEventListener: ReturnType<
    typeof vi.fn<(type: 'error', listener: EventListener) => void>
  >
}

interface FakeGain {
  gain: {
    value: number
    setTargetAtTime: ReturnType<
      typeof vi.fn<
        (value: number, startTime: number, timeConstant: number) => void
      >
    >
  }
  connect: ReturnType<typeof vi.fn<(destination: unknown) => unknown>>
  disconnect: ReturnType<typeof vi.fn<() => void>>
}

interface FakeContext {
  state: string
  currentTime: number
  destination: object
  resume: ReturnType<typeof vi.fn<() => Promise<void>>>
  close: ReturnType<typeof vi.fn<() => Promise<void>>>
  createGain: ReturnType<typeof vi.fn<() => FakeGain>>
  createBufferSource: ReturnType<typeof vi.fn<() => FakeSource>>
  decodeAudioData: ReturnType<
    typeof vi.fn<(data: ArrayBuffer) => Promise<DecodedRadioBuffer>>
  >
  addEventListener: ReturnType<
    typeof vi.fn<(type: 'statechange', listener: EventListener) => void>
  >
  removeEventListener: ReturnType<
    typeof vi.fn<(type: 'statechange', listener: EventListener) => void>
  >
}

interface TestEnvironment {
  controller: RadioAmbienceController
  contexts: FakeContext[]
  sources: FakeSource[]
  gains: FakeGain[]
  fallbackAudios: FakeAudio[]
  storage: Map<string, string>
  fetchAudio: ReturnType<typeof vi.fn<(url: string) => Promise<Response>>>
  buffer: DecodedRadioBuffer
  triggerContextStateChange: () => void
}

let environmentNumber = 0
const TEST_WAVEFORM_SAMPLES = Float32Array.from(
  { length: 25_600 },
  (_, index) => Math.sin(index * 0.13) * 0.08,
)

function createEnvironment(options?: {
  storedPreference?: string
  initialContextState?: string
  resume?: (context: TestEnvironment['contexts'][number]) => Promise<void>
  decode?: () => Promise<DecodedRadioBuffer>
  start?: () => void
  fallbackPlay?: () => Promise<void>
}): TestEnvironment {
  const storage = new Map<string, string>()

  if (options?.storedPreference) {
    storage.set(RADIO_PREFERENCE_KEY, options.storedPreference)
  }

  const contexts: FakeContext[] = []
  const sources: FakeSource[] = []
  const gains: FakeGain[] = []
  const fallbackAudios: FakeAudio[] = []
  let stateChangeListener: EventListener | undefined
  const buffer: DecodedRadioBuffer = {
    duration: 64,
    length: TEST_WAVEFORM_SAMPLES.length,
    numberOfChannels: 1,
    sampleRate: 48_000,
    getChannelData: () => TEST_WAVEFORM_SAMPLES,
  }
  const fetchAudio = vi.fn<(url: string) => Promise<Response>>(
    async () => new Response(new ArrayBuffer(8)),
  )

  const controller = new RadioAmbienceController({
    assetUrl: `https://static-oath.test/radio-${environmentNumber++}.flac`,
    storage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
    fetchAudio,
    createAudioContext: () => {
      const context = {
        state: options?.initialContextState ?? 'running',
        currentTime: 0,
        destination: {},
        resume: vi.fn<() => Promise<void>>(async () => {
          if (options?.resume) {
            await options.resume(context)
          } else {
            context.state = 'running'
          }
        }),
        close: vi.fn<() => Promise<void>>(async () => {
          context.state = 'closed'
        }),
        createGain: vi.fn<() => FakeGain>(() => {
          const gain: FakeGain = {
            gain: {
              value: 0,
              setTargetAtTime: vi.fn<
                (value: number, startTime: number, timeConstant: number) => void
              >((value) => {
                gain.gain.value = value
              }),
            },
            connect: vi.fn<(destination: unknown) => unknown>(),
            disconnect: vi.fn<() => void>(),
          }
          gains.push(gain)
          return gain
        }),
        createBufferSource: vi.fn<() => FakeSource>(() => {
          const source: FakeSource = {
            buffer: null,
            loop: false,
            loopStart: -1,
            loopEnd: -1,
            onended: null,
            start: vi.fn<(when?: number, offset?: number) => void>(() =>
              options?.start?.(),
            ),
            stop: vi.fn<() => void>(),
            disconnect: vi.fn<() => void>(),
            connect: vi.fn<(destination: unknown) => unknown>(),
          }
          sources.push(source)
          return source
        }),
        decodeAudioData: vi.fn<
          (data: ArrayBuffer) => Promise<DecodedRadioBuffer>
        >(() => (options?.decode ? options.decode() : Promise.resolve(buffer))),
        addEventListener: vi.fn<
          (type: 'statechange', listener: EventListener) => void
        >((_type, listener) => {
          stateChangeListener = listener
        }),
        removeEventListener: vi.fn<
          (type: 'statechange', listener: EventListener) => void
        >((_type, listener) => {
          if (stateChangeListener === listener) {
            stateChangeListener = undefined
          }
        }),
      }

      contexts.push(context)
      return context
    },
    createFallbackAudio: () => {
      const audio: FakeAudio = {
        loop: false,
        preload: '',
        volume: 0,
        paused: true,
        play: vi.fn<() => Promise<void>>(async () => {
          await options?.fallbackPlay?.()
          audio.paused = false
        }),
        pause: vi.fn<() => void>(() => {
          audio.paused = true
        }),
        addEventListener:
          vi.fn<(type: 'error', listener: EventListener) => void>(),
        removeEventListener:
          vi.fn<(type: 'error', listener: EventListener) => void>(),
      }
      fallbackAudios.push(audio)
      return audio
    },
  })

  return {
    controller,
    contexts,
    sources,
    gains,
    fallbackAudios,
    storage,
    fetchAudio,
    buffer,
    triggerContextStateChange: () =>
      stateChangeListener?.(new Event('statechange')),
  }
}

async function settlePromises(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
  await new Promise((resolve) => setTimeout(resolve, 0))
}

function getItem<T>(items: T[], index = 0): T {
  const item = items[index]

  if (!item) {
    throw new Error(`Expected item at index ${index}.`)
  }

  return item
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('radio ambience controller', () => {
  it('defaults the preference to enabled and starts one complete-buffer loop', async () => {
    const env = createEnvironment()
    env.controller.initialize()
    await settlePromises()

    expect(env.controller.getSnapshot().status).toBe('on')
    expect(env.fetchAudio).toHaveBeenCalledTimes(1)
    expect(env.contexts).toHaveLength(1)
    expect(getItem(env.contexts).decodeAudioData).toHaveBeenCalledTimes(1)
    expect(getItem(env.gains).gain.value).toBe(INITIAL_RADIO_VOLUME)
    expect(env.sources).toHaveLength(1)
    expect(getItem(env.sources).start).toHaveBeenCalledTimes(1)
    expect(getItem(env.sources).loop).toBe(true)
    expect(getItem(env.sources).loopStart).toBe(0)
    expect(getItem(env.sources).loopEnd).toBe(env.buffer.duration)
    expect(env.controller.getSnapshot().duration).toBe(env.buffer.duration)
    expect(env.controller.getSnapshot().waveformReady).toBe(true)
    expect(env.controller.getLiveWaveformPath()?.match(/M/g)).toHaveLength(400)
    env.controller.dispose()
  })

  it('prepares the real waveform without starting audio for a stored OFF preference', async () => {
    const env = createEnvironment({ storedPreference: 'off' })
    env.controller.initialize()
    await settlePromises()

    expect(env.controller.getSnapshot().status).toBe('off')
    expect(env.contexts).toHaveLength(1)
    expect(env.fetchAudio).toHaveBeenCalledTimes(1)
    expect(env.sources).toHaveLength(0)
    expect(env.controller.getSnapshot().waveformReady).toBe(true)
    expect(env.controller.getLiveWaveformPath()?.match(/M/g)).toHaveLength(400)
    env.controller.dispose()
  })

  it('does not create another context or source for repeated enable requests', async () => {
    let finishDecode: ((buffer: DecodedRadioBuffer) => void) | undefined
    const env = createEnvironment({
      decode: () =>
        new Promise((resolve) => {
          finishDecode = resolve
        }),
    })
    env.controller.initialize()
    env.controller.enable()

    expect(env.controller.getSnapshot().status).toBe('loading')
    expect(env.contexts).toHaveLength(1)
    expect(env.fetchAudio).toHaveBeenCalledTimes(1)
    expect(env.sources).toHaveLength(0)

    await settlePromises()
    finishDecode?.(env.buffer)
    await settlePromises()

    expect(env.controller.getSnapshot().status).toBe('on')
    expect(env.contexts).toHaveLength(1)
    expect(env.sources).toHaveLength(1)
    env.controller.dispose()
  })

  it('shows the manual activation state when autoplay is blocked', async () => {
    const env = createEnvironment({
      initialContextState: 'suspended',
      resume: async () => {
        throw new DOMException(
          'Playback requires activation.',
          'NotAllowedError',
        )
      },
    })
    env.controller.initialize()
    await settlePromises()

    expect(env.controller.getSnapshot().status).toBe('tap-to-enable')
    expect(env.sources).toHaveLength(0)

    const context = getItem(env.contexts)
    context.resume.mockImplementation(async () => {
      context.state = 'running'
    })
    env.controller.enable()
    await settlePromises()

    expect(env.controller.getSnapshot().status).toBe('on')
    expect(env.storage.get(RADIO_PREFERENCE_KEY)).toBe('on')
    expect(env.sources).toHaveLength(1)
    env.controller.dispose()
  })

  it('reuses one context and decoded buffer across clean stop and restart', async () => {
    const env = createEnvironment()
    env.controller.initialize()
    await settlePromises()
    const firstSource = getItem(env.sources)
    const firstBuffer = firstSource.buffer

    env.controller.disable()
    expect(env.storage.get(RADIO_PREFERENCE_KEY)).toBe('off')
    expect(firstSource.stop).toHaveBeenCalledTimes(1)
    expect(firstSource.disconnect).toHaveBeenCalledTimes(1)

    env.controller.enable()
    await settlePromises()

    expect(env.controller.getSnapshot().status).toBe('on')
    expect(env.contexts).toHaveLength(1)
    expect(env.fetchAudio).toHaveBeenCalledTimes(1)
    expect(getItem(env.contexts).decodeAudioData).toHaveBeenCalledTimes(1)
    expect(env.sources).toHaveLength(2)
    expect(getItem(env.sources, 1).buffer).toBe(firstBuffer)
    expect(env.storage.get(RADIO_PREFERENCE_KEY)).toBe('on')
    env.controller.dispose()
  })

  it('freezes the waveform while OFF and resumes it from the audio timeline', async () => {
    const env = createEnvironment()
    env.controller.initialize()
    await settlePromises()
    const context = getItem(env.contexts)

    context.currentTime = 62.5
    const activeWaveform = env.controller.getLiveWaveformPath()
    expect(env.controller.getPlaybackPosition()).toEqual({
      position: 62.5,
      duration: 64,
    })

    context.state = 'suspended'
    env.triggerContextStateChange()
    expect(env.controller.getSnapshot().playbackActive).toBe(false)
    expect(env.controller.getPlaybackPosition().position).toBe(62.5)
    env.controller.disable()
    expect(env.controller.getPlaybackPosition().position).toBe(62.5)
    expect(env.controller.getLiveWaveformPath()).toBe(activeWaveform)

    context.state = 'running'
    env.triggerContextStateChange()
    expect(env.controller.getSnapshot().playbackActive).toBe(false)
    env.controller.enable()
    await settlePromises()

    expect(getItem(env.sources, 1).start).toHaveBeenCalledWith(0, 62.5)
    expect(env.controller.getSnapshot().playbackActive).toBe(true)
    expect(env.controller.getPlaybackPosition().position).toBe(62.5)
    expect(env.controller.getLiveWaveformPath()).toBe(activeWaveform)

    context.currentTime += 1.75
    expect(env.controller.getPlaybackPosition().position).toBeCloseTo(0.25)
    expect(env.controller.getLiveWaveformPath()).not.toBe(activeWaveform)
    env.controller.dispose()
  })

  it('updates the shared gain for accessible volume changes', async () => {
    const env = createEnvironment()
    env.controller.initialize()
    await settlePromises()
    env.controller.setVolume(0.7)

    expect(getItem(env.gains).gain.setTargetAtTime).toHaveBeenCalledWith(
      0.7,
      0,
      0.02,
    )
    expect(env.controller.getSnapshot().volume).toBe(0.7)
    env.controller.dispose()
  })

  it('reports decode failures and clearly identifies standard-loop fallback playback', async () => {
    const env = createEnvironment({
      decode: async () => {
        throw new Error('Unsupported FLAC frame.')
      },
    })
    env.controller.initialize()
    await settlePromises()

    expect(env.controller.getSnapshot().status).toBe('standard-loop-on')
    expect(env.controller.getSnapshot().error).toContain(
      'Unsupported FLAC frame.',
    )
    expect(env.controller.getSnapshot().error).toContain(
      'loop interruptions may occur',
    )
    expect(env.fallbackAudios).toHaveLength(1)
    const fallbackAudio = getItem(env.fallbackAudios)
    expect(fallbackAudio.loop).toBe(true)
    expect(fallbackAudio.volume).toBe(INITIAL_RADIO_VOLUME)

    env.controller.disable()
    expect(fallbackAudio.pause).toHaveBeenCalledTimes(1)
    env.controller.dispose()
  })

  it('keeps failed playback OFF and exposes the actual error', async () => {
    const env = createEnvironment({
      start: () => {
        throw new Error('Source start failed.')
      },
    })
    env.controller.initialize()
    await settlePromises()

    expect(env.controller.getSnapshot().status).toBe('off')
    expect(env.controller.getSnapshot().error).toBe('Source start failed.')
    expect(env.storage.has(RADIO_PREFERENCE_KEY)).toBe(false)
    env.controller.dispose()
  })

  it('stops active sources and closes the context on disposal', async () => {
    const env = createEnvironment()
    env.controller.initialize()
    await settlePromises()
    env.controller.dispose()

    expect(getItem(env.sources).stop).toHaveBeenCalledTimes(1)
    expect(getItem(env.sources).disconnect).toHaveBeenCalledTimes(1)
    expect(getItem(env.gains).disconnect).toHaveBeenCalledTimes(1)
    expect(getItem(env.contexts).close).toHaveBeenCalledTimes(1)
    expect(getItem(env.contexts).state).toBe('closed')
  })
})
