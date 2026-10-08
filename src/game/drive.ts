import * as THREE from 'three';
import type { VehicleRig } from '../kit/types';
import { SPAWN, terrainHeight,surfaceAt } from './terrain';

export type DriveKeys = Partial<Record<'up' | 'down' | 'left' | 'right' | 'brake', boolean>>;
export type DriveState = {
  enabled: boolean; keys: DriveKeys; x: number; z: number; y: number; yaw: number;
  v: number; vy: number; pitch: number; roll: number; vpitch: number; vroll: number;
  steer: number; long: number; lat: number; wb: number; Ip: number; Ir: number;
  safeX: number; safeZ: number; safeYaw: number; forceLight: number | null;
  accumulator: number; distance: number;
  range?: 'H' | 'L'; gear?: number; rpm?: number;
  towed?: boolean;
  edge?: boolean; surface?: string;
  castVehicle?: (x: number, z: number, y: number, yaw: number, v: number, dt: number, rig: VehicleRig) => boolean;
};
const clamp = THREE.MathUtils.clamp;
export function createDrive(rig: VehicleRig, keys: DriveKeys, previous?: DriveState): DriveState {
  const xs = rig.wheels.map(w => w.x), zs = rig.wheels.map(w => w.z);
  const d: DriveState = {
    enabled: false, keys, x: previous?.x ?? SPAWN.x, z: previous?.z ?? SPAWN.z, yaw: previous?.yaw ?? SPAWN.yaw,
    y: 0, v: 0, vy: 0, pitch: 0, roll: 0, vpitch: 0, vroll: 0, steer: 0, long: 0, lat: 0,
    wb: Math.max(...xs) - Math.min(...xs), Ip: Math.max(.5, xs.reduce((s, x) => s + x * x, 0) / xs.length),
    Ir: Math.max(.3, zs.reduce((s, z) => s + z * z, 0) / zs.length),
    safeX: previous?.safeX ?? SPAWN.x, safeZ: previous?.safeZ ?? SPAWN.z, safeYaw: previous?.safeYaw ?? SPAWN.yaw,
    forceLight: previous?.forceLight ?? null, accumulator: 0, distance: previous?.distance ?? 0,
    range: previous?.range??'H',gear:1,rpm:850,
  };
  settleDrive(rig, d);
  return d;
}

export function suspension(rig: VehicleRig) {
  const n = rig.wheels.length, cfg = rig.cfg;
  const stiffness = rig.susp.k * Number(cfg.spring ?? 1);
  return {
    // Keep total vertical response consistent between four- and six-wheel rigs.
    k: stiffness * 4 / n, c: rig.susp.c * Number(cfg.damping ?? 1) * 4 / n,
    travel: .2 * rig.susp.travel + Number(cfg.lift ?? 0) * .3,
    droop: .24 * rig.susp.travel + Number(cfg.lift ?? 0) * .3,
    preload: 9.8 / n * Number(cfg.preload ?? 1),
  };
}
function contact(rig: VehicleRig, d: DriveState, w: VehicleRig['wheels'][number]) {
  const cs = Math.cos(d.yaw), sn = Math.sin(d.yaw);
  return terrainHeight(d.x + w.x * cs + w.z * sn, d.z - w.x * sn + w.z * cs) + rig.wr;
}
export function settleDrive(rig: VehicleRig, d: DriveState) {
  const contacts = rig.wheels.map(w => contact(rig, d, w));
  const mean = contacts.reduce((a, b) => a + b, 0) / contacts.length;
  const sx = rig.wheels.reduce((a, w) => a + w.x, 0) / rig.wheels.length;
  const sz = rig.wheels.reduce((a, w) => a + w.z, 0) / rig.wheels.length;
  const px = rig.wheels.reduce((a, w, i) => a + (w.x - sx) * (contacts[i] - mean), 0) / Math.max(.01, rig.wheels.reduce((a, w) => a + (w.x - sx) ** 2, 0));
  const pz = rig.wheels.reduce((a, w, i) => a + (w.z - sz) * (contacts[i] - mean), 0) / Math.max(.01, rig.wheels.reduce((a, w) => a + (w.z - sz) ** 2, 0));
  const su = suspension(rig);
  d.pitch = clamp(Math.atan(px), -.55, .55); d.roll = clamp(-Math.atan(pz), -.5, .5);
  d.y = mean - sx * Math.sin(d.pitch) + sz * Math.sin(d.roll) + (su.preload - 9.8 / contacts.length) / su.k;
  d.v = d.vy = d.vpitch = d.vroll = d.steer = d.long = d.lat = d.accumulator = 0;
  rig.wheels.forEach((w, i) => {
    const mount = d.y + w.x * Math.sin(d.pitch) - w.z * Math.sin(d.roll);
    w.c = w.comp = contacts[i] - mount; w.y = contacts[i]; w.air = false;
  });
}
export function recoverDrive(rig: VehicleRig, d: DriveState) {
  d.x = d.safeX; d.z = d.safeZ; d.yaw = d.safeYaw; settleDrive(rig, d);
}

