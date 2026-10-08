import workletUrl from './audio.worklet.ts?worker&url';
import type { AudioFrame } from './audio.worklet';
import { POIS,regionAt } from './worldData';
import { surfaceAt,WATER_Y,terrainHeight } from './terrain';
const captions:Record<string,string>={horn:'Truck horn',thunder:'Thunder rolling across the valley',splash:'Water splashing under the tyres',ratchet:'Workshop tools',door:'Camp packed away',ferryhorn:'The ferry calls',confirm:'A new moment collected'};
export function toggleAudio(sim:any,volume:number):boolean {
 if(!sim.audio){const context=sim.audio=new AudioContext({latencyHint:'interactive'});sim.soundOn=true;
  sim.audioLoading=context.audioWorklet.addModule(workletUrl).then(()=>{if(context.state==='closed')return;const node=sim.audioNode=new AudioWorkletNode(context,'trex-hill-audio',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2]});node.connect(context.destination);node.port.onmessage=(event:MessageEvent)=>{if(event.data.type==='ready'){sim.audioReady=true;if(sim.audioFrame)node.port.postMessage(sim.audioFrame);}if(event.data.type==='meter')sim.audioMeter=event.data;};node.onprocessorerror=()=>{sim.audioError='Audio processor stopped';sim.audioReady=false};
   sim.sound=(name:string,options:Record<string,number>={})=>{const sound=name==='wrench'?'ratchet':name==='recover'?'thud':name;node.port.postMessage({type:'sound',name:sound,options});if(captions[sound]){sim.caption=captions[sound];sim.captionUntil=sim.time+3;}};sim.horn=()=>sim.sound('horn');sim.triggerThunder=(km:number)=>sim.sound('thunder',{km});
  }).catch((error:Error)=>{sim.audioError=error.message;});
 }else sim.soundOn=!sim.soundOn;
 void sim.audio.resume();if(sim.audioFrame){sim.audioFrame.master=sim.soundOn?volume:0;sim.audioNode?.port.postMessage(sim.audioFrame);}return sim.soundOn;
}
export function updateAudio(sim:any,_dt:number,volume:number){const d=sim.drive,rig=sim.rig,p=sim.preset,v=sim.settings;if(!d||!rig||!v)return;const region=regionAt(d.x,d.z),distance=(kind:string)=>Math.min(1000,...POIS.filter(p=>p.kind===kind).map(p=>Math.hypot(p.x-d.x,p.z-d.z))),surfaces=rig.wheels.map((w:any)=>surfaceAt(d.x+w.x*Math.cos(d.yaw)+w.z*Math.sin(d.yaw),d.z-w.x*Math.sin(d.yaw)+w.z*Math.cos(d.yaw),v.weather));
 const speed=Math.abs(d.v),wheelRpm=speed/(Math.PI*2*rig.wr)*60,ratios=[3.6,2.15,1.42,1],type=rig.cfg.engine;
 const redline=({inline6:6600,v8:6200,diesel:4300,electric:13000} as Record<string,number>)[String(type)]??6600;d.rpm=Math.min(redline*.96,type==='electric'?wheelRpm*9.2:Math.max(type==='diesel'?720:type==='v8'?680:760,wheelRpm*ratios[(d.gear??1)-1]*3.9*(d.range==='L'?2.6:1),d.keys.up?850+Math.max(0,1-speed/4)*1300:0));
 const frame:AudioFrame={type:'frame',engineType:type,run:!sim.paused||sim.screen==='garage',rpm:d.rpm,throttle:d.keys.up?1:d.keys.down?.4:0,speed,slip:Math.min(1,Math.abs(d.lat)*.03),surfaces,master:sim.soundOn&&!sim.hidden?volume:0,engineGain:v.engine,tyresGain:v.tyres,wildlifeGain:v.birds,worldGain:v.worldv,musicGain:v.music,uiGain:v.uiv,ambience:{wind:p.wind*.18,rain:p.rain,storm:p.bolt,night:p.night,day:1-p.night,fire:Math.max(0,1-distance('camp')/35),water:region.id==='coast'?.55:terrainHeight(d.x,d.z)<WATER_Y+.5?.5:Math.max(0,1-distance('lake')/65)*.35,roof:sim.cameraMode==='hood'?1:0,habitat:region.id==='canyon'?.15:region.id==='coast'?.25:region.id==='pass'?.2:region.id==='meadow'?.5:.85,coast:region.id==='coast'?1:0}};
 sim.audioFrame=frame;sim.audioNode?.port.postMessage(frame);
 if(surfaces.includes('water')&&sim.lastSurface!=='water'&&speed>1)sim.sound?.('splash',{k:Math.min(1,speed/8)});sim.lastSurface=surfaces.includes('water')?'water':surfaces[0];
 const airborne=rig.wheels.every((w:any)=>w.air);if(airborne)sim.airVy=d.vy;if(sim.wasAirborne&&!airborne&&Math.abs(sim.airVy??0)>2.5)sim.sound?.('thud',{k:Math.min(.4,Math.abs(sim.airVy)/12)});sim.wasAirborne=airborne;
}
