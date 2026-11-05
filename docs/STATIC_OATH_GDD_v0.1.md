# STATIC OATH — Game Design Document

**Version:** 0.1  
**Date:** November 5, 2026  
**Status:** Preliminary design / pre-production  
**Title:** *STATIC OATH* (official development project name; trademark/name clearance must be completed before public release)

---

## 1. High Concept

**STATIC OATH** is a browser-based mystery party game that combines cooperative puzzle-solving with social deduction. A small team of operators in a dark, futuristic communications center must decode corrupted transmissions and complete missions. Each player has different, private information. One of the players is a hidden **Saboteur**, who attempts to lead the team to the wrong conclusion without being exposed.

**One-line pitch:** *Every player holds a piece of the truth. One player wants the signal to fail.*

### Core Experience Promise
- Players must share information and work together to solve actual puzzles.
- Information is asymmetric: no single player has the complete solution.
- The Saboteur knows that they are the Saboteur and has a different objective.
- Success requires both solving the mission correctly and identifying the Saboteur correctly.
- Audio is a gameplay mechanic, not merely background music.

## 2. Genre and Audience

- **Genre:** Cooperative puzzle / social deduction / asymmetric-information party game.
- **Players:** 4 players in the first playable prototype. Designed to support expansion to 5–6 players in a future version.
- **Platform:** Browser, with desktop/laptop as the priority.
- **MVP Game Mode:** Local pass-and-play — players are physically together and pass the same device between them to read their private information.
- **Mission Duration:** Approximately 10–15 minutes.
- **Audience:** Players who enjoy party games, escape-room puzzles, mystery, and social deduction.
- **Languages for the first release:** English and Greek, with support for localization.

> “Browser” in the first release does not automatically mean online multiplayer. The first build will be fully playable in one browser on one shared device. Online play across separate devices will be considered as a later technical milestone.

## 3. Design Pillars

### 3.1 Shared Mission, Different Information
Each player receives a different information packet. The team must combine the clues verbally.

### 3.2 Trust Is a Resource
Players must decide whom to trust. Information may be accurate, incomplete, or deliberately misleading.

### 3.3 Audio Is Gameplay
Radio signals, Morse code, tones, noise, and sound patterns are used to solve missions. Where possible, a visual alternative will also be provided for accessibility.

### 3.4 Short, Replayable Missions
Each mission must have a clear beginning, puzzles, a decision, and an outcome. Missions should be replayable with different Saboteur assignments or variations in the clues.

### 3.5 Readable, Deliberate Interface
The UI should resemble a communications control station while remaining easy to read. Atmosphere must not get in the way of usability.

## 4. Core Gameplay Loop

1. **Briefing:** The team receives information about the incident and the mission objective.
2. **Role Assignment:** Each player receives a public workstation and a private allegiance card (Crew or Saboteur).
3. **Private Intel:** Each player sees only their own information packet, passes the device to the next player, and does not automatically reveal their card.
4. **Discussion & Analysis:** Players describe or withhold clues, discuss them, and combine the information.
5. **Mission Actions:** The team submits intermediate answers and/or a final solution, depending on the mission.
6. **Final Code:** The team submits its final answer before time runs out or Signal Integrity is depleted.
7. **Accusation:** Each player privately votes for the person they believe is the Saboteur.
8. **Reveal & Debrief:** Alliances, votes, and the outcome are revealed.

## 5. Player Roles & Hidden Allegiance

### 5.1 Public Stations
The workstations are public. Every player knows who the Signal Analyst, Receiver Technician, Archivist, and Cryptographer are. However, their private information is not shown to the other players.

- **Signal Analyst:** Listens to and decodes the audio message.
- **Receiver Technician:** Reads the frequency measurements for the signal fragments.
- **Archivist:** Reads the incident log and finds the correct chronological order.
- **Cryptographer:** Uses the correct protocol key to convert the frequencies into digits.

### 5.2 Hidden Allegiance
One of the four players secretly receives the **Saboteur** card. The other three are **Crew**.

- Allegiances are not revealed until the end.
- The Saboteur keeps their workstation but receives an additional private sabotage dossier.
- They may lie, withhold information, or suggest an incorrect interpretation.
- In the first mission, there is no special “Sabotage” button that secretly changes the data. Sabotage happens through social interaction. This keeps the first prototype simple and controllable.

### 5.3 Victory Conditions

