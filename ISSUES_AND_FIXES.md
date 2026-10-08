# ZIP plan implementation status

The current implementation follows `reference/trex-hill-shell/GAME_TASK.md`. The register below the separator describes the earlier prototype and is retained as historical audit evidence; its old dimensions and screen descriptions do not describe the current game.

| Task | Current implementation | Remaining acceptance work |
| --- | --- | --- |
| 1. Shell and state | Eleven React screens, three independent saves, versioned persistence, migration, keyboard flow, isolated dev viewer; full slots return to the chooser | Earlier full screen-flow browser check passes; latest slot guards pass unit checks |
| 2. Free world | 2,048 m square, streamed 128 m chunks, six regions, smooth terrain/trails, gates, kit POIs, rivers/grass/bushes; graded banks and shallow fords | Hardware frame rate and strict worst-case 8 ms chunk deadline need profiling and tuning |
| 3. Driving/camera/light | Stable tyre contacts, spring/damping/preload, gearbox/range, chase/hood/cinematic/photo cameras, local lights, recovery fade; exact horizontal tow constraint | 15-minute simulated drive passes; 10-minute night lighting and visual camera-clearance acceptance pending |
| 4. HUD | Compass/waypoint, vehicle/trailer/light badges, gears, discoveries, context/touch prompts; optional live road/discovery/waypoint minimap | Latest minimap needs browser visual acceptance and device legibility playtest |
| 5. Garage | All kit options, category camera rigs, live rebuilds, six stat deltas, ownership/part locks | Device/model-by-model visual acceptance |
| 6. Settings | Seven tabs, live preferences, rebinding, five audio buses, accessibility and a Controls field guide | Hardware preset calibration; latest field-guide visual pass |
| 7. Map/journal/photo/pause | Real terrain/fog map, journal, filtered JPEG exports, photo discoveries, actual trip statistics | Native JPEG download and deer award verified |
| 8. Exploration | Camps/rest/spawns/travel, lookout reveals, 12 trails, actual unlocks every five postcards, towing, wildlife/weather and ferry credits; Whitecap checks currently fitted chains | 10-hour pacing remains a design/playtesting target; scripted interaction route passes but uses pose placement |
| 9. Audio | Supplied DSP ported to AudioWorklet; four engines, per-wheel surface sound, ambience/music/UI and settings | Earlier browser worklet and five volume buses verified |
| 10. Performance/quality | Chunk scatter baking/templates, articulated wheel instancing, sprite billboards, resource cleanup and regression tests | Sampled draw/triangle budgets pass; hardware fps and 15-minute browser memory soak remain pending |

Latest verification: **59 tests passed across eight files**, including the 15-minute driving simulation. **Production build passed** (`npm run build`); output is in `dist/`. Latest full shell browser run: 12 checks, no runtime errors. Photo verification includes an actual JPEG file. The last isolated quality run passed five checks with no runtime errors: High used 244 draw calls and 668,879 triangles; Medium with a mobile viewport used 100 calls and 319,286 triangles. These are sampled scenes from the software renderer, not worst-case or hardware fps measurements. New ford, minimap and progression changes were made after that browser run.

The long simulation follows actual steering/throttle through Meadow, Ember and Pinecrest, changes ranges, checks wheel contacts and tow-hitch length, and keeps chunk residency bounded. It exercises 15 minutes of simulation without teleporting along the route. It does not run WebGL, Rapier obstacle queries, lighting or renderer memory checks. Wider ford approaches fix the high falls this regression exposed; the tow's horizontal pose stays constrained while its suspension integrates vertically.

**Browser blocker:** automatic approval review rejected restarting the isolated Chrome QA browser because the launch was blocked by policy. The browser memory soak and the remaining visual checks have therefore not run. The quality report also recorded a 44.4 ms maximum chunk-build slice; the strict 8 ms target is not established. Large Three/Rapier bundle warnings remain. No git commands were used, and the reference directory remains unchanged.

---

# Issue register and free-roam implementation

8 October 2026. The original audit is in `PROJECT_ANALYSIS.md`. This register covers the requested artifact parity, driving repairs, and first free-roam foundation. “Fixed” describes the implemented and verified behavior; it does not imply finished commercial-game quality.

