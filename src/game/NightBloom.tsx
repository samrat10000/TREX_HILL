import { useEffect, useRef } from 'react';
import { Bloom, EffectComposer } from '@react-three/postprocessing';

export default function NightBloom({sim}:{sim:React.MutableRefObject<any>}) {
  const bloom=useRef<any>(null);
  useEffect(()=>{
    sim.current.updateBloom=(night:number)=>{if(bloom.current){bloom.current.intensity=.32+.55*night;bloom.current.luminanceMaterial.threshold=.9-.32*night;}};
    return()=>{sim.current.updateBloom=null};
  },[sim]);
  return <EffectComposer multisampling={0}><Bloom ref={bloom} intensity={.32} luminanceThreshold={.9} mipmapBlur luminanceSmoothing={.08} /></EffectComposer>;
}
