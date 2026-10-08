# hill-kit — what's in this zip

Cozy browser driving game (Over the Hill–style). This bundle = the UI kit + everything Claude Code needs to integrate it.

Live kit (published artifact): https://claude.ai/artifact/9wWAmytUcD3JHsExZjCTMX
Same file is `reference/hillkit.html` — open it in a browser, no build step.

## Start here
1. Copy this whole folder into your game repo as `/reference/hill-kit/` (read-only).
2. Paste `HILLKIT_REFACTOR.md` into Claude Code. It begins with an audit and stops for your approval before any code changes.

## Layout
```
hill-kit/
├─ README.md                 this file
├─ HILLKIT_REFACTOR.md       the integration brief for Claude Code (phases 1–8, contracts, version traps, tuning tables)
├─ reference/
│  ├─ hillkit.html           the published kit, single file. Viewer + every model + sky/weather + test drive. Loads three r147 + fonts from CDN.
│  ├─ hillkit-kit.js         KIT only: pure model factories (vehicles, parts, nature, buildings, props, wildlife, weather FX, catalog). No DOM, no renderer.
│  └─ hillkit-app.js         reference app code: sky shader, terrain H(x,z), grass + water shaders, time/weather/biome presets, suspension physics, dust, procedural audio, UI.
├─ context/
│  ├─ BRIEF.md               your original voice-note brief, verbatim, + Steam link
│  └─ images/ref-*.png       Over the Hill reference screenshots you sent (duplicates removed)
└─ tests/
   ├─ package.json           three 0.147.0 + jsdom
   ├─ kit-smoke.test.js      builds all 60 catalog entries + every vehicle with 4 mod combos, runs updates. Expect: "entries ok 60 / 60"
   └─ app-headless.test.js   boots the full kit in jsdom with a stub renderer: every time/weather/biome, every model, every option, test drive, diorama. Expect: "done ok"
```

## Run the tests
```
cd tests && npm i && npm run kit && npm run app
```
They catch runtime errors only — they cannot judge visuals. Check looks in the browser.

## Which file to edit
- Change how a model looks or add a model → `reference/hillkit-kit.js` (then mirror into `hillkit.html`, or let Claude Code do it after the phase-2 port, where the kit becomes ESM modules).
- Change sky, lighting presets, grass, water, physics, controls → `reference/hillkit-app.js`.
- After phase 2 of the refactor, the repo's own `kit/` modules become the source of truth and `/reference` is frozen.

## Known gaps (honest)
- Never verified on a real GPU from here; expect a colour/light tuning pass per time of day.
- Your existing repo was not shared, so the refactor brief starts with an audit to map your models onto the kit.
- Procedural low-poly captures the vibe, not Unity hand-authored art. The rig contract is kept stable so Blender GLB vehicles can be swapped in later.