**The Crew wins only if both of the following are true:**
1. The team submits the correct code before time runs out and without depleting Signal Integrity.
2. At least 2 of the 3 Crew players correctly vote for the Saboteur.

**The Saboteur wins if any of the following occurs:**
- The team fails to submit the correct code.
- Time runs out or Signal Integrity reaches zero.
- The team solves the puzzle but fails to correctly identify the Saboteur according to the voting rule.

## 6. Mission Systems

### 6.1 Mission Timer
- Default duration: 12 minutes.
- The timer starts after the Private Intel handoff is complete.
- When it reaches zero, the mission fails and the Saboteur wins.

### 6.2 Signal Integrity
- Starts at 100%.
- Each incorrect final submission removes 35 points.
- Up to 2 incorrect submissions are allowed. A third failed submission or the depletion of Signal Integrity ends the mission.
- A correct answer unlocks the accusation stage.

### 6.3 Private Information / Pass-and-Play
- Each private card appears on a separate screen.
- The player presses “Hide & Pass” when they are finished.
- The next screen shows a neutral handoff indicator without revealing the previous card.
- The MVP is designed for physical privacy among players sharing one device. It is not considered secure against technical inspection of the browser or developer tools.

### 6.4 Voting
- Each player privately votes for one of the other players.
- Votes are revealed after everyone has made their selection.
- The Crew requires at least 2/3 correct votes from the three Crew players to win.
- The application reveals the result and the actual allegiances during the debrief.

## 7. First Mission — MISSION 001: UNKNOWN SIGNAL

### 7.1 Mission Summary

**Location:** Relay Station A-17  
**Incident:** A remote relay station has stopped responding. Shortly before the connection was lost, it sent four signal fragments and a short audio message. The team must reconstruct the access code and activate the correct antenna.  
**Objective:** Decode the NORTH route and submit the four-digit code **7193**.  
**Time:** 12 minutes.  
**Players:** 4. One of them is the Saboteur.

### 7.2 Opening Briefing (in-game text)

> **INCOMING TRANSMISSION — RELAY A-17**  
> Relay A-17 has lost stable communications. A final data packet arrived containing four fragmented signals and an encrypted audio message.  
>  
> You must determine the correct transmission direction, place the fragments in the correct order, and recover the four-digit access code.  
>  
> **Warning:** One member of the crew has a different objective.

### 7.3 Role Intel Cards

#### Station 1 — Signal Analyst

**Private clue:** Listens to a short Morse transmission.

**Morse sequence:** `-. --- .-. - ....`  
**Decoded message:** `NORTH`

Role objective: Communicate the correctly decoded word to the team and explain that it determines which protocol key must be used.

**Audio requirement:** The audio will consist of short and long Morse tones, with light radio static. It will be created originally for the game.

**Accessibility:** An alternative visual representation of the pulses and an option to enable a transcript/hint will be provided. The mission must not be impossible for a player who cannot hear the clip.

#### Station 2 — Receiver Technician

**Private clue:** Frequency measurements for each fragment.

| Fragment | Frequency |
|---|---:|
| A | 600 Hz |
| B | 400 Hz |
| C | 200 Hz |
| D | 800 Hz |

Role objective: Share all four measurements with the team.

#### Station 3 — Archivist

**Private clue:** The fragments were recorded at different times.

| Fragment | Timestamp |
|---|---|
| A | 02:17:31 |
| B | 02:18:04 |
| C | 02:17:12 |
| D | 02:17:55 |

**Correct chronological order:** C → A → D → B.

Additional verification information: The NORTH protocol uses codes that begin with an odd digit. This serves as a sanity check, not as a replacement for the full solution.

#### Station 4 — Cryptographer

**Private clue:** Two protocol tables. The correct table must be selected based on the decoded message.

**NORTH protocol:**

| Frequency | Digit |
|---:|---:|
| 200 Hz | 7 |
| 400 Hz | 3 |
| 600 Hz | 1 |
| 800 Hz | 9 |

**SOUTH fallback protocol:**

| Frequency | Digit |
|---:|---:|
| 200 Hz | 4 |
| 400 Hz | 9 |
| 600 Hz | 2 |
| 800 Hz | 7 |

Role objective: Explain and apply the table that corresponds to the decoded direction.

### 7.4 Saboteur Dossier

One randomly selected player receives the following additional private card:

