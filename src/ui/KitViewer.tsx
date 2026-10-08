import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { KIT } from '../kit/core';
import { BIOMES, TIMES, WEATHER, lerp, resolvePreset } from '../game/presets';
import { World } from '../game/world';
import { LANDMARKS, SPAWN, terrainHeight } from '../game/terrain';
import { advanceDrive, createDrive, recoverDrive, settleDrive, updateTrailer } from '../game/drive';
import type { DriveKeys } from '../game/drive';
import { toggleAudio, updateAudio } from '../game/audio';
import { DioramaScene } from '../game/diorama';
import { bakeVehicle } from '../kit/bake';
import { disposeObject, updateObject, useKitObject } from '../kit/lifecycle';
import { QUALITY, useGameStore } from '../kit/devState';
import { OverlayPanel, StartScreen } from './Overlays';
import type { Overlay } from './Overlays';
import { WorldMap } from './Map';
import './kit-viewer.css';
import './shell.css';

THREE.ColorManagement.enabled = false;
const PhysicsLayer=lazy(()=>import('../game/PhysicsLayer'));
const NightBloom=lazy(()=>import('../game/NightBloom'));

class SceneBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state={failed:false};static getDerivedStateFromError(){return{failed:true}};
  render(){return this.state.failed?<div className="scene-fallback"><h2>The 3D scene could not start.</h2><p>Try another WebGL-capable browser or reload with Low graphics.</p><button onClick={()=>{useGameStore.getState().set({quality:'low'});window.location.reload()}}>Retry with Low graphics</button></div>:this.props.children;}
}

function SceneLights({sim}:{sim:React.MutableRefObject<any>}) {
  const sun=useRef<THREE.DirectionalLight>(null),hemi=useRef<THREE.HemisphereLight>(null);
  const shadowSize=useGameStore(s=>QUALITY[s.quality].shadows),{scene}=useThree();
  useEffect(()=>{if(sun.current?.shadow.map){sun.current.shadow.map.dispose();sun.current.shadow.map=null;}},[shadowSize]);
  sim.current.updateLights=(dt:number)=>{
    const p=sim.current.preset,rate=1-Math.exp(-dt*2.2),f=sim.current.focus;
    scene.background ||= new THREE.Color();(scene.background as THREE.Color).lerp(p.top,rate);
    if(sun.current){const a=p.el*Math.PI/180;sun.current.color.lerp(p.sun,rate);sun.current.intensity=lerp(sun.current.intensity,p.sunI*Math.PI,rate);sun.current.position.set(f.x+Math.cos(a)*70,f.y+Math.max(12,Math.sin(a)*85),f.z+35);sun.current.target.position.copy(f);sun.current.target.updateMatrixWorld();}
    if(hemi.current){hemi.current.color.lerp(p.hemi,rate);hemi.current.groundColor.lerp(p.ground,rate);hemi.current.intensity=lerp(hemi.current.intensity,p.hemiI*Math.PI,rate);}
    if(scene.fog){const fog=scene.fog as THREE.Fog;fog.color.lerp(p.fog,rate);fog.near=lerp(fog.near,p.fogNear,rate);fog.far=lerp(fog.far,p.fogFar*1.7,rate);}
  };
  return <><hemisphereLight ref={hemi} args={[0xffffff,0x53604b,Math.PI*.7]} /><directionalLight ref={sun} position={[10,18,5]} intensity={Math.PI} castShadow={shadowSize>0} shadow-mapSize={[shadowSize||512,shadowSize||512]} shadow-camera-left={-48} shadow-camera-right={48} shadow-camera-top={48} shadow-camera-bottom={-48} shadow-camera-near={1} shadow-camera-far={220} shadow-bias={-.0005} shadow-normalBias={.035} /></>;
}

