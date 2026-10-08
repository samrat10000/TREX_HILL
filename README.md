# TREX HILL

A browser driving game built with Vite, React, TypeScript, Three.js, React Three Fiber, Rapier and the procedural Hill Kit. The implementation follows `reference/trex-hill-shell/GAME_TASK.md`. The reference HTML is a design guide; the game runs its own React screens, streamed world, simulation and saves.

## Run and build

```sh
npm install
npm run dev
```

```sh
npm test
npm run build
npm run preview
```

The production files are written to `dist/`. Deploy that directory to a static host. AudioWorklet requires HTTPS or localhost. No server or account is needed for game progress.

## Playing

Start on the title screen. **Play** opens three save slots. **Free roam** chooses an unlocked starting region, wake time, weather and Cozy mode. **Continue** restores your saved position and progress. The 2,048 x 2,048 m world contains six connected regions, camps, trails, lookouts, rivers, outposts, cabins, wildlife, abandoned vehicles and a coastal ferry.

| Default key | Action |
| --- | --- |
| W / S | Accelerate / brake and reverse |
| A / D | Steer |
| Space | Handbrake |
| L | High / low range; low range helps climbs and wading |
| H | Automatic / on / off headlights |
| C | Chase / hood / cinematic camera |
| E | Use a nearby camp, lookout, outpost, caravan, truck or ferry |
| R | Recover at your last safe position |
| B | Horn |
| M / J / P | Map / journal / photo mode |
| Escape | Pause or return to the previous screen |

Drag the world canvas to orbit the chase camera; it recentres after two seconds. In the garage, drag to turn the truck. If all save slots are occupied and no trip is active, Free roam opens the slot chooser so you can resume one. Touch controls include steering, pedals, pause, lights, range, camera and recovery; tap a contextual prompt to interact.

The default HUD is intentionally sparse. Enable speed or the live minimap in **Settings > HUD**. Map exploration clears around your driven route. Click the paper map to drop a waypoint; discovered camps offer fast travel. Lookouts reveal a wider area. The journal contains 72 postcards across places, trails, vehicles, wildlife and skies.

At a camp, stop and press E to rest until dawn, dusk or night, save, and set your return point. Autosave also runs every two minutes of active simulation. There are no damage, fuel or failure systems. Cozy mode adds automatic recovery.

Challenge trails are optional: reach a start flag, follow its route and reach the finish to earn a postcard. Best-time recording is disabled by default. Every five postcards unlocks a new part tier. Snow chains require five postcards; the electric drivetrain requires twenty. Find a sleeping vehicle, attach the tow, and bring it to an outpost to add it to your garage. A caravan must be unhitched before towing a truck. Canyon access requires the Pinecrest lookout; Whitecap requires chains fitted to the current truck; the coast requires the ticket at River Ranger Station. Visit all six regions to board the final ferry, then return to roaming with your progress kept.

## Garage, settings and photos

The garage has Paint, Wheels, Body, Roof, Lights and Engine categories. Every kit option is available to preview. Six statistics compare your draft with its saved setup. **Apply** saves an owned vehicle's unlocked configuration; **Revert** restores its saved parts. Spring stiffness, damping and preload are in Engine's suspension tuning section. Unowned vehicles can be previewed until they are found and towed home.

Settings have seven tabs: Gameplay, World, HUD, Graphics, Audio, Controls and Accessibility. Low/Medium/High/Ultra, render scale, grass density, shadows, bloom and FOV apply live. Audio has independent master, engine/tyres, world, music and menu volumes. The supplied sound kit runs in an AudioWorklet after the first click or keypress. Key bindings can be changed; conflicts swap bindings and Escape cancels. An expandable Field guide in Controls explains driving, camps, discoveries, towing and photography. Accessibility offers text size, reduced motion, contrast, sound captions and toggle pedals.

In Photo mode, drag to look, use WASD to fly, Q/E to move down/up, and scroll to zoom. Movement is limited to 25 m from the truck. Filters, time and headlights affect the picture. **Take photo** or Space downloads a JPEG. Wildlife and photo spots framed in the shot award postcards.

Progress is stored under the versioned `trex-hill` localStorage key. The old `over-the-hill-loadout` preference key is migrated when a new save is absent. Clearing browser storage deletes local progress; downloaded photos remain separate files.

## Verification and limits

`npm test` covers all original kit models, suspension stability for every vehicle, trailer articulation, animated baking, disposal, settings persistence, migration validation, key binding, chunk plans, gates, discoveries, progression and the audio DSP. Browser checks and screenshots are saved under `artifacts/`.

The optional `scripts/browser-shell.mjs`, `browser-game.mjs --complete`, `browser-journey.mjs`, `browser-audio.mjs`, `browser-quality.mjs` and `browser-soak.mjs --minutes=15` use an isolated Chrome CDP session on port 9222 and Vite on port 5173. They manipulate that profile's saves. The journey check uses explicit pose placement to test interactions; the soak uses steering and throttle without pose jumps. They are separate forms of validation.

The supplied models remain procedural kit geometry. Suspension is a spring-damper simulation with terrain contact; Rapier supplies approximate obstacle and camera queries. Tow vehicles and caravans follow articulated constraints without independent rigid-body collision response. Long-term exploration pacing and actual desktop/phone frame rates require device playtesting. Software-rendered browser results do not establish the 60/45 fps targets. Loading and individual factory work still require profiling against the strict 8 ms chunk budget. Large Three/Rapier production chunks currently produce Vite's size warning.

The last isolated browser quality check measured **244 draw calls / 668,879 triangles on High** and **100 calls / 319,286 triangles on Medium with a mobile viewport**, within the plan's geometry budgets. These are sampled scenes, not worst-case measurements across every location. The latest minimap and field-guide changes still need a browser visual pass. The browser restart was blocked by automatic policy review, so the 15-minute browser memory soak and night-drive visual acceptance remain pending. A simulated driving regression exercises 15 minutes of steering, range changes, terrain contacts, towing and chunk residency; it does not measure renderer memory or hardware performance.

The developer kit viewer is available only in development at `/?kit`; performance statistics require development `?perf`. Neither is offered in game menus. See `ISSUES_AND_FIXES.md` for current status and outstanding acceptance checks.
