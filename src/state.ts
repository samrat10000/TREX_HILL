import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type GameSettings = { time: string; weather: string; biome: string; vehicle: string; loadout: Record<string, any>; trailer: boolean; ui: 'drive' | 'garage' | 'viewer' };
type GameActions = GameSettings & {
  set: (patch: Partial<GameSettings>) => void;
  setOption: (key: string, value: any) => void;
};

export const useGameStore = create<GameActions>()(persist((set) => ({
  time: 'golden', weather: 'clear', biome: 'meadow', vehicle: 'ranger40',
  loadout: {}, trailer: false, ui: 'drive',
  set: (patch) => set(patch),
  setOption: (key, value) => set((s) => ({ loadout: { ...s.loadout, [key]: value } })),
}), { name: 'over-the-hill-loadout', partialize: (s) => ({ time: s.time, weather: s.weather, biome: s.biome, vehicle: s.vehicle, loadout: s.loadout, trailer:s.trailer, ui: s.ui }) }));
