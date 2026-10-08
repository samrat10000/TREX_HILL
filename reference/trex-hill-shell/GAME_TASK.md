# GAME_TASK.md — turn TREX_HILL from a kit viewer into a cozy free-world game

Read this whole file before writing code. It is the source of truth. Where it conflicts with `assests 1/hill-kit/HILLKIT_REFACTOR.md`, this file wins.

## 0. The goal in one paragraph
A cozy off-road driving game in the browser, in the spirit of **Over the Hill** (Steam), and better than it. You wake up at a camp in a big open world, drive a truck you customised in the garage, and wander: golden grass, autumn woods, lookouts, a lighthouse, rivers, snow passes. You stop for views, wildlife and sunsets, take photos, collect postcards, unlock parts and find new vehicles. There are no timers and no fail states. The screen stays almost empty; the world is the interface. A player should happily stay for 10+ hours. **Levels are out of scope for now. Build the free world.**

## 1. What is wrong today (verified in the repo)
1. The kit viewer *is* the game. Drive/Garage/Viewer tabs, the time/weather/biome dropdowns, the option drawer and the perf readout all sit on screen while driving. The original game shows almost nothing.
2. There is no front door: no title screen, no save slots, no free-roam setup, no pause, no "back to title".
3. The world is a 240 m ring clamped at radius 120 (`stepDrive`: `if(rr>122)`). It needs to be a big open map.
4. **Terrain bug:** `terrainHeight` in `src/game/world.tsx` uses `hash(Math.floor(x*.055), …)`. That is *stepped* noise, which makes blocky terraces. Replace it with smooth value noise (bilinear/quintic interpolation; `KIT.noise3` already does this).
5. The grass reads as sparse dark spikes on flat brown ground. The original has dense, soft, golden grass that sways and parts around the truck.
6. Audio is placeholder oscillators in `App.tsx`. A full sound kit exists (`sound/hillkit-audio.js`) and is not used.
7. `App.tsx` (259 lines) mixes rendering, physics, audio, input and UI. It must be split by responsibility.

## 2. Reference material in this zip
- `ui-kit/trexhill-ui-kit.html` — **the direction for the UI, not the game itself.** Open it in a browser; it runs on its own. Every screen, flow, token and component is there. Rebuild the look and behaviour in the repo; take 3D models from `src/kit`. See "How to use the UI kit" below.
- `ui-kit/src/` — the same page split into readable parts: `a_head.html` (all CSS tokens and screen styles), `b_world.js` (persistent world behind the menus, camera rigs, time/weather blending), `c_ui.js` (screen state machine, garage, settings, HUD, pause, map, journal, photo mode).
- `reference/original-*.jpg` — frames from the real Over the Hill gameplay video. `reference/current-build.jpg` — frames from the current TREX_HILL build. Compare them; close the gap.
- `sound/hillkit-audio.js` — the physically modelled sound engine (engines per type, tyres per surface, wind, rain, fire, birds, thunder, UI). `sound/README.md` lists the pre-rendered WAV pack (already delivered separately as `hill-kit-sounds.zip`).
- Existing in the repo: `src/kit/*` (all 3D models, vehicles, parts) and `assests 1/hill-kit/` (old kit, contracts, reference screenshots).

## How to use the UI kit (read this twice)
`ui-kit/trexhill-ui-kit.html` is a **reference, not the game.** Do not copy it into the repo, do not embed it, do not wrap it, and do not port its file structure. It is a single-file demo that shows the direction:
- **Look and feel:** tokens, fonts, colours, spacing, glass panels, motion.
- **Flow:** which screens exist, how you move between them, what Esc and Back do.
- **Behaviour:** what each control changes, what the HUD shows by default, how the garage and settings behave.
- **3D models:** every model it shows comes from the kit factories (`KIT.vehicle`, `KIT.pine`, `KIT.outpost` …), which already live in `src/kit`. Take models from there. If the demo uses something `src/kit` lacks, add that factory to `src/kit`; never import from the HTML.

The real game is built properly in the repo: React components, typed modules, one game loop, the store and the free world described below. Where the demo cuts corners (the drive preview circles a ring, the map is drawn from a small terrain, saves are fake), the game does it for real as specified in this file. Last time the kit viewer was shipped as the game. This kit is the same kind of thing: a guide to build from.

