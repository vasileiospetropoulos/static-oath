export const DEFAULT_UI_SOUND_VOLUME = 0.8

export const UI_SOUND_FILENAMES = [
  'UI_1.flac',
  'UI_2.flac',
  'UI_3.flac',
  'UI_4.flac',
] as const

export const NEXT_SOUND_FILENAME = 'Next.flac'

export type UiButtonSound = 'interaction' | 'next'

export interface UiSoundAudio {
  preload: '' | 'none' | 'metadata' | 'auto'
  volume: number
  cloneNode(): UiSoundAudio
  load(): void
  play(): Promise<void>
}

export interface UiSoundButton {
  disabled: boolean
}

function adaptAudio(audio: HTMLAudioElement): UiSoundAudio {
  return {
    get preload() {
      return audio.preload
    },
    set preload(value: '' | 'none' | 'metadata' | 'auto') {
      audio.preload = value
    },
    get volume() {
      return audio.volume
    },
    set volume(value: number) {
      audio.volume = value
    },
    cloneNode: () => adaptAudio(audio.cloneNode(true) as HTMLAudioElement),
    load: () => audio.load(),
    play: () => audio.play(),
  }
}

export interface UiSoundManagerOptions {
  assetUrls: {
    interaction: readonly string[]
    next: string
  }
  createAudio: (url: string) => UiSoundAudio
  random?: () => number
  volume?: number
}

export function createUiSoundAssetUrls(
  baseUrl: string,
  pageUrl: string,
): UiSoundManagerOptions['assetUrls'] {
  const createAssetUrl = (filename: string) =>
    new URL(`${baseUrl}audio/ui/${filename}`, pageUrl).href

  return {
    interaction: UI_SOUND_FILENAMES.map(createAssetUrl),
    next: createAssetUrl(NEXT_SOUND_FILENAME),
  }
}

function randomIndex(random: () => number, length: number): number {
  const value = random()
  const index = Number.isFinite(value) ? Math.floor(value * length) : 0
  return Math.max(0, Math.min(length - 1, index))
}

export class UiSoundManager {
  private readonly random: () => number
  private readonly volume: number
  private readonly interactionSounds: UiSoundAudio[]
  private readonly nextSound: UiSoundAudio
  private lastInteractionIndex: number | null = null

  constructor(options: UiSoundManagerOptions) {
    if (options.assetUrls.interaction.length !== UI_SOUND_FILENAMES.length) {
      throw new Error('The UI interaction sound pool must contain four assets.')
    }

    this.random = options.random ?? Math.random
    this.volume = Math.max(
      0,
      Math.min(1, options.volume ?? DEFAULT_UI_SOUND_VOLUME),
    )
    this.interactionSounds = options.assetUrls.interaction.map((url) =>
      this.preload(options.createAudio(url)),
    )
    this.nextSound = this.preload(options.createAudio(options.assetUrls.next))
  }

  playButton(
    button: UiSoundButton,
    sound: UiButtonSound = 'interaction',
  ): void {
    if (button.disabled) {
      return
    }

    if (sound === 'next') {
      this.play(this.nextSound)
      return
    }

    const index =
      this.lastInteractionIndex === null
        ? randomIndex(this.random, this.interactionSounds.length)
        : this.selectDifferentIndex()

    this.lastInteractionIndex = index
    this.play(this.interactionSounds[index]!)
  }

  private selectDifferentIndex(): number {
    const lastIndex = this.lastInteractionIndex
    if (lastIndex === null) {
      return randomIndex(this.random, this.interactionSounds.length)
    }

    const index = randomIndex(this.random, this.interactionSounds.length - 1)
    return index >= lastIndex ? index + 1 : index
  }

  private preload(audio: UiSoundAudio): UiSoundAudio {
    audio.preload = 'auto'
    audio.volume = this.volume
    audio.load()
    return audio
  }

  private play(source: UiSoundAudio): void {
    try {
      const playback = source.cloneNode()
      playback.preload = 'auto'
      playback.volume = this.volume
      void playback.play().catch((error: unknown) => {
        console.warn('UI sound playback failed.', error)
      })
    } catch (error: unknown) {
      console.warn('UI sound playback failed.', error)
    }
  }
}

export function createBrowserUiSoundManager(): UiSoundManager {
  return new UiSoundManager({
    assetUrls: createUiSoundAssetUrls(
      import.meta.env.BASE_URL,
      window.location.href,
    ),
    createAudio: (url) => adaptAudio(new Audio(url)),
  })
}
