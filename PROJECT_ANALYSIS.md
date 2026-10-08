# TREX_HILL project analysis

This is the original pre-change audit. The subsequent implementation and remaining limitations are tracked in [ISSUES_AND_FIXES.md](ISSUES_AND_FIXES.md).

Reviewed 8 October 2026. Scope: current React application, procedural kit, reference implementation, design brief, integration roadmap, configuration, and automated tests. No application code was changed.

## Assessment

This is a client-only browser driving and asset-inspection prototype. Its strongest existing asset is the procedural kit: it supplies many vehicles, customization parts, environmental objects, and animated effects through a consistent factory API. The React application integrates much of that kit, but several integration errors break the intended physical behavior. The next useful milestone is a stable, measurable driving sandbox; visual refinement should build on that foundation.

The repository does not contain a backend, accounts, multiplayer, authored GLB vehicles, a level progression system, or a production deployment pipeline. The original brief describes a much more ambitious visual and experiential target than the implemented sandbox. Asset count alone does not establish visual fidelity or long-term playability.

## Verification and limits

- `npm test`: passed, two files and four tests.
- `npm run build`: passed, including the strict TypeScript check for application files.
- Production output: JavaScript 3,591.12 kB, gzip 1,224.51 kB; CSS 7.31 kB. Vite warns about the large JavaScript chunk.
- Tests/build initially failed with sandbox `spawn EPERM`; rerunning with subprocess access succeeded. This was an environment restriction, not a project build failure.
- Additional Node probes loaded the actual kit/bake code and extracted the actual terrain, drive, and towing functions for numerical checks. These verified the baking, terrain, suspension, towing, and registry findings below.
- No browser execution, screenshots, GPU profiling, audio listening, or real-phone testing was completed. The session exposes no Node REPL browser tool. Frame rate, visual quality, WebGL shader compilation, and practical browser compatibility remain unverified.
- A small change to development flags in `package-lock.json` appeared during the session. It was preserved; this review did not intentionally edit the lockfile or install dependencies.

## Structure and data flow

| Area | Files | Responsibility |
| --- | --- | --- |
| Entry | `index.html`, `src/main.tsx` | Mount the React application in StrictMode |
| Application | `src/ui/App.tsx` | Canvas, simulation loop, controls, cameras, audio, garage, viewer, collision queries |
| State | `src/state.ts` | Zustand settings/loadout, persisted in localStorage |
| World | `src/game/world.tsx` | Height field, terrain mesh, grass, water, scatter, camp, colliders |
| Environment | `src/game/presets.ts` | Six times, five weather states, six biomes, target parameter resolution |
| Exhibit | `src/game/diorama.tsx` | Curated model arrangement on a circular platform |
| Factories | `src/kit/core.ts` | Almost all procedural geometry, materials, animations, catalog, vehicle definitions |
| Contracts | `src/kit/types.ts` | Public kit types |
| Exports | `src/kit/{vehicles,world,fx,registry}.ts` | Thin aliases over `core.ts` |
| Optimization | `src/kit/bake.ts` | Merge vehicle meshes by material and geometry attributes |
| Reference | `assests 1/hill-kit/reference/` | Original standalone viewer and kit, built around Three r147 |
| Intent | `assests 1/hill-kit/context/`, `HILLKIT_REFACTOR.md` | Design brief, images, staged integration requirements |

Installed stack: React 19.3.0, Three 0.186.1, React Three Fiber 9.8.1, Drei 10.7.9, React Three Rapier 2.2.0, Zustand 5.0.15, Vite 8.3.3, TypeScript 7.0.2, Vitest 5.0.3. These are the versions declared locally, not a claim about the latest releases.

UI changes update Zustand; loadout changes reconstruct models. `GameLoop` updates preset interpolation, world shaders, lights/weather, audio, custom driving physics, towing, camera, and catalog animations. Rapier supplies static-world shape queries; the player chassis is moved manually by the spring simulation rather than a dynamic rigid body.

## Existing inventory

| Category | Entries | Examples | Recommended treatment |
| --- | ---: | --- | --- |
| Vehicles | 12 | Eleven driveable vehicles plus caravan | Keep rig/config API; repair physics, baking, towing |
| Nature | 14 | Pine, aspen, maple, oak, palms, cactus, rocks, grass, pond | Keep factories; merge world placement and collision data |
| Buildings | 8 | Cabins, tower, lighthouse, bridge, ferry, outpost | Keep; add appropriate colliders and world attachments |
| Camp/props | 15 | Fire, tent, fairy lights, lantern, beacon, crates, fuel pump | Keep; add lifecycle cleanup and selective animation updates |
| Wildlife | 4 | Gulls, crows, deer, butterflies | Keep; integrate selectively into drive world |
| Weather | 7 | Rain, snow, lightning, fireflies, fog, aurora, cloud | Keep; repair parent/child update ownership |