## 3. Rules (non-negotiable)
- Never touch git. No commits, branches, stashes, resets, pushes.
- Restraint rule: every new file must earn its place. No wrapper layers, no "managers" with one caller.
- Number tasks `1, 1.1, 1.2`. Never `P1/P2`.
- Animation is smooth, never springy: one curve `cubic-bezier(.22,.61,.36,1)`; cameras use `1 − e^(−dt·k)` smoothing. Only physics (suspension, flags, antennas) may bounce.
- Correctness before polish. Each phase ends with its **Done when** checks passing, reported back in writing before the next phase starts.
- Do not duplicate models. Every 3D object comes from `src/kit`. If a model is missing, add it to the kit, then use it.
- Keep kit contracts: `KIT.vehicle(id,cfg)` → rig; `userData.update(dt,t,env)`; `env={wind,night,time,rain,snow}`; axes +x forward, +y up, +z right.
- One `useFrame` game loop. Per-frame values live in refs, never in React state. zustand holds only low-frequency state.
- Honest gaps: if something can't be done or conflicts, say so in one line and pick one path.

## 4. Decisions already made (don't re-debate)
| Topic | Decision |
|---|---|
| Stack | Keep: Vite, React 19, TS strict, three 0.186, R3F 9, drei, postprocessing, rapier, zustand. |
| Kit viewer | Leaves the game. Dev-only route `/?kit` (behind `import.meta.env.DEV`). Never reachable from game menus. |
| HUD default | Compass strip, vehicle badges (truck, trailer), gear dots + H/L range lamp, contextual prompts. **Speedometer and minimap off by default**, toggled in Settings › HUD. |
| On-screen world controls | Gone. Time, day length, weather, season live in Settings › World. |
| Map size | 2048 × 2048 m, streamed in 128 m chunks. |
| Progression | No money. Discoveries unlock parts and vehicles. Optional and gentle. |
| Fail states | None in Cozy mode (default on): no damage, no fuel, auto-recover when flipped > 3 s. |
| Saves | 3 slots, autosave at camps and every 2 minutes, `localStorage` with a versioned schema (`v:1`). |
| Fonts | Fredoka (display), Nunito (body), self-hosted via `@fontsource`. |

## 5. Screen flow (implement exactly this)
```
Boot → Loading → Title
Title: continue | play (save slots) | free roam (region, wake time, weather, cozy) | garage | settings
Continue / slot / Head out → Loading("Heading out to <region>") → Drive
Drive: Esc → Pause (resume | map | journal | photo mode | garage | settings | back to title)
       M → Map · P → Photo · J → Journal · H lights · L range · C camera · E camp/use · R recover
Any sub-screen: Esc or Back → previous screen. Pause › back to title → Title.
```
The world never unloads behind menus: Title, Play, Free roam, Settings and Garage all render the live world with their own camera rig (see `setRig` in `b_world.js`). Screen changes cross-fade 420 ms.

## 6. Tasks

### 1. Shell and state
1.1 Create `src/ui/tokens.css` from the `:root` block of `ui-kit/src/a_head.html` (colours, radii, shadow, easing, fonts, dark theme). Delete `src/ui/game.css` once nothing uses it.
1.2 Create `src/ui/screens/` with one file per screen: `Loading`, `Title`, `Play`, `FreeRoam`, `Garage`, `Settings`, `Hud`, `Pause`, `Map`, `Journal`, `Photo`. Shared bits (back button, segmented control, toggle, range, key hint, card, part tile, stat bar) go in `src/ui/controls.tsx`, one file.
1.3 Replace `state.ts` with a versioned store: `screen`, `stack`, `settings` (all keys from `DEF.set` in `c_ui.js`, including `keys` bindings), `garage` (`vehicle`, `loadouts`, `owned`), `saves[3]`, `slot`, `found[]`, `waypoint`. Persist everything except `screen`/`stack`. Migrate the old `over-the-hill-loadout` key once.
1.4 Input: one keyboard map driven by `settings.keys`, with rebinding (click key, press new, Esc cancels). Escape follows §5. Arrow keys move focus in Title and Pause menus.
1.5 Remove from the driving screen: top bar, world-controls panel, drawer, catalog, viewer tools, perf readout (perf readout moves behind a `?perf` dev flag).
**Done when:** the full flow in §5 works by keyboard and mouse; a fresh profile lands on Title; reload keeps settings, garage and saves; nothing from the old viewer is visible in game.

