'use strict';
/* =====================================================================
   UI — screen state machine over the persistent world.
   Screens: loading · title · play · freeroam · garage · settings ·
            drive(HUD) · pause · map · journal · photo · kit
===================================================================== */
(function(){
const K=KIT,$=s=>document.querySelector(s),ui=$('#ui'),root=document.documentElement;
const ico={
 back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
 game:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 16l5-8 4 5 3-3 4 6z"/></svg>',
 gfx:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="13" rx="3"/><path d="M8 21h8"/></svg>',
 audio:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 10v4h4l5 4V6L8 10z"/><path d="M17 9a4 4 0 010 6"/></svg>',
 keys:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="7" width="18" height="11" rx="2.5"/><path d="M7 11h.01M11 11h.01M15 11h.01M8 14h8"/></svg>',
 world:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/></svg>',
 a11y:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="5" r="2"/><path d="M5 9l7 1 7-1M12 10v5l-3 6M12 15l3 6"/></svg>',
 hud:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 16h3M14 16h3M9 8h6"/></svg>',
 paint:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20c3 0 4-2 4-4a3 3 0 016 0"/><path d="M10 14l9-9-3-3-9 9"/></svg>',
 wheel:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>',
 body:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 15v-3l3-4h9l4 4h2v3z"/><circle cx="7" cy="16" r="2"/><circle cx="17" cy="16" r="2"/></svg>',
 roof:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 10h16M6 10V7M18 10V7M9 10V7M15 10V7"/><path d="M5 14h14v5H5z"/></svg>',
 bulb:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9V16h7v-2.1A6 6 0 0012 3z"/></svg>',
 engine:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 9h3l2-2h5l2 3h3v6h-3l-2 2H9l-2-3H4z"/></svg>',
 tent:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 4L3 20h18z"/><path d="M12 12l-3 8M12 12l3 8"/></svg>',
 pin:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 00-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1112 6a2.5 2.5 0 010 5z"/></svg>',
 cam:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
 light:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 6a6 6 0 010 12z"/><path d="M14 8h6M14 12h7M14 16h6"/></svg>',
 truck:'<svg viewBox="0 0 48 28" fill="currentColor"><path d="M4 18v-6l5-6h18l6 6h8a3 3 0 013 3v3z"/><circle cx="13" cy="20" r="5"/><circle cx="36" cy="20" r="5"/><rect x="10" y="2" width="16" height="3" rx="1"/></svg>',
 trailer:'<svg viewBox="0 0 48 28" fill="currentColor"><rect x="10" y="4" width="30" height="15" rx="4"/><path d="M2 16h8v2H2z"/><circle cx="25" cy="21" r="5"/></svg>'};

/* ---------------- persistent state ---------------- */
const DEF={slot:0,saves:[{region:'Golden Meadow',day:3,hours:2.4,veh:'ranger40',found:7,last:'Today, 11:20'},null,null],
 garage:{vehicle:'ranger40',loadouts:{},owned:['ranger40','trek110','bronc','van','blazer']},
 set:{time:'golden',weather:'clear',season:'summer',cycle:24,quality:'high',scale:1,grass:1,shadows:true,bloom:true,fov:38,
  master:.8,engine:.8,worldv:.7,music:.5,uiv:.6,showSpeed:false,showMini:false,compass:true,prompts:true,units:'kmh',
  cozy:true,autoLights:true,camShake:.4,textScale:1,reduce:false,contrast:false,subtitles:true,hold:false,
  keys:{up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD',brake:'Space',lights:'KeyH',range:'KeyL',camera:'KeyC',map:'KeyM',photo:'KeyP',camp:'KeyE',recover:'KeyR'}},
 found:['camp','garage','ember-trail','first-light','fire-maple','lake-view','deer']};
let S;try{S=Object.assign(structuredClone(DEF),JSON.parse(localStorage.getItem('trex-shell')||'{}'));S.set=Object.assign(structuredClone(DEF.set),S.set);S.set.keys=Object.assign({},DEF.set.keys,S.set.keys)}catch(e){S=structuredClone(DEF)}
const save=()=>{try{localStorage.setItem('trex-shell',JSON.stringify(S))}catch(e){}};
const loadout=id=>Object.assign({},K.VDEF,K.VEH[id].def,S.garage.loadouts[id]||{});

/* ---------------- apply settings to world + css ---------------- */
function applySettings(){const s=S.set;W.setTime(s.time);W.setWeather(s.weather);W.setSeason(s.season);W.st.cycle=s.cycle;W.st.grass=s.grass;W.st.shadows=s.shadows;W.st.bloom=s.bloom;W.st.fov=s.fov;W.setScale(s.scale);
 root.style.setProperty('--text-scale',s.textScale);root.classList.toggle('reduce',s.reduce);root.classList.toggle('contrast',s.contrast)}

/* ---------------- screen manager ---------------- */
const screens={},stack=[];let cur=null;
function def(name,build,enter,leave){const el=document.createElement('section');el.className='screen';el.id=name;el.setAttribute('aria-label',name);ui.appendChild(el);screens[name]={el,build,enter,leave}}
function go(name,opts={}){if(cur&&!opts.replace&&!opts.noPush)stack.push(cur);const prev=screens[cur];if(prev){prev.el.classList.remove('on');prev.leave&&prev.leave()}
 cur=name;const s=screens[name];s.el.innerHTML=s.build(opts);s.el.classList.add('on');s.enter&&s.enter(s.el,opts);focusFirst(s.el);themeSync()}
function back(){const p=stack.pop();if(p)go(p,{noPush:true})}
function focusFirst(el){const f=el.querySelector('[data-first]')||el.querySelector('button,input');if(f&&!matchMedia('(hover:none)').matches)setTimeout(()=>f.focus({preventScroll:true}),60)}
function themeSync(){root.dataset.theme=(W.P.night>.55||(W.P.hor.r*.3+W.P.hor.g*.59+W.P.hor.b*.11)<.33)&&cur!=='title'?'dark':W.P.night>.55?'dark':'light'}
setInterval(themeSync,800);
const backBtn=(label='Back')=>`<button class="back" data-act="back">${ico.back}${label}</button>`;
const hints=arr=>`<div class="hints">${arr.map(([k,l])=>`<span><span class="k">${k}</span>${l}</span>`).join('')}</div>`;
const keyName=c=>c.replace('Key','').replace('Arrow','').replace('Space','Space').replace('Digit','');

/* =============== LOADING =============== */
const TIPS=['Golden hour lasts longer on the ridge. Drive up before the sun drops.','Low range (L) crawls rocks without spinning. Tap L before a climb.','Every campfire is a save. Rest there to skip to morning.','Lookout towers reveal the map around them. Climb one in each valley.','Your caravan follows the hitch, not the road. Take corners wide.'];
def('loading',o=>`<div class="inner"><span class="label">${o.to==='drive'?'Heading out to':'Loading'}</span><h2>${o.region||'Golden Meadow'}</h2><p>${TIPS[Math.floor(Math.random()*TIPS.length)]}</p>
 <div class="road" aria-hidden="true"><div class="dash"></div><div class="done" style="width:0"></div><svg class="car" viewBox="0 0 48 28" fill="currentColor" style="left:0">${ico.truck.replace(/<\/?svg[^>]*>/g,'')}</svg></div>
 <p class="label" style="margin-top:18px" role="status" aria-live="polite"><span id="lp">0</span>%</p></div>`,
 (el,o)=>{W.setRig('loading');let p=0;const tick=()=>{p=Math.min(100,p+4+Math.random()*9);el.querySelector('.done').style.width=p+'%';el.querySelector('.car').style.left=p+'%';el.querySelector('#lp').textContent=Math.round(p);if(p<100)el._t=setTimeout(tick,110);else el._t=setTimeout(()=>go(o.to||'title',{replace:true,noPush:true,...o}),420)};tick()},
 function(){clearTimeout(screens.loading.el._t)});

/* =============== TITLE =============== */
def('title',()=>{const sv=S.saves[S.slot];return`
 <div class="wordmark">trex hill<small>a cozy drive over every horizon</small></div>
 <ul class="menu" role="menu" aria-label="Main menu">
  <li><button role="menuitem" data-first data-act="continue">${sv?'continue':'play'}<small>${sv?sv.region+' · day '+sv.day:'start a new trip'}</small></button></li>
  <li><button role="menuitem" data-act="play">play<small>save slots</small></button></li>
  <li><button role="menuitem" data-act="freeroam">free roam<small>no goals, just the world</small></button></li>
  <li><button role="menuitem" data-act="garage">garage<small>${Object.keys(K.VEH).length} vehicles, every part</small></button></li>
  <li><button role="menuitem" data-act="settings">settings</button></li>
  <li><button role="menuitem" data-act="kit">ui kit<small>components and tokens</small></button></li></ul>
 ${sv?`<div class="save-card glass"><span class="label">Last trip</span><div class="art"></div><h3>${sv.region}</h3><p class="muted" style="margin:2px 0 10px">${K.VEH[sv.veh].name} · ${sv.last}</p>
  <div class="stats3"><div><b>${sv.day}</b>days</div><div><b>${sv.hours}h</b>played</div><div><b>${sv.found}</b>found</div></div></div>`:''}
 <div class="corner"><span class="chipline glass" id="clock">${W.timeLabel}</span></div>
 ${hints([['↑↓','Choose'],['Enter','Select']])}`},
 el=>{W.setRig('title');W.poseHero('camp');W.forceLights=null;el._c=setInterval(()=>{const c=el.querySelector('#clock');if(c)c.textContent=W.timeLabel},1000)},
 ()=>clearInterval(screens.title.el._c));

/* =============== PLAY (save slots) =============== */
const REGIONS=[{id:'meadow',name:'Golden Meadow',sub:'Rolling grass, first camp',g:'linear-gradient(180deg,#f7c58a,#f2c35c 58%,#c98a3a 59%,#9a6224)',season:'summer'},
 {id:'ember',name:'Ember Woods',sub:'Maples, aspens, rivers',g:'linear-gradient(180deg,#f4a68c,#e8622f 58%,#8a3e24 59%,#5e2a1a)',season:'autumn'},
 {id:'pine',name:'Pinecrest',sub:'Lookouts and switchbacks',g:'linear-gradient(180deg,#bcd7ee,#8cbf5a 58%,#2f5a2c 59%,#1f3a20)',season:'highland'},
 {id:'canyon',name:'Copper Canyon',sub:'Mesas and dry washes',g:'linear-gradient(180deg,#ffdcaa,#d07a4e 58%,#b8583a 59%,#7a3422)',season:'summer',lock:'Reach the Pinecrest lookout'},
 {id:'pass',name:'Whitecap Pass',sub:'Snow, chains, aurora nights',g:'linear-gradient(180deg,#6e6aa6,#e8ecf4 58%,#b8b2bc 59%,#7d8293)',season:'winter',lock:'Fit snow chains'},
 {id:'coast',name:'Bluewater Coast',sub:'Lighthouse, ferry, palms',g:'linear-gradient(180deg,#a8dbf2,#5ae4dc 58%,#0f8a9a 59%,#0a5a6a)',season:'summer',lock:'Find the ferry ticket'}];
def('play',()=>`${backBtn()}<div class="sheet glass" style="grid-template-columns:1fr"><div class="body"><h3 style="font-size:30px">Your trips</h3><p class="lead">Three save slots. Each trip keeps its own map, camp, vehicles and journal.</p>
 <div class="cards">${S.saves.map((s,i)=>s?`<button class="card" data-slot="${i}" ${i===S.slot?'aria-pressed="true" data-first':''}><div class="art" style="background:${REGIONS.find(r=>r.name===s.region)?.g||REGIONS[0].g}"></div><span class="badge">Slot ${i+1}</span><div class="meta"><b>${s.region}</b><span>Day ${s.day} · ${s.hours}h · ${K.VEH[s.veh].name}</span></div></button>`
  :`<button class="card" data-new="${i}"><div class="art" style="background:repeating-linear-gradient(45deg,var(--chip) 0 10px,transparent 10px 20px)"></div><span class="badge">Slot ${i+1}</span><div class="meta"><b>New trip</b><span>Start in Golden Meadow</span></div></button>`).join('')}</div></div></div>
 <div class="sheet-foot" style="position:absolute;left:50%;transform:translateX(-50%);bottom:calc(18px + env(safe-area-inset-bottom,0px))"><button class="btn primary" data-act="continue">Continue slot ${S.slot+1}</button></div>`,
 ()=>W.setRig('menu'));

/* =============== FREE ROAM setup =============== */
const fr={region:'meadow',time:S.set.time,weather:'clear',cozy:true};
def('freeroam',()=>`${backBtn()}<div class="sheet glass" style="grid-template-columns:1fr"><div class="body">
 <h3 style="font-size:30px">Free roam</h3><p class="lead">Pick where to wake up and what the sky looks like. No fuel, no timers, no goals unless you want them.</p>
 <span class="label">Region</span><div class="cards">${REGIONS.map((r,i)=>`<button class="card" data-region="${r.id}" aria-pressed="${r.id===fr.region}" ${i===0?'data-first':''}><div class="art" style="background:${r.g}"></div><div class="meta"><b>${r.name}</b><span>${r.sub}</span></div>${r.lock?`<div class="lock">🔒 ${r.lock}</div>`:''}</button>`).join('')}</div>
 <div class="row"><div class="t"><b>Wake up at</b><span>You can change this any time from Settings, World.</span></div><div class="seg" data-fr="time">${W.ORDER.map(t=>`<button data-v="${t}" aria-pressed="${t===fr.time}">${t}</button>`).join('')}</div></div>
 <div class="row"><div class="t"><b>Weather</b></div><div class="seg" data-fr="weather">${Object.keys(W.WX).map(t=>`<button data-v="${t}" aria-pressed="${t===fr.weather}">${t}</button>`).join('')}</div></div>
 <div class="row"><div class="t"><b>Cozy mode</b><span>No damage, no fuel, automatic recovery if you roll over.</span></div><input class="tog" type="checkbox" id="frc" ${fr.cozy?'checked':''}></div>
 <div style="display:flex;justify-content:flex-end;margin-top:16px"><button class="btn primary" data-act="start-roam">Head out</button></div></div></div>`,
 ()=>W.setRig('menu'));

/* =============== GARAGE =============== */
const PARTMETA={tires:{road:'Quiet, quick on tarmac',allterrain:'Good everywhere',mud:'Bites in mud and rock',sand:'Floats on dunes',chains:'Grip on snow and ice'},rims:{steel:'Classic pressed steel',spoke:'Light and bright',beadlock:'Holds air at low pressure',white:'Retro white wagon',black:'Stealth black'},
 front:{bumper:'Factory bumper',bullbar:'Tube bar, light mounts',ram:'Welded plate'},load:{none:'Clean roof',cargo:'Boxes, cans and a spare',kayak:'Two sit-on kayaks',tent:'Pop-up roof tent'},engine:{inline6:'135 hp · smooth',v8:'240 hp · loud',diesel:'160 hp · torque',electric:'300 hp · silent'},susp:{soft:'Long travel, floaty',stock:'Balanced',stiff:'Rally firm'},
 livery:{none:'Plain paint',stripe:'Side stripes',rally:'Number roundels',safari:'Two-tone sill',twotone:'Contrast pillars'},roof:{white:'White top',body:'Body colour',black:'Black top'},flag:{none:'No pole',flag:'Camp flag',whip:'Tall whip'},lights:{auto:'On at dusk',on:'Always on',off:'Off'}};
const LOCKED={'tires:chains':'Visit Whitecap Pass','engine:electric':'Find 20 postcards','front:ram':'Discover Scrapjaw\'s yard','load:tent':'Rest at 3 camps','rims:beadlock':'Climb the Waterfall trail'};
const GCATS=[['paint','Paint',0,'iso'],['wheel','Wheels',1,'wheel'],['body','Body',2,'front'],['roof','Roof',3,'roof'],['bulb','Lights',4,'lights'],['engine','Engine',5,'iso']];
let gcat=0,gveh=S.garage.vehicle,gdraft=null,gnight=false;
function stats(c){const tire={road:[.35,.9],allterrain:[.6,.7],mud:[.85,.5],sand:[.7,.55],chains:[.95,.35]}[c.tires],E=K.ENGINES[c.engine],sp={soft:.85,stock:.6,stiff:.35}[c.susp];
 return{Grip:Math.min(1,tire[0]+(c.tireSize-1)*.5),Comfort:Math.min(1,sp*.8+(c.tireSize-.9)*.4+.1),Power:E.hp/300,Clearance:Math.min(1,.35+c.lift*1.2+(c.tireSize-.9)*.9+(c.front==='ram'?-.05:0)),Carry:{none:.2,cargo:.7,kayak:.5,tent:.6}[c.load]*(c.rack||c.load==='tent'?1:.4)+(c.cans?.15:0),Night:Math.min(1,.3+(c.roofLamps?.25:0)+(c.lightbar?.3:0)+(c.fog?.15:0))}}
function statBars(now,base){return Object.keys(now).map(k=>{const a=Math.min(1,base[k]),b=Math.min(1,now[k]),d=b-a,up=d>.005,dn=d<-.005;
 return`<div class="statbar"><div class="top"><span>${k}</span><span class="d ${up?'up':dn?'down':''}">${up?'+':''}${dn||up?Math.round(d*100):''}</span></div><div class="bar"><i style="width:${Math.min(a,b)*100}%"></i>${up||dn?`<em class="${up?'up':'down'}" style="left:${Math.min(a,b)*100}%;width:${Math.abs(d)*100}%"></em>`:''}</div></div>`}).join('')}
function partsFor(ci){const sec=K.VOPTS[ci];return sec.items.map(it=>{const v=gdraft[it.k];
 if(it.t==='swatch')return`<div class="part-group"><span class="label">${it.l}</span><div class="swatches">${Object.entries(K.PAINTS).map(([n,c])=>`<button class="sw" style="background:#${c.toString(16).padStart(6,'0')}" data-k="${it.k}" data-v="${n}" aria-label="${n}" aria-pressed="${n===v}"></button>`).join('')}</div></div>`;
 if(it.t==='seg')return`<div class="part-group"><span class="label">${it.l}</span><div class="parts-grid">${it.v.map(o=>{const lk=LOCKED[it.k+':'+o];return`<button class="part${lk?' locked':''}" data-k="${it.k}" data-v="${o}" aria-pressed="${o===v}" ${lk?`title="${lk}"`:''}><b>${({allterrain:'all-terrain',inline6:'inline-6',twotone:'two-tone'})[o]||o}</b><span>${lk||((PARTMETA[it.k]||{})[o]||'')}</span></button>`}).join('')}</div></div>`;
 if(it.t==='toggle')return`<div class="row"><div class="t"><b>${it.l}</b></div><input class="tog" type="checkbox" data-k="${it.k}" ${v?'checked':''} aria-label="${it.l}"></div>`;
 if(it.t==='range'){const p=(v-it.min)/(it.max-it.min)*100;return`<div class="row"><div class="t"><b>${it.l}</b></div><div style="display:flex;align-items:center;gap:8px"><input type="range" data-k="${it.k}" min="${it.min}" max="${it.max}" step="${it.step}" value="${v}" style="--p:${p}%;width:130px" aria-label="${it.l}"><span class="val">${it.step<1?(+v).toFixed(2):v}</span></div></div>`}
 return''}).join('')}
function garageHTML(){const spec=K.VEH[gveh],base=stats(loadout(gveh)),now=stats(gdraft),dirty=JSON.stringify(gdraft)!==JSON.stringify(loadout(gveh));
 return`${backBtn()}
 <div class="left glass"><div class="cats" role="tablist">${GCATS.map(([ic,l],i)=>`<button class="cat" role="tab" data-cat="${i}" aria-selected="${i===gcat}" ${i===gcat?'data-first':''}>${ico[ic]}${l}</button>`).join('')}</div><div class="parts">${partsFor(GCATS[gcat][2])}</div></div>
 <div class="right glass"><span class="label">Bay ${Object.keys(K.VEH).indexOf(gveh)+1}</span><h2>${spec.name}</h2><p class="muted" style="margin:6px 0 8px">${spec.blurb}</p><div id="gstats">${statBars(now,base)}</div>
  <div class="row" style="border:0;padding:6px 0"><div class="t"><b>Night preview</b><span>Check your lights</span></div><input class="tog" type="checkbox" id="gnight" ${gnight?'checked':''}></div>
  <div class="apply"><button class="btn ghost" data-act="g-revert" ${dirty?'':'disabled'}>Revert</button><button class="btn primary" data-act="g-apply" ${dirty?'':'disabled'}>${dirty?'Apply':'Saved'}</button></div>
  <button class="btn" data-act="g-drive" style="width:100%;margin-top:8px">Take it for a drive</button></div>
 <div class="camhint">Drag to turn the camera · ${GCATS[gcat][1]} view</div>
 <div class="bays glass">${Object.entries(K.VEH).map(([k,v])=>{const own=S.garage.owned.includes(k),c='#'+(K.PAINTS[(S.garage.loadouts[k]||{}).paint||v.def.paint||'tangerine']||0xd9622b).toString(16).padStart(6,'0');
  return`<button class="bay${own?'':' locked'}" data-veh="${k}" aria-pressed="${k===gveh}"><b>${v.name}</b><span>${own?'In your garage':'Find it in the world'}</span><div class="stripe" style="background:${c}"></div></button>`}).join('')}</div>`}
function garageRefresh(keepScroll){const el=screens.garage.el,sc=el.querySelector('.parts')?.scrollTop||0,bs=el.querySelector('.bays')?.scrollLeft||0;el.innerHTML=garageHTML();if(keepScroll){el.querySelector('.parts').scrollTop=sc;el.querySelector('.bays').scrollLeft=bs}W.setHero(gveh,gdraft);W.poseHero('garage')}
def('garage',()=>{gveh=S.garage.vehicle;gdraft=loadout(gveh);return garageHTML()},el=>{W.setHero(gveh,gdraft);W.poseHero('garage');W.heroCam(GCATS[gcat][3]);W.forceLights=gnight?1:null},()=>{W.forceLights=null;gnight=false;W.setTime(S.set.time);W.setHero(S.garage.vehicle,loadout(S.garage.vehicle))});

/* =============== SETTINGS =============== */
const STABS=[['game','Gameplay'],['world','World'],['hud','HUD'],['gfx','Graphics'],['audio','Audio'],['keys','Controls'],['a11y','Accessibility']];let stab=0;
const QUAL={low:{scale:.7,grass:.35,shadows:false,bloom:false},medium:{scale:.85,grass:.6,shadows:true,bloom:false},high:{scale:1,grass:1,shadows:true,bloom:true},ultra:{scale:1.25,grass:1,shadows:true,bloom:true}};
const rng=(k,l,d,min,max,step,fmt=v=>Math.round(v*100)+'%')=>`<div class="row"><div class="t"><b>${l}</b>${d?`<span>${d}</span>`:''}</div><div style="display:flex;align-items:center;gap:10px"><input type="range" data-s="${k}" min="${min}" max="${max}" step="${step}" value="${S.set[k]}" style="--p:${(S.set[k]-min)/(max-min)*100}%" aria-label="${l}"><span class="val" data-fmt="${k}">${fmt(S.set[k])}</span></div></div>`;
const tg=(k,l,d)=>`<div class="row"><div class="t"><b>${l}</b>${d?`<span>${d}</span>`:''}</div><input class="tog" type="checkbox" data-s="${k}" ${S.set[k]?'checked':''} aria-label="${l}"></div>`;
const sg=(k,l,d,vals,lab=v=>v)=>`<div class="row"><div class="t"><b>${l}</b>${d?`<span>${d}</span>`:''}</div><div class="seg" data-s="${k}">${vals.map(v=>`<button data-v="${v}" aria-pressed="${S.set[k]==v}">${lab(v)}</button>`).join('')}</div></div>`;
const FMT={scale:v=>Math.round(v*100)+'%',fov:v=>Math.round(v)+'°',cycle:v=>v==0?'Frozen':v+' min',textScale:v=>Math.round(v*100)+'%'};
function stabHTML(){const id=STABS[stab][0];
 if(id==='game')return`<h3>Gameplay</h3><p class="lead">How the trip feels. Nothing here locks you out of anything.</p>${tg('cozy','Cozy mode','No damage or fuel. Rollovers recover on their own.')}${tg('autoLights','Automatic headlights','Lights come on at dusk, in mist and in storms.')}${sg('units','Units','',['kmh','mph'],v=>v==='kmh'?'km/h':'mph')}${rng('camShake','Camera shake','Bumps and rough ground',0,1,.05)}`;
 if(id==='world')return`<h3>World</h3><p class="lead">Sky, season and weather. These used to be on screen while driving; now they live here.</p>${sg('time','Time of day','Jumps the clock. The day keeps moving if the cycle is on.',W.ORDER)}${rng('cycle','Day length','Real minutes for one full day.',0,60,4,FMT.cycle)}${sg('weather','Weather','',Object.keys(W.WX))}${sg('season','Season','Repaints grass and trees.',['summer','autumn','highland','winter'])}`;
 if(id==='hud')return`<h3>HUD</h3><p class="lead">The world is the interface. Keep the screen clean, or add what helps you.</p>${tg('compass','Compass strip','Thin bar with markers along the top.')}${tg('prompts','Button prompts','Hints like "E Make camp" near things you can use.')}${tg('showSpeed','Speedometer','Off by default.')}${tg('showMini','Minimap','Off by default. M opens the full map.')}`;
 if(id==='gfx')return`<h3>Graphics</h3><p class="lead">Start with a preset, then fine-tune.</p><div class="presetbar">${Object.keys(QUAL).map(q=>`<button class="btn ${S.set.quality===q?'primary':''}" data-q="${q}">${q}</button>`).join('')}</div>${rng('scale','Render scale','Lower is faster.',.5,1.5,.05,FMT.scale)}${rng('grass','Grass density','',0,1,.05)}${tg('shadows','Shadows')}${tg('bloom','Glow and bloom','Headlights, lamps, fire.')}${rng('fov','Field of view','',30,70,1,FMT.fov)}`;
 if(id==='audio')return`<h3>Audio</h3><p class="lead">Every sound is part of the world. Balance it to taste.</p>${rng('master','Master','',0,1,.01)}${rng('engine','Engine and tyres','',0,1,.01)}${rng('worldv','World','Wind, rain, birds, fire.',0,1,.01)}${rng('music','Music','',0,1,.01)}${rng('uiv','Menus','',0,1,.01)}`;
 if(id==='keys'){const L={up:'Accelerate',down:'Brake / reverse',left:'Steer left',right:'Steer right',brake:'Handbrake',lights:'Headlights',range:'High / low range',camera:'Camera',map:'Map',photo:'Photo mode',camp:'Make camp / use',recover:'Recover vehicle'};
  return`<h3>Controls</h3><p class="lead">Click a key, then press the new one. Esc cancels.</p>${Object.entries(L).map(([k,l])=>`<div class="row keyrow"><div class="t"><b>${l}</b></div><kbd tabindex="0" data-bind="${k}">${keyName(S.set.keys[k])}</kbd></div>`).join('')}<div class="row"><div class="t"><b>Reset to default</b></div><button class="btn" data-act="keys-reset">Reset</button></div>`}
 return`<h3>Accessibility</h3><p class="lead">Make it comfortable to play for hours.</p>${rng('textScale','Text size','',.85,1.4,.05,FMT.textScale)}${tg('reduce','Reduce motion','Cuts camera drift and UI animation.')}${tg('contrast','High-contrast HUD','Solid backgrounds behind HUD text.')}${tg('subtitles','Sound captions','Shows thunder, horns and wildlife as text.')}${tg('hold','Toggle instead of hold','For accelerate and brake.')}`}
def('settings',()=>`${backBtn()}<div class="sheet glass"><nav role="tablist" aria-label="Settings"><h2>Settings</h2>${STABS.map(([ic,l],i)=>`<button class="tab" role="tab" data-tab="${i}" aria-selected="${i===stab}" ${i===stab?'data-first':''}>${ico[ic]}${l}</button>`).join('')}</nav><div class="body" id="sbody">${stabHTML()}</div></div>${hints([['Esc','Back'],['Tab','Next']])}`,
 ()=>{if(stack[stack.length-1]!=='pause')W.setRig('menu')});

/* =============== DRIVE (HUD) =============== */
const MARK=['N','NE','E','SE','S','SW','W','NW'];
function compassHTML(){let h='';for(let i=0;i<72*3;i++){const deg=(i%72)*5,x=i*14;if(deg%45===0)h+=`<span class="lt" style="left:${x}px">${MARK[deg/45]}</span>`;else h+=`<i class="tk${deg%15===0?' big':''}" style="left:${x}px"></i>`}
 return h+W.POI.map(p=>[0,1,2].map(r=>`<svg class="poi" data-poi="${p.id}" data-r="${r}" viewBox="0 0 24 24" style="color:${p.c}">${ico.pin.replace(/<\/?svg[^>]*>/g,'')}</svg>`).join('')).join('')+`<i class="poi wp" id="wpmark" style="display:none"></i>`}
let gear=2,range='H',banner=0;
def('drive',()=>`<div id="hud" class="on">
 ${S.set.compass?`<div class="compass" aria-hidden="true"><div class="strip">${compassHTML()}</div><span class="needle"></span></div>`:''}
 <div class="toast glass" id="toast"><div class="stamp">${ico.pin}</div><div><span class="label">Discovered</span><b id="toastT">Pinecrest Lookout</b><span class="muted" id="toastS">Postcard added to your journal</span></div></div>
 <div id="trail" style="position:absolute;left:0;right:0;top:20%;text-align:center;opacity:0;transform:translateY(8px);transition:opacity .8s var(--ease),transform .8s var(--ease);pointer-events:none"><span style="font:800 14px var(--body);letter-spacing:.2em;color:#ffd24a;text-shadow:0 2px 10px rgba(0,0,0,.4)">CHALLENGE TRAIL</span><div style="font:700 clamp(36px,5.5vw,64px)/1 var(--display);color:#ffd24a;text-transform:uppercase;text-shadow:0 3px 14px rgba(60,20,0,.45);letter-spacing:.01em">Waterfall Climb</div></div>
 <div class="vstat"><div class="icons" style="gap:10px">
   <div class="badge-v glass" title="Your truck" style="width:62px;height:62px;border-radius:50%;display:grid;place-items:center;padding:12px;color:var(--ink)">${ico.truck}</div>
   ${S.set.showSpeed?`<div class="spd"><span id="spd">0</span><small>${S.set.units==='kmh'?'KM/H':'MPH'}</small></div>`:''}
   <div class="ic" id="icL" title="Headlights">${ico.light}</div></div></div>
 <div style="position:absolute;right:24px;bottom:calc(26px + env(safe-area-inset-bottom,0px));display:flex;align-items:center;gap:10px;color:#fff;text-shadow:0 1px 6px rgba(0,0,0,.4)">
   <div id="gears" style="display:flex;gap:5px" aria-label="Gear">${[1,2,3,4].map(g=>`<i style="width:9px;height:9px;border-radius:50%;background:#fff;opacity:${g<=gear?1:.35}"></i>`).join('')}</div>
   <span class="k" id="rngH" style="${range==='H'?'':'opacity:.4'}">H</span><span class="k" id="rngL" style="${range==='L'?'':'opacity:.4'}">L</span></div>
 ${S.set.showMini?'<div class="minimap"><canvas id="mm" width="300" height="300"></canvas><span class="me"></span></div>':''}
 <div class="prompt glass ${S.set.prompts?'':'off'}" id="prompt"><span class="k">${keyName(S.set.keys.camp)}</span>Make camp</div>
 ${hints([['Esc','Pause'],[keyName(S.set.keys.map),'Map'],[keyName(S.set.keys.photo),'Photo'],[keyName(S.set.keys.lights),'Lights'],[keyName(S.set.keys.range),'Range']])}</div>`,
 el=>{W.setHero(S.garage.vehicle,loadout(S.garage.vehicle));W.poseHero('drive');W.setRig('drive');W.drv.target=9;
  setTimeout(()=>{const tr=el.querySelector('#trail');if(tr){tr.style.opacity=1;tr.style.transform='none';setTimeout(()=>{tr.style.opacity=0},3200)}},900);
  setTimeout(()=>discover('Pinecrest Lookout','Postcard added to your journal'),5200);
  const hs=el.querySelector('.hints');if(hs)setTimeout(()=>hs.style.opacity=0,6000)},
 ()=>{W.drv.target=0});
function discover(t,s){const el=$('#toast');if(!el)return;$('#toastT').textContent=t;$('#toastS').textContent=s;el.classList.add('on');setTimeout(()=>el.classList.remove('on'),3800)}
W.onFrame((dt,t)=>{if(cur!=='drive')return;const strip=document.querySelector('#drive .strip');
 if(strip){const deg=((-W.yaw*180/Math.PI)+90+3600)%360,cx=strip.parentElement.clientWidth/2,off=-(72+deg/5)*14+cx;strip.style.transform=`translateX(${off}px)`;
  const h=W.hero;if(h){const p=h.root.position;for(const poi of W.POI){const b=(Math.atan2(poi.x-p.x,-(poi.z-p.z))*180/Math.PI+360)%360;strip.querySelectorAll(`[data-poi="${poi.id}"]`).forEach(n=>n.style.left=((+n.dataset.r*72+b/5)*14)+'px')}}}
 const sp=$('#spd');if(sp)sp.textContent=Math.round(W.speed*(S.set.units==='kmh'?3.6:2.237));
 const ic=$('#icL');if(ic)ic.classList.toggle('on',(W.hero&&W.hero.level>.5));
 const ng=Math.max(1,Math.min(4,Math.ceil(W.speed/3.2)));if(ng!==gear){gear=ng;document.querySelectorAll('#gears i').forEach((n,i)=>n.style.opacity=i<gear?1:.35)}
 const pr=$('#prompt');if(pr&&S.set.prompts&&W.hero){const p=W.hero.root.position;pr.classList.toggle('on',Math.hypot(p.x+2,p.z+2)<38&&Math.hypot(p.x+2,p.z+2)>30&&Math.cos(t*.2)>0)}
 const mm=$('#mm');if(mm&&W.hero)drawMap(mm,{zoom:4,center:W.hero.root.position,rot:W.yaw})});

/* =============== PAUSE =============== */
def('pause',()=>`<ul class="menu" role="menu" aria-label="Paused"><li style="margin-bottom:10px"><span class="label" style="color:#fff">Paused · ${W.timeLabel}</span></li>
 <li><button role="menuitem" data-first data-act="resume">resume</button></li><li><button role="menuitem" data-act="map">map</button></li><li><button role="menuitem" data-act="journal">journal</button></li>
 <li><button role="menuitem" data-act="photo">photo mode</button></li><li><button role="menuitem" data-act="garage">garage<small>at camp or outposts</small></button></li><li><button role="menuitem" data-act="settings">settings</button></li><li><button role="menuitem" data-act="to-title">back to title</button></li></ul>
 <div class="pause-side glass"><span class="label">This trip</span><h3 style="font-size:24px;margin:4px 0 12px">Golden Meadow · day 3</h3><div class="stats3"><div><b>${S.found.length}</b>found</div><div><b>42</b>km</div><div><b>3</b>camps</div></div>
  <div style="margin-top:14px"><span class="label">Region explored</span><div class="prog"><i style="width:38%"></i></div></div><p class="muted" style="font-size:13px;margin:12px 0 0">Saved at Ember Camp, 4 minutes ago.</p></div>
 ${hints([['Esc','Resume'],['Enter','Select']])}`,()=>{W.drv.target=0;W.setRig('pause')},()=>{});

/* =============== MAP =============== */
let waypoint=null;
function drawMap(cv,o){const g=cv.getContext('2d'),w=cv.width,h=cv.height,z=o.zoom,c=o.center||{x:0,z:0},dark=root.dataset.theme==='dark';g.save();g.fillStyle=dark?'#1d1c2c':'#efe3c8';g.fillRect(0,0,w,h);
 g.translate(w/2,h/2);if(o.rot!==undefined)g.rotate(-o.rot-Math.PI/2);const step=o.step||6;
 for(let y=-h;y<h;y+=step)for(let x=-w;x<w;x+=step){const wx=c.x+x/z,wz=c.z+y/z,e=W.H(wx,wz),lv=Math.floor((e+8)/2.2);const fog=o.fog&&Math.hypot(wx+4,wz+4)>(110+K.noise3(wx*.03,0,wz*.03)*40);
  g.fillStyle=fog?(dark?'#26253a':'#e0d3b6'):`hsl(${dark?240:34+lv*4},${dark?18:44}%,${dark?14+lv*3:62+lv*4.5}%)`;g.fillRect(x,y,step+.5,step+.5)}
 g.strokeStyle=dark?'rgba(255,220,170,.55)':'#a8724a';g.lineWidth=Math.max(2,z*.9);g.setLineDash([z*2,z*1.4]);g.beginPath();g.arc(-c.x*z,-c.z*z,W.ROAD*z,0,Math.PI*2);g.stroke();g.setLineDash([]);
 for(const p of W.POI){const x=(p.x-c.x)*z,y=(p.z-c.z)*z;g.fillStyle=p.c;g.beginPath();g.arc(x,y,o.big?9:5,0,Math.PI*2);g.fill();g.strokeStyle='#fff';g.lineWidth=2.5;g.stroke();
  if(o.big){g.font='700 13px Nunito';g.fillStyle=dark?'#f3eefb':'#2a2233';g.fillText(p.name,x+13,y+4)}}
 if(waypoint&&o.big){const x=(waypoint.x-c.x)*z,y=(waypoint.z-c.z)*z;g.fillStyle='#e2672e';g.beginPath();g.moveTo(x,y);g.arc(x,y-14,8,Math.PI*.8,Math.PI*2.2);g.fill()}
 if(o.big&&W.hero){const p=W.hero.root.position;g.save();g.translate((p.x-c.x)*z,(p.z-c.z)*z);g.rotate(-W.hero.root.rotation.y+Math.PI/2);g.fillStyle='#e2672e';g.beginPath();g.moveTo(0,-12);g.lineTo(8,9);g.lineTo(0,5);g.lineTo(-8,9);g.fill();g.restore()}
 g.restore()}
const LAB=[['Golden Meadow',0,0],['Pinecrest',-40,-70],['Bluewater Coast',70,55],['Ember Woods',-80,30],['Copper Canyon',90,-60],['Whitecap Pass',-20,-120]];
def('map',()=>`${backBtn('Close map')}<canvas id="bigmap" aria-label="World map. Click to set a waypoint."></canvas>
 <div class="legend glass"><span class="label">Golden Meadow</span><h3 style="font-size:24px;margin:2px 0 6px">38% explored</h3><div class="prog"><i style="width:38%"></i></div>
 <ul>${W.POI.map(p=>`<li><i style="background:${p.c}"></i>${p.name}</li>`).join('')}<li><i style="background:var(--ember);border-radius:3px"></i>Your truck</li></ul>
 <p class="muted" style="font-size:13px;margin:12px 0 0">Click anywhere to drop a waypoint. It appears on your compass.</p>${waypoint?'<button class="btn" data-act="clear-wp" style="margin-top:10px">Clear waypoint</button>':''}</div>${hints([['Click','Waypoint'],['Esc','Close']])}`,
 el=>{const cv=el.querySelector('#bigmap'),d=Math.min(devicePixelRatio,2);const draw=()=>{cv.width=innerWidth*d;cv.height=innerHeight*d;drawMap(cv,{zoom:2.6*d,center:{x:-5,z:-10},big:true,fog:true,step:Math.round(5*d)});const g=cv.getContext('2d');g.font=`600 ${20*d}px Fredoka`;g.fillStyle=root.dataset.theme==='dark'?'rgba(243,238,251,.6)':'rgba(42,34,51,.55)';LAB.forEach(([n,x,z])=>g.fillText(n.toUpperCase(),cv.width/2+(x+5)*2.6*d-60*d,cv.height/2+(z+10)*2.6*d))};draw();el._r=draw;addEventListener('resize',draw);
  cv.onclick=e=>{const r=cv.getBoundingClientRect();waypoint={x:-5+(e.clientX-r.left-r.width/2)/2.6,z:-10+(e.clientY-r.top-r.height/2)/2.6};go('map',{replace:true,noPush:true})}},
 ()=>removeEventListener('resize',screens.map.el._r));

/* =============== JOURNAL =============== */
const CARDS=[['camp','Ember Camp','First night under the stars','linear-gradient(#1b2a52,#6d4c8c 60%,#e2672e 61%,#3a2a3a)'],['garage','Outpost Garage','Where every part lives','linear-gradient(#bcd7ee,#3d7fc4 62%,#d8d2c4 63%)'],['ember-trail','Ember Trail','Red maples in a row','linear-gradient(#f4a68c,#e8622f 55%,#8a3e24 56%)'],['first-light','First Light','Dawn over the meadow','linear-gradient(#6e6aa6,#f4a68c 60%,#f2c35c 61%)'],['fire-maple','Fire Maple','Glows under headlights','linear-gradient(#081530,#d8442e 58%,#120f1a 59%)'],['lake-view','Lake View','Still water, pink sky','linear-gradient(#ff8c78,#3fc1c9 60%,#1d6f86 61%)'],['deer','Old Buck','Grazes near the ring road','linear-gradient(#ffdcaa,#a8693e 60%,#9c7a3c 61%)'],
 ['tower','Pinecrest Lookout','','#ccc'],['light','Bluewater Light','',''],['ferry','The Last Ferry','',''],['waterfall','Waterfall Climb','',''],['aurora','Green Sky','',''],['mesa','Copper Mesa','',''],['bear','Black Bear','',''],['scrapjaw',"Scrapjaw's Yard",'',''],['summit','Whitecap Summit','','']];
def('journal',()=>`${backBtn()}<div class="sheet glass" style="grid-template-columns:1fr"><div class="body"><h3 style="font-size:30px">Journal</h3><p class="lead">${S.found.length} of ${CARDS.length} postcards. Each one is a place, a sky or an animal you stopped for.</p>
 <div class="postcards">${CARDS.map(([id,n,s,g],i)=>{const got=S.found.includes(id);return`<div class="postcard ${got?'':'unknown'}" style="--r:${(i%5-2)*.8}deg"><div class="pic" style="background:${g}"></div><b>${got?n:'???'}</b><span>${got?s:'Keep exploring'}</span></div>`}).join('')}</div></div></div>`,()=>W.setRig('pause'));

/* =============== PHOTO =============== */
const ph={fov:38,filter:'none',hideCar:false,lights:false,frame:true};
def('photo',()=>`${ph.frame?'<div aria-hidden="true" style="position:absolute;inset:6vh 8vw;border-radius:44px;box-shadow:0 0 0 100vmax rgba(10,8,16,.55);pointer-events:none"><div style="position:absolute;left:50%;top:50%;width:70px;height:70px;margin:-35px;border:3px solid rgba(255,255,255,.85);border-radius:16px;clip-path:polygon(0 0,30% 0,30% 100%,70% 100%,70% 0,100% 0,100% 30%,0 30%,0 70%,100% 70%,100% 100%,0 100%)"></div></div>':''}
 <div class="ppanel glass"><span class="label">Photo mode</span><h3 style="font-size:22px;margin:2px 0 8px">Frame it</h3>
 <div class="row"><div class="t"><b>Zoom</b></div><input type="range" id="pfov" min="14" max="70" step="1" value="${ph.fov}" style="--p:${(ph.fov-14)/56*100}%" aria-label="Zoom"></div>
 <div class="row"><div class="t"><b>Time</b></div><div class="seg" data-ph="time">${['dawn','golden','dusk','night'].map(t=>`<button data-v="${t}" aria-pressed="${S.set.time===t}">${t}</button>`).join('')}</div></div>
 <div class="row"><div class="t"><b>Filter</b></div><div class="seg" data-ph="filter">${['none','warm','film','mono'].map(t=>`<button data-v="${t}" aria-pressed="${ph.filter===t}">${t}</button>`).join('')}</div></div>
 <div class="row"><div class="t"><b>Headlights</b></div><input class="tog" type="checkbox" id="plights" ${ph.lights?'checked':''}></div>
 <div class="row"><div class="t"><b>Viewfinder</b></div><input class="tog" type="checkbox" id="pframe" ${ph.frame?'checked':''}></div>
 <button class="btn primary" data-act="snap" style="width:100%;margin-top:12px" data-first>Take photo</button><button class="btn" data-act="back" style="width:100%;margin-top:8px">Back</button></div>
 ${hints([['Space','Take photo'],['Scroll','Zoom'],['Esc','Back']])}`,
 ()=>{W.heroCam('iso');W.st.photoFovOverride=ph.fov;W.forceLights=ph.lights?1:null;$('#grade').className=ph.filter==='none'?'':'photo-'+ph.filter},
 ()=>{W.st.photoFovOverride=null;W.forceLights=null;$('#grade').className=''});

/* =============== KIT GALLERY =============== */
def('kit',()=>`${backBtn()}<div class="sheet glass" style="grid-template-columns:1fr"><div class="body">
 <h3 class="kit-sec" style="font-size:32px">UI kit</h3><p class="lead">Every token and component used by the screens. Build new screens from these only.</p>
 <h3 class="kit-sec">Colour</h3><div class="swatchrow">${[['--ember','Ember','Primary action, selection'],['--ember-2','Amber','Challenge banners'],['--moss','Moss','Positive, owned'],['--sky','Sky','Info, water POIs'],['--dusk','Dusk','Night accents'],['--paper','Paper','Card fill'],['--ink','Ink','Text'],['--good','Good','Stat gain'],['--bad','Bad','Stat loss']].map(([v,n,d])=>`<div class="tok"><i style="background:var(${v})"></i><b>${n}</b><span>${v} · ${d}</span></div>`).join('')}</div>
 <h3 class="kit-sec">Type</h3><div style="margin:8px 0 22px"><div style="font:700 64px/1 var(--display);letter-spacing:-.035em">trex hill</div><div class="muted">Wordmark · Fredoka 700 · lowercase, tight</div><div style="font:600 34px var(--display);margin-top:12px">menu item</div><div class="muted">Menu · Fredoka 600 · 26–38px</div><h3 style="margin-top:10px">Panel heading</h3><div class="muted">Fredoka 600 · 22–30px</div><p>Body copy is Nunito 15px. Sentence case everywhere except the wordmark and menu (lowercase) and challenge banners (uppercase).</p><span class="label">Overline label</span></div>
 <h3 class="kit-sec">Buttons</h3><div class="demo"><button class="btn primary">Primary</button><button class="btn">Secondary</button><button class="btn ghost">Ghost</button><button class="btn primary" disabled>Disabled</button><button class="icon-btn" aria-label="Photo">${ico.cam}</button></div>
 <h3 class="kit-sec">Inputs</h3><div class="demo"><div class="seg"><button aria-pressed="true">dawn</button><button>golden</button><button>night</button></div><input class="tog" type="checkbox" checked aria-label="Toggle on"><input class="tog" type="checkbox" aria-label="Toggle off"><input type="range" value="60" style="--p:60%" aria-label="Slider"><kbd class="k" style="min-width:64px">W</kbd></div>
 <h3 class="kit-sec">Cards</h3><div class="cards" style="max-width:700px"><button class="card" aria-pressed="true"><div class="art" style="background:${REGIONS[0].g}"></div><div class="meta"><b>Selected card</b><span>Ember border</span></div></button><button class="card"><div class="art" style="background:${REGIONS[1].g}"></div><span class="badge">Badge</span><div class="meta"><b>Card</b><span>Hover lifts 3px</span></div></button><button class="card"><div class="art" style="background:${REGIONS[4].g}"></div><div class="meta"><b>Locked card</b><span></span></div><div class="lock">🔒 Unlock condition</div></button></div>
 <h3 class="kit-sec">Garage parts and stats</h3><div class="demo" style="align-items:flex-start"><div class="parts-grid" style="width:320px"><button class="part" aria-pressed="true"><b>mud</b><span>Bites in mud and rock</span></button><button class="part"><b>road</b><span>Quiet on tarmac</span></button><button class="part locked"><b>chains</b><span>Visit Whitecap Pass</span></button></div><div style="width:260px">${statBars({Grip:.85,Comfort:.5,Power:.45},{Grip:.6,Comfort:.65,Power:.45})}</div></div>
 <h3 class="kit-sec">HUD pieces</h3><div class="demo" style="background:linear-gradient(#f3b27a,#c9773d);border-radius:20px;padding:20px;position:relative;min-height:150px">
  <div class="glass" style="width:62px;height:62px;border-radius:50%;display:grid;place-items:center;padding:12px">${ico.truck}</div><div class="glass" style="width:62px;height:62px;border-radius:50%;display:grid;place-items:center;padding:12px">${ico.trailer}</div>
  <div style="display:flex;gap:5px">${[1,2,3,4].map(g=>`<i style="width:9px;height:9px;border-radius:50%;background:#fff;opacity:${g<=2?1:.35}"></i>`).join('')}</div><span class="k">H</span><span class="k" style="opacity:.4">L</span>
  <div class="glass chipline"><span class="k">E</span>Make camp</div>
  <div style="text-align:center"><span style="font:800 12px var(--body);letter-spacing:.2em;color:#ffd24a">CHALLENGE TRAIL</span><div style="font:700 30px var(--display);color:#ffd24a;text-transform:uppercase;text-shadow:0 2px 10px rgba(60,20,0,.4)">Waterfall Climb</div></div></div>
 <h3 class="kit-sec">Toast and postcard</h3><div class="demo"><div class="glass" style="display:flex;align-items:center;gap:14px;padding:12px 18px 12px 12px"><div class="stamp" style="width:56px;height:56px;border-radius:12px;display:grid;place-items:center;background:var(--ember);color:#fff;transform:rotate(-4deg)">${ico.pin}</div><div><span class="label">Discovered</span><b style="display:block;font:600 20px var(--display)">Pinecrest Lookout</b></div></div><div class="postcard" style="width:170px;--r:-1deg"><div class="pic" style="background:${CARDS[0][3]}"></div><b>Ember Camp</b><span>First night</span></div><div class="postcard unknown" style="width:170px;--r:1.5deg"><div class="pic"></div><b>???</b><span>Keep exploring</span></div></div>
 <h3 class="kit-sec">Motion</h3><p class="lead">One curve for everything: <code>cubic-bezier(.22,.61,.36,1)</code>, 420 ms for screens, 200–350 ms for controls. Camera moves use exponential smoothing <code>1 − e^(−dt·k)</code>, k 0.6–3. Nothing overshoots.</p></div></div>`,()=>W.setRig('menu'));

/* ---------------- events ---------------- */
function startTrip(region){const r=REGIONS.find(x=>x.id===region)||REGIONS[0];if(r.season!==S.set.season){S.set.season=r.season;applySettings()}stack.length=0;go('loading',{to:'drive',region:r.name,replace:true})}
ui.addEventListener('click',e=>{const b=e.target.closest('button,[data-bind]');if(!b)return;const d=b.dataset,a=d.act;uiTick();
 if(a==='back')return back();
 if(a==='continue'){const s=S.saves[S.slot];return startTrip(REGIONS.find(r=>r.name===s?.region)?.id||'meadow')}
 if(a==='play'||a==='freeroam'||a==='settings'||a==='kit'||a==='journal'||a==='map')return go(a);
 if(a==='garage')return go('garage');
 if(a==='photo')return go('photo');
 if(a==='resume'){stack.length=0;return go('drive',{replace:true,noPush:true})}
 if(a==='to-title'){stack.length=0;return go('title',{noPush:true})}
 if(a==='start-roam'){S.set.time=fr.time;S.set.weather=fr.weather;S.set.cozy=$('#frc').checked;applySettings();save();return startTrip(fr.region)}
 if(a==='clear-wp'){waypoint=null;return go('map',{replace:true,noPush:true})}
 if(a==='keys-reset'){S.set.keys={...DEF.set.keys};save();return($('#sbody').innerHTML=stabHTML())}
 if(a==='snap'){const url=W.snap(),f=$('#flash');f.style.transition='none';f.style.opacity=.9;requestAnimationFrame(()=>{f.style.transition='opacity .6s';f.style.opacity=0});const l=document.createElement('a');l.href=url;l.download='trex-hill-photo.jpg';l.click();return}
 if(a==='g-apply'){S.garage.loadouts[gveh]={...gdraft};S.garage.vehicle=gveh;save();return garageRefresh(true)}
 if(a==='g-revert'){gdraft=loadout(gveh);return garageRefresh(true)}
 if(a==='g-drive'){S.garage.loadouts[gveh]={...gdraft};S.garage.vehicle=gveh;save();return startTrip('meadow')}
 if(d.slot!==undefined){S.slot=+d.slot;save();return go('play',{replace:true,noPush:true})}
 if(d.new!==undefined){S.saves[+d.new]={region:'Golden Meadow',day:1,hours:0,veh:S.garage.vehicle,found:0,last:'Just now'};S.slot=+d.new;save();return startTrip('meadow')}
 if(d.region){const r=REGIONS.find(x=>x.id===d.region);if(r.lock)return;fr.region=d.region;W.setSeason(r.season);return go('freeroam',{replace:true,noPush:true})}
 const seg=b.parentElement&&b.parentElement.dataset;
 if(seg&&seg.fr){fr[seg.fr]=d.v;if(seg.fr==='time')W.setTime(d.v);if(seg.fr==='weather')W.setWeather(d.v);b.parentElement.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));return}
 if(seg&&seg.ph){if(seg.ph==='time'){S.set.time=d.v;W.setTime(d.v)}else{ph.filter=d.v;$('#grade').className=d.v==='none'?'':'photo-'+d.v}b.parentElement.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));return}
 if(seg&&seg.s){S.set[seg.s]=d.v;applySettings();save();b.parentElement.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));return}
 if(d.tab!==undefined){stab=+d.tab;document.querySelectorAll('#settings .tab').forEach(x=>x.setAttribute('aria-selected',x===b));$('#sbody').innerHTML=stabHTML();$('#sbody').scrollTop=0;return}
 if(d.q){Object.assign(S.set,QUAL[d.q],{quality:d.q});applySettings();save();return($('#sbody').innerHTML=stabHTML())}
 if(d.bind){listenBind(b);return}
 if(d.cat!==undefined){gcat=+d.cat;garageRefresh(false);W.heroCam(GCATS[gcat][3]);return}
 if(d.veh){if(!S.garage.owned.includes(d.veh)){gveh=d.veh;gdraft=loadout(gveh);garageRefresh(true);W.heroCam(GCATS[gcat][3]);return}gveh=d.veh;gdraft=loadout(gveh);garageRefresh(true);W.heroCam(GCATS[gcat][3]);return}
 if(d.k&&cur==='garage'){if(LOCKED[d.k+':'+d.v]){b.animate([{transform:'translateX(0)'},{transform:'translateX(-4px)'},{transform:'translateX(4px)'},{transform:'translateX(0)'}],{duration:260});return}gdraft[d.k]=d.v;garageRefresh(true);return}});
