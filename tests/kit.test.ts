import { describe, expect, it } from 'vitest';
import { KIT } from '../src/kit/core';

const env = { wind: 1, night: 1, time: 0, rain: 0, snow: 0, aurora: 0 };
const vehicleCombos = [
  {},
  { load: 'tent', armor: true, flag: 'flag', tires: 'chains', rims: 'beadlock', livery: 'rally', lift: 0.3, tireSize: 1.3, front: 'bullbar', snorkel: true, ladder: true, cans: true, roofLamps: true, lightbar: true, fog: true, engine: 'v8' },
  { load: 'kayak', front: 'ram', tires: 'sand', rims: 'spoke', livery: 'safari' },
  { tires: 'mud', livery: 'twotone', load: 'cargo' },
];

describe('hill kit factories', () => {
  it('builds every catalog entry and each vehicle mod combination', () => {
    expect(KIT.ENTRIES).toHaveLength(60);
    for (const entry of KIT.ENTRIES) {
      if (entry.vehicle) {
        for (const cfg of vehicleCombos) {
          const rig = KIT.vehicle(entry.id, cfg);
          rig.root.updateMatrixWorld(true);
          rig.setLights(1, 1);
          for (let frame = 0; frame < 5; frame++) rig.update(1 / 60, frame / 60, env);
          expect(rig.root.children.length, entry.id).toBeGreaterThan(0);
        }
      } else {
        const model = entry.build({ seed: 3 });
        model.updateMatrixWorld(true);
        for (let frame = 0; frame < 5; frame++) model.userData.update?.(1 / 60, frame / 60, env);
        expect(model.children.length, entry.id).toBeGreaterThan(0);
      }
    }
    expect(KIT.caravan({}).isGroup).toBe(true);
  });
});
