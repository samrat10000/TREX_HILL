# HILLKIT_REFACTOR.md — integrate the Hill Kit into this repo

## 0. Rules
- Never touch git. No commits, branches, stashes, resets.
- Every new file must earn its place. No wrapper layers, no "managers" for one caller.
- Phases are independently verifiable. Correctness before visual polish.
- Animation: smooth, not springy (critically/over-damped easing, no overshoot), except where physics drives it.
- Never duplicate a model that already exists in the repo — map, then replace or extend.

## 1. Inputs (place in /reference, read-only)
- hillkit.html — runnable viewer (open in browser = source of truth for look & behaviour)
- hillkit-kit.js — `KIT` IIFE: pure factories, no DOM/renderer. Built on three r147 UMD globals.
- hillkit-app.js — reference implementations: sky shader, terrain H(x,z), instanced grass shader, water shader, time/weather presets, drive physics, procedural audio, UI.

### KIT contract (keep these signatures through every phase)
- Every builder: `(opts) => THREE.Group`; animated ones set `group.userData.update(dt, t, env)`.
- `env = { wind, night:0..1, time, rain, snow, aurora }`
- `KIT.vehicle(id, cfg) => rig` with: `root, chassis, body, wheels[{node,steer,spin,x,z,front,dir}], wr, spec, cfg, engine, susp, world[] (scene-space meshes e.g. cloth), setLights(level, brake), setSpots(bool), update(dt,t,env), exhaust`
  - Axes: +x forward, +y up, +z right. root at ground; chassis.y = wheel-centre height; wheels are children of root (not chassis) so suspension moves the body.
- `KIT.lamps` (emissive mats) and `KIT.glowSprites` scale with night level each frame: `emissiveIntensity = base*(.03+.97*night)`, sprite opacity = base*night.
- `KIT.ENTRIES` = catalog with `opts` schema (seg/swatch/toggle/range/seed). `KIT.VOPTS` = vehicle customisation schema. `KIT.shared.grassMat / waterMat` are injected by the app.

## 2. Phases

1 Audit (no code changes)
1.1 Detect stack: three version, R3F or vanilla, bundler, physics lib, audio lib.
1.2 Inventory every existing model/scene/vehicle/physics/audio file. Output a table: existing → kit entry → keep | replace | merge.
1.3 List renderer settings in use (colour management, tone mapping, light mode). Output conflicts with §3.
Done when: table + conflict list printed. Stop and wait for approval.

2 Kit as modules
2.1 Port hillkit-kit.js into ESM, minimum files: `kit/core.js` (rng, noise, mat cache, helpers, Cloth, Whip, paintMat), `kit/vehicles.js`, `kit/world.js` (nature+buildings+props+wildlife), `kit/fx.js`, `kit/registry.js`. Replace `THREE.` globals with imports. If R3F: mount factories via `<primitive object={...}/>` and drive `userData.update` from one `useFrame`.
2.2 Apply §3 version fixes.
2.3 Node smoke test: build every ENTRY and every vehicle with 4 cfg combos (default; all mods on; kayak+ram+sand+safari; mud+twotone+cargo), call update 5 frames. Zero throws.
Done when: smoke test passes, existing game still boots.

3 World
3.1 Port sky dome shader, stars, 3 mountain rings (fog-tinted MeshBasic), terrain H(x,z) + vertex colours + snow/wet onBeforeCompile, ground skirt.
3.2 Instanced grass (ShaderMaterial + fog chunks, two push uniforms: player + stage). Desktop 62k, mobile 26k blades.
3.3 Water: lake-local plane with baked `aDepth` attribute → shallow colour + shore foam.
3.4 Scatter: place by biome, then `bake()` (merge by material) → a few draw calls.
3.5 Presets: TIMES × WEATHER × BIOMES → target params, exponential lerp `1-exp(-dt*2.2)` every frame. Never snap.
Done when: all 6 times × 5 weather × 6 biomes render without errors and transition smoothly.

