import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createBrowserRadioController,
  INITIAL_RADIO_VOLUME,
  type RadioSnapshot,
} from './radioController'

const INITIAL_SNAPSHOT: RadioSnapshot = {
  status: 'off',
  volume: INITIAL_RADIO_VOLUME,
  error: null,
  waveformReady: false,
  duration: 0,
  playbackActive: false,
}

export function useRadioAmbience() {
  const controllerRef = useRef<ReturnType<
    typeof createBrowserRadioController
  > | null>(null)
  const [snapshot, setSnapshot] = useState(INITIAL_SNAPSHOT)

  useEffect(() => {
    const assetUrl = new URL(
      `${import.meta.env.BASE_URL}audio/old-radio-main-menu.flac`,
      window.location.href,
    )
    const controller = createBrowserRadioController(assetUrl.href)
    controllerRef.current = controller
    const unsubscribe = controller.subscribe(setSnapshot)
    controller.initialize()

    return () => {
      unsubscribe()
      controller.dispose()
      controllerRef.current = null
    }
  }, [])

  const toggle = useCallback(() => {
    controllerRef.current?.toggle()
  }, [])

  const setVolume = useCallback((volume: number) => {
    controllerRef.current?.setVolume(volume)
  }, [])

  const getLiveWaveformPath = useCallback(
    () => controllerRef.current?.getLiveWaveformPath() ?? null,
    [],
  )

  return { ...snapshot, toggle, setVolume, getLiveWaveformPath }
}
