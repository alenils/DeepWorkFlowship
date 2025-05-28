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
    // This can be extended to show a UI prompt to the user
    if (confirm('New version available. Reload to update?')) {
      updateSW()
    }
  },
  onOfflineReady() {
    console.log('App ready for offline use')
  },
  onRegistered(registration) {
    console.log('Service worker registered:', registration)
  },
  onRegisterError(error) {
    console.error('Service worker registration failed:', error)
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PostureProvider>
      <AudioProvider>
        <App />
      </AudioProvider>
    </PostureProvider>
  </React.StrictMode>,
) 