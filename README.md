# STATIC OATH

**Trust the crew. Doubt the signal.**

STATIC OATH is an original browser-based party game in development, designed
for four players sharing one device in a local pass-and-play session. The
current experience includes player registration, randomized personnel setup,
private role handoff, and a radio-enabled main menu. See the
[Game Design Document](./docs/STATIC_OATH_GDD_v0.1.md) for the approved game
concept, rules, and roadmap.

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

## Current experience

- **Main menu and radio:** The menu includes radio ambience, an animated signal
  waveform, an ON/OFF control, and a separate radio volume control. Playback is
  attempted on startup; browser autoplay policies may require an interaction
  before audio can begin.
- **Player registration:** Register exactly four players. Names start blank,
  must each contain a non-whitespace character, and remain in state when
  returning to the menu.
- **Personnel assignment:** Starting registration's NEXT action assigns each
  player one unique workstation and one allegiance. Workstations and
  allegiances are randomized independently; there are four workstations, one
  Saboteur, and three Crew. The assignment logic accepts an injectable random
  source for reproducible tests.
- **Private pass-and-play handoff:** Players reveal their own workstation and
  allegiance one at a time, hide the information before passing the device,
  and reach a briefing-complete screen after the fourth reveal.
- **Interface sounds:** Active menu, radio, and handoff actions use randomized
  variations from `public/audio/ui/UI_1.flac` through `UI_4.flac`; consecutive
  generic sounds do not repeat the same variation. NEXT uses
  `public/audio/ui/Next.flac` exclusively. These sounds have a configurable
  default level independent of the radio volume.
- **Localization:** English and Greek interface text is kept in separate
  localization resources.

Mission play has not been implemented. Mission objectives, puzzles, timers,
attempts, voting, victory conditions, and online multiplayer remain outside
the current experience.

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

The application foundation, local four-player registration, independent
personnel assignment, private reveal flow, and menu audio are implemented.
Mission 001 and its gameplay systems are not yet implemented.
