import * as THREE from 'three';
import { KIT } from '../kit/core';
import { POIS,REGIONS,CHALLENGES,regionAt } from './worldData';
export const WORLD_SIZE=2048,WORLD_RADIUS=1000,WATER_Y=-1.4;
export const LAKE={x:-80,z:58},SPAWN={x:3.5,z:2.2,yaw:-.7};
export const LANDMARKS=POIS;
export const hash=(x:number,z:number)=>{const v=Math.sin(x*127.1+z*311.7)*43758.5453;return v-Math.floor(v)};
const smooth=THREE.MathUtils.smoothstep,clamp=THREE.MathUtils.clamp;
const westRiver=(x:number,z:number)=>Math.abs(x-(-205+Math.sin(z*.008)*45+Math.sin(z*.022)*12));
const pineRiver=(x:number,z:number)=>Math.abs(x-(150+Math.sin((z+230)*.022)*20));
export function riverDistance(x:number,z:number){return Math.min(z>-270&&z<500?westRiver(x,z):Infinity,z>-460&&z<-70?pineRiver(x,z):Infinity);}
const flatPlaces=POIS.filter(p=>['camp','outpost','tower','aframe','logcabin'].includes(p.kind)),fords=POIS.filter(p=>p.kind==='ford');
function rawHeight(x:number,z:number){const n=KIT.noise3,d=Math.hypot(x,z),a=smooth(d,20,80);let h=((n(x/480,4,z/480)-.5)*52+20)*a+(n(x/64+5,1,z/64)-.5)*5*a+(n(x/8,2,z/8)-.5)*.35*a;
 h+=smooth(-z,420,820)*28;h-=7*(1-smooth(Math.hypot(x-LAKE.x,z-LAKE.z),12,48));
 // Wide graded banks keep the deep channels drivable instead of creating cliff edges.
 const river=westRiver(x,z),riverZone=smooth(z,-270,-180)*(1-smooth(z,440,500));h=THREE.MathUtils.lerp(h,WATER_Y-2,riverZone*(1-smooth(river,8,70)));
 h=THREE.MathUtils.lerp(h,WATER_Y-1.4,smooth(z,-460,-400)*(1-smooth(z,-130,-70))*(1-smooth(pineRiver(x,z),6,70)));
 const shore=1-smooth(Math.hypot(x+910,z+455),140,320);h=THREE.MathUtils.lerp(h,WATER_Y-4,shore);
 for(const p of flatPlaces){const r=Math.hypot(x-p.x,z-p.z);if(r<24){const base=((n(p.x/480,4,p.z/480)-.5)*40+20)*smooth(Math.hypot(p.x,p.z),20,80)+smooth(-p.z,420,820)*28;h=THREE.MathUtils.lerp(base,h,smooth(r,10,24));}}
 for(const p of fords){const d=Math.hypot(x-p.x,z-p.z);if(d<80)h=THREE.MathUtils.lerp(WATER_Y-.25,h,smooth(d,6,80));}
 return h;
}
const paths:[number,number][][]=[[[0,0],[-50,65],[-180,130],[-320,200],[-440,220]],[[0,0],[115,-60],[215,-180],[310,-235],[390,-310]],[[390,-310],[470,-190],[550,0],[650,200],[720,310]],[[390,-310],[310,-450],[220,-540],[120,-650],[40,-780]],[[-440,220],[-530,80],[-590,-90],[-680,-260],[-740,-410]],[[0,0],[30,-10],[46,-14]],[[0,0],[50,100],[130,150]]];
for(const p of POIS.filter(p=>!['camp','photo','vehicle','lake','ford','bridge'].includes(p.kind))){const r=REGIONS.find(r=>r.id===p.region)!;paths.push([[r.x,r.z],[(r.x+p.x)/2+20,(r.z+p.z)/2-15],[p.x,p.z]]);}
for(const t of CHALLENGES)paths.push([[t.start.x,t.start.z],[(t.start.x+t.end.x)/2+20,(t.start.z+t.end.z)/2-15],[t.end.x,t.end.z]]);
export const TRAILS:[number,number][][]=paths.map(points=>new THREE.CatmullRomCurve3(points.map(([x,z])=>new THREE.Vector3(x,0,z)),false,'centripetal').getPoints(Math.max(8,points.length*8)).map(p=>[p.x,p.z]));
const segments=new Map<string,{ax:number;az:number;bx:number;bz:number;ah:number;bh:number}[]>();
for(const path of TRAILS)for(let i=1;i<path.length;i++){const[ax,az]=path[i-1],[bx,bz]=path[i],seg={ax,az,bx,bz,ah:rawHeight(ax,az),bh:rawHeight(bx,bz)};for(let tx=Math.floor((Math.min(ax,bx)-12)/64);tx<=Math.floor((Math.max(ax,bx)+12)/64);tx++)for(let tz=Math.floor((Math.min(az,bz)-12)/64);tz<=Math.floor((Math.max(az,bz)+12)/64);tz++){const key=`${tx},${tz}`;if(!segments.has(key))segments.set(key,[]);segments.get(key)!.push(seg);}}
function nearestRoad(x:number,z:number){let distance=1e3,height=0;for(const s of segments.get(`${Math.floor(x/64)},${Math.floor(z/64)}`)??[]){const dx=s.bx-s.ax,dz=s.bz-s.az,t=clamp(((x-s.ax)*dx+(z-s.az)*dz)/Math.max(.001,dx*dx+dz*dz),0,1),d=Math.hypot(x-s.ax-dx*t,z-s.az-dz*t);if(d<distance){distance=d;height=THREE.MathUtils.lerp(s.ah,s.bh,t)}}return{distance,height};}
export const roadDistance=(x:number,z:number)=>nearestRoad(x,z).distance;
export const roadFactor=(x:number,z:number)=>1-smooth(roadDistance(x,z),2.6,4.8);
export function terrainHeight(x:number,z:number){const h=rawHeight(x,z),road=nearestRoad(x,z),f=1-smooth(road.distance,2.4,5.5);return THREE.MathUtils.lerp(h,road.height+clamp(h-road.height,-.8,.8),f);}
export function surfaceAt(x:number,z:number,weather='clear'){const y=terrainHeight(x,z),wet=y<WATER_Y+.05&&(riverDistance(x,z)<22||Math.hypot(x-LAKE.x,z-LAKE.z)<48);return wet?'water':regionAt(x,z).id==='pass'?'snow':roadFactor(x,z)>.5?(weather==='rain'||weather==='storm'?'mud':'dirt'):'grass';}
export type Placement={id:string;kind:'tree'|'bush'|'rock';x:number;z:number;y:number;scale:number;yaw:number;seed:number};
export function chunkPlacements(tx:number,tz:number):Placement[]{const out:Placement[]=[];for(let i=0;i<(regionAt(-960+tx*128,-960+tz*128).id==='ember'||regionAt(-960+tx*128,-960+tz*128).id==='pine'?96:64);i++){const seed=tx*817+tz*1771+i*13+17,x=-1024+tx*128+hash(seed,19)*128,z=-1024+tz*128+hash(seed,37)*128,y=terrainHeight(x,z);if(roadDistance(x,z)<7||y<WATER_Y+.6||POIS.some(p=>Math.hypot(x-p.x,z-p.z)<(p.kind==='photo'?5:14)))continue;const r=regionAt(x,z),kind=i%5===0?'rock':i%3===0?'bush':'tree';if(kind==='tree'&&r.id==='canyon'&&hash(seed,43)<.6)continue;out.push({id:`scatter-${tx}-${tz}-${i}`,kind,x,z,y,scale:.75+hash(seed,17)*.7,yaw:hash(seed,12)*Math.PI*2,seed});}return out;}
export function worldPlacements(){const out:Placement[]=[];for(let x=0;x<16;x++)for(let z=0;z<16;z++)out.push(...chunkPlacements(x,z));return out;}
