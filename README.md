# DeepWork Flowship

A browser-based posture and focus assistant that helps users maintain good posture and deep concentration during structured work sessions.

## Features

- Real-time posture tracking using MediaPipe
- Pomodoro-style focus sessions
- Session history and statistics
- Fully offline - runs in your browser
- Privacy-focused - no data leaves your device
- Progressive Web App (PWA) support - installable on desktop and mobile

## Development Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

4. Run tests:
```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e
```

5. Generate PWA icons:
```bash
npm run generate-icons
```

## Project Structure

```
src/
  components/     # Reusable UI components
  features/       # Feature-specific components and logic
    posture/     # Posture detection and feedback
    timer/       # Focus session timer
    history/     # Session history and stats
  hooks/         # Shared React hooks
  lib/           # Third-party integrations
  store/         # Zustand state management
  styles/        # Global styles and Tailwind config
docs/            # Documentation
  PWA.md         # PWA implementation details
public/          # Static assets and PWA icons
test/            # Test suites
```

## Progressive Web App

DeepWork Flowship is configured as a Progressive Web App, meaning it can:

- Work offline with cached resources
- Be installed on desktop and mobile devices
- Run in a standalone window without browser UI
- Auto-update when new versions are deployed

For details on the PWA implementation, see [docs/PWA.md](docs/PWA.md).

## Conventions

- Business logic lives in `features/*`
- Reusable hooks go in `/hooks`
- Global state management uses Zustand in `store/`
- Never duplicate code; prefer imports
- All new code with complexity > "simple" must have Vitest unit tests

## License

MIT 