function WeatherFX({sim}:{sim:React.MutableRefObject<any>}) {
  const fx=useKitObject(()=>({rain:KIT.Rain(1700,48),snow:KIT.Snow(1500,48),bolt:KIT.Lightning()}),'weather',v=>Object.values(v).forEach(disposeObject));
  const flash=useRef<THREE.DirectionalLight>(null),nextBolt=useRef(3);
  sim.current.updateWeather=(dt:number)=>{
    if(!fx)return;const p=sim.current.preset,at=sim.current.focus,t=sim.current.time;nextBolt.current-=dt;
    if(p.bolt&&nextBolt.current<0){const strike=new THREE.Vector3(at.x+(Math.random()-.5)*75,0,at.z-48-Math.random()*48);strike.y=terrainHeight(strike.x,strike.z);fx.bolt.userData.strike?.(strike);sim.current.triggerThunder?.(at.distanceTo(strike)/120);nextBolt.current=3+Math.random()*6;}
    fx.rain.userData.update(dt,t,p,at);fx.snow.userData.update(dt,t,p,at);fx.bolt.userData.update(dt,t,p);
    sim.current.lightningFlash=fx.bolt.userData.flash||0;
    if(flash.current)flash.current.intensity=lerp(flash.current.intensity,sim.current.lightningFlash*5*Math.PI,1-Math.exp(-dt*14));
  };
  return <>{fx&&<><primitive object={fx.rain} /><primitive object={fx.snow} /><primitive object={fx.bolt} /></>}<directionalLight ref={flash} color={0xc8d8ff} position={[-18,40,-12]} intensity={0} /></>;
}

