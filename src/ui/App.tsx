import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics, RigidBody, CuboidCollider, useRapier } from '@react-three/rapier';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useEffect, useMemo, useRef, useState } from 'react';
import { KIT } from '../kit/core';
import { BIOMES, TIMES, WEATHER, lerp, resolvePreset } from '../game/presets';
import { terrainHeight, World } from '../game/world';
import { DioramaScene } from '../game/diorama';
import { bakeVehicle } from '../kit/bake';
import { useGameStore } from '../state';
import './game.css';

THREE.ColorManagement.enabled = false;
const clamp=THREE.MathUtils.clamp;
const h3=(h:any)=>h instanceof THREE.Color?h.clone():new THREE.Color(h);

function SceneLights({ sim }: { sim: React.MutableRefObject<any> }) {
  const sun=useRef<THREE.DirectionalLight>(null), hemi=useRef<THREE.HemisphereLight>(null), fogTarget=useRef<THREE.Color>(new THREE.Color());
  const { scene }=useThree();
  sim.current.updateLights = (dt:number)=>{
    const p=sim.current.preset, rate=1-Math.exp(-dt*2.2);
    scene.background ||= new THREE.Color(); (scene.background as THREE.Color).lerp(p.top,rate);
    if(sun.current){sun.current.color.lerp(p.sun,rate);sun.current.intensity=lerp(sun.current.intensity,p.sunI*Math.PI,rate);const a=(p.el||24)*Math.PI/180;sun.current.position.set(Math.cos(a)*24,Math.max(2,Math.sin(a)*32),12);}
    if(hemi.current){hemi.current.color.lerp(p.hemi,rate);hemi.current.groundColor.lerp(p.ground,rate);hemi.current.intensity=lerp(hemi.current.intensity,p.hemiI*Math.PI,rate);}
    if(scene.fog){const fog=scene.fog as THREE.Fog;fog.color.lerp(p.fog,rate);fog.near=lerp(fog.near,p.fogNear,rate);fog.far=lerp(fog.far,p.fogFar,rate);}
  };
  return <><hemisphereLight ref={hemi} args={[0xffffff,0x53604b,Math.PI*.7]} /><directionalLight ref={sun} position={[10,18,5]} intensity={Math.PI} castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-48} shadow-camera-right={48} shadow-camera-top={48} shadow-camera-bottom={-48} /></>;
}

function WeatherFX({ sim }: { sim: React.MutableRefObject<any> }) {
  const rain=useMemo(()=>KIT.Rain(1700,48),[]), snow=useMemo(()=>KIT.Snow(1500,48),[]), bolt=useMemo(()=>KIT.Lightning(),[]);
  const flash=useRef<THREE.DirectionalLight>(null), nextBolt=useRef(3);
  sim.current.weatherObjects=new Set([rain,snow,bolt]);
  sim.current.updateWeather = (dt:number)=>{
    const p=sim.current.preset, at=sim.current.focus;
    nextBolt.current-=dt;
    if(p.bolt&&nextBolt.current<0){const strike=new THREE.Vector3(at.x+(Math.random()-.5)*75,0,at.z-48-Math.random()*48);bolt.userData.strike?.(strike);const distance=at.distanceTo(strike);sim.current.triggerThunder?.(distance/120);nextBolt.current=3+Math.random()*6;}
    if(flash.current)flash.current.intensity=lerp(flash.current.intensity,(bolt.userData.flash||0)*5*Math.PI,1-Math.exp(-dt*14));
  };
  return <>
    <primitive object={rain} /><primitive object={snow} /><primitive object={bolt} />
    <directionalLight ref={flash} color={0xc8d8ff} position={[-18,40,-12]} intensity={0} />
  </>;
}

