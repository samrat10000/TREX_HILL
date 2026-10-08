# Over the Hill browser game

Client only Vite, React, TypeScript, Three.js, and React Three Fiber prototype built from `assests 1/hill-kit`.

## Start

```sh
npm install
npm run dev
```

Use WASD or the arrow keys to drive, Space to brake, R to recover, H to cycle headlights, and C to switch chase and hood cameras. On touch screens, use the directional pad. Sound begins only after pressing **Sound off** once.

Garage changes persist in localStorage. The kit viewer exposes all 60 kit entries, each model's declared options, seven camera angles, edge view, turntable, and a scene diorama.

## Checks

```sh
npm test
npm run build
```

The smoke suite builds all catalog entries and vehicle mod combinations. The preset suite checks all 6 × 5 × 6 time, weather, and biome targets.

## Current limits

Procedural kit factories are retained in `src/kit/core.ts`, with typed vehicle, world, FX, and registry exports. The imported factory body is a legacy port and currently uses `@ts-nocheck`; its public contracts are typed, while the app code is checked with strict TypeScript. Terrain and suspension are custom spring-damper code; Rapier is used for chassis shape queries against world colliders. A static vehicle geometry bake reduces model draw calls while leaving wheel, suspension, flag, and antenna motion live. Caravan towing is wired into the drive loop and the loadout persists. Performance budgets are not yet met or verified on a mid-tier phone; initial dev measurements before baking exceeded the desktop budget. The procedural port still needs a real device lighting and performance pass, and authored Blender GLBs are not included.
