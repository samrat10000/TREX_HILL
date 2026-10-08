import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { KIT } from './core';
import { BIOMES, TIMES, WEATHER } from '../game/presets';

export const QUALITY = {
  low: { label: 'Low', grass: 16000, pixelRatio: 1, shadows: 0, bloom: false, terrainSegments: 32 },
  medium: { label: 'Medium', grass: 32000, pixelRatio: 1.25, shadows: 1024, bloom: false, terrainSegments: 48 },
  high: { label: 'High', grass: 62000, pixelRatio: 1.5, shadows: 2048, bloom: true, terrainSegments: 64 },
  ultra: { label: 'Ultra', grass: 96000, pixelRatio: 2, shadows: 2048, bloom: true, terrainSegments: 80 },
} as const;
export type Quality = keyof typeof QUALITY;
export type GameSettings = {
  time: string; weather: string; biome: string; vehicle: string; loadout: Record<string, any>; trailer: boolean;
  ui: 'menu' | 'drive' | 'garage' | 'viewer'; quality: Quality; renderScale: number; uiScale: number;
  volume: number; showMap: boolean; showPerf: boolean; visited: string[]; destination: string | null;
};
const defaults: GameSettings = {
  time: 'golden', weather: 'clear', biome: 'meadow', vehicle: 'ranger40', loadout: {}, trailer: false,
  ui: 'menu', quality: typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches ? 'medium' : 'high',
  renderScale: 1, uiScale: 1, volume: .65, showMap: true, showPerf: false, visited: [], destination: null,
};
const number = (value: unknown, fallback: number, min: number, max: number) => typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
export function validateSettings(saved: Partial<GameSettings>): GameSettings {
  const loadout: Record<string, any> = {};
  for (const section of KIT.VOPTS) for (const option of section.items) {
    const value = saved.loadout?.[option.k];
    if (value === undefined) continue;
    if (option.t === 'toggle' && typeof value === 'boolean') loadout[option.k] = value;
    else if (option.t === 'range' && typeof value === 'number') loadout[option.k] = number(value, option.min ?? 0, option.min ?? 0, option.max ?? 1);
    else if ((option.v ?? (option.t === 'swatch' ? Object.keys(KIT.PAINTS) : [])).includes(value)) loadout[option.k] = value;
  }
  return {
    ...defaults, loadout,
    time: saved.time && saved.time in TIMES ? saved.time : defaults.time,
    weather: saved.weather && saved.weather in WEATHER ? saved.weather : defaults.weather,
    biome: saved.biome && saved.biome in BIOMES ? saved.biome : defaults.biome,
    vehicle: saved.vehicle && saved.vehicle in KIT.VEH ? saved.vehicle : defaults.vehicle,
    quality: saved.quality && saved.quality in QUALITY ? saved.quality : defaults.quality,
    renderScale: number(saved.renderScale, 1, .5, 1.5), uiScale: number(saved.uiScale, 1, .8, 1.3), volume: number(saved.volume, .65, 0, 1),
    showMap: saved.showMap !== false, showPerf: saved.showPerf === true, trailer: saved.trailer === true,
    visited: Array.isArray(saved.visited) ? saved.visited.filter((v): v is string => typeof v === 'string') : [],
    destination: typeof saved.destination === 'string' ? saved.destination : null,
  };
}
type Actions = GameSettings & { set: (patch: Partial<GameSettings>) => void; setOption: (key: string, value: any) => void; visit: (id: string) => void };
export const useGameStore = create<Actions>()(persist((set) => ({
  ...defaults, set: patch => set(patch),
  setOption: (key, value) => set(s => ({ loadout: { ...s.loadout, [key]: value } })),
  visit: id => set(s => ({ visited: s.visited.includes(id) ? s.visited : [...s.visited, id] })),
}), {
  name: 'over-the-hill-loadout', version: 2,
  migrate: saved => validateSettings((saved ?? {}) as Partial<GameSettings>),
  merge: (saved, current) => ({ ...current, ...validateSettings((saved ?? {}) as Partial<GameSettings>) }),
  partialize: ({ ui: _ui, set: _set, setOption: _option, visit: _visit, ...saved }) => saved,
}));