### 2. Free world
2.1 Fix `terrainHeight`: smooth multi-octave value noise (use `KIT.noise3`), large shapes 300–600 m, mid detail 40–80 m, fine 5–10 m. Clamp slopes on trails.
2.2 World = 2048 m square, 16 × 16 chunks of 128 m. Chunk = terrain mesh (64² verts near, 16² far), baked scatter (trees, rocks, bushes merged per material), grass instances. Load radius 3 chunks, unload at 4. Build chunks over several frames; no hitch over 8 ms.
2.3 Six regions laid out as one continuous map, each with its season preset from `presets.ts`: Golden Meadow (start, centre), Ember Woods (autumn, rivers), Pinecrest (pines, lookouts, switchbacks), Copper Canyon (mesas, dry washes), Whitecap Pass (snow, aurora), Bluewater Coast (lighthouse, ferry, palms). Blend 80–120 m between regions: grass colours, fog, scatter mix.
2.4 Trails: a spline network (not a ring) of dirt tracks connecting camps and POIs, painted into terrain colour, flattened ±1 m, grass excluded. Off-trail driving stays allowed everywhere.
2.5 **Gates.** Region borders have a ranger gate (barrier arm, hut, lamp, sign). Locked gates show the unlock condition on approach ("Reach the Pinecrest lookout"). Open = arm lifts smoothly (1.2 s). Unlock conditions match the region cards in the UI kit.
2.6 POIs (each a kit model plus a discovery trigger radius): 1 camp per region (6), 4 lookout towers, lighthouse, ferry dock + ferry, outpost garage ×3, A-frame and log cabins, waterfall, 2 river fords, bridge, abandoned vehicles (one per non-owned vehicle), photo spots ×20.
2.7 Grass that looks like the original: dense golden blades near the camera (≥ 60k desktop, ≥ 24k mobile), height variation 0.5–1.4 m, wind waves, push-away around every wheel, colour from region, fade between 60–80 m instead of popping. Use the grass shader in `b_world.js` as the base.
2.8 Water: rivers and lakes with the kit water shader, shore foam, fords the truck can wade (splash sound, slower speed).
**Done when:** you can drive from Golden Meadow to every region border without a loading screen; terrain is smooth (no terraces); grass reads golden and dense in every reference shot angle; 60 fps on desktop while driving across chunk borders.

### 3. Driving, camera and light
3.1 Keep the spring-damper `stepDrive`, remove the radius clamp, add world-edge soft boundary (fog wall + gentle turn-back prompt at 1000 m).
3.2 Gearbox model for HUD and audio: 4 forward gears + H/L range (L = ×2.6 torque, max 25 km/h). Gear dots and H/L lamp read from it.
3.3 Cameras: **Chase** (default, look-ahead 3 m along velocity, terrain clearance ≥ 1.2 m, auto-recentre after 2 s without mouse input, mouse/stick orbit), **Hood**, **Cinematic** (slow orbit, used when idle 30 s), **Photo** (free fly, limited to 25 m from truck). No snapping; all transitions use the smoothing above.
3.4 Light: one shadow-casting sun that follows the truck; headlights as spot lights (2 per vehicle, plus aux light bar/roof lamps as one combined spot); campfires and lamps as point lights only within 40 m. Max 6 dynamic lights live. Bloom strength 0.3 + 0.55·night.
3.5 Auto headlights at dusk/mist/storm when the setting is on. Brake lights on brake.
3.6 Recover: R or auto in cozy mode → place upright at last safe pose with a 0.6 s fade.
**Done when:** a 10-minute night drive through forest shows headlight pools on grass and trees, the camera never clips terrain or trees, and rollovers recover.

### 4. HUD (match `#drive` in the UI kit)
4.1 Compass strip top-centre: cardinal letters, ticks, POI pins (discovered only), waypoint dot.
4.2 Bottom-left: round glass badge with truck silhouette, second badge when a trailer is hitched; light icon lights when headlights are on.
4.3 Bottom-right: four gear dots and H/L lamps.
4.4 Discovery toast (top-left, stamp icon, 3.8 s) and Challenge Trail banner (centre, amber, uppercase, 3.2 s).
4.5 Context prompt pill (bottom-centre): "E Make camp", "E Hitch caravan", "E Enter garage", only within 6 m of the thing.
4.6 Key-hint row fades out 6 s after driving starts. Speedometer and minimap only if enabled.
**Done when:** with defaults, the only things on screen while driving are compass, two badges, gear/range, and occasional toasts.

