import { useEffect, useState } from 'react';
import { useGameStore } from '../kit/devState';
import { LANDMARKS, LAKE, TRAILS, WORLD_SIZE } from '../game/terrain';

export function WorldMap({ sim, expanded=false, onExpand }: { sim: React.MutableRefObject<any>; expanded?: boolean; onExpand?: () => void }) {
  const visited=useGameStore(s=>s.visited),destination=useGameStore(s=>s.destination),set=useGameStore(s=>s.set);
  const [pose,setPose]=useState({x:34,z:0,yaw:Math.PI/2});
  useEffect(()=>{const timer=window.setInterval(()=>{const d=sim.current.drive;if(d)setPose({x:d.x,z:d.z,yaw:d.yaw})},150);return()=>window.clearInterval(timer)},[sim]);
  const target=LANDMARKS.find(p=>p.id===destination);
  return <div className={expanded?'world-map expanded':'world-map'}>
    <div className="map-heading"><span>VALLEY TRAILS</span>{!expanded&&<button onClick={onExpand} aria-label="Open world map">↗</button>}</div>
    <svg viewBox="-512 -512 1024 1024" role="img" aria-label="Valley map showing roads, destinations, and your vehicle">
      <defs><pattern id={expanded?'map-grid-large':'map-grid-small'} width="128" height="128" patternUnits="userSpaceOnUse"><path d="M 128 0 L 0 0 0 128" fill="none" stroke="#ffffff18" strokeWidth="2" /></pattern></defs>
      <rect x="-512" y="-512" width={WORLD_SIZE} height={WORLD_SIZE} fill="#344b3f" />
      <path d="M-512,-180Q-200,-390 70,-140T512,-270L512,-512H-512Z" fill="#49654d" />
      <path d="M-512,290Q-150,140 50,290T512,180V512H-512Z" fill="#293f36" />
      <rect x="-512" y="-512" width="1024" height="1024" fill={`url(#${expanded?'map-grid-large':'map-grid-small'})`} />
      <circle cx={LAKE.x} cy={LAKE.z} r="27" fill="#639b9d" />
      <circle cx="0" cy="0" r="34" fill="none" stroke="#d7b47c" strokeWidth="7" />
      {TRAILS.map((trail,i)=><polyline key={i} points={trail.map(p=>p.join(',')).join(' ')} fill="none" stroke="#d7b47c" strokeWidth="7" strokeLinejoin="round" />)}
      {target&&<line x1={pose.x} y1={pose.z} x2={target.x} y2={target.z} stroke="#f7d69b" strokeDasharray="9 9" strokeWidth="3" />}
      {LANDMARKS.map(p=><g key={p.id}><circle cx={p.x} cy={p.z} r={expanded?9:14} fill={visited.includes(p.id)?'#e2c185':'#f3f0db'} stroke="#344b3f" strokeWidth="3" />{expanded&&<text x={p.x+16} y={p.z+6} fill="#f6f0df" fontSize="20">{p.name}</text>}</g>)}
      <g transform={`translate(${pose.x},${pose.z}) rotate(${-pose.yaw*180/Math.PI})`}><path d="M 22 0 L -14 -12 L -8 0 L -14 12 Z" fill="#fff4d1" stroke="#263f34" strokeWidth="3" /></g>
      <text x="450" y="-450" fill="#fff4d1" fontSize="32">N ↑</text>
      {expanded&&<><path d="M-460 460h100m-100-8v16m100-16v16" stroke="#f6f0df" strokeWidth="3" /><text x="-460" y="445" fill="#f6f0df" fontSize="18">100 m</text></>}
    </svg>
    {!expanded&&<small>{target?`${target.name} · ${Math.round(Math.hypot(target.x-pose.x,target.z-pose.z))} m`:'Free roam · choose your own road'}</small>}
    {expanded&&<div className="destinations">{LANDMARKS.map(p=><button key={p.id} className={destination===p.id?'selected':''} onClick={()=>set({destination:p.id})}><span>{p.name}{visited.includes(p.id)?' ✓':''}</span><small>{p.description}</small></button>)}<button onClick={()=>set({destination:null})}>Clear destination</button></div>}
  </div>;
}