ui.addEventListener('input',e=>{const i=e.target;if(i.type!=='range')return;i.style.setProperty('--p',(i.value-i.min)/(i.max-i.min)*100+'%');
 if(i.dataset.s){S.set[i.dataset.s]=+i.value;const f=document.querySelector(`[data-fmt="${i.dataset.s}"]`);if(f)f.textContent=(FMT[i.dataset.s]||(v=>Math.round(v*100)+'%'))(+i.value);if(['scale','grass','fov'].includes(i.dataset.s))S.set.quality='custom';applySettings();save()}
 if(i.dataset.k&&cur==='garage'){gdraft[i.dataset.k]=+i.value;const v=i.nextElementSibling;if(v)v.textContent=i.step<1?(+i.value).toFixed(2):i.value;W.setHero(gveh,gdraft);W.poseHero('garage');$('#gstats').innerHTML=statBars(stats(gdraft),stats(loadout(gveh)))}
 if(i.id==='pfov'){ph.fov=+i.value;W.st.photoFovOverride=ph.fov}});
ui.addEventListener('change',e=>{const i=e.target;if(!i.classList.contains('tog'))return;
 if(i.dataset.s){S.set[i.dataset.s]=i.checked;applySettings();save()}
 if(i.dataset.k&&cur==='garage'){gdraft[i.dataset.k]=i.checked;garageRefresh(true)}
 if(i.id==='gnight'){gnight=i.checked;W.forceLights=gnight?1:null;W.setTime(gnight?'night':S.set.time)}
 if(i.id==='plights'){ph.lights=i.checked;W.forceLights=ph.lights?1:null}
 if(i.id==='pframe'){ph.frame=i.checked;go('photo',{replace:true,noPush:true})}});
