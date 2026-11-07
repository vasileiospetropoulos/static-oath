import type { DecodedRadioBuffer } from './radioController'

export interface WaveformPeak {
  min: number
  max: number
}

export interface WaveformPeaks {
  duration: number
  peaks: readonly WaveformPeak[]
  visualPeaks: readonly WaveformPeak[]
}

export const WAVEFORM_WINDOW_SECONDS = 1
export const WAVEFORM_BUCKETS_PER_SECOND = 400
export const WAVEFORM_VISUAL_GAIN = 540
export const WAVEFORM_MEDIAN_WINDOW_BUCKETS = 3

const TRANSIENT_PRESERVATION_THRESHOLD = 0.04

function median(first: number, second: number, third: number): number {
  return Math.max(
    Math.min(first, second),
    Math.min(Math.max(first, second), third),
  )
}

function smoothVisualPeaks(peaks: readonly WaveformPeak[]): WaveformPeak[] {
  return peaks.map((peak, index) => {
    const previous = peaks[(index - 1 + peaks.length) % peaks.length]
    const next = peaks[(index + 1) % peaks.length]

    if (!previous || !next) {
      throw new RangeError('The waveform peak data is incomplete.')
    }

    const filteredMin = median(previous.min, peak.min, next.min)
    const filteredMax = median(previous.max, peak.max, next.max)

    return {
      min:
        peak.min < filteredMin - TRANSIENT_PRESERVATION_THRESHOLD
          ? peak.min
          : filteredMin,
      max:
        peak.max > filteredMax + TRANSIENT_PRESERVATION_THRESHOLD
          ? peak.max
          : filteredMax,
    }
  })
}

export function createWaveformOverview(
  buffer: DecodedRadioBuffer,
  bucketCount = Math.round(buffer.duration * WAVEFORM_BUCKETS_PER_SECOND),
): WaveformPeaks {
  if (
    !Number.isFinite(buffer.duration) ||
    buffer.duration <= 0 ||
    !Number.isInteger(buffer.length) ||
    buffer.length <= 0 ||
    !Number.isInteger(buffer.numberOfChannels) ||
    buffer.numberOfChannels < 1 ||
    !Number.isInteger(bucketCount) ||
    bucketCount < 1 ||
    bucketCount > buffer.length
  ) {
    throw new RangeError(
      'The decoded audio buffer is not valid for a waveform.',
    )
  }

  const samples = buffer.getChannelData(0)

  if (samples.length < buffer.length) {
    throw new RangeError(
      'The decoded audio buffer contains incomplete samples.',
    )
  }

  const peaks: WaveformPeak[] = []

  for (let bucket = 0; bucket < bucketCount; bucket += 1) {
    const start = Math.floor((bucket * buffer.length) / bucketCount)
    const end = Math.floor(((bucket + 1) * buffer.length) / bucketCount)
    let min = Infinity
    let max = -Infinity

    for (let index = start; index < end; index += 1) {
      const sample = samples[index]

      if (sample === undefined || !Number.isFinite(sample)) {
        throw new RangeError(
          'The decoded audio buffer contains invalid samples.',
        )
      }

      min = Math.min(min, sample)
      max = Math.max(max, sample)
    }

    peaks.push({ min, max })
  }

  return {
    duration: buffer.duration,
    peaks,
    visualPeaks: smoothVisualPeaks(peaks),
  }
}

export function createWaveformPath(
  peaks: WaveformPeaks,
  width = 320,
  height = 180,
  visualGain = WAVEFORM_VISUAL_GAIN,
): string {
  if (
    peaks.peaks.length === 0 ||
    !Number.isFinite(width) ||
    width <= 0 ||
    !Number.isFinite(height) ||
    height <= 0 ||
    !Number.isFinite(visualGain) ||
    visualGain <= 0
  ) {
    throw new RangeError(
      'The waveform dimensions or amplitude scale are invalid.',
    )
  }

  const center = height / 2
  const amplitudeLimit = height * 0.4
  const toY = (sample: number) =>
    center -
    Math.max(-amplitudeLimit, Math.min(amplitudeLimit, sample * visualGain))
  const lastIndex = peaks.peaks.length - 1

  return peaks.peaks
    .map(({ min, max }, index) => {
      const x = lastIndex === 0 ? width / 2 : (index * width) / lastIndex
      return `M${x.toFixed(2)} ${toY(max).toFixed(2)}V${toY(min).toFixed(2)}`
    })
    .join('')
}

export function createLiveWaveformPath(
  waveform: WaveformPeaks,
  position: number,
  windowSeconds = WAVEFORM_WINDOW_SECONDS,
  width = 320,
  height = 180,
  visualGain = WAVEFORM_VISUAL_GAIN,
): string {
  if (
    !Number.isFinite(waveform.duration) ||
    waveform.duration <= 0 ||
    !Number.isFinite(position) ||
    !Number.isFinite(windowSeconds) ||
    windowSeconds <= 0 ||
    windowSeconds > waveform.duration ||
    waveform.peaks.length < 1
  ) {
    throw new RangeError('The live waveform window or position is invalid.')
  }

  const peaks = waveform.visualPeaks
  const duration = waveform.duration
  const bucketsPerSecond = peaks.length / duration
  const bucketCount = Math.max(1, Math.round(windowSeconds * bucketsPerSecond))
  const startPosition =
    (((position - windowSeconds) % duration) + duration) % duration
  const startBucket = startPosition * bucketsPerSecond
  const firstBucket = Math.floor(startBucket)
  const fractionalBucket = startBucket - firstBucket
  const peakWindow: WaveformPeak[] = []

  for (let bucket = 0; bucket < bucketCount; bucket += 1) {
    const index = (firstBucket + bucket) % peaks.length
    const peak = peaks[index]
    const nextPeak = peaks[(index + 1) % peaks.length]

    if (!peak || !nextPeak) {
      throw new RangeError('The live waveform peak data is incomplete.')
    }

    peakWindow.push({
      min: peak.min + (nextPeak.min - peak.min) * fractionalBucket,
      max: peak.max + (nextPeak.max - peak.max) * fractionalBucket,
    })
  }

  return createWaveformPath(
    {
      duration: windowSeconds,
      peaks: peakWindow,
      visualPeaks: peakWindow,
    },
    width,
    height,
    visualGain,
  )
}

export function shouldAnimateWaveform(state: {
  waveformReady: boolean
  prefersReducedMotion: boolean
  documentVisible: boolean
}): boolean {
  return (
    state.waveformReady && !state.prefersReducedMotion && state.documentVisible
  )
}

export function getLoopedPlaybackPosition(
  contextTime: number,
  sourceStartTime: number,
  sourceOffset: number,
  duration: number,
): { duration: number; position: number } {
  if (!Number.isFinite(duration) || duration <= 0) {
    return { position: 0, duration: 0 }
  }

  const elapsed = Math.max(0, contextTime - sourceStartTime)
  const position = (((sourceOffset + elapsed) % duration) + duration) % duration

  return { position, duration }
}
