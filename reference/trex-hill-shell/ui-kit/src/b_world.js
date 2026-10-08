'use strict';
/* =====================================================================
   WORLD — one persistent 3D scene behind every screen.
   Camera "rigs" per screen are tweened (smooth, never springy).
===================================================================== */
const W=(function(){
const T=THREE,K=KIT,V3=(x,y,z)=>new T.Vector3(x,y,z),TAU=Math.PI*2,sm=(a,b,x)=>T.MathUtils.smoothstep(x,a,b),C=h=>new T.Color(h);
const MOBILE=matchMedia('(max-width:860px),(hover:none)').matches;
const canvas=document.getElementById('view');
const R=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:false});
R.shadowMap.enabled=true;R.shadowMap.type=T.PCFSoftShadowMap;
const scene=new T.Scene();scene.fog=new T.Fog(0xf8c793,20,160);
const cam=new T.PerspectiveCamera(38,1,.1,1400);cam.position.set(14,4,14);
const look=V3(0,1,0);
let composer=null,bloom=null;
try{composer=new T.EffectComposer(R);composer.addPass(new T.RenderPass(scene,cam));bloom=new T.UnrealBloomPass(new T.Vector2(2,2),.4,.55,.88);composer.addPass(bloom)}catch(e){composer=null}
let scale=1;
function resize(){const w=innerWidth,h=innerHeight;R.setPixelRatio(Math.min(devicePixelRatio,MOBILE?1.4:2)*scale);R.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();if(composer){composer.setPixelRatio(R.getPixelRatio());composer.setSize(w,h)}}
addEventListener('resize',resize);resize();