The driving world mounts only a subset of the kit. Many entries are available exclusively through the catalog. There is no reason to rebuild all 60 entries before correcting their integration.

## Highest-priority findings

### 1. Terrain discontinuities destabilize suspension — high

`src/game/world.tsx:12` samples a hash at floored grid coordinates without interpolation. The continuous drive-height query therefore contains abrupt steps. The rendered plane interpolates between vertices spaced approximately 1.37 m apart, so visual ground and wheel contact can disagree near those steps.

A numerical probe found a 4.008 m height jump across just 0.00002 m at approximately `(x=0,z=-90)`. The drive function differentiates wheel compression and adds aggressive bump-stop forces. This turns terrain steps into large impulses.

Using the application's Ranger starting pose, inertia formulas, and four substeps at 60 Hz, holding acceleration for ten seconds without obstacle queries produced chassis height 90.44 m over ground -3.03 m. At seven seconds, vertical speed reached 34.67 m/s. This is a numerical reproduction, not a browser observation. Collision queries only reject horizontal movement, so they do not themselves constrain vertical chassis motion.

Repair: use smooth interpolated noise, keep rendered/contact terrain consistent, initialize compression at the starting wheel contacts, and verify force limits and suspension behavior across bumps, airborne phases, landings, recovery, and vehicle sizes.

### 2. Vehicle baking freezes antenna/pole geometry — high

`src/kit/bake.ts:33` marks each whip root `skipBake`, but `bakeSubtree` only checks that flag on individual meshes. It continues into descendants of marked groups, merges their meshes into the body, and removes the originals.

Probe: a Ranger with antenna and flag had nine meshes under its whip hierarchy before baking and zero afterward. The animated nodes remain, but their pole geometry now belongs to the static body. Cloth still follows the animated attachment, so it can separate visually from the baked pole.

Repair: exclude an entire marked subtree, with explicit ownership of which nodes may deform or move. Preserve wheel steering/spin, cloth, antennas, and any other animated descendants.

### 3. Trailer steering cannot converge toward the vehicle — high

`src/ui/App.tsx:136` computes the trailer axle from the current trailer heading, then derives a target heading from the resulting hitch-to-axle vector. That vector is already aligned with the same heading, so the steering correction is zero.

Probe: setting the tow vehicle to 90 degrees while the trailer started at zero left the trailer heading at zero. The trailer translates behind a moving hitch without proper path-following articulation. It also lacks obstacle collision response and terrain-driven pitch along its length; its current side-to-side wheel-height difference is applied as roll about X.

Repair: retain the previous axle position, enforce tongue length relative to the new hitch, derive heading from that constraint, and independently resolve terrain roll/pitch and collisions.

### 4. Trees and collision boxes do not share placement — high

`buildScatter` uses radius `15 + hash*105`, while `WorldColliders` uses `16 + hash*103`, different counts, a different scale range, and slightly different exclusion logic. Tree roots and collider centers can differ by roughly a metre before accounting for their sizes. Rocks and camp/building objects do not have matching obstacle colliders.

Repair: generate one placement manifest for rendering and physics, with appropriate shapes for each object. Explicitly decide which foliage and props block vehicles.

### 5. Replacement models lack resource cleanup — high

Loadout changes create both an `active` vehicle and a separate `driveRig`; slider changes rebuild them repeatedly. Only the edge overlay has explicit cleanup. World scatter and primitive kit objects also lack application-level teardown.

The installed Fiber implementation explicitly avoids disposing primitive-owned objects. Global `KIT.glowSprites` retains sprites permanently: constructing ten lanterns increased the registry from zero to ten, with no corresponding unregister path. StrictMode can amplify factory allocations during development because these factories allocate resources and mutate global registries during render-time memo evaluation.

Repair: define ownership of geometries, private materials/textures, shared cached materials, and global animation/light registrations. Dispose private resources and unregister models on replacement/unmount. Avoid disposing shared materials still used by other models. Reuse a single rig where feasible and reduce rebuild frequency during slider dragging.

## Other correctness and interaction issues