function GameLoop({active,sim,cameraMode}:{active:any;sim:React.MutableRefObject<any>;cameraMode:React.MutableRefObject<string>}) {
  const {camera,gl}=useThree();
  const desired=useMemo(()=>new THREE.Vector3(),[]),aim=useMemo(()=>new THREE.Vector3(),[]);
  useFrame((_,rawDt)=>{
    if(!sim.current.infoTracking){gl.info.autoReset=false;sim.current.infoTracking=true;}
    const frameCalls=gl.info.render.calls,frameTriangles=gl.info.render.triangles;gl.info.reset();
    const s=useGameStore.getState(),dt=Math.min(rawDt,.1),t=sim.current.time+=dt;
    const sig=`${s.time}|${s.weather}|${s.biome}`;if(sim.current.presetKey!==sig){sim.current.presetKey=sig;sim.current.target=resolvePreset(s);}
    const target=sim.current.target,p=sim.current.preset,rate=1-Math.exp(-dt*2.2);
    for(const key of ['top','horizon','fog','ground','sun','hemi','groundBiome'])p[key].lerp(target[key],rate);
    for(const key of ['el','night','wind','rain','snow','sunI','hemiI','fogNear','fogFar','wet'])p[key]=lerp(p[key],target[key],rate);
    p.bolt=s.weather==='storm'?1:0;
    KIT.lamps.forEach((m:any)=>m.emissiveIntensity=(m.userData.base??1)*(.03+.97*p.night));
    KIT.glowSprites.forEach((sprite:any)=>sprite.material.opacity=(sprite.userData.base??1)*p.night);
    const d=sim.current.drive,rig=sim.current.rig;
    if(d&&rig&&s.ui==='drive') {
      sim.current.cameraUnder=false;d.castVehicle=sim.current.castVehicle;
      if(!sim.current.paused&&sim.current.collisionReady)advanceDrive(rig,d,rawDt);else d.accumulator=0;
      rig.root.position.set(d.x,0,d.z);rig.root.rotation.set(0,d.yaw,0);rig.chassis.position.y=d.y;rig.chassis.rotation.set(d.roll,0,d.pitch);
      for(const w of rig.wheels){w.node.position.y=w.y;if(!sim.current.paused)w.spin.rotation.z-=d.v/rig.wr*dt*w.dir;if(w.front)w.steer.rotation.y=d.steer;}
      rig.update(dt,t,p);rig.setLights(d.forceLight??(p.night>.38||s.weather==='storm'||s.weather==='mist'?1:0),d.keys.brake||d.keys.down&&d.v>.5?1:0);rig.setSpots(true);
      if(sim.current.trailer&&!sim.current.paused)updateTrailer(rig,d,sim.current.trailer,dt);
      sim.current.focus.set(d.x,d.y,d.z);sim.current.speed=Math.abs(d.v);
      if(Math.abs(d.roll)<.35&&Math.abs(d.pitch)<.45&&rig.wheels.every((w:any)=>!w.air)){d.safeX=d.x;d.safeZ=d.z;d.safeYaw=d.yaw;}
      if(cameraMode.current==='chase'){
        const distance=7.5+rig.spec.L*.4;desired.set(d.x-Math.cos(d.yaw)*distance,d.y+3.1,d.z+Math.sin(d.yaw)*distance);
        desired.y=Math.max(desired.y,terrainHeight(desired.x,desired.z)+1.2);camera.position.lerp(desired,1-Math.exp(-dt*3.2));aim.set(d.x,d.y+1,d.z);camera.lookAt(aim);
      }else{const forward=rig.spec.L/2-.2,x=d.x+Math.cos(d.yaw)*forward,z=d.z-Math.sin(d.yaw)*forward;camera.position.set(x,Math.max(d.y+rig.spec.top[2][1]+Number(rig.cfg.lift||0)+.25,terrainHeight(x,z)+1.2),z);aim.set(x+Math.cos(d.yaw)*12,camera.position.y-.15,z-Math.sin(d.yaw)*12);camera.lookAt(aim);}
      for(const poi of LANDMARKS)if(Math.hypot(d.x-poi.x,d.z-poi.z)<22&&!s.visited.includes(poi.id)){s.visit(poi.id);sim.current.discovery=poi.name;sim.current.discoveryUntil=t+4;}
    }else if(s.ui==='menu'&&rig){
      const x=d?.x??SPAWN.x,z=d?.z??SPAWN.z,y=d?.y??rig.wr;sim.current.focus.set(x,y,z);
      rig.root.position.set(x,0,z);rig.root.rotation.set(0,d?.yaw??SPAWN.yaw,0);rig.chassis.position.y=y;rig.chassis.rotation.set(d?.roll||0,0,d?.pitch||0);for(const w of rig.wheels)w.node.position.y=w.y;rig.update(dt,t,p);rig.setLights(p.night);
      desired.set(x+Math.cos(t*.018)*13,y+5,z+Math.sin(t*.018)*13);camera.position.lerp(desired,1-Math.exp(-dt*1.2));camera.lookAt(sim.current.focus);
    }else if(active){
      sim.current.speed=0;const diorama=sim.current.diorama;
      if(diorama){const root=sim.current.dioramaObject;if(root){if(sim.current.turn&&!sim.current.paused)root.rotation.y+=dt*.14;updateObject(root,dt,t,p);}}
      else{if(sim.current.turn&&!sim.current.paused)active.rotation.y+=dt*.14;updateObject(active,dt,t,p);}
      const focus=sim.current.focus.set(0,diorama?0:sim.current.modelY||0,0),distance=diorama?62:sim.current.distance,side=sim.current.cameraSide;
      const angle=sim.current.viewAngle,elevation=sim.current.viewElevation;
      if(side==='top'||side==='under')desired.set(focus.x,focus.y+(side==='top'?distance:-distance),focus.z+.001);
      else desired.set(Math.sin(angle)*distance,distance*elevation,Math.cos(angle)*distance).add(focus);
      sim.current.cameraUnder=side==='under';if(side!=='under'&&side!=='top')desired.y=Math.max(desired.y,terrainHeight(desired.x,desired.z)+1.2);
      camera.position.lerp(desired,1-Math.exp(-dt*2.4));camera.lookAt(focus);
      if(sim.current.wireObject){sim.current.wireObject.position.copy(active.position);sim.current.wireObject.rotation.copy(active.rotation);}
      if(sim.current.trailer&&active.userData.rig&&!diorama){sim.current.trailer.position.set(-active.userData.rig.spec.L/2-3.9,0,0);sim.current.trailer.rotation.set(0,0,0);sim.current.trailer.userData.update?.();}
    }
    sim.current.updateWeather?.(dt);sim.current.updateWorld?.(dt);sim.current.updateLights?.(dt);sim.current.updateBloom?.(p.night);updateAudio(sim.current,dt,s.volume);
    const speed=document.getElementById('speed-value');if(speed)speed.textContent=String(Math.round(sim.current.speed*3.6));
    const trip=document.getElementById('trip-value');if(trip)trip.textContent=`${((d?.distance||0)/1000).toFixed(2)} km travelled`;
    const discovery=document.getElementById('discovery-toast');if(discovery){discovery.textContent=t<sim.current.discoveryUntil?`Discovered · ${sim.current.discovery}`:'';discovery.hidden=!(t<sim.current.discoveryUntil);}
    rig?.wheels.forEach((w:any,i:number)=>{const bar=document.getElementById(`suspension-${i}`);if(bar){bar.style.setProperty('--travel',`${Math.round((w.norm??.5)*100)}%`);bar.classList.toggle('airborne',!!w.air);}});
    sim.current.perfElapsed=(sim.current.perfElapsed||0)+rawDt;sim.current.perfFrames=(sim.current.perfFrames||0)+1;
    if(sim.current.perfElapsed>=.5){const node=document.getElementById('perf-readout');if(node)node.textContent=`${Math.round(sim.current.perfFrames/sim.current.perfElapsed)} fps · ${frameCalls} calls · ${frameTriangles.toLocaleString()} tris`;sim.current.perfElapsed=sim.current.perfFrames=0;}
  });return null;
}