function GameLoop({ active, sim, cameraMode }: { active:any; sim:React.MutableRefObject<any>; cameraMode:React.MutableRefObject<string> }) {
  const { camera, scene, gl }=useThree();
  useFrame((_, rawDt)=>{
    if(!sim.current.infoTracking){gl.info.autoReset=false;gl.info.reset();sim.current.infoTracking=true;}
    const frameCalls=gl.info.render.calls,frameTriangles=gl.info.render.triangles;gl.info.reset();
    const dt=Math.min(rawDt,1/30), t=sim.current.time+=dt;
    const state=useGameStore.getState();const sig=`${state.time}|${state.weather}|${state.biome}`;
    if(sim.current.presetKey!==sig){sim.current.presetKey=sig;sim.current.target=resolvePreset(state)}
    const target:any=sim.current.target;
    for(const k of ['top','horizon','fog','ground','sun','hemi','groundBiome']) sim.current.preset[k].lerp(target[k],1-Math.exp(-dt*2.2));
    for(const k of ['night','wind','rain','snow','sunI','hemiI','fogNear','fogFar','wet'])sim.current.preset[k]=lerp(sim.current.preset[k],target[k],1-Math.exp(-dt*2.2));
    sim.current.preset.bolt=useGameStore.getState().weather==='storm'?1:0;
    sim.current.updateWorld?.(dt);
    sim.current.updateLights?.(dt);
    sim.current.updateWeather?.(dt);
    sim.current.updateBloom?.(sim.current.preset.night);
    const night=sim.current.preset.night;
    KIT.lamps.forEach((m:any)=>{m.emissiveIntensity=(m.userData.base??1)*(.03+.97*night)});
    KIT.glowSprites.forEach((s:any)=>{s.material.opacity=(s.userData.base??1)*night});
    if(sim.current.audio){
      const a=sim.current.audio, tNow=a.currentTime, master=sim.current.soundOn?1:0, p=sim.current.preset;
      sim.current.rainGain.gain.setTargetAtTime(master*p.rain*.18,tNow,.24);
      sim.current.windGain.gain.setTargetAtTime(master*(.006+p.wind*.018),tNow,.42);
      const d=sim.current.drive, activeDrive=d?.enabled&&sim.current.rig;
      sim.current.engineGain.gain.setTargetAtTime(master*(activeDrive?.025+(d?.keys.up?.04:0):0),tNow,.12);
      if(activeDrive){const e=sim.current.rig.engine;sim.current.engineFilter.frequency.setTargetAtTime(180+Math.abs(d.v)*80,tNow,.16);sim.current.osc.frequency.setTargetAtTime(42+Math.abs(d.v)*23+(d.keys.up?25:0),tNow,.08)}
      sim.current.fireTimer-=dt;if(sim.current.soundOn&&sim.current.fireTimer<=0){sim.current.fireTimer=1.4+Math.random()*3;const s=a.createBufferSource(),g=a.createGain(),f=a.createBiquadFilter();s.buffer=sim.current.noise;f.type='highpass';f.frequency.value=1700;g.gain.setValueAtTime(.012,tNow);g.gain.exponentialRampToValueAtTime(.0001,tNow+.06);s.connect(f).connect(g).connect(a.destination);s.start();s.stop(tNow+.07)}
      sim.current.birdTimer-=dt;if(sim.current.soundOn&&night<.25&&sim.current.birdTimer<=0){sim.current.birdTimer=8+Math.random()*13;const o=a.createOscillator(),g=a.createGain(),when=tNow+.1+Math.random()*1.5;o.type='sine';o.frequency.setValueAtTime(2200+Math.random()*1100,when);o.frequency.exponentialRampToValueAtTime(3300,when+.08);o.frequency.exponentialRampToValueAtTime(1900,when+.2);g.gain.setValueAtTime(.0001,when);g.gain.exponentialRampToValueAtTime(.018,when+.025);g.gain.exponentialRampToValueAtTime(.0001,when+.24);o.connect(g).connect(a.destination);o.start(when);o.stop(when+.25)}
    }
    const d=sim.current.drive, rig=sim.current.rig;
    if(active?.userData?.rig){if(!(d?.enabled&&active===rig.root))active.userData.rig.update(dt,t,sim.current.preset)}
    else active?.userData?.update?.(dt,t,sim.current.preset);
    if( d && rig && d.enabled ){
      sim.current.cameraUnder=false;
      for(let i=0;i<4;i++)stepDrive(rig,d,dt/4);
      rig.root.position.set(d.x,0,d.z);rig.root.rotation.y=d.yaw;
      rig.chassis.position.y=d.y;rig.chassis.rotation.set(d.roll,0,d.pitch);
      for(const w of rig.wheels){w.node.position.y=w.y;w.spin.rotation.z-=d.v/rig.wr*dt*w.dir;if(w.front)w.steer.rotation.y=d.steer;}
      rig.update(dt,t,sim.current.preset);
      if(sim.current.trailer)updateTrailer(rig,d,sim.current.trailer,dt);
      const wx=useGameStore.getState().weather,autoLight=sim.current.preset.night>.38||wx==='storm'||wx==='mist';
      const braking=d.keys.brake||(d.keys.down&&d.v>.5);rig.setLights(d.forceLight??(autoLight?1:0),braking?1:0);rig.setSpots(true);
      sim.current.focus.set(d.x,d.y,d.z);
      if(cameraMode.current==='chase'){
        const back=new THREE.Vector3(-Math.cos(d.yaw),0,Math.sin(d.yaw)).multiplyScalar(7.5+rig.spec.L*.4), desired=sim.current.focus.clone().add(back).add(new THREE.Vector3(0,3.1,0));
        desired.y=Math.max(desired.y,terrainHeight(desired.x,desired.z)+1.2);camera.position.lerp(desired,1-Math.exp(-dt*3.2));camera.lookAt(sim.current.focus.clone().add(new THREE.Vector3(0,1,0)));
      }else{const hx=d.x+Math.cos(d.yaw)*.5,hz=d.z-Math.sin(d.yaw)*.5;camera.position.set(hx,Math.max(d.y+1.5,terrainHeight(hx,hz)+1.2),hz);camera.lookAt(d.x+Math.cos(d.yaw)*12,d.y+1.3,d.z-Math.sin(d.yaw)*12)}
      sim.current.speed=Math.abs(d.v);
      if(Math.abs(d.roll)<.42&&Math.abs(d.pitch)<.52&&rig.wheels.some((w:any)=>!w.air)){d.safeX=d.x;d.safeZ=d.z;d.safeYaw=d.yaw;}
      if(sim.current.osc&&sim.current.audio){const hz=65+Math.abs(d.v)*21+(d.keys.up?75:0);sim.current.osc.frequency.setTargetAtTime(hz,sim.current.audio.currentTime,.08);}
    } else if(active) {
      if(sim.current.diorama){sim.current.focus.set(0,0,0);if(sim.current.dioramaObject)sim.current.dioramaObject.rotation.y+=sim.current.turn?dt*.14:0;}
      else active.rotation.y += sim.current.turn?dt*.14:0;
      const parkedRig=active.userData?.rig;if(sim.current.trailer&&parkedRig&&!sim.current.diorama){sim.current.trailer.position.set(-parkedRig.spec.L/2-3.9,0,0);sim.current.trailer.rotation.set(0,0,0);sim.current.trailer.updateMatrixWorld(true);sim.current.trailer.userData.update?.()}
      if(sim.current.wireObject){sim.current.wireObject.position.copy(active.position);sim.current.wireObject.rotation.copy(active.rotation);sim.current.wireObject.scale.copy(active.scale);}
      const focus=sim.current.diorama?sim.current.focus:sim.current.focus.set(0,sim.current.modelY||0,0);const angle=sim.current.viewAngle;
      const elev=sim.current.viewElevation,distance=sim.current.diorama?52:sim.current.distance;
      const desired=new THREE.Vector3(Math.sin(angle)*distance,distance*elev,Math.cos(angle)*distance).add(focus);
      if(elev>-.4)desired.y=Math.max(desired.y,terrainHeight(desired.x,desired.z)+1.2);
      sim.current.cameraUnder=elev<-.4;camera.position.lerp(desired,1-Math.exp(-dt*2.4));camera.lookAt(focus);
    }
    const sp=document.getElementById('speed-value');if(sp)sp.textContent=String(Math.round(sim.current.speed*3.6));
    sim.current.perfElapsed=(sim.current.perfElapsed||0)+rawDt;sim.current.perfFrames=(sim.current.perfFrames||0)+1;
    if(import.meta.env.DEV){sim.current.lastCalls=frameCalls;sim.current.lastTriangles=frameTriangles;if(sim.current.perfElapsed>=.5){const fps=Math.round(sim.current.perfFrames/sim.current.perfElapsed),node=document.getElementById('perf-readout');if(node)node.textContent=`${fps} fps  ·  ${sim.current.lastCalls} calls  ·  ${sim.current.lastTriangles.toLocaleString()} tris`;sim.current.perfElapsed=0;sim.current.perfFrames=0;}}
    scene.traverse(o=>{if(o===active||o===rig?.root||o===sim.current.trailer)return;if(o.userData?.rig){o.userData.rig.update(dt,t,sim.current.preset);o.userData.rig.setLights(night);o.userData.rig.setSpots(true)}else if(o.userData?.update)o.userData.update(dt,t,sim.current.preset,sim.current.weatherObjects?.has(o)?sim.current.focus:undefined)});
  });
  return null;
}

