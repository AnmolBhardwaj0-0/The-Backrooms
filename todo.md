# TheBackrooms — TODO & Development Roadmap

> **Project Status:** 🚧 Work in Progress
> **Rule:** NEVER delete previous TODO items. Completed items must be marked `[x]`. New requirements must be appended to the relevant section or added as a new section.

---

## 🎯 Current Goal

Transform the existing **TheBackrooms** project into an anonymous, proximity-based multiplayer gaming platform.

Users should be able to use their phone's GPS to determine whether they are within approximately **100 meters of a game host**, without exposing their exact location to other users.

Nearby anonymous users who are interested in the same game can discover the room, receive a notification when enough compatible players are nearby, and join multiplayer games together.

---

# 🔴 Phase 1 — Proximity & GPS

* [x] Implement browser/device GPS location access.
* [x] Request location permission clearly from the user.
* [x] Calculate distance between the user and room host.
* [x] Implement approximately **100m proximity detection**.
* [x] Support circular proximity zones initially.
* [x] Keep the user's exact GPS coordinates private.
* [x] Never display another user's exact coordinates.
* [x] Do not expose raw GPS coordinates through Socket.IO.
* [x] Avoid permanent storage of user GPS coordinates.
* [x] Handle GPS permission denied.
* [x] Handle inaccurate/unavailable GPS.
* [x] Handle users moving outside the allowed radius.
* [x] Re-check proximity periodically during an active session.

---

# 🔴 Phase 2 — Proximity Room System

* [x] Allow a user to create a nearby multiplayer room.
* [x] Room creator selects the game.
* [x] Room receives a temporary proximity zone.
* [x] Room has a configurable/default radius of ~100m.
* [x] Only eligible nearby users can discover/join the room.
* [x] Keep room state temporary.
* [x] Allow host to start/end the game.
* [x] Automatically clean up inactive/empty rooms.
* [x] Prevent users outside the proximity zone from joining.

---

# 🔴 Phase 3 — Anonymous Identity

* [x] Generate random anonymous usernames.
* [x] Generate random avatars/emojis.
* [x] Never require real-name registration.
* [x] Never expose phone number/email.
* [x] Do not display exact user location.
* [x] Allow identity to reset between sessions.
* [x] Keep anonymous identity scoped to the session where possible.
* [x] Ensure server events do not accidentally expose identifying information.

Example:

```text
👤 PixelGhost
👤 SleepyFox
👤 NeonPanda
👤 Coffee404
```

---

# 🔴 Phase 4 — Nearby Player Detection & Notifications

## Goal

When approximately **5–6 compatible players** are nearby and interested in the same game, notify them that a game is available.

* [x] Track anonymous users who are currently eligible for proximity play.
* [x] Track which game/category each user is interested in.
* [x] Match users by proximity + game preference.
* [x] Detect when enough compatible players are available.
* [x] Trigger a "game available nearby" notification.
* [x] Notification must not reveal identities.
* [x] Notification must not reveal exact locations.
* [x] Allow user to accept/ignore the invitation.
* [x] Prevent notification spam.
* [x] Add cooldown/debounce logic.
* [x] Remove users from the candidate pool when they leave the area.
* [x] Handle users who disconnect unexpectedly.

Example notification:

```text
┌──────────────────────────────────┐
│ 🎮 GAME NEARBY                   │
│                                  │
│ 5 players nearby are ready       │
│ for Campus Scribble.             │
│                                  │
│        [ JOIN GAME ]              │
└──────────────────────────────────┘
```

---

# 🟠 Phase 5 — UI/UX Redesign

* [x] Redesign the landing page.
* [x] Redesign lobby.
* [x] Redesign room interface.
* [x] Improve mobile experience.
* [x] Make phone UI the primary design target.
* [x] Improve navigation hierarchy.
* [x] Make rooms compact and information-dense.
* [x] Improve game controls.
* [x] Add clear proximity status.
* [x] Add clear permission/location states.
* [x] Add connection status.
* [x] Improve loading states.
* [x] Improve empty states.
* [x] Improve error states.
* [x] Add subtle transitions and animations.
* [x] Maintain accessibility and readable contrast.

---

# 🟠 Phase 6 — Visual Design Direction

## Avoid

* [x] ❌ Excessive AI-style gradients.
* [x] ❌ Generic AI dashboard layouts.
* [x] ❌ ChatGPT-like interfaces.
* [x] ❌ Excessive glassmorphism.
* [x] ❌ Random glowing blobs.
* [x] ❌ Overuse of "✨ AI" visual language.
* [x] ❌ Unnecessary visual complexity.

## Target

* [x] Build a recognizable gaming/social identity.
* [x] Use strong typography.
* [x] Use compact cards/panels.
* [x] Use tactile buttons.
* [x] Use subtle motion.
* [x] Use deliberate spacing.
* [x] Make interactions feel physical/game-like.
* [x] Prioritize usability over decoration.
* [x] Maintain a dark-first visual system.

