import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted fonts (bundled by Vite) — no runtime dependency on Google Fonts
import '@fontsource/orbitron/400.css'
import '@fontsource/orbitron/700.css'
import '@fontsource/share-tech-mono/400.css'
import '@fontsource/rajdhani/400.css'
import '@fontsource/rajdhani/600.css'
import '@fontsource/vt323/400.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
