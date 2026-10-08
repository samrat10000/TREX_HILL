// @ts-nocheck
import * as THREE from 'three';
import type { KitApi } from './types';
THREE.ColorManagement.enabled = false;

/* Hill Kit â€” pure model factories (KIT). Extracted from hillkit.html. Built against three r147 (UMD globals). See HILLKIT_REFACTOR.md. */
'use strict';
/* ============================================================================
   KIT â€” pure model factories. No DOM, no renderer. Every builder returns a
   THREE.Group; animated ones expose group.userData.update(dt, t, env).
   env = { wind:Number, night:0..1, time:Number }
============================================================================ */
const RAW_KIT=(function(){
const T=THREE,TAU=Math.PI*2,V3=(x,y,z)=>new T.Vector3(x,y,z),HAS_DOM=typeof document!=='undefined';
let S=1;const seed=s=>{S=(Math.abs(Math.floor(s*9973))%2147483646)+1},rnd=()=>(S=S*16807%2147483647)/2147483647,rr=(a,b)=>a+(b-a)*rnd(),pick=a=>a[Math.floor(rnd()*a.length)%a.length];
function h3(x,y,z){const h=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return h-Math.floor(h)}
function noise3(x,y,z){const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),fx=x-ix,fy=y-iy,fz=z-iz,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),w=fz*fz*(3-2*fz),L=(a,b,t)=>a+(b-a)*t,h=(a,b,c)=>h3(ix+a,iy+b,iz+c);
 return L(L(L(h(0,0,0),h(1,0,0),u),L(h(0,1,0),h(1,1,0),u),v),L(L(h(0,0,1),h(1,0,1),u),L(h(0,1,1),h(1,1,1),u),v),w)}

/* ---------- materials ---------- */
const lamps=new Set(),glowSprites=new Set(),MC=new Map();
function mat(c,o={}){const k=c+'|'+JSON.stringify(o);let m=MC.get(k);if(m)return m;
 m=new T.MeshStandardMaterial({color:c,flatShading:!o.smooth,roughness:o.r??.86,metalness:o.m??0,transparent:o.op!==undefined,opacity:o.op??1,vertexColors:!!o.vc,side:o.ds?T.DoubleSide:T.FrontSide,depthWrite:o.op===undefined});
 if(o.e!==undefined){m.emissive=new T.Color(o.e);m.emissiveIntensity=o.ei??1;m.userData.base=o.ei??1;if(o.lamp)lamps.add(m)}
 MC.set(k,m);return m}
let _gt=null;function glowTex(){if(!HAS_DOM)return null;if(_gt)return _gt;const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),r=g.createRadialGradient(64,64,0,64,64,64);
 r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.18,'rgba(255,255,255,.55)');r.addColorStop(.5,'rgba(255,255,255,.12)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,128,128);_gt=new T.CanvasTexture(c);return _gt}
/* glow(parent,color,size,x,y,z,auto) â€” additive halo. auto=true follows night level */
function glow(p,color,size,x,y,z,auto=true,op=.9){const m=new T.SpriteMaterial({map:glowTex(),color,transparent:true,opacity:op,depthWrite:false,blending:T.AdditiveBlending,fog:false});
 const s=new T.Sprite(m);s.scale.setScalar(size);s.position.set(x,y,z);s.userData.base=op;s.renderOrder=5;if(auto)glowSprites.add(s);p.add(s);return s}

/* ---------- geometry helpers ---------- */
function add(p,g,m,x=0,y=0,z=0,rx=0,ry=0,rz=0,cast=true){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.rotation.set(rx,ry,rz);o.castShadow=cast;o.receiveShadow=true;p.add(o);return o}
const B=(w,h,d)=>new T.BoxGeometry(w,h,d),CY=(a,b,h,s=8,open=false,t0=0,tl=TAU)=>new T.CylinderGeometry(a,b,h,s,1,open,t0,tl),IC=(r,d=0)=>new T.IcosahedronGeometry(r,d),DO=r=>new T.DodecahedronGeometry(r,0);
function ext(pts,depth,bev=.03){const s=new T.Shape(pts.map(p=>new T.Vector2(p[0],p[1])));const d=Math.max(depth-2*bev,.002);
 const g=new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:bev>0,bevelThickness:bev,bevelSize:bev,bevelOffset:-bev,bevelSegments:1,curveSegments:6});g.translate(0,0,-d/2);g.computeVertexNormals();return g}
const rect=(x0,y0,x1,y1)=>[[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
const cbox=(w,h,d,b=.03)=>ext(rect(-w/2,-h/2,w/2,h/2),d,Math.min(b,w/3,h/3,d/3));
function beam(p,a,b,r,m,s=6){const d=new T.Vector3().subVectors(b,a),L=d.length(),o=add(p,CY(r,r,L,s),m);o.position.copy(a).addScaledVector(d,.5);o.quaternion.setFromUnitVectors(V3(0,1,0),d.normalize());return o}
function plank(p,a,b,w,h,m){/* box from a to b (x-y plane), oriented */const dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy);return add(p,B(w,L,h),m,(a[0]+b[0])/2,(a[1]+b[1])/2,a[2]||0,0,0,Math.atan2(dy,dx)-Math.PI/2)}
const lerp2=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
function rockGeo(r,detail,sq,sd,top,base){const g=IC(r,detail),p=g.attributes.position,v=new T.Vector3();
 for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const n=noise3(v.x*1.4+sd,v.y*1.4,v.z*1.4)*.55+noise3(v.x*3.2+sd,v.y*3.2+7,v.z*3.2)*.25;v.multiplyScalar(.72+n*.62);v.y*=sq;if(v.y<-r*.25*sq)v.y=-r*.25*sq;p.setXYZ(i,v.x,v.y,v.z)}
 g.computeVertexNormals();const n=g.attributes.normal,col=new Float32Array(p.count*3),c=new T.Color(),A=new T.Color(base),Bc=new T.Color(top);
 for(let i=0;i<p.count;i++){c.copy(A).lerp(Bc,T.MathUtils.smoothstep(n.getY(i),.35,.85));c.multiplyScalar(.92+h3(Math.round(p.getX(i)*9),Math.round(p.getY(i)*9),sd)*.14);col.set([c.r,c.g,c.b],i*3)}
 g.setAttribute('color',new T.BufferAttribute(col,3));return g}

/* ---------- cloth (verlet) â€” physically simulated flags ---------- */
function Cloth(w,h,nx,ny,color){const g=new T.PlaneGeometry(w,h,nx,ny),N=(nx+1)*(ny+1),P=new Float32Array(N*3),Q=new Float32Array(N*3),cons=[];
 const id=(i,j)=>j*(nx+1)+i,dx=w/nx,dy=h/ny;
 for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){if(i<nx)cons.push(id(i,j),id(i+1,j),dx);if(j<ny)cons.push(id(i,j),id(i,j+1),dy);if(i<nx&&j<ny)cons.push(id(i,j),id(i+1,j+1),Math.hypot(dx,dy))}
 const mesh=new T.Mesh(g,new T.MeshStandardMaterial({color,side:T.DoubleSide,roughness:.9,flatShading:true}));mesh.frustumCulled=false;mesh.castShadow=true;
 let init=false;const tmp=new T.Vector3();
 function update(dt,top,bot,wind,t){dt=Math.min(dt,1/30);const pos=g.attributes.position.array;
  if(!init){for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){const k=id(i,j)*3;tmp.copy(top).lerp(bot,j/ny);P[k]=Q[k]=tmp.x-i*dx*.2;P[k+1]=Q[k+1]=tmp.y;P[k+2]=Q[k+2]=tmp.z+i*dx}init=true}
  const d2=dt*dt;
  for(let j=0;j<=ny;j++)for(let i=1;i<=nx;i++){const k=id(i,j)*3,gust=1+.6*Math.sin(t*4.1+i*.9+j*.7)+.3*Math.sin(t*9.3+i);
   for(let a=0;a<3;a++){const v=(P[k+a]-Q[k+a])*.985;Q[k+a]=P[k+a];P[k+a]+=v+((a===1?-9.8:0)+wind[a]*gust)*d2}}
  for(let it=0;it<5;it++){for(let j=0;j<=ny;j++){tmp.copy(top).lerp(bot,j/ny);const k=id(0,j)*3;P[k]=tmp.x;P[k+1]=tmp.y;P[k+2]=tmp.z}
   for(let c=0;c<cons.length;c+=3){const a=cons[c]*3,b=cons[c+1]*3,r=cons[c+2],x=P[b]-P[a],y=P[b+1]-P[a+1],z=P[b+2]-P[a+2],l=Math.hypot(x,y,z)||1e-6,f=(l-r)/l*.5,pa=(a/3)%(nx+1)===0,pb=(b/3)%(nx+1)===0;
    const fa=pa?0:(pb?2*f:f),fb=pb?0:(pa?2*f:f);P[a]+=x*fa;P[a+1]+=y*fa;P[a+2]+=z*fa;P[b]-=x*fb;P[b+1]-=y*fb;P[b+2]-=z*fb}}
  pos.set(P);g.attributes.position.needsUpdate=true;g.computeVertexNormals()}
 return{mesh,update,reset(){init=false}}}

/* ---------- whip antenna: spring-damped tip driven by mount acceleration ---------- */
function Whip(len,segs,m,tip){const root=new T.Group(),nodes=[];let p=root;for(let i=0;i<segs;i++){const n=new T.Group();n.position.y=i?len/segs:0;p.add(n);add(n,CY(.008*(1-i/segs)+.004,.01*(1-i/segs)+.004,len/segs,5),m,0,len/segs/2,0);nodes.push(n);p=n}
 const top=new T.Group();top.position.y=len/segs;p.add(top);if(tip)top.add(tip);
 const st={ox:0,oz:0,vx:0,vz:0,p0:new T.Vector3(),p1:new T.Vector3(),p2:new T.Vector3(),n:0},wp=new T.Vector3(),q=new T.Quaternion(),inv=new T.Quaternion(),acc=new T.Vector3();
 function update(dt,wind){if(dt<=0)return;root.getWorldPosition(wp);st.p2.copy(st.p1);st.p1.copy(st.p0);st.p0.copy(wp);if(st.n++<3)return;
  acc.copy(st.p0).addScaledVector(st.p1,-2).add(st.p2).divideScalar(dt*dt);acc.clampLength(0,60);root.parent.getWorldQuaternion(q);inv.copy(q).invert();acc.applyQuaternion(inv);
  const k=60,c=3.2,g=.012;st.vx+=(-k*st.ox-c*st.vx-acc.x*g+wind*.02*Math.sin(performance.now()*.003))*dt;st.vz+=(-k*st.oz-c*st.vz-acc.z*g)*dt;st.ox+=st.vx*dt;st.oz+=st.vz*dt;
  st.ox=T.MathUtils.clamp(st.ox,-.6,.6);st.oz=T.MathUtils.clamp(st.oz,-.6,.6);for(const n of nodes){n.rotation.z=-st.ox*.5;n.rotation.x=st.oz*.5}}
 return{root,top,update}}

/* ============================================================================
   VEHICLES â€” profile-extruded bodies (no boxes), per-pixel mud/rust shader,
   parts kit, lights, suspension rig. Axes: +x forward, +y up, +z right.
============================================================================ */
const PAINTS={tangerine:0xd9622b,cherry:0xcd3a35,mustard:0xe2a72c,lime:0x93b23c,sage:0x7c9473,forest:0x2f5a3e,sky:0x7cc4d6,cobalt:0x4a74b4,cream:0xe9e0ca,slate:0x4b5566,olive:0x5f6b3c,rust:0x8c4b2b,rose:0xd8877f,ink:0x2b2d3a};
const ENGINES={inline6:{name:'Inline-6',hp:135,top:22,acc:5.2,cyl:6,pitch:1},v8:{name:'Big-block V8',hp:240,top:31,acc:8.2,cyl:8,pitch:.8,scoop:true},diesel:{name:'Turbo diesel',hp:160,top:20,acc:5.8,cyl:4,pitch:.6,climb:1.4},electric:{name:'Electric twin',hp:300,top:29,acc:10,cyl:0,pitch:2}};
const SUSP={soft:{k:26,c:2.6,travel:1.3,name:'Long-travel soft'},stock:{k:38,c:3.4,travel:1,name:'Stock'},stiff:{k:62,c:5.6,travel:.75,name:'Rally stiff'}};
const VDEF={paint:null,roof:'white',livery:'none',wear:.35,tires:'allterrain',rims:'steel',tireSize:1,lift:0,front:'bumper',rack:true,load:'none',roofLamps:false,lightbar:false,fog:false,snorkel:false,spare:true,ladder:false,flaps:true,cans:false,antenna:true,flag:'none',armor:false,engine:'inline6',susp:'stock',lights:'auto',num:7};
const VEH={
 ranger40:{name:'Ranger 40',blurb:'Short-wheelbase classic. The one on the box art.',L:3.85,W:1.66,wr:.42,ww:.3,axles:[1.15,-1.13],archR:.5,yb:.1,top:[[1.93,.5],[1.9,.74],[1.72,.8],[.45,.82],[-1.93,.82]],cab:{p:[[-1.86,.82],[-1.86,1.48],[.2,1.48],[.36,.82]],w:1.52,pil:[.45]},lights:'round',lightY:.62,grill:'slots',bump:0x2a2a2e,flare:'body',doors:[.3,-.55],def:{paint:'tangerine',roof:'white',wear:.45}},
 trek110:{name:'Trekker 110',blurb:'Long-wheelbase wagon with a flat roof for big loads.',L:4.45,W:1.79,wr:.43,ww:.3,axles:[1.45,-1.35],archR:.52,yb:.12,top:[[2.22,.48],[2.18,.78],[2.0,.84],[.85,.86],[-2.22,.86]],cab:{p:[[-2.16,.86],[-2.16,1.62],[.62,1.62],[.74,.86]],w:1.66,pil:[.28,.6]},lights:'round',lightY:.66,grill:'mesh',flare:'black',bump:0x1d1d20,doors:[.55,-.35],def:{paint:'sky',roof:'white',load:'cargo',roofLamps:true}},
 bronc:{name:'Bronc',blurb:'Two-door roadster with a removable roof and a big attitude.',L:3.9,W:1.76,wr:.43,ww:.31,axles:[1.12,-1.1],archR:.52,yb:.12,top:[[1.95,.5],[1.92,.78],[1.75,.82],[.5,.84],[-1.95,.84]],cab:{p:[[-1.9,.84],[-1.85,1.45],[.12,1.45],[.42,.84]],w:1.62,pil:[.45]},lights:'round',lightY:.64,grill:'bars',flare:'black',bump:0xd9d9d0,doors:[.35,-.6],def:{paint:'lime',roof:'white',front:'bullbar',lightbar:true,flag:'flag',tires:'mud'}},
 blazer:{name:'Trailblazer K',blurb:'Full-size two-door with room for two kayaks.',L:4.65,W:1.95,wr:.45,ww:.33,axles:[1.4,-1.35],archR:.55,yb:.12,top:[[2.32,.5],[2.3,.82],[2.15,.86],[.8,.88],[-2.32,.88]],cab:{p:[[-2.25,.88],[-2.18,1.5],[.25,1.5],[.78,.88]],w:1.8,pil:[.38,.68]},lights:'square',lightY:.66,grill:'slots',flare:null,bump:0xc8c8c8,doors:[.6,-.5],def:{paint:'cobalt',roof:'white',load:'kayak'}},
 cruiser60:{name:'Cruiser 60',blurb:'Boxy family wagon that will outlive everyone.',L:4.7,W:1.82,wr:.43,ww:.31,axles:[1.36,-1.35],archR:.53,yb:.12,top:[[2.35,.48],[2.32,.8],[2.12,.84],[.85,.86],[-2.35,.86]],cab:{p:[[-2.28,.86],[-2.22,1.56],[.35,1.56],[.8,.86]],w:1.68,pil:[.3,.6]},lights:'dual',lightY:.64,grill:'slots',flare:'body',bump:0x2a2a2e,doors:[.62,-.45],def:{paint:'cream',roof:'body',load:'cargo',roofLamps:true,wear:.5}},
 hauler70:{name:'Hauler 70',blurb:'Single-cab pickup. Cargo rides in the bed.',L:5.0,W:1.82,wr:.44,ww:.31,axles:[1.62,-1.5],archR:.54,yb:.12,top:[[2.5,.48],[2.46,.8],[2.25,.85],[1.0,.88],[-2.5,.88]],cab:{p:[[-.4,.88],[-.4,1.58],[.55,1.58],[.98,.88]],w:1.7,pil:[]},bed:[-2.42,-.5],lights:'square',lightY:.64,grill:'mesh',flare:'black',bump:0x1d1d20,doors:[.25],def:{paint:'cherry',roof:'body',load:'cargo',fog:true,rack:false}},
 van:{name:'Overland Van',blurb:'Split-window camper van. Slow, loved, unstoppable.',L:4.6,W:1.82,wr:.38,ww:.28,axles:[1.45,-1.38],archR:.47,yb:.12,top:[[2.3,.3],[2.33,.6],[2.25,.82],[2.0,.86],[-2.3,.86]],cab:{p:[[-2.28,.86],[-2.2,1.78],[1.55,1.78],[2.08,.86]],w:1.74,pil:[.12,.36,.6,.82]},lights:'round',lightY:.5,grill:'bars',flare:null,bump:0xe8e8e8,doors:[1.2,.2],def:{paint:'sky',roof:'white',livery:'twotone',load:'cargo',tires:'road',rims:'white',wear:.2,antenna:false}},
 army6:{name:'Mule 6Ã—6',blurb:'Ex-army six-wheeler with a canvas tilt.',L:6.9,W:2.35,wr:.56,ww:.42,axles:[2.45,-1.25,-2.6],archR:.66,yb:.2,top:[[3.45,.6],[3.4,1.05],[3.2,1.1],[2.1,1.12],[-3.45,1.12]],cab:{p:[[1.05,1.12],[1.05,2.05],[1.95,2.05],[2.2,1.12]],w:2.1,pil:[]},canvas:[-3.38,.92],lights:'round',lightY:.85,grill:'bars',flare:'black',bump:0x2a2a22,doors:[1.55],def:{paint:'olive',roof:'body',rack:false,tires:'mud',wear:.55,spare:false,cans:true,flag:'whip',engine:'diesel'}},
 expedition:{name:'Basecamp 4Ã—4',blurb:'Portal-axle expedition truck with a living box.',L:6.6,W:2.35,wr:.6,ww:.42,axles:[2.0,-1.75],archR:.72,yb:.22,top:[[3.3,.7],[3.25,1.12],[3.0,1.18],[2.2,1.2],[-3.3,1.2]],cab:{p:[[1.35,1.2],[1.35,2.2],[2.25,2.2],[2.7,1.2]],w:2.1,pil:[]},box:[-3.22,1.2],lights:'round',lightY:.9,grill:'bars',bump:0x1d1d20,flare:'black',doors:[1.9],def:{paint:'mustard',roof:'body',rack:false,tires:'mud',rims:'beadlock',ladder:true,lightbar:true,wear:.4,engine:'diesel'}},
 bus:{name:'Field Bus',blurb:'Retired school bus. Seats twenty, sleeps six.',L:9.2,W:2.45,wr:.5,ww:.36,axles:[3.0,-2.5],archR:.6,yb:.18,top:[[4.6,.55],[4.55,1.0],[4.3,1.06],[3.35,1.1],[-4.6,1.14]],cab:{p:[[-4.55,1.14],[-4.5,2.55],[3.05,2.55],[3.3,1.12]],w:2.38,pil:[.07,.15,.24,.33,.42,.51,.6,.69,.78,.87]},lights:'round',lightY:.8,grill:'bars',bump:0x1d1d20,flare:null,doors:[],def:{paint:'mustard',roof:'body',livery:'stripe',rack:false,tires:'road',spare:false,wear:.45,antenna:false,engine:'diesel'}},
 scrapjaw:{name:'Scrapjaw',blurb:'Wasteland pickup. Welded plate, ram and grates.',L:5.0,W:1.82,wr:.44,ww:.31,axles:[1.62,-1.5],archR:.54,yb:.12,top:[[2.5,.48],[2.46,.8],[2.25,.85],[1.0,.88],[-2.5,.88]],cab:{p:[[-.4,.88],[-.4,1.58],[.55,1.58],[.98,.88]],w:1.7,pil:[]},bed:[-2.42,-.5],lights:'square',lightY:.64,grill:'mesh',flare:'black',bump:0x1d1d20,doors:[.25],def:{paint:'rust',roof:'body',armor:true,wear:.95,front:'ram',tires:'mud',rims:'black',lightbar:true,load:'cargo',flag:'flag',rack:false,lift:.12,engine:'v8'}}
};