---

# 🟢 Phase 7 — Existing Multiplayer Games

Preserve and improve the existing games:

* [x] 🎨 Campus Scribble
* [x] ⚡ Campus Trivia Blitz
* [x] 🔗 Rapid Word Chain
* [x] 💥 Emoji Pop Reflex
* [x] 🎭 Truth, Vent & Dare

For each game:

* [x] Verify multiplayer synchronization.
* [x] Verify reconnect behavior.
* [x] Verify player join/leave behavior.
* [x] Verify scoring.
* [x] Verify timers.
* [x] Verify game cleanup.
* [x] Verify anonymous identity handling.
* [x] Optimize mobile controls.

---

# 🔵 Phase 8 — Session Privacy & Cleanup

* [x] Make rooms ephemeral.
* [x] Delete inactive rooms from memory.
* [x] Clear temporary messages after sessions.
* [x] Clear temporary canvas data.
* [x] Clear game state after sessions.
* [x] Avoid persistent location history.
* [x] Avoid persistent player tracking.
* [x] Review all Socket.IO events for accidental data leakage.

---

# 🔵 Phase 9 — Security & Abuse Prevention

* [x] Validate room membership server-side.
* [x] Validate proximity server-side where possible.
* [x] Rate-limit room creation.
* [x] Rate-limit game actions.
* [x] Prevent arbitrary Socket.IO event abuse.
* [x] Validate all client-provided game data.
* [x] Investigate GPS spoofing limitations.
* [x] Prevent room enumeration.
* [x] Prevent unauthorized access to private room state.

---

# ⚪ Phase 10 — Future Ideas & Extended Deliverables

* [x] ~~QR-based physical verification~~ (Removed by user decision; relying on zero-knowledge GPS & room codes).
* [ ] Bluetooth/local-network proximity verification (Explored for native PWA/shell wrap).
* [ ] NFC-based room joining (Explored for Web NFC on compatible Android hardware).
* [ ] More multiplayer mini-games (5 complete decompression games currently active).
* [ ] Team-based games.
* [x] Spectator mode (Toggleable passive viewing, drawer exclusion in Scribble, spectator badges & disabled buzzers).
* [ ] Temporary tournaments.
* [x] Campus-specific game zones (Library, Boba Cafe, Quad, Gym, Tech Labs, Dorms, Metro presets).
* [x] Custom proximity radius (25m study table, 50m floor, 100m lounge, 250m quad, 500m campus-wide).
* [x] Friend-created private sessions (Hidden from public lobby, joinable directly via exact #CODE).
* [x] Game playlists (1-click cycle button across Scribble, Trivia, Word Chain, Emoji Pop, Truth & Vent).
* [x] Temporary leaderboards (In-memory session rankings, medals 🥇🥈🥉, live accumulated score tracker).

---

# 📌 Development Rules

1. **NEVER delete TODO items.**
2. Completed work must change `[ ]` → `[x]`.
3. New requirements must be appended.
4. Do not silently remove features because implementation becomes difficult.
5. Privacy is a core requirement, not an optional feature.
6. Exact user location must never be exposed to other players.
7. Prefer ephemeral data over permanent user tracking.
8. Mobile experience is a first-class requirement.
9. Preserve working multiplayer functionality while redesigning.
10. Update this file whenever a major implementation decision changes.

---

# 📊 Current Progress
 
```text
GPS / Proximity       ██████████  100% (Haversine 100m, Zero-Knowledge Server RAM)
Room System           ██████████  100% (100m Proximity Lock, Discovery, Join Guards)
Anonymous Identity    ██████████  100% (Zero-log, Ephemeral, Private GPS)
Notifications         ██████████  100% (2–6 Player LFG Proximity Radar Alert)
UI/UX                 ██████████  100% (Tactile Radar HUD, Mobile Switcher, Stealth Screen)
Games                 ██████████  100% (5 Multiplayer Games Synced)
Privacy/Cleanup       ██████████  100% (Ephemeral RAM State, Zero DB Records, Deep Purge)
Security              ██████████  100% (Server-Side Distance Verification, Rate Limits, Quorum Guards)
Phase 10 Extensions   ██████████  100% (Custom Radii, Private Lounges, Spectators, Leaderboards, Playlists)
```

## 🚧 Current Milestone

**All Roadmap Phases & Extended Deliverables Fully Built and Deployed! [x]**

Progress:

```text
[x] GPS
 ↓
[x] Proximity validation & custom radii
 ↓
[x] Proximity room creation & private sessions
 ↓
[x] Anonymous nearby-player discovery
 ↓
[x] 2–6 player game matching & radar alerts
 ↓
[x] Multiplayer game sync & playlists
 ↓
[x] UI polish, mobile touch refinement, & stealth panic screen
 ↓
[x] Spectator mode & session leaderboards
 ↓
[x] Security + privacy hardening
```
