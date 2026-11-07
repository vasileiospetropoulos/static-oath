import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createUiSoundAssetUrls,
  DEFAULT_UI_SOUND_VOLUME,
  NEXT_SOUND_FILENAME,
  UiSoundManager,
  UI_SOUND_FILENAMES,
  type UiSoundAudio,
} from '../src/audio/uiSoundManager'

afterEach(() => {
  vi.restoreAllMocks()
})

interface FakeAudio extends UiSoundAudio {
  clones: FakeAudio[]
  load: ReturnType<typeof vi.fn<() => void>>
  play: ReturnType<typeof vi.fn<() => Promise<void>>>
}

function createAudioFactory(play: () => Promise<void> = async () => {}): {
  createAudio: (url: string) => FakeAudio
  audios: FakeAudio[]
} {
  const audios: FakeAudio[] = []

  const createAudio = (url: string): FakeAudio => {
    const audio: FakeAudio = {
      preload: '',
      volume: 0,
      clones: [],
      load: vi.fn<() => void>(),
      play: vi.fn(play),
      cloneNode: vi.fn(() => {
        const clone = createAudio(url)
        audio.clones.push(clone)
        return clone
      }),
    }

    audios.push(audio)
    return audio
  }

  return { createAudio, audios }
}

function createManager(
  random: () => number = () => 0,
  play?: () => Promise<void>,
) {
  const { createAudio, audios } = createAudioFactory(play)
  const assetUrls = {
    interaction: UI_SOUND_FILENAMES.map((filename) => `/audio/ui/${filename}`),
    next: `/audio/ui/${NEXT_SOUND_FILENAME}`,
  }

  return {
    manager: new UiSoundManager({ assetUrls, createAudio, random }),
    audios,
  }
}

describe('UI sound manager', () => {
  it('randomly selects each of the four interaction variations', () => {
    const choices = [0, 0, 0.34, 0.99]
    let choiceIndex = 0
    const { manager, audios } = createManager(() => choices[choiceIndex++] ?? 0)
    const button = { disabled: false }

    for (let index = 0; index < 4; index += 1) {
      manager.playButton(button)
    }

    const selectedIndices = audios.flatMap((audio, index) =>
      audio.clones.length > 0 ? [index] : [],
    )
    expect(selectedIndices).toEqual([0, 1, 2, 3])
    expect(
      audios
        .slice(0, 4)
        .every((audio) => audio.clones[0]?.play.mock.calls.length === 1),
    ).toBe(true)
  })

  it('uses the injected random source to choose variations', () => {
    const { manager, audios } = createManager(() => 0.75)
    manager.playButton({ disabled: false })

    expect(audios[3]?.clones).toHaveLength(1)
    expect(audios[0]?.clones).toHaveLength(0)
  })

  it('does not select the same interaction variation twice consecutively', () => {
    const { manager, audios } = createManager(() => 0)
    const button = { disabled: false }

    manager.playButton(button)
    manager.playButton(button)

    const selectedIndices = audios.flatMap((audio, index) =>
      audio.clones.length > 0 ? [index] : [],
    )
    expect(selectedIndices).toHaveLength(2)
    expect(selectedIndices[0]).not.toBe(selectedIndices[1])
  })

  it('preloads all five assets at the configured independent UI volume', () => {
    const { audios } = createManager()

    expect(audios).toHaveLength(5)
    expect(audios.map((audio) => audio.preload)).toEqual(Array(5).fill('auto'))
    expect(audios.map((audio) => audio.volume)).toEqual(
      Array(5).fill(DEFAULT_UI_SOUND_VOLUME),
    )
    expect(audios.every((audio) => audio.load.mock.calls.length === 1)).toBe(
      true,
    )
  })

  it('applies the configured UI volume to each playing instance', () => {
    const { manager, audios } = createManager()

    manager.playButton({ disabled: false })
    manager.playButton({ disabled: false }, 'next')

    expect(audios[0]?.clones[0]?.volume).toBe(DEFAULT_UI_SOUND_VOLUME)
    expect(audios[4]?.clones[0]?.volume).toBe(DEFAULT_UI_SOUND_VOLUME)
  })

  it('routes NEXT only to Next.flac and does not consume the random pool', () => {
    const random = vi.fn(() => 0)
    const { manager, audios } = createManager(random)

    manager.playButton({ disabled: false }, 'next')

    expect(audios[4]?.clones).toHaveLength(1)
    expect(audios.slice(0, 4).every((audio) => audio.clones.length === 0)).toBe(
      true,
    )
    expect(random).not.toHaveBeenCalled()
  })

  it('does not play any sound for a disabled button', () => {
    const random = vi.fn(() => 0)
    const { manager, audios } = createManager(random)

    manager.playButton({ disabled: true })
    manager.playButton({ disabled: true }, 'next')

    expect(random).not.toHaveBeenCalled()
    expect(audios.every((audio) => audio.clones.length === 0)).toBe(true)
  })

  it('reports synchronous and rejected playback failures without unhandled rejections', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { manager, audios } = createManager(() => 0)
    const firstSource = audios[0]
    if (!firstSource) {
      throw new Error('Expected the first interaction sound.')
    }
    vi.spyOn(firstSource, 'cloneNode').mockImplementation(() => {
      throw new Error('Audio playback unavailable.')
    })

    expect(() => manager.playButton({ disabled: false })).not.toThrow()
    expect(warn).toHaveBeenCalledWith(
      'UI sound playback failed.',
      expect.any(Error),
    )

    const rejected = new Error('Playback was denied.')
    const failed = createManager(
      () => 0.25,
      () => Promise.reject(rejected),
    )
    expect(() => failed.manager.playButton({ disabled: false })).not.toThrow()
    await vi.waitFor(() => {
      expect(warn).toHaveBeenCalledWith('UI sound playback failed.', rejected)
    })
    expect(failed.audios[1]?.clones[0]?.play).toHaveBeenCalledTimes(1)
  })

  it('overlaps successive plays using separate audio instances', () => {
    const { manager, audios } = createManager(() => 0)

    manager.playButton({ disabled: false })
    manager.playButton({ disabled: false })

    const activeInstances = audios.flatMap((audio) => audio.clones)
    expect(activeInstances).toHaveLength(2)
    expect(activeInstances[0]).not.toBe(activeInstances[1])
    expect(
      activeInstances.every((audio) => audio.play.mock.calls.length === 1),
    ).toBe(true)
  })

  it('resolves all sound paths under the configured Vite base path', () => {
    expect(
      createUiSoundAssetUrls(
        '/static-oath/',
        'https://example.test/static-oath/',
      ),
    ).toEqual({
      interaction: UI_SOUND_FILENAMES.map(
        (filename) => `https://example.test/static-oath/audio/ui/${filename}`,
      ),
      next: `https://example.test/static-oath/audio/ui/${NEXT_SOUND_FILENAME}`,
    })
  })
})
