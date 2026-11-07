import { describe, expect, it } from 'vitest'
import {
  createLiveWaveformPath,
  createWaveformOverview,
  createWaveformPath,
  getLoopedPlaybackPosition,
  WAVEFORM_BUCKETS_PER_SECOND,
  WAVEFORM_MEDIAN_WINDOW_BUCKETS,
  WAVEFORM_VISUAL_GAIN,
  WAVEFORM_WINDOW_SECONDS,
  shouldAnimateWaveform,
  type WaveformPeak,
  type WaveformPeaks,
} from '../src/audio/waveform'
import type { DecodedRadioBuffer } from '../src/audio/radioController'

function createBuffer(samples: number[]): DecodedRadioBuffer {
  const channelData = Float32Array.from(samples)

  return {
    duration: 64,
    length: channelData.length,
    numberOfChannels: 1,
    sampleRate: 48_000,
    getChannelData: () => channelData,
  }
}

function createWaveformPeaks(
  duration: number,
  peaks: readonly WaveformPeak[],
): WaveformPeaks {
  return { duration, peaks, visualPeaks: peaks }
}

describe('radio waveform', () => {
  it('creates ordered min/max peaks from the actual positive and negative samples', () => {
    const samples = [-0.8, 0.1, 0.4, -0.2, 0.02, -0.03, 0.06, 0]
    const waveform = createWaveformOverview(createBuffer(samples), 4)

    expect(waveform.duration).toBe(64)
    expect(waveform.peaks).toHaveLength(4)
    expect(waveform.peaks[0]?.min).toBeCloseTo(-0.8)
    expect(waveform.peaks[0]?.max).toBeCloseTo(0.1)
    expect(waveform.peaks[1]?.min).toBeCloseTo(-0.2)
    expect(waveform.peaks[1]?.max).toBeCloseTo(0.4)
    expect(waveform.peaks[2]?.min).toBeCloseTo(-0.03)
    expect(waveform.peaks[2]?.max).toBeCloseTo(0.02)
    expect(waveform.peaks[3]?.min).toBe(0)
    expect(waveform.peaks[3]?.max).toBeCloseTo(0.06)
  })

  it('preserves quiet and loud section proportions and never mutates source samples', () => {
    const samples = [-0.9, 0.8, -0.01, 0.02]
    const buffer = createBuffer(samples)
    const original = Array.from(buffer.getChannelData(0))
    const waveform = createWaveformOverview(buffer, 2)

    expect(waveform.peaks[0]?.max).toBeGreaterThan(
      Math.abs(waveform.peaks[1]?.min ?? 0),
    )
    expect(Array.from(buffer.getChannelData(0))).toEqual(original)
  })

  it('uses a stable full-buffer peak resolution of 400 buckets per second', () => {
    const waveform = createWaveformOverview(
      createBuffer(
        new Array<number>(64 * WAVEFORM_BUCKETS_PER_SECOND).fill(0.01),
      ),
    )

    expect(WAVEFORM_BUCKETS_PER_SECOND).toBe(400)
    expect(waveform.peaks).toHaveLength(25_600)
    expect(waveform.visualPeaks).toHaveLength(25_600)
    expect(WAVEFORM_MEDIAN_WINDOW_BUCKETS).toBe(3)
  })

  it('reduces isolated small fluctuations without mutating raw peaks', () => {
    const samples = [
      -0.1, 0.1, -0.1, 0.1, -0.1, 0.1, -0.12, 0.12, -0.1, 0.1, -0.1, 0.1,
    ]
    const waveform = createWaveformOverview(createBuffer(samples), 6)

    expect(waveform.peaks[3]?.min).toBeCloseTo(-0.12)
    expect(waveform.peaks[3]?.max).toBeCloseTo(0.12)
    expect(waveform.visualPeaks[3]?.min).toBeCloseTo(-0.1)
    expect(waveform.visualPeaks[3]?.max).toBeCloseTo(0.1)
    expect(waveform.visualPeaks).not.toBe(waveform.peaks)
  })

  it('preserves sustained peaks and strong positive and negative transients', () => {
    const samples = [
      -0.1, 0.1, -0.3, 0.3, -0.3, 0.3, -0.3, 0.3, -0.1, 0.1, -0.1, 0.1, -0.7,
      0.7, -0.1, 0.1, -0.1, 0.1,
    ]
    const waveform = createWaveformOverview(createBuffer(samples), 9)

    expect(waveform.visualPeaks[3]?.min).toBeCloseTo(-0.3)
    expect(waveform.visualPeaks[3]?.max).toBeCloseTo(0.3)
    expect(waveform.visualPeaks[6]?.min).toBeCloseTo(-0.7)
    expect(waveform.visualPeaks[6]?.max).toBeCloseTo(0.7)
    for (const peak of waveform.visualPeaks) {
      expect(peak.min).toBeCloseTo(-peak.max)
    }
  })

  it('uses symmetric 1.5x visual gain with clipping headroom', () => {
    const waveform = createWaveformOverview(
      createBuffer([-0.8, 0.8, -0.02, 0.02]),
      2,
    )
    const path = createWaveformPath(waveform)
    const lowGainPath = createWaveformPath(waveform, 320, 180, 360)

    expect(waveform.peaks).toHaveLength(2)
    expect(WAVEFORM_VISUAL_GAIN).toBe(540)
    expect(path).toContain('M0.00 18.00V162.00')
    expect(path).not.toBe(lowGainPath)
    expect(path).toContain('M320.00 79.20V100.80')
  })

  it('keeps the same gain across quiet and loud windows without normalization', () => {
    const peakData = Array.from({ length: 4000 }, (_, index) => {
      const amplitude = index < 2000 ? 0.02 : 0.08
      return { min: -amplitude, max: amplitude }
    })
    const peaks = createWaveformPeaks(10, peakData)
    const quiet = createLiveWaveformPath(peaks, 4)
    const loud = createLiveWaveformPath(peaks, 9)

    expect(quiet).not.toBe(loud)
    expect(quiet).toContain('79.20V100.80')
    expect(loud).toContain('46.80V133.20')
  })

  it('smoothly interpolates fractional peak positions', () => {
    const peakData = Array.from({ length: 1600 }, (_, index) => ({
      min: -0.05 - index * 0.00001,
      max: 0.05 + index * 0.00001,
    }))
    const peaks = createWaveformPeaks(4, peakData)
    const first = createLiveWaveformPath(peaks, 2)
    const next = createLiveWaveformPath(peaks, 2.001)
    const firstY = Number(first.match(/^M[\d.]+ ([\d.]+)/)?.[1])
    const nextY = Number(next.match(/^M[\d.]+ ([\d.]+)/)?.[1])

    expect(Math.abs(nextY - firstY)).toBeLessThan(0.1)
    expect(WAVEFORM_WINDOW_SECONDS).toBe(1)
  })

  it('rejects empty or invalid decoded buffers', () => {
    const emptyBuffer = createBuffer([])

    expect(() => createWaveformOverview(emptyBuffer)).toThrow(
      'The decoded audio buffer is not valid for a waveform.',
    )
    expect(() =>
      createWaveformOverview(createBuffer([Number.NaN, 0]), 1),
    ).toThrow('The decoded audio buffer contains invalid samples.')
    expect(() =>
      createWaveformPath({ duration: 1, peaks: [], visualPeaks: [] }),
    ).toThrow('The waveform dimensions or amplitude scale are invalid.')
  })

  it('extracts exactly one second of real peaks and wraps at loop boundaries', () => {
    const samples = Array.from({ length: 25_600 }, (_, index) => {
      const time = index / 400
      return time >= 3 && time < 4
        ? 0.02
        : time >= 33 && time < 34
          ? 0.4
          : time >= 63.5
            ? -0.3
            : 0
    })
    const overview = createWaveformOverview(createBuffer(samples))
    const firstWindow = createLiveWaveformPath(overview, 4)
    const laterWindow = createLiveWaveformPath(overview, 34)
    const wrappedWindow = createLiveWaveformPath(overview, 0.5)

    expect(overview.peaks).toHaveLength(64 * WAVEFORM_BUCKETS_PER_SECOND)
    expect(firstWindow.match(/M/g)).toHaveLength(400)
    expect(laterWindow).not.toBe(firstWindow)
    expect(wrappedWindow).toContain('M')
    expect(wrappedWindow).not.toBe(firstWindow)
    expect(createLiveWaveformPath(overview, 0.1)).toBe(
      createLiveWaveformPath(overview, 64.1),
    )
    expect(() => createLiveWaveformPath(overview, Number.NaN)).toThrow(
      'The live waveform window or position is invalid.',
    )
    expect(() => createLiveWaveformPath(overview, 4, 65)).toThrow(
      'The live waveform window or position is invalid.',
    )
  })

  it('tracks playback position across loops, pauses, and resumed source offsets', () => {
    expect(getLoopedPlaybackPosition(65, 0, 0, 64)).toEqual({
      position: 1,
      duration: 64,
    })
    expect(getLoopedPlaybackPosition(62.5, 0, 0, 64).position).toBe(62.5)
    expect(getLoopedPlaybackPosition(64.25, 62.5, 62.5, 64)).toEqual({
      position: 0.25,
      duration: 64,
    })
    expect(getLoopedPlaybackPosition(10, 0, 0, 0)).toEqual({
      position: 0,
      duration: 0,
    })
  })

  it('animates only when playback is active and motion is allowed', () => {
    const state = {
      waveformReady: true,
      prefersReducedMotion: false,
      documentVisible: true,
    }

    expect(shouldAnimateWaveform(state)).toBe(true)
    expect(
      shouldAnimateWaveform({ ...state, prefersReducedMotion: true }),
    ).toBe(false)
    expect(shouldAnimateWaveform({ ...state, documentVisible: false })).toBe(
      false,
    )
  })
})
