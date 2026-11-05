import { useEffect, useRef } from 'react'
import { useRadioAmbience } from './audio/useRadioAmbience'
import { shouldAnimateWaveform } from './audio/waveform'
import english from './localization/en/common.json'
import './App.css'

function App() {
  const waveformRef = useRef<SVGPathElement>(null)
  const radio = useRadioAmbience()
  const playbackActive = radio.playbackActive
  const waveformReady = radio.waveformReady
  const getLiveWaveformPath = radio.getLiveWaveformPath

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
          playbackActive,
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
  }, [getLiveWaveformPath, playbackActive, waveformReady])

  return (
    <main className="operations-shell">
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
            <div className="system-status">
              <span className="status-indicator" aria-hidden="true" />
              <h2>{english.statusValue}</h2>
            </div>
            <p>{english.description}</p>
          </div>
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
            onClick={radio.toggle}
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
