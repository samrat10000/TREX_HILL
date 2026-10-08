/* Hill Kit — reference app: sky, terrain, grass, water, presets, drive physics, audio, UI. Extracted from hillkit.html. Built against three r147 (UMD globals). See HILLKIT_REFACTOR.md. */
'use strict';
/* ============================================================================
   APP — renderer, sky, terrain, grass, water, time/weather, UI, drive physics,
   audio. Reads only from KIT.
============================================================================ */
(function(){
if(!window.THREE||!window.KIT){document.body.insertAdjacentHTML('beforeend','<p style="position:fixed;inset:auto 0 50%;text-align:center;font:600 18px Nunito">The 3D library did not load. Check your connection and reload the page.</p>');return}
const T=THREE,K=KIT,V3=K.V3,TAU=Math.PI*2,$=s=>document.querySelector(s),RM=matchMedia('(prefers-reduced-motion: reduce)').matches,MOBILE=matchMedia('(max-width:860px),(hover:none)').matches;
const C=h=>new T.Color(h),sm=(a,b,x)=>T.MathUtils.smoothstep(x,a,b),clamp=T.MathUtils.clamp;

/* ---------- renderer ---------- */
const canvas=$('#view'),R=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
R.setPixelRatio(Math.min(devicePixelRatio,MOBILE?1.5:2));R.shadowMap.enabled=true;R.shadowMap.type=T.PCFSoftShadowMap;
const scene=new T.Scene();scene.fog=new T.Fog(0xbfdcec,20,160);
const cam=new T.PerspectiveCamera(36,1,.1,1400);cam.position.set(8,3.2,8);
const ctl=new T.OrbitControls(cam,canvas);ctl.enableDamping=true;ctl.dampingFactor=.08;ctl.maxDistance=90;ctl.minDistance=1.2;ctl.target.set(0,1,0);
let composer=null,bloom=null;
try{if(T.EffectComposer&&T.UnrealBloomPass){const rt=new T.WebGLRenderTarget(2,2,{samples:R.capabilities.isWebGL2?4:0,type:T.HalfFloatType});composer=new T.EffectComposer(R,rt);composer.addPass(new T.RenderPass(scene,cam));bloom=new T.UnrealBloomPass(new T.Vector2(2,2),.45,.55,.88);composer.addPass(bloom)}}catch(e){composer=null}
function resize(){const w=innerWidth,h=innerHeight;R.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();if(composer){composer.setPixelRatio(R.getPixelRatio());composer.setSize(w,h)}}
addEventListener('resize',resize);resize();

/* ---------- sky, stars, backdrop ranges ---------- */
const skyU={top:{value:C(0)},hor:{value:C(0)},gnd:{value:C(0)},sunDir:{value:V3(0,1,0)},sunCol:{value:C(0)},sunSize:{value:1},flash:{value:0}};
const sky=new T.Mesh(new T.SphereGeometry(600,32,16),new T.ShaderMaterial({uniforms:skyU,side:T.BackSide,depthWrite:false,fog:false,
 vertexShader:'varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:'uniform vec3 top,hor,gnd,sunCol,sunDir;uniform float sunSize,flash;varying vec3 vD;void main(){vec3 d=normalize(vD);float y=d.y;vec3 c=y>0.?mix(hor,top,pow(clamp(y,0.,1.),.5)):mix(hor,gnd,clamp(-y*5.,0.,1.));float s=max(dot(d,normalize(sunDir)),0.);c+=sunCol*(pow(s,6.)*.26+pow(s,48.)*.45)*sunSize;c=mix(c,sunCol*1.5+.25,smoothstep(.9993,.9996,s)*sunSize);c+=vec3(.75,.85,1.)*flash;gl_FragColor=vec4(c,1.);}'}));
sky.renderOrder=-2;sky.frustumCulled=false;scene.add(sky);
const starG=new T.BufferGeometry(),sp=[];for(let i=0;i<1600;i++){const a=Math.random()*TAU,y=Math.random()*.95+.05,r=Math.sqrt(1-y*y);sp.push(Math.cos(a)*r*560,y*560,Math.sin(a)*r*560)}starG.setAttribute('position',new T.Float32BufferAttribute(sp,3));
const starM=new T.PointsMaterial({color:0xffffff,size:1.6,sizeAttenuation:false,transparent:true,opacity:0,fog:false,depthWrite:false}),stars=new T.Points(starG,starM);stars.renderOrder=-1;scene.add(stars);
const mtns=new T.Group(),mtnM=[];scene.add(mtns);
for(let ring=0;ring<3;ring++){const m=new T.MeshBasicMaterial({color:0x888888,fog:false});mtnM.push(m);const R0=230+ring*85;
 for(let i=0;i<16;i++){const a=i/16*TAU+ring*.5+Math.random()*.25,h=36+Math.random()*50+ring*22,r=50+Math.random()*40,g=new T.ConeGeometry(r,h,8,4),p=g.attributes.position;
  for(let k=0;k<p.count;k++){const x=p.getX(k),y=p.getY(k),z=p.getZ(k),n=1+(K.noise3(x*.05+i*7,y*.06,z*.05)-.5)*.7;p.setXYZ(k,x*n,y+(y<h/2-1?(K.noise3(x*.1,i,z*.1)-.5)*h*.15:0),z*n)}
  const me=new T.Mesh(g,m);me.position.set(Math.cos(a)*R0,h/2-10,Math.sin(a)*R0);mtns.add(me)}}

/* ---------- lights ---------- */
const sun=new T.DirectionalLight(0xffffff,1.2);sun.castShadow=true;sun.shadow.mapSize.set(MOBILE?1024:2048,MOBILE?1024:2048);
Object.assign(sun.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:1,far:160});sun.shadow.bias=-.0005;sun.shadow.normalBias=.035;scene.add(sun,sun.target);
const hemi=new T.HemisphereLight(0xffffff,0x444444,.6);scene.add(hemi);
const flashL=new T.DirectionalLight(0xc8d8ff,0);flashL.position.set(-20,60,-10);scene.add(flashL);

/* ---------- terrain ---------- */
const WATER_Y=-1.4,LAKE=[-40,34],TRACK=34;
function H(x,z){const d=Math.hypot(x,z),flat=sm(9,22,d),n=K.noise3;
 let h=(n(x*.018,0,z*.018)-.5)*16*sm(28,95,d)+(n(x*.07+5,1,z*.07)-.5)*2.8*flat+(n(x*.3,2,z*.3)-.5)*.5*flat;
 h-=6*(1-sm(0,21,Math.hypot(x-LAKE[0],z-LAKE[1])));const rd=Math.abs(d-TRACK);h=T.MathUtils.lerp(h,h*.6,1-sm(1.5,4,rd));return h}
const roadF=(x,z)=>1-sm(2,3.2,Math.abs(Math.hypot(x,z)-TRACK));
const TS=320,TN=MOBILE?150:210,tg=new T.PlaneGeometry(TS,TS,TN,TN);tg.rotateX(-Math.PI/2);const tp=tg.attributes.position;
for(let i=0;i<tp.count;i++)tp.setY(i,H(tp.getX(i),tp.getZ(i)));tg.computeVertexNormals();tg.setAttribute('color',new T.BufferAttribute(new Float32Array(tp.count*3),3));
const TU={uCover:{value:0},uWet:{value:0}},terrainMat=new T.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:1});
terrainMat.onBeforeCompile=s=>{Object.assign(s.uniforms,TU);s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying float vNY;').replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nvNY=objectNormal.y;');
 s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying float vNY;uniform float uCover,uWet;').replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=1.-uWet*.25;diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.93,.95,1.),uCover*smoothstep(.5,.85,vNY));')};
