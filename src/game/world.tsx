import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BIOMES } from './presets';
import { useGameStore } from '../state';
import { KIT } from '../kit/core';
import { RigidBody, CuboidCollider } from '@react-three/rapier';

const clamp = THREE.MathUtils.clamp;
const smooth = (a: number, b: number, x: number) => THREE.MathUtils.smoothstep(x, a, b);
const hash = (x: number, z: number) => { const v = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return v - Math.floor(v); };
export function terrainHeight(x: number, z: number) {
  const d = Math.hypot(x, z), flat = smooth(9, 22, d);
  const n1 = hash(Math.floor(x * .055), Math.floor(z * .055)) - .5;
  const n2 = hash(Math.floor(x * .16 + 21), Math.floor(z * .16)) - .5;
  let h = n1 * 10 * smooth(24, 96, d) + n2 * 2.2 * flat;
  const ring = Math.abs(d - 34); h = THREE.MathUtils.lerp(h, h * .58, 1 - smooth(1.4, 4.4, ring));
  h -= 6 * (1 - smooth(0, 21, Math.hypot(x + 40, z - 34)));
  return h;
}

function makeTerrain() {
  const size = 260, seg = 190, g = new THREE.PlaneGeometry(size, size, seg, seg); g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position, colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), y = terrainHeight(x, z);
    pos.setY(i, y);
    const road = 1 - smooth(1.5, 3.1, Math.abs(Math.hypot(x, z) - 34));
    const shade=(.88+hash(Math.round(x*.7),Math.round(z*.7))*.16)*(1-road*.1);
    colors.set([shade,shade,shade], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3)); g.computeVertexNormals();
  return g;
}

function buildScatter(biome:keyof typeof BIOMES){
  const entries:THREE.Group[]=[];
  const forest=biome==='desert'?['cactus','palm','snag']:biome==='coast'?['palm','pine','oak']:biome==='autumn'?['aspen','maple','pine']:biome==='alpine'?['pine','pine','pine']:['pine','aspen','oak'];
  const count=biome==='desert'?25:biome==='alpine'?36:48;
  for(let i=0;i<count;i++){
    const a=hash(i,4)*Math.PI*2,r=15+hash(i,9)*105,x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(Math.abs(Math.hypot(x,z)-34)<6||terrainHeight(x,z)<-1)continue;
    const type=forest[i%forest.length],season=biome==='autumn'?'autumn':biome==='alpine'?'winter':'summer';
    const o=type==='pine'?KIT.pine({season,seed:i+11}):['aspen','maple','oak'].includes(type)?KIT.broadleaf({kind:type,season,seed:i+11}):type==='cactus'?KIT.cactus({seed:i+11}):type==='palm'?KIT.palm({seed:i+11}):KIT.snag({seed:i+11});
    o.position.set(x,terrainHeight(x,z),z);o.rotation.y=hash(i,12)*Math.PI*2;o.scale.setScalar(.75+hash(i,17)*.65);entries.push(o);
  }
  for(let i=0;i<20;i++){
    const a=hash(i,34)*Math.PI*2,r=14+hash(i,54)*88,x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(Math.abs(Math.hypot(x,z)-34)<5||terrainHeight(x,z)<-1)continue;
    const o=KIT.rock({kind:biome==='desert'?'mesa':biome==='alpine'?'boulder':'cluster',snow:biome==='alpine',seed:i+500});
    o.position.set(x,terrainHeight(x,z),z);o.rotation.y=hash(i,34)*6;o.scale.setScalar(.45+hash(i,18)*1.2);entries.push(o);
  }
  const buckets=new Map<string,{material:THREE.Material;geometries:THREE.BufferGeometry[]}>();
  for(const o of entries){o.updateMatrixWorld(true);o.traverse((child:any)=>{
    if(!child.isMesh||child.material.transparent||child.material.map)return;
    let g=child.geometry.clone();g.applyMatrix4(child.matrixWorld);if(g.index)g=g.toNonIndexed();
    for(const key of Object.keys(g.attributes))if(!['position','normal','color'].includes(key))g.deleteAttribute(key);
    if(!g.attributes.normal)g.computeVertexNormals();const attrs=Object.keys(g.attributes).sort().join(','),key=child.material.uuid+'|'+attrs;
    if(!buckets.has(key))buckets.set(key,{material:child.material,geometries:[]});buckets.get(key)!.geometries.push(g);
  });o.traverse((child:any)=>child.geometry?.dispose());}
  const root=new THREE.Group();root.name=`${biome} scatter`;
  for(const {material,geometries} of buckets.values()){
    const merged=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());if(!merged)continue;
    const mesh=new THREE.Mesh(merged,material);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
  }
  return root;
}