/* ---------- sky ---------- */
const skyU={top:{value:C(0)},hor:{value:C(0)},sunDir:{value:V3(0,1,0)},sunCol:{value:C(0)},sunK:{value:1}};
const sky=new T.Mesh(new T.SphereGeometry(600,32,16),new T.ShaderMaterial({uniforms:skyU,side:T.BackSide,depthWrite:false,fog:false,
 vertexShader:'varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:'uniform vec3 top,hor,sunCol,sunDir;uniform float sunK;varying vec3 vD;void main(){vec3 d=normalize(vD);vec3 c=mix(hor,top,pow(clamp(d.y,0.,1.),.5));if(d.y<0.)c=hor;float s=max(dot(d,normalize(sunDir)),0.);c+=sunCol*(pow(s,6.)*.25+pow(s,60.)*.5)*sunK;c=mix(c,sunCol*1.4+.2,smoothstep(.9993,.9996,s)*sunK);gl_FragColor=vec4(c,1.);}'}));
sky.frustumCulled=false;scene.add(sky);
const sp=[];for(let i=0;i<1400;i++){const a=Math.random()*TAU,y=Math.random()*.95+.05,r=Math.sqrt(1-y*y);sp.push(Math.cos(a)*r*560,y*560,Math.sin(a)*r*560)}
const starM=new T.PointsMaterial({color:0xffffff,size:1.6,sizeAttenuation:false,transparent:true,opacity:0,fog:false,depthWrite:false});
const sg=new T.BufferGeometry();sg.setAttribute('position',new T.Float32BufferAttribute(sp,3));const stars=new T.Points(sg,starM);scene.add(stars);
/* far mountains (fog-tinted silhouettes, 3 rings) */
const mtnM=[];for(let ring=0;ring<3;ring++){const m=new T.MeshBasicMaterial({color:0x888888,fog:false});mtnM.push(m);const R0=220+ring*90;
 for(let i=0;i<14;i++){const a=i/14*TAU+ring*.6+Math.random()*.2,h=40+Math.random()*55+ring*24,r=55+Math.random()*40,g=new T.ConeGeometry(r,h,8,4),p=g.attributes.position;
  for(let k=0;k<p.count;k++){const x=p.getX(k),y=p.getY(k),z=p.getZ(k),n=1+(K.noise3(x*.05+i*7,y*.06,z*.05)-.5)*.7;p.setXYZ(k,x*n,y,z*n)}
  const me=new T.Mesh(g,m);me.position.set(Math.cos(a)*R0,h/2-10,Math.sin(a)*R0);scene.add(me)}}

/* ---------- lights ---------- */
const sun=new T.DirectionalLight(0xffffff,1.2);sun.castShadow=true;sun.shadow.mapSize.set(MOBILE?1024:2048,MOBILE?1024:2048);
Object.assign(sun.shadow.camera,{left:-26,right:26,top:26,bottom:-26,near:1,far:180});sun.shadow.bias=-.0005;sun.shadow.normalBias=.035;scene.add(sun,sun.target);
const hemi=new T.HemisphereLight(0xffffff,0x444444,.6);scene.add(hemi);

/* ---------- terrain: smooth value-noise hills (NOT floor()-stepped) ---------- */
const ROAD=34,GAR=V3(46,0,-14);
function H(x,z){const n=K.noise3,d=Math.hypot(x,z);let h=(n(x*.02,0,z*.02)-.5)*16*sm(26,100,d)+(n(x*.07+5,1,z*.07)-.5)*2.2*sm(10,22,d)+(n(x*.3,2,z*.3)-.5)*.35;
 const rd=Math.abs(d-ROAD);h=T.MathUtils.lerp(h,h*.5,1-sm(1.5,4.5,rd));const g=Math.hypot(x-GAR.x,z-GAR.z);h*=sm(6,14,g);return h}
const roadF=(x,z)=>1-sm(2.1,3.3,Math.abs(Math.hypot(x,z)-ROAD));
const tg=new T.PlaneGeometry(320,320,MOBILE?150:210,MOBILE?150:210);tg.rotateX(-Math.PI/2);const tp=tg.attributes.position;
for(let i=0;i<tp.count;i++)tp.setY(i,H(tp.getX(i),tp.getZ(i)));tg.computeVertexNormals();tg.setAttribute('color',new T.BufferAttribute(new Float32Array(tp.count*3),3));
const terrain=new T.Mesh(tg,new T.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:1}));terrain.receiveShadow=true;scene.add(terrain);
const skirt=new T.Mesh(new T.CircleGeometry(900,32).rotateX(-Math.PI/2),new T.MeshLambertMaterial({color:0x9c7a3c}));skirt.position.y=-4;scene.add(skirt);
function paint(g0,dirt){const col=tg.attributes.color,n=tg.attributes.normal,c=C(0),G=C(g0),D=C(dirt),Rk=C(0x8a8d9a);
 for(let i=0;i<tp.count;i++){const x=tp.getX(i),z=tp.getZ(i);c.copy(G).multiplyScalar(.86+K.noise3(x*.15,0,z*.15)*.24);c.lerp(D,roadF(x,z)*.9);c.lerp(Rk,sm(.84,.68,n.getY(i))*.7);col.setXYZ(i,c.r,c.g,c.b)}col.needsUpdate=true;skirt.material.color.copy(G).multiplyScalar(.9)}

/* ---------- grass ---------- */
const GU=T.UniformsUtils.merge([T.UniformsLib.fog,{uTime:{value:0},uWind:{value:.8},uBase:{value:C(0)},uTip:{value:C(0)},uSun:{value:C(0)},uAmb:{value:C(0)},uPush:{value:new T.Vector4()},uSnow:{value:0}}]);
const grassMat=new T.ShaderMaterial({uniforms:GU,fog:true,side:T.DoubleSide,
 vertexShader:`uniform float uTime,uWind;uniform vec4 uPush;varying float vH;varying float vT;
#include <common>
#include <fog_pars_vertex>
void main(){vH=uv.y;vec4 wp=modelMatrix*instanceMatrix*vec4(position,1.);float ph=wp.x*.32+wp.z*.21;float w=sin(uTime*1.6+ph)*.55+sin(uTime*3.7+ph*2.3)*.18+.35;float b=vH*vH;wp.x+=w*b*uWind*.32;wp.z+=w*b*uWind*.18;
vec2 d=wp.xz-uPush.xy;float l=length(d);float p=(1.-smoothstep(uPush.z*.45,uPush.z,l))*step(.01,uPush.z);wp.xz+=d/(l+.001)*p*b*.8;wp.y-=p*vH*.4;
vT=1.;
#ifdef USE_INSTANCING_COLOR
vT=instanceColor.r;
#endif
vec4 mvPosition=viewMatrix*wp;gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`,
 fragmentShader:`uniform vec3 uBase,uTip,uSun,uAmb;uniform float uSnow;varying float vH;varying float vT;
#include <common>
#include <fog_pars_fragment>
void main(){vec3 c=mix(uBase,uTip,smoothstep(0.,1.,vH))*vT;c=mix(c,vec3(.95,.96,1.),uSnow*smoothstep(.35,1.,vH));c*=uAmb+uSun*(.25+.75*vH);gl_FragColor=vec4(c,1.);
#include <fog_fragment>
}`});
const GN=MOBILE?24000:60000,grass=new T.InstancedMesh(K.bladeGeo(),grassMat,GN);grass.frustumCulled=false;scene.add(grass);
(function(){const d=new T.Object3D(),c=C(0);let i=0,tr=0;while(i<GN&&tr<GN*4){tr++;const a=Math.random()*TAU,r=Math.sqrt(Math.random())*85,x=Math.cos(a)*r,z=Math.sin(a)*r;
 if(roadF(x,z)>.3||Math.hypot(x-GAR.x,z-GAR.z)<6.5||Math.hypot(x,z)<4.5)continue;d.position.set(x,H(x,z)-.05,z);d.rotation.set(0,Math.random()*TAU,0);const s=.75+Math.random()*.7;d.scale.set(s,s*(.8+Math.random()*.6),s);d.updateMatrix();grass.setMatrixAt(i,d.matrix);grass.setColorAt(i,c.setScalar(.78+Math.random()*.34));i++}grass.count=i;grass.userData.max=i})();

/* ---------- static scatter, baked to few draw calls ---------- */
function bake(objs){const B=new Map();for(const o of objs){o.updateMatrixWorld(true);o.traverse(m=>{if(!m.isMesh||m.material.transparent)return;let g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();
 for(const k of Object.keys(g.attributes))if(!['position','normal','color'].includes(k))g.deleteAttribute(k);g.applyMatrix4(m.matrixWorld);const key=m.material.uuid;if(!B.has(key))B.set(key,{m:m.material,gs:[]});B.get(key).gs.push(g)})}
 const out=new T.Group();for(const{m,gs}of B.values()){const mg=T.BufferGeometryUtils.mergeBufferGeometries(gs,false);if(!mg)continue;const me=new T.Mesh(mg,m);me.castShadow=me.receiveShadow=true;out.add(me)}return out}
let scatter=null;
function buildScatter(season){if(scatter){scene.remove(scatter);scatter.traverse(m=>m.geometry&&m.geometry.dispose())}
 const objs=[],ok=(x,z)=>Math.hypot(x,z)>12&&Math.abs(Math.hypot(x,z)-ROAD)>5&&Math.hypot(x-GAR.x,z-GAR.z)>11;let sd=1;
 for(let i=0,t=0;i<(MOBILE?90:150)&&t<3000;t++){const a=Math.random()*TAU,r=13+Math.pow(Math.random(),.8)*105,x=Math.cos(a)*r,z=Math.sin(a)*r;if(!ok(x,z))continue;if(K.noise3(x*.04,3,z*.04)<.4&&Math.random()<.6)continue;
  const k=Math.random(),o=k<.62?K.pine({season:season==='winter'?'winter':(Math.random()<.25?'autumn':'summer'),seed:sd++}):k<.85?K.broadleaf({kind:'aspen',season:season==='winter'?'winter':'autumn',seed:sd++}):K.broadleaf({kind:'maple',season:season==='winter'?'winter':'autumn',seed:sd++});
  o.position.set(x,H(x,z)-.05,z);o.rotation.y=Math.random()*TAU;o.scale.setScalar(.8+Math.random()*.6);objs.push(o);i++}
 for(let i=0,t=0;i<30&&t<1500;t++){const a=Math.random()*TAU,r=12+Math.random()*90,x=Math.cos(a)*r,z=Math.sin(a)*r;if(!ok(x,z))continue;const o=i%3?K.bush({tone:season==='winter'?'snow':i%2?'autumn':'green',seed:sd++}):K.rock({kind:i%2?'boulder':'cluster',seed:sd++,snow:season==='winter'});o.position.set(x,H(x,z)-.05,z);o.rotation.y=Math.random()*TAU;o.scale.setScalar(.7+Math.random());objs.push(o);i++}
 scatter=bake(objs);scene.add(scatter)}

/* ---------- live set pieces (camp, garage, POIs) ---------- */
const live=[];function place(o,x,z,ry=0,y){o.position.set(x,y??H(x,z),z);o.rotation.y=ry;scene.add(o);live.push(o);(o.userData.world||[]).forEach(w=>scene.add(w));return o}
place(K.aframe(),-9,-9,.5);place(K.firepit(),-2.5,-2.5);place(K.tent({color:0xe0743a}),-6,.2,1.2);place(K.chair(),-.9,-3.6,2.4);place(K.chair({color:0xe0743a}),-4,-1.2,-2.2);
place(K.fairyLights(),-3,-7.5,.1);place(K.props({kind:'table'}),1.6,-6.2,.3);place(K.props({kind:'sign'}),9,8,.3);
place(K.outpost(),GAR.x,GAR.z,-.4,0);place(K.props({kind:'tires'}),GAR.x+4.5,GAR.z+4.2);place(K.props({kind:'barrels'}),GAR.x-5,GAR.z+3);place(K.props({kind:'pump'}),GAR.x+6,GAR.z-2.5,-.6);
const tower=place(K.tower(),-28,-58,.2),light=place(K.lighthouse(),62,46,.6);
const deer=place(K.deer(),14,-12,2.2);const flock=K.flock({n:9});flock.position.set(4,14,-6);scene.add(flock);live.push(flock);
const flies=K.Fireflies(60,14);scene.add(flies);
const rain=K.Rain(MOBILE?1300:2200),snow=K.Snow(MOBILE?1500:2600),bolt=K.Lightning();scene.add(rain,snow,bolt);let boltT=4;

/* ---------- hero vehicle ---------- */
let hero=null,heroKey='',heroPose='camp';const POSES={camp:{x:3.5,z:2.2,ry:-.7},garage:{x:GAR.x,z:GAR.z,ry:Math.PI*.15}};
function setHero(id,cfg){const key=id+JSON.stringify(cfg);if(key===heroKey)return;heroKey=key;
 if(hero){scene.remove(hero.root);hero.world.forEach(w=>scene.remove(w));hero.root.traverse(m=>{if(m.isSprite)K.glowSprites.delete(m);m.geometry&&m.geometry.dispose()})}
 hero=K.vehicle(id,cfg);scene.add(hero.root);hero.world.forEach(w=>scene.add(w));poseHero(heroPose,true)}
function poseHero(p,force){heroPose=p;if(p==='drive'||!hero)return;const P=POSES[p];hero.root.position.set(P.x,H(P.x,P.z),P.z);hero.root.rotation.y=P.ry;hero.chassis.rotation.set(0,0,0)}
/* drive preview: cruise the ring track with a cheap suspension response */
const drv={a:0,speed:0,target:0,yaw:0};

/* ---------- time & weather ---------- */
const TIMES={
 dawn:{top:0x6e6aa6,hor:0xf4a68c,sun:0xffb08a,si:.85,el:5,az:80,hs:0xa594c8,hg:0x5a4558,hi:.66,fog:0xe9a596,fn:14,ff:130,night:.5,stars:.15},
 morning:{top:0x4f9fe0,hor:0xcde6ef,sun:0xfff0d4,si:1.15,el:24,az:110,hs:0xbcd7ee,hg:0x7a6a4c,hi:.7,fog:0xc4dfeb,fn:22,ff:170,night:0,stars:0},
 noon:{top:0x3b97de,hor:0xa8dbf2,sun:0xffffff,si:1.25,el:62,az:160,hs:0xc6e2f4,hg:0x8a7650,hi:.72,fog:0xa6d6ef,fn:30,ff:190,night:0,stars:0},
 golden:{top:0xf3b27a,hor:0xffdcaa,sun:0xffb055,si:1.45,el:9,az:235,hs:0xffd2a0,hg:0x7a4a38,hi:.72,fog:0xf8c793,fn:12,ff:125,night:0,stars:0},
 dusk:{top:0x6d4c8c,hor:0xff8c78,sun:0xff7055,si:.9,el:2.5,az:260,hs:0xc77ea6,hg:0x4a2c4a,hi:.62,fog:0xe98a80,fn:10,ff:115,night:.62,stars:.25},
 night:{top:0x081530,hor:0x22355e,sun:0x8ea6ff,si:.32,el:40,az:300,hs:0x30447a,hg:0x120f1a,hi:.42,fog:0x1a2745,fn:8,ff:85,night:1,stars:1}};
const ORDER=['dawn','morning','noon','golden','dusk','night'];
const WX={clear:{},mist:{mix:.55,si:.5,fn:.12,ff:.32,night:.3},rain:{tint:0x5f7c86,mix:.45,si:.55,fn:.6,ff:.6,rain:.7,wind:1.3,night:.2},storm:{tint:0x1f5552,mix:.72,si:.35,fn:.35,ff:.5,rain:1,bolt:1,wind:2,night:.5},snow:{tint:0xd8cfe0,mix:.45,si:.6,fn:.45,ff:.45,snow:1,wind:1.1,night:.25,cover:1}};
const SEASON={summer:{g:[0x9a6224,0xf2c35c],ground:0x9c7a3c,dirt:0xb38c5c},autumn:{g:[0x8a3e24,0xeb8f48],ground:0x8a4a2c,dirt:0xa8724a},highland:{g:[0x2f5a2c,0x8cbf5a],ground:0x4c6a36,dirt:0x8a7552},winter:{g:[0x8a8f9a,0xe8ecf4],ground:0xe8ecf4,dirt:0xb8b2bc}};
const st={time:'golden',tf:ORDER.indexOf('golden'),cycle:0,wx:'clear',season:'summer',grass:1,bloom:true,shadows:true,fov:38,photoFovOverride:null};
function lerpTime(f){f=((f%6)+6)%6;const i=Math.floor(f),k=f-i,a=TIMES[ORDER[i]],b=TIMES[ORDER[(i+1)%6]],o={};
 for(const key in a){if(typeof a[key]==='number'&&!['el','az','si','hi','fn','ff','night','stars'].includes(key))o[key]=C(a[key]).lerp(C(b[key]),k);else o[key]=a[key]+(b[key]-a[key])*k}
 if(i===5){o.az=a.az+(b.az+360-a.az)*k}return o}
function target(){const t=lerpTime(st.tf),w=WX[st.wx],s=SEASON[st.season],P={...t};
 P.gb=C(s.g[0]);P.gt=C(s.g[1]);P.cover=st.season==='winter'?1:0;P.wind=.8;P.rain=0;P.snow=0;P.bolt=0;
 if(st.wx!=='clear'){const tint=w.tint!==undefined?C(w.tint):P.hor.clone();for(const k of['top','hor','fog','hs'])P[k]=P[k].clone().lerp(tint,w.mix);P.si*=w.si;P.fn*=w.fn;P.ff*=w.ff;P.wind=w.wind||.4;P.rain=w.rain||0;P.snow=w.snow||0;P.bolt=w.bolt||0;P.cover=Math.max(P.cover,w.cover||0);P.night=Math.min(1,P.night+(w.night||0)*(1-P.night));P.stars*=.05}
 return P}
const COLK=['top','hor','sun','hs','hg','fog','gb','gt'],NUMK=['si','el','az','hi','fn','ff','night','stars','wind','rain','snow','bolt','cover'];
let TP=target();const P={};for(const k of COLK)P[k]=TP[k].clone();for(const k of NUMK)P[k]=TP[k];
function setTime(t){st.time=t;st.tf=ORDER.indexOf(t)}
function setWeather(w){st.wx=w}
function setSeason(s){if(s===st.season)return;st.season=s;paint(SEASON[s].ground,SEASON[s].dirt);buildScatter(s)}

/* ---------- camera rigs ---------- */
const rig={pos:V3(16,4,16),look:V3(0,1.2,0),k:1.6,orbit:null,follow:false,fov:38};
function camTo(p,l,k=1.6){rig.pos.copy(p);rig.look.copy(l);rig.k=k;rig.orbit=null;rig.follow=false}
function orbit(center,r,h,speed,start=0){rig.orbit={c:center.clone(),r,h,speed,a:start};rig.follow=false;rig.k=1.2}
function heroCam(view){if(!hero)return;const p=hero.root.position,ry=hero.root.rotation.y,L=hero.spec.L,fw=V3(Math.cos(ry),0,-Math.sin(ry)),rt=V3(Math.sin(ry),0,Math.cos(ry));
 const V={iso:[1.0,.55,.9,1.1],front:[1.7,.3,.0,.7],side:[0,.35,1.6,.8],back:[-1.6,.45,.3,.9],wheel:[.55,.12,1.1,.35],top:[.4,1.6,.4,.6],roof:[-.5,1.3,.9,1.4],lights:[1.6,.25,.5,.6]}[view]||[1,.55,.9,1.1];
 const d=Math.max(5,L*1.25);const pos=p.clone().addScaledVector(fw,V[0]*d).addScaledVector(rt,V[2]*d).add(V3(0,V[1]*d+.6,0));pos.y=Math.max(pos.y,H(pos.x,pos.z)+.4);camTo(pos,p.clone().add(V3(0,V[3],0)),1.8)}
function setRig(name){if(name==='title')orbit(V3(-1,1.2,-1),15,4.2,.025,.7);
 else if(name==='pause')orbit(hero?hero.root.position:V3(),11,4,.03,0);
 else if(name==='map')camTo(V3(0,140,40),V3(0,0,0),1.2);
 else if(name==='photo'){}
 else if(name==='drive'){rig.follow=true;rig.orbit=null;rig.k=3}
 else if(name==='loading')camTo(V3(-30,18,40),V3(0,2,0),.6);
 else if(name==='menu')orbit(V3(-1,1.4,-1),20,6,.018,2)}

/* ---------- frame loop ---------- */
const clock=new T.Clock(),tmpC=C(0),sunDir=V3();let paused=false,listeners=[];
function frame(){const dt=Math.min(clock.getDelta(),1/20),t=clock.elapsedTime;
 if(st.cycle>0){st.tf=(st.tf+dt*6/(st.cycle*60))%6}
 TP=target();const k=1-Math.exp(-dt*2.2);for(const c of COLK)P[c].lerp(TP[c],k);for(const n of NUMK)P[n]+=(TP[n]-P[n])*k;
 const el=P.el*Math.PI/180,az=P.az*Math.PI/180;sunDir.set(Math.cos(el)*Math.cos(az),Math.sin(el),Math.cos(el)*Math.sin(az));
 const focus=hero&&heroPose==='drive'?hero.root.position:rig.look;
 sun.position.copy(focus).addScaledVector(sunDir,80);sun.target.position.copy(focus);sun.color.copy(P.sun);sun.intensity=P.si*sm(-2,4,P.el);sun.castShadow=st.shadows;
 hemi.color.copy(P.hs);hemi.groundColor.copy(P.hg);hemi.intensity=P.hi;scene.fog.color.copy(P.fog);scene.fog.near=P.fn;scene.fog.far=P.ff;R.setClearColor(P.fog);
 skyU.top.value.copy(P.top);skyU.hor.value.copy(P.hor);skyU.sunDir.value.copy(sunDir);skyU.sunCol.value.copy(P.sun);skyU.sunK.value=Math.min(1.2,P.si)*(1-P.rain*.85)*(st.wx==='mist'?.3:1);
 sky.position.copy(cam.position);stars.position.copy(cam.position);starM.opacity=P.stars;
 mtnM.forEach((m,i)=>{tmpC.copy(P.top).lerp(P.hs,.4).multiplyScalar(.55);m.color.copy(P.fog).lerp(tmpC,.3-i*.09)});
 GU.uBase.value.copy(P.gb);GU.uTip.value.copy(P.gt);GU.uSun.value.copy(P.sun).multiplyScalar(P.si*.85*sm(-2,6,P.el));GU.uAmb.value.copy(P.hs).multiplyScalar(P.hi*.75).add(tmpC.copy(P.hg).multiplyScalar(.15));GU.uTime.value=t;GU.uWind.value=P.wind;GU.uSnow.value=P.cover;
 grass.count=Math.floor(grass.userData.max*st.grass);grass.visible=st.grass>0;
 const lv=P.night;K.lamps.forEach(m=>m.emissiveIntensity=m.userData.base*(.03+.97*lv));K.glowSprites.forEach(s=>s.material.opacity=s.userData.base*lv);
 if(bloom){bloom.strength=.3+lv*.55;bloom.threshold=.9-lv*.3}
 const env={wind:P.wind,night:lv,time:t,rain:P.rain,snow:P.snow};
 for(const o of live)o.userData.update&&o.userData.update(dt,t,env);flies.userData.update(dt,t,{night:lv*(1-P.rain)});flock.visible=lv<.5&&P.rain<.5;
 rain.userData.update(dt,t,env,cam.position);snow.userData.update(dt,t,env,cam.position);
 if(P.bolt>.5){boltT-=dt;if(boltT<0){const a=Math.random()*TAU,p=V3(cam.position.x+Math.cos(a)*70,0,cam.position.z+Math.sin(a)*70);p.y=H(p.x,p.z);bolt.userData.strike(p);boltT=3+Math.random()*6}}bolt.userData.update(dt);
 /* hero */
 if(hero){const autoL=lv>.4||st.wx==='storm'||st.wx==='mist';hero.setLights(W.forceLights??(autoL?1:0),0);
  if(heroPose==='drive'){drv.speed+=(drv.target-drv.speed)*(1-Math.exp(-dt*1.2));drv.a+=drv.speed*dt/ROAD;const x=Math.cos(drv.a)*ROAD,z=Math.sin(drv.a)*ROAD,ry=-drv.a-Math.PI/2;
   hero.root.position.set(x,0,z);hero.root.rotation.y=ry;const ahead=H(Math.cos(drv.a+.05)*ROAD,Math.sin(drv.a+.05)*ROAD),here=H(x,z);
   hero.chassis.position.y=hero.wr+here+Math.sin(t*9)*.012*drv.speed/8;hero.chassis.rotation.z=T.MathUtils.lerp(hero.chassis.rotation.z,Math.atan2(ahead-here,ROAD*.05)*.8,.1);hero.chassis.rotation.x=T.MathUtils.lerp(hero.chassis.rotation.x,-drv.speed*.006,.05);
   for(const w of hero.wheels){w.node.position.y=hero.wr+H(x+Math.cos(ry)*w.x,z-Math.sin(ry)*w.x);w.spin.rotation.z-=drv.speed/hero.wr*dt*w.dir;if(w.front)w.steer.rotation.y=.12}
   GU.uPush.value.set(x,z,hero.spec.L*.42,0);W.speed=drv.speed;W.yaw=ry}
  else{hero.chassis.position.y=hero.wr+hero.root.position.y+Math.sin(t*31)*.0015;GU.uPush.value.set(hero.root.position.x,hero.root.position.z,hero.spec.L*.55,0);W.speed=0}
  hero.update(dt,t,env)}
 /* camera */
 if(rig.orbit){const o=rig.orbit;o.a+=dt*o.speed;rig.pos.set(o.c.x+Math.cos(o.a)*o.r,o.c.y+o.h,o.c.z+Math.sin(o.a)*o.r);rig.look.copy(o.c)}
 if(rig.follow&&hero){const ry=hero.root.rotation.y,p=hero.root.position,back=V3(-Math.cos(ry),0,Math.sin(ry)).multiplyScalar(6.5+hero.spec.L*.7);rig.pos.copy(p).add(back).add(V3(0,2.6+hero.spec.L*.2,0));rig.pos.y=Math.max(rig.pos.y,H(rig.pos.x,rig.pos.z)+1.3);rig.look.copy(p).add(V3(0,1.1,0))}
 const kk=1-Math.exp(-dt*rig.k);cam.position.lerp(rig.pos,kk);look.lerp(rig.look,kk);cam.lookAt(look);
 const fov=st.photoFovOverride??st.fov;if(Math.abs(cam.fov-fov)>.05){cam.fov+=(fov-cam.fov)*kk;cam.updateProjectionMatrix()}
 for(const f of listeners)f(dt,t);
 if(composer&&st.bloom)composer.render();else R.render(scene,cam);requestAnimationFrame(frame)}
paint(SEASON.summer.ground,SEASON.summer.dirt);buildScatter('summer');
const W={R,scene,cam,H,TIMES,ORDER,WX,st,P,setTime,setWeather,setSeason,setHero,poseHero,heroCam,setRig,camTo,drv,GAR,ROAD,forceLights:null,speed:0,yaw:0,
 get hero(){return hero},get timeLabel(){const f=st.tf,h=(6+f*3)%24;return String(Math.floor(h)).padStart(2,'0')+':'+String(Math.floor((h%1)*60)).padStart(2,'0')},
 POI:[{id:'camp',name:'Ember Camp',x:-2,z:-2,c:'#e2672e'},{id:'garage',name:'Outpost Garage',x:GAR.x,z:GAR.z,c:'#4f9fe0'},{id:'tower',name:'Pinecrest Lookout',x:-28,z:-58,c:'#6d4c8c'},{id:'light',name:'Bluewater Light',x:62,z:46,c:'#5f9a52'}],
 setScale(s){scale=s;resize()},onFrame(f){listeners.push(f)},
 snap(){if(composer&&st.bloom)composer.render();else R.render(scene,cam);return R.domElement.toDataURL('image/jpeg',.92)},start(){requestAnimationFrame(frame)}};
return W})();
