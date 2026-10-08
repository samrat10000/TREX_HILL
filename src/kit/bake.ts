import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { VehicleRig } from './types';

function bakeSubtree(root:THREE.Object3D){
  root.updateMatrixWorld(true);
  const inverse=root.matrixWorld.clone().invert();
  const buckets=new Map<string,{material:THREE.Material;geometries:THREE.BufferGeometry[]}>();
  const remove:THREE.Mesh[]=[];
  root.traverse((object:any)=>{
    if(!object.isMesh||object.userData.skipBake||!object.geometry||!object.material||Array.isArray(object.material)||object.material.transparent||object.material.map)return;
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

export function bakeVehicle(rig:VehicleRig){
  for(const whip of (rig as any).whips||[])whip.root.userData.skipBake=true;
  bakeSubtree(rig.body);
  for(const wheel of rig.wheels)bakeSubtree(wheel.spin);
  return rig;
}