const terrain=new T.Mesh(tg,terrainMat);terrain.receiveShadow=true;scene.add(terrain);
const skirtM=new T.MeshLambertMaterial({color:0x9c7a3c}),skirt=new T.Mesh(new T.CircleGeometry(900,32).rotateX(-Math.PI/2),skirtM);skirt.position.y=-4;scene.add(skirt);

/* ---------- grass (instanced, wind + push) ---------- */
const GU=T.UniformsUtils.merge([T.UniformsLib.fog,{uTime:{value:0},uWind:{value:V3(1,1,.4)},uBase:{value:C(0)},uTip:{value:C(0)},uSun:{value:C(0)},uAmb:{value:C(0)},uPush:{value:new T.Vector4()},uPush2:{value:new T.Vector4()},uSnow:{value:0}}]);
const grassMat=new T.ShaderMaterial({uniforms:GU,fog:true,side:T.DoubleSide,
 vertexShader:`uniform float uTime;uniform vec3 uWind;uniform vec4 uPush,uPush2;varying float vH;varying vec3 vTint;
#include <common>
#include <fog_pars_vertex>
void main(){vH=uv.y;vec4 wp=modelMatrix*instanceMatrix*vec4(position,1.);float ph=wp.x*.32+wp.z*.21;float w=sin(uTime*1.6+ph)*.55+sin(uTime*3.7+ph*2.3)*.18+.35;float bend=vH*vH;
wp.xz+=uWind.xz*w*bend*uWind.y*.38;
vec2 d=wp.xz-uPush.xy;float l=length(d);float p=(1.-smoothstep(uPush.z*.45,uPush.z,l))*step(.01,uPush.z);wp.xz+=d/(l+.001)*p*bend*.8;wp.y-=p*vH*.4;
d=wp.xz-uPush2.xy;l=length(d);p=(1.-smoothstep(uPush2.z*.55,uPush2.z,l))*step(.01,uPush2.z);wp.xz+=d/(l+.001)*p*bend*.6;wp.y-=p*vH*.5;
vTint=vec3(1.);
#ifdef USE_INSTANCING_COLOR
vTint=instanceColor;
#endif
vec4 mvPosition=viewMatrix*wp;gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`,
 fragmentShader:`uniform vec3 uBase,uTip,uSun,uAmb;uniform float uSnow;varying float vH;varying vec3 vTint;
#include <common>
#include <fog_pars_fragment>
void main(){vec3 c=mix(uBase,uTip,smoothstep(0.,1.,vH))*vTint;c=mix(c,vec3(.95,.96,1.),uSnow*smoothstep(.35,1.,vH));c*=uAmb+uSun*(.25+.75*vH);gl_FragColor=vec4(c,1.);
#include <fog_fragment>
}`});
K.shared.grassMat=grassMat;
const GN=MOBILE?26000:62000,grass=new T.InstancedMesh(K.bladeGeo(),grassMat,GN);grass.frustumCulled=false;scene.add(grass);
(function(){const d=new T.Object3D(),c=new T.Color();let i=0,tries=0;while(i<GN&&tries<GN*4){tries++;const a=Math.random()*TAU,r=Math.sqrt(Math.random())*80,x=Math.cos(a)*r,z=Math.sin(a)*r,h=H(x,z);
 if(roadF(x,z)>.35||h<WATER_Y+.25)continue;const near=sm(2.5,8,r);d.position.set(x,h-.05,z);d.rotation.set(0,Math.random()*TAU,0);const s=(.75+Math.random()*.7)*(.45+.55*near);d.scale.set(s,s*(.8+Math.random()*.6),s);d.updateMatrix();grass.setMatrixAt(i,d.matrix);grass.setColorAt(i,c.setScalar(.78+Math.random()*.34));i++}grass.count=i;grass.userData.max=i})();

/* ---------- water ---------- */
const WU=T.UniformsUtils.merge([T.UniformsLib.fog,{uTime:{value:0},uDeep:{value:C(0x1d6f86)},uShallow:{value:C(0x3fc1c9)},uSky:{value:C(0)},uSunDir:{value:V3(0,1,0)},uSunCol:{value:C(0)},uMin:{value:0}}]);
const waterVS=`uniform float uTime;attribute float aDepth;varying vec3 vW;varying float vDepth;
#include <common>
#include <fog_pars_vertex>
void main(){vec4 wp=modelMatrix*vec4(position,1.);wp.y+=sin(wp.x*.35+uTime*1.2)*.05+sin(wp.z*.5+uTime*.9)*.04;vW=wp.xyz;vDepth=aDepth;vec4 mvPosition=viewMatrix*wp;gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`,waterFS=`uniform float uTime,uMin;uniform vec3 uDeep,uShallow,uSky,uSunDir,uSunCol;varying vec3 vW;varying float vDepth;
#include <common>
#include <fog_pars_fragment>
float hs(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){float t=uTime;vec3 n=normalize(vec3(-cos(vW.x*.35+t*1.2)*.0175-cos(vW.x*1.7+vW.z*.6+t*2.)*.03,1.,-cos(vW.z*.5+t*.9)*.02-cos(vW.z*2.1-vW.x*.4+t*1.6)*.03));
vec3 v=normalize(cameraPosition-vW);float fr=pow(1.-max(dot(n,v),0.),3.);float dep=max(vDepth,uMin);
vec3 col=mix(uShallow,uDeep,smoothstep(.2,2.5,dep));col=mix(col,uSky,fr*.65);vec3 r=reflect(-normalize(uSunDir),n);float sp=pow(max(dot(r,v),0.),140.);
float sk=step(.94,hs(floor(vW.xz*5.)+floor(t*3.)))*pow(max(dot(r,v),0.),6.);col+=uSunCol*(sp*2.2+sk*1.3);
float foam=(1.-smoothstep(.05,.35,dep+sin(t*1.5+vW.x*2.)*.04))*(1.-step(.5,uMin));col=mix(col,vec3(.95,.98,1.),foam*.85);
gl_FragColor=vec4(col,mix(.86,.95,smoothstep(.2,2.,dep)));
#include <fog_fragment>
}`;
const waterMat=new T.ShaderMaterial({uniforms:WU,vertexShader:waterVS,fragmentShader:waterFS,fog:true,transparent:true});
const wg=new T.PlaneGeometry(90,90,90,90);wg.rotateX(-Math.PI/2);wg.translate(LAKE[0],0,LAKE[1]);const wd=new Float32Array(wg.attributes.position.count);for(let i=0;i<wd.length;i++)wd[i]=WATER_Y-H(wg.attributes.position.getX(i),wg.attributes.position.getZ(i));wg.setAttribute('aDepth',new T.BufferAttribute(wd,1));
const water=new T.Mesh(wg,waterMat);water.position.y=WATER_Y;scene.add(water);
K.shared.waterMat=new T.ShaderMaterial({uniforms:{...WU,uMin:{value:1.5}},vertexShader:waterVS,fragmentShader:waterFS,fog:true,transparent:true});

