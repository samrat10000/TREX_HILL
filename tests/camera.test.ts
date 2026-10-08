import { describe,expect,it } from 'vitest';
import * as THREE from 'three';
import { KIT } from '../src/kit/core';
import { bakeProp } from '../src/kit/bake';
import { disposeObject } from '../src/kit/lifecycle';
import { chaseCamera,frameGarage } from '../src/game/camera';
import { createDrive,updateTrailer } from '../src/game/drive';

describe('vehicle visibility',()=>{
 it('fits every vehicle into the uncovered desktop and portrait garage space',()=>{
  for(const id of Object.keys(KIT.VEH)){
   const rig=KIT.vehicle(id,{load:'tent',rack:true}),bounds=new THREE.Box3().setFromObject(rig.root),ground=new THREE.Vector3(46,12,-14),eye=new THREE.Vector3(),target=new THREE.Vector3();
   try{for(const [aspect,fillX,fillY] of [[16/9,.4,.65],[390/844,.9,.25]])for(let category=0;category<6;category++)for(const yaw of [.45,Math.PI/2]){
    frameGarage(bounds,category,yaw,ground,38,aspect,fillX,fillY,eye,target);const camera=new THREE.PerspectiveCamera(38,aspect,.1,2400);camera.position.copy(eye);camera.lookAt(target);camera.updateMatrixWorld();
    for(let i=0;i<8;i++){const x=i&1?bounds.max.x:bounds.min.x,y=i&2?bounds.max.y:bounds.min.y,z=i&4?bounds.max.z:bounds.min.z,point=new THREE.Vector3(x*Math.cos(yaw)+z*Math.sin(yaw),y,-x*Math.sin(yaw)+z*Math.cos(yaw)).add(ground).project(camera);expect(Math.abs(point.x),id).toBeLessThanOrEqual(fillX);expect(Math.abs(point.y),id).toBeLessThanOrEqual(fillY);expect(point.z).toBeLessThan(1);}
   }}finally{disposeObject(rig.root);}
  }
 });
 it('keeps the chase sightline above the hitched caravan roof',()=>{
  const rig=KIT.vehicle('ranger40',{}),d=createDrive(rig,{}),trailer=KIT.caravan({});d.x=d.z=d.yaw=0;updateTrailer(rig,d,trailer,0);
  try{const framing=chaseCamera(rig,true),eye=new THREE.Vector3(-framing.distance,rig.wr+framing.height,0),target=new THREE.Vector3(3,rig.wr+1,0),ray=new THREE.Ray(eye,target.clone().sub(eye).normalize()),roof=new THREE.Box3().setFromObject(trailer);expect(ray.intersectBox(roof,new THREE.Vector3())).toBeNull();expect(framing.distance).toBeGreaterThan(chaseCamera(rig,false).distance);expect(framing.height).toBeGreaterThan(6);}finally{disposeObject(rig.root);disposeObject(trailer);}
 });
 it('retains a separate workshop canopy for the garage cutaway',()=>{const workshop=KIT.outpost(),canopy=workshop.userData.workshopCanopy;bakeProp(workshop);try{expect(canopy.parent).not.toBeNull();expect(canopy.userData.skipBake).toBe(true);canopy.visible=false;expect(workshop.visible).toBe(true);}finally{disposeObject(workshop);}});
});
