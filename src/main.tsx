import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('The application root element was not found.')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const serviceWorkerUrl = new URL(
    'sw.js',
    new URL(import.meta.env.BASE_URL, window.location.href),
  )

  void navigator.serviceWorker
    .register(serviceWorkerUrl)
    .catch((error: unknown) => {
      console.error('Service worker registration failed.', error)
    })
}