export function stepDrive(rig: VehicleRig, d: DriveState, dt: number, height = terrainHeight) {
  const keys = d.keys, n = rig.wheels.length, su = suspension(rig), engine = rig.engine;
  const throttle = Number(!!keys.up) - Number(!!keys.down), steerInput = Number(!!keys.left) - Number(!!keys.right);
  const grounded = rig.wheels.filter(w => !w.air).length / n;
  const low=d.range==='L',top=low?25/3.6:engine.top;
  d.surface=surfaceAt(d.x,d.z);const wading=d.surface==='water';
  const steeringLimit = Math.min(.58, Math.atan(5.5 * d.wb / Math.max(6, d.v * d.v)));
  d.steer += (steerInput * steeringLimit - d.steer) * (1 - Math.exp(-dt * 7));
  let acceleration = 0;
  if (throttle > 0) acceleration = d.v < -.5 ? 12 : engine.acc * (low?2.6:1) * Math.max(0, 1 - d.v / top);
  if (throttle < 0) acceleration = d.v > .5 ? -12 : -engine.acc * .5 * Math.max(0, 1 + d.v / 8);
  acceleration *= grounded;
  if(wading)acceleration-=d.v*.7;
  acceleration -= Math.sin(d.pitch) * 9.8 / (engine.climb || 1) + d.v * .07;
  if (Math.abs(d.v) > .02) acceleration -= Math.sign(d.v) * (keys.brake ? 18 * grounded : .3);
  const v0 = d.v;
  d.v += acceleration * dt;
  if ((keys.brake || throttle === 0) && v0 * d.v < 0) d.v = 0;
  if (Math.abs(d.v) < .035 && (keys.brake || throttle === 0)) d.v = 0;
  // A tow's hitch constrains its horizontal pose; suspension still integrates vertically.
  d.v = d.towed ? 0 : clamp(d.v, -8, top);
  const speed=Math.abs(d.v),ratio=speed/top,previous=d.gear??1;
  const thresholds=[0,.18,.4,.66,1];let gear=previous;
  if(gear<4&&ratio>thresholds[gear]+.025)gear++;
  if(gear>1&&ratio<thresholds[gear-1]-.025)gear--;
  d.gear=gear;const within=clamp((ratio-thresholds[gear-1])/(thresholds[gear]-thresholds[gear-1]),0,1);
  d.rpm=850+within*3900+Math.abs(throttle)*350;
  const yawRate = d.v * Math.tan(d.steer) / d.wb * grounded;
  const nextYaw = d.yaw + yawRate * dt;
  if (d.castVehicle?.(d.x, d.z, d.y, nextYaw, d.v, dt, rig)) d.v = 0;
  else { d.yaw = nextYaw; d.x += Math.cos(d.yaw) * d.v * dt; d.z -= Math.sin(d.yaw) * d.v * dt; }
  // The square map stays open at its corners. Slow and steer inward near its edge.
  d.edge=Math.max(Math.abs(d.x),Math.abs(d.z))>975;
  if(d.edge){const inward=Math.atan2(d.z,-d.x),delta=Math.atan2(Math.sin(inward-d.yaw),Math.cos(inward-d.yaw));d.yaw+=delta*(1-Math.exp(-dt*.8));const outward=d.x*Math.cos(d.yaw)-d.z*Math.sin(d.yaw)>0;if(outward)d.v*=Math.exp(-dt*Math.max(0,(Math.max(Math.abs(d.x),Math.abs(d.z))-975)/8));}
  d.distance += Math.abs(d.v) * dt;
  // Collision impulses should not throw the suspension body.
  d.long += (clamp((d.v - v0) / dt, -18, 12) - d.long) * (1 - Math.exp(-dt * 8));
  d.lat = d.v * yawRate;
  const cs = Math.cos(d.yaw), sn = Math.sin(d.yaw), sp = Math.sin(d.pitch), sr = Math.sin(d.roll);
  let force = 0, pitchTorque = 0, rollTorque = 0;
  for (const w of rig.wheels) {
    const wx = d.x + w.x * cs + w.z * sn, wz = d.z - w.x * sn + w.z * cs;
    const ground = height(wx, wz) + rig.wr, mount = d.y + w.x * sp - w.z * sr;
    const comp = ground - mount;
    const compressionSpeed = clamp((comp - (w.c ?? comp)) / dt, -5, 5);
    let f = 0;
    w.air = comp < -su.droop;
    if (!w.air) {
      f = su.preload + su.k * comp + su.c * compressionSpeed;
      if (comp > su.travel) f += (comp - su.travel) * su.k * 3;
      f = clamp(f, 0, 9.8 * 4 / n);
    }
    w.y = w.air ? mount - su.droop : ground;
    w.c = comp; w.comp = comp; w.norm = clamp((comp + su.droop) / (su.droop + su.travel), 0, 1);
    force += f; pitchTorque += f * w.x; rollTorque -= f * w.z;
  }
  d.vy += (force - 9.8) * dt;
  d.vpitch += (pitchTorque / d.Ip + d.long * .08 - d.vpitch * 4.5) * dt;
  d.vroll += (rollTorque / d.Ir + d.lat * .08 - d.vroll * 4.5) * dt;
  d.y += d.vy * dt;
  d.pitch = clamp(d.pitch + d.vpitch * dt, -.65, .65); d.roll = clamp(d.roll + d.vroll * dt, -.55, .55);
  if (Math.abs(d.pitch) >= .65) d.vpitch = 0;
  if (Math.abs(d.roll) >= .55) d.vroll = 0;
  // Resolve hard bottom-out geometrically, with no spring impulse or energy injection.
  let floor = -Infinity;
  for (const w of rig.wheels) {
    const ground = height(d.x + w.x * cs + w.z * sn, d.z - w.x * sn + w.z * cs) + rig.wr;
    floor = Math.max(floor, ground - w.x * Math.sin(d.pitch) + w.z * Math.sin(d.roll) - su.travel);
  }
  if (d.y < floor) { d.y = floor; d.vy = Math.max(0, d.vy); }
}

