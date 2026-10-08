import { describe, expect, it } from 'vitest';
import { KIT } from '../src/kit/core';
import { BIOMES, TIMES, WEATHER, resolvePreset } from '../src/game/presets';
import { terrainHeight } from '../src/game/world';

describe('phase 1 app contracts', () => {
  it('boots a vehicle rig and exposes its wheel suspension nodes', () => {
    const rig = KIT.vehicle('ranger40', {});
    expect(rig.root).toBeInstanceOf(KIT.T.Group);
    expect(rig.chassis).toBeInstanceOf(KIT.T.Group);
    expect(rig.wheels.length).toBeGreaterThanOrEqual(4);
    expect(typeof rig.update).toBe('function');
  });

  it('resolves all 180 time, weather, and biome combinations to finite targets', () => {
    let combinations = 0;
    for (const time of Object.keys(TIMES)) for (const weather of Object.keys(WEATHER)) for (const biome of Object.keys(BIOMES)) {
      const target = resolvePreset({ time, weather, biome });
      expect([target.night,target.wind,target.rain,target.snow,target.sunI,target.hemiI,target.fogNear,target.fogFar].every(Number.isFinite)).toBe(true);
      expect(target.fogFar).toBeGreaterThan(target.fogNear);
      combinations++;
    }
    expect(combinations).toBe(180);
  });

  it('keeps terrain height finite around the drive area and lake basin', () => {
    for (let x=-90;x<=90;x+=6) for (let z=-90;z<=90;z+=6) expect(Number.isFinite(terrainHeight(x,z))).toBe(true);
  });
});
