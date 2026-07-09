import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { initDevApi } from './devApi'
import App from './App.tsx'

// Inject in-memory mock when running outside Electron (Vite-only dev).
// No-op when the real preload script has already set window.api.
initDevApi()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