## Issues found before the changes

| Priority | Issue / cause | Implemented result |
| --- | --- | --- |
| Critical | Floored hash terrain produced metre-scale discontinuities and severe suspension impulses | Continuous reference-kit noise; shared height function for ground, tyres, foliage, colliders, and water depth |
| Critical | The original suspension could launch the chassis tens or thousands of metres | Bounded forces, initialized wheel contacts, velocity-filtered damping, normalized wheel support, hard bottom-out resolution, and a fixed 120 Hz simulation |
| High | High-speed steering produced excessive lateral load and wheel lift | Speed-sensitive steering/grip limit, grounded traction, moderated body load transfer, and explicit tyre contact checks |
| High | Wheelbase and inertia were not recomputed when selecting another vehicle | New vehicle state recalculates geometry-dependent physics and settles at the existing location |
| High | No adjustable spring support or damping/preload feedback | Garage controls for spring stiffness, damping, preload; live wheel-travel display |
| High | Kit grass was replaced by sparse flat planes | Original `KIT.bladeGeo`, root/tip colors, wind and player bend, snow tint, distance fade, streamed deterministic tiles |
| High | Kit bushes were missing | Original bush factories in biome palettes, plus denser shrubs around the starting drive |
| High | Ground lost the reference road/shore/rock coloring | Vertex-colored ground, dirt trail blending, sandy shoreline, slope stone, snow/wet treatment |
| High | Small circular test area was the whole world | 1,024 m terrain square and 480 m driving radius; approximately four times the previous drive diameter |
| High | No start flow or playable exploration structure | Starting screen, free roam, three optional scenic destination choices, six discoveries |
| High | No map or destination guidance | Live minimap, expanded trail map, destination bearing/distance, discovered-place markers |
| High | No graphics/resolution controls | Low/Medium/High/Ultra with real grass/terrain/shadow/bloom/pixel-ratio changes; independent render scale |
| High | No adjustable interface size | 80–130% interface scaling, independent of canvas resolution |
| High | No settings, pause, or manual | Saved preferences, pause/resume, fullscreen, volume, map/statistics toggles, in-game field guide |
| High | Animated antenna/pole meshes were merged into the static body | Bake traversal excludes complete marked animated subtrees |
| High | Trailer steering correction was mathematically zero | Previous axle position and hitch-length constraint drive trailer heading; terrain-driven roll/pitch |
| High | Visible trees and collision boxes used different positions | One deterministic placement contract feeds scene and obstacles; building colliders added |
| High | Obstacle queries could start before physics indexed the scene | Driving waits for the first completed physics step; browser regression sweeps the chassis into an actual placed tree |
| High | Scene rebuilds leaked private assets and sprite registrations | Effect-owned factories, explicit private resource disposal, shared-material ownership, sprite unregistering |
| Medium | All simulation/kit callbacks were traversed, including nested callbacks already invoked by parents | Each animated subtree has a single update owner; weather demonstrations remain visible under their own forced weather |
| Medium | Beacon/diorama cloth meshes were not mounted | Scene-space cloth attachments are mounted and cleaned up alongside their owners |
| Medium | Viewer edits changed the garage loadout | Per-entry preview state and explicit adoption into the garage |
| Medium | Category tabs did nothing; trees/weather showed a drive action | Functional category/search tools and appropriate vehicle/towing/preview actions |
| Medium | Sun elevation never changed and shadow coverage stayed at the origin | Interpolated elevation; shadow camera follows the current focus |
| Medium | Under-camera and diorama state leaked into other modes | Mode changes reset these states; drive world visibility is restored |
| Medium | “Top” was an oblique view and all nonvehicles shared a small camera distance | Actual top/under positions and framing based on model bounds |
| Medium | Input stuck after blur/touch cancellation and interfered with fields | Focus/visibility cancellation, pointer capture/release/cancel, scoped keyboard handling, editable-field guards |
| Medium | Water replaced biome colors and had incorrect Fresnel direction | Reference-style depth water, foam, biome uniforms, corrected view vector, shared pond material |
| Medium | Large one-piece JavaScript download | Physics and bloom lazy-loaded separately; initial JavaScript reduced substantially |
| Medium | Engine audio received conflicting frequency updates, mute missed scheduled effects, no teardown | Single engine RPM/gear signal, master gain, context/node cleanup, distance-aware base-camp crackle |
| Medium | Invalid saved values could crash scene indexing or vehicle factories | Versioned migration and validated saved preferences/loadout; every launch starts at the menu |
| Medium | Vehicle labels contained encoding corruption | Restored multiplication symbols and punctuation in kit text |
| Medium | Build success was mistaken for render verification | Headless browser screenshots and runtime/shader-error collection added |

