import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { VehicleRig } from './types';

function bakeSubtree(root:THREE.Object3D){
  root.updateMatrixWorld(true);
  const inverse=root.matrixWorld.clone().invert();
  const buckets=new Map<string,{material:THREE.Material;geometries:THREE.BufferGeometry[]}>();
  const remove:THREE.Mesh[]=[];
  root.traverse((object:any)=>{
    let ancestor: THREE.Object3D | null = object;
    while (ancestor) { if (ancestor.userData.skipBake) return; if (ancestor === root) break; ancestor = ancestor.parent; }
    if(!object.isMesh||object.isInstancedMesh||!object.visible||object.userData.skipBake||!object.geometry||!object.material||Array.isArray(object.material)||object.material.transparent||object.material.map)return;
    const geometry=object.geometry.clone();
    geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,object.matrixWorld));
    const attributes=Object.keys(geometry.attributes).sort();
    for(const name of attributes)if(!['position','normal','color','uv','uv1','tangent'].includes(name))geometry.deleteAttribute(name);
    let plain=geometry;
    if(plain.index){const nonIndexed=plain.toNonIndexed();plain.dispose();plain=nonIndexed;}
    const signature=Object.keys(plain.attributes).sort().join(','),key=object.material.uuid+'|'+signature;
    if(!buckets.has(key))buckets.set(key,{material:object.material,geometries:[]});buckets.get(key)!.geometries.push(plain);
    remove.push(object);
  });
  if(!buckets.size)return;
  const baked=new THREE.Group();baked.name='baked static geometry';
  for(const{material,geometries}of buckets.values()){
    const merged=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());
    if(!merged)continue;const mesh=new THREE.Mesh(merged,material);mesh.castShadow=mesh.receiveShadow=true;baked.add(mesh);
  }
  for(const mesh of remove){mesh.parent?.remove(mesh);mesh.geometry.dispose();}
  root.add(baked);
}

/** Preserve moving pivots and the factory's update closure while combining static parts. */
export function bakeProp<T extends THREE.Object3D>(root:T):T {
  const visit=(node:THREE.Object3D)=>{
    for(const child of [...node.children])if(child.userData.bakePivot)visit(child);
    const pivots:THREE.Object3D[]=[];
    node.traverse(child=>{if(child!==node&&child.userData.bakePivot){child.userData.skipBake=true;pivots.push(child);}});
    bakeSubtree(node);
    for(const pivot of pivots)delete pivot.userData.skipBake;
  };
  visit(root);
  return root;
}