4 Vehicles & physics
4.1 Replace existing vehicles per the audit table with `KIT.vehicle`.
4.2 Port `stepDrive` (4 substeps/frame). Per wheel: ground = H(wheel xz)+r; comp = ground − mountY; f = g/n + k·comp + c·dcomp; bump stop beyond travel (×10 k); droop → wheel airborne, f=0. Heave/pitch/roll from Σf, Σf·x, −Σf·z; inertial pitch +0.4·longAccel, roll +0.5·latAccel.
4.3 If the repo has a physics engine, keep this as the suspension layer and use the engine only for chassis–world collisions. Do not replace the spring model.
4.4 Trailer tow for the caravan: hitch on rig rear; trailer axle follows `axle = hitch − normalize(hitch − axle)·tongueLen`; pitch/roll from its wheel ground heights.
Done when: drive the ring track at full speed over bumps with no jitter, NaN or launch; 6×6 middle axle articulates.

5 Light, weather, audio
5.1 Headlights auto at night/storm/mist; brake lights on brake or reverse-braking; H toggles, C swaps camera.
5.2 Rain/snow volumes follow camera; lightning every 3–9 s in storm with sky flash + directional flash + delayed thunder (delay = distance/120).
5.3 Procedural audio opt-in only (user gesture): engine (rpm from speed, 4 virtual gears), wind, rain, fire crackle, birdsong by day.
Done when: night drive shows headlight pools on grass/trees; storm and snow both hold 60 fps desktop.

6 Kit viewer route (dev only)
6.1 Add `/kit` (or dev flag) that mounts the viewer UI from hillkit-app.js against the ported modules. Same inspector schema.
Done when: every catalog entry selectable, every option rebuilds the model.

7 Performance & polish
7.1 Budget: ≤ 250 draw calls desktop, ≤ 120 mobile. Instance repeated props; bake static scatter.
7.2 Shadow camera follows focus (48 m box); mobile 1024 map.
7.3 Bloom: strength .32 + .55·night, threshold .9 − .32·night.
Done when: mobile mid-tier ≥ 45 fps in the diorama at night with fire + fairy lights.

8 Design against common genre pain points
8.1 Camera never clips terrain (raise to H+1.2).
8.2 One-key vehicle recovery (flip upright at last safe pose).
8.3 No foliage pop-in: fade by distance in the grass shader instead of hard culling.
8.4 Objectives readable at night: beacon ring + flag always lit.

## 3. three version traps (apply in 2.2)
- r148+: no `examples/js` — import addons from `three/addons/...`.
- r151+: `BufferGeometryUtils.mergeBufferGeometries` → `mergeGeometries`.
- r152+: colour management on by default — hex colours shift. Either `THREE.ColorManagement.enabled = false` + linear output (matches kit), or keep sRGB and re-tune palettes. Pick one, apply everywhere.
- r154+: shader chunk `encodings_fragment` → `colorspace_fragment` (only if adding chunks).
- r155+: physically-correct lights default. Multiply Directional/Hemisphere intensities ×π; set `decay = 0` on vehicle spots, fire point light, lightning flash, then ×π. Re-check night scene by eye.
- Paint shader uses `customProgramCacheKey = 'paint'` + per-material uniforms; keep both or materials will share uniforms.

## 4. Tuning tables
- Suspension (per unit mass, per wheel): soft k26 c2.6 travel×1.3 · stock k38 c3.4 ×1 · stiff k62 c5.6 ×.75. Droop .24·travel, bump .2·travel, +lift·.3.
- Engines: inline-6 135hp top 22 m/s acc 5.2 · V8 240/31/8.2 (hood scoop) · diesel 160/20/5.8 climb×1.4 · electric 300/29/10.
- Times (el°, sun intensity, fog near–far): dawn 5/.85/14–130 · morning 24/1.15/22–170 · noon 62/1.25/30–190 · golden 9/1.45/12–125 · dusk 2.5/.9/10–115 · night 40/.32/8–85.

## 5. Backlog after phase 8
- Authored GLB vehicles: keep rig node names (root/chassis/body/wheel nodes) so physics and inspector work unchanged.
- Skid marks, water wading splash, tyre deformation, damage decals, trailer sway.