| Finding | Evidence and consequence | Suggested correction |
| --- | --- | --- |
| Sun elevation stays at the initial preset | `GameLoop` interpolates many fields but never `el`; `SceneLights` reads `preset.el` | Interpolate elevation with time changes |
| Physics dimensions stay from the first vehicle | The drive state, wheelbase, and inertia are initialized only when no drive state exists | Refresh rig-specific physics parameters on vehicle changes |
| Diorama state leaks into driving/garage | World visibility depends on `sim.diorama`, but changing UI modes does not reset it | Make diorama scoped to viewer mode or clear it on mode exit |
| Viewer edits share the garage loadout | Every viewer option calls `settings.setOption`; defaults come from `settings.vehicle`, including when another vehicle is inspected | Separate preview options by catalog entry from committed driving loadout |
| Keyboard handling intercepts form input | Global keydown prevents movement keys and Space without checking the focused target or restricting shortcuts to driving | Ignore editable elements and scope game shortcuts |
| Inputs can stick | No blur/visibility reset and no touch-cancel handling | Clear inputs on focus loss and implement pointer cancellation/capture |
| Touch controls are incomplete | No touch brake, recover, headlight, or camera controls; visibility depends on width rather than input capability | Supply required actions and support large touch devices |
| Misleading viewer actions | Every entry, including trees/weather, shows “Drive this rig”; category tabs are noninteractive spans | Contextual actions plus real category filtering/search |
| “Top” camera is oblique | It uses distance times elevation 1.25 while retaining a horizontal offset | Use actual overhead positioning, and size framing from object bounds |
| Tall/wide models use generic framing | Nonvehicles fall back to a small generic distance | Fit camera to bounding box/sphere |
| No persistence validation/migration | Arbitrary strings/loadout keys are accepted and restored; World directly indexes biome data | Validate stored values and version persisted state |
| No renderer failure UI | Canvas has no explicit fallback/error boundary | Handle unsupported WebGL and runtime render failures |

### Animation ownership and attachments

The frame loop updates an active object's callback, then traverses the entire scene and updates descendant callbacks again. Rain/snow demonstration parents already invoke their children with forced demonstration weather; traversal subsequently invokes those children with the global weather, which can hide a selected rain/snow example under Clear. Lightning and aurora demonstrations have similar double-update ownership problems. `pond` aliases its reeds callback while the reeds child keeps the same callback, so traversal can invoke it twice.

Choose a single update owner for each animated subtree instead of invoking every callback indiscriminately.

The beacon stores its cloth mesh in `userData.world`, but world/catalog mounting handles only vehicle `world` attachments. The beacon flag is therefore not mounted through those paths. Diorama vehicles are added using their roots without their separate `world` cloth meshes, including the Ranger explicitly configured with a flag. Centralize mounting of factory-owned scene-space attachments.

## Rendering and performance

Existing positives: instanced grass, merged static scatter, a vehicle baking pass, capped simulation delta with substeps, preset interpolation, shared material caching, and a development draw-call/triangle readout.

Remaining issues:

- All gameplay, kit, viewer, Rapier, and postprocessing code enters one large JavaScript bundle. Split optional viewer/exhibit tooling and other noncritical paths; measure load time after compression on the actual host.
- `scene.traverse` runs every frame across all descendants, including invisible world/diorama objects. Use an explicit active animation list.
- Shape queries allocate a fresh cuboid on each of four driving substeps; camera and trailer code also allocate vectors per frame. Cache reusable objects after correctness is established.
- Both rain and snow systems remain mounted; world, physics, and camp remain active behind the viewer/diorama even when hidden.
- Merging all scatter geometry removes factory animation callbacks, so animated palms become static in the world. Keep animated pieces separate where motion matters.
- Shadow coverage is fixed around the origin, while vehicles can travel out to radius 120 m. Follow the focus with a bounded shadow camera.
- No explicit desktop/mobile quality profiles control pixel ratio, grass density, effects, or shadow settings. The mobile performance targets in the roadmap are not verified.
- Capping each simulation frame at 1/30 slows simulation relative to real time below 30 fps. If the intended behavior is real-time motion, use an accumulator with a bounded catch-up policy.
- Water fragment code replaces the material's incoming color with hardcoded colors; interpolating biome water material color consequently does not control that main water shading. Its Fresnel expression uses the opposite view-vector sign for the usual upward-facing surface, allowing values beyond the intended 0–1 blending range. Validate and correct this in a rendered shader pass.
- A sky sphere geometry is allocated inline on every World render. Give it stable ownership.

