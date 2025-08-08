import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { PostureProvider } from './context/PostureContext'
import { AudioProvider } from './features/audio/AudioProvider'
import { registerSW } from 'virtual:pwa-register'

// Register service worker for PWA functionality
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New version available. Reload to update?')) {
      updateSW()
    }
  },
  onOfflineReady() {},
  onRegisterError(error) {
    console.error('Service worker registration failed:', error)
  }
})

const isDev = import.meta.env.DEV

const Root = (
  <PostureProvider>
    <AudioProvider>
      <App />
    </AudioProvider>
  </PostureProvider>
)

ReactDOM.createRoot(document.getElementById('root')!).render(
  isDev ? (
    // Development: render without StrictMode to avoid double mount
    Root
  ) : (
    // Production: keep StrictMode for safety
    <React.StrictMode>{Root}</React.StrictMode>
  )
)