function stepDrive(r:any,d:any,dt:number){
  const E=r.engine,SU=r.susp,k=d.keys,g=9.8,n=r.wheels.length,thr=(+!!k.up)-(+!!k.down),br=+!!k.brake,st=(+!!k.left)-(+!!k.right);
  d.steer+=((st*.58*(1-Math.min(.55,Math.abs(d.v)/32)))-d.steer)*Math.min(1,dt*5);
  let a=0;if(thr>0)a=d.v<-.5?14:E.acc*Math.max(0,1-d.v/E.top);else if(thr<0)a=d.v>.5?-15:-E.acc*.55*Math.max(0,1+d.v/8);
  a+=-Math.sin(d.pitch)*g*.8/(E.climb||1)-d.v*.06-(Math.abs(d.v)>.05?Math.sign(d.v)*.35:0);if(br)a-=Math.sign(d.v)*17;
  const v0=d.v;d.v+=a*dt;if((br||thr===0)&&Math.abs(d.v)<.06)d.v=0;
  const yr=d.v*Math.tan(d.steer)/d.wb;d.yaw+=yr*dt;
  const nx=d.x+Math.cos(d.yaw)*d.v*dt,nz=d.z-Math.sin(d.yaw)*d.v*dt;
  if(d.castVehicle?.(d.x,d.z,d.y,d.yaw,d.v,dt,r)){d.v=0}else{d.x=nx;d.z=nz}
  const rr=Math.hypot(d.x,d.z);if(rr>122){d.x*=120/rr;d.z*=120/rr;d.v*=.5}
  d.long=(d.v-v0)/Math.max(dt,.0001);d.lat=d.v*yr;
  const trav=.2*SU.travel+r.cfg.lift*.3,droop=.24*SU.travel+r.cfg.lift*.3,cs=Math.cos(d.yaw),sn=Math.sin(d.yaw),sp=Math.sin(d.pitch),sr=Math.sin(d.roll);let F=0,Mp=0,Mr=0;
  for(const w of r.wheels){const wx=d.x+w.x*cs+w.z*sn,wz=d.z-w.x*sn+w.z*cs,gc=terrainHeight(wx,wz)+r.wr,my=d.y+w.x*sp-w.z*sr;let comp=gc-my,f=0;
    if(comp<-droop){w.air=true;w.y=my-droop;comp=-droop}else{w.air=false;w.y=gc;const cv=(comp-w.c)/Math.max(dt,.0001);f=g/n+SU.k*comp+SU.c*cv;if(comp>trav)f+=(comp-trav)*SU.k*10+Math.max(0,cv)*SU.c*3;f=Math.max(0,f)}
    w.c=comp;w.comp=comp;w.norm=(comp+droop)/(droop+trav);F+=f;Mp+=f*w.x;Mr-=f*w.z;
  }
  d.vy+=(F-g)*dt;d.vpitch+=(Mp/d.Ip+d.long*.4-d.vpitch*.8)*dt;d.vroll+=(Mr/d.Ir+d.lat*.5-d.vroll*.8)*dt;
  d.y+=d.vy*dt;d.pitch=clamp(d.pitch+d.vpitch*dt,-.7,.7);d.roll=clamp(d.roll+d.vroll*dt,-.6,.6);
}