/** One billboard draw per blend mode; source sprites retain their kit animation API. */
export function batchSprites(root:THREE.Object3D):()=>void {
  const groups=new Map<string,THREE.Sprite[]>();
  root.traverse(node=>{
    if(!(node instanceof THREE.Sprite)||node.userData.batched)return;
    const material=node.material,key=`${material.map?.uuid}|${material.blending}|${material.depthTest}`;
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key)!.push(node);
  });
  const updates:(()=>void)[]=[];
  const inverse=new THREE.Matrix4(),matrix=new THREE.Matrix4();
  const flags:THREE.Mesh[]=[];root.traverse(node=>{if(node instanceof THREE.Mesh&&node.userData.windFlag&&!node.userData.batched)flags.push(node);});
  if(flags.length){const material=(flags[0].material as THREE.MeshStandardMaterial).clone();material.userData.kitShared=false;material.color.set(0xffffff);const mesh=new THREE.InstancedMesh(flags[0].geometry,material,flags.length);mesh.name='Kit wind flags';mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;root.add(mesh);for(const flag of flags){flag.visible=false;flag.userData.batched=true;}updates.push(()=>{root.updateWorldMatrix(true,true);inverse.copy(root.matrixWorld).invert();flags.forEach((flag,i)=>{matrix.multiplyMatrices(inverse,flag.matrixWorld);mesh.setMatrixAt(i,matrix);mesh.setColorAt(i,(flag.material as THREE.MeshStandardMaterial).color);});mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;});}
  for(const sprites of groups.values()){
    if(sprites.length<2)continue;
    const first=sprites[0].material,geometry=new THREE.PlaneGeometry(1,1),rgba=new THREE.InstancedBufferAttribute(new Float32Array(sprites.length*4),4);
    geometry.setAttribute('spriteTint',rgba);
    const material=new THREE.ShaderMaterial({uniforms:{map:{value:first.map}},transparent:true,depthWrite:false,depthTest:first.depthTest,blending:first.blending,
      vertexShader:'attribute vec4 spriteTint;varying vec2 vUv;varying vec4 vTint;void main(){vUv=uv;vTint=spriteTint;vec4 center=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);vec2 size=vec2(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz));gl_Position=projectionMatrix*(center+vec4(position.xy*size,0.,0.));}',
      fragmentShader:'uniform sampler2D map;varying vec2 vUv;varying vec4 vTint;void main(){gl_FragColor=texture2D(map,vUv)*vTint;}'});
    const mesh=new THREE.InstancedMesh(geometry,material,sprites.length);mesh.name='Kit glow and smoke billboards';mesh.frustumCulled=false;mesh.renderOrder=1;root.add(mesh);
    for(const sprite of sprites){sprite.userData.batched=true;sprite.visible=false;}
    updates.push(()=>{root.updateWorldMatrix(true,true);inverse.copy(root.matrixWorld).invert();sprites.forEach((sprite,i)=>{matrix.multiplyMatrices(inverse,sprite.matrixWorld);mesh.setMatrixAt(i,matrix);const c=sprite.material.color;rgba.setXYZW(i,c.r,c.g,c.b,sprite.material.opacity);});rgba.needsUpdate=true;mesh.instanceMatrix.needsUpdate=true;});
  }
  const sync=()=>{for(const update of updates)update();};sync();return sync;
}

export function bakeVehicle(rig:VehicleRig){
  for(const whip of (rig as any).whips||[])whip.root.userData.skipBake=true;
  bakeSubtree(rig.body);
  for(const wheel of rig.wheels)bakeSubtree(wheel.spin);
  const groups=new Map<string,THREE.Mesh[]>();
  for(const wheel of rig.wheels)wheel.spin.traverse(node=>{
    if(!(node instanceof THREE.Mesh)||Array.isArray(node.material)||node.material.transparent||node.material.map)return;
    let hash=2166136261;for(const name of Object.keys(node.geometry.attributes).sort()){
      // Equivalent pivot inverses differ by a few Float32 ulps after baking.
      for(const value of node.geometry.attributes[name].array)hash=Math.imul(hash^Math.round(value*1e5),16777619);
    }
    const key=`${node.material.uuid}|${node.geometry.attributes.position.count}|${hash}`;
    if(!groups.has(key))groups.set(key,[]);groups.get(key)!.push(node);
  });
  const pairs:{mesh:THREE.InstancedMesh;sources:THREE.Mesh[]}[]=[],inverse=new THREE.Matrix4(),matrix=new THREE.Matrix4();
  for(const sources of groups.values())if(sources.length>1){
    const mesh=new THREE.InstancedMesh(sources[0].geometry,sources[0].material,sources.length);mesh.name='Articulated kit wheel instances';mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;rig.root.add(mesh);for(const source of sources)source.visible=false;pairs.push({mesh,sources});
  }
  const update=rig.update;
  rig.update=(dt,t,env)=>{update(dt,t,env);rig.root.updateMatrixWorld(true);inverse.copy(rig.root.matrixWorld).invert();for(const{mesh,sources}of pairs){sources.forEach((source,i)=>{matrix.multiplyMatrices(inverse,source.matrixWorld);mesh.setMatrixAt(i,matrix);});mesh.instanceMatrix.needsUpdate=true;}};
  rig.update(0,0,{wind:0,night:0,time:0});
  return rig;
}
