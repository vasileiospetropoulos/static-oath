# STATIC OATH

**Trust the crew. Doubt the signal.**

STATIC OATH is an original browser-based party game in development. Its first
release is designed for four players sharing one device in a local
pass-and-play session. See the [Game Design Document](./docs/STATIC_OATH_GDD_v0.1.md)
for the approved game concept, rules, and roadmap.

## Requirements

- Node.js 22.12 or newer
- npm

## Local development

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite.

## Quality checks

```powershell
npm run lint
npm run format:check
npm test
npm run build
```

The application uses React, TypeScript, Vite, ESLint, Prettier, and Vitest.
Gameplay systems are intentionally not part of the project foundation.

## Offline support

Production builds include a small native browser service worker. It precaches
the built application shell and local assets, serves cached assets when offline,
and prefers the network for page navigations so deployed updates are discovered.
The worker is not enabled by Vite's development server.

The cache is origin- and app-scope-limited. Its versioned cache is replaced
during service-worker activation. A first visit requires a network connection
so the browser can install the worker and download the complete asset set;
subsequent visits can load the cached application offline. Browser storage
policies may evict cached data, so offline availability cannot be guaranteed
after a browser clears site data.

## Project status

This repository currently contains the Phase 1 application foundation only.
Mission mechanics, game state, roles, assignment randomness, timers, voting,
audio, and gameplay screens have not been implemented.
