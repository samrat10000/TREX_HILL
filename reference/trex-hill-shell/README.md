# trex-hill-shell — what's in this zip

Hand this whole folder to Codex with the prompt in `PROMPT.md`. Put it in the repo as `/reference/trex-hill-shell/` (read-only).

```
trex-hill-shell/
├─ README.md                  this file
├─ PROMPT.md                  the copy-paste prompt for Codex
├─ GAME_TASK.md               the full task list: goal, bugs found, decisions, tasks 1–10 with "Done when" checks
├─ ui-kit/
│  ├─ trexhill-ui-kit.html    REFERENCE ONLY, not the game: shows the direction for UI, flow and models. Title, save slots, free-roam setup,
│  │                          garage, settings (7 tabs), HUD, pause, map, journal, photo mode, loading, UI kit page
│  └─ src/
│     ├─ a_head.html          all CSS: design tokens (colours, type, radii, easing) and every screen's styles
│     ├─ b_world.js           the live world behind the menus: sky, smooth terrain, grass shader, baked scatter,
│     │                       camp/garage/POIs, hero truck, time/weather blending, camera rigs per screen
│     └─ c_ui.js              screen state machine, saves, settings, garage parts and stats, HUD, map, journal, photo
├─ sound/
│  ├─ hillkit-audio.js        sound engine (engines, tyres, ambience, wildlife, thunder, UI)
│  └─ README.md               its API
└─ reference/
   ├─ original-over-the-hill.jpg   contact sheet from the real game's video
   ├─ original-01…22.jpg           individual frames from the real game
   └─ current-build.jpg            contact sheet from the current TREX_HILL build
```

**The UI kit is a guide, not the game.** Codex rebuilds its screens properly in the repo and takes the 3D models from `src/kit`, never from the HTML.

Open `ui-kit/trexhill-ui-kit.html` first. Use arrow keys and Enter on the title; Esc goes back; in the drive preview W/S change speed, M map, P photo, J journal, H lights, L range, Esc pause.