### 5. Garage (match `#garage`)
5.1 Garage is a place: the outpost model with work lights. The truck sits on the tarp; the camera moves per category (paint → ¾, wheels → wheel close-up, body → front, roof → high, lights → low front, engine → ¾). Drag rotates the truck.
5.2 Left panel: six categories (Paint, Wheels, Body, Roof, Lights, Engine) built from `KIT.VOPTS`; part tiles with one-line descriptions; swatches for paint; locked parts show their unlock condition and shake on click.
5.3 Right panel: name, blurb, six stat bars (Grip, Comfort, Power, Clearance, Carry, Night) with green/red delta preview vs. the saved loadout, Night preview toggle, Revert / Apply, "Take it for a drive".
5.4 Bottom strip: all vehicles. Owned ones are selectable; others show "Find it in the world" and can be previewed but not applied.
5.5 Every part change rebuilds the rig live (memoised on loadout). Apply writes to the active save.
**Done when:** every option in `KIT.VOPTS` is reachable and visible on the model; locked parts cannot be applied; stats update instantly.

### 6. Settings (match `#settings`)
Seven tabs exactly as in the kit: Gameplay, World, HUD, Graphics (presets low/medium/high/ultra + render scale, grass density, shadows, bloom, FOV), Audio (master, engine, world, music, menus), Controls (rebinding + reset), Accessibility (text size, reduce motion, high-contrast HUD, sound captions, toggle-instead-of-hold). Every control applies live and persists.
**Done when:** each setting visibly or audibly changes the game within one frame, and survives reload.

### 7. Map, journal, photo, pause
7.1 Map (M): full-screen paper map drawn from the real height function, region labels, discovered POIs, fog of war that clears within 120 m of where you've driven, click to drop a waypoint (shows on compass), region explored %.
7.2 Journal (J or Pause): postcard grid, ~60 cards total (places, skies, wildlife, vehicles). Unknown cards are hatched "???".
7.3 Photo (P): viewfinder frame, zoom (scroll), time, filter (none/warm/film/mono), headlights toggle, Take photo saves a JPEG. Photographing wildlife or a photo spot inside the frame awards its postcard.
7.4 Pause (Esc): blurred world, menu on the left, trip card on the right (found, km, camps, region %, last save).
**Done when:** a waypoint set on the map appears on the compass; a photo of the deer adds its postcard.

### 8. The 10-hour loop
8.1 Camps: E at a camp → rest (skip to dawn/dusk/night), save, set as spawn, fast-travel between discovered camps from the map.
8.2 Lookouts: climbing a tower trigger reveals map fog within 300 m and awards a postcard.
8.3 Challenge trails: 12 optional marked routes (start flag + banner, end flag + postcard). No timer by default; "best time" shown only if the player opts in.
8.4 Unlocks: each 5 postcards unlocks a part tier; each abandoned vehicle found and "towed home" joins the garage. Rough pacing: first unlock at 15 min, a new region every 60–90 min, last vehicle around hour 9.
8.5 Ambient life: wildlife spawns by region and time (deer by day, owls at night, gulls at coast), weather rolls every 20–40 in-game minutes, aurora on clear nights in Whitecap Pass.
8.6 Trip end (not a level): reaching the Bluewater ferry after all six regions plays a short sunset sequence and credits, then returns you to free roam with everything kept.
**Done when:** a scripted playtest route hits a camp, a lookout, a trail, an unlock and a vehicle find within 20 minutes.

### 9. Audio
9.1 Replace the oscillator code in `App.tsx` with `sound/hillkit-audio.js` (port to TS, run its DSP in an AudioWorklet). Engine type follows the loadout; rpm from the 3.2 gearbox; tyre surface from the ground under each wheel; ambience from region, time and weather; one-shots for UI, discoveries, camp, horn, splash, thunder.
9.2 Volumes from Settings › Audio. Audio starts on the first user gesture (the Title screen click).
**Done when:** each engine sounds different at idle and full throttle, and switching surfaces changes the tyre sound.

### 10. Performance and quality
10.1 Budgets: ≤ 250 draw calls and ≤ 1.5 M triangles desktop; ≤ 120 calls mobile. 60 fps desktop, 45 fps mid-tier phone at "medium".
10.2 Instancing for every repeated prop; static scatter baked per chunk; geometry disposed on unload.
10.3 Vitest: store migration, settings persistence, keybinding, chunk load/unload, gate unlock rules, postcard awarding. Keep the existing kit smoke tests passing.
**Done when:** `npm test` and `npm run build` pass, and a 15-minute drive shows no memory growth over 10%.

## 7. Do NOT
- Show any dev tool, dropdown or kit option in the game.
- Add currencies, ads-style popups, quest markers in the world, damage meters or timers by default.
- Snap cameras or use bouncy UI easing.
- Ship stepped terrain, grass spikes or floating props (every placed object samples `terrainHeight`).

Start with task 1 and report what you verified before moving to 2.