> **CLASSIFIED — SABOTEUR**  
> You are not working for the mission. Your objective is to prevent the team from submitting the correct code or avoid having your identity exposed.  
>  
> You have received a fake maintenance note recommending the use of the SOUTH fallback protocol. Try to convince the team that the NORTH direction is misleading or that the alternative table should be used.  
>  
> You may withhold or distort information. Do not reveal this card.

**Fake maintenance note:** `NORTH routing header may be mirrored. SOUTH fallback protocol recommended.`

**Saboteur target code:** With the order C → A → D → B and the SOUTH table, the alternative code is **4279**.

### 7.5 Intended Puzzle Solution

1. The Morse sequence decodes to `NORTH`.
2. The Archivist sorts the fragments: `C → A → D → B`.
3. The Receiver provides the frequencies: C=200 Hz, A=600 Hz, D=800 Hz, B=400 Hz.
4. The Cryptographer selects the NORTH protocol because the message says `NORTH`.
5. The mapping produces: C=7, A=1, D=9, B=3.
6. The final answer is **7193**.

**Sanity check:** The NORTH code begins with an odd digit (7), as stated in the Archivist's file.

### 7.6 Mission Flow

1. **Briefing Screen:** Presentation of the incident and objective.
2. **Player Setup:** Enter the names of four players.
3. **Role Reveal:** Private assignment of workstations and hidden allegiance.
4. **Private Intel Handoff:** Each player reads their card and presses “Hide & Pass”.
5. **Control Room:** Display of the timer, Signal Integrity, and a public notes area. Players discuss.
6. **Code Submission:** The team enters a four-digit code. An incorrect answer reduces Signal Integrity and allows another attempt, up to the limit.
7. **Accusation:** Players privately vote for the Saboteur.
8. **Reveal:** The allegiances, votes, correct code, and outcome are displayed.
9. **Debrief:** A brief explanation of the solution and the clues that should have been used.

### 7.7 First Mission Acceptance Criteria

The mission is considered complete when:
- Four player names can be entered.
- Each of the four stations is assigned exactly once.
- Exactly one player receives the Saboteur allegiance.
- Each player can see only their own card during the handoff flow.
- The timer starts and ends correctly.
- Signal Integrity is updated correctly after incorrect submissions.
- The correct mission solution is always 7193.
- Code 4279 is rejected as incorrect.
- Voting remains private until everyone has voted.
- The victory condition is calculated correctly.
- The debrief reveals the correct solution and the allegiances.
- The mission works without a backend and without an Internet connection after the initial load, provided that all assets are local.

## 8. Visual Direction & Audio Identity

### 8.1 Art Direction
- **Genre mood:** Dark sci-fi / military communications / intelligence control room.
- **Primary palette:** Charcoal, near-black, muted navy.
- **Accent colors:** Cyan/teal for active systems, amber for warnings, restrained red for critical alerts.
- **UI language:** Panels, readouts, waveform displays, status indicators, logs, and restrained scanline/glitch effects.
- **Typography:** Readable sans-serif for body text and a mono font for IDs, timestamps, and technical information.
- **Motion:** Small, fast transitions. Avoid excessive glitch effects that reduce readability.

### 8.2 Audio Direction
- Original radio static beds and shortwave interference.
- Original Morse tones and signal pulses.
- Subtle UI clicks, confirmations, and warning tones.
- Low-volume ambient drone, with mute/volume controls.
- Unlicensed samples or well-known musical recordings will not be used.

### 8.3 Accessibility
- Subtitles or transcripts for critical audio elements.
- A visual alternative for core audio puzzles.
- Volume controls and a mute option.
- Sufficient contrast and visible labels — do not rely on color alone.
- Keyboard navigation for the main controls.

## 9. Technical Plan

### 9.1 Proposed Stack
- **React + TypeScript:** UI and application logic.
- **Vite:** Development server and production build.
- **CSS:** Responsive layout, transitions, and UI states.
- **Vitest:** Unit tests for game logic.
- **Web Audio API / HTMLAudioElement:** Playback of audio elements and basic audio management.
- **GitHub Actions:** Automated lint, tests, and build checks.
- **GitHub Pages:** Static hosting for the browser build in the MVP.

### 9.2 Architecture Principles
- Game rules will be independent of React components.
- Mission logic will be deterministic and testable.
- Game state will change through clearly defined actions/reducer or an equivalent state machine.
- Mission data, roles, and clues will be separated from the UI.
- Scattered rule logic inside components will be avoided.
- Role-assignment randomness will be controllable with a seed in tests.

