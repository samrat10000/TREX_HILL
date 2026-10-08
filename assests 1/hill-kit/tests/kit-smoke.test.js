global.window=global;
global.THREE=require('three');global.performance=require('perf_hooks').performance;
const src=require('fs').readFileSync(__dirname+'/../reference/hillkit-kit.js','utf8');eval(src+';global.KIT=KIT;');
const env={wind:1,night:1,time:0};let n=0,tris=0;
function count(o){o.traverse(m=>{if(m.isMesh){const g=m.geometry;tris+=(g.index?g.index.count:g.attributes.position.count)/3}})}
for(const e of KIT.ENTRIES){try{let o;if(e.vehicle){for(const cfg of[{},{load:'tent',armor:true,flag:'flag',tires:'chains',rims:'beadlock',livery:'rally',lift:.3,tireSize:1.3,front:'bullbar',snorkel:true,ladder:true,cans:true,roofLamps:true,lightbar:true,fog:true,engine:'v8'},{load:'kayak',front:'ram',tires:'sand',rims:'spoke',livery:'safari'},{tires:'mud',livery:'twotone',load:'cargo'}]){const r=KIT.vehicle(e.id,cfg);r.setLights(1,1);r.root.updateMatrixWorld(true);for(let i=0;i<5;i++)r.update(1/60,i/60,env);o=r.root}}else{o=e.build({seed:3});o.updateMatrixWorld(true);for(let i=0;i<5;i++)o.userData.update&&o.userData.update(1/60,i/60,env)}
 tris=0;count(o);console.log(e.id.padEnd(12),Math.round(tris));n++}catch(err){console.log('FAIL',e.id,err.stack.split('\n').slice(0,3).join(' | '))}}
const c=KIT.caravan({});console.log('entries ok',n,'/',KIT.ENTRIES.length);