/* ---------- biomes & scatter ---------- */
const BIOMES={
 meadow:{name:'Meadow',grass:[0x9a6224,0xf2c35c],ground:0x9c7a3c,dirt:0xb38c5c,sand:0xdcc48e,rock:0x8a8d9a,dens:1,trees:[['pine','summer',5],['pine','autumn',2],['aspen','autumn',2]],bush:['green','autumn'],rocks:'boulder',water:[0x1d6f86,0x3fc1c9]},
 highland:{name:'Highland',grass:[0x2f5a2c,0x8cbf5a],ground:0x4c6a36,dirt:0x8a7552,sand:0xc8b88a,rock:0x7d8293,dens:1,trees:[['pine','summer',6],['pine','blue',2],['oak','summer',1]],bush:['green','sage'],rocks:'cluster',aurora:1,water:[0x1d5a6e,0x3a9aa8]},
 autumn:{name:'Autumn',grass:[0x8a3e24,0xeb8f48],ground:0x8a4a2c,dirt:0xa8724a,sand:0xd8b88a,rock:0x8a7d80,dens:1,trees:[['aspen','autumn',4],['maple','autumn',3],['pine','summer',2],['pine','autumn',2]],bush:['autumn'],rocks:'boulder',water:[0x1d6f86,0x3fc1c9]},
 desert:{name:'Desert',grass:[0x8a6a3a,0xd9b46a],ground:0xd49a62,dirt:0xc98a58,sand:0xe8c48e,rock:0xb8583a,dens:.2,trees:[['cactus',null,4],['palm',null,1],['snag',null,1]],bush:['desert'],rocks:'mesa',mt:0xc0603a,water:[0x1f7a7a,0x56d2c2]},
 alpine:{name:'Snowline',grass:[0x8a8f9a,0xe8ecf4],ground:0xe8ecf4,dirt:0xb8b2bc,sand:0xd8d8e0,rock:0x7d8293,dens:.3,trees:[['pine','winter',6]],bush:['snow'],rocks:'snow',cover:1,aurora:1,mt:0xf4f6fb,water:[0x2a5a78,0x6aa8c8]},
 coast:{name:'Coast',grass:[0x6a7a32,0xd2d27a],ground:0xa89a5a,dirt:0xc2a26a,sand:0xf0dcae,rock:0x8a8d9a,dens:.7,trees:[['palm',null,4],['pine','summer',2]],bush:['green','sage'],rocks:'cluster',water:[0x0f8a9a,0x5ae4dc]}};
let scatter=null;
function bake(objs){const buckets=new Map();for(const o of objs){o.updateMatrixWorld(true);o.traverse(m=>{if(!m.isMesh||m.material.transparent)return;let g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();
 for(const k of Object.keys(g.attributes))if(!['position','normal','color'].includes(k))g.deleteAttribute(k);if(!g.attributes.normal)g.computeVertexNormals();g.applyMatrix4(m.matrixWorld);const key=m.material.uuid;if(!buckets.has(key))buckets.set(key,{m:m.material,gs:[]});buckets.get(key).gs.push(g)})}
 const out=new T.Group();for(const{m,gs}of buckets.values()){const mg=T.BufferGeometryUtils.mergeBufferGeometries(gs,false);gs.forEach(g=>g.dispose());if(!mg)continue;const me=new T.Mesh(mg,m);me.castShadow=me.receiveShadow=true;out.add(me)}return out}
function paintTerrain(b){const col=tg.attributes.color,n=tg.attributes.normal,c=new T.Color(),G=C(b.ground),D=C(b.dirt),S=C(b.sand),Rk=C(b.rock);
 for(let i=0;i<tp.count;i++){const x=tp.getX(i),y=tp.getY(i),z=tp.getZ(i),nz=K.noise3(x*.15,0,z*.15);c.copy(G).multiplyScalar(.86+nz*.24);c.lerp(D,roadF(x,z)*.92);c.lerp(S,1-sm(WATER_Y+.2,WATER_Y+1.2,y));c.lerp(Rk,sm(.82,.68,n.getY(i))*.8);col.setXYZ(i,c.r,c.g,c.b)}
 col.needsUpdate=true;skirtM.color.copy(G).multiplyScalar(.9)}
function treeOf(spec,sd){const[k,s]=spec;if(k==='pine')return K.pine({season:s,seed:sd});if(k==='aspen'||k==='maple'||k==='oak')return K.broadleaf({kind:k,season:s,seed:sd});if(k==='palm')return K.palm({seed:sd});if(k==='cactus')return K.cactus({seed:sd});return K.snag({seed:sd})}
function buildScatter(b){if(scatter){scene.remove(scatter);scatter.traverse(m=>m.geometry&&m.geometry.dispose())}
 const objs=[],wsum=b.trees.reduce((a,t)=>a+t[2],0);let sd=1;const place=(o,x,z,s=1)=>{o.position.set(x,H(x,z)-.05,z);o.rotation.y=Math.random()*TAU;o.scale.setScalar(s);objs.push(o)};
 const ok=(x,z,clr=1)=>Math.hypot(x,z)>13&&roadF(x,z)<.05&&Math.abs(Math.hypot(x,z)-TRACK)>4.5*clr&&H(x,z)>WATER_Y+.4;
 for(let i=0,t=0;i<(MOBILE?110:180)&&t<3000;t++){const a=Math.random()*TAU,r=14+Math.pow(Math.random(),.8)*120,x=Math.cos(a)*r,z=Math.sin(a)*r;if(!ok(x,z))continue;
  let w=Math.random()*wsum,sp=b.trees[0];for(const tr of b.trees){w-=tr[2];if(w<=0){sp=tr;break}}const cl=K.noise3(x*.04,3,z*.04);if(cl<.38&&Math.random()<.6)continue;place(treeOf(sp,sd++),x,z,.8+Math.random()*.6);i++}
 for(let i=0,t=0;i<60&&t<1500;t++){const a=Math.random()*TAU,r=12+Math.random()*90,x=Math.cos(a)*r,z=Math.sin(a)*r;if(!ok(x,z,.6))continue;place(K.bush({tone:b.bush[i%b.bush.length],seed:sd++}),x,z,.8+Math.random()*.7);i++}
 for(let i=0,t=0;i<34&&t<1500;t++){const a=Math.random()*TAU,r=12+Math.random()*110,x=Math.cos(a)*r,z=Math.sin(a)*r;if(!ok(x,z,.6))continue;
  const kind=b.rocks==='mesa'?(r>60&&i<6?'mesa':'boulder'):b.rocks==='snow'?'boulder':b.rocks==='cluster'&&i%3?'cluster':'boulder';place(K.rock({kind,seed:sd++,snow:b.rocks==='snow',tone:b.rocks==='mesa'?0xa86a4a:undefined}),x,z,kind==='mesa'?1+Math.random():.6+Math.random()*1.1);i++}
 scatter=bake(objs);scene.add(scatter)}

/* ---------- time of day + weather presets ---------- */
const TIMES={
 dawn:{l:'Dawn',top:0x6e6aa6,hor:0xf4a68c,gnd:0x6a5466,sun:0xffb08a,si:.85,el:5,az:80,hs:0xa594c8,hg:0x5a4558,hi:.66,fog:0xe9a596,fn:14,ff:130,night:.5,wind:.6,stars:.15,t:.07},
 morning:{l:'Morning',top:0x4f9fe0,hor:0xcde6ef,gnd:0x8c8a7a,sun:0xfff0d4,si:1.15,el:24,az:110,hs:0xbcd7ee,hg:0x7a6a4c,hi:.7,fog:0xc4dfeb,fn:22,ff:170,night:0,wind:.7,stars:0,t:.27},
 noon:{l:'Noon',top:0x3b97de,hor:0xa8dbf2,gnd:0x9a9478,sun:0xffffff,si:1.25,el:62,az:160,hs:0xc6e2f4,hg:0x8a7650,hi:.72,fog:0xa6d6ef,fn:30,ff:190,night:0,wind:.8,stars:0,t:.5},
 golden:{l:'Golden',top:0xf3b27a,hor:0xffdcaa,gnd:0x9a6a50,sun:0xffb055,si:1.45,el:9,az:235,hs:0xffd2a0,hg:0x7a4a38,hi:.72,fog:0xf8c793,fn:12,ff:125,night:0,wind:.8,stars:0,t:.72},
 dusk:{l:'Dusk',top:0x6d4c8c,hor:0xff8c78,gnd:0x5a3a50,sun:0xff7055,si:.9,el:2.5,az:260,hs:0xc77ea6,hg:0x4a2c4a,hi:.62,fog:0xe98a80,fn:10,ff:115,night:.62,wind:.6,stars:.25,t:.89},
 night:{l:'Night',top:0x081530,hor:0x22355e,gnd:0x0a0f1c,sun:0x8ea6ff,si:.32,el:40,az:300,hs:0x30447a,hg:0x120f1a,hi:.42,fog:0x1a2745,fn:8,ff:85,night:1,wind:.5,stars:1,t:1}};
