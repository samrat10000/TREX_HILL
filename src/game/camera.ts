import * as THREE from 'three';
import type { VehicleRig } from '../kit/types';

const direction=new THREE.Vector3(),right=new THREE.Vector3(),up=new THREE.Vector3(),corner=new THREE.Vector3(),centre=new THREE.Vector3();
const garageViews=[[1,.4,1.15],[1,.16,1.25],[1.7,.22,0],[-.8,1.2,1.05],[1.6,.18,.55],[1,.4,1.15]];

/** Fit the actual kit bounds into the space between the garage panels. */
export function frameGarage(bounds:THREE.Box3,category:number,yaw:number,ground:THREE.Vector3,fov:number,aspect:number,fillX:number,fillY:number,position:THREE.Vector3,target:THREE.Vector3){
 bounds.getCenter(centre);const cs=Math.cos(yaw),sn=Math.sin(yaw);
 target.set(ground.x+centre.x*cs+centre.z*sn,ground.y+centre.y,ground.z-centre.x*sn+centre.z*cs);
 const view=garageViews[category]??garageViews[0];direction.set(view[0],view[1],view[2]).normalize();right.set(direction.z,0,-direction.x).normalize();up.crossVectors(direction,right);
 const tangent=Math.tan(THREE.MathUtils.degToRad(fov)/2);let distance=4;
 for(let i=0;i<8;i++){
  const x=(i&1?bounds.max.x:bounds.min.x)-centre.x,y=(i&2?bounds.max.y:bounds.min.y)-centre.y,z=(i&4?bounds.max.z:bounds.min.z)-centre.z;
  corner.set(x*cs+z*sn,y,-x*sn+z*cs);
  distance=Math.max(distance,corner.dot(direction)+Math.max(Math.abs(corner.dot(right))/(tangent*aspect*Math.max(.08,fillX)),Math.abs(corner.dot(up))/(tangent*Math.max(.08,fillY))));
 }
 position.copy(target).addScaledVector(direction,distance*1.1);
}

/** Leave room for the caravan/towed rig, so its roof cannot fill the chase view. */
export function chaseCamera(rig:VehicleRig,caravan:boolean,towLength=0){return {distance:11+rig.spec.L*.55+(caravan?4.5:0)+(towLength?2+towLength*.6:0),height:5.8+rig.spec.W*.3+(caravan||towLength?1.2:0)};}