function Scatter({ biome, objectRef }: { biome: keyof typeof BIOMES; objectRef:any }) {
  const objects=useMemo(()=>buildScatter(biome),[biome]);
  return <primitive object={objects} ref={objectRef} />;
}

function CampScene({objectRef}:{objectRef:any}){
  const camp=useMemo(()=>{
    const root=new THREE.Group(), add=(id:string,opts:any,x:number,z:number,yaw=0)=>{
      const entry=KIT.ENTRIES.find((e:any)=>e.id===id) as any;
      const object=entry.vehicle?KIT.vehicle(id,opts).root:entry.build(opts);
      object.position.set(x,terrainHeight(x,z)-.04,z);object.rotation.y=yaw;root.add(object);
    };
    add('firepit',{seed:38},-5,-6);add('tent',{color:0xe0743a},-9,-7,.4);add('lantern',{},-3,-8);add('fairy',{seed:11},-6,-9);add('aframe',{},8,-11,-.25);
    add('lighthouse',{},-64,34,.2);add('beacon',{},9,-18);
    add('outpost',{},-16,10,.3);
    const ferry=KIT.ferry({seed:2});ferry.position.set(-40,-1.9,34);root.add(ferry);
    const pier=KIT.pier({});pier.position.set(-31,-2.1,29);pier.rotation.y=-.5;root.add(pier);
    return root;
  },[]);
  return <primitive object={camp} ref={objectRef} />;
}

function WorldColliders({biome}:{biome:keyof typeof BIOMES}){
  const count=biome==='desert'?26:biome==='alpine'?34:46;
  const positions=useMemo(()=>Array.from({length:count},(_,i)=>{
    const a=hash(i,4)*Math.PI*2,r=16+hash(i,9)*103,x=Math.cos(a)*r,z=Math.sin(a)*r;
    return {x,z,y:terrainHeight(x,z),s:.65+hash(i,17)*.7};
  }).filter(p=>Math.abs(Math.hypot(p.x,p.z)-34)>6&&terrainHeight(p.x,p.z)>-1),[biome,count]);
  return <>{positions.map((p,i)=><RigidBody key={i} type="fixed" colliders={false} position={[p.x,p.y+p.s*1.25,p.z]}><CuboidCollider args={[p.s*.34,p.s*1.2,p.s*.34]} /></RigidBody>)}</>;
}