const WEATHER={clear:{l:'Clear'},rain:{l:'Rain',tint:0x5f7c86,mix:.45,si:.55,fn:.6,ff:.6,rain:.65,wind:1.3,wet:1,night:.2},storm:{l:'Storm',tint:0x1f5552,mix:.72,si:.35,fn:.35,ff:.5,rain:1,bolt:1,wind:2,wet:1,night:.5},
 mist:{l:'Mist',mix:.55,si:.5,fn:.1,ff:.32,wind:.3,night:.3},snow:{l:'Snow',tint:0xd8cfe0,mix:.45,si:.6,fn:.45,ff:.45,snow:1,wind:1.1,cover:1,night:.25}};
const S={time:'golden',wx:'clear',biome:'meadow',mode:'inspect',cat:'Vehicles',q:'',turn:false,edges:false,grass:true,sound:false};
const NUM=['si','el','az','hi','fn','ff','night','wind','stars','rain','snow','bolt','cover','wet','aurora'],COL=['top','hor','gnd','sun','hs','hg','fog','gb','gt','wd','ws','mt'];
function targetP(){const t=TIMES[S.time],w=WEATHER[S.wx],b=BIOMES[S.biome],P={};for(const k of COL.slice(0,7))P[k]=C(t[k]);for(const k of NUM)P[k]=t[k]??0;
 P.gb=C(b.grass[0]);P.gt=C(b.grass[1]);P.wd=C(b.water[0]);P.ws=C(b.water[1]);P.cover=b.cover||0;P.mt=C(b.mt??t.hs);
 if(S.wx!=='clear'){const tint=w.tint!==undefined?C(w.tint):P.hor.clone();for(const k of['top','hor','fog','hs'])P[k].lerp(tint,w.mix);P.gnd.lerp(tint,w.mix*.5);P.si*=w.si;P.fn*=w.fn;P.ff*=w.ff;P.wind=w.wind;P.rain=w.rain||0;P.snow=w.snow||0;P.bolt=w.bolt||0;P.wet=w.wet||0;P.cover=Math.max(P.cover,w.cover||0);P.night=Math.min(1,P.night+(w.night||0)*(1-P.night));P.stars*=.05}
 P.aurora=(b.aurora||0)*t.stars*(S.wx==='clear'?1:0);return P}
let TP=targetP();const P=(()=>{const o={};for(const k of COL)o[k]=TP[k].clone();for(const k of NUM)o[k]=TP[k];return o})();
function setMode(){TP=targetP();uiSync()}

/* ---------- world ambience ---------- */
const rain=K.Rain(MOBILE?1400:2400),snow=K.Snow(MOBILE?1600:2800),bolt=K.Lightning(),flies=K.Fireflies(70,16),aur=K.Aurora(),birds=K.flock({n:10});
aur.position.set(0,90,-260);aur.rotation.x=.25;birds.position.set(6,13,-4);scene.add(rain,snow,bolt,flies,aur,birds);
let boltT=3;

/* ---------- audio (procedural, opt-in) ---------- */
const AU={ctx:null,start(){if(this.ctx){this.ctx.resume();return}const c=this.ctx=new (window.AudioContext||window.webkitAudioContext)(),m=this.m=c.createGain();m.gain.value=.55;m.connect(c.destination);
 const b=c.createBuffer(1,c.sampleRate*2,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;this.nb=b;const ns=()=>{const s=c.createBufferSource();s.buffer=b;s.loop=true;s.start();return s};
 const bp=(f,q,t='bandpass')=>{const x=c.createBiquadFilter();x.type=t;x.frequency.value=f;x.Q.value=q;return x},G=v=>{const g=c.createGain();g.gain.value=v;return g};
 this.rainG=G(0);ns().connect(bp(2600,.5)).connect(this.rainG).connect(m);this.wf=bp(380,.7,'lowpass');this.windG=G(0);ns().connect(this.wf).connect(this.windG).connect(m);
 this.o1=c.createOscillator();this.o1.type='sawtooth';this.o2=c.createOscillator();this.o2.type='square';this.ef=bp(500,1.2,'lowpass');this.engG=G(0);const g2=G(.35);this.o1.connect(this.ef);this.o2.connect(g2).connect(this.ef);this.ef.connect(this.engG).connect(m);this.o1.start();this.o2.start();
 this.fireG=G(0);this.fireG.connect(m)},
 set(on){if(on)this.start();if(this.m)this.m.gain.setTargetAtTime(on?.55:0,this.ctx.currentTime,.2)},
 tick(e){if(!this.ctx||!S.sound)return;const c=this.ctx,t=c.currentTime;this.rainG.gain.setTargetAtTime(e.rain*.32,t,.4);this.windG.gain.setTargetAtTime(.03+e.wind*.05,t,.6);this.wf.frequency.setTargetAtTime(240+e.wind*220+Math.sin(t*.37)*90,t,.6);
  if(e.eng){const f=e.rpm/60*(e.cyl||2)/2*e.pitch;this.o1.frequency.setTargetAtTime(f,t,.05);this.o2.frequency.setTargetAtTime(f*.5,t,.05);this.ef.frequency.setTargetAtTime(300+e.load*1400,t,.08);this.engG.gain.setTargetAtTime(.07+e.load*.1,t,.08)}else this.engG.gain.setTargetAtTime(0,t,.2);
  if(e.fire>0&&Math.random()<e.fire*.25)this.pop(.04*e.fire);if(e.birds&&Math.random()<.004)this.chirp()},
 pop(v){const c=this.ctx,s=c.createBufferSource(),g=c.createGain(),f=c.createBiquadFilter();s.buffer=this.nb;f.type='highpass';f.frequency.value=1800;g.gain.setValueAtTime(v,c.currentTime);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+.05);s.connect(f).connect(g).connect(this.m);s.start(0,Math.random());s.stop(c.currentTime+.06)},
 chirp(){const c=this.ctx,o=c.createOscillator(),g=c.createGain(),t=c.currentTime,f=2200+Math.random()*1500;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*1.4,t+.08);o.frequency.exponentialRampToValueAtTime(f*.9,t+.16);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.025,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.18);o.connect(g).connect(this.m);o.start(t);o.stop(t+.2)},
 thunder(delay){if(!this.ctx||!S.sound)return;const c=this.ctx,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain(),t=c.currentTime+delay;s.buffer=this.nb;s.loop=true;f.type='lowpass';f.frequency.value=140;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.9,t+.12);g.gain.exponentialRampToValueAtTime(.0001,t+3.5);s.connect(f).connect(g).connect(this.m);s.start(t);s.stop(t+3.6)}};

/* ---------- stage: the selected model ---------- */
const stage=new T.Group();scene.add(stage);const ENTRY=Object.fromEntries(K.ENTRIES.map(e=>[e.id,e])),OPTS={};
const cur={id:null,obj:null,rig:null,world:[]};let updaters=[];
function defaultsFor(e){if(e.vehicle)return Object.assign({},K.VDEF,K.VEH[e.id].def,{paint:K.VEH[e.id].def.paint||'tangerine'});const o={seed:1};for(const x of e.opts||[]){if(x.d!==undefined)o[x.k]=x.d;else if(x.t==='seg')o[x.k]=x.v[0];else if(x.t==='swatch'&&x.sw)o[x.k]=x.sw[0]}return o}
function disposeTree(o){o.traverse(m=>{if(m.isSprite)K.glowSprites.delete(m);if(m.geometry)m.geometry.dispose()})}
function clearStage(){if(cur.obj){stage.remove(cur.obj);disposeTree(cur.obj)}for(const w of cur.world)scene.remove(w);cur.world=[];cur.obj=cur.rig=null}
function build(id,keepCam){const e=ENTRY[id],o=OPTS[id]||(OPTS[id]=defaultsFor(e));clearStage();cur.id=id;
 if(e.vehicle){const r=K.vehicle(id,o);cur.rig=r;cur.obj=r.root;cur.world=r.world}else{cur.obj=e.build({...o});cur.world=cur.obj.userData.world||[]}
 stage.add(cur.obj);for(const w of cur.world)scene.add(w);if(S.edges)edges(true);
 const bb=new T.Box3().setFromObject(cur.obj),sz=bb.getSize(V3()),ctr=bb.getCenter(V3());cur.size=Math.max(sz.x,sz.y,sz.z);cur.center=ctr;cur.foot=Math.max(sz.x,sz.z);
 if(!keepCam)frame('iso');renderInspector();markList();if(drive.on)respawnDrive()}