function updateTrailer(rig:any,d:any,trailer:THREE.Group,dt:number){
  const hitchX=d.x-Math.cos(d.yaw)*(rig.spec.L/2+.24),hitchZ=d.z+Math.sin(d.yaw)*(rig.spec.L/2+.24);
  let yaw=trailer.userData.yaw??d.yaw,forward=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
  let x=hitchX-forward.x*3.62,z=hitchZ-forward.z*3.62;
  const angle=Math.atan2(-(hitchZ-z),hitchX-x),delta=Math.atan2(Math.sin(angle-yaw),Math.cos(angle-yaw));
  yaw+=delta*(1-Math.exp(-dt*4.5));trailer.userData.yaw=yaw;forward.set(Math.cos(yaw),0,-Math.sin(yaw));
  x=hitchX-forward.x*3.62;z=hitchZ-forward.z*3.62;
  const r=trailer.userData.r||.34,wheels=trailer.userData.wheels||[];
  const heights=wheels.map((w:any)=>terrainHeight(x+w.x*Math.cos(yaw)+w.z*Math.sin(yaw),z-w.x*Math.sin(yaw)+w.z*Math.cos(yaw)));
  const ground=heights.length?heights.reduce((a:number,b:number)=>a+b,0)/heights.length:terrainHeight(x,z);
  trailer.position.set(x,ground,z);trailer.rotation.set(0,yaw,0);
  if(trailer.userData.body&&heights.length>=2){const dz=(heights[1]-heights[0])/(Math.abs(wheels[1].z-wheels[0].z)||1);trailer.userData.body.rotation.x=Math.atan(dz)}
  for(const w of wheels)w.spin.rotation.z-=d.v/r*dt*w.dir;
  trailer.updateMatrixWorld(true);trailer.userData.update?.();
}