ui.addEventListener('wheel',e=>{if(cur==='photo'){ph.fov=Math.max(14,Math.min(70,ph.fov+Math.sign(e.deltaY)*2));W.st.photoFovOverride=ph.fov;const r=$('#pfov');if(r){r.value=ph.fov;r.style.setProperty('--p',(ph.fov-14)/56*100+'%')}}},{passive:true});
/* garage camera drag */
let drag=null;addEventListener('pointerdown',e=>{if(cur==='garage'&&e.target.id==='view')drag={x:e.clientX,a:0}});addEventListener('pointerup',()=>drag=null);
addEventListener('pointermove',e=>{if(!drag||!W.hero)return;const dx=(e.clientX-drag.x)*.008;drag.x=e.clientX;W.hero.root.rotation.y+=dx});
/* key rebinding */
let binding=null;function listenBind(el){if(binding)binding.classList.remove('listen');binding=el;el.classList.add('listen');el.textContent='Press a key'}
addEventListener('keydown',e=>{
 if(binding){e.preventDefault();if(e.code!=='Escape'){S.set.keys[binding.dataset.bind]=e.code;save()}binding.classList.remove('listen');binding.textContent=keyName(S.set.keys[binding.dataset.bind]);binding=null;return}
 const k=S.set.keys;
 if(e.code==='Escape'){e.preventDefault();if(cur==='drive')return go('pause');if(cur==='pause'){stack.length=0;return go('drive',{replace:true,noPush:true})}if(cur!=='title'&&cur!=='loading')return back();return}
 if(cur==='drive'){if(e.code===k.map)return go('map');if(e.code===k.photo)return go('photo');if(e.code===k.lights){W.forceLights=W.forceLights===1?0:1;return}if(e.code===k.range){range=range==='H'?'L':'H';$('#rngH').style.opacity=range==='H'?1:.4;$('#rngL').style.opacity=range==='L'?1:.4;return}
  if(e.code===k.up)W.drv.target=Math.min(16,W.drv.target+3);if(e.code===k.down)W.drv.target=Math.max(0,W.drv.target-3);if(e.code==='KeyJ')return go('journal')}
 if(cur==='photo'&&e.code==='Space'){e.preventDefault();document.querySelector('[data-act="snap"]').click();return}
 if(cur==='map'&&e.code===k.map)return back();
 if(['ArrowDown','ArrowUp'].includes(e.code)&&(cur==='title'||cur==='pause')){e.preventDefault();const items=[...screens[cur].el.querySelectorAll('.menu button')];let i=items.indexOf(document.activeElement);i=(i+(e.code==='ArrowDown'?1:-1)+items.length)%items.length;items[i].focus();uiTick()}});
/* tiny UI tick (WebAudio, starts on first gesture) */
let ac=null;function uiTick(){try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();const o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime;o.frequency.setValueAtTime(1800,t);o.frequency.exponentialRampToValueAtTime(900,t+.03);g.gain.setValueAtTime(.04*S.set.uiv*S.set.master,t);g.gain.exponentialRampToValueAtTime(.0001,t+.05);o.connect(g).connect(ac.destination);o.start(t);o.stop(t+.06)}catch(e){}}

/* ---------------- boot ---------------- */
applySettings();W.setHero(S.garage.vehicle,loadout(S.garage.vehicle));W.start();go('loading',{to:'title',region:'Golden Meadow'});
})();