Renderer compatibility work already present includes disabling Three color management, choosing linear output, using modern addon imports, and multiplying several light intensities by pi. This is an intentional legacy-palette approach. The reference roadmap asks for visual verification after version migration; build and factory tests cannot establish that the migrated colors, shaders, bloom, or lighting match the reference.

## Audio

Audio starts on a user gesture and includes engine oscillator, filtered rain/wind noise, fire crackle, birds, and delayed thunder. That is a useful prototype base.

The engine oscillator receives two frequency updates per frame using different formulas. Engine configuration, including electric/diesel characteristics, is not meaningfully represented in that synthesis path. Fire and birds are global rather than tied to nearby emitters. The code does not close the AudioContext on teardown, and errors are swallowed without user feedback. Muting reduces continuous gains but previously scheduled one-shots are routed directly to the destination and can remain audible.

Use one master gain, one engine RPM/gear signal, explicit audio lifecycle cleanup, and distance-aware emitters before investing in sound polish.

## Maintainability and test coverage

`core.ts` contains 566 lines of densely compressed legacy code under `@ts-nocheck`. Its exported API is asserted with `as unknown as KitApi`; that assertion does not check the implementation. Some contracts already differ from reality: Rain/Snow are typed as Groups but return LineSegments/Points. The module files named vehicles/world/fx/registry mostly re-export properties rather than splitting factory implementation. Application simulation state is also extensively `any`, and tests are excluded from the TypeScript include list.

The current tests verify construction, basic rig shape, finite preset values, and finite terrain heights. They do not verify terrain continuity, stable driving, baking behavior, towing, input handling, browser rendering, cleanup, persistence, or mode transitions. Four configuration samples per vehicle are useful smoke coverage, not exhaustive modification testing. The 180 preset combinations are checked numerically, not rendered in a browser. Legacy reference tests exercise the old standalone implementation and are not included by the root Vitest configuration.

Add focused regression coverage for the reproduced failures, followed by a small browser workflow covering Drive → Garage → Viewer → Diorama → Drive, weather demos, storage reload, and keyboard/touch cancellation. Track object/resource counts and frame time under repeated customization.

Repository infrastructure is minimal: no CI workflow, lint script, formatting convention, Node version declaration, or release/deployment configuration was found. Leva is declared but no use was found in the application. There are no server secrets/authentication flows to audit here; this review did not perform an external dependency-vulnerability scan.

## Comparison with the included integration roadmap

| Roadmap area | Current state |
| --- | --- |
| Kit modules | ESM port and public exports exist; actual implementation remains monolithic/untyped |
| World | Terrain/grass/scatter/water exist; stars, three mountain rings, depth-based shore foam, and target grass profiles are absent |
| Physics | Four substeps and spring suspension exist; driving stability, geometry-aligned collisions, and correct towing are incomplete |
| Lighting/weather/audio | Core features exist; sun movement, ownership, RPM/gears, audio lifecycle, and visual checks need work |
| Viewer | Sixty entries, options, cameras, edges, turntable, diorama exist; viewer is shipped as an ordinary mode, not dev-only |
| Performance | Baking and instrumentation exist; draw-call/FPS budgets and real-device checks are unproven |
| Recovery/camera | Recovery and terrain-height camera floor exist; mesh collision, stability, and browser behavior need validation |
| Authored assets | Procedural geometry only; Blender/GLB replacement pipeline is not implemented |

## Recommended order

1. Repair smooth terrain/contact consistency, initial suspension state, and vehicle-specific physics; reproduce stable driving and landings.
2. Correct animated-subtree baking and factory attachment mounting.
3. Unify world placement/colliders and implement correct trailer constraint following.
4. Fix mode transitions, viewer/garage state isolation, sun elevation, and input cancellation.
5. Establish resource/audio ownership and cleanup; test repeated rebuilds and mode switches.
6. Add regression and browser integration coverage for those behaviors.
7. Measure desktop/mobile frame time and draw calls, then reduce active objects, allocations, shadows, and initial bundle cost.
8. Refine composition, terrain detail, water, skies, vehicle silhouettes/materials, and spatial sound against selected references.
9. Add a gameplay loop—routes, discoveries, destinations, or lightweight objectives—once the driving experience is stable enough to support it.

Keep the factory catalog and rig interfaces as the foundation. The project needs targeted correctness and integration work before a broader visual expansion.