## Implementation boundaries

- This delivery establishes **one free-roam world**, with six global environment palettes and destination routes. It does not pretend the routes are authored separate levels or a campaign.
- Kit factory shapes and palettes remain the source of the models. The kit itself is procedural, so this does not create new authored vehicle meshes or reproduce every visual feature of the commercial reference game.
- The custom suspension uses normalized mass and approximate contact geometry. It now supports meaningful spring/damping/preload tuning, contact-limited wheel travel, and stable tested driving. It is not a complete drivetrain/tyre solver.
- Obstacle shapes approximate tree trunks, rocks, and buildings. Trailer obstacle response, camera collision with buildings, drivable bridge/ferry decks, tyre deformation, wading/splashes, damage, and advanced off-road traction are still work to do.
- Foreground grass tiles preserve world-anchored blades as the player moves. Near animated foliage uses its kit behavior; distant foliage uses the kit rest pose for batching.
- At Low graphics, reduced terrain tessellation can differ slightly from analytic wheel contact. Hardware performance tuning and a real-phone pass are still required.
- The factory implementation remains a legacy `@ts-nocheck` body. Domain logic is separated into terrain, driving, audio, materials, rendering, map, and overlay modules; a complete typed factory refactor is a later task.

## Verification

Final regression results: **24 tests passed across 3 files**; **27 extended browser checks passed with no captured runtime or console errors**. The main browser flow also recorded no errors. Reports: `artifacts/verification/browser-results.json` and `artifacts/verification/extended-results.json`. Visual captures include desktop, mobile, 130% interface scaling, High graphics, and storm/night conditions.

The regression suite covers construction of all 60 catalog entries, four configurations per vehicle, 180 environmental targets, continuous heights, minute-long acceleration/turning/braking runs for all eleven vehicles, stable grounded tyre contact, frame timing, preload and damping response, geometry-specific inertia, recovery, trailer constraints, preserved articulated bake meshes, cleanup, and persistence validation.

Browser verification uses an isolated local headless Chrome profile with software WebGL. Screenshots and reports are in `artifacts/verification/`. This checks rendering and interactions, not achievable hardware frame rates. The main pass covers starting screen, settings, free roam, actual throttle input, garage, diorama, return to drive, map, and mobile layout. Extended checks cover preferences, UI scaling, graphics changes, biome rendering, preview isolation, audio, and pause/input behavior.

Production build passes TypeScript and Vite compilation. Initial JavaScript is 1,272.98 kB (360.94 kB gzip), compared with approximately 3.59 MB before splitting. Physics loads on the first drive in its own 2,259.80 kB chunk (850.37 kB gzip); bloom is a separate 83.14 kB chunk (22.67 kB gzip). Vite still reports large chunks, so download size remains a performance task.

## Next development priorities

1. Measure real hardware frame times and draw calls for every quality profile, then reduce shadow casters/overdraw and add terrain/vegetation LOD where needed.
2. Refine scene composition and lighting against specific artifact screenshots, with side-by-side visual acceptance checks.
3. Add trailer and camera collision response, better tyre grip by surface/weather, and drivable water/bridge interactions.
4. Extend the discovery routes into designed journeys/objectives and test the pacing of the expanded world.
5. Improve spatial sound, vehicle-specific engine character, gamepad support, accessibility, and control rebinding.
6. Replace selected procedural assets with authored GLBs only when they improve the target look while preserving the rig and viewer contracts.