/* paint material: per-pixel mud line, rust blooms and grime in vehicle space */
const GLSL_N=`float hh3(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float nn3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(hh3(i),hh3(i+vec3(1,0,0)),f.x),mix(hh3(i+vec3(0,1,0)),hh3(i+vec3(1,1,0)),f.x),f.y),mix(mix(hh3(i+vec3(0,0,1)),hh3(i+vec3(1,0,1)),f.x),mix(hh3(i+vec3(0,1,1)),hh3(i+vec3(1,1,1)),f.x),f.y),f.z);}`;
function paintMat(color,wear,uInv,mudTop,band,r=.62){const m=new T.MeshStandardMaterial({color,roughness:r,metalness:.05,flatShading:true});
 const U={uInv,uWear:{value:wear},uMud:{value:new T.Color(0x5e4630)},uRust:{value:new T.Color(0x7d3f1f)},uTop:{value:mudTop},uBand:{value:band}};m.userData.U=U;
 m.onBeforeCompile=s=>{Object.assign(s.uniforms,U);
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nuniform mat4 uInv;varying vec3 vLoc;').replace('#include <begin_vertex>','#include <begin_vertex>\nvLoc=(uInv*modelMatrix*vec4(transformed,1.)).xyz;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nuniform float uWear,uTop,uBand;uniform vec3 uMud,uRust;varying vec3 vLoc;\n'+GLSL_N).replace('#include <color_fragment>',`#include <color_fragment>
  float n1=nn3(vLoc*3.1)*.6+nn3(vLoc*9.7)*.4;
  if(uBand>-5.&&vLoc.y<uBand)diffuseColor.rgb*=.62;
  float mh=uTop+(n1-.5)*.55+uWear*.25;float md=smoothstep(mh+.04,mh-.06,vLoc.y)*clamp(uWear*1.25,0.,1.);
  diffuseColor.rgb=mix(diffuseColor.rgb,uMud*(.75+.5*n1),md*.9);
  float rs=smoothstep(1.-uWear*.33,1.03-uWear*.33,nn3(vLoc*5.3+17.));diffuseColor.rgb=mix(diffuseColor.rgb,uRust*(.7+.6*n1),rs*.9);
  diffuseColor.rgb*=1.-.16*uWear*(1.-n1);`)};
 m.customProgramCacheKey=()=>'paint';return m}

function numberTex(n,col){if(!HAS_DOM)return null;const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');g.fillStyle='#f4efe4';g.beginPath();g.arc(64,64,60,0,TAU);g.fill();g.fillStyle=col;g.font='600 78px Fredoka, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(String(n),64,70);const t=new T.CanvasTexture(c);return t}

function bodyPts(s,archR,ay){const pts=[],L2=s.L/2,yb=s.yb;pts.push([-L2+.06,yb]);
 for(const ax of [...s.axles].sort((a,b)=>a-b)){const dy=yb-ay;if(dy>=archR)continue;const a0=Math.asin(Math.max(-1,Math.min(1,dy/archR)));for(let i=0;i<=8;i++){const a=(Math.PI-a0)+(2*a0-Math.PI)*i/8;pts.push([ax+Math.cos(a)*archR,ay+Math.sin(a)*archR])}}
 pts.push([L2-.06,yb]);for(const p of s.top)pts.push(p);pts.push([-L2,yb+.08]);return pts}

/* wheel(r,w,cfg): tyre lathe + tread kit + rim kit. Returns {node,steer,spin} */
function wheel(r,w,cfg,left){const node=new T.Group(),steer=new T.Group(),hold=new T.Group(),spin=new T.Group();node.add(steer);steer.add(hold);hold.add(spin);if(left)hold.rotation.y=Math.PI;
 const tm=mat(0x26262b,{r:.95,ds:true}),lug=mat(0x2c2c31,{r:.95}),h=w/2,ri=r*.63;
 const pr=[[ri,-h*.92],[r*.9,-h],[r,-h*.72],[r,h*.72],[r*.9,h],[ri,h*.92]].map(p=>new T.Vector2(p[0],p[1]));
 const tg=new T.LatheGeometry(pr,20);tg.rotateX(Math.PI/2);add(spin,tg,tm);
 const tread=cfg.tires;
 if(tread==='allterrain'||tread==='chains'){for(let i=0;i<18;i++){const a=i/18*TAU,z=(i%2?.18:-.18)*w;add(spin,B(.06,.09,w*.42),lug,Math.cos(a)*r,Math.sin(a)*r,z,0,0,a)}}
 if(tread==='mud'){for(let i=0;i<12;i++){const a=i/12*TAU;for(const sgn of[-1,1]){const o=add(spin,B(.09,.13,w*.4),lug,Math.cos(a+sgn*.06)*r*1.01,Math.sin(a+sgn*.06)*r*1.01,sgn*w*.26,0,0,a);o.rotation.y=sgn*.35}
  add(spin,B(.05,.07,.06),lug,Math.cos(a)*(r*.93),Math.sin(a)*(r*.93),h*1.02,0,0,a);add(spin,B(.05,.07,.06),lug,Math.cos(a)*(r*.93),Math.sin(a)*(r*.93),-h*1.02,0,0,a)}}
 if(tread==='sand'){for(let i=0;i<10;i++){const a=i/10*TAU;add(spin,B(.12,.035,w*.95),lug,Math.cos(a)*r,Math.sin(a)*r,0,0,0,a)}}
 if(tread==='road'){add(spin,new T.TorusGeometry(r*.78,.012,3,20),mat(0xe9e5da),0,0,h*.93)}
 if(tread==='chains'){const cm=mat(0xb8bcc4,{r:.35,m:.7});for(let i=0;i<8;i++){const a=i/8*TAU;const o=add(spin,CY(.012,.012,w*1.05,4),cm,Math.cos(a)*(r+.02),Math.sin(a)*(r+.02),0,Math.PI/2,0,0)}
  add(spin,new T.TorusGeometry(r*.95,.012,3,24),cm,0,0,h*.98);add(spin,new T.TorusGeometry(r*.95,.012,3,24),cm,0,0,-h*.98)}
 const rimC={steel:0xd6d3cb,spoke:0x8d9099,beadlock:0x2b2c31,white:0xf2efe6,black:0x1f2024}[cfg.rims]||0xd6d3cb,rm=mat(rimC,{r:.45,m:.35});
 const disc=CY(ri*.98,ri*.98,w*.5,14);disc.rotateX(Math.PI/2);add(spin,disc,rm,0,0,h*.18);
 add(spin,CY(ri*.32,ri*.4,.08,8).rotateX(Math.PI/2),mat(0x9a9aa0,{r:.4,m:.5}),0,0,h*.5);
 if(cfg.rims==='spoke')for(let i=0;i<6;i++){const a=i/6*TAU;add(spin,B(ri*.75,.05,.05),rm,Math.cos(a)*ri*.5,Math.sin(a)*ri*.5,h*.48,0,0,a)}
 else for(let i=0;i<6;i++){const a=i/6*TAU+.26;add(spin,CY(.06,.06,.03,6).rotateX(Math.PI/2),mat(0x3a3a40),Math.cos(a)*ri*.62,Math.sin(a)*ri*.62,h*.44)}
 if(cfg.rims==='beadlock'){add(spin,new T.TorusGeometry(ri*.98,.03,4,20),mat(0xc9c9cf,{r:.3,m:.7}),0,0,h*.45);for(let i=0;i<16;i++){const a=i/16*TAU;add(spin,B(.025,.025,.03),mat(0xe7e7ea,{m:.6,r:.3}),Math.cos(a)*ri*.98,Math.sin(a)*ri*.98,h*.5)}}
 for(let i=0;i<5;i++){const a=i/5*TAU;add(spin,CY(.014,.014,.04,5).rotateX(Math.PI/2),mat(0xd8d8dc,{m:.6,r:.3}),Math.cos(a)*ri*.18,Math.sin(a)*ri*.18,h*.56)}
 return{node,steer,spin,dir:left?-1:1}}

function vehicle(key,o={}){const s=VEH[key],cfg=Object.assign({},VDEF,s.def,o);seed(key.length*3.1+cfg.num);
 const root=new T.Group(),chassis=new T.Group(),body=new T.Group();root.add(chassis);chassis.add(body);root.name=s.name;
 const ts=cfg.tireSize,wr=s.wr*ts,lift=cfg.lift,ay=-lift;body.position.y=lift;chassis.position.y=wr;
 const uInv={value:new T.Matrix4()},paintC=new T.Color(PAINTS[cfg.paint]??PAINTS.tangerine);
 const roofC=cfg.roof==='white'?new T.Color(0xf1ede4):cfg.roof==='black'?new T.Color(0x2a2b30):paintC;
 const L2=s.L/2,W2=s.W/2,belt=s.top[s.top.length-1][1],[rb,rt,ft,fb]=s.cab.p,cw=s.cab.w,bY=s.yb+.08,hoodY=s.top[2][1];
 const band=cfg.livery==='safari'?s.yb+(belt-s.yb)*.45+lift:-9;
 const PM=paintMat(paintC,cfg.wear,uInv,.16+lift,band),RM=cfg.roof==='body'?PM:paintMat(roofC,cfg.wear*.45,uInv,-5,-9,.7);
 const dark=mat(0x232327,{r:.9}),tube=mat(0x1e1f23,{r:.5,m:.4}),chrome=mat(0xdcdcdc,{r:.25,m:.7}),glass=mat(0x22323e,{r:.2,m:.1}),bm=mat(s.bump,{r:.55,m:.25}),plastic=mat(0x2a2a2e,{r:.8});
 const fX=y=>{const a=s.top[0],b=s.top[1];return y<=a[1]?a[0]:a[0]+(b[0]-a[0])*Math.min(1,(y-a[1])/(b[1]-a[1]))};
 const archR=Math.min(s.archR*Math.max(1,ts*.97)+lift*.12,Math.min(...s.top.slice(1).map(p=>p[1]))-ay-.08);
 const rig={root,chassis,body,spec:s,cfg,wr,wheels:[],spots:[],hg:[],tg:[],aux:[],whips:[],cloths:[],world:[],uInv,PM,RM,engine:ENGINES[cfg.engine],susp:SUSP[cfg.susp]};
 /* body shell + wheel wells + flares */
 add(body,ext(bodyPts(s,archR,ay),s.W,.06),PM);
 for(const ax of s.axles){add(body,CY(archR-.02,archR-.02,s.W-.1,12,true,Math.PI/2,Math.PI).rotateX(Math.PI/2),mat(0x141416,{ds:true}),ax,ay,0,0,0,0,false);
  if(s.flare)for(const z of[-1,1])add(body,new T.TorusGeometry(archR+.012,.075,3,12,Math.PI),s.flare==='body'?PM:plastic,ax,ay,z*(W2+.01))}
 /* bumpers + front kit */
 add(body,cbox(.2,.22,s.W+.06,.04),bm,L2+.06,bY,0);add(body,cbox(.2,.22,s.W+.02,.04),bm,-L2-.06,bY,0);
 if(cfg.front==='bullbar'){const P=(z,y,x=L2+.28)=>V3(x,y,z);for(const z of[-.5,.5]){beam(body,P(z,bY),P(z,s.top[1][1]+.08,L2+.26),.035,tube);beam(body,P(z,bY+.08),P(z*1.6,bY+.02,L2+.16),.03,tube)}
  beam(body,P(-.5,s.top[1][1]+.08,L2+.26),P(.5,s.top[1][1]+.08,L2+.26),.035,tube);beam(body,P(-.5,(bY+s.top[1][1])/2+.05,L2+.27),P(.5,(bY+s.top[1][1])/2+.05,L2+.27),.03,tube);
  add(body,cbox(.2,.17,.55,.03),dark,L2+.2,bY+.02,0);add(body,B(.05,.08,.03),chrome,L2+.33,bY,0)}
 if(cfg.front==='ram'){const rm=mat(0x5d5852,{m:.4,r:.6});add(body,ext([[L2,bY-.18],[L2+.6,bY-.08],[L2+.1,s.top[1][1]+.05]],s.W+.12,.03),rm);
  for(let i=0;i<5;i++)add(body,CY(0,.05,.3,5),mat(0x8a8780,{m:.5,r:.4}),L2+.66,bY-.05,(i-2)*.38,0,0,-Math.PI/2)}
 /* grille + lights */
 const gw=2*(W2-.24)-.32,gh=Math.max(.16,s.top[1][1]-bY-.22),gy=bY+.14+gh/2,gx=fX(gy)+.012;
 add(body,B(.03,gh,gw),mat(0x18181b),gx,gy,0);
 if(s.grill==='slots')for(let i=0;i<4;i++)add(body,B(.03,.028,gw),chrome,gx+.012,gy-gh/2+gh*(i+.5)/4,0);
 if(s.grill==='bars')for(let i=0;i<7;i++)add(body,B(.03,gh,.03),chrome,gx+.012,gy,-gw/2+gw*(i+.5)/7);
 if(s.grill==='mesh'){for(const y of[-1,1])add(body,B(.035,.03,gw+.04),chrome,gx+.012,gy+y*gh/2,0);for(const z of[-1,1])add(body,B(.035,gh,.03),chrome,gx+.012,gy,z*gw/2)}
 const L=new T.MeshStandardMaterial({color:0xfff4dc,emissive:0xffe0a6,emissiveIntensity:0,roughness:.2,flatShading:true}),lx=fX(s.lightY)+.01;rig.lens=L;
 const lightAt=(z,r)=>{add(body,new T.TorusGeometry(r+.012,.024,4,14),chrome,lx,s.lightY,z,0,Math.PI/2,0);add(body,CY(r,r,.04,14).rotateZ(Math.PI/2),L,lx,s.lightY,z);rig.hg.push(glow(body,0xffe4b0,r*9,lx+.08,s.lightY,z,false,0))};
 for(const sz of[-1,1]){const z=sz*(W2-.24);
  if(s.lights==='round')lightAt(z,.11);else if(s.lights==='dual'){lightAt(sz*(W2-.17),.075);lightAt(sz*(W2-.36),.075)}
  else{add(body,cbox(.05,.17,.27,.015),chrome,lx,s.lightY,z);add(body,B(.05,.13,.23),L,lx+.01,s.lightY,z);rig.hg.push(glow(body,0xffe4b0,1,lx+.08,s.lightY,z,false,0))}
  add(body,B(.04,.05,.11),mat(0xf0a030,{e:0xc07010,ei:.35}),fX(bY+.15)+.015,bY+.17,sz*(W2-.13));
  const sp=new T.SpotLight(0xffe6c0,0,36,.44,.55,1.1);sp.decay=0;sp.position.set(lx,s.lightY,z);sp.target.position.set(lx+12,-1.4,z*1.8);body.add(sp,sp.target);rig.spots.push(sp)}
 const TL=new T.MeshStandardMaterial({color:0xb3221c,emissive:0xff2a1a,emissiveIntensity:.15,roughness:.3,flatShading:true});rig.tail=TL;
 for(const sz of[-1,1]){add(body,B(.04,.17,.11),TL,-L2-.008,s.yb+.42,sz*(W2-.11));rig.tg.push(glow(body,0xff3020,.6,-L2-.08,s.yb+.42,sz*(W2-.11),false,0))}
 /* doors, handles, mirrors, wipers */
 for(const dx of s.doors){add(body,B(.012,belt-s.yb-.16,s.W+.006),mat(0x1a1a1c),dx,(belt+s.yb)/2+.02,0,0,0,0,false);add(body,B(.1,.025,s.W+.03),chrome,dx-.18,belt-.12,0,0,0,0,false)}
 for(const sz of[-1,1]){beam(body,V3(fb[0]-.06,belt+.08,sz*cw/2),V3(fb[0]-.06,belt+.14,sz*(cw/2+.17)),.012,tube);add(body,cbox(.04,.17,.12,.012),plastic,fb[0]-.06,belt+.2,sz*(cw/2+.2))}
 for(const z of[-.28,.22])add(body,B(.02,.02,.42),mat(0x111113),fb[0]-.04,fb[1]+.05,z,0,.25,0);
 /* cab: glass greenhouse + roof slab + pillars */
 const pilM=cfg.livery==='twotone'?RM:PM;
 add(body,ext([rb,fb,ft,rt],cw,.03),glass);
 add(body,ext([[rt[0]-.03,rt[1]],[ft[0]+.03,ft[1]],[ft[0]+.02,ft[1]+.07],[rt[0]-.02,rt[1]+.07]],cw+.06,.025),RM);
 const pil=(a,b,wd=.08)=>{for(const sz of[-1,1]){const dx=b[0]-a[0],dy=b[1]-a[1],Ln=Math.hypot(dx,dy);add(body,B(wd,Ln+.02,.05),pilM,(a[0]+b[0])/2,(a[1]+b[1])/2,sz*(cw/2+.005),0,0,Math.atan2(dy,dx)-Math.PI/2)}};
 pil(fb,ft);pil(rb,rt,.12);for(const t of s.cab.pil)pil(lerp2(rb,fb,t),lerp2(rt,ft,t),.07);
 add(body,B(.07,.06,cw+.04),pilM,ft[0],ft[1]+.02,0);add(body,B(.09,.05,cw),pilM,fb[0],fb[1]+.02,0);
 const roofTop=Math.max(rt[1],ft[1])+.07;
 if(engineScoop(cfg))add(body,cbox(.62,.1,.5,.03),PM,(fb[0]+L2)/2,hoodY+.05,0);
 /* pickup bed / army canvas / expedition box */
 if(s.bed){const[x0,x1]=s.bed;add(body,B(x1-x0,.02,s.W-.22),mat(0x2c2622),(x0+x1)/2,belt+.002,0,0,0,0,false);for(const z of[-1,1])add(body,B(x1-x0,.04,.07),plastic,(x0+x1)/2,belt+.02,z*(W2-.05));add(body,B(.006,.012,s.W-.2),mat(0x1a1a1c),-L2-.003,belt-.12,0)}
 if(s.canvas){const[x0,x1]=s.canvas,len=x1-x0,cm=mat(0x6d7248,{r:1}),cr=mat(0x575c3a,{r:1});add(body,cbox(len,.72,s.W,.04),cm,(x0+x1)/2,belt+.36,0);
  const hc=CY(W2,W2,len,14,false,0,Math.PI).rotateZ(Math.PI/2);hc.scale(1,.62,1);add(body,hc,cm,(x0+x1)/2,belt+.7,0);
  for(let i=0;i<5;i++){const x=x0+.08+i*(len-.16)/4,rib=CY(W2+.015,W2+.015,.07,14,false,0,Math.PI).rotateZ(Math.PI/2);rib.scale(1,.62,1);add(body,rib,cr,x,belt+.7,0);add(body,B(.07,.72,s.W+.03),cr,x,belt+.36,0)}}
 if(s.box){const x0=s.box[0],x1=s.box[1],len=x1-x0,h=2.0,BM=paintMat(new T.Color(0xece6d6),cfg.wear*.5,uInv,-5,-9,.7),by=belt+.06+h/2;add(body,cbox(len,h,s.W,.09),BM,(x0+x1)/2,by,0);
  for(const z of[-1,1]){for(let i=0;i<3;i++){const x=x0+.7+i*(len-1.4)/2;add(body,cbox(.72,.48,.04,.015),plastic,x,by+.25,z*(W2+.01));add(body,B(.62,.38,.04),mat(0x2b3c48,{r:.2,e:0xffb867,ei:.0,lamp:true}),x,by+.25,z*(W2+.02))}}
  add(body,cbox(.72,1.5,.03,.01),BM,x0+1.2,by-.15,W2+.01);add(body,B(.05,.06,.12),chrome,x0+1.5,by-.15,W2+.04);
  glow(body,0xffc27a,1.2,x0+1.2,by+.75,W2+.25,true,.9);add(body,B(.16,.08,.08),mat(0xfff0d0,{e:0xffc070,ei:1.4,lamp:true}),x0+1.2,by+.72,W2+.06);
  add(body,CY(.09,.09,len-.4,8).rotateZ(Math.PI/2),mat(0x8a8d93,{r:.6}),(x0+x1)/2,by+h/2-.14,W2+.1);
  for(const x of[x0+.9,x0+2.2])add(body,B(1.15,.04,.95),mat(0x1d2c4a,{r:.3,m:.4}),x,by+h/2+.04,-.3);add(body,cbox(.6,.12,.6,.03),BM,x1-.7,by+h/2+.06,.4)}
 /* livery */
 const accent=paintC.getHSL({}).l>.55?0x2b2d3a:0xf2ece0;
 if(cfg.livery==='stripe'||cfg.livery==='rally'){for(const z of[-1,1])add(body,B(s.L-.5,.07,.004),mat(key==='bus'?0x1b1b1c:accent),-.05,belt-.2,z*(W2+.003),0,0,0,false);if(key==='bus')for(const z of[-1,1])add(body,B(s.L-.5,.05,.004),mat(0x1b1b1c),-.05,belt-.42,z*(W2+.003),0,0,0,false)}
 if(cfg.livery==='rally'){for(const z of[-.16,.16])add(body,B(L2-fb[0]-.15,.004,.11),mat(accent),(fb[0]+L2)/2,hoodY+.006,z,0,0,0,false);
  const tex=numberTex(cfg.num,'#'+paintC.getHexString());if(tex){const nm=new T.MeshStandardMaterial({map:tex,transparent:true,alphaTest:.5,roughness:.6});for(const z of[-1,1]){const pl=add(body,new T.CircleGeometry(.24,24),nm,(s.doors[0]??0)-.35,(belt+s.yb)/2+.02,z*(W2+.008),0,z<0?Math.PI:0,0,false)}}}
 /* roof rack + loads */
 const rx0=rt[0]+.12,rx1=ft[0]-.1,rz=cw/2-.03,ry=roofTop+.13,hasRack=cfg.rack&&rx1-rx0>.6&&!s.box;
 if(hasRack){const P=(x,z,y=ry)=>V3(x,y,z);for(const z of[-rz,rz]){beam(body,P(rx0,z),P(rx1,z),.024,tube);beam(body,P(rx0,z,ry+.1),P(rx1,z,ry+.1),.019,tube)}
  for(let i=0;i<=4;i++){const x=rx0+(rx1-rx0)*i/4;beam(body,P(x,-rz),P(x,rz),.02,tube);for(const z of[-rz,rz]){beam(body,P(x,z,roofTop),P(x,z),.02,tube);beam(body,P(x,z),P(x,z,ry+.1),.016,tube)}}
  for(const x of[rx0,rx1])beam(body,P(x,-rz,ry+.1),P(x,rz,ry+.1),.019,tube)}
 let la=s.bed?{x0:s.bed[0]+.15,x1:s.bed[1]-.1,y:belt,z:W2-.22}:{x0:s.box?s.box[0]+.3:rx0,x1:s.box?s.box[1]-.3:rx1,y:s.box?belt+2.12:(hasRack?ry+.03:roofTop),z:rz};
 if(s.canvas)la={x0:s.canvas[0]+.2,x1:s.canvas[1]-.2,y:belt+1.42,z:W2-.3};
 if(cfg.load==='cargo')cargo(body,la.x0,la.x1,la.y,la.z);
 if(cfg.load==='kayak'){const len=Math.min(3.6,la.x1-la.x0+1.4),xc=(la.x0+la.x1)/2;for(const[z,c]of[[-la.z*.5,0xb6d43a],[la.z*.5,0xd8442e]]){const g=new T.SphereGeometry(1,16,6);g.scale(len/2,.17,.3);add(body,g,mat(c,{r:.5}),xc,la.y+.15,z);const ck=new T.TorusGeometry(.2,.035,4,14);ck.scale(1.6,1,1);add(body,ck,mat(0x1c1c1f),xc+.1,la.y+.31,z,Math.PI/2,0,0);add(body,B(.06,.02,la.z*2.1),mat(0x111),xc+(z<0?.6:-.6),la.y+.33,0)}}
 if(cfg.load==='tent'&&!s.bed){const xc=(la.x0+la.x1)/2,y=la.y,cv=mat(0xd9a548,{r:1}),fly=mat(0x3b5a52,{r:1});add(body,cbox(1.3,.12,cw+.1,.03),mat(0x2a2b2f),xc+.2,y+.06,0);
  add(body,ext([[xc+.85,y+.12],[xc-1.55,y+.12],[xc-1.55,y+.95],[xc-.35,y+1.15],[xc+.85,y+.55]],cw+.02,.04),cv);
  add(body,ext([[xc+.95,y+.5],[xc-.35,y+1.2],[xc-1.65,y+.98],[xc-1.65,y+.9],[xc-.35,y+1.1],[xc+.9,y+.45]],cw+.2,.02),fly);
  for(const z of[-1,1])add(body,B(.7,.4,.01),mat(0x1f2a2e),xc-.6,y+.62,z*(cw/2+.02));
  const gy=-wr-lift+.04,lx0=xc-1.5;beam(body,V3(lx0,y+.12,-.25),V3(lx0-.55,gy,-.25),.022,chrome);beam(body,V3(lx0,y+.12,.25),V3(lx0-.55,gy,.25),.022,chrome);for(let i=1;i<7;i++){const t=i/7;beam(body,V3(lx0-.55*t,y+.12+(gy-y-.12)*t,-.25),V3(lx0-.55*t,y+.12+(gy-y-.12)*t,.25),.015,chrome)}}
 /* lights kit */
 const AUX=new T.MeshStandardMaterial({color:0xfff6e6,emissive:0xfff0d2,emissiveIntensity:0,roughness:.2,flatShading:true});rig.auxMat=AUX;
 if(cfg.roofLamps&&hasRack){for(const z of[-.45,-.15,.15,.45]){const zz=z*cw/1.7;add(body,CY(.085,.095,.09,10).rotateZ(Math.PI/2),plastic,rx1+.04,ry+.2,zz);add(body,CY(.075,.075,.02,10).rotateZ(Math.PI/2),AUX,rx1+.09,ry+.2,zz);rig.aux.push(glow(body,0xfff0d0,.75,rx1+.16,ry+.2,zz,false,0))}}
 if(cfg.lightbar){const lbx=s.box?ft[0]-.05:ft[0]-.02,lby=roofTop+.09;add(body,cbox(.1,.11,cw*.92,.02),plastic,lbx,lby,0);for(let i=0;i<6;i++){const z=(i-2.5)*cw*.92/6.2;add(body,B(.02,.07,cw*.12),AUX,lbx+.05,lby,z);rig.aux.push(glow(body,0xf4f6ff,.55,lbx+.12,lby,z,false,0))}}
 if(cfg.fog)for(const z of[-.5,.5]){add(body,CY(.07,.08,.06,10).rotateZ(Math.PI/2),plastic,L2+.18,bY+.02,z);add(body,CY(.06,.06,.02,10).rotateZ(Math.PI/2),AUX,L2+.22,bY+.02,z);rig.aux.push(glow(body,0xffd890,.6,L2+.28,bY+.02,z,false,0))}
 if(rig.aux.length){const sp=new T.SpotLight(0xfff2dc,0,42,.7,.7,1.1);sp.decay=0;sp.position.set(ft[0],roofTop+.2,0);sp.target.position.set(ft[0]+14,-1,0);body.add(sp,sp.target);rig.auxSpot=sp}
 /* body kit */
 if(cfg.snorkel){const a=V3(fb[0]+.28,s.yb+.32,W2+.05),b=V3(fb[0]+.22,belt+.02,W2+.05),c=V3(ft[0]+.04,roofTop-.08,cw/2+.08);beam(body,a,b,.05,plastic,8);beam(body,b,c,.05,plastic,8);add(body,cbox(.2,.12,.11,.03),plastic,c.x+.06,c.y+.05,c.z)}
 if(cfg.spare&&!s.bed&&!s.box&&!s.canvas){const sw=wheel(wr*.92,s.ww*ts,cfg,false);sw.node.position.set(-L2-.2,s.yb+.42,0);sw.node.rotation.y=Math.PI/2;body.add(sw.node)}
 if(cfg.ladder){const lx=-L2-.06,y0=s.yb+.32,y1=(s.box?belt+2.1:roofTop)+.05;for(const z of[.3,.7])beam(body,V3(lx,y0,z),V3(lx,y1,z),.018,chrome);for(let y=y0+.15;y<y1;y+=.28)beam(body,V3(lx,y,.3),V3(lx,y,.7),.013,chrome)}
 if(cfg.flaps)for(const ax of s.axles)for(const z of[-1,1])add(body,B(.02,.36,s.ww*ts+.06),mat(0x1b1b1d),ax-archR-.03,ay-.12,z*(W2-.14));
 if(cfg.cans)for(const[z,c]of[[-1,0x4a6a3a],[-.7,0xc23b2b]])add(body,cbox(.16,.42,.3,.03),mat(c),-L2-.15,s.yb+.5,z*(W2-.3));
 add(body,CY(.04,.04,.25,6).rotateZ(Math.PI/2),mat(0x3a3a3e,{m:.5,r:.5}),-L2-.05,s.yb-.04,-(W2-.35));rig.exhaust=V3(-L2-.2,s.yb-.04+lift,-(W2-.35));
 if(cfg.antenna){const w=Whip(1.5,4,tube,null);w.root.position.set(fb[0]+.3,belt+.02,-(W2-.08));body.add(w.root);rig.whips.push(w)}
 if(cfg.flag!=='none'){const big=cfg.flag==='flag',w=Whip(big?2.2:2.7,5,tube,null);w.root.position.set(-L2+.25,belt+.02,-(W2+.03));body.add(w.root);rig.whips.push(w);
  const cl=Cloth(big?.72:.5,big?.46:.2,8,5,big?0xe8452c:0xe2b23a);rig.cloths.push({cl,w,drop:big?.46:.2});rig.world.push(cl.mesh)}
 if(cfg.armor){const gm=mat(0x3d3a36,{m:.5,r:.5}),pm=[mat(0x6b665e,{m:.35,r:.55}),mat(0x7a4a2c,{r:.7}),mat(0x5a6150,{m:.3,r:.6})];
  for(const sz of[-1,1]){const z=sz*(cw/2+.045);for(let t=.08;t<.95;t+=.12){const a=lerp2(rb,fb,t),b=lerp2(rt,ft,t);beam(body,V3(a[0],a[1],z),V3(b[0],b[1],z),.012,gm,4)}for(const k of[.35,.7]){const a=lerp2(rb,rt,k),b=lerp2(fb,ft,k);beam(body,V3(a[0],a[1],z),V3(b[0],b[1],z),.012,gm,4)}}
  for(let i=-3;i<=3;i++){const z=i*cw/7.5;beam(body,V3(fb[0]+.04,fb[1]+.02,z),V3(ft[0]+.04,ft[1]-.02,z),.012,gm,4)}
  for(let i=0;i<4;i++){const w=rr(.4,.75),h=rr(.25,.45);add(body,B(w,h,s.W+.025),pick(pm),rr(-L2+.5,L2-.6),rr(s.yb+.2,belt-.25),0,0,0,rr(-.12,.12),false)}
  for(const z of[-.35,.35])beam(body,V3(rb[0]-.12,belt,z),V3(rb[0]-.12,roofTop+.55,z),.045,mat(0x4a3a30,{m:.4,r:.6}),8)}
 /* wheels */
 for(const ax of s.axles)for(const sz of[-1,1]){const wz=sz*(W2-s.ww*.3+lift*.12),wh=wheel(wr,s.ww*ts,cfg,sz<0);wh.node.position.set(ax,wr,wz);root.add(wh.node);rig.wheels.push({...wh,x:ax,z:wz,front:ax===Math.max(...s.axles),y:wr,v:0,c:0})}
 /* behaviour */
 rig.level=0;rig.brake=0;
 rig.setLights=(lv,brake=0)=>{const on=cfg.lights==='on'?1:cfg.lights==='off'?0:lv;rig.level=on;
  L.emissiveIntensity=on*2.4;for(const g of rig.hg)g.material.opacity=on*.85;for(const sp of rig.spots)sp.intensity=on*2.6*Math.PI;
  AUX.emissiveIntensity=on*2.6;for(const g of rig.aux)g.material.opacity=on*.8;if(rig.auxSpot)rig.auxSpot.intensity=on*1.8*Math.PI;
  TL.emissiveIntensity=.15+on*.8+brake*2.4;for(const g of rig.tg)g.material.opacity=Math.min(1,on*.45+brake*.9)};
 rig.setSpots=v=>{for(const sp of rig.spots)sp.visible=v;if(rig.auxSpot)rig.auxSpot.visible=v};
 const wv=new T.Vector3(),tp=new T.Vector3(),bt=new T.Vector3();
 rig.update=(dt,t,env)=>{chassis.updateMatrixWorld(true);uInv.value.copy(chassis.matrixWorld).invert();const wind=env.wind||0;
  for(const w of rig.whips)w.update(dt,wind);
  wv.set(-1.5-wind*2.5,0,1.2+wind*1.2);for(const c of rig.cloths){c.w.top.getWorldPosition(tp);bt.set(0,-c.drop,0);c.w.top.localToWorld(bt);c.cl.update(dt,tp,bt,[wv.x,0,wv.z],t)}};
 root.userData.rig=rig;root.userData.update=(dt,t,env)=>rig.update(dt,t,env);
 return rig}
function engineScoop(cfg){return ENGINES[cfg.engine]&&ENGINES[cfg.engine].scoop}

function cargo(p,x0,x1,y,zw){const cols=[0x3d6b4a,0xc94b3a,0x2f4a6b,0xd9a441,0x5a4a3a];let x=x0+.18;
 while(x<x1-.3){const r=rnd();
  if(r<.35){const w=rr(.5,.8),d=rr(.32,.46);add(p,cbox(w,.26,d,.1),mat(pick(cols),{r:.95}),x+w/2,y+.13,rr(-zw*.4,zw*.4),0,rr(-.3,.3),0);x+=w+.06}
  else if(r<.6){const w=rr(.4,.55);add(p,cbox(w,w*.8,w,.02),mat(0xa87b4a),x+w/2,y+w*.4,rr(-zw*.3,zw*.3),0,rr(-.2,.2),0);x+=w+.06}
  else if(r<.8){for(const z of[-.17,.17])add(p,cbox(.32,.42,.16,.03),mat(pick([0x4a6a3a,0xc23b2b])),x+.17,y+.21,z);x+=.42}
  else{add(p,new T.TorusGeometry(.3,.13,6,14),mat(0x26262b),x+.43,y+.13,0,Math.PI/2,0,0);x+=.9}}
 add(p,CY(.12,.12,zw*1.6,8).rotateX(Math.PI/2),mat(0x8a6a3a),x0+.1,y+.12,0)}

/* caravan (towable) â€” returns rig-like object with hitch */
function caravan(o={}){seed(o.seed||3);const g=new T.Group(),c=new T.Color(PAINTS[o.paint]||0xf2ede2),uInv={value:new T.Matrix4()},PM=paintMat(c,o.wear??.25,uInv,.4,-9,.7);
 const L=4.6,W=2.1,r=.34,body=new T.Group();g.add(body);
 const pts=[[2.3,.42],[2.42,.9],[2.32,2.1],[2.05,2.38],[-2.05,2.38],[-2.3,2.12],[-2.32,.42]],a0=Math.asin(.08/.46);for(let i=0;i<=8;i++){const a=(Math.PI-a0)+(2*a0-Math.PI)*i/8;pts.push([Math.cos(a)*.46,.34+Math.sin(a)*.46])}add(body,ext(pts,W,.08),PM);
 add(body,CY(.44,.44,W-.1,12,true,Math.PI/2,Math.PI).rotateX(Math.PI/2),mat(0x141416,{ds:true}),0,.34,0,0,0,0,false);
 for(const z of[-1,1]){add(body,B(L-.4,.09,.006),mat(o.stripe||0xd06a3a),0,1.15,z*(W/2+.004),0,0,0,false);add(body,B(L-.4,.04,.006),mat(o.stripe||0xd06a3a),0,1.03,z*(W/2+.004),0,0,0,false);
  for(const x of[-1.4,1.2]){add(body,cbox(.9,.5,.04,.02),mat(0x2a2a2e),x,1.6,z*(W/2+.01));add(body,B(.8,.4,.04),mat(0x2b3c48,{r:.2,e:0xffb867,ei:1.1,lamp:true}),x,1.6,z*(W/2+.02))}}
 add(body,cbox(.7,1.75,.04,.01),PM,.2,1.32,W/2+.02);add(body,B(.05,.12,.06),mat(0xdcdcdc,{m:.6,r:.3}),.45,1.3,W/2+.05);
 add(body,B(.14,.08,.08),mat(0xfff0d0,{e:0xffc070,ei:1.5,lamp:true}),.2,2.32,W/2+.06);glow(body,0xffc27a,1.1,.2,2.25,W/2+.3,true,.9);
 add(body,cbox(1.6,.6,.04,.02),mat(0x2b3c48,{e:0xffb867,ei:1.1,lamp:true}),2.37,1.5,0,0,Math.PI/2,0);add(body,cbox(.5,.1,.5,.03),mat(0xdedad0),-.6,2.44,0);
 const am=mat(0x2a2b2f,{r:.6,m:.3});beam(body,V3(2.3,.5,-.7),V3(3.6,.5,0),.05,am);beam(body,V3(2.3,.5,.7),V3(3.6,.5,0),.05,am);add(body,CY(.07,.07,.12,8),am,3.62,.52,0);
 add(body,cbox(.5,.32,.6,.03),mat(0xdedad0),2.75,.72,0);for(const z of[-.12,.12])add(body,CY(.1,.1,.42,10),mat(0xd0d6dc,{m:.4,r:.4}),3.05,.75,z);beam(body,V3(3.2,.5,0),V3(3.2,.04,0),.03,am);add(body,CY(.07,.07,.05,10).rotateX(Math.PI/2),mat(0x26262b),3.2,.07,0);
 const TL=mat(0xb3221c,{e:0xff2a1a,ei:.6,lamp:true});for(const z of[-1,1])add(body,B(.04,.15,.12),TL,-2.33,.75,z*(W/2-.15));
 const wheels=[];for(const z of[-1,1]){const w=wheel(r,.22,{tires:'road',rims:'white'},z<0);w.node.position.set(0,r,z*(W/2-.12));g.add(w.node);wheels.push({...w,x:0,z:z*(W/2-.12)})}
 g.userData.hitch=V3(3.62,.52,0);g.userData.wheels=wheels;g.userData.body=body;g.userData.r=r;
 g.userData.update=()=>{body.updateMatrixWorld(true);uInv.value.copy(g.matrixWorld).invert()};return g}

/* ============================================================================
   NATURE
============================================================================ */
function displace(g,sd,amt){const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),n=1+(noise3(x*.7+sd,y*.9,z*.7)-.5)*amt*2;p.setXYZ(i,x*n,y,z*n)}g.computeVertexNormals();return g}
function tri(a,b,c){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([...a,...b,...c],3));g.computeVertexNormals();return g}
function pine(o={}){seed(o.seed??1);const g=new T.Group(),H=o.h||rr(5.5,9),season=o.season||'summer';
 add(g,CY(H*.022,H*.042,H*.4,6),mat(0x5a3b2a),0,H*.2,0);
 const cols={summer:[0x2f6b45,0x3b7a4e,0x2a5e3d],autumn:[0xeaa936,0xf2c447,0xdc8a2c],winter:[0x2c5747,0x31604d],blue:[0x2e5a5e,0x335f66]}[season]||[0x2f6b45];
 for(let i=0;i<5;i++){const t=i/5,r=H*.24*(1-t*.78)*rr(.9,1.12),h=H*.34*(1-t*.35),y=H*.2+t*H*.64,ry=rnd()*TAU,x=rr(-.03,.03)*H,z=rr(-.03,.03)*H;
  add(g,CY(0,r,h,7),mat(pick(cols)),x,y+h/2,z,0,ry,0);if(season==='winter')add(g,CY(0,r*.75,h*.7,7),mat(0xf3f5fb),x,y+h*.65+.01,z,0,ry,0)}
 return g}
function broadleaf(o={}){seed(o.seed??2);const g=new T.Group(),H=o.h||rr(5,7.5),kind=o.kind||'aspen',season=o.season||'autumn',bark=kind==='aspen'?mat(0xe9e4d8):mat(0x5a4030);
 add(g,CY(H*.026,H*.042,H*.72,6),bark,0,H*.36,0);if(kind==='aspen')for(let i=0;i<7;i++){const y=rr(.4,H*.62),r=H*(.042-.016*y/(H*.72))+.01;add(g,B(r*2.05,.05,r*.9),mat(0x2c2a28),0,y,0,0,rnd()*TAU,0,false)}
 for(let i=0;i<5;i++){const a=rnd()*TAU,y0=H*rr(.45,.7);beam(g,V3(0,y0,0),V3(Math.cos(a)*H*.2,y0+H*.17,Math.sin(a)*H*.2),H*.011,bark,5)}
 const pal={autumn:kind==='maple'?[0xd8442e,0xe8622f,0xb8302a]:[0xf2b632,0xeb8f2c,0xf5cc4a],summer:[0x6fa04a,0x86b85a,0x5c8f3e],spring:[0x9cc95a,0xf2b8c8,0xb6d66a]}[season];
 const leaves=[];if(pal){const n=kind==='oak'?7:6;for(let i=0;i<n;i++){const a=rnd()*TAU,d=rr(0,H*.17),r=H*rr(.12,.19)*(kind==='oak'?1.35:1),m=add(g,IC(r,0),mat(pick(pal)),Math.cos(a)*d,H*rr(.66,.92),Math.sin(a)*d,rnd(),rnd(),rnd());m.scale.y=kind==='aspen'?1.3:.85}
  if(season==='autumn'){const lm=mat(pal[0],{ds:true});for(let i=0;i<7;i++){const l=add(g,tri([-.06,0,0],[.06,0,0],[0,0,.12]),lm,0,0,0,0,0,0,false);l.userData.ph=rnd()*20;leaves.push(l)}}}
 if(leaves.length)g.userData.update=(dt,t,env)=>{for(const l of leaves){const k=((t*.12+l.userData.ph)%1);l.position.set(Math.sin(l.userData.ph*3)*H*.25+k*(1+env.wind)*1.5,H*.75*(1-k),Math.cos(l.userData.ph*5)*H*.25);l.rotation.set(t*3+l.userData.ph,t*2,t)}};
 return g}
function snag(o={}){seed(o.seed??6);const g=new T.Group(),m=mat(0x7d7570),H=o.h||rr(6,9);beam(g,V3(0,0,0),V3(rr(-.3,.3),H,rr(-.3,.3)),.16,m,6);
 for(let i=0;i<5;i++){const y=rr(H*.35,H*.9),a=rnd()*TAU,l=rr(.8,1.8);beam(g,V3(0,y,0),V3(Math.cos(a)*l,y+rr(-.2,.6),Math.sin(a)*l),.05,m,4)}return g}
function palm(o={}){seed(o.seed??4);const g=new T.Group(),H=o.h||rr(6,8),lean=rr(.4,.7),dir=rnd()*TAU,fronds=[];let p=V3(0,0,0);
 for(let i=0;i<8;i++){const t=(i+1)/8,q=V3(Math.cos(dir)*lean*t*t*H*.3,t*H,Math.sin(dir)*lean*t*t*H*.3);beam(g,p,q,H*(.046-.016*t),mat(i%2?0x8a6a48:0x7a5c3e),7);p=q}
 const fm=[0x4f8a3a,0x5f9a40,0x427a34];for(let i=0;i<9;i++){const a=i/9*TAU+rr(-.2,.2),len=rr(2.4,3.2),kk=rr(.1,.14),fg=new T.PlaneGeometry(len,.75,7,2),pa=fg.attributes.position;
  for(let k=0;k<pa.count;k++){const x=pa.getX(k)+len/2,y=pa.getY(k);pa.setXYZ(k,x,-x*x*kk+Math.abs(y)*.45,y*(1-x/len*.75))}fg.computeVertexNormals();
  const f=add(g,fg,mat(pick(fm),{ds:true}),p.x,p.y,p.z,0,-a,rr(.15,.45));f.userData.b=f.rotation.z;fronds.push(f)}
 for(let i=0;i<4;i++)add(g,IC(.14,0),mat(0x5a3e22),p.x+rr(-.18,.18),p.y-.22,p.z+rr(-.18,.18));
 g.userData.update=(dt,t,env)=>{fronds.forEach((f,i)=>f.rotation.z=f.userData.b+Math.sin(t*1.6+i)*.05*(.4+env.wind))};return g}
function cactus(o={}){seed(o.seed??8);const g=new T.Group(),m=mat(0x5f8a4a),H=o.h||rr(3,4.5);add(g,CY(.26,.3,H,8),m,0,H/2,0);add(g,IC(.27,1),m,0,H,0).scale.y=.7;
 for(let i=0;i<2+Math.floor(rnd()*2);i++){const a=rnd()*TAU,y=rr(H*.35,H*.6),c=Math.cos(a),s=Math.sin(a),e=V3(c*.75,y,s*.75);beam(g,V3(c*.2,y-.1,s*.2),e,.16,m,8);beam(g,e,V3(c*.8,y+rr(.7,1.2),s*.8),.17,m,8);add(g,IC(.17,1),m,c*.8,y+1.0,s*.8).scale.y=.8}
 add(g,IC(.07,0),mat(0xf2a6c0),0,H+.18,0);return g}
function bush(o={}){seed(o.seed??9);const g=new T.Group(),pal={green:[0x4f7f3a,0x5f8f44,0x3f6f30],sage:[0x8a9a6a,0x9aa878,0x7a8a5c],autumn:[0xc8562e,0xd9782f,0xa84028],desert:[0x8a7a4a,0x9a8a5a,0x6a6a3a],snow:[0x3f5f4a,0xf3f5fb]}[o.tone||'green'];
 const n=o.tone==='desert'?6:4;for(let i=0;i<n;i++){const r=rr(.4,.75)*(o.tone==='desert'?.6:1);add(g,IC(r,1),mat(pick(pal)),rr(-.6,.6),r*.7,rr(-.6,.6),rnd(),rnd(),rnd()).scale.y=.75}
 if(o.tone==='desert')for(let i=0;i<6;i++){const a=rnd()*TAU;beam(g,V3(0,0,0),V3(Math.cos(a)*.9,rr(.4,.8),Math.sin(a)*.9),.025,mat(0x6a5038),3)}return g}
function reeds(o={}){seed(o.seed??10);const g=new T.Group(),sm=mat(0x7a8a3a),hm=mat(0x5a3a22),stalks=[];
 for(let i=0;i<22;i++){const x=rr(-1,1),z=rr(-1,1),h=rr(1,1.9),s=new T.Group();s.position.set(x,0,z);g.add(s);add(s,CY(.012,.02,h,4),sm,0,h/2,0);if(rnd()<.45)add(s,CY(.045,.045,.22,6),hm,0,h-.08,0);
  else add(s,tri([-.04,0,0],[.04,0,0],[0,h*.9,.05]),mat(0x8a9a4a,{ds:true}),0,0,0,0,rnd()*TAU,0,false);s.userData.ph=rnd()*9;stalks.push(s)}
 g.userData.update=(dt,t,env)=>{for(const s of stalks){s.rotation.z=Math.sin(t*1.8+s.userData.ph)*.06*(.5+env.wind);s.rotation.x=Math.cos(t*1.3+s.userData.ph)*.04*(.5+env.wind)}};return g}
function flowers(o={}){seed(o.seed??11);const g=new T.Group(),cols=[0xf4d23a,0xf2f0e6,0xd85a8a,0x8a6ad8,0xf08a3a];for(let i=0;i<40;i++){const x=rr(-1.6,1.6),z=rr(-1.6,1.6),h=rr(.25,.55);add(g,CY(.008,.01,h,3),mat(0x5a8a3a),x,h/2,z,0,0,0,false);add(g,IC(.05,0),mat(pick(cols)),x,h,z,0,0,0,false)}return g}
function stump(o={}){seed(o.seed??12);const g=new T.Group();add(g,CY(.42,.55,.7,8),mat(0x6a4a32),0,.35,0);add(g,CY(.4,.4,.02,8),mat(0xd9b07a),0,.71,0);
 for(let i=0;i<4;i++){const a=i/4*TAU+.3;beam(g,V3(Math.cos(a)*.35,.15,Math.sin(a)*.35),V3(Math.cos(a)*.8,0,Math.sin(a)*.8),.09,mat(0x5a3d28),5)}
 add(g,CY(.32,.36,3.6,8).rotateZ(Math.PI/2),mat(0x6a4a32),.6,.33,1.4,0,.4,0);add(g,CY(.3,.3,.02,8).rotateZ(Math.PI/2),mat(0xd9b07a),2.42,.33,2.17,0,.4,0);return g}
function rock(o={}){const sd=o.seed??1;seed(sd);const g=new T.Group(),top=o.snow?0xf4f6fb:(o.moss?0x7a9a5a:0xb7bccb),base=o.tone||0x7d8293,vm=mat(0xffffff,{vc:true,r:.95}),k=o.kind||'boulder';
 if(k==='boulder')add(g,rockGeo(1.4,1,.78,sd,top,base),vm,0,.5,0,0,rnd()*TAU,0);
 if(k==='slab')add(g,rockGeo(1.9,1,.32,sd,top,base),vm,0,.25,0);
 if(k==='cluster')for(let i=0;i<6;i++){const r=rr(.3,1.1);add(g,rockGeo(r,1,rr(.6,.9),sd+i,top,base),vm,rr(-1.5,1.5),r*.35,rr(-1.5,1.5),0,rnd()*TAU,0)}
 if(k==='spire')add(g,rockGeo(1,1,3.2,sd,top,base),vm,0,1.9,0);
 if(k==='pebbles')for(let i=0;i<18;i++){const r=rr(.08,.25);add(g,rockGeo(r,0,.6,sd+i,top,base),vm,rr(-1.5,1.5),r*.25,rr(-1.5,1.5))}
 if(k==='mesa'){const cols=[0xb8583a,0xd07a4e,0xa84a32,0xe09a6a];let y=0;for(let i=0;i<4;i++){const r=5.5-i*.5,h=rr(1.4,2.2);add(g,displace(new T.CylinderGeometry(r*.92,r,h,11,2),sd+i,.14),mat(cols[i]),0,y+h/2,0,0,rnd(),0);y+=h}add(g,displace(new T.CylinderGeometry(3.4,4,.5,10),sd,.1),mat(0xc06a44),0,y+.25,0)}
 return g}
/* grass/water previews use app-provided shared materials when present */
const shared={};
function grassPatch(o={}){seed(o.seed??13);const n=1600,geo=bladeGeo(),m=shared.grassMat||mat(0xd8a84a,{ds:true}),im=new T.InstancedMesh(geo,m,n),d=new T.Object3D(),c=new T.Color();
 for(let i=0;i<n;i++){const a=rnd()*TAU,r=Math.sqrt(rnd())*3.2;d.position.set(Math.cos(a)*r,0,Math.sin(a)*r);d.rotation.set(0,rnd()*TAU,0);const s=rr(.6,1.2);d.scale.set(s,s*rr(.7,1.3),s);d.updateMatrix();im.setMatrixAt(i,d.matrix);im.setColorAt(i,c.setHSL(0,0,rr(.8,1.1)))}
 const g=new T.Group();g.add(im);add(g,new T.CircleGeometry(3.4,24).rotateX(-Math.PI/2),mat(0x8a6a35),0,.01,0,0,0,0,false);return g}
function bladeGeo(){const g=new T.BufferGeometry(),w=.07,h=.85,P=[-w,0,0,w,0,0,-w*.7,h*.4,.02,w*.7,h*.4,.02,-w*.35,h*.75,.06,w*.35,h*.75,.06,0,h,.12],U=[0,0,1,0,0,.4,1,.4,0,.75,1,.75,.5,1],I=[0,1,2,1,3,2,2,3,4,3,5,4,4,5,6];
 g.setAttribute('position',new T.Float32BufferAttribute(P,3));g.setAttribute('uv',new T.Float32BufferAttribute(U,2));g.setIndex(I);g.computeVertexNormals();return g}
function pond(o={}){seed(o.seed??14);const g=new T.Group(),r=o.r||5;add(g,new T.CircleGeometry(r+.8,28).rotateX(-Math.PI/2),mat(0x8a7a52),0,-.02,0,0,0,0,false);
 add(g,new T.CircleGeometry(r,40).rotateX(-Math.PI/2),shared.waterMat||mat(0x3fb7c4,{r:.15,op:.85}),0,.06,0,0,0,0,false);
 for(let i=0;i<12;i++){const a=i/12*TAU+rr(-.2,.2),rr2=rr(.25,.6);add(g,rockGeo(rr2,1,.6,i,0xb7bccb,0x7d8293),mat(0xffffff,{vc:true}),Math.cos(a)*(r+.3),.05,Math.sin(a)*(r+.3))}
 const rd=reeds({seed:3});rd.position.set(r*.6,0,r*.6);g.add(rd);g.userData.update=rd.userData.update;return g}

/* ============================================================================
   STRUCTURES
============================================================================ */
const WIN=()=>mat(0x2b3c48,{r:.2,e:0xffb35c,ei:1.3,lamp:true});
function slabRoof(g,W,D,base,peak,m,over=.35,th=.18){for(const s of[-1,1]){const dx=W/2+over,dy=peak-base,Ln=Math.hypot(dx,dy);add(g,cbox(Ln,th,D,.03),m,s*dx/2,(base+peak)/2+th/2,0,0,0,s*-Math.atan2(dy,dx))}}
function aframe(o={}){const g=new T.Group(),W=5,H=5.4,D=6,wood=mat(o.wood||0xb8693a),dk=mat(0x6e3e24),win=WIN();
 add(g,cbox(W+1.2,.45,D+2.2,.05),mat(0x8a7a66),0,.22,.4);slabRoof(g,W,D+.4,.45,H+.5,mat(o.roof||0x4a4c55),.45,.2);
 for(const z of[-1,1])add(g,ext([[-W/2,.45],[W/2,.45],[0,H+.2]],.2,.02),wood,0,0,z*D/2);
 add(g,ext([[-1.4,2.9],[1.4,2.9],[0,4.6]],.06,.01),win,0,0,D/2+.12);add(g,cbox(1,2.1,.08,.02),dk,0,1.5,D/2+.12);for(const x of[-1.5,1.5])add(g,cbox(.95,1.15,.06,.02),win,x,2,D/2+.12);
 add(g,B(.1,1.7,.08),dk,0,3.75,D/2+.16);add(g,B(2.8,.08,.08),dk,0,2.9,D/2+.16);
 for(const x of[-W/2-.5,W/2+.5])for(const z of[D/2+.6,D/2+1.45])beam(g,V3(x,.45,z),V3(x,1.4,z),.05,dk,5);for(const x of[-1,1])beam(g,V3(x*(W/2+.5),1.4,D/2+.6),V3(x*(W/2+.5),1.4,D/2+1.45),.04,dk,4);beam(g,V3(-W/2-.5,1.4,D/2+1.45),V3(-.7,1.4,D/2+1.45),.04,dk,4);beam(g,V3(.7,1.4,D/2+1.45),V3(W/2+.5,1.4,D/2+1.45),.04,dk,4);
 add(g,B(.55,2,.55),mat(0x8d8a86),1.3,H*.62,-1.2);glow(g,0xffb066,1.6,0,2.7,D/2+.6,true,.85);add(g,B(.15,.15,.15),mat(0xfff0d0,{e:0xffc070,ei:1.5,lamp:true}),-.75,2.7,D/2+.18);
 const sm=Smoke(g,1.3,H*.62+1.1,-1.2,0xcfcac4,.6);g.userData.update=sm.update;return g}
function logCabin(o={}){const g=new T.Group(),W=5.6,D=4.4,lm=mat(0x9a5a34),lm2=mat(0x87502e),win=WIN();
 add(g,cbox(W+.4,.35,D+.4,.04),mat(0x8d8a86),0,.17,0);for(let i=0;i<8;i++){const y=.5+i*.32;for(const z of[-1,1])add(g,CY(.17,.17,W+.5,7).rotateZ(Math.PI/2),i%2?lm:lm2,0,y,z*D/2);for(const x of[-1,1])add(g,CY(.17,.17,D+.5,7).rotateX(Math.PI/2),i%2?lm2:lm,x*W/2,y+.16,0)}
 const top=.5+8*.32;for(const x of[-1,1])add(g,ext([[-D/2,top-.1],[D/2,top-.1],[0,top+1.7]],.3,.02),lm,x*W/2,0,0,0,Math.PI/2,0);
 const rm=mat(0x3d4a3a);for(const s of[-1,1]){const dx=D/2+.5,dy=1.9,Ln=Math.hypot(dx,dy);add(g,cbox(W+.9,.16,Ln,.03),rm,0,top+.85,s*dx/2,s*Math.atan2(dy,dx),0,0)}
 add(g,cbox(1,2,.1,.02),mat(0x5a3420),0,1.45,D/2+.2);for(const x of[-1.7,1.7])add(g,cbox(1,.9,.08,.02),win,x,1.7,D/2+.2);add(g,cbox(.08,.9,1,.02),win,W/2+.2,1.7,0);
 add(g,B(.7,3.4,.7),mat(0x8d8a86),-W/2-.2,2,1);const sm=Smoke(g,-W/2-.2,3.9,1,0xd0cbc4,.7);
 add(g,cbox(W+.6,.12,1.6,.02),mat(0x7a4a2c),0,.4,D/2+1);for(const x of[-W/2,W/2])beam(g,V3(x,.4,D/2+1.7),V3(x,2.4,D/2+1.7),.07,lm2,6);add(g,cbox(W+.8,.1,1.9,.02),rm,0,2.45,D/2+1,-.18,0,0);
 glow(g,0xffb066,1.4,1.2,2.1,D/2+.6,true,.8);g.userData.update=sm.update;return g}
function tower(o={}){const g=new T.Group(),wd=mat(0x8a5a3a),wd2=mat(0x6e4630),H=9,b=2.2,t=1.3,cs=[[-1,-1],[1,-1],[1,1],[-1,1]],C=(c,h)=>{const r=b+(t-b)*h/H;return V3(c[0]*r,h,c[1]*r)};
 for(const c of cs){beam(g,C(c,0),C(c,H),.12,wd,6);add(g,B(.55,.3,.55),mat(0x8d8a86),c[0]*b,.15,c[1]*b)}
 const lv=[0,2.4,4.8,7.2,H];for(let k=0;k<4;k++)for(let i=0;i<4;i++){const a=cs[i],c=cs[(i+1)%4];beam(g,C(a,lv[k]+.1),C(c,lv[k+1]),.045,wd2,4);beam(g,C(c,lv[k]+.1),C(a,lv[k+1]),.045,wd2,4);beam(g,C(a,lv[k+1]),C(c,lv[k+1]),.06,wd,4)}
 for(let k=0;k<4;k++){const y0=lv[k],y1=lv[k+1],d=k%2?1:-1,x0=-d*.75,x1=d*.75,z=k%2?.45:-.45;for(const dz of[-.3,.3])beam(g,V3(x0,y0+.1,z+dz),V3(x1,y1,z+dz),.035,wd2,4);for(let s=1;s<9;s++){const f=s/9;add(g,B(.16,.04,.58),wd,x0+(x1-x0)*f,y0+.1+(y1-y0)*f,z)}add(g,B(.9,.06,1.6),wd,x1,y1,0)}
 add(g,B(3.6,.22,3.6),wd,0,H,0);add(g,B(2.6,1.1,2.6),mat(0xb06a40),0,H+.66,0);add(g,B(2.5,.95,2.5),WIN(),0,H+1.68,0);for(const c of cs)add(g,B(.12,1,.12),wd2,c[0]*1.26,H+1.68,c[1]*1.26);add(g,B(2.7,.12,2.7),wd2,0,H+2.2,0);
 add(g,CY(0,2.35,1.15,4),mat(0x7a3328),0,H+2.84,0,0,Math.PI/4,0);
 for(const c of cs)beam(g,V3(c[0]*1.72,H,c[1]*1.72),V3(c[0]*1.72,H+.95,c[1]*1.72),.035,wd2,4);for(let i=0;i<4;i++){const a=cs[i],c=cs[(i+1)%4];for(const y of[.5,.95])beam(g,V3(a[0]*1.72,H+y,a[1]*1.72),V3(c[0]*1.72,H+y,c[1]*1.72),.028,wd2,4)}
 beam(g,V3(0,H+3.3,0),V3(0,H+4.6,0),.03,mat(0x333338),4);add(g,IC(.07,0),mat(0xff3b2a,{e:0xff2a1a,ei:2,lamp:true}),0,H+4.65,0);glow(g,0xff4030,.8,0,H+4.65,0,true,.9);
 return g}
function lighthouse(o={}){const g=new T.Group(),H=12;add(g,CY(2.7,3.1,1,12),mat(0x9a948a),0,.5,0);
 for(let i=0;i<6;i++){const y0=1+i*H/6,r0=1.8-i/6,r1=1.8-(i+1)/6;add(g,CY(r1,r0,H/6,14),mat(i%2?0xd24a3a:0xf2eee6,{r:.7}),0,y0+H/12,0)}
 const top=1+H;add(g,CY(1.45,1.2,.25,16),mat(0x2b2b30),0,top+.12,0);for(let i=0;i<16;i++){const a=i/16*TAU;beam(g,V3(Math.cos(a)*1.35,top+.25,Math.sin(a)*1.35),V3(Math.cos(a)*1.35,top+.9,Math.sin(a)*1.35),.02,mat(0x2b2b30),4)}
 add(g,new T.TorusGeometry(1.35,.03,4,24),mat(0x2b2b30),0,top+.9,0,Math.PI/2,0,0);
 add(g,CY(.66,.66,1.2,12),mat(0xfff4d6,{e:0xffd890,ei:1.5,lamp:true,r:.2}),0,top+.85,0);for(let i=0;i<8;i++){const a=i/8*TAU;add(g,B(.05,1.2,.05),mat(0x2b2b30),Math.cos(a)*.68,top+.85,Math.sin(a)*.68)}
 add(g,CY(0,.85,.75,12),mat(0xc23a2e),0,top+1.82,0);add(g,IC(.12,0),mat(0x2b2b30),0,top+2.25,0);glow(g,0xfff0b0,5,0,top+.85,0,true,.95);
 for(const y of[4,8])add(g,cbox(.5,.7,.1,.02),WIN(),0,y,1.6-y*.07);add(g,cbox(.9,1.7,.12,.02),mat(0x3a4a5a),0,1.85,1.82);
 const rot=new T.Group();rot.position.y=top+.85;g.add(rot);const bmM=new T.ShaderMaterial({uniforms:{op:{value:0}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,
  vertexShader:'varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform float op;varying vec2 vU;void main(){float a=pow(1.-vU.y,1.6)*op;gl_FragColor=vec4(1.,.95,.75,a);}'});
 for(const s of[1,-1]){const cg=new T.CylinderGeometry(3.2,.3,30,18,1,true);cg.translate(0,15,0);cg.rotateZ(-Math.PI/2*s);rot.add(new T.Mesh(cg,bmM))}
 const hs=new T.Group();hs.position.set(4.2,0,1);g.add(hs);add(hs,cbox(3,2.2,2.6,.05),mat(0xf2eee6),0,1.1,0);slabRoof(hs,2.6,3.2,2.2,3.3,mat(0xc23a2e),.25,.14);hs.children.slice(-2).forEach(m=>m.rotation.y=0);
 add(hs,cbox(.7,.7,.06,.02),WIN(),.6,1.3,1.32);add(hs,cbox(.6,1.4,.06,.02),mat(0x3a4a5a),-.6,.8,1.32);
 g.userData.update=(dt,t,env)=>{rot.rotation.y=t*.7;bmM.uniforms.op.value=.3*env.night};return g}
function pier(o={}){const g=new T.Group(),Lg=o.len||12,wd=mat(0x8a6a4a),wd2=mat(0x6a4a32);for(let i=0;i<=Lg/2;i++)for(const z of[-1.1,1.1])add(g,CY(.13,.15,3.2,6),wd2,i*2,0,z);
 for(let x=0;x<Lg;x+=.32)add(g,B(.28,.08,2.6),rnd()<.5?wd:mat(0x9a7a5a),x+.16,1.6,0,0,0,(rnd()-.5)*.02);for(const z of[-1.2,1.2])beam(g,V3(0,2.4,z),V3(Lg,2.4,z),.04,wd2,4);
 for(let i=0;i<=Lg/2;i++)for(const z of[-1.2,1.2])beam(g,V3(i*2,1.6,z),V3(i*2,2.4,z),.05,wd2,4);
 for(const x of[3,Lg-1]){beam(g,V3(x,1.6,1.2),V3(x,3.6,1.2),.05,mat(0x2b2b30),5);add(g,cbox(.24,.32,.24,.03),mat(0xfff0d0,{e:0xffc070,ei:1.6,lamp:true}),x,3.75,1.2);glow(g,0xffc27a,1.6,x,3.75,1.2,true,.9)}
 add(g,new T.TorusGeometry(.32,.08,6,14),mat(0xe8662e),Lg-.4,2.1,-1.25,0,0,0);return g}
function bridge(o={}){const g=new T.Group(),Lg=14,wd=mat(0x8a6a4a),wd2=mat(0x6a4a32);for(let x=-Lg/2;x<Lg/2;x+=.35)add(g,B(.3,.1,3.4),rnd()<.5?wd:mat(0x9a7a5a),x+.17,3,0);
 for(let x=-Lg/2+1;x<Lg/2;x+=3){for(const z of[-1.5,1.5])beam(g,V3(x,0,z*1.15),V3(x,3,z),.12,wd2,6);beam(g,V3(x,.2,-1.6),V3(x,2.8,1.6),.06,wd2,4);beam(g,V3(x,.2,1.6),V3(x,2.8,-1.6),.06,wd2,4);add(g,B(.3,.25,3.8),wd2,x,2.85,0)}
 for(const z of[-1.75,1.75]){beam(g,V3(-Lg/2,3.9,z),V3(Lg/2,3.9,z),.06,wd2,5);for(let x=-Lg/2;x<=Lg/2;x+=1.4)beam(g,V3(x,3,z),V3(x,3.9,z),.05,wd2,4)}return g}
function ferry(o={}){const g=new T.Group(),hull=new T.Group();g.add(hull);const hm=mat(0x2c6a7a),wm=mat(0xf2eee6),rm=mat(0x2b2b30);
 add(hull,ext([[-5,.3],[4.2,.3],[5.8,1.6],[-5.3,1.6]],3.8,.08),hm);add(hull,B(10.6,.12,3.9),mat(0xd8cfc0),.2,1.66,0);
 add(hull,cbox(5.6,1.4,3.1,.06),wm,-.6,2.42,0);for(const z of[-1,1])for(let i=0;i<6;i++)add(hull,B(.55,.5,.04),WIN(),-3+i*.95,2.55,z*1.57);
 add(hull,cbox(3.4,1.1,2.6,.05),wm,-.9,3.68,0);for(const z of[-1,1])for(let i=0;i<3;i++)add(hull,B(.6,.45,.04),WIN(),-2+i*1.1,3.75,z*1.32);
 add(hull,cbox(1.6,1,1.8,.04),wm,.6,4.75,0);add(hull,B(.04,.5,1.5),WIN(),1.41,4.85,0);add(hull,cbox(1.9,.1,2.1,.03),mat(0xc23a2e),.6,5.3,0);
 add(hull,CY(.32,.38,1.6,10),mat(0x1f1f22),-1.6,4.9,0);add(hull,CY(.33,.33,.35,10),mat(0xc23a2e),-1.6,5.5,0);
 for(const z of[-1.85,1.85]){beam(hull,V3(-5,2.3,z),V3(5,2.3,z),.03,rm,4);for(let x=-5;x<=5;x+=.8)beam(hull,V3(x,1.7,z),V3(x,2.3,z),.025,rm,4)}
 for(const x of[-3.6,2.2])add(hull,new T.TorusGeometry(.28,.07,6,12),mat(0xe8662e),x,2.4,1.6);
 beam(hull,V3(3.6,1.7,0),V3(3.6,5.6,0),.05,rm,5);add(hull,IC(.09,0),mat(0xffffff,{e:0xffffff,ei:2,lamp:true}),3.6,5.65,0);glow(hull,0xfff4e0,1.2,3.6,5.65,0,true,.9);
 for(const z of[-1,1]){add(hull,IC(.08,0),mat(z<0?0xff3020:0x30ff60,{e:z<0?0xff3020:0x30ff60,ei:2,lamp:true}),1.4,4.5,z*.95);glow(hull,z<0?0xff3020:0x30ff60,.9,1.4,4.5,z*.95,true,.9)}
 const sm=Smoke(hull,-1.6,5.8,0,0x9a9a9a,.9);g.userData.update=(dt,t,env)=>{hull.position.y=Math.sin(t*.9)*.08;hull.rotation.z=Math.sin(t*.7)*.018;hull.rotation.x=Math.sin(t*.55)*.012;sm.update(dt,t,env)};return g}
function outpost(o={}){seed(o.seed??15);const g=new T.Group();add(g,B(9,.04,8),mat(0x3d7fc4,{r:1}),0,.02,0,0,0,0,false);
 const pm=mat(0xd8d2c4),cv=mat(0xe8eadd,{ds:true});for(const[x,z,h]of[[-4,-3.5,3.2],[4,-3.5,3.2],[-4,3.5,2.4],[4,3.5,2.4]])beam(g,V3(x,0,z),V3(x,h,z),.07,pm,6);
 const cg=new T.PlaneGeometry(8.4,7.4);cg.rotateX(-Math.PI/2+.11);add(g,cg,cv,0,2.82,0);
 add(g,cbox(2.4,.1,.9,.02),mat(0x8a6a4a),-2.5,1,-3);for(const x of[-3.5,-1.5])for(const z of[-3.35,-2.65])beam(g,V3(x,0,z),V3(x,1,z),.04,mat(0x333),4);add(g,cbox(.9,1,.6,.03),mat(0xc8322a,{r:.5,m:.2}),2.8,.5,-3.2);
 for(let i=0;i<4;i++)add(g,new T.TorusGeometry(.38,.15,6,14),mat(0x26262b),3.2,.15+i*.28,2.6,Math.PI/2,0,0);
 for(const[x,c]of[[-3.4,0x2f5a8a],[-2.8,0xc8322a],[-3.1,0x4a6a3a]])add(g,CY(.3,.3,.9,10),mat(c,{r:.6,m:.2}),x,.45,2.8+(x+3)*.3);
 const bunt=[];for(let i=0;i<14;i++){const t=i/13,x=-4+8*t,y=3.15-Math.sin(t*Math.PI)*.5,f=add(g,tri([-.16,0,0],[.16,0,0],[0,-.38,0]),mat([0xe8452c,0xf2c447,0x3d7fc4,0x4f9a52][i%4],{ds:true}),x,y,-3.5,0,0,0,false);bunt.push(f)}
 beam(g,V3(-4,3.15,-3.5),V3(4,3.15,-3.5),.01,mat(0x333),3);add(g,cbox(.3,.35,.3,.03),mat(0xfff0d0,{e:0xffc070,ei:1.6,lamp:true}),0,2.6,0);glow(g,0xffc27a,2.2,0,2.5,0,true,.9);
 g.userData.update=(dt,t,env)=>bunt.forEach((f,i)=>f.rotation.x=Math.sin(t*3+i)*.3*(.3+env.wind));return g}

/* ============================================================================
   CAMP & PROPS
============================================================================ */
function Smoke(p,x,y,z,color,size=.8){const parts=[];for(let i=0;i<12;i++){const m=new T.SpriteMaterial({map:glowTex(),color,transparent:true,opacity:0,depthWrite:false});const s=new T.Sprite(m);s.userData.k=i/12;p.add(s);parts.push(s)}
 return{update(dt,t,env){for(const s of parts){const k=(t*.12+s.userData.k)%1;s.position.set(x+k*(1.5+env.wind*2.5)+Math.sin(t+s.userData.k*9)*.2,y+k*4,z+Math.sin(k*5+s.userData.k*7)*.4);s.scale.setScalar(size*(.5+k*2.6));s.material.opacity=Math.sin(k*Math.PI)*.32}}}}
function firepit(o={}){seed(o.seed??16);const g=new T.Group();for(let i=0;i<11;i++){const a=i/11*TAU;add(g,rockGeo(rr(.2,.28),0,.7,i,0x9a9aa6,0x5d5f6a),mat(0xffffff,{vc:true}),Math.cos(a)*.75,.1,Math.sin(a)*.75)}
 add(g,new T.CircleGeometry(.7,14).rotateX(-Math.PI/2),mat(0x2a2220),0,.02,0,0,0,0,false);for(let i=0;i<4;i++)add(g,CY(.07,.08,1.1,6).rotateZ(Math.PI/2),mat(0x4a3022),0,.13+(i>1?.12:0),0,0,i*Math.PI/4+.3,.25*(i%2?1:-1));
 const fl=[],fm=[0xff6a1a,0xffa22a,0xffd860];for(let i=0;i<5;i++){const m=new T.MeshBasicMaterial({color:fm[i%3],transparent:true,opacity:.92,blending:T.AdditiveBlending,depthWrite:false});const f=add(g,CY(0,.22-i*.025,.7,5),m,rr(-.12,.12),.45,rr(-.12,.12),0,0,0,false);f.userData.ph=rnd()*9;fl.push(f)}
 const core=glow(g,0xff8a30,2.4,0,.55,0,false,.9),pl=new T.PointLight(0xff8a3a,2,14,1.6);pl.decay=0;pl.position.y=.9;g.add(pl);
 const em=[];for(let i=0;i<16;i++){const s=glow(g,0xffa040,.12,0,0,0,false,1);s.userData.k=rnd();em.push(s)}const sm=Smoke(g,0,1.4,0,0x8a8580,.7);
 g.userData.update=(dt,t,env)=>{for(const f of fl){const n=Math.sin(t*11+f.userData.ph)*.5+Math.sin(t*23+f.userData.ph*2)*.3;f.scale.set(1+n*.15,1+n*.35,1+n*.15);f.position.y=.42+n*.05;f.rotation.y=t+f.userData.ph}
  const fk=.85+Math.sin(t*13)*.08+Math.sin(t*29)*.06;pl.intensity=(1.2+env.night*2.4)*fk*Math.PI;core.material.opacity=.6+.3*fk;
  for(const s of em){const k=(t*.35+s.userData.k)%1;s.position.set(Math.sin(s.userData.k*40+t)*.4*k+env.wind*k,.5+k*3.2,Math.cos(s.userData.k*30+t)*.4*k);s.material.opacity=(1-k)}sm.update(dt,t,env)};return g}
function tent(o={}){const g=new T.Group(),c=o.color||0xe0743a;add(g,ext([[-1.2,0],[1.2,0],[0,1.55]],2.4,.03),mat(c,{r:1}),0,0,0,0,Math.PI/2,0);add(g,ext([[-.55,0],[.55,0],[0,1.15]],.04,.01),mat(0x3a2a22,{e:0xffa040,ei:.8,lamp:true}),1.21,0,0,0,Math.PI/2,0);
 add(g,B(2.8,.04,2.8),mat(0x5a5a4a),0,.02,0,0,0,0,false);for(const s of[-1,1])for(const x of[-1.3,1.3]){beam(g,V3(x,1.5,0),V3(x+s*.0+(x>0?.9:-.9),0,s*1.6),.008,mat(0xdddddd),3)}beam(g,V3(-1.35,0,0),V3(-1.35,1.65,0),.025,mat(0x555),4);beam(g,V3(1.35,0,0),V3(1.35,1.65,0),.025,mat(0x555),4);
 glow(g,0xffa050,2,1.5,.6,0,true,.55);return g}
function chair(o={}){const g=new T.Group(),f=mat(0x2b2b30,{m:.4,r:.5}),cv=mat(o.color||0x3d7fc4,{ds:true});for(const[a,b]of[[[-.3,0,-.3],[.3,.45,.3]],[[.3,0,-.3],[-.3,.45,.3]],[[-.3,0,.3],[.3,.45,-.3]],[[.3,0,.3],[-.3,.45,-.3]]])beam(g,V3(...a),V3(...b),.015,f,4);
 add(g,B(.6,.04,.55),cv,0,.45,0);add(g,B(.06,.55,.55),cv,-.3,.75,0,0,0,-.2);for(const z of[-.3,.3])add(g,B(.5,.04,.06),f,0,.62,z);return g}
function lantern(o={}){const g=new T.Group(),m=mat(0x2b2b30,{m:.4,r:.5});add(g,CY(.11,.13,.06,8),m,0,0,0);add(g,CY(.09,.09,.24,8),mat(0xfff0d0,{e:0xffb860,ei:2,lamp:true}),0,.15,0);add(g,CY(.04,.12,.08,8),m,0,.31,0);add(g,new T.TorusGeometry(.07,.01,4,10),m,0,.4,0);glow(g,0xffb860,1.3,0,.16,0,true,.95);g.position.y=0;return g}
function fairyLights(o={}){seed(o.seed??17);const g=new T.Group(),cols=[0xffcf7a,0xffa0a0,0xa0d8ff,0xc8ffa0,0xffe0a0],P=[V3(-4,0,0),V3(0,0,-1),V3(4,0,0)];
 for(const p of P)beam(g,p,V3(p.x,2.6,p.z),.05,mat(0x6a4a32),5);for(let k=0;k<2;k++){const a=V3(P[k].x,2.5,P[k].z),b=V3(P[k+1].x,2.5,P[k+1].z);let prev=a;
  for(let i=1;i<=14;i++){const t=i/14,q=a.clone().lerp(b,t);q.y-=Math.sin(t*Math.PI)*.55;beam(g,prev,q,.006,mat(0x222),3);prev=q;if(i<14){const c=pick(cols);add(g,IC(.05,0),mat(c,{e:c,ei:2.2,lamp:true}),q.x,q.y-.06,q.z,0,0,0,false);glow(g,c,.5,q.x,q.y-.06,q.z,true,.9)}}}return g}
function props(o={}){seed(o.seed??18);const g=new T.Group(),k=o.kind||'crates',wd=mat(0xa87b4a);
 if(k==='crates'){for(const[x,y,z,s]of[[0,.3,0,.6],[.65,.3,.1,.6],[.3,.9,0,.6],[-.2,.22,.8,.45]]){add(g,cbox(s,s,s,.02),wd,x,y,z,0,rr(-.3,.3),0);add(g,B(s+.01,.06,s+.01),mat(0x7a5432),x,y,z,0,0,0,false)}}
 if(k==='barrels'){for(const[x,z,c]of[[0,0,0x2f5a8a],[.75,.2,0xc8322a],[.3,.8,0x4a6a3a]]){add(g,CY(.32,.32,.9,12),mat(c,{r:.55,m:.25}),x,.45,z);for(const y of[.2,.7])add(g,new T.TorusGeometry(.32,.02,3,16),mat(0x333338),x,y,z,Math.PI/2,0,0)}add(g,CY(.32,.32,.9,12).rotateZ(Math.PI/2),mat(0xd9a441,{r:.55}),-.8,.32,.4)}
 if(k==='tires'){for(let i=0;i<4;i++)add(g,new T.TorusGeometry(.38,.15,6,14),mat(0x26262b),0,.15+i*.28,0,Math.PI/2,0,0);add(g,new T.TorusGeometry(.38,.15,6,14),mat(0x26262b),1,.5,.2,0,.6,0)}
 if(k==='table'){const t=mat(0x9a6a42);add(g,B(2,.08,.8),t,0,.75,0);for(const z of[-.6,.6])add(g,B(2,.06,.3),t,0,.45,z);for(const x of[-.8,.8])for(const s of[-1,1])beam(g,V3(x,0,s*.75),V3(x,.75,0),.04,t,4);const l=lantern();l.position.set(.5,.79,0);g.add(l)}
 if(k==='sign'){const p=mat(0x6a4a32);beam(g,V3(0,0,0),V3(0,2.6,0),.07,p,6);for(const[y,r,c]of[[2.25,.3,0xe8a33a],[1.85,-.4,0xf2eee6],[1.45,.9,0x4f9a52]]){const b=new T.Group();b.position.y=y;b.rotation.y=r;g.add(b);add(b,ext([[0,-.13],[1,-.13],[1.2,0],[1,.13],[0,.13]],.05,.01),mat(c),.05,0,0)}}
 if(k==='fence'){const p=mat(0x8a6a4a);for(let i=0;i<6;i++)beam(g,V3(i*1.4-3.5,0,0),V3(i*1.4-3.5,1.1,0),.06,p,5);for(const y of[.45,.95])add(g,B(7.2,.1,.05),p,0,y,.07,0,0,(rnd()-.5)*.04)}
 if(k==='mailbox'){beam(g,V3(0,0,0),V3(0,1.05,0),.05,mat(0x6a4a32),5);add(g,CY(.18,.18,.55,10,false,0,Math.PI).rotateZ(Math.PI/2),mat(0x4a74b4,{r:.5}),0,1.12,0);add(g,B(.55,.18,.36),mat(0x4a74b4,{r:.5}),0,1.06,0);add(g,B(.04,.22,.05),mat(0xd8442e),.05,1.25,.2)}
 if(k==='pump'){add(g,cbox(.7,1.7,.5,.06),mat(0xd8442e,{r:.5}),0,.85,0);add(g,cbox(.5,.4,.06,.02),mat(0xf2eee6,{e:0xfff0d0,ei:.8,lamp:true}),0,1.3,.26);add(g,IC(.22,1),mat(0xf2eee6,{e:0xfff0d0,ei:1,lamp:true}),0,1.9,0);beam(g,V3(.36,1,0),V3(.6,.6,.2),.03,mat(0x1d1d20),4);add(g,B(.9,.1,.7),mat(0x8d8a86),0,.05,0)}
 if(k==='cooler'){add(g,cbox(.8,.45,.45,.06),mat(0x3d7fc4,{r:.5}),0,.25,0);add(g,cbox(.82,.1,.47,.04),mat(0xf2eee6),0,.5,0)}
 return g}
function beacon(o={}){const g=new T.Group(),rm=new T.MeshBasicMaterial({color:0xffd060,transparent:true,opacity:.7,blending:T.AdditiveBlending,depthWrite:false}),ring=add(g,new T.TorusGeometry(2.2,.05,4,48),rm,0,.1,0,Math.PI/2,0,0,false);
 const w=Whip(3,4,mat(0xf2eee6,{r:.4}),null);g.add(w.root);const cl=Cloth(1,.6,8,5,0xf2b33a);const pal=add(g,cbox(1,.7,1,.04),mat(0xa87b4a),1.2,.35,.6,0,.4,0);add(g,B(1.02,.08,1.02),mat(0xd8442e),1.2,.4,.6,0,.4,0,false);
 g.userData.world=[cl.mesh];const tp=new T.Vector3(),bt=new T.Vector3();g.userData.update=(dt,t,env)=>{ring.scale.setScalar(1+Math.sin(t*2)*.06);rm.opacity=.35+.35*(.5+.5*Math.sin(t*2));w.update(dt,env.wind);w.top.getWorldPosition(tp);bt.set(0,-.6,0);w.top.localToWorld(bt);cl.update(dt,tp,bt,[-2-env.wind*3,0,1.5+env.wind],t)};return g}

/* ============================================================================
   WILDLIFE
============================================================================ */
function birdMesh(col){const b=new T.Group(),bm=mat(col),wm=mat(col,{ds:true});add(b,IC(.12,0),bm,0,0,0,0,0,0,false).scale.set(2.3,.8,.9);add(b,IC(.07,0),bm,.25,.04,0,0,0,0,false);add(b,CY(0,.035,.1,4).rotateZ(-Math.PI/2),mat(0xe8a33a),.36,.03,0,0,0,0,false);add(b,tri([-.2,0,0],[-.38,.02,.1],[-.38,.02,-.1]),wm,0,0,0,0,0,0,false);
 const L=new T.Group(),R=new T.Group();b.add(L,R);add(R,tri([-.12,0,0],[.12,0,0],[-.06,0,.55]),wm,0,0,0,0,0,0,false);add(L,tri([.12,0,0],[-.12,0,0],[-.06,0,-.55]),wm,0,0,0,0,0,0,false);b.userData.w=[L,R];return b}
function flock(o={}){seed(o.seed??19);const g=new T.Group(),n=o.n||14,birds=[];for(let i=0;i<n;i++){const b=birdMesh(o.dark?0x2b2b33:0xf2f0ea);b.userData.ph=rnd()*TAU;b.userData.r=rr(4,9);b.userData.h=rr(4,7);b.userData.s=rr(.35,.55);g.add(b);birds.push(b)}
 g.userData.update=(dt,t)=>{for(const b of birds){const u=b.userData,a=t*u.s+u.ph,x=Math.cos(a)*u.r,z=Math.sin(a)*u.r,y=u.h+Math.sin(t*.7+u.ph)*.6;b.position.set(x,y,z);b.rotation.set(0,-a-Math.PI/2+Math.PI,Math.sin(t+u.ph)*.2);
  const flap=Math.max(0,Math.sin(t*.6+u.ph*3))>.4?Math.sin(t*14+u.ph)*.9:.05;b.userData.w[0].rotation.x=-flap;b.userData.w[1].rotation.x=flap}};return g}
function deer(o={}){const g=new T.Group(),c=mat(0xa8693e),cl=mat(0xe8d6b8),dk=mat(0x2b2220),body=new T.Group();g.add(body);
 add(body,IC(.5,1),c,0,1.15,0).scale.set(1.5,.75,.6);add(body,IC(.3,0),cl,-.6,1.2,0).scale.set(.4,.6,.6);
 for(const[x,z]of[[.5,.18],[.5,-.18],[-.5,.18],[-.5,-.18]]){beam(body,V3(x,1,z),V3(x,.45,z),.05,c,5);beam(body,V3(x,.45,z),V3(x+.03,0,z),.035,c,5);add(body,B(.07,.06,.07),dk,x+.03,.03,z)}
 const neck=new T.Group();neck.position.set(.6,1.3,0);body.add(neck);beam(neck,V3(0,0,0),V3(.25,.55,0),.12,c,6);const head=new T.Group();head.position.set(.27,.6,0);neck.add(head);
 add(head,IC(.15,0),c,.08,0,0).scale.set(1.5,.9,.85);add(head,IC(.06,0),dk,.3,-.04,0);for(const z of[-1,1]){add(head,tri([0,0,0],[-.06,.22,z*.12],[.06,.18,z*.08]),mat(0x8a5432,{ds:true}),-.02,.05,z*.06);add(head,IC(.025,0),dk,.16,.04,z*.09)}
 if(o.buck!==false)for(const z of[-1,1]){const a=V3(0,.12,z*.05),b=V3(-.1,.5,z*.22);beam(head,a,b,.02,mat(0xd8c8a8),4);beam(head,V3(-.05,.3,z*.13),V3(.12,.45,z*.2),.015,mat(0xd8c8a8),4);beam(head,b,V3(.05,.62,z*.3),.015,mat(0xd8c8a8),4)}
 g.userData.update=(dt,t)=>{const k=Math.sin(t*.35),graze=T.MathUtils.smoothstep(k,.2,.6);neck.rotation.z=-graze*1.5;head.rotation.z=graze*.4+Math.sin(t*2.3)*.03*(1-graze);body.position.y=Math.sin(t*1.7)*.01};return g}
function butterflies(o={}){seed(o.seed??20);const g=new T.Group(),bs=[];for(let i=0;i<8;i++){const b=new T.Group(),c=pick([0xf2b632,0xf2f0ea,0x4a8ad8,0xe8622f]),m=mat(c,{ds:true}),L=add(b,tri([0,0,0],[.12,0,.14],[-.08,0,.12]),m,0,0,0,0,0,0,false),R=add(b,tri([0,0,0],[-.08,0,-.12],[.12,0,-.14]),m,0,0,0,0,0,0,false);b.userData={L,R,ph:rnd()*9};g.add(b);bs.push(b)}
 g.userData.update=(dt,t)=>{for(const b of bs){const u=b.userData,a=t*.4+u.ph;b.position.set(Math.cos(a)*2+Math.sin(t*1.3+u.ph)*.6,.8+Math.sin(t*2+u.ph)*.4,Math.sin(a*1.3)*2);b.rotation.y=-a;const f=Math.sin(t*22+u.ph)*1.1;u.L.rotation.x=f;u.R.rotation.x=-f}};return g}

/* ============================================================================
   WEATHER & FX  (also used world-wide by the app)
============================================================================ */
function Rain(n=2200,box=44){const P=new Float32Array(n*6),g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(P,3));
 const m=new T.LineBasicMaterial({color:0xb7cad8,transparent:true,opacity:.5,depthWrite:false}),ls=new T.LineSegments(g,m);ls.frustumCulled=false;const seedX=[];for(let i=0;i<n;i++)seedX.push([Math.random()*box-box/2,Math.random()*30,Math.random()*box-box/2,.8+Math.random()*.6]);
 ls.userData.update=(dt,t,env,center)=>{const c=center||V3(0,0,0),wx=-.25-env.wind*.3,amt=env.rain??1;m.opacity=.45*amt;ls.visible=amt>.02;if(!ls.visible)return;
  for(let i=0;i<n;i++){const s=seedX[i];s[1]-=dt*22*s[3];if(s[1]<-2){s[1]+=30}const y=s[1]+c.y-6,x=s[0]+c.x+((y-c.y)*wx*-.0),z=s[2]+c.z,k=i*6,l=.55*s[3];P[k]=x;P[k+1]=y;P[k+2]=z;P[k+3]=x-wx*l;P[k+4]=y+l;P[k+5]=z}g.attributes.position.needsUpdate=true};return ls}
function Snow(n=2600,box=46){const P=new Float32Array(n*3),g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(P,3));const m=new T.PointsMaterial({color:0xffffff,size:.16,map:glowTex(),transparent:true,depthWrite:false,opacity:.95}),pt=new T.Points(g,m);pt.frustumCulled=false;
 const S=[];for(let i=0;i<n;i++)S.push([Math.random()*box-box/2,Math.random()*26,Math.random()*box-box/2,Math.random()*9]);
 pt.userData.update=(dt,t,env,center)=>{const c=center||V3(0,0,0),amt=env.snow??1;pt.visible=amt>.02;m.opacity=.95*amt;if(!pt.visible)return;for(let i=0;i<n;i++){const s=S[i];s[1]-=dt*(1.4+s[3]*.1);s[0]+=dt*(env.wind*1.2+Math.sin(t+s[3])*.4);if(s[1]<-2)s[1]+=26;if(s[0]>box/2)s[0]-=box;
  P[i*3]=s[0]+c.x;P[i*3+1]=s[1]+c.y-5;P[i*3+2]=s[2]+c.z+Math.cos(t*.8+s[3])*.3}g.attributes.position.needsUpdate=true};return pt}
function boltPath(a,b,depth){const pts=[a];const segs=14;for(let i=1;i<segs;i++){const t=i/segs,p=a.clone().lerp(b,t);p.x+=(Math.random()-.5)*6*(1-t*.4);p.z+=(Math.random()-.5)*6*(1-t*.4);pts.push(p)}pts.push(b);return pts}
function Lightning(){const g=new T.Group(),m=new T.MeshBasicMaterial({color:0xf4f6ff,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,fog:false});let life=0,flash=0;
 function tube(pts,r){const cp=new T.CurvePath();for(let i=0;i<pts.length-1;i++)cp.add(new T.LineCurve3(pts[i],pts[i+1]));return new T.Mesh(new T.TubeGeometry(cp,pts.length*2,r,4,false),m)}
 g.userData.strike=(at)=>{while(g.children.length){const c=g.children.pop();c.geometry.dispose()}const top=V3(at.x+(Math.random()-.5)*10,at.y+60,at.z),pts=boltPath(top,at);g.add(tube(pts,.35));for(let k=0;k<3;k++){const i=3+Math.floor(Math.random()*8),s=pts[i],e=s.clone().add(V3((Math.random()-.5)*16,-14-Math.random()*10,(Math.random()-.5)*16));g.add(tube(boltPath(s,e),.14))}life=.45;flash=1};
 g.userData.update=(dt)=>{life-=dt;flash=Math.max(0,flash-dt*3.2);m.opacity=life>0?(Math.random()>.25?1:.2)*Math.min(1,life*4):0;g.userData.flash=flash*(life>0?1:0)};g.userData.flash=0;return g}
function Fireflies(n=60,r=10){const g=new T.Group(),f=[];for(let i=0;i<n;i++){const s=glow(g,0xd8ff70,.32,0,0,0,false,0);s.userData.p=[Math.random()*r*2-r,Math.random()*1.6+.3,Math.random()*r*2-r,Math.random()*30];f.push(s)}
 g.userData.update=(dt,t,env)=>{const vis=(env.night??1);for(const s of f){const p=s.userData.p;s.position.set(p[0]+Math.sin(t*.3+p[3])*1.2,p[1]+Math.sin(t*.9+p[3]*2)*.3,p[2]+Math.cos(t*.25+p[3])*1.2);s.material.opacity=vis*Math.max(0,Math.sin(t*1.7+p[3]))*.95}};return g}
function Aurora(){const geo=new T.PlaneGeometry(220,46,80,1),m=new T.ShaderMaterial({uniforms:{t:{value:0},op:{value:1}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,fog:false,
 vertexShader:'uniform float t;varying vec2 vU;void main(){vU=uv;vec3 p=position;p.z+=sin(p.x*.05+t*.3)*14.+sin(p.x*.13+t*.5)*5.;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',
 fragmentShader:'uniform float t,op;varying vec2 vU;void main(){float b=pow(1.-vU.y,1.2)*smoothstep(0.,.12,vU.y)*.6+smoothstep(.0,.04,vU.y)*.0;float s=.55+.45*sin(vU.x*60.+t*1.3)*sin(vU.x*23.-t*.7);vec3 c=mix(vec3(.2,1.,.55),vec3(.55,.3,1.),vU.y);gl_FragColor=vec4(c*b*s*op,1.);}'});
 const a=new T.Mesh(geo,m);a.userData.update=(dt,t,env)=>{m.uniforms.t.value=t;m.uniforms.op.value=env.aurora??1;a.visible=(env.aurora??1)>.02};return a}
function cloud(o={}){seed(o.seed??21);const g=new T.Group(),m=mat(0xffffff,{r:1});for(let i=0;i<7;i++){const r=rr(1,2.2);add(g,IC(r,1),m,rr(-3,3),rr(0,.8),rr(-1.2,1.2),0,0,0,false).scale.y=.65}g.userData.update=(dt,t)=>{g.position.x=Math.sin(t*.05)*2};return g}
function fogBank(o={}){const g=new T.Group(),S=[];for(let i=0;i<14;i++){const m=new T.SpriteMaterial({map:glowTex(),color:0xffffff,transparent:true,opacity:.22,depthWrite:false});const s=new T.Sprite(m);s.scale.set(9,3.5,1);s.position.set(Math.random()*16-8,1.2+Math.random()*1.2,Math.random()*10-5);s.userData.p=Math.random()*9;g.add(s);S.push(s)}
 g.userData.update=(dt,t,env)=>S.forEach(s=>{s.position.x+=dt*(.2+env.wind*.4);if(s.position.x>9)s.position.x=-9;s.material.opacity=.18+.06*Math.sin(t*.4+s.userData.p)});return g}
function lightningDemo(){const g=new T.Group(),L=Lightning();g.add(L);let next=.5;const lt=new T.PointLight(0xc8d8ff,0,80,1);lt.decay=0;lt.position.y=20;g.add(lt);
 g.userData.update=(dt,t,env)=>{next-=dt;if(next<0){L.userData.strike(V3((Math.random()-.5)*8,0,-6-Math.random()*6));next=2+Math.random()*2.5}L.userData.update(dt);lt.intensity=L.userData.flash*6*Math.PI};return g}
function rainDemo(){const g=new T.Group(),r=Rain(900,12);g.add(r);const c=V3(0,4,0);g.userData.update=(dt,t,env)=>r.userData.update(dt,t,{...env,rain:1},c);return g}
function snowDemo(){const g=new T.Group(),s=Snow(900,12);g.add(s);const c=V3(0,4,0);g.userData.update=(dt,t,env)=>s.userData.update(dt,t,{...env,snow:1},c);return g}
function auroraDemo(){const g=new T.Group(),a=Aurora();a.scale.setScalar(.12);a.position.set(0,6,-4);g.add(a);g.userData.update=(dt,t,env)=>a.userData.update(dt,t,{aurora:1});return g}

/* ============================================================================
   REGISTRY â€” every model in the kit. opts drive the inspector controls.
============================================================================ */
const SEASON={k:'season',l:'Season',t:'seg',v:['summer','autumn','winter']},SEED={k:'seed',l:'Variation',t:'seed'};
const ENTRIES=[
 ...Object.keys(VEH).map(k=>({id:k,cat:'Vehicles',name:VEH[k].name,blurb:VEH[k].blurb,vehicle:true})),
 {id:'caravan',cat:'Vehicles',name:'Wanderer caravan',blurb:'Towable single-axle caravan with a lit porch.',build:caravan,opts:[{k:'paint',l:'Body',t:'swatch'},{k:'wear',l:'Wear',t:'range',min:0,max:1,step:.05,d:.25}]},
 {id:'pine',cat:'Nature',name:'Pine',blurb:'Five-tier conifer. Autumn turns it larch gold.',build:pine,opts:[{...SEASON,v:['summer','autumn','winter','blue']},SEED]},
 {id:'aspen',cat:'Nature',name:'Aspen',blurb:'White bark, light canopy, drifting leaves in autumn.',build:o=>broadleaf({...o,kind:'aspen'}),opts:[{...SEASON,v:['autumn','summer','spring','winter']},SEED]},
 {id:'maple',cat:'Nature',name:'Fire maple',blurb:'The red tree that glows under headlights.',build:o=>broadleaf({...o,kind:'maple'}),opts:[{...SEASON,v:['autumn','summer','winter']},SEED]},
 {id:'oak',cat:'Nature',name:'Round oak',blurb:'Wide, low canopy for meadows and farm tracks.',build:o=>broadleaf({...o,kind:'oak'}),opts:[{...SEASON,v:['summer','autumn','spring','winter']},SEED]},
 {id:'snag',cat:'Nature',name:'Dead snag',blurb:'Burnt-out trunk for swamps and fire scars.',build:snag,opts:[SEED]},
 {id:'palm',cat:'Nature',name:'Palm',blurb:'Leaning palm with fronds that move in the wind.',build:palm,opts:[SEED]},
 {id:'cactus',cat:'Nature',name:'Saguaro',blurb:'Desert column cactus with a single bloom.',build:cactus,opts:[SEED]},
 {id:'bush',cat:'Nature',name:'Bush',blurb:'Low shrub in five palettes.',build:bush,opts:[{k:'tone',l:'Palette',t:'seg',v:['green','sage','autumn','desert','snow']},SEED]},
 {id:'grass',cat:'Nature',name:'Meadow grass',blurb:'Wind-driven blades. Parts around wheels.',build:grassPatch,opts:[SEED]},
 {id:'reeds',cat:'Nature',name:'Reeds & cattails',blurb:'Shoreline cluster that sways.',build:reeds,opts:[SEED]},
 {id:'flowers',cat:'Nature',name:'Wildflowers',blurb:'Scatter patch for verges.',build:flowers,opts:[SEED]},
 {id:'stump',cat:'Nature',name:'Stump & log',blurb:'Cut stump with roots and a fallen log.',build:stump,opts:[]},
 {id:'rock',cat:'Nature',name:'Rocks',blurb:'Noise-carved stone with lit tops.',build:rock,opts:[{k:'kind',l:'Shape',t:'seg',v:['boulder','slab','cluster','spire','pebbles','mesa']},{k:'snow',l:'Snow cap',t:'toggle'},{k:'moss',l:'Moss',t:'toggle'},SEED]},
 {id:'pond',cat:'Nature',name:'Pond',blurb:'Animated water with sparkle and shoreline.',build:pond,opts:[]},
 {id:'aframe',cat:'Buildings',name:'A-frame cabin',blurb:'Glass gable that glows after dusk.',build:aframe,opts:[]},
 {id:'logcabin',cat:'Buildings',name:'Log cabin',blurb:'Stacked logs, porch, chimney smoke.',build:logCabin,opts:[]},
 {id:'tower',cat:'Buildings',name:'Fire lookout',blurb:'Braced watchtower with a lit cab.',build:tower,opts:[]},
 {id:'lighthouse',cat:'Buildings',name:'Lighthouse',blurb:'Sweeping beam at night, keeperâ€™s cottage.',build:lighthouse,opts:[]},
 {id:'pier',cat:'Buildings',name:'Pier',blurb:'Plank jetty with lamp posts.',build:pier,opts:[]},
 {id:'bridge',cat:'Buildings',name:'Trestle bridge',blurb:'Timber bridge sized for the 6Ã—6.',build:bridge,opts:[]},
 {id:'ferry',cat:'Buildings',name:'Lake ferry',blurb:'Bobbing car ferry with nav lights.',build:ferry,opts:[]},
 {id:'outpost',cat:'Buildings',name:'Outpost garage',blurb:'Tarp workshop where you swap parts.',build:outpost,opts:[]},
 {id:'firepit',cat:'Camp & props',name:'Fire pit',blurb:'Flames, embers, smoke and real light.',build:firepit,opts:[]},
 {id:'tent',cat:'Camp & props',name:'Tent',blurb:'Ridge tent with a lantern inside.',build:tent,opts:[{k:'color',l:'Canvas',t:'swatch',sw:[0xe0743a,0x4f9a52,0x3d7fc4,0xd9a441]}]},
 {id:'fairy',cat:'Camp & props',name:'Fairy lights',blurb:'Sagging string lights between poles.',build:fairyLights,opts:[SEED]},
 {id:'lantern',cat:'Camp & props',name:'Lantern',blurb:'Hand lantern with warm halo.',build:lantern,opts:[]},
 {id:'chair',cat:'Camp & props',name:'Camp chair',blurb:'Folding chair.',build:chair,opts:[{k:'color',l:'Canvas',t:'swatch',sw:[0x3d7fc4,0xe0743a,0x4f9a52,0x2b2d3a]}]},
 {id:'beacon',cat:'Camp & props',name:'Delivery beacon',blurb:'Objective marker: pallet, flag, pulse ring.',build:beacon,opts:[]},
 ...['crates','barrels','tires','table','sign','fence','mailbox','pump','cooler'].map(k=>({id:'p_'+k,cat:'Camp & props',name:{crates:'Crates',barrels:'Oil drums',tires:'Tire stack',table:'Picnic table',sign:'Signpost',fence:'Fence',mailbox:'Mailbox',pump:'Fuel pump',cooler:'Cooler'}[k],blurb:{crates:'Stackable cargo.',barrels:'Drums, one rolled over.',tires:'Spares by the garage.',table:'With a lantern on it.',sign:'Three-way trail marker.',fence:'Ranch rails.',mailbox:'Roadside, flag up.',pump:'Old gas pump with lit globe.',cooler:'Camp cooler.'}[k],build:o=>props({...o,kind:k}),opts:[]})),
 {id:'gulls',cat:'Wildlife',name:'Gull flock',blurb:'Circling flock with flap-and-glide.',build:o=>flock({...o,dark:false}),opts:[]},
 {id:'crows',cat:'Wildlife',name:'Crows',blurb:'Dark flock for dusk and storms.',build:o=>flock({...o,dark:true,n:9}),opts:[]},
 {id:'deer',cat:'Wildlife',name:'Deer',blurb:'Grazes, looks up, ears twitch.',build:deer,opts:[{k:'buck',l:'Antlers',t:'toggle',d:true}]},
 {id:'butterflies',cat:'Wildlife',name:'Butterflies',blurb:'Meadow flutter.',build:butterflies,opts:[]},
 {id:'fx_rain',cat:'Weather',name:'Rain shower',blurb:'Slanted streaks, wind-driven.',build:rainDemo,opts:[]},
 {id:'fx_snow',cat:'Weather',name:'Snowfall',blurb:'Drifting flakes.',build:snowDemo,opts:[]},
 {id:'fx_bolt',cat:'Weather',name:'Lightning',blurb:'Branching bolt with real light flash.',build:lightningDemo,opts:[]},
 {id:'fx_flies',cat:'Weather',name:'Fireflies',blurb:'Blinking glow at dusk.',build:()=>{const f=Fireflies(40,3);return f},opts:[]},
 {id:'fx_fog',cat:'Weather',name:'Fog bank',blurb:'Low drifting mist.',build:fogBank,opts:[]},
 {id:'fx_aurora',cat:'Weather',name:'Aurora',blurb:'Night-sky curtain.',build:auroraDemo,opts:[]},
 {id:'fx_cloud',cat:'Weather',name:'Cloud',blurb:'Low-poly cumulus.',build:cloud,opts:[SEED]}
];
const VOPTS=[
 {sec:'Paint & livery',items:[{k:'paint',l:'Paint',t:'swatch'},{k:'roof',l:'Roof',t:'seg',v:['white','body','black']},{k:'livery',l:'Livery',t:'seg',v:['none','stripe','rally','safari','twotone']},{k:'num',l:'Number',t:'range',min:1,max:99,step:1},{k:'wear',l:'Mud & rust',t:'range',min:0,max:1,step:.05}]},
 {sec:'Wheels & stance',items:[{k:'tires',l:'Tyres',t:'seg',v:['road','allterrain','mud','sand','chains']},{k:'rims',l:'Rims',t:'seg',v:['steel','spoke','beadlock','white','black']},{k:'tireSize',l:'Tyre size',t:'range',min:.9,max:1.3,step:.05},{k:'lift',l:'Lift',t:'range',min:0,max:.35,step:.01},{k:'susp',l:'Suspension',t:'seg',v:['soft','stock','stiff']}]},
 {sec:'Body kit',items:[{k:'front',l:'Front',t:'seg',v:['bumper','bullbar','ram']},{k:'snorkel',l:'Snorkel',t:'toggle'},{k:'spare',l:'Spare wheel',t:'toggle'},{k:'ladder',l:'Ladder',t:'toggle'},{k:'flaps',l:'Mud flaps',t:'toggle'},{k:'cans',l:'Jerry cans',t:'toggle'},{k:'armor',l:'Scrap armour',t:'toggle'}]},
 {sec:'Roof',items:[{k:'rack',l:'Roof rack',t:'toggle'},{k:'load',l:'Load',t:'seg',v:['none','cargo','kayak','tent']},{k:'antenna',l:'Whip antenna',t:'toggle'},{k:'flag',l:'Flag pole',t:'seg',v:['none','flag','whip']}]},
 {sec:'Lights',items:[{k:'lights',l:'Headlights',t:'seg',v:['auto','on','off']},{k:'roofLamps',l:'Roof lamps',t:'toggle'},{k:'lightbar',l:'Light bar',t:'toggle'},{k:'fog',l:'Fog lamps',t:'toggle'}]},
 {sec:'Drivetrain',items:[{k:'engine',l:'Engine',t:'seg',v:['inline6','v8','diesel','electric']}]}];
const CATS=['Vehicles','Nature','Buildings','Camp & props','Wildlife','Weather'];

return{T,TAU,V3,mat,glow,add,B,CY,IC,ext,cbox,beam,rockGeo,noise3,seed,rnd,rr,Cloth,Whip,lamps,glowSprites,shared,bladeGeo,
 vehicle,caravan,VEH,PAINTS,ENGINES,SUSP,VDEF,VOPTS,ENTRIES,CATS,pine,broadleaf,snag,palm,cactus,bush,rock,reeds,flowers,stump,
 aframe,logCabin,tower,lighthouse,pier,bridge,ferry,outpost,firepit,tent,chair,lantern,fairyLights,props,beacon,flock,deer,butterflies,
 Rain,Snow,Lightning,Fireflies,Aurora,cloud,fogBank,Smoke}})();
export const KIT = RAW_KIT as unknown as KitApi;