function frame(view){const c=cur.center||V3(0,1,0),d=Math.max(4,cur.size*1.55+1.5),dirs={front:V3(1,.18,0),back:V3(-1,.18,0),left:V3(0,.18,-1),right:V3(0,.18,1),top:V3(.001,1,0),under:V3(.001,-1,.001),iso:V3(1,.42,.85)};
 const dir=(dirs[view]||dirs.iso).clone().normalize();camTo(c.clone().addScaledVector(dir,d),c.clone())}
let tw=null;function camTo(p,t,dur=.9){tw={p0:cam.position.clone(),t0:ctl.target.clone(),p1:p,t1:t,t:0,d:RM?0:dur}}
const edgeM=new T.LineBasicMaterial({color:0x23253a,transparent:true,opacity:.55});
function edges(on){if(!cur.obj)return;const add=[];cur.obj.traverse(m=>{if(m.isMesh&&!m.userData.edge)add.push(m)});if(on){for(const m of add){const l=new T.LineSegments(new T.EdgesGeometry(m.geometry,28),edgeM);l.userData.edge=1;l.raycast=()=>{};m.add(l)}}else{const rm=[];cur.obj.traverse(m=>{if(m.userData.edge)rm.push(m)});rm.forEach(l=>{l.parent.remove(l);l.geometry.dispose()})}}
function stats(){let tris=0,meshes=0,lights=0;cur.obj.traverse(m=>{if(m.isMesh&&!m.userData.edge){meshes++;const g=m.geometry;tris+=(g.index?g.index.count:g.attributes.position.count)/3}if(m.isLight)lights++});return{tris,meshes,lights}}

/* ---------- diorama ---------- */
const dio={on:false,objs:[],world:[]};
function buildDiorama(){clearDiorama();const L=[['ranger40',{},2.5,1.5,-.7],['van',{},-7,3.5,2.1],['trek110',{load:'tent'},6,-4.5,.9],['bronc',{},-1,9,2.6],['aframe',{},-9,-11,.5],['tower',{},13,-15,.2],['firepit',{},-2,-3,0],['tent',{color:0xe0743a},-5.4,-.6,1.2],['chair',{},-.6,-1.8,2.4],['chair',{color:0xe0743a},-3.4,-1.6,-2.2],['fairy',{},-2.5,-7,0],['deer',{},10,5,2.2],['p_table',{},2,-6,.3],['outpost',{},17,7,-.6],['lighthouse',{},-27,22,.6],['ferry',{},-42,38,1.1],['beacon',{},-14,8,0],['pier',{},-31,30,-2.73]];
 for(const[id,o,x,z,ry]of L){const e=ENTRY[id];let obj,world=[];if(e.vehicle){const r=K.vehicle(id,{...defaultsFor(e),...o,lights:'auto'});r.setSpots(false);obj=r.root;world=r.world;obj.userData.rig=r}else{obj=e.build({...defaultsFor(e),...o});world=obj.userData.world||[]}
  obj.position.set(x,id==='ferry'?WATER_Y-.25:Math.max(H(x,z),id==='pier'?WATER_Y-1:-99),z);if(id==='pier')obj.position.y=WATER_Y-.9;obj.rotation.y=ry;scene.add(obj);world.forEach(w=>scene.add(w));dio.objs.push(obj);dio.world.push(...world)}
 dio.on=true;stage.visible=false;cur.world.forEach(w=>w.visible=false)}
function clearDiorama(){for(const o of dio.objs){scene.remove(o);disposeTree(o)}for(const w of dio.world)scene.remove(w);dio.objs=[];dio.world=[];dio.on=false;stage.visible=true;cur.world.forEach(w=>w.visible=true)}

/* ---------- test drive: spring-damper suspension on the terrain ---------- */
const drive={on:false,rig:null,keys:{},camMode:'chase',x:0,z:0,yaw:0,v:0,steer:0,y:0,vy:0,p:0,vp:0,r:0,vr:0,la:0,lo:0,lightOverride:null};
const dust=[];for(let i=0;i<70;i++){const m=new T.SpriteMaterial({map:K.glow(new T.Group(),0xffffff,1,0,0,0,false).material.map,color:0xc8a878,transparent:true,opacity:0,depthWrite:false});const s=new T.Sprite(m);s.userData={life:0};scene.add(s);dust.push(s)}
let dustI=0;function puff(p,col,sz){const s=dust[dustI++%dust.length];s.position.copy(p);s.userData={life:1,v:V3((Math.random()-.5)*.8,.5+Math.random()*.6,(Math.random()-.5)*.8),sz};s.material.color.copy(col)}
function respawnDrive(){const keep=drive.rig?{x:drive.x,z:drive.z,yaw:drive.yaw,v:drive.v}:null;if(drive.rig){scene.remove(drive.rig.root);disposeTree(drive.rig.root);drive.rig.world.forEach(w=>scene.remove(w))}
 const id=ENTRY[cur.id]&&ENTRY[cur.id].vehicle?cur.id:'ranger40',r=K.vehicle(id,OPTS[id]||defaultsFor(ENTRY[id]));drive.rig=r;scene.add(r.root);r.world.forEach(w=>scene.add(w));
 if(keep)Object.assign(drive,keep);else{drive.x=TRACK;drive.z=0;drive.yaw=Math.PI/2;drive.v=0}
 drive.y=H(drive.x,drive.z)+r.wr;drive.vy=drive.p=drive.vp=drive.r=drive.vr=0;const xs=r.wheels.map(w=>w.x),zs=r.wheels.map(w=>w.z);drive.Ip=xs.reduce((a,x)=>a+x*x,0)/xs.length*1.25;drive.Ir=zs.reduce((a,z)=>a+z*z,0)/zs.length*1.5;drive.wb=Math.max(...xs)-Math.min(...xs);
 r.wheels.forEach(w=>{w.c=0;w.comp=0});$('#susp').innerHTML=r.wheels.map(()=>'<i></i>').join('');stage.visible=false;cur.world.forEach(w=>w.visible=false)}
