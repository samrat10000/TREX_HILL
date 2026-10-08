import { HillDSP,ENG,Tires } from './audioDSP';
declare const sampleRate:number;
declare class AudioWorkletProcessor {readonly port:MessagePort;}
declare function registerProcessor(name:string,processor:new()=>AudioWorkletProcessor):void;
export type AudioFrame={type:'frame';engineType:string;run:boolean;rpm:number;throttle:number;speed:number;slip:number;surfaces:string[];master:number;engineGain:number;tyresGain:number;wildlifeGain:number;worldGain:number;musicGain:number;uiGain:number;ambience:{wind:number;rain:number;storm:number;night:number;day:number;fire:number;water:number;roof:number;habitat:number;coast:number};};
type SoundPacket={type:'sound';name:string;options?:{gain?:number;km?:number;k?:number;dur?:number}};
// A quiet plucked score with long rests, generated in the audio thread.
class QuietMusic {private notes:{buffer:Float32Array;index:number;life:number}[]=[];private clock=0;private next=0;private step=0;private frequencies=[220,293.665,329.628,440,391.995,329.628,293.665,220];
 render(left:Float32Array,right:Float32Array,gain:number){if(gain<.001)return;for(let i=0;i<left.length;i++){this.clock+=1/sampleRate;if(this.clock>=this.next){if(this.step<8){const length=Math.round(sampleRate/this.frequencies[this.step]),buffer=new Float32Array(length);for(let k=0;k<length;k++)buffer[k]=(Math.random()*2-1)*.16;this.notes.push({buffer,index:0,life:sampleRate*5});this.next=this.clock+2.8;this.step++;}else{this.next=this.clock+70;this.step=0;}}let value=0;for(const note of this.notes){const j=note.index,next=(j+1)%note.buffer.length,v=note.buffer[j];note.buffer[j]=(v+note.buffer[next])*.497;note.index=next;note.life--;value+=v;}left[i]=Math.tanh(left[i]+value*gain*.35);right[i]=Math.tanh(right[i]+value*gain*.35);}this.notes=this.notes.filter(n=>n.life>0);}
}
class HillProcessor extends AudioWorkletProcessor {private dsp=new HillDSP(sampleRate);private music=new QuietMusic();private musicGain=0;private blocks=0;
 constructor(){super();this.port.onmessage=(event:MessageEvent<AudioFrame|SoundPacket>)=>{const data=event.data;if(data.type==='sound'){this.dsp.play(data.name,data.options??{});return;}if(data.type!=='frame')return;const f=data;
  if(f.engineType in ENG&&this.dsp.engine.type!==f.engineType)this.dsp.engine.setType(f.engineType);
  if(f.run)this.dsp.engine.start();else this.dsp.engine.stop();
  this.dsp.engine.set(f.rpm,f.throttle);this.dsp.engine.vol=f.engineGain;this.dsp.master=f.master;this.dsp.worldGain=f.worldGain;this.dsp.wildlifeGain=f.wildlifeGain??.4;this.dsp.tyresGain=f.tyresGain??.4;this.dsp.uiGain=f.uiGain;this.musicGain=f.musicGain*f.master;
  const count=Math.max(4,Math.min(6,f.surfaces.length));while(this.dsp.wheels.length<count)this.dsp.wheels.push(new Tires(sampleRate));this.dsp.wheels.length=count;
  this.dsp.wheels.forEach((wheel,i)=>{wheel.vol=(f.tyresGain??.4)/count;wheel.set(f.speed,f.surfaces[i]==='water'?'mud':f.surfaces[i],f.slip);});this.dsp.amb.set(f.ambience);
 };this.port.postMessage({type:'ready'});}
 process(_inputs:Float32Array[][],outputs:Float32Array[][]){const [left,right]=outputs[0]??[];if(!left||!right)return true;this.dsp.render(left,right);this.music.render(left,right,this.musicGain);if(++this.blocks%200===0)this.port.postMessage({type:'meter',peak:this.dsp.peak,engine:this.dsp.engine.type,surfaces:this.dsp.wheels.map(w=>w.surface)});return true;}
}
registerProcessor('trex-hill-audio',HillProcessor);