### 9.3 Suggested Project Structure

```text
static-oath/
├── public/
│   ├── audio/
│   ├── images/
│   └── fonts/
├── src/
│   ├── app/
│   ├── components/
│   ├── screens/
│   ├── game/
│   │   ├── engine/
│   │   ├── missions/
│   │   ├── roles/
│   │   ├── scoring/
│   │   └── state/
│   ├── audio/
│   ├── data/
│   ├── hooks/
│   ├── styles/
│   └── utils/
├── tests/
├── docs/
│   ├── GDD.md
│   ├── ARCHITECTURE.md
│   └── GAME_RULES.md
├── README.md
├── package.json
└── vite.config.ts
```

### 9.4 Test Plan

Unit tests for at least:
- Exactly one Saboteur in every new game.
- Unique assignment of the four stations.
- Correct sorting of fragments into `C-A-D-B`.
- Correct frequency mapping with the NORTH protocol.
- Generation of the correct code `7193`.
- Rejection of the decoy code `4279`.
- Signal Integrity reduction after an incorrect submission.
- Timer expiration and mission failure.
- Private voting and the 2/3 Crew vote threshold.
- All Crew and Saboteur victory scenarios.
- Restart and new role assignment without state leakage.

## 10. MVP Scope

### In Scope
- Main menu and How to Play.
- Player setup for four players.
- Role/allegiance assignment.
- Pass-and-play private cards.
- One fully playable mission: UNKNOWN SIGNAL.
- Timer and Signal Integrity.
- Final code input.
- Private accusation voting.
- Outcome/reveal/debrief screens.
- Basic sound effects and one original Morse clip.
- Greek and English UI, provided this does not delay the core loop.
- Unit tests for all critical rules.
- Responsive layout and deployment.

### Out of Scope for MVP
- Online multiplayer across separate devices.
- Accounts, profiles, or persistent cloud saves.
- Matchmaking and voice chat.
- Public leaderboards.
- Multiple missions/campaign.
- AI-generated story content.
- Paid assets or in-game purchases.
- Blockchain, tokens, or NFTs.

## 11. Roadmap

### Phase 1 — Design Lock
- Finalize the GDD and rules.
- Check the name and competing products before public release.
- Define wireframes for the main screens.

### Phase 2 — Project Foundation
- Create the React/TypeScript/Vite repository.
- Set up linting, formatting, and Vitest.
- Implement basic routing/screen flow.

### Phase 3 — Game Engine
- Role assignment.
- Mission state machine.
- Code calculation.
- Timer, integrity, and victory conditions.
- Unit tests.

### Phase 4 — Playable Mission
- Private handoff screens.
- Control room.
- Final submission and voting.
- Debrief.

### Phase 5 — Presentation & Audio
- Dark sci-fi visual design.
- Original audio assets.
- Accessibility and responsive pass.

### Phase 6 — Release
- Playtesting and bug fixing.
- README, screenshots, and a short gameplay GIF/video.
- GitHub Actions checks.
- GitHub Pages deployment.
- Portfolio project page.

## 12. Risks & Open Questions

- **Saboteur balance:** The first mission must be solvable while leaving room for convincing deception. Playtesting with real groups will be required.
- **Audio accessibility:** Every critical audio clue needs a visual alternative.
- **Pass-and-play privacy:** Privacy relies on players not looking at another player's screen. It is not technical security against browser inspection.
- **Replayability:** The first mission is tutorial-like and fixed. Future missions will need clue variations and new puzzle mechanics.
- **Originality and naming:** The game belongs to a recognizable puzzle/social-deduction category. Its differentiation will come from the combination of asymmetric technical stations, audio-first puzzles, hidden sabotage, and mission-based narrative. We do not claim that every individual mechanic is unprecedented. STATIC OATH is the official development project name; trademark/name clearance is required before public release.

## 13. Definition of Done — First Public Prototype

The first public prototype is ready when a user can:
1. Open the game in a browser without installation.
2. Read the instructions and start a new game with four players.
3. Pass around the private cards without them being automatically revealed.
4. Play through the entire UNKNOWN SIGNAL mission.
5. Discuss, submit a code, and vote.
6. See a correctly calculated outcome and a full reveal of the solution.
7. Start a new game without old secrets or results being retained.

In addition, the repository must have an up-to-date README, local development instructions, passing tests, and a successfully completed production build.

---

**End of document — STATIC OATH GDD v0.1**
