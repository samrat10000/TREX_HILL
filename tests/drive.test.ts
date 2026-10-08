import { describe, expect, it } from 'vitest';
import { KIT } from '../src/kit/core';
import { bakeVehicle,bakeProp,batchSprites } from '../src/kit/bake';
import { disposeObject } from '../src/kit/lifecycle';
import { advanceDrive, createDrive, recoverDrive, settleDrive, stepDrive, updateTrailer,updateTow } from '../src/game/drive';
import { terrainHeight, WORLD_RADIUS, worldPlacements, roadDistance } from '../src/game/terrain';
import { chunkPlan } from '../src/game/chunks';
import { regionAt } from '../src/game/worldData';
import { validateSettings } from '../src/kit/devState';

describe('driving regressions',()=>{
  it('uses low-range torque and limits low range to 25 km/h',()=>{const r=KIT.vehicle('ranger40',{}),high=createDrive(r,{up:true}),low=createDrive(r,{up:true});low.range='L';for(let i=0;i<120;i++){stepDrive(r,high,1/120,()=>0);stepDrive(r,low,1/120,()=>0)}expect(low.v).toBeGreaterThan(high.v);for(let i=0;i<2400;i++)stepDrive(r,low,1/120,()=>0);expect(low.v).toBeLessThanOrEqual(25/3.6);expect(low.gear).toBeGreaterThan(1);expect(low.rpm).toBeGreaterThan(850)});
  it('allows the square map corners beyond the former radial boundary',()=>{const r=KIT.vehicle('ranger40',{}),d=createDrive(r,{up:true});d.x=d.z=800;settleDrive(r,d);stepDrive(r,d,1/120);expect(d.x).toBeGreaterThan(799);expect(d.z).toBeGreaterThan(799);expect(d.edge).toBe(false);d.x=995;stepDrive(r,d,1/120);expect(d.edge).toBe(true)});
  it('uses continuous terrain across the former grid discontinuities',()=>{
    for(let x=-300;x<=300;x+=6.25)for(let z=-300;z<=300;z+=18.18){expect(Math.abs(terrainHeight(x-.00001,z)-terrainHeight(x+.00001,z))).toBeLessThan(.001);}
  });
  it.each(Object.keys(KIT.VEH))('keeps %s stable while accelerating, turning, and braking for a minute',(id)=>{
      const rig=KIT.vehicle(id,{}),keys={up:true,left:false,brake:false},d=createDrive(rig,keys);
      let maxClearance=0,maxVy=0,maxWheelError=0,finite=true;
      for(let frame=0;frame<3600;frame++){
        keys.left=frame>600&&frame<2200;keys.brake=frame>=3200;keys.up=frame<3200;
        advanceDrive(rig,d,1/60);maxClearance=Math.max(maxClearance,d.y-terrainHeight(d.x,d.z)-rig.wr);
        finite&&=[d.y,d.v,d.vy,d.pitch,d.roll].every(Number.isFinite);maxVy=Math.max(maxVy,Math.abs(d.vy));
        for(const w of rig.wheels)if(!w.air){const y=terrainHeight(d.x+w.x*Math.cos(d.yaw)+w.z*Math.sin(d.yaw),d.z-w.x*Math.sin(d.yaw)+w.z*Math.cos(d.yaw))+rig.wr;maxWheelError=Math.max(maxWheelError,Math.abs(w.y-y));}
      }
      expect(finite).toBe(true);expect(maxVy).toBeLessThan(15);expect(maxWheelError).toBeLessThan(.001);expect(maxClearance,id).toBeLessThan(3);expect(Math.hypot(d.x,d.z)).toBeLessThanOrEqual(WORLD_RADIUS+.001);expect(Math.abs(d.v)).toBeLessThan(.1);
  });
  it('has consistent simulation timing at 30, 60, and 120 fps',()=>{
    const positions=[30,60,120].map(fps=>{const rig=KIT.vehicle('ranger40',{}),d=createDrive(rig,{up:true});for(let i=0;i<fps*8;i++)advanceDrive(rig,d,1/fps);return d;});
    expect(Math.abs(positions[0].z-positions[1].z)).toBeLessThan(.5);expect(Math.abs(positions[1].z-positions[2].z)).toBeLessThan(.5);
  });
  it('keeps a 15-minute simulated drive stable across regions while towing',()=>{
    const rig=KIT.vehicle('ranger40',{}),keys={up:true,left:false,right:false,brake:false},d=createDrive(rig,keys),towRig=KIT.vehicle('trek110',{}),tow=createDrive(towRig,{});
    const route=[[0,0],[-280,80],[-440,220],[-540,340],[-280,80],[150,-230],[390,-310],[450,-410],[150,-230],[0,0]],resident=new Set<string>(),regions=new Set<string>();
    let waypoint=1,maxWheelError=0,maxVy=0,maxClearance=0,maxTongueError=0,maxResident=0,finite=true;
    try{
      for(let frame=0;frame<900*30;frame++){
        const [tx,tz]=route[waypoint],bearing=Math.atan2(-(tz-d.z),tx-d.x),delta=Math.atan2(Math.sin(bearing-d.yaw),Math.cos(bearing-d.yaw));
        if(Math.hypot(tx-d.x,tz-d.z)<18)waypoint=(waypoint+1)%route.length;
        keys.left=delta>.045;keys.right=delta<-.045;keys.brake=Math.abs(delta)>.7&&Math.abs(d.v)>6;
        d.range=frame%(180*30)<30*30?'L':'H';advanceDrive(rig,d,1/30);updateTow(rig,d,towRig,tow,1/30);
        finite&&=[d.x,d.z,d.y,d.v,d.vy,d.pitch,d.roll,tow.x,tow.z,tow.y].every(Number.isFinite);
        maxVy=Math.max(maxVy,Math.abs(d.vy));maxClearance=Math.max(maxClearance,d.y-terrainHeight(d.x,d.z)-rig.wr);
        const hx=d.x-Math.cos(d.yaw)*(rig.spec.L/2+.5),hz=d.z+Math.sin(d.yaw)*(rig.spec.L/2+.5);
        maxTongueError=Math.max(maxTongueError,Math.abs(Math.hypot(hx-tow.x,hz-tow.z)-(towRig.spec.L/2+.8)));
        for(const w of rig.wheels)if(!w.air){const ground=terrainHeight(d.x+w.x*Math.cos(d.yaw)+w.z*Math.sin(d.yaw),d.z-w.x*Math.sin(d.yaw)+w.z*Math.cos(d.yaw))+rig.wr;maxWheelError=Math.max(maxWheelError,Math.abs(w.y-ground));}
        if(Math.abs(d.roll)<.35&&Math.abs(d.pitch)<.45&&rig.wheels.every(w=>!w.air)){d.safeX=d.x;d.safeZ=d.z;d.safeYaw=d.yaw;}
        if(frame%30===0){regions.add(regionAt(d.x,d.z).id);const plan=chunkPlan(d.x,d.z,resident);plan.remove.forEach(k=>resident.delete(k));plan.add.forEach(k=>resident.add(k));maxResident=Math.max(maxResident,resident.size);}
      }
      expect(finite).toBe(true);expect(d.distance).toBeGreaterThan(1500);expect(regions.size).toBeGreaterThanOrEqual(3);
      expect(maxVy).toBeLessThan(15);expect(maxClearance).toBeLessThan(3);expect(maxWheelError).toBeLessThan(.001);expect(maxTongueError).toBeLessThan(.001);expect(maxResident).toBeLessThanOrEqual(81);
      recoverDrive(rig,d);expect(d.x).toBe(d.safeX);expect(d.z).toBe(d.safeZ);expect(d.vy).toBe(0);
    }finally{disposeObject(rig.root);disposeObject(towRig.root);}
  },60000);
  it('changes preload ride height and damping response on flat ground',()=>{
    const height=()=>0, low=KIT.vehicle('ranger40',{preload:.8}),high=KIT.vehicle('ranger40',{preload:1.3});
    const states=[low,high].map(r=>{const d=createDrive(r,{});d.x=0;d.z=0;d.y=r.wr;d.pitch=d.roll=0;r.wheels.forEach(w=>w.c=0);for(let i=0;i<1200;i++)stepDrive(r,d,1/120,height);return d;});
    expect(states[1].y).toBeGreaterThan(states[0].y+.015);
    const amplitudes=[.7,2].map(damping=>{const r=KIT.vehicle('ranger40',{damping}),d=createDrive(r,{});d.x=d.z=d.pitch=d.roll=0;d.y=r.wr+.15;r.wheels.forEach(w=>w.c=-.15);let error=0;for(let i=0;i<240;i++){stepDrive(r,d,1/120,height);if(i>120)error+=Math.abs(d.y-r.wr)}return error;});
    expect(amplitudes[1]).toBeLessThan(amplitudes[0]);
  });
  it('refreshes wheelbase/inertia on vehicle changes and resets recovery velocity',()=>{
    const r=KIT.vehicle('ranger40',{}),d=createDrive(r,{up:true});advanceDrive(r,d,1);const bus=KIT.vehicle('bus',{}),next=createDrive(bus,{},d);
    expect(next.wb).toBeGreaterThan(d.wb*2);expect(next.Ip).toBeGreaterThan(d.Ip);next.vy=10;next.roll=.5;recoverDrive(bus,next);expect(next.vy).toBe(0);expect(next.x).toBe(next.safeX);
  });
  it('retains articulated pole meshes after baking',()=>{
    const r=KIT.vehicle('ranger40',{flag:'flag'}) as any;
    const count=()=>{let n=0;r.whips.forEach((w:any)=>w.root.traverse((o:any)=>{if(o.isMesh)n++}));return n};
    const before=count();bakeVehicle(r);expect(count()).toBe(before);expect(before).toBeGreaterThan(0);
  });
  it('keeps animated wildlife pivots attached after prop baking',()=>{
    const deer=KIT.deer({}),pivots:any[]=[];deer.traverse((o:any)=>{if(o.userData.bakePivot)pivots.push(o)});bakeProp(deer);deer.userData.update(1/60,12,{wind:1,night:0});
    expect(pivots.length).toBe(3);for(const pivot of pivots){expect(pivot.parent).not.toBeNull();expect(pivot.children.length).toBeGreaterThan(0);}disposeObject(deer);
  });
  it('batches camp sprites while retaining animation and glow cleanup',()=>{
    const before=KIT.glowSprites.size,camp=KIT.firepit({}),sync=batchSprites(bakeProp(camp));let batches=0;camp.traverse((o:any)=>{if(o.isInstancedMesh)batches++;});expect(batches).toBeGreaterThan(0);camp.userData.update(1/60,3,{wind:1,night:1});sync();disposeObject(camp);expect(KIT.glowSprites.size).toBe(before);
  });
  it('follows the previous trailer axle through turns and maintains tongue length',()=>{
    const r=KIT.vehicle('ranger40',{}),d=createDrive(r,{}),trailer=KIT.caravan({});d.x=d.z=d.yaw=0;settleDrive(r,d);updateTrailer(r,d,trailer,1/60);
    d.x=2;d.z=-6;d.yaw=Math.PI/2;updateTrailer(r,d,trailer,1/60);
    expect(Math.abs(trailer.userData.yaw)).toBeGreaterThan(.1);
    const hx=d.x-Math.cos(d.yaw)*(r.spec.L/2+.24),hz=d.z+Math.sin(d.yaw)*(r.spec.L/2+.24);expect(Math.hypot(hx-trailer.position.x,hz-trailer.position.z)).toBeCloseTo(3.62,5);
  });
  it('unregisters glow sprites when models are disposed',()=>{
    const before=KIT.glowSprites.size,object=KIT.lantern({});expect(KIT.glowSprites.size).toBeGreaterThan(before);disposeObject(object);expect(KIT.glowSprites.size).toBe(before);
  });
  it('places obstacles outside road clearances',()=>{
    const objects=worldPlacements();expect(objects.length).toBeGreaterThan(800);for(const p of objects)expect(roadDistance(p.x,p.z)).toBeGreaterThanOrEqual(p.kind==='bush'?5:7);
  });
  it('rejects invalid persisted settings and starts on the menu',()=>{
    const s=validateSettings({vehicle:'missing',biome:'missing',quality:'invalid' as any,ui:'drive',renderScale:Infinity,loadout:{engine:'invalid',preload:99}});
    expect(s.vehicle).toBe('ranger40');expect(s.biome).toBe('meadow');expect(s.quality).not.toBe('invalid');expect(s.ui).toBe('menu');expect(s.renderScale).toBe(1);expect(s.loadout.engine).toBeUndefined();expect(s.loadout.preload).toBe(1.4);
  });
});