export function advanceDrive(rig: VehicleRig, d: DriveState, elapsed: number) {
  const step = 1 / 120;
  d.accumulator += Math.min(elapsed, .1);
  let steps = 0;
  while (d.accumulator >= step && steps++ < 12) { stepDrive(rig, d, step); d.accumulator -= step; }
}

export function updateTow(parent:VehicleRig,d:DriveState,rig:VehicleRig,tow:DriveState,dt:number){
 tow.towed=true;
 const hitchX=d.x-Math.cos(d.yaw)*(parent.spec.L/2+.5),hitchZ=d.z+Math.sin(d.yaw)*(parent.spec.L/2+.5),length=rig.spec.L/2+.8;
 if(!tow.enabled){tow.x=hitchX-Math.cos(d.yaw)*length;tow.z=hitchZ+Math.sin(d.yaw)*length;tow.yaw=d.yaw;settleDrive(rig,tow);tow.enabled=true;}
 const dx=hitchX-tow.x,dz=hitchZ-tow.z,dist=Math.hypot(dx,dz)||1;
 tow.x=hitchX-dx/dist*length;tow.z=hitchZ-dz/dist*length;tow.yaw=Math.atan2(-dz,dx);tow.v=0;advanceDrive(rig,tow,dt);
 rig.root.position.set(tow.x,0,tow.z);rig.root.rotation.y=tow.yaw;rig.chassis.position.y=tow.y;rig.chassis.rotation.set(tow.roll,0,tow.pitch);
 for(const w of rig.wheels){w.node.position.y=w.y;w.spin.rotation.z-=d.v/rig.wr*dt*w.dir;}
 rig.setLights(0);rig.setSpots(false);rig.update(dt,0,{wind:0,night:0,time:0});
}

export function updateTrailer(rig: VehicleRig, d: DriveState, trailer: THREE.Group, dt: number) {
  const hitchX = d.x - Math.cos(d.yaw) * (rig.spec.L / 2 + .24), hitchZ = d.z + Math.sin(d.yaw) * (rig.spec.L / 2 + .24);
  const previous = trailer.userData.axle as { x: number; z: number } | undefined;
  const axle = previous ?? { x: hitchX - Math.cos(d.yaw) * 3.62, z: hitchZ + Math.sin(d.yaw) * 3.62 };
  const dx = hitchX - axle.x, dz = hitchZ - axle.z, length = Math.hypot(dx, dz) || 1;
  const yaw = Math.atan2(-dz, dx), x = hitchX - dx / length * 3.62, z = hitchZ - dz / length * 3.62;
  trailer.userData.axle = { x, z }; trailer.userData.yaw = yaw;
  const wheels = trailer.userData.wheels || [], cs = Math.cos(yaw), sn = Math.sin(yaw);
  const heights = wheels.map((w: any) => terrainHeight(x + w.x * cs + w.z * sn, z - w.x * sn + w.z * cs));
  const ground = heights.reduce((a: number, b: number) => a + b, 0) / Math.max(1, heights.length);
  trailer.position.set(x, ground, z); trailer.rotation.set(0, yaw, 0);
  const roll = heights.length >= 2 ? -Math.atan2(heights[1] - heights[0], wheels[1].z - wheels[0].z) : 0;
  trailer.userData.body.rotation.set(roll, 0, Math.atan2(terrainHeight(hitchX, hitchZ) - ground, 3.62));
  wheels.forEach((w: any, i: number) => { w.node.position.y = heights[i] - ground + trailer.userData.r; w.spin.rotation.z -= d.v / trailer.userData.r * dt * w.dir; });
  trailer.updateMatrixWorld(true); trailer.userData.update?.();
}
