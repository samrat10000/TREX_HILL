import { useEffect, useRef } from 'react';
import { QUALITY, useGameStore } from '../kit/devState';
import { WorldMap } from './Map';
import { LANDMARKS } from '../game/terrain';

export type Overlay = 'settings'|'guide'|'map'|'pause'|null;
export function OverlayPanel({kind,onClose,sim,onMenu,onAudio,soundOn}:{kind:Exclude<Overlay,null>;onClose:()=>void;sim:React.MutableRefObject<any>;onMenu:()=>void;onAudio:()=>void;soundOn:boolean}) {
  const s=useGameStore(),panel=useRef<HTMLDivElement>(null);
  useEffect(()=>{const old=document.activeElement as HTMLElement|null;panel.current?.focus();return()=>old?.focus()},[]);
  const title=kind==='settings'?'Make yourself comfortable':kind==='guide'?'Your field guide':kind==='map'?'Pick a road':'Take a breath';
  return <div className="modal-backdrop" onClick={onClose}><div className={`modal-panel ${kind==='map'?'map-panel':''}`} style={{maxHeight:'calc(var(--ui-height, 100dvh) - 24px)'}} ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="overlay-title" onClick={e=>e.stopPropagation()} onKeyDown={e=>{
    if(e.key==='Escape'){e.stopPropagation();onClose()}
    if(e.key==='Tab'){const nodes=panel.current?.querySelectorAll<HTMLElement>('button,input,select,a[href]');if(!nodes?.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&(document.activeElement===first||document.activeElement===panel.current)){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}
  }}>
    <div className="modal-heading"><div><small>OVER THE HILL</small><h2 id="overlay-title">{title}</h2></div><button onClick={onClose} aria-label="Close dialog">×</button></div>
    {kind==='settings'&&<div className="settings-grid">
      <label>Graphics quality<select value={s.quality} onChange={e=>s.set({quality:e.target.value as keyof typeof QUALITY})}>{Object.entries(QUALITY).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select><small>Controls grass density, terrain detail, shadows, bloom, and pixel ratio.</small></label>
      <label>Render resolution <b>{Math.round(s.renderScale*100)}%</b><input type="range" min=".5" max="1.5" step=".05" value={s.renderScale} onChange={e=>s.set({renderScale:Number(e.target.value)})} /><small>Lower this for a smoother drive on slower devices.</small></label>
      <label>Interface size <b>{Math.round(s.uiScale*100)}%</b><input type="range" min=".8" max="1.3" step=".05" value={s.uiScale} onChange={e=>s.set({uiScale:Number(e.target.value)})} /></label>
      <label>Volume <b>{Math.round(s.volume*100)}%</b><input type="range" min="0" max="1" step=".05" value={s.volume} onChange={e=>s.set({volume:Number(e.target.value)})} /></label>
      <button className="secondary" onClick={onAudio}>{soundOn?'Mute audio':'Enable audio'}</button>
      <label className="check-setting"><input type="checkbox" checked={s.showMap} onChange={e=>s.set({showMap:e.target.checked})} /> Show minimap</label>
      <label className="check-setting"><input type="checkbox" checked={s.showPerf} onChange={e=>s.set({showPerf:e.target.checked})} /> Show frame rate and scene statistics</label>
      <button className="secondary" onClick={()=>{if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{});else void document.documentElement.requestFullscreen().catch(()=>{})}}>Toggle fullscreen</button>
      <p className="settings-note">Changes are saved on this device. Ultra is intended for stronger GPUs; start with Medium on a phone.</p>
    </div>}
    {kind==='guide'&&<div className="field-guide">
      <p>A quiet valley, six places to discover, and no timer. Follow the dirt trails or leave the road. Open the map to set a destination; its marker shows a direct bearing.</p>
      <dl>{[['W / ↑','Accelerate'],['S / ↓','Brake, then reverse'],['A D / ← →','Steer'],['Space','Handbrake'],['R','Recover at your last safe position'],['H','Cycle automatic / off / on headlights'],['C','Chase / hood camera'],['M','World map'],['Escape','Pause / resume']].map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
      <h3>Your suspension</h3><p>Soft springs allow more articulation. Damping controls how quickly bouncing settles. Preload changes the initial spring support and resting body height; excessive preload reduces droop. The wheel bars show available suspension travel. Brief wheel lift over crests is possible.</p>
      <h3>Touch driving</h3><p>Use the on-screen arrows and brake. Recover and camera buttons are beside the speed display. Touch controls also appear on tablets.</p>
      <h3>Garage and kit viewer</h3><p>Garage changes apply to your driving vehicle. The kit viewer is a separate preview: inspect any model, filter categories, customize it, and use “Use this vehicle” to bring a setup into the garage.</p>
      <h3>A comfortable frame rate</h3><p>Graphics quality changes scene detail. Render resolution changes image sharpness. Interface size changes menus independently. Low disables shadows and bloom but keeps the grass and kit vegetation.</p>
    </div>}
    {kind==='map'&&<WorldMap sim={sim} expanded />}
    {kind==='pause'&&<div className="pause-actions"><p>The drive is paused. Your vehicle will stay here.</p><button className="primary" onClick={onClose}>Continue the drive</button><button className="secondary" onClick={onMenu}>Return to starting screen</button></div>}
  </div></div>;
}

export function StartScreen({onStart,onSettings,onGuide,onGarage}:{onStart:(destination?:string)=>void;onSettings:()=>void;onGuide:()=>void;onGarage:()=>void}) {
  const visited=useGameStore(s=>s.visited);
  return <section className="start-screen" aria-label="Starting screen"><div className="start-copy"><span className="eyebrow">A LITTLE FURTHER, A LITTLE SLOWER</span><h1>Over<br/>the hill.</h1><p>A valley of winding trails, tall grass, and places worth stopping. Take the wheel. Find your own way.</p><div className="start-actions"><button className="primary" onClick={()=>onStart()}>Start free roam <span>↗</span></button><button className="secondary" onClick={onGarage}>Choose your rig</button></div><div className="start-links"><button onClick={onSettings}>Settings</button><button onClick={onGuide}>How to play</button><small>{visited.length} / {LANDMARKS.length} places discovered</small></div></div>
    <div className="route-cards"><small>OR TAKE THE SCENIC ROUTE</small>{LANDMARKS.filter(p=>['lake','lookout','harbor'].includes(p.id)).map((p,i)=><button key={p.id} onClick={()=>onStart(p.id)}><span>0{i+1} / {p.name}</span><p>{p.description}</p><b>Set out →</b></button>)}<p>All routes share one open world. Explore at your own pace.</p></div>
  </section>;
}