function CollisionProbe({sim}:{sim:React.MutableRefObject<any>}){
  const {world,rapier}=useRapier();
  sim.current.castVehicle=(x:number,z:number,y:number,yaw:number,v:number,dt:number,rig:any)=>{
    if(Math.abs(v)<.01)return false;
    const shape=new rapier.Cuboid(Math.max(.3,rig.spec.L*.4),.68,Math.max(.3,rig.spec.W*.43));
    const result=world.castShape({x,y:y+.78,z},{x:0,y:Math.sin(yaw/2),z:0,w:Math.cos(yaw/2)},{x:Math.cos(yaw)*v,y:0,z:-Math.sin(yaw)*v},shape,.06,dt,true);
    return !!result;
  };
  return null;
}

function NightBloom({sim}:{sim:React.MutableRefObject<any>}){
  const bloom=useRef<any>(null);
  sim.current.updateBloom=(night:number)=>{if(bloom.current){bloom.current.intensity=.32+.55*night;bloom.current.luminanceMaterial.threshold=.9-.32*night}};
  return <EffectComposer multisampling={0}><Bloom ref={bloom} intensity={.32} luminanceThreshold={.9} mipmapBlur luminanceSmoothing={.08} /></EffectComposer>;
}

function initialLoadout(s:any) { const v=(KIT.VEH as any)[s.vehicle];return {...KIT.VDEF,...(v?.def||{}),...s.loadout}; }