function loadout(vehicle:string,options:Record<string,any>){return{...KIT.VDEF,...KIT.VEH[vehicle]?.def,...options};}
const disposeRig=(rig:any)=>{if(!rig)return;disposeObject(rig.root);rig.world.forEach(disposeObject);};

export default function KitViewer() {
  const settings=useGameStore(),cameraMode=useRef('chase'),keys=useRef<DriveKeys>({});
  const sim=useRef<any>({time:0,turn:false,distance:8,viewAngle:.75,viewElevation:.42,cameraSide:'iso',speed:0,focus:new THREE.Vector3(SPAWN.x,0,SPAWN.z),preset:resolvePreset(settings)});
  const [viewId,setViewId]=useState(settings.vehicle),[cameraSide,setCameraSide]=useState('iso'),[edge,setEdge]=useState(false),[turn,setTurn]=useState(false),[diorama,setDiorama]=useState(false),[soundOn,setSoundOn]=useState(false),[overlay,setOverlay]=useState<Overlay>(null);
  const [viewerOptions,setViewerOptions]=useState<Record<string,Record<string,any>>>({}),[category,setCategory]=useState('All'),[query,setQuery]=useState(''),[hidden,setHidden]=useState(false),[audioError,setAudioError]=useState('');
  const [physicsRequested,setPhysicsRequested]=useState(false),[worldReady,setWorldReady]=useState(false);
  const physicsReady=useCallback(()=>setWorldReady(true),[]);
  useEffect(()=>{if(settings.ui==='drive')setPhysicsRequested(true)},[settings.ui]);
  const activeId=settings.ui==='viewer'?viewId:settings.vehicle,entry=KIT.ENTRIES.find(e=>e.id===activeId)||KIT.ENTRIES[0];
  const previewOptions=viewerOptions[entry.id]||{},opts=settings.ui==='viewer'?(entry.vehicle?loadout(entry.id,previewOptions):previewOptions):loadout(settings.vehicle,settings.loadout);
  const driveRig=useKitObject(()=>bakeVehicle(KIT.vehicle(settings.vehicle,loadout(settings.vehicle,settings.loadout))),`${settings.vehicle}|${JSON.stringify(settings.loadout)}`,disposeRig);
  const active=useKitObject<any>(()=>settings.ui==='garage'||settings.ui==='viewer'?(entry.vehicle?bakeVehicle(KIT.vehicle(entry.id,opts)):entry.build!(opts)):null,`${settings.ui}|${entry.id}|${JSON.stringify(opts)}`,v=>{if(v?.root)disposeRig(v);else if(v)disposeObject(v);});
  const obj=active?(entry.vehicle?active.root:active):null;
  if(import.meta.env.DEV){sim.current.previewObject=obj;sim.current.store=useGameStore;}
  const trailer=useKitObject(()=>settings.trailer?KIT.caravan({paint:'cream'}):null,`${settings.trailer}`,v=>{if(v)disposeObject(v)});
  const edges=useKitObject(()=>{
    if(!edge||settings.ui!=='viewer'||!obj)return null;obj.updateMatrixWorld(true);const root=new THREE.Group(),inverse=obj.matrixWorld.clone().invert(),material=new THREE.LineBasicMaterial({color:0x20252b,transparent:true,opacity:.58});
    obj.traverse((mesh:any)=>{if(!mesh.isMesh)return;const geometry=new THREE.EdgesGeometry(mesh.geometry,28);geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld));root.add(new THREE.LineSegments(geometry,material));});return root;
  },`${obj?.uuid}|${edge}|${settings.ui}`,v=>{if(v)disposeObject(v)});
  sim.current.wireObject=edges;sim.current.trailer=trailer;sim.current.turn=turn;sim.current.cameraSide=cameraSide;sim.current.diorama=diorama&&settings.ui==='viewer';sim.current.paused=!!overlay||hidden;
  useEffect(()=>{if(!driveRig)return;sim.current.rig=driveRig;sim.current.drive=createDrive(driveRig,keys.current,sim.current.drive);sim.current.drive.enabled=settings.ui==='drive';if(trailer)delete trailer.userData.axle;},[driveRig]);
  useEffect(()=>{if(sim.current.drive)sim.current.drive.enabled=settings.ui==='drive';Object.keys(keys.current).forEach(k=>keys.current[k as keyof DriveKeys]=false);if(settings.ui==='drive'&&!overlay){const canvas=document.querySelector('canvas');if(canvas){canvas.tabIndex=0;canvas.focus({preventScroll:true});}}},[settings.ui,overlay,hidden]);
  useEffect(()=>{if(!obj)return;obj.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(obj),size=box.getSize(new THREE.Vector3());sim.current.modelY=(box.min.y+box.max.y)/2;sim.current.distance=Math.max(5,Math.max(size.x,size.y,size.z)*1.85);},[obj]);
  useEffect(()=>{sim.current.viewAngle=cameraSide==='front'?Math.PI/2:cameraSide==='back'?-Math.PI/2:cameraSide==='left'?Math.PI:cameraSide==='right'?0:.75;sim.current.viewElevation=.42;},[cameraSide]);
  const changeMode=(ui:'menu'|'drive'|'garage'|'viewer')=>{setDiorama(false);setCameraSide('iso');sim.current.cameraUnder=false;setOverlay(null);settings.set({ui});if(ui==='viewer')setViewId(settings.vehicle);};
  const startDrive=(destination?:string)=>{settings.set({destination:destination??null});changeMode('drive');if(!sim.current.drive||!sim.current.rig)return;const d=sim.current.drive;d.enabled=true;settleDrive(sim.current.rig,d);if(trailer)delete trailer.userData.axle;};
  const recover=()=>{if(sim.current.drive&&sim.current.rig){recoverDrive(sim.current.rig,sim.current.drive);if(trailer)delete trailer.userData.axle;}};
  useEffect(()=>{
    const map:Record<string,keyof DriveKeys>={KeyW:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',Space:'brake'};
    const clear=()=>Object.keys(keys.current).forEach(k=>keys.current[k as keyof DriveKeys]=false);
    const down=(e:KeyboardEvent)=>{
      if((e.target as HTMLElement)?.closest('input,select,textarea,[contenteditable="true"]'))return;
      if(e.code==='Space'&&(e.target as HTMLElement)?.closest('button,a,[role="button"]'))return;
      if(e.code==='Escape'){e.preventDefault();setOverlay(current=>current?null:settings.ui==='drive'?'pause':null);return;}
      if(settings.ui!=='drive'||overlay||hidden)return;
      if(map[e.code]){e.preventDefault();keys.current[map[e.code]]=true;return;}if(e.repeat)return;
      if(e.code==='KeyR'){e.preventDefault();recover();}if(e.code==='KeyH'&&sim.current.drive){const d=sim.current.drive;d.forceLight=d.forceLight===null?0:d.forceLight===0?1:null;}
      if(e.code==='KeyC')cameraMode.current=cameraMode.current==='chase'?'hood':'chase';if(e.code==='KeyM')setOverlay('map');
    };
    const up=(e:KeyboardEvent)=>{if(map[e.code])keys.current[map[e.code]]=false;};
    const visibility=()=>{clear();setHidden(document.hidden)};
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',clear);document.addEventListener('visibilitychange',visibility);
    return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',visibility);clear();};
  },[settings.ui,overlay,hidden,trailer]);
  useEffect(()=>()=>{void sim.current.audio?.close();},[]);
  useEffect(()=>{if(import.meta.env.DEV){(window as any).__TREX_DEBUG__=sim.current;return()=>{delete (window as any).__TREX_DEBUG__;}}},[]);
  const audio=()=>{try{setSoundOn(toggleAudio(sim.current,settings.volume));setAudioError('')}catch{setAudioError('Audio could not start. Check your browser sound permissions.')}};
  const setOption=(key:string,value:any)=>settings.ui==='viewer'?setViewerOptions(all=>({...all,[entry.id]:{...all[entry.id],[key]:value}})):settings.setOption(key,value);
  const quality=QUALITY[settings.quality],ready=!!driveRig;
  const filtered=KIT.ENTRIES.filter(e=>(category==='All'||e.cat===category)&&`${e.name} ${e.blurb}`.toLowerCase().includes(query.toLowerCase()));
  const pointerButton=(key:keyof DriveKeys,label:string,text:string)=><button aria-label={label} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);keys.current[key]=true;}} onPointerUp={()=>keys.current[key]=false} onPointerCancel={()=>keys.current[key]=false} onLostPointerCapture={()=>keys.current[key]=false}>{text}</button>;
  return <main className="game-shell">
    <SceneBoundary><Suspense fallback={<div className="scene-fallback">Preparing the valley…</div>}><Canvas legacy flat shadows={quality.shadows>0?'percentage':false} dpr={Math.max(.5,quality.pixelRatio*settings.renderScale)} camera={{position:[48,9,12],fov:47,near:.1,far:2200}} gl={{outputColorSpace:THREE.LinearSRGBColorSpace,antialias:false,powerPreference:'high-performance'}} fallback={<div className="scene-fallback">This browser does not support WebGL. Try a browser with hardware acceleration enabled.</div>}>
      <fog attach="fog" args={[0xf8c793,12,210]} /><SceneLights sim={sim} />
      {physicsRequested&&<Suspense fallback={null}><PhysicsLayer sim={sim} paused={!!overlay||hidden} onReady={physicsReady} /></Suspense>}<World params={sim} />
      {(settings.ui==='drive'||settings.ui==='menu')&&driveRig&&<><primitive object={driveRig.root} />{driveRig.world.map((o,i)=><primitive key={i} object={o} />)}</>}
      {(settings.ui==='garage'||settings.ui==='viewer')&&!sim.current.diorama&&obj&&<><primitive object={obj} />{(entry.vehicle?active.world:obj.userData.world||[]).map((o:any,i:number)=><primitive key={i} object={o} />)}{edges&&<primitive object={edges} />}</>}
      {sim.current.diorama&&<DioramaScene objectRef={(node:any)=>sim.current.dioramaObject=node} />}
      {trailer&&!sim.current.diorama&&<primitive object={trailer} />}<WeatherFX sim={sim} />{quality.bloom&&<Suspense fallback={null}><NightBloom sim={sim} /></Suspense>}<GameLoop active={obj} sim={sim} cameraMode={cameraMode} />
    </Canvas></Suspense></SceneBoundary>
    <div className="ui-layer" style={{zoom:settings.uiScale,'--ui-height':`${100/settings.uiScale}dvh`} as React.CSSProperties}>
      {settings.ui==='menu'?<StartScreen onStart={startDrive} onSettings={()=>setOverlay('settings')} onGuide={()=>setOverlay('guide')} onGarage={()=>changeMode('garage')} />:<>
        <header className="topbar"><button className="brand brand-button" onClick={()=>changeMode('menu')} aria-label="Return to starting screen"><span className="brand-mark">✳</span><div><b>OVER THE HILL</b><small>A quiet road, wherever it goes</small></div></button><nav className="top-actions" aria-label="Game modes"><button className={settings.ui==='drive'?'active':''} disabled={!ready} onClick={()=>changeMode('drive')}>Drive</button><button className={settings.ui==='garage'?'active':''} onClick={()=>changeMode('garage')}>Garage</button><button className={settings.ui==='viewer'?'active':''} onClick={()=>changeMode('viewer')}>Kit viewer</button><button onClick={()=>setOverlay('settings')} aria-label="Settings">⚙</button><button onClick={()=>setOverlay('guide')} aria-label="Field guide">?</button></nav></header>
        <div className="world-controls"><label>DAYLIGHT<select value={settings.time} onChange={e=>settings.set({time:e.target.value})}>{Object.entries(TIMES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></label><label>WEATHER<select value={settings.weather} onChange={e=>settings.set({weather:e.target.value})}>{Object.entries(WEATHER).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></label><label>REGION<select value={settings.biome} onChange={e=>settings.set({biome:e.target.value})}>{Object.entries(BIOMES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></label></div>
        {settings.ui==='drive'&&<><div className="drive-hud"><div className="suspension-readout" aria-label="Wheel suspension travel">{driveRig?.wheels.map((_,i)=><i key={i} id={`suspension-${i}`} />)}<small>SUSPENSION</small></div><div className="speed"><strong id="speed-value">0</strong><span>KM/H</span></div><div className="help">WASD drive <i/> SPACE brake <i/> R recover <i/> H lights <i/> C camera</div><button className="sound" onClick={audio}>{soundOn?'Sound on':'Sound off'}</button><button className="hud-action" onClick={recover}>Recover</button><button className="hud-action" onClick={()=>cameraMode.current=cameraMode.current==='chase'?'hood':'chase'}>Camera</button><button className="hud-action" onClick={()=>setOverlay('pause')}>Pause</button></div><div className="mobile-pad">{pointerButton('left','Steer left','◀')}{pointerButton('up','Accelerate','▲')}{pointerButton('down','Brake and reverse','▼')}{pointerButton('right','Steer right','▶')}{pointerButton('brake','Handbrake','Brake')}</div>{settings.showMap&&<WorldMap sim={sim} onExpand={()=>setOverlay('map')} />}<div id="discovery-toast" className="discovery-toast" hidden /></>}
        {(settings.ui==='garage'||settings.ui==='viewer')&&<aside className="drawer">
          <div className="drawer-head"><div><small>{settings.ui==='garage'?'YOUR RIG':'KIT CATALOG'}</small><h1>{settings.ui==='garage'?KIT.VEH[settings.vehicle]?.name:entry.name}</h1></div><button className="quiet" onClick={()=>changeMode('drive')} aria-label="Close garage or viewer">×</button></div>
          {settings.ui==='garage'?<><label className="field-label">VEHICLE<select value={settings.vehicle} onChange={e=>settings.set({vehicle:e.target.value,loadout:{}})}>{Object.entries(KIT.VEH).map(([id,v]:any)=><option key={id} value={id}>{v.name}</option>)}</select></label><label className="tow-option"><input type="checkbox" checked={settings.trailer} onChange={e=>settings.set({trailer:e.target.checked})} /> Tow the caravan</label><div className="option-scroll">{KIT.VOPTS.map(section=><section className="option-section" key={section.sec}><h3>{section.sec}</h3>{section.items.map(option=><Option key={option.k} option={option} value={opts[option.k]} onChange={(v:any)=>setOption(option.k,v)} />)}</section>)}</div><div className="drawer-footer"><button className="secondary" onClick={()=>settings.set({loadout:{}})}>Reset setup</button><button className="primary" disabled={!ready} onClick={()=>startDrive()}>Take the wheel</button></div></>:<>
            <input className="catalog-search" type="search" aria-label="Search kit models" placeholder="Find a model…" value={query} onChange={e=>setQuery(e.target.value)} /><div className="catalog-tabs">{['All',...KIT.CATS].map(c=><button className={category===c?'selected':''} key={c} onClick={()=>setCategory(c)}>{c}</button>)}</div><div className="catalog-list">{filtered.map(e=><button className={viewId===e.id?'selected':''} key={e.id} onClick={()=>{setViewId(e.id);setCameraSide('iso')}}><span>{e.name}</span><small>{e.cat}</small></button>)}{filtered.length===0&&<p>No models match your search.</p>}</div><p className="model-description">{entry.blurb}</p>
            <div className="viewer-tools"><div>{['front','back','left','right','top','under','iso'].map(v=><button className={cameraSide===v?'chosen':''} onClick={()=>setCameraSide(v)} key={v}>{v}</button>)}</div><label><input type="checkbox" checked={turn} onChange={e=>setTurn(e.target.checked)} /> Turntable</label><label><input type="checkbox" checked={edge} onChange={e=>setEdge(e.target.checked)} /> Edges</label><button className={diorama?'chosen':''} onClick={()=>setDiorama(v=>!v)}>{diorama?'Exit diorama':'Diorama'}</button></div>
            <div className="option-scroll">{entry.vehicle?KIT.VOPTS.map(section=><section className="option-section" key={section.sec}><h3>{section.sec}</h3>{section.items.map(option=><Option key={option.k} option={option} value={opts[option.k]} onChange={(v:any)=>setOption(option.k,v)} />)}</section>):(entry.opts||[]).map(option=><Option key={option.k} option={option} value={opts[option.k]} onChange={(v:any)=>setOption(option.k,v)} />)}</div><div className="drawer-footer">{entry.vehicle?<button className="primary" onClick={()=>{settings.set({vehicle:entry.id,loadout:previewOptions});changeMode('garage')}}>Use this vehicle</button>:entry.id==='caravan'?<button className="primary" onClick={()=>{settings.set({trailer:true});changeMode('garage')}}>Tow this caravan</button>:<span>Preview only · garage setup stays saved</span>}</div>
          </>}
        </aside>}
        <footer className="bottom-note"><span className="weather-dot" /><span id="trip-value">No hurry. The road will wait.</span></footer>
      </>}
      {(settings.showPerf||import.meta.env.DEV)&&<div id="perf-readout" className="perf-readout">measuring scene…</div>}
      {audioError&&<div className="audio-error" role="status">{audioError}</div>}
      {overlay&&<OverlayPanel kind={overlay} onClose={()=>setOverlay(null)} sim={sim} onMenu={()=>changeMode('menu')} onAudio={audio} soundOn={soundOn} />}
      {(!ready||settings.ui==='drive'&&!worldReady)&&<div className="loading-note" role="status">{!ready?'Preparing your vehicle…':'Preparing the valley trails…'}</div>}
    </div>
  </main>;
}

function Option({option,value,onChange}:any) {
  const shown=value??option.d??(option.t==='toggle'?false:option.t==='range'?option.min:option.v?.[0]??option.sw?.[0]??0),choices=option.t==='swatch'?(option.sw||Object.keys(KIT.PAINTS)):option.v||[];
  return <div className="option-row"><span>{option.l}</span>{option.t==='toggle'?<button className={'toggle '+(shown?'on':'')} onClick={()=>onChange(!shown)} aria-label={option.l} aria-pressed={shown}>{shown?'On':'Off'}</button>:option.t==='range'?<div className="range"><input aria-label={option.l} type="range" min={option.min} max={option.max} step={option.step||1} value={shown} onChange={e=>onChange(Number(e.target.value))}/><small>{shown}</small></div>:option.t==='seed'?<div className="range"><input aria-label={option.l} type="number" min="1" max="99999" value={shown||1} onChange={e=>onChange(Math.max(1,Math.min(99999,Number(e.target.value)||1)))}/></div>:<select aria-label={option.l} value={shown} onChange={e=>onChange(option.t==='swatch'&&option.sw?Number(e.target.value):e.target.value)}>{choices.map((v:any)=><option key={String(v)} value={v}>{option.t==='swatch'&&!option.sw?String(v):typeof v==='number'?'#'+v.toString(16).padStart(6,'0'):String(v)}</option>)}</select>}</div>;
}
