# Architecture

The game runs from `file://` with plain `<script>` tags — no bundler, no
modules. Load order in `index.html` *is* the dependency graph. Everything
below is organised so that a change has one obvious home.

## Layers

```
vendor/babylon.js          the engine
  ├── src/audio.js         NightAudio      synthesized sound
  ├── src/vhs.js           NightLook       camcorder grade + tape shader
  ├── src/models.js        NightModels     faces, clothing, vehicle bodies
  ├── src/world/           the station, built once
  │     MeshKit.js         primitives: materials, boxes, signs, colliders
  │     Vehicle.js         cars: bodywork, doors, routes
  │     Actor.js           bodies: figure, walk cycle, routing
  │     NavGrid.js         one walkability test + A* + string-pulling
  ├── src/world.js         createNightWorld: layout, fixtures, merchandising
  ├── src/store.js         carried props and first-person hands
  ├── src/core/            engine-agnostic plumbing
  │     EventBus.js        publish/subscribe
  │     System.js          base class: registerFns / registerInteractions / update
  │     Hud.js             all DOM: HUD, subtitles, modals, journal, settings
  ├── src/systems/         the game's behaviour, one concern per file
  └── src/game.js          bootstrap: context, construction, render loop
```

## The shared context

`game.js` builds one `ctx` and hands it to every system:

| field | what it is |
| --- | --- |
| `G` | mutable game state (phase, flags, player, shoppers…) |
| `W` | the built world (meshes, fixtures, nav, doors) |
| `fn` | the shared verb table — see below |
| `bus` | `EventBus` for cross-system announcements |
| `audio`, `keys`, `camera`, `scene`, `engine` | engine handles |

### Late binding, and why

Systems need each other's verbs, but they are constructed in sequence — the
`CustomerSystem` refers to `dismiss` before `StorySystem` exists. `ctx.fn` is a
`Proxy`: reading an unregistered name returns a thunk that resolves at *call*
time. So construction order never dictates who may call whom, and a missing
verb fails loudly (`fn.x is not registered`) instead of silently being
`undefined`.

Each system publishes its own verbs with `this.registerFns({ … })`.

## Systems

| System | Owns |
| --- | --- |
| `Hud` | every DOM read/write: HUD, toasts, subtitles, modals, dialogue, journal, settings, pause |
| `PlayerSystem` | movement, stamina, jumping, injury, death, checkpoints, carried items |
| `CustomerSystem` | the regulars, walk-ins, Katagiri, queueing, browsing, the till |
| `ChoreSystem` | mopping, shelf refills, the trash run |
| `ThreatSystem` | the Passenger: sight, hearing, pursuit |
| `SecuritySystem` | the four-camera bank and the tape-only watcher |
| `StorySystem` | phases, intruder, rescue, siege, alarm consequences, endings |
| `InteractionSystem` | crosshair raycast, occlusion, dispatch |

### Interactions are owned, not centralised

There is no master `switch`. `InteractionSystem` raycasts and then looks the
interaction's `kind` up in a registry; each system claims the kinds it owns:

```js
this.registerInteractions = (reg) => {
  reg("scanner", (o) => { … });
  reg("register", (o) => { … });
};
```

Adding an interaction means adding a `reg(...)` line in the system that owns
the behaviour — never editing a shared dispatcher.

### Updating

Systems implement `update(dt)`. The render loop drives them generically:

```js
for (const sys of systems) {
  if (inCctv && sys.pausedInCctv !== false) continue;
  sys.update(dt);
}
```

A system that must keep running while the player watches the cameras sets
`pausedInCctv = false` (customers still arrive; the world does not freeze
because you looked away). The deterministic test `tick()` drives the same
contract, so tests and play advance identically.

## Conventions

- **`W` is the single source of truth for the layout.** Systems read
  `W.spots`, `W.interactions`, `W.doors`; they never hard-code coordinates.
- **The build fails loudly.** `W.auditSpots()` throws if any standing position
  ends up inside geometry.
- **No network, ever.** Tests assert zero HTTP requests and run offline.
- **Tests are invariants, not examples.** They assert things like "every
  interaction is reachable on foot" and "no door leaf sweeps through
  furniture", so the layout can be edited without silently breaking.
