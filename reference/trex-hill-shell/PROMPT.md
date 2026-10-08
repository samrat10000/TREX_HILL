You are working on TREX_HILL, my browser game (Vite + React 19 + TypeScript + three.js + React Three Fiber). Read every word of this prompt, then read the files it points to, before you change anything.

## What I'm building
A cozy off-road driving game in the browser, in the spirit of **Over the Hill** on Steam, and better than it. You wake up at a camp in a big open world, drive a truck you customised in the garage, and wander: golden grass, autumn woods, lookout towers, a lighthouse, rivers, snow passes, sunsets and storms. You stop for views and wildlife, take photos, collect postcards, unlock parts and find new vehicles. No timers, no fail states, no clutter. The world is the interface. A player should happily play for 10 hours straight.

**Right now: a free world, not levels.** Levels come later.

## What went wrong last time
I gave you a UI/model kit and you shipped the kit viewer as the game. Dropdowns for time/weather/biome, the option drawer, Drive/Garage/Viewer tabs and a perf readout all sit on screen while driving. The world is a small ring. The terrain is stepped because `terrainHeight` uses `Math.floor`-hashed noise. The grass looks like sparse dark spikes. There is no title screen, no save slots, no pause, no "back to title". The kit was a parts library, not the product. Don't repeat that.

## What I'm giving you
`trex-hill-shell.zip`. Unzip to `/reference/trex-hill-shell/` (read-only) and read in this order:
1. `README.md` — what every file is.
2. `ui-kit/trexhill-ui-kit.html` — **the direction, not the game.** Open it in a browser and click through every screen. It shows the look, flow and behaviour I want: title (continue / play / free roam / garage / settings), save slots, free-roam setup, the garage (category cameras, part tiles, locked parts, stat bars with deltas, vehicle bays, night preview), settings with 7 tabs (all world controls moved here), the minimal HUD (compass strip, truck badge, gear dots, H/L range, toasts, challenge-trail banner, context prompts), pause, map with waypoints, journal postcards, photo mode, loading screen and a UI-kit page with every token and component.
3. `ui-kit/src/` — the same page split into CSS tokens, world and screens, for porting.
4. `GAME_TASK.md` — **the task list.** Goal, bugs found, decisions already made, tasks 1–10, each with a "Done when" check. It wins over any older doc, including `assests 1/hill-kit/HILLKIT_REFACTOR.md`.
5. `reference/` — frames of the real Over the Hill next to frames of my current build. Close that gap.
6. `sound/hillkit-audio.js` — the sound engine to use instead of the placeholder oscillators.

**The UI kit is a reference, not something to ship.** Do not copy, embed or wrap the HTML, and do not port its file structure. It's a single-file demo with shortcuts (the drive preview just circles a ring, saves are fake). Use it to see where the game must go, then build that properly in the repo as React components on the real free world. Last time you shipped the kit viewer as the game; this is the same kind of guide. Take every 3D model from the kit factories in `src/kit` (`KIT.vehicle`, `KIT.pine`, `KIT.outpost` …), which are the same models the demo shows.

All 3D models stay in `src/kit`. Reuse them; don't duplicate them. If something is missing, add it to the kit first.

## How to work
1. Before any code: give me a short plan. List which existing files you'll keep, change, split or delete; the new files you'll create (each with one line saying why it must exist); and anything in my repo that conflicts with `GAME_TASK.md`, each with the one decision you'll take. Then stop and wait for my OK.
2. After my OK, do tasks in order (1, 2, 3 …). Finish one task, run its "Done when" checks, run `npm test` and `npm run build`, and report in under 10 lines what you verified and what's still rough. Then move to the next task.
3. If something can't be done well in the browser, say so plainly and propose one alternative, not a list.

## Rules (non-negotiable)
- Never touch git: no commits, branches, stashes, resets or pushes.
- Restraint rule: every new file must earn its place. No wrapper layers, no "managers" with one caller.
- Number tasks `1, 1.1, 1.2`, never `P1/P2`.
- Smooth, not springy: one easing curve `cubic-bezier(.22,.61,.36,1)` for UI; exponential smoothing for cameras. Only physics (suspension, flags, antennas) may bounce.
- One `useFrame` game loop. Per-frame values live in refs, never in React state. zustand only for low-frequency state.
- Nothing from the kit viewer appears in the game. The viewer moves to a dev-only `/?kit` route.
- Defaults while driving: compass, truck badge, gear dots and H/L, occasional toasts. Nothing else. Speedometer and minimap are opt-in in Settings.
- Correctness before polish. Every placed object samples the terrain height. No floating props, no terraced terrain, no camera clipping.
- Keep kit contracts intact: `KIT.vehicle(id,cfg)` → rig, `userData.update(dt,t,env)`, axes +x forward, +y up, +z right, so authored GLB models can replace procedural ones later.

## Quality bar
Put a screenshot of my build next to `reference/original-*.jpg`. If it doesn't hold up on mood (dense golden grass, soft fog, warm light, glowing headlights at night), composition (empty HUD, the truck as the hero) and smoothness (no pops, no snaps, 60 fps desktop), it isn't done.

Start with the plan.
