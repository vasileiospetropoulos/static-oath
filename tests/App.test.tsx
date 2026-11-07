import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from '../src/App'

describe('application foundation', () => {
  it('renders the STATIC OATH identity, accessible title, and play entry point', () => {
    const markup = renderToStaticMarkup(<App />)

    expect(markup).toContain('STATIC')
    expect(markup).toContain('<h1 id="project-title" aria-label="STATIC OATH">')
    expect(markup.match(/class="title-letter"/g)).toHaveLength(10)
    expect(markup).toContain('RADIO / OFF')
    expect(markup).toContain('aria-label="Radio ambience volume"')
    expect(markup).toContain('TRUST THE CREW, DOUBT THE SIGNAL...')
    expect(markup).toContain('ALPHA VERSION / 0.1')
    expect(markup).toContain('ALPHA VERSION</span>')
    expect(markup).not.toContain('LOCAL BUILD')
    expect(markup).toContain('SENSOR ARRAY')
    expect(markup).toContain('PLAY')
    expect(markup).toContain('INITIALIZE NEW SESSION // 4 PLAYERS')
    expect(markup).not.toContain('FOUNDATION ONLINE')
    expect(markup).not.toContain('PLAYER REGISTRATION')
    expect(markup).not.toContain('Start game')
  })
})
