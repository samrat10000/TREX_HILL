import * as THREE from 'three';

export const TIMES = {
  dawn: { label: 'Dawn', top: 0x6e6aa6, horizon: 0xf4a68c, ground: 0x6a5466, sun: 0xffb08a, sunI: .85, elevation: 5, hemi: 0xa594c8, hemiI: .66, fog: 0xe9a596, near: 14, far: 130, night: .5, wind: .6 },
  morning: { label: 'Morning', top: 0x4f9fe0, horizon: 0xcde6ef, ground: 0x8c8a7a, sun: 0xfff0d4, sunI: 1.15, elevation: 24, hemi: 0xbcd7ee, hemiI: .7, fog: 0xc4dfeb, near: 22, far: 170, night: 0, wind: .7 },
  noon: { label: 'Noon', top: 0x3b97de, horizon: 0xa8dbf2, ground: 0x9a9478, sun: 0xffffff, sunI: 1.25, elevation: 62, hemi: 0xc6e2f4, hemiI: .72, fog: 0xa6d6ef, near: 30, far: 190, night: 0, wind: .8 },
  golden: { label: 'Golden', top: 0xf3b27a, horizon: 0xffdcaa, ground: 0x9a6a50, sun: 0xffb055, sunI: 1.45, elevation: 9, hemi: 0xffd2a0, hemiI: .72, fog: 0xf8c793, near: 12, far: 125, night: 0, wind: .8 },
  dusk: { label: 'Dusk', top: 0x6d4c8c, horizon: 0xff8c78, ground: 0x5a3a50, sun: 0xff7055, sunI: .9, elevation: 2.5, hemi: 0xc77ea6, hemiI: .62, fog: 0xe98a80, near: 10, far: 115, night: .62, wind: .6 },
  night: { label: 'Night', top: 0x081530, horizon: 0x22355e, ground: 0x0a0f1c, sun: 0x8ea6ff, sunI: .32, elevation: 40, hemi: 0x30447a, hemiI: .42, fog: 0x1a2745, near: 8, far: 85, night: 1, wind: .5 },
} as const;

export const WEATHER = {
  clear: { label: 'Clear', rain: 0, snow: 0, tint: 0x000000, mix: 0, intensity: 1, fog: 1, wind: 1, night: 0, wet: 0 },
  rain: { label: 'Rain', rain: .65, snow: 0, tint: 0x5f7c86, mix: .45, intensity: .55, fog: .6, wind: 1.3, night: .2, wet: 1 },
  storm: { label: 'Storm', rain: 1, snow: 0, tint: 0x1f5552, mix: .72, intensity: .35, fog: .5, wind: 2, night: .5, wet: 1 },
  mist: { label: 'Mist', rain: 0, snow: 0, tint: 0xd5dfdf, mix: .55, intensity: .5, fog: .32, wind: .3, night: .3, wet: 0 },
  snow: { label: 'Snow', rain: 0, snow: 1, tint: 0xd8cfe0, mix: .45, intensity: .6, fog: .45, wind: 1.1, night: .25, wet: 0 },
} as const;

export const BIOMES = {
  meadow: { label: 'Meadow', grass: [0x9a6224, 0xf2c35c], ground: 0x9c7a3c, dirt: 0xb38c5c, trees: 1, snow: 0, water: [0x1d6f86, 0x3fc1c9] },
  highland: { label: 'Highland', grass: [0x2f5a2c, 0x8cbf5a], ground: 0x4c6a36, dirt: 0x8a7552, trees: 1, snow: 0, water: [0x1d5a6e, 0x3a9aa8] },
  autumn: { label: 'Autumn', grass: [0x8a3e24, 0xeb8f48], ground: 0x8a4a2c, dirt: 0xa8724a, trees: 1, snow: 0, water: [0x1d6f86, 0x3fc1c9] },
  desert: { label: 'Desert', grass: [0x8a6a3a, 0xd9b46a], ground: 0xd49a62, dirt: 0xc98a58, trees: .25, snow: 0, water: [0x1f7a7a, 0x56d2c2] },
  alpine: { label: 'Snowline', grass: [0x8a8f9a, 0xe8ecf4], ground: 0xe8ecf4, dirt: 0xb8b2bc, trees: .35, snow: 1, water: [0x2a5a78, 0x6aa8c8] },
  coast: { label: 'Coast', grass: [0x6a7a32, 0xd2d27a], ground: 0xa89a5a, dirt: 0xc2a26a, trees: .7, snow: 0, water: [0x0f8a9a, 0x5ae4dc] },
} as const;

export type PresetKey = keyof typeof TIMES;
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export function resolvePreset(settings:{time:string;weather:string;biome:string}){
  const t=(TIMES as any)[settings.time]||TIMES.golden,w=(WEATHER as any)[settings.weather]||WEATHER.clear,b=(BIOMES as any)[settings.biome]||BIOMES.meadow;
  const tint=new THREE.Color(w.tint||t.horizon),blend=w.mix||0;
  return {
    top:new THREE.Color(t.top).lerp(tint,blend),horizon:new THREE.Color(t.horizon).lerp(tint,blend),fog:new THREE.Color(t.fog).lerp(tint,blend),ground:new THREE.Color(t.ground).lerp(tint,blend*.5),
    sun:new THREE.Color(t.sun),hemi:new THREE.Color(t.hemi),el:t.elevation,night:Math.min(1,t.night+(w.night||0)*(1-t.night)),wind:w.wind*(t.wind||1),rain:w.rain,snow:w.snow,
    sunI:t.sunI*w.intensity,hemiI:t.hemiI,fogNear:t.near*(w.fog||1),fogFar:t.far*(w.fog||1),groundBiome:new THREE.Color(b.ground),wet:w.wet,bolt:settings.weather==='storm'?1:0,
  };
}

export const TIME_ORDER=['dawn','morning','noon','golden','dusk','night'] as const;
export function resolveClock(settings:{time:string;weather:string;biome:string},phase:number){const i=((phase%6)+6)%6,index=Math.floor(i),weight=i-index,a=resolvePreset({...settings,time:TIME_ORDER[index]}),b=resolvePreset({...settings,time:TIME_ORDER[(index+1)%6]});for(const key of ['top','horizon','fog','ground','sun','hemi','groundBiome'] as const)a[key].lerp(b[key],weight);for(const key of ['el','night','wind','rain','snow','sunI','hemiI','fogNear','fogFar','wet'] as const)a[key]+=(b[key]-a[key])*weight;return a;}
