# DeepWork Flowship - PWA Configuration

This document outlines the Progressive Web App (PWA) setup for DeepWork Flowship.

## PWA Features

DeepWork Flowship is configured as a Progressive Web App (PWA) with the following features:

- **Offline Support**: Core application features work without an internet connection
- **Installable**: Can be installed on mobile devices and desktops
- **Responsive**: Works on any device with a browser
- **Automatic Updates**: Service worker automatically updates in the background

## Implementation Details

### Core Technologies

- **Vite PWA Plugin**: Configured through `vite-plugin-pwa` in `vite.config.ts`
- **Workbox**: Handles service worker generation and caching strategies
- **Web Manifest**: Defines app appearance when installed

### Caching Strategy

The app uses different caching strategies for different resource types:

1. **Small Assets** (UI components, CSS, core JS):
   - Precached during service worker installation
   - Available offline immediately

2. **Large Assets** (audio files, ML models):
   - Not precached to keep the initial download small
   - Cached on first use with a "Cache First" strategy
   - Range requests supported for audio streaming
   - 30-day cache lifetime

3. **Google Fonts**:
   - Cached separately with a 1-year expiration
   - "Cache First" strategy for improved performance

### Icon Generation

The app includes automatically generated PWA icons:

- **192x192**: For standard Android/Chrome installations
- **512x512**: For high-resolution displays
- **Maskable Icon**: For adaptive UI on Android
- **Apple Touch Icon**: For iOS home screen
- **Favicon**: For browser tabs

Icons can be regenerated using:

```
npm run generate-icons
```

## Development Notes

### Excluded from Precache

To keep the initial PWA installation small, the following are excluded from the precache manifest:

- `*.mp3` files (large music tracks)
- `vision_wasm_internal.wasm` (MediaPipe ML model)

These are instead cached on first use through runtime caching.

### Maximum Cache Size

Large files exceeding 3MB won't be included in the precache. This is configured in:

```typescript
maximumFileSizeToCacheInBytes: 3000000, // 3MB
```

## Testing PWA Features

1. Build the app: `npm run build`
2. Preview the built app: `npm run preview`
3. Use Chrome DevTools > Application tab > Service Workers to inspect the service worker
4. Test offline functionality by turning off network in DevTools
5. Test installation by clicking the install icon in Chrome's address bar 