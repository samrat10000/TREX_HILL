import fs from 'node:fs/promises';
import { connect } from './cdp.mjs';
const c=await connect(),{ev,send}=c,checks=[];
const poll=async expression=>{const start=Date.now();while(Date.now()-start<180000){if(await ev(expression))return;await new Promise(r=>setTimeout(r,500))}throw Error('Timed out '+expression)};
const check=async(name,expression)=>{if(!await ev(expression))throw Error('Failed '+name);checks.push(name);console.log('PASS '+name)};
const shot=async name=>{const r=await send('Page.captureScreenshot',{format:'png'});await fs.mkdir('artifacts/game-verification',{recursive:true});await fs.writeFile(`artifacts/game-verification/${name}.png`,Buffer.from(r.data,'base64'))};
await send('Page.navigate',{url:'about:blank'});await new Promise(r=>setTimeout(r,500));c.errors.length=0;await send('Page.navigate',{url:'http://127.0.0.1:5173/'});await new Promise(r=>setTimeout(r,1000));
await send('Emulation.setDeviceMetricsOverride',{width:960,height:600,deviceScaleFactor:1,mobile:false});
await poll("!!window.__TREX_DEBUG__?.rig&&window.__TREX_DEBUG__.store.getState().screen==='title'");
await ev(`(()=>{const m=window.__TREX_DEBUG__,s=m.store.getState();s.configure({quality:'low',scale:.5,grass:1,bloom:false,shadows:false,time:'night',cycle:0,fov:55,reduce:true,contrast:true,subtitles:false});m.verifyTime=m.time;m.store.setState({saves:[null,null,null],found:[],explored:[]});s.startTrip('meadow',0);})()`);
await poll(`window.__TREX_DEBUG__.store.getState().screen==='drive'&&window.__TREX_DEBUG__.time-window.__TREX_DEBUG__.verifyTime>1`);
await check('Night preview drives automatic headlights',`window.__TREX_DEBUG__.headlights===1&&window.__TREX_DEBUG__.preset.night>.5`);
await check('Field of view and accessibility apply live',`window.__TREX_DEBUG__.camera.fov>45&&document.querySelector('main.reduce.contrast')!==null`);
await check('Settings persist their complete values',`JSON.parse(localStorage.getItem('trex-hill')).state.settings.fov===55&&JSON.parse(localStorage.getItem('trex-hill')).state.settings.subtitles===false`);
await ev(`(()=>{const m=window.__TREX_DEBUG__,s=m.store.getState();s.configure({time:'golden',fov:38,reduce:false,contrast:false,subtitles:true});s.go('garage');})()`);
await check('Garage shows six live stat bars',`document.querySelectorAll('#garage .statbar').length===6`);
await ev(`window.__TREX_DEBUG__.store.setState({garageCategory:1})`);
await poll(`!!document.querySelector('#garage .part.locked')`);
await check('Garage explains locked snow chains',`[...document.querySelectorAll('#garage .part.locked')].some(p=>p.textContent.includes('Collect 5 postcards'))`);
await ev(`(()=>{const s=window.__TREX_DEBUG__.store.getState();s.back();})()`);
await poll(`window.__TREX_DEBUG__.time-window.__TREX_DEBUG__.verifyTime>2`);
await shot('golden-drive');
if(process.argv.includes('--complete')){
 await ev(`window.__TREX_DEBUG__.store.getState().go('map')`);await poll(`!!document.getElementById('map')`);
 await ev(`document.querySelector('#map canvas').dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:420,clientY:250}))`);
 await check('Paper map sets a real world waypoint',`!!window.__TREX_DEBUG__.store.getState().waypoint`);
 await ev(`window.__TREX_DEBUG__.store.getState().back()`);await poll(`!document.getElementById('waypoint-pin')?.hidden`);
 await ev(`window.__TREX_DEBUG__.store.getState().go('photo')`);await poll(`!!window.__TREX_DEBUG__.takePhoto`);
 await poll(`window.__TREX_DEBUG__.photoPose!==undefined`);
 await ev(`(()=>{const m=window.__TREX_DEBUG__,deer=m.scene.children.flatMap(o=>o.children).flatMap(o=>o.children).find(o=>o.userData.species==='deer'&&o.position.x===15);if(!deer)throw Error('Home deer missing');const at=deer.position.clone();at.y+=.8;const pos=at.clone().add({x:-6,y:2,z:4}),dir=at.clone().sub(pos).normalize();m.photoPose.copy(pos);m.photoAngles={yaw:Math.atan2(-dir.z,dir.x),pitch:Math.asin(dir.y)};m.camera.position.copy(pos);m.camera.lookAt(at);m.photoCheckTime=m.time;})()`);
 await poll(`window.__TREX_DEBUG__.time-window.__TREX_DEBUG__.photoCheckTime>1.2`);
 await shot('photo-mode');
 await fs.mkdir('artifacts/game-verification/photos',{recursive:true});await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:(await import('node:path')).resolve('artifacts/game-verification/photos'),eventsEnabled:true});
 await ev(`window.__TREX_DEBUG__.takePhoto()`);
 await poll(`window.__TREX_DEBUG__.lastPhoto?.bytes>0`);
 await check('Framing a deer awards its postcard',`window.__TREX_DEBUG__.store.getState().found.includes('deer')&&window.__TREX_DEBUG__.lastPhoto.earned>=1`);
 await check('JPEG encodes the rendered canvas',`window.__TREX_DEBUG__.lastPhoto.width>0&&window.__TREX_DEBUG__.lastPhoto.height>0&&window.__TREX_DEBUG__.lastPhoto.bytes>1000`);
 const name=await ev('window.__TREX_DEBUG__.lastPhoto.name');let jpeg;for(let i=0;i<40;i++){try{jpeg=await fs.readFile(`artifacts/game-verification/photos/${name}`);break}catch{await new Promise(r=>setTimeout(r,250))}}if(!jpeg||jpeg.readUInt16BE(0)!==0xffd8)throw Error('JPEG download missing');checks.push('Native JPEG download exists on disk');console.log('PASS Native JPEG download exists on disk');


}
await fs.writeFile('artifacts/game-verification/results.json',JSON.stringify({checks,errors:c.errors},null,2));console.log(JSON.stringify({checks:checks.length,errors:c.errors}));if(c.errors.length)process.exitCode=1;c.close();