function startDrive(){if(dio.on)clearDiorama();drive.on=true;drive.rig=null;respawnDrive();ctl.enabled=false;$('#hud').classList.add('on');document.body.classList.add('driving');canvas.focus();toast('Drive with W A S D. Esc to stop.')}
function stopDrive(){if(!drive.on)return;drive.on=false;scene.remove(drive.rig.root);disposeTree(drive.rig.root);drive.rig.world.forEach(w=>scene.remove(w));drive.rig=null;ctl.enabled=true;$('#hud').classList.remove('on');document.body.classList.remove('driving');stage.visible=true;cur.world.forEach(w=>w.visible=true);GU.uPush.value.set(0,0,0,0);frame('iso')}
function stepDrive(dt){const r=drive.rig,E=r.engine,SU=r.susp,k=drive.keys,g=9.8,n=r.wheels.length;
 const thr=(k.up?1:0)-(k.down?1:0),br=k.brake?1:0,st=(k.left?1:0)-(k.right?1:0);
 drive.steer+=(st*.58*(1-Math.min(.55,Math.abs(drive.v)/32))-drive.steer)*Math.min(1,dt*5);
 const climb=E.climb||1;let a=0;if(thr>0)a=drive.v<-.5?14:E.acc*Math.max(0,1-drive.v/E.top);else if(thr<0)a=drive.v>.5?-15:-E.acc*.55*Math.max(0,1+drive.v/8);
 a+=-Math.sin(drive.p)*g*.8/climb-drive.v*.06-(Math.abs(drive.v)>.05?Math.sign(drive.v)*.35:0);if(br)a-=Math.sign(drive.v)*17;
 const air=r.wheels.every(w=>w.air);if(air)a*=.1;const v0=drive.v;drive.v+=a*dt;if((br||thr===0)&&Math.abs(drive.v)<.06)drive.v=0;
 const yr=drive.v*Math.tan(drive.steer)/drive.wb;drive.yaw+=yr*dt;drive.x+=Math.cos(drive.yaw)*drive.v*dt;drive.z-=Math.sin(drive.yaw)*drive.v*dt;
 const rr=Math.hypot(drive.x,drive.z);if(rr>120){drive.x*=120/rr;drive.z*=120/rr;drive.v*=.5}
 drive.lo=T.MathUtils.lerp(drive.lo,(drive.v-v0)/dt,.2);drive.la=drive.v*yr;
 const trav=.2*SU.travel+r.cfg.lift*.3,droop=.24*SU.travel+r.cfg.lift*.3,cs=Math.cos(drive.yaw),sn=Math.sin(drive.yaw),sp=Math.sin(drive.p),sr=Math.sin(drive.r);let F=0,Mp=0,Mr=0;
 for(const w of r.wheels){const wx=drive.x+w.x*cs+w.z*sn,wz=drive.z-w.x*sn+w.z*cs,gc=H(wx,wz)+r.wr,my=drive.y+w.x*sp-w.z*sr;let comp=gc-my,f=0;
  if(comp<-droop){w.air=true;w.y=my-droop;comp=-droop}else{w.air=false;w.y=gc;const cv=(comp-w.c)/dt;f=g/n+SU.k*comp+SU.c*cv;if(comp>trav)f+=(comp-trav)*SU.k*10+Math.max(0,cv)*SU.c*3;f=Math.max(0,f)}
  w.c=comp;w.comp=comp;w.norm=(comp+droop)/(droop+trav);F+=f;Mp+=f*w.x;Mr-=f*w.z}
 drive.vy+=(F-g)*dt;drive.vp+=(Mp/drive.Ip+drive.lo*.4-drive.vp*.8)*dt;drive.vr+=(Mr/drive.Ir+drive.la*.5-drive.vr*.8)*dt;
 drive.y+=drive.vy*dt;drive.p=clamp(drive.p+drive.vp*dt,-.7,.7);drive.r=clamp(drive.r+drive.vr*dt,-.6,.6);
 for(const w of r.wheels){w.spin.rotation.z-=drive.v/r.wr*dt*w.dir;if(w.front)w.steer.rotation.y=drive.steer}}
function updateDrive(dt,t){const r=drive.rig;for(let i=0;i<4;i++)stepDrive(dt/4);
 r.root.position.set(drive.x,0,drive.z);r.root.rotation.y=drive.yaw;r.chassis.position.y=drive.y;r.chassis.rotation.set(drive.r,0,drive.p);for(const w of r.wheels)w.node.position.y=w.y;
 const braking=drive.keys.brake||(drive.keys.down&&drive.v>.5),night=drive.lightOverride??(P.night>.4||S.wx==='storm'||S.wx==='mist'?1:0);r.setLights(night,braking?1:0);
 GU.uPush.value.set(drive.x,drive.z,r.spec.L*.42,0);
 const sp=Math.abs(drive.v),fw=V3(Math.cos(drive.yaw),0,-Math.sin(drive.yaw));
 if(sp>3&&Math.random()<sp/25)for(const w of r.wheels)if(!w.air&&w.x<0){const p=V3(w.x,0,w.z).applyAxisAngle(V3(0,1,0),drive.yaw).add(V3(drive.x,w.y-r.wr+.1,drive.z));puff(p,(S.wx==='snow'||BIOMES[S.biome].cover?C(0xf2f4fa):C(BIOMES[S.biome].dirt)).multiply(C(0xdddddd)).lerp(P.fog,.3),.8+sp*.06)}
 if(r.engine.cyl&&(drive.keys.up&&Math.random()<.25)){const e=r.exhaust.clone().applyAxisAngle(V3(1,0,0),0);const p=e.applyAxisAngle(V3(0,1,0),drive.yaw).add(V3(drive.x,drive.y,drive.z));puff(p,C(r.cfg.engine==='diesel'?0x5a5a5a:0xb8b8b8),.5)}
 $('#spd').firstChild.nodeValue=Math.round(sp*3.6);const bars=$('#susp').children;r.wheels.forEach((w,i)=>bars[i]&&bars[i].style.setProperty('--v',(clamp(w.norm,0,1)*100).toFixed(0)+'%'));
 const car=V3(drive.x,drive.y,drive.z);if(drive.camMode==='chase'){const back=fw.clone().multiplyScalar(-(6+r.spec.L*.75)),des=car.clone().add(back).add(V3(0,2.4+r.spec.L*.22,0));const gh=H(des.x,des.z)+1.2;if(des.y<gh)des.y=gh;
  cam.position.lerp(des,1-Math.exp(-dt*3.2));ctl.target.lerp(car.clone().add(V3(0,1,0)),1-Math.exp(-dt*8));cam.lookAt(ctl.target)}
 else{const d=car.clone().sub(drive.prevCar||car);cam.position.add(d);ctl.target.add(d)}drive.prevCar=car;
 return{eng:!!r.engine.cyl||r.cfg.engine==='electric',rpm:r.cfg.engine==='electric'?800+sp*160:1100+((sp%(r.engine.top/4))/(r.engine.top/4))*3600,cyl:r.engine.cyl||8,pitch:r.engine.pitch,load:drive.keys.up?1:.2}}

/* ---------- UI ---------- */
const STOPS=Object.entries(TIMES).map(([k,v])=>{const t=v.t,x=(1-t)*(1-t)*20+2*(1-t)*t*190+t*t*360,y=(1-t)*(1-t)*54+2*(1-t)*t*-22+t*t*54;return{k,l:v.l,x,y}});
$('#arc svg').setAttribute('preserveAspectRatio','none');
$('#arc').insertAdjacentHTML('beforeend',STOPS.map(s=>`<button class="stop" data-time="${s.k}" style="left:${s.x/3.8}%;top:${s.y}px" aria-pressed="false">${s.l}</button>`).join(''));
$('#wx').innerHTML=Object.entries(WEATHER).map(([k,v])=>`<button class="chip" data-wx="${k}" aria-pressed="false">${v.l}</button>`).join('');
$('#cats').innerHTML=['All',...K.CATS].map(c=>`<button class="chip" data-cat="${c}" aria-pressed="false">${c}</button>`).join('');
$('#biomes').innerHTML=Object.entries(BIOMES).map(([k,v])=>`<button data-biome="${k}" aria-pressed="false">${v.name}</button>`).join('');
function renderList(){const q=S.q.trim().toLowerCase(),items=K.ENTRIES.filter(e=>(S.cat==='All'||e.cat===S.cat)&&(!q||(e.name+' '+e.blurb+' '+e.cat).toLowerCase().includes(q)));
 $('#list').innerHTML=items.length?items.map(e=>`<button class="item" data-id="${e.id}" aria-current="${e.id===cur.id}"><b>${e.name}</b><span>${e.blurb}</span></button>`).join(''):'<p class="tag">No model matches that search. Try a category name, like “trees” or “lights”.</p>'}