export function World({ params }: { params: React.MutableRefObject<any> }) {
  const settings = useGameStore();
  const geometry = useMemo(() => makeTerrain(), []);
  const groundMat = useRef<THREE.MeshStandardMaterial>(null);
  const groundMesh = useRef<THREE.Mesh>(null);
  const waterMat = useRef<THREE.MeshStandardMaterial>(null);
  const skyMat = useRef<THREE.ShaderMaterial>(null);
  const waterMesh=useRef<THREE.Mesh>(null),scatterMesh=useRef<THREE.Group>(null),campMesh=useRef<THREE.Group>(null),skirtMesh=useRef<THREE.Mesh>(null);
  const grass = useRef<THREE.InstancedMesh>(null);
  const grassMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const grassData = useMemo(()=>{
    const geo=new THREE.PlaneGeometry(.14,.82,1,1);geo.translate(0,.41,0);
    const positions:[number,number,number,number][]=[];
    for(let i=0;i<14500;i++){
      const a=hash(i,71)*Math.PI*2,r=Math.sqrt(hash(i,18))*88,x=Math.cos(a)*r,z=Math.sin(a)*r;
      if(Math.abs(Math.hypot(x,z)-34)<4||Math.hypot(x+40,z-34)<19||terrainHeight(x,z)<-1)continue;
      positions.push([x,terrainHeight(x,z),z,hash(i,96)*Math.PI*2]);
    }
    return {geo,positions};
  },[]);
  useLayoutEffect(()=>{
    if(!grass.current)return;
    const d=new THREE.Object3D();grassData.positions.forEach(([x,y,z,a],i)=>{d.position.set(x,y,z);d.rotation.set(0,a,0);const scale=.65+hash(i,5)*.8;d.scale.set(scale,scale,scale);d.updateMatrix();grass.current!.setMatrixAt(i,d.matrix)});
    grass.current.count=grassData.positions.length;grass.current.instanceMatrix.needsUpdate=true;
  },[grassData]);
  useLayoutEffect(()=>{
    const m=grassMaterial.current;if(!m)return;
    m.onBeforeCompile=(shader)=>{
      shader.uniforms.uHillTime={value:0};shader.uniforms.uHillCar={value:new THREE.Vector3(34,0,0)};shader.uniforms.uHillWind={value:new THREE.Vector2(1,.5)};
      (m.userData as any).shader=shader;
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uHillTime;uniform vec3 uHillCar;uniform vec2 uHillWind;varying float vHillFade;');
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        float bladeH=uv.y;float phase=instanceMatrix[3][0]*.32+instanceMatrix[3][2]*.21;
        transformed.x+=sin(uHillTime*1.6+phase)*uHillWind.x*.16*bladeH*bladeH;
        vec3 hillWorld=(modelMatrix*instanceMatrix*vec4(transformed,1.)).xyz;vHillFade=1.-smoothstep(50.,104.,distance(hillWorld,cameraPosition));vec2 hillDelta=hillWorld.xz-uHillCar.xz;float hillDist=length(hillDelta);
        float hillPush=(1.-smoothstep(1.1,3.8,hillDist))*step(.01,3.8);transformed.x+=sign(hillDelta.x)*hillPush*.36*bladeH;transformed.z+=sign(hillDelta.y)*hillPush*.36*bladeH;`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vHillFade;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        float hillNoise=fract(sin(dot(floor(gl_FragCoord.xy),vec2(12.9898,78.233)))*43758.5453);if(hillNoise>vHillFade)discard;`);
    };
  },[]);
  const groundTarget = useMemo(() => new THREE.Color(BIOMES[settings.biome as keyof typeof BIOMES].ground), [settings.biome]);
  const waterTarget = useMemo(() => new THREE.Color(BIOMES[settings.biome as keyof typeof BIOMES].water[0]), [settings.biome]);
  const grassTarget = useMemo(() => new THREE.Color(BIOMES[settings.biome as keyof typeof BIOMES].grass[0]), [settings.biome]);
  useLayoutEffect(()=>{
    const m=groundMat.current;if(!m)return;
    m.onBeforeCompile=(shader)=>{
      shader.uniforms.uHillSnow={value:0};shader.uniforms.uHillWet={value:0};(m.userData as any).shader=shader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float uHillSnow;uniform float uHillWet;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        diffuseColor.rgb*=1.-uHillWet*.24;diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.88,.91,.97),uHillSnow*.8);`);
    };
  },[]);
  useLayoutEffect(()=>{
    const m=waterMat.current;if(!m)return;
    m.onBeforeCompile=(shader)=>{
      shader.uniforms.uHillWaterTime={value:0};(m.userData as any).shader=shader;
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uHillWaterTime;varying vec3 vHillWater;');
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        transformed.z+=sin(position.x*.34+uHillWaterTime*1.2)*.055+sin(position.y*.5+uHillWaterTime*.9)*.04;
        vHillWater=(modelMatrix*vec4(transformed,1.)).xyz;`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vHillWater;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        float shore= 1.-smoothstep(29.,43.,length(vHillWater.xz-vec2(-40.,34.)));
        float fres=pow(1.-max(dot(normalize(vHillWater-cameraPosition),vec3(0.,1.,0.)),0.),3.);
        vec3 deep=vec3(.025,.20,.25),shallow=vec3(.16,.60,.58);diffuseColor.rgb=mix(deep,shallow,shore*.76);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.72,.86,.83),fres*.36);`);
    };
  },[]);
  useLayoutEffect(()=>{KIT.shared.grassMat=grassMaterial.current;KIT.shared.waterMat=waterMat.current;},[]);
  params.current.updateWorld = (dt: number) => {
    if (groundMat.current) groundMat.current.color.lerp(groundTarget, 1-Math.exp(-dt*2.2));
    if (waterMat.current) waterMat.current.color.lerp(waterTarget, 1-Math.exp(-dt*2.2));
    if (grassMaterial.current) grassMaterial.current.color.lerp(grassTarget,1-Math.exp(-dt*2.2));
    if (waterMesh.current) waterMesh.current.position.y=-1.4 + Math.sin(performance.now()*.0008)*.035;
    const groundShader=(groundMat.current?.userData as any)?.shader;
    if(groundShader){groundShader.uniforms.uHillSnow.value=Math.max(params.current.preset?.snow||0,BIOMES[settings.biome as keyof typeof BIOMES].snow);groundShader.uniforms.uHillWet.value=params.current.preset?.wet||0}
    const waterShader=(waterMat.current?.userData as any)?.shader;if(waterShader)waterShader.uniforms.uHillWaterTime.value=performance.now()*.001;
    const under=!!params.current.cameraUnder,showWorld=!params.current.diorama;
    if(groundMesh.current)groundMesh.current.visible=showWorld&&!under;if(grass.current)grass.current.visible=showWorld&&!under;
    if(scatterMesh.current)scatterMesh.current.visible=showWorld;if(campMesh.current)campMesh.current.visible=showWorld;
    if(waterMesh.current)waterMesh.current.visible=showWorld;if(skirtMesh.current)skirtMesh.current.visible=showWorld;
    const shader=(grassMaterial.current?.userData as any)?.shader;
    if(shader){shader.uniforms.uHillTime.value=performance.now()*.001;shader.uniforms.uHillWind.value.set(params.current.preset?.wind||.5,.35);shader.uniforms.uHillCar.value.copy(params.current.focus||new THREE.Vector3());}
    if (skyMat.current) { const p=params.current.preset; skyMat.current.uniforms.top.value.copy(p.top); skyMat.current.uniforms.horizon.value.copy(p.horizon); }
  };
  const skyUniforms = useMemo(()=>({top:{value:new THREE.Color(0xf3b27a)},horizon:{value:new THREE.Color(0xffdcaa)} }),[]);
  return <>
    <mesh geometry={new THREE.SphereGeometry(500, 32, 18)} scale={[-1,1,1]} frustumCulled={false}>
      <shaderMaterial ref={skyMat} uniforms={skyUniforms} side={THREE.BackSide} depthWrite={false} vertexShader="varying vec3 v; void main(){v=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}" fragmentShader="uniform vec3 top,horizon; varying vec3 v; void main(){float a=smoothstep(-.25,.45,v.y);gl_FragColor=vec4(mix(horizon,top,a),1.);}" />
    </mesh>
    <mesh ref={groundMesh} geometry={geometry} receiveShadow><meshStandardMaterial ref={groundMat} vertexColors roughness={1} /></mesh>
    <instancedMesh ref={grass} args={[grassData.geo,undefined as any,grassData.positions.length]} frustumCulled={false}><meshStandardMaterial ref={grassMaterial} color={BIOMES[settings.biome as keyof typeof BIOMES].grass[0]} side={THREE.DoubleSide} roughness={1} /></instancedMesh>
    <mesh ref={waterMesh} rotation-x={-Math.PI/2} position={[-40,-1.4,34]}><planeGeometry args={[74,74,72,72]} /><meshStandardMaterial ref={waterMat} color={0x1d6f86} roughness={.2} metalness={.08} transparent opacity={.94} /></mesh>
    <Scatter biome={settings.biome as keyof typeof BIOMES} objectRef={scatterMesh} />
    <WorldColliders biome={settings.biome as keyof typeof BIOMES} />
    <CampScene objectRef={campMesh} />
    <mesh ref={skirtMesh} rotation-x={-Math.PI/2} position-y={-3.8}><circleGeometry args={[450,48]} /><meshStandardMaterial color={BIOMES[settings.biome as keyof typeof BIOMES].ground} /></mesh>
  </>;
}
