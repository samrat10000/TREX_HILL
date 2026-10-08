import { useMemo } from 'react';
import * as THREE from 'three';
import { KIT } from '../kit/core';
import { bakeVehicle } from '../kit/bake';

export function DioramaScene({objectRef}:{objectRef:any}){
  const exhibit=useMemo(()=>{
    const root=new THREE.Group();root.name='Hill Kit diorama';
    const deck=new THREE.Mesh(new THREE.CylinderGeometry(32,32,.75,80),new THREE.MeshStandardMaterial({color:0x788762,roughness:1}));deck.position.y=-.39;deck.receiveShadow=true;root.add(deck);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(31.85,.18,8,96),new THREE.MeshStandardMaterial({color:0xb6a783,roughness:.9}));rim.rotation.x=Math.PI/2;rim.position.y=.02;root.add(rim);
    const place=(id:string,opts:any,x:number,z:number,yaw=0)=>{
      const entry=KIT.ENTRIES.find((e:any)=>e.id===id) as any;let object:THREE.Group;
      if(entry.vehicle)object=bakeVehicle(KIT.vehicle(id,opts)).root;else object=entry.build(opts);
      object.position.set(x,0,z);object.rotation.y=yaw;root.add(object);
    };
    place('ranger40',{paint:'sage',load:'cargo',rack:true,flag:'flag'},-6,0,.35);
    place('van',{paint:'sky',livery:'twotone',load:'cargo',tires:'allterrain'},7,0,-.25);
    place('firepit',{},0,8);place('tent',{color:0xe0743a},-4,10,.4);place('fairy',{seed:26},0,-8);
    place('aframe',{},-15,-9,-.3);place('tower',{},16,-12,.2);place('lighthouse',{},-19,9,.5);place('deer',{},13,10,-.8);
    place('pine',{season:'autumn',seed:55},20,2);place('rock',{kind:'mesa',seed:39},-17,-1);
    return root;
  },[]);
  return <primitive object={exhibit} ref={objectRef} />;
}