function markList(){document.querySelectorAll('.item').forEach(b=>b.setAttribute('aria-current',b.dataset.id===cur.id))}
const hex=n=>'#'+C(n).getHexString();
function control(x,o){const v=o[x.k];
 if(x.t==='swatch'){const sw=x.sw||Object.values(K.PAINTS),cur=typeof v==='string'?K.PAINTS[v]:v;const keys=x.sw?x.sw:Object.keys(K.PAINTS);return`<div class="sec-row"><div class="row"><label>${x.l}</label></div><div class="sws">${keys.map((key,i)=>{const val=x.sw?key:K.PAINTS[key];return`<button class="sw" style="background:${hex(val)}" data-k="${x.k}" data-v="${x.sw?val:key}" data-n="${x.sw?'1':''}" aria-label="${x.sw?hex(val):key}" aria-pressed="${(x.sw?val:key)==v}"></button>`}).join('')}</div></div>`}
 if(x.t==='seg')return`<div class="row"><label>${x.l}</label><div class="seg">${x.v.map(s=>`<button data-k="${x.k}" data-v="${s}" aria-pressed="${s==v}">${({allterrain:'all-terrain',inline6:'inline-6',twotone:'two-tone'})[s]||s}</button>`).join('')}</div></div>`;
 if(x.t==='toggle')return`<div class="row"><label for="o_${x.k}">${x.l}</label><input class="tog" type="checkbox" id="o_${x.k}" data-k="${x.k}" ${v?'checked':''}></div>`;
 if(x.t==='range')return`<div class="row"><label for="o_${x.k}">${x.l}</label><input type="range" id="o_${x.k}" data-k="${x.k}" min="${x.min}" max="${x.max}" step="${x.step}" value="${v??x.d??x.min}"></div>`;
 if(x.t==='seed')return`<div class="row"><label>${x.l}</label><button class="btn" data-seed="1">Reroll</button></div>`;return''}
function renderInspector(){const e=ENTRY[cur.id],o=OPTS[cur.id],st=stats();let h=`<h2>${e.name}</h2><p>${e.blurb}</p><div class="stats"><div class="stat"><b>${(st.tris/1000).toFixed(1)}k</b>triangles</div><div class="stat"><b>${st.meshes}</b>parts</div>`;
 if(e.vehicle){const E=K.ENGINES[o.engine];h+=`<div class="stat"><b>${E.hp}</b>hp</div></div><div class="row" style="margin-top:12px"><span style="color:var(--ink-2);font-size:12.5px">${E.name}, ${K.SUSP[o.susp].name.toLowerCase()} springs</span><button class="btn primary" data-act="drive">${drive.on?'Driving':'Test drive'}</button></div>`;
  for(const s of K.VOPTS)h+=`<div class="sec"><h3>${s.sec}</h3>${s.items.map(x=>control(x,o)).join('')}</div>`}
 else{h+=`<div class="stat"><b>${st.lights}</b>lights</div></div>`;if(e.opts&&e.opts.length)h+=`<div class="sec"><h3>Options</h3>${e.opts.map(x=>control(x,o)).join('')}</div>`;h+=`<div class="sec"><h3>Try it in</h3><p>Switch the sky above to see how it reacts to dusk, night, storm and snow.</p></div>`}
 $('#inspector').innerHTML=h}
let rebuildQ=0;function setOpt(k,v){OPTS[cur.id][k]=v;if(!rebuildQ){rebuildQ=requestAnimationFrame(()=>{rebuildQ=0;const rot=cur.obj?cur.obj.rotation.y:0;build(cur.id,true);cur.obj.rotation.y=rot})}}
$('#inspector').addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;if(b.dataset.act==='drive'){setModeUI('drive');return}if(b.dataset.seed){setOpt('seed',(OPTS[cur.id].seed||1)+1);return}if(b.dataset.k){let v=b.dataset.v;if(b.dataset.n)v=+v;setOpt(b.dataset.k,v)}});
$('#inspector').addEventListener('change',ev=>{const i=ev.target;if(i.classList.contains('tog'))setOpt(i.dataset.k,i.checked)});
$('#inspector').addEventListener('input',ev=>{const i=ev.target;if(i.type==='range')setOpt(i.dataset.k,+i.value)});
$('#list').addEventListener('click',ev=>{const b=ev.target.closest('.item');if(!b)return;if(dio.on)setModeUI('inspect');build(b.dataset.id);document.body.classList.remove('cat-open')});
$('#cats').addEventListener('click',ev=>{const b=ev.target.closest('[data-cat]');if(!b)return;S.cat=b.dataset.cat;uiSync();renderList()});
$('#search').addEventListener('input',ev=>{S.q=ev.target.value;renderList()});
$('#biomes').addEventListener('click',ev=>{const b=ev.target.closest('[data-biome]');if(!b)return;S.biome=b.dataset.biome;paintTerrain(BIOMES[S.biome]);buildScatter(BIOMES[S.biome]);grass.count=Math.floor(grass.userData.max*BIOMES[S.biome].dens);setMode()});
$('#arc').addEventListener('click',ev=>{const b=ev.target.closest('[data-time]');if(b){S.time=b.dataset.time;setMode()}});
$('#wx').addEventListener('click',ev=>{const b=ev.target.closest('[data-wx]');if(b){S.wx=b.dataset.wx;setMode()}});
function setModeUI(m){if(m===S.mode&&m!=='drive')return;if(S.mode==='drive')stopDrive();if(S.mode==='diorama'){clearDiorama();frame('iso')}S.mode=m;if(m==='drive')startDrive();if(m==='diorama'){buildDiorama();camTo(V3(26,9,24),V3(0,1.5,0),1.4)}uiSync();renderInspector()}
$('#tools').addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;if(b.dataset.mode)return setModeUI(b.dataset.mode);if(b.dataset.view){if(drive.on){drive.camMode='orbit';ctl.enabled=true}frame(b.dataset.view);return}
 if(b.id==='tTurn')S.turn=!S.turn;if(b.id==='tEdges'){S.edges=!S.edges;edges(S.edges)}if(b.id==='tGrass')S.grass=!S.grass;if(b.id==='tSound'){S.sound=!S.sound;AU.set(S.sound)}uiSync()});
$('#dl').onclick=()=>document.body.classList.toggle('cat-open');$('#dr').onclick=()=>document.body.classList.toggle('ins-open');
function uiSync(){document.querySelectorAll('[data-time]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.time===S.time));document.querySelectorAll('[data-wx]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.wx===S.wx));
 document.querySelectorAll('[data-cat]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.cat===S.cat));document.querySelectorAll('[data-biome]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.biome===S.biome));
 document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===S.mode));$('#tTurn').setAttribute('aria-pressed',S.turn);$('#tEdges').setAttribute('aria-pressed',S.edges);$('#tGrass').setAttribute('aria-pressed',S.grass);$('#tSound').setAttribute('aria-pressed',S.sound);
 const st=STOPS.find(s=>s.k===S.time);$('#sun').style.left=st.x/3.8+'%';$('#sun').style.top=st.y+'px'}
let toastT=0;function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),1800)}
const KEYMAP={KeyW:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',Space:'brake'};
addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;if(drive.on){if(KEYMAP[e.code]){drive.keys[KEYMAP[e.code]]=true;e.preventDefault()}
 if(e.code==='Escape')setModeUI('inspect');if(e.code==='KeyH'){drive.lightOverride=drive.lightOverride===1?0:1;toast(drive.lightOverride?'Lights on':'Lights off')}if(e.code==='KeyC'){drive.camMode=drive.camMode==='chase'?'orbit':'chase';ctl.enabled=drive.camMode==='orbit';toast(drive.camMode==='chase'?'Chase camera':'Free camera')}}});
