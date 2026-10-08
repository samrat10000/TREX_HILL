import type * as THREE from 'three';

export type KitEnv = { wind: number; night: number; time: number; rain?: number; snow?: number; aurora?: number; wet?: number; bolt?: number };
export type VehicleConfig = {
  paint?: string | number | null; roof?: string; livery?: string; wear?: number; tires?: string; rims?: string;
  tireSize?: number; lift?: number; front?: string; load?: string; rack?: boolean; roofLamps?: boolean;
  lightbar?: boolean; fog?: boolean; snorkel?: boolean; spare?: boolean; ladder?: boolean; flaps?: boolean;
  cans?: boolean; antenna?: boolean; flag?: string; armor?: boolean; engine?: string; susp?: string;
  lights?: string; num?: number; spring?: number; damping?: number; preload?: number; [key: string]: unknown;
};
export type VehicleWheel = { node: THREE.Group; steer: THREE.Group; spin: THREE.Group; x: number; y: number; z: number; front: boolean; dir: number; air?: boolean; comp?: number; norm?: number; c?: number };
export type VehicleRig = {
  root: THREE.Group; chassis: THREE.Group; body: THREE.Group; wheels: VehicleWheel[]; wr: number;
  spec: Record<string, any>; cfg: VehicleConfig; engine: Record<string, any>; susp: Record<string, any>;
  world: THREE.Object3D[]; setLights: (level: number, brake?: number) => void; setSpots: (on: boolean) => void;
  update: (dt: number, t: number, env: KitEnv) => void; exhaust: THREE.Vector3;
};
export type KitOption = { k: string; l: string; t: 'seg'|'swatch'|'toggle'|'range'|'seed'; v?: Array<string|number>; sw?: number[]; min?: number; max?: number; step?: number; d?: unknown };
export type CatalogEntry = { id: string; cat: string; name: string; blurb: string; vehicle?: boolean; build?: (opts?: any) => THREE.Group; opts?: KitOption[] };
export type KitApi = {
  T: typeof THREE; TAU: number; V3:(x:number,y:number,z:number)=>THREE.Vector3;
  vehicle:(id:string,cfg?:VehicleConfig)=>VehicleRig; caravan:(opts?:any)=>THREE.Group;
  VEH:Record<string,any>;PAINTS:Record<string,number>;ENGINES:Record<string,any>;SUSP:Record<string,any>;VDEF:VehicleConfig;
  VOPTS:Array<{sec:string;items:KitOption[]}>;ENTRIES:CatalogEntry[];CATS:string[];
  lamps:Set<THREE.Material>;glowSprites:Set<THREE.Sprite>;shared:Record<string,any>;
  noise3:(x:number,y:number,z:number)=>number;seed:(n:number)=>void;rr:(a:number,b:number)=>number;rnd:()=>number;
  mat:(color:number|string,opts?:any)=>THREE.Material;glow:(...args:any[])=>THREE.Sprite;add:(...args:any[])=>THREE.Object3D;
  B:(w:number,h:number,d:number)=>THREE.BoxGeometry;CY:(...args:any[])=>THREE.CylinderGeometry;IC:(...args:any[])=>THREE.IcosahedronGeometry;
  ext:(...args:any[])=>THREE.ExtrudeGeometry;cbox:(...args:any[])=>THREE.ExtrudeGeometry;beam:(...args:any[])=>THREE.Mesh;rockGeo:(...args:any[])=>THREE.BufferGeometry;
  Cloth:(...args:any[])=>any;Whip:(...args:any[])=>any;bladeGeo:()=>THREE.BufferGeometry;
  pine:(opts?:any)=>THREE.Group;broadleaf:(opts?:any)=>THREE.Group;snag:(opts?:any)=>THREE.Group;palm:(opts?:any)=>THREE.Group;cactus:(opts?:any)=>THREE.Group;bush:(opts?:any)=>THREE.Group;rock:(opts?:any)=>THREE.Group;reeds:(opts?:any)=>THREE.Group;flowers:(opts?:any)=>THREE.Group;stump:(opts?:any)=>THREE.Group;
  aframe:(opts?:any)=>THREE.Group;logCabin:(opts?:any)=>THREE.Group;tower:(opts?:any)=>THREE.Group;lighthouse:(opts?:any)=>THREE.Group;pier:(opts?:any)=>THREE.Group;bridge:(opts?:any)=>THREE.Group;ferry:(opts?:any)=>THREE.Group;outpost:(opts?:any)=>THREE.Group;firepit:(opts?:any)=>THREE.Group;tent:(opts?:any)=>THREE.Group;chair:(opts?:any)=>THREE.Group;lantern:(opts?:any)=>THREE.Group;fairyLights:(opts?:any)=>THREE.Group;props:(opts?:any)=>THREE.Group;beacon:(opts?:any)=>THREE.Group;flock:(opts?:any)=>THREE.Group;deer:(opts?:any)=>THREE.Group;butterflies:(opts?:any)=>THREE.Group;
  Rain:(...args:any[])=>THREE.LineSegments;Snow:(...args:any[])=>THREE.Points;Lightning:(...args:any[])=>THREE.Group;Fireflies:(...args:any[])=>THREE.Group;Aurora:(...args:any[])=>THREE.Group;cloud:(opts?:any)=>THREE.Group;fogBank:(opts?:any)=>THREE.Group;Smoke:(...args:any[])=>THREE.Group;
  ridge:(opts?:any)=>THREE.Group;rangerGate:(opts?:any)=>THREE.Group;waterfall:(opts?:any)=>THREE.Group;owl:(opts?:any)=>THREE.Group;
};
