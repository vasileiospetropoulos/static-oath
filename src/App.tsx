import { useEffect, useRef, useState } from 'react'
import { useRadioAmbience } from './audio/useRadioAmbience'
import { shouldAnimateWaveform } from './audio/waveform'
import { assignPlayers, type AssignedPlayer } from './game/assignment'
import {
  arePlayerNamesComplete,
  createEmptyPlayerNames,
  updatePlayerName,
} from './game/registration'
import {
  createBrowserUiSoundManager,
  type UiButtonSound,
  type UiSoundManager,
} from './audio/uiSoundManager'
import english from './localization/en/common.json'
import './App.css'

function App() {
  const waveformRef = useRef<SVGPathElement>(null)
  const [screen, setScreen] = useState<
    'menu' | 'registration' | 'handoff' | 'reveal' | 'complete'
  >('menu')
  const [playerNames, setPlayerNames] = useState(createEmptyPlayerNames)
  const [assignedPlayers, setAssignedPlayers] = useState<AssignedPlayer[]>([])
  const [activePlayerIndex, setActivePlayerIndex] = useState(0)
  const [registrationSessionStarted, setRegistrationSessionStarted] =
    useState(false)
  const uiSoundManagerRef = useRef<UiSoundManager | null>(null)
  const radio = useRadioAmbience()
  const waveformReady = radio.waveformReady
  const getLiveWaveformPath = radio.getLiveWaveformPath

  useEffect(() => {
    uiSoundManagerRef.current ??= createBrowserUiSoundManager()
  }, [])

  const playButtonSound = (
    button: HTMLButtonElement,
    sound: UiButtonSound = 'interaction',
  ) => {
    uiSoundManagerRef.current ??= createBrowserUiSoundManager()
    uiSoundManagerRef.current.playButton(button, sound)
  }

  useEffect(() => {
    const waveform = waveformRef.current

    if (!waveform) {
      return
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let animationFrame = 0
    let lastUpdateTime: number | null = null
    const updateInterval = 1000 / 60

    const updateWaveform = () => {
      const path = getLiveWaveformPath()

      if (path) {
        waveform.setAttribute('d', path)
      }
    }

    const animateWaveform = (timestamp: number) => {
      if (lastUpdateTime === null) {
        updateWaveform()
        lastUpdateTime = timestamp
      } else if (timestamp - lastUpdateTime >= updateInterval) {
        lastUpdateTime = timestamp
        updateWaveform()
      }

      animationFrame = window.requestAnimationFrame(animateWaveform)
    }

    const updateAnimation = () => {
      window.cancelAnimationFrame(animationFrame)
      animationFrame = 0
      updateWaveform()
      lastUpdateTime = null

      if (
        shouldAnimateWaveform({
          waveformReady,
          prefersReducedMotion: reducedMotion.matches,
          documentVisible: !document.hidden,
        })
      ) {
        animationFrame = window.requestAnimationFrame(animateWaveform)
      }
    }

    updateAnimation()
    reducedMotion.addEventListener('change', updateAnimation)
    document.addEventListener('visibilitychange', updateAnimation)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      reducedMotion.removeEventListener('change', updateAnimation)
      document.removeEventListener('visibilitychange', updateAnimation)
    }
  }, [getLiveWaveformPath, waveformReady])

  return (
    <main
      className="operations-shell"
      onPointerDownCapture={(event) => {
        if (
          event.target instanceof Element &&
          event.target.closest('.radio-toggle')
        ) {
          return
        }

        radio.unlockFromUserGesture()
      }}
      onKeyDownCapture={(event) => {
        if (
          event.target instanceof Element &&
          event.target.closest('.radio-toggle')
        ) {
          return
        }

        radio.unlockFromUserGesture()
      }}
    >
      <header className="topbar">
        <a className="wordmark" href="./" aria-label={english.title}>
          <span className="wordmark-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="wordmark-name">STATIC OATH</span>
        </a>
        <div className="topbar-meta">
          <span className="facility-id">FIELD OFFICE // A-17</span>
          <span className="build-label">{english.buildLabel}</span>
        </div>
      </header>

      <section className="hero" aria-labelledby="project-title">
        <div className="hero-copy">
          {screen === 'menu' ? (
            <>
              <div className="hero-kicker">
                <span className="status-dot" aria-hidden="true" />
                {english.eyebrow}
              </div>
              <h1 id="project-title" aria-label="STATIC OATH">
                <span className="title-static" aria-hidden="true">
                  {Array.from('STATIC').map((letter, index) => (
                    <span className="title-letter" key={index}>
                      {letter}
                    </span>
                  ))}
                </span>
                <span className="title-oath" aria-hidden="true">
                  {Array.from('OATH').map((letter, index) => (
                    <span className="title-letter" key={index}>
                      {letter}
                    </span>
                  ))}
                </span>
              </h1>
              <p className="tagline">{english.tagline}</p>

              <div className="system-panel" aria-label={english.statusLabel}>
                <div className="panel-heading">
                  <span>{english.statusLabel}</span>
                  <span className="panel-code">{english.panelCode}</span>
                </div>
                <button
                  className="play-button"
                  type="button"
                  onClick={(event) => {
                    playButtonSound(event.currentTarget)
                    if (!registrationSessionStarted) {
                      setPlayerNames(createEmptyPlayerNames())
                      setAssignedPlayers([])
                      setActivePlayerIndex(0)
                      setRegistrationSessionStarted(true)
                    }
                    setScreen('registration')
                  }}
                >
                  <span className="status-indicator" aria-hidden="true" />
                  <span className="play-button-copy">
                    <span className="play-button-label">
                      {english.playLabel}
                    </span>
                    <span className="play-button-support">
                      {english.playSupport}
                    </span>
                  </span>
                </button>
              </div>
            </>
          ) : (
            <div className="registration-copy">
              <div className="hero-kicker">
                <span className="status-dot" aria-hidden="true" />
                {english.eyebrow}
              </div>
              {screen === 'registration' && (
                <>
                  <h1 className="registration-title" id="project-title">
                    {english.registrationTitle}
                  </h1>
                  <p className="registration-subtitle">
                    {english.registrationSubtitle}
                  </p>
                  <div className="registration-panel">
                    <div className="registration-fields">
                      {english.playerLabels.map((label, index) => (
                        <label className="player-field" key={label}>
                          <span>{label}</span>
                          <input
                            type="text"
                            name={`player-${index + 1}`}
                            autoComplete="off"
                            value={playerNames[index]}
                            onChange={(event) => {
                              const name = event.currentTarget.value
                              setPlayerNames((currentNames) =>
                                updatePlayerName(currentNames, index, name),
                              )
                            }}
                          />
                        </label>
                      ))}
                    </div>
                    <div className="registration-actions">
                      <button
                        className="back-button"
                        type="button"
                        onClick={(event) => {
                          playButtonSound(event.currentTarget)
                          setScreen('menu')
                        }}
                      >
                        {english.backLabel}
                      </button>
                      <button
                        className="next-button"
                        type="button"
                        disabled={!arePlayerNamesComplete(playerNames)}
                        onClick={(event) => {
                          if (!arePlayerNamesComplete(playerNames)) {
                            return
                          }

                          const players = assignPlayers(playerNames)
                          playButtonSound(event.currentTarget, 'next')
                          setAssignedPlayers(players)
                          setActivePlayerIndex(0)
                          setScreen('handoff')
                        }}
                      >
                        {english.nextLabel}
                      </button>
                    </div>
                  </div>
                </>
              )}
              {screen === 'handoff' && (
                <>
                  <h1 className="registration-title" id="project-title">
                    {english.privacyHandoffTitle}
                  </h1>
                  <p className="registration-subtitle">
                    {english.privacyHandoffSubtitle}
                  </p>
                  <div className="registration-panel handoff-panel">
                    <p className="handoff-player">
                      {assignedPlayers[activePlayerIndex]?.name}
                    </p>
                    <p className="handoff-instruction">
                      {english.privacyHandoffInstruction}
                    </p>
                    <button
                      className="next-button"
                      type="button"
                      onClick={(event) => {
                        playButtonSound(event.currentTarget)
                        setScreen('reveal')
                      }}
                    >
                      {english.revealButton}
                    </button>
                  </div>
                </>
              )}
              {screen === 'reveal' && assignedPlayers[activePlayerIndex] && (
                <>
                  <h1 className="registration-title" id="project-title">
                    {english.classifiedDataTitle}
                  </h1>
                  <p className="registration-subtitle">
                    {assignedPlayers[activePlayerIndex].name}
                  </p>
                  <div className="registration-panel classified-panel">
                    <div className="classified-field">
                      <span>{english.workstationLabel}</span>
                      <strong>
                        {assignedPlayers[activePlayerIndex].workstation}
                      </strong>
                    </div>
                    <div className="classified-field">
                      <span>{english.allegianceLabel}</span>
                      <strong>
                        {assignedPlayers[activePlayerIndex].allegiance}
                      </strong>
                    </div>
                    <button
                      className="next-button"
                      type="button"
                      onClick={(event) => {
                        playButtonSound(event.currentTarget)
                        if (activePlayerIndex === assignedPlayers.length - 1) {
                          setScreen('complete')
                          return
                        }

                        setActivePlayerIndex((index) => index + 1)
                        setScreen('handoff')
                      }}
                    >
                      {english.hideContinueButton}
                    </button>
                  </div>
                </>
              )}
              {screen === 'complete' && (
                <>
                  <h1 className="registration-title" id="project-title">
                    {english.briefingCompleteTitle}
                  </h1>
                  <p className="registration-subtitle">
                    {english.briefingCompleteSubtitle}
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="signal-plate" aria-hidden="true">
          <div className="plate-screw plate-screw-top" />
          <div className="plate-screw plate-screw-bottom" />
          <div className="plate-heading">
            <span>RECEIVER // 04</span>
            <span className="plate-mark">A-17</span>
          </div>
          <div className="scope-window">
            <div className="scope-grid" />
            <div className="scope-ring" />
            <svg
              className="scope-trace"
              viewBox="0 0 320 180"
              preserveAspectRatio="none"
            >
              <path ref={waveformRef} d="" />
            </svg>
            <span className="scope-index scope-index-top">RX / 17</span>
            <span className="scope-index scope-index-bottom">NO CARRIER</span>
          </div>
          <div className="plate-footer">
            <span>ANALOG BAND / 03</span>
            <span className="plate-led" />
          </div>
        </div>

        <div className="registration-mark" aria-hidden="true">
          <span>FIELD UNIT</span>
          <span>NO. 017</span>
          <span>UNVERIFIED</span>
        </div>
      </section>

      <footer className="footer">
        <span className="footer-label">{english.footerLabel}</span>
        <span className="footer-status">
          <button
            className="radio-toggle"
            type="button"
            aria-label={
              radio.status === 'on' || radio.status === 'standard-loop-on'
                ? 'Turn radio ambience off'
                : 'Turn radio ambience on'
            }
            aria-pressed={
              radio.status === 'on' || radio.status === 'standard-loop-on'
            }
            aria-describedby={radio.error ? 'radio-error' : undefined}
            title={radio.error ?? undefined}
            onClick={(event) => {
              playButtonSound(event.currentTarget)
              radio.toggle()
            }}
          >
            {radio.status === 'on'
              ? 'RADIO / ON'
              : radio.status === 'standard-loop-on'
                ? 'RADIO / ON (STANDARD LOOP)'
                : radio.status === 'tap-to-enable'
                  ? 'RADIO / TAP TO ENABLE'
                  : radio.status === 'starting' || radio.status === 'loading'
                    ? 'RADIO / STARTING'
                    : 'RADIO / OFF'}
          </button>
          <input
            className="radio-volume"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={radio.volume}
            aria-label="Radio ambience volume"
            aria-valuetext={`${Math.round(radio.volume * 100)}%`}
            onChange={(event) =>
              radio.setVolume(Number(event.currentTarget.value))
            }
          />
          {radio.error && (
            <span className="radio-error" id="radio-error" role="status">
              {radio.error}
            </span>
          )}
          <span className="footer-rule" aria-hidden="true" />
          {english.footerStatus}
        </span>
      </footer>
    </main>
  )
}

export default App
