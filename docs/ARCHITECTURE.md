# STATIC OATH Architecture

## Current foundation

The application uses React and TypeScript for the interface, Vite for
development and production builds, ESLint and Prettier for code quality, and
Vitest for automated tests. The UI shell and locale resources are under `src/`.
The application is intentionally not connected to gameplay systems yet.

## Planned separation of concerns

- `src/app/`, `src/components/`, and `src/screens/`: application composition,
  shared interface elements, and individual screens.
- `src/game/`: independent game rules, mission data, roles, scoring, and
  state transitions.
- `src/audio/`, `src/hooks/`, `src/data/`, and `src/styles/`: audio behavior,
  reusable React hooks, non-game content, and global styles.
- `src/localization/en/` and `src/localization/el/`: English and Greek UI
  resources, kept separate from game logic.
- `tests/`: automated tests, including game-rule tests when those systems are
  introduced.
- `public/audio/`, `public/images/`, and `public/fonts/`: locally served
  project assets.
- `docs/STATIC_OATH_GDD_v0.1.md`: authoritative game design and rules.

During Phase 2, the game engine will use explicit typed state transitions.
Random selection will be injected so tests can reproduce assignments. Station
assignment and allegiance assignment will use independent random selections:
all four stations appear once, and exactly one of four players is the
Saboteur. No gameplay or assignment code is included in this foundation.

## Offline application shell

The production build generates a native service worker from
`scripts/service-worker.js`. A small Vite build plugin injects the built-file
manifest and a content-derived cache version, including assets under `public/`.
The worker precaches the application shell and local assets, serves cached
static resources, and uses network-first navigation with the cached shell as
an offline fallback. Activation removes older STATIC OATH shell caches.

The worker is registered only in production builds. A first visit requires a
network connection to install the worker and populate its cache; browsers may
also evict site data. Service-worker scope follows the Vite base path, allowing
the static build to be hosted at a subpath without an additional PWA library.