addEventListener('keyup',e=>{if(KEYMAP[e.code])drive.keys[KEYMAP[e.code]]=false});
document.querySelectorAll('#touch button').forEach(b=>{const k=b.dataset.k,on=v=>e=>{e.preventDefault();drive.keys[k]=v};b.addEventListener('pointerdown',on(true));b.addEventListener('pointerup',on(false));b.addEventListener('pointerleave',on(false))});

/* ---------- frame loop ---------- */
const clock=new T.Clock(),sunDir=V3(),tmpC=C(0);let uiT=0,acc=0;
function lerpP(k){for(const c of COL)P[c].lerp(TP[c],k);for(const n of NUM)P[n]+=(TP[n]-P[n])*k}
function loop(){const dt=Math.min(clock.getDelta(),1/20),t=clock.elapsedTime;lerpP(1-Math.exp(-dt*(RM?30:2.2)));
 const el=P.el*Math.PI/180,az=P.az*Math.PI/180;sunDir.set(Math.cos(el)*Math.cos(az),Math.sin(el),Math.cos(el)*Math.sin(az));
 const focus=drive.on?V3(drive.x,drive.y,drive.z):ctl.target;
 sun.position.copy(focus).addScaledVector(sunDir,70);sun.target.position.copy(focus);sun.color.copy(P.sun);sun.intensity=P.si*sm(-2,4,P.el);
 hemi.color.copy(P.hs);hemi.groundColor.copy(P.hg);hemi.intensity=P.hi;scene.fog.color.copy(P.fog);scene.fog.near=P.fn;scene.fog.far=P.ff;R.setClearColor(P.fog);
 skyU.top.value.copy(P.top);skyU.hor.value.copy(P.hor);skyU.gnd.value.copy(P.fog).multiplyScalar(.8);skyU.sunDir.value.copy(sunDir);skyU.sunCol.value.copy(P.sun);skyU.sunSize.value=clamp(P.si,0,1.2)*(1-P.rain*.85)*(S.wx==='mist'?.3:1);
 sky.position.copy(cam.position);stars.position.copy(cam.position);starM.opacity=P.stars;
 mtnM.forEach((m,i)=>{tmpC.copy(P.top).lerp(P.hs,.4).multiplyScalar(.55);m.color.copy(P.fog).lerp(P.mt,.25*(1-i*.3)).lerp(tmpC,.3-i*.09)});
 GU.uBase.value.copy(P.gb);GU.uTip.value.copy(P.gt);GU.uSun.value.copy(P.sun).multiplyScalar(P.si*.85*sm(-2,6,P.el));GU.uAmb.value.copy(P.hs).multiplyScalar(P.hi*.75).add(tmpC.copy(P.hg).multiplyScalar(.15));GU.uTime.value=t;GU.uWind.value.set(.8,P.wind,.45);GU.uSnow.value=P.cover;
 grass.visible=S.grass;TU.uCover.value=P.cover;TU.uWet.value=P.wet;terrainMat.roughness=1-P.wet*.45;
 WU.uTime.value=t;WU.uSky.value.copy(P.hor);WU.uSunDir.value.copy(sunDir);WU.uSunCol.value.copy(P.sun).multiplyScalar(P.si);WU.uDeep.value.copy(P.wd).lerp(P.fog,.25);WU.uShallow.value.copy(P.ws).lerp(P.fog,.2);
 const lv=P.night;K.lamps.forEach(m=>m.emissiveIntensity=m.userData.base*(.03+.97*lv));K.glowSprites.forEach(s=>s.material.opacity=s.userData.base*lv);
 if(bloom){bloom.strength=.32+lv*.55+P.bolt*.2;bloom.threshold=.9-lv*.32}
 const under=cam.position.y<H(cam.position.x,cam.position.z)+.15;terrain.visible=skirt.visible=!under;grass.visible=S.grass&&!under;water.visible=!under;
 const env={wind:P.wind,night:lv,time:t,rain:P.rain,snow:P.snow,aurora:P.aurora};
 rain.userData.update(dt,t,env,cam.position);snow.userData.update(dt,t,env,cam.position);flies.userData.update(dt,t,{night:lv*(1-P.rain)});aur.userData.update(dt,t,env);birds.visible=lv<.5&&P.rain<.5;birds.userData.update(dt,t,env);
 if(P.bolt>.5){boltT-=dt;if(boltT<0){const a=Math.random()*TAU,d=50+Math.random()*60,p=V3(cam.position.x+Math.cos(a)*d,0,cam.position.z+Math.sin(a)*d);p.y=H(p.x,p.z);bolt.userData.strike(p);AU.thunder(d/120);boltT=3+Math.random()*6}}
 bolt.userData.update(dt);skyU.flash.value=bolt.userData.flash*.55;flashL.intensity=bolt.userData.flash*2.5;
 /* stage */
 if(cur.obj&&!dio.on&&!drive.on){if(S.turn)cur.obj.rotation.y+=dt*.35;cur.obj.userData.update&&cur.obj.userData.update(dt,t,env);
  if(cur.rig){cur.rig.setLights(cur.rig.cfg.lights==='auto'?(lv>.4||S.wx==='storm'||S.wx==='mist'?1:0):1,0);cur.rig.chassis.position.y=cur.rig.wr+Math.sin(t*31)*.0018*(cur.rig.engine.cyl?1:0)}
  GU.uPush2.value.set(cur.center.x,cur.center.z,ENTRY[cur.id].vehicle?cur.foot*.55:ENTRY[cur.id].cat==='Buildings'?cur.foot*.55:0,0)}else GU.uPush2.value.set(0,0,0,0);
 if(dio.on){for(const o of dio.objs){const r=o.userData.rig;if(r)r.setLights(lv>.4?1:0,0);o.userData.update&&o.userData.update(dt,t,env)}if(!tw){const a=t*.04;cam.position.lerp(V3(Math.cos(a)*27,9+Math.sin(t*.1)*1.5,Math.sin(a)*27),1-Math.exp(-dt*.6));ctl.target.lerp(V3(0,1.5,0),.02)}}
 let eng=null;if(drive.on){eng=updateDrive(dt,t);drive.rig.update(dt,t,env)}
 for(const s of dust){const u=s.userData;if(u.life>0){u.life-=dt*.7;s.position.addScaledVector(u.v,dt);u.v.multiplyScalar(.97);s.scale.setScalar(u.sz*(1.8-u.life));s.material.opacity=Math.max(0,u.life)*.45}else s.material.opacity=0}
 AU.tick({rain:P.rain,wind:P.wind,eng:!!eng,...(eng||{}),fire:(cur.id==='firepit'||dio.on)?1:0,birds:lv<.4&&P.rain<.3});
 if(tw){tw.t+=dt;const k=tw.d?Math.min(1,tw.t/tw.d):1,e=k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;cam.position.lerpVectors(tw.p0,tw.p1,e);ctl.target.lerpVectors(tw.t0,tw.t1,e);if(k>=1)tw=null}
 if(!drive.on||drive.camMode==='orbit')ctl.update();
 uiT-=dt;if(uiT<0){uiT=.25;const rs=document.documentElement.style;rs.setProperty('--sky-a',hex(P.top));rs.setProperty('--sky-b',hex(P.hor));tmpC.copy(P.sun).lerp(C(0xe2672e),.45);rs.setProperty('--accent',hex(tmpC));
  const dark=lv>.55||(P.hor.r*.3+P.hor.g*.59+P.hor.b*.11)<.33;document.documentElement.dataset.theme=dark?'dark':'light'}
 if(composer)composer.render();else R.render(scene,cam);requestAnimationFrame(loop)}

/* ---------- boot ---------- */
paintTerrain(BIOMES[S.biome]);buildScatter(BIOMES[S.biome]);renderList();build('ranger40');uiSync();cam.position.set(9,3,8);loop();
})();