export function App(){
  const settings=useGameStore();
  const initialPreset=resolvePreset(settings);
  const cameraMode=useRef('chase'), sim=useRef<any>({time:0,turn:false,distance:Math.max(5,(KIT.VEH as any)[settings.vehicle]?.L*1.6||7),viewAngle:.75,viewElevation:.42,speed:0,focus:new THREE.Vector3(),preset:initialPreset});
  const keys=useRef<any>({}), [viewId,setViewId]=useState('ranger40'), [cameraSide,setCameraSide]=useState('iso'), [edge,setEdge]=useState(false), [turn,setTurn]=useState(false), [diorama,setDiorama]=useState(false), [soundOn,setSoundOn]=useState(false);
  const activeId=settings.ui==='viewer'?viewId:settings.vehicle;
  const entry:any=KIT.ENTRIES.find((e:any)=>e.id===activeId)||KIT.ENTRIES[0];
  const opts=initialLoadout(settings);
  const active:any=useMemo(()=>entry.vehicle?bakeVehicle(KIT.vehicle(entry.id,opts)):entry.build({...opts}),[entry.id,JSON.stringify(opts)]);
  const obj:any=entry.vehicle?active.root:active;
  const dioramaRoot=useRef<THREE.Group>(null);
  const edgeObject=useMemo(()=>{
    if(!edge||settings.ui!=='viewer')return null;
    const root=new THREE.Group(),inverse=new THREE.Matrix4(),lineMat=new THREE.LineBasicMaterial({color:0x20252b,transparent:true,opacity:.58});obj.updateMatrixWorld(true);inverse.copy(obj.matrixWorld).invert();
    obj.traverse((mesh:any)=>{if(!mesh.isMesh||!mesh.geometry)return;const geometry=new THREE.EdgesGeometry(mesh.geometry,28),relative=new THREE.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld);geometry.applyMatrix4(relative);root.add(new THREE.LineSegments(geometry,lineMat));});
    return root;
  },[obj,edge,settings.ui]);
  sim.current.wireObject=edgeObject;
  useEffect(()=>()=>{edgeObject?.traverse((o:any)=>{o.geometry?.dispose();o.material?.dispose()})},[edgeObject]);
  const drive=sim.current.drive;
  const changeMode=(ui:'drive'|'garage'|'viewer')=>{settings.set({ui});if(ui==='viewer')setViewId(settings.vehicle);};
  const driveRig=useMemo(()=>bakeVehicle(KIT.vehicle(settings.vehicle,initialLoadout(settings))),[settings.vehicle,JSON.stringify(settings.loadout)]);
  const trailerRig=useMemo(()=>settings.trailer?KIT.caravan({paint:0xe9e0ca}):null,[settings.trailer]);sim.current.trailer=trailerRig;
  useEffect(()=>{
    const onDown=(e:KeyboardEvent)=>{if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyR','KeyH','KeyC','Escape'].includes(e.code))e.preventDefault();
      if(e.code==='KeyR'&&sim.current.drive){const d=sim.current.drive;d.x=d.safeX;d.z=d.safeZ;d.y=terrainHeight(d.x,d.z)+sim.current.rig.wr;d.yaw=d.safeYaw;d.v=d.vy=d.pitch=d.roll=d.vpitch=d.vroll=0;sim.current.rig.root.rotation.set(0,d.yaw,0);return;}
      if(e.code==='KeyH'&&sim.current.drive){const d=sim.current.drive;d.forceLight=d.forceLight===null?0:d.forceLight===0?1:null;return;}
      if(e.code==='KeyC'&&sim.current.drive){cameraMode.current=cameraMode.current==='chase'?'hood':'chase';return;}
      if(e.code==='Escape'&&settings.ui==='drive'&&sim.current.drive){sim.current.drive.enabled=false;changeMode('garage');return;}
      const map:any={KeyW:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',Space:'brake'};if(map[e.code])keys.current[map[e.code]]=true;
    };
    const onUp=(e:KeyboardEvent)=>{const map:any={KeyW:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',Space:'brake'};if(map[e.code])keys.current[map[e.code]]=false;};
    window.addEventListener('keydown',onDown);window.addEventListener('keyup',onUp);return()=>{window.removeEventListener('keydown',onDown);window.removeEventListener('keyup',onUp)};
  },[settings.ui]);
  useEffect(()=>{sim.current.rig=driveRig;if(!sim.current.drive){const r=driveRig,d={enabled:false,keys:keys.current,x:34,z:0,yaw:Math.PI/2,v:0,vy:0,y:terrainHeight(34,0)+r.wr,pitch:0,vpitch:0,roll:0,vroll:0,steer:0,long:0,lat:0,forceLight:null,wb:Math.max(...r.wheels.map((w:any)=>w.x))-Math.min(...r.wheels.map((w:any)=>w.x)),Ip:4,Ir:2,safeX:34,safeZ:0,safeYaw:Math.PI/2};d.Ip=r.wheels.reduce((a:number,w:any)=>a+w.x*w.x,0)/r.wheels.length*1.25;d.Ir=r.wheels.reduce((a:number,w:any)=>a+w.z*w.z,0)/r.wheels.length*1.5;sim.current.drive=d;}},[driveRig]);
  useEffect(()=>{sim.current.turn=turn;},[turn]);
  useEffect(()=>{sim.current.diorama=diorama;if(diorama){sim.current.cameraUnder=false;sim.current.distance=52;}else sim.current.distance=Math.max(5,(KIT.VEH as any)[activeId]?.L*1.6||7);},[diorama,activeId]);
  useEffect(()=>{sim.current.viewAngle=cameraSide==='front'?Math.PI/2:cameraSide==='back'?-Math.PI/2:cameraSide==='left'?Math.PI:cameraSide==='right'?0:.75;sim.current.viewElevation=cameraSide==='top'?1.25:cameraSide==='under'?-1.1:.42;sim.current.distance=cameraSide==='top'||cameraSide==='under'?Math.max(7,(KIT.VEH as any)[activeId]?.L*2||8):Math.max(5,(KIT.VEH as any)[activeId]?.L*1.6||7);},[cameraSide,activeId]);
  useEffect(()=>{const R=sim.current.rig;if(R&&sim.current.drive?.enabled&&settings.ui!=='drive'){sim.current.drive.enabled=false}if(settings.ui!=='viewer')sim.current.cameraUnder=false;sim.current.drive={...sim.current.drive,enabled:settings.ui==='drive',keys:keys.current};},[settings.ui,driveRig]);
  const startDrive=()=>{const d=sim.current.drive;d.enabled=true;d.keys=keys.current;d.x=34;d.z=0;d.yaw=Math.PI/2;d.v=d.vy=d.pitch=d.roll=d.vpitch=d.vroll=0;d.y=terrainHeight(d.x,d.z)+sim.current.rig.wr;d.safeX=d.x;d.safeZ=d.z;d.safeYaw=d.yaw;};
  const toggleAudio=()=>{try{const Ctx=window.AudioContext||(window as any).webkitAudioContext;const audio=sim.current.audio||(sim.current.audio=new Ctx());audio.resume();if(!sim.current.osc){const n=audio.createBuffer(1,audio.sampleRate*2,audio.sampleRate),data=n.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;sim.current.noise=n;const noise=(filterType:string,frequency:number)=>{const src=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();src.buffer=n;src.loop=true;filter.type=filterType;filter.frequency.value=frequency;src.connect(filter).connect(gain).connect(audio.destination);src.start();return gain};sim.current.rainGain=noise('highpass',1200);sim.current.windGain=noise('lowpass',260);const o=audio.createOscillator(),gain=audio.createGain(),filter=audio.createBiquadFilter();o.type='sawtooth';filter.type='lowpass';filter.frequency.value=300;gain.gain.value=0;o.connect(filter).connect(gain).connect(audio.destination);o.start();sim.current.osc=o;sim.current.engineGain=gain;sim.current.engineFilter=filter;sim.current.fireTimer=1;sim.current.birdTimer=4;sim.current.triggerThunder=(delay:number)=>{if(!sim.current.soundOn)return;const s=audio.createBufferSource(),f=audio.createBiquadFilter(),g=audio.createGain(),at=audio.currentTime+delay;s.buffer=n;s.loop=true;f.type='lowpass';f.frequency.value=130;g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(.24,at+.16);g.gain.exponentialRampToValueAtTime(.0001,at+3.1);s.connect(f).connect(g).connect(audio.destination);s.start(at);s.stop(at+3.2)}}const next=!sim.current.soundOn;sim.current.soundOn=next;setSoundOn(next)}catch{}}
  const cameraButton=(v:string)=>{setCameraSide(v);};
  return <main className="game-shell">
    <Canvas shadows="percentage" camera={{position:[7,6,9],fov:47,near:.1,far:1100}} gl={{outputColorSpace:THREE.LinearSRGBColorSpace}}>
      <fog attach="fog" args={[0xf8c793,12,125]} />
      <SceneLights sim={sim} />
      <Physics gravity={[0,-9.8,0]} timeStep="vary">
        <CollisionProbe sim={sim} />
        <RigidBody type="fixed" colliders={false}><CuboidCollider args={[140,.6,140]} position={[0,-4.1,0]} /></RigidBody>
        <World params={sim} />
      </Physics>
      {settings.ui==='drive'?<><primitive object={driveRig.root} />{driveRig.world.map((o:any,i:number)=><primitive key={i} object={o} />)}</>:<>{!diorama&&<><primitive object={obj} />{entry.vehicle&&active.world.map((o:any,i:number)=><primitive key={i} object={o} />)}{edgeObject&&<primitive object={edgeObject} />}</>}{diorama&&<DioramaScene objectRef={(node:any)=>{dioramaRoot.current=node;sim.current.dioramaObject=node}} />}</>}
      {trailerRig&&<primitive object={trailerRig} />}
      <WeatherFX sim={sim} />
      <NightBloom sim={sim} />
      <GameLoop active={settings.ui==='drive'?driveRig.root:obj} sim={sim} cameraMode={cameraMode} />
    </Canvas>
    <header className="topbar"><div className="brand"><span className="brand-mark">✳</span><div><b>OVER THE HILL</b><small>A quiet road, wherever it goes</small></div></div><div className="top-actions"><button className={settings.ui==='drive'?'active':''} onClick={()=>{changeMode('drive');startDrive()}}>Drive</button><button className={settings.ui==='garage'?'active':''} onClick={()=>changeMode('garage')}>Garage</button><button className={settings.ui==='viewer'?'active':''} onClick={()=>changeMode('viewer')}>Kit viewer</button></div></header>
    <div className="world-controls">
      <label>DAYLIGHT<select value={settings.time} onChange={e=>settings.set({time:e.target.value})}>{Object.entries(TIMES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></label>
      <label>WEATHER<select value={settings.weather} onChange={e=>settings.set({weather:e.target.value})}>{Object.entries(WEATHER).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></label>
      <label>REGION<select value={settings.biome} onChange={e=>settings.set({biome:e.target.value})}>{Object.entries(BIOMES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></label>
    </div>
    {settings.ui==='drive'&&<><div className="drive-hud"><div className="speed"><strong id="speed-value">0</strong><span>KM/H</span></div><div className="help">WASD drive <i/> SPACE brake <i/> R recover <i/> H lights <i/> C camera</div><button className="sound" onClick={toggleAudio}>{soundOn?'Sound on':'Sound off'}</button></div><div className="mobile-pad"><button onTouchStart={()=>keys.current.left=true} onTouchEnd={()=>keys.current.left=false}>◀</button><button onTouchStart={()=>keys.current.up=true} onTouchEnd={()=>keys.current.up=false}>▲</button><button onTouchStart={()=>keys.current.down=true} onTouchEnd={()=>keys.current.down=false}>▼</button><button onTouchStart={()=>keys.current.right=true} onTouchEnd={()=>keys.current.right=false}>▶</button></div></>}
    {(settings.ui==='garage'||settings.ui==='viewer')&&<aside className="drawer">
        <div className="drawer-head"><div><small>{settings.ui==='garage'?'YOUR RIG':'KIT CATALOG'}</small><h1>{settings.ui==='garage'?(KIT.VEH as any)[settings.vehicle]?.name||settings.vehicle:entry.name}</h1></div><button className="quiet" onClick={()=>{sim.current.drive.enabled=false;changeMode('drive')}}>×</button></div>
      {settings.ui==='garage'?<>
        <label className="field-label">VEHICLE<select value={settings.vehicle} onChange={e=>{settings.set({vehicle:e.target.value,loadout:{}});setViewId(e.target.value)}}>{Object.entries(KIT.VEH).map(([id,v]:any)=><option key={id} value={id}>{v.name}</option>)}</select></label>
        <label className="tow-option"><input type="checkbox" checked={settings.trailer} onChange={e=>settings.set({trailer:e.target.checked})} /> Tow the caravan</label>
        <div className="option-scroll">{KIT.VOPTS.map((section:any)=><section className="option-section" key={section.sec}><h3>{section.sec}</h3>{section.items.map((option:any)=><Option key={option.k} option={option} value={opts[option.k]} onChange={(v:any)=>settings.setOption(option.k,v)} />)}</section>)}</div>
        <div className="drawer-footer"><button className="secondary" onClick={()=>settings.set({loadout:{}})}>Reset setup</button><button className="primary" onClick={()=>{changeMode('drive');startDrive()}}>Take the wheel</button></div>
      </>:<>
        <div className="catalog-tabs">{KIT.CATS.map((c:string)=><span key={c}>{c}</span>)}</div>
        <div className="catalog-list">{KIT.ENTRIES.map((e:any)=><button className={viewId===e.id?'selected':''} key={e.id} onClick={()=>setViewId(e.id)}><span>{e.name}</span><small>{e.cat}</small></button>)}</div>
        <div className="viewer-tools"><div>{['front','back','left','right','top','under','iso'].map(v=><button className={cameraSide===v?'chosen':''} onClick={()=>cameraButton(v)} key={v}>{v}</button>)}</div><label><input type="checkbox" checked={turn} onChange={e=>setTurn(e.target.checked)} /> Turntable</label><label><input type="checkbox" checked={edge} onChange={e=>setEdge(e.target.checked)} /> Edges</label><button className={diorama?'chosen':''} onClick={()=>setDiorama(v=>!v)}>{diorama?'Exit diorama':'Diorama'}</button></div>
        <div className="option-scroll">{entry.vehicle?KIT.VOPTS.map((section:any)=><section className="option-section" key={section.sec}><h3>{section.sec}</h3>{section.items.map((option:any)=><Option key={option.k} option={option} value={opts[option.k]} onChange={(v:any)=>settings.setOption(option.k,v)} />)}</section>):(entry.opts||[]).map((option:any)=><Option key={option.k} option={option} value={opts[option.k]} onChange={(v:any)=>settings.setOption(option.k,v)} />)}</div>
        <div className="drawer-footer"><button className="primary" onClick={()=>{if(entry.vehicle)settings.set({vehicle:entry.id});if(entry.id==='caravan')settings.set({trailer:true});changeMode('drive');startDrive()}}>Drive this rig</button></div>
      </>}
    </aside>}
    <footer className="bottom-note"><span className="weather-dot" /> No hurry. The road will wait.</footer>
    {import.meta.env.DEV&&<div id="perf-readout" className="perf-readout">measuring scene…</div>}
  </main>;
}

function Option({option,value,onChange}:any){
  const shown=value??option.d??(option.t==='toggle'?false:option.t==='range'?option.min:option.v?.[0]??option.sw?.[0]??0);
  const choices=option.t==='swatch'?(option.sw||Object.keys(KIT.PAINTS)):option.v||[];
  return <div className="option-row"><span>{option.l}</span>{option.t==='toggle'?<button className={'toggle '+(shown?'on':'')} onClick={()=>onChange(!shown)} aria-pressed={shown}>{shown?'On':'Off'}</button>:option.t==='range'?<div className="range"><input type="range" min={option.min} max={option.max} step={option.step||1} value={shown} onChange={e=>onChange(Number(e.target.value))}/><small>{shown}</small></div>:option.t==='seed'?<div className="range"><input type="number" min="1" max="99999" value={shown||1} onChange={e=>onChange(Number(e.target.value))}/></div>:<select value={shown} onChange={e=>onChange(option.t==='swatch'&&option.sw?Number(e.target.value):e.target.value)}>{choices.map((v:any)=><option key={String(v)} value={v}>{option.t==='swatch'&&!option.sw?String(v):typeof v==='number'?'#'+v.toString(16).padStart(6,'0'):String(v)}</option>)}</select>}</div>;
}
