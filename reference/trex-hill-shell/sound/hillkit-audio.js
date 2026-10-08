/* ============================================================================
   HILL KIT — SOUND KIT  (hillkit-audio.js)
   Physically-modelled, sample-free audio for the cozy driving game.
   - Pure JS DSP core (HillDSP) renders every sound sample-by-sample. It has no
     WebAudio dependency, so the same code runs in a ScriptProcessor (here),
     an AudioWorklet (production) or offline in Node (tests, WAV previews).
   - Engines: per-cylinder combustion pulses on the real firing order ->
     exhaust waveguides (one per bank) -> muffler/resonance filters.
     Inline-6, cross-plane V8 (two banks = burble), turbo diesel (clatter,
     turbo whistle, blow-off), electric (inverter + gear whine).
   - Tyres: granular surface model (asphalt, gravel, dirt, grass, snow, mud),
     skid squeal, suspension thuds/clunks.
   - World: wind (gusts, whistle, leaves), rain (wash + droplets, roof mode),
     fire (roar, hiss, crackle clusters, sap pops), water lapping, crickets,
     6 bird species, owl, thunder with distance delay, foghorn, ferry horn.
   - UI/foley: tick, confirm, wrench ratchet, spray, door, horn, splash.
   API: see bottom (HillAudio).
============================================================================ */
const HillAudio=(function(){
'use strict';
const TAU=Math.PI*2;let RNG=Math.random;const rnd=()=>RNG(),rr=(a,b)=>a+(b-a)*rnd(),wn=()=>rnd()*2-1,clamp=(x,a,b)=>x<a?a:x>b?b:x;

/* ---------- primitives ---------- */
class BQ{constructor(sr,t,f,q=.707,g=0){this.sr=sr;this.t=t;this.x1=this.x2=this.y1=this.y2=0;this.set(f,q,g)}
 set(f,q=this.q,g=this.g){this.f=f;this.q=q;this.g=g;const w=TAU*clamp(f,10,this.sr*.45)/this.sr,c=Math.cos(w),s=Math.sin(w),a=s/(2*q),A=Math.pow(10,g/40);let b0,b1,b2,a0,a1,a2;
  if(this.t==='lp'){b0=(1-c)/2;b1=1-c;b2=b0;a0=1+a;a1=-2*c;a2=1-a}else if(this.t==='hp'){b0=(1+c)/2;b1=-(1+c);b2=b0;a0=1+a;a1=-2*c;a2=1-a}
  else if(this.t==='bp'){b0=a;b1=0;b2=-a;a0=1+a;a1=-2*c;a2=1-a}else{b0=1+a*A;b1=-2*c;b2=1-a*A;a0=1+a/A;a1=-2*c;a2=1-a/A}
  this.b0=b0/a0;this.b1=b1/a0;this.b2=b2/a0;this.a1=a1/a0;this.a2=a2/a0}
 p(x){const y=this.b0*x+this.b1*this.x1+this.b2*this.x2-this.a1*this.y1-this.a2*this.y2;this.x2=this.x1;this.x1=x;this.y2=this.y1;this.y1=Math.abs(y)<1e-20?0:y;return this.y1}}
class Pink{constructor(){this.b=new Float64Array(7)}p(){const w=wn(),b=this.b;b[0]=.99886*b[0]+w*.0555179;b[1]=.99332*b[1]+w*.0750759;b[2]=.969*b[2]+w*.153852;b[3]=.8665*b[3]+w*.3104856;b[4]=.55*b[4]+w*.5329522;b[5]=-.7616*b[5]-w*.016898;const o=b[0]+b[1]+b[2]+b[3]+b[4]+b[5]+b[6]+w*.5362;b[6]=w*.115926;return o*.11}}
class Brown{constructor(){this.v=0}p(){this.v=(this.v+.02*wn())/1.02;return this.v*3.5}}
/* smooth random walk 0..1, updated at block rate */
class Walk{constructor(speed,lo=0,hi=1){this.v=rr(lo,hi);this.t=this.v;this.s=speed;this.lo=lo;this.hi=hi;this.c=0}step(dt){this.c-=dt;if(this.c<=0){this.t=rr(this.lo,this.hi);this.c=rr(.3,1.4)/this.s}this.v+=(this.t-this.v)*(1-Math.exp(-dt*this.s*2.5));return this.v}}
const pan2=(p)=>[Math.cos((p+1)*Math.PI/4),Math.sin((p+1)*Math.PI/4)];

/* ---------- engines ---------- */
const ENG={
 inline6:{name:'Inline-6',cyl:6,bank:[0,0,0,0,0,0],idle:760,red:6600,tau:.0017,pipe:[3.4],refl:-.56,lp:2300,res:[[105,1.4,6],[310,2.4,3],[1250,2,-4]],intake:.2,mech:.035,lope:.05,crackle:.18,gain:1,ratios:[3.6,2.15,1.42,1.0,.79],fd:3.9},
 v8:{name:'Big-block V8',acc:1.4,cyl:8,bank:[0,1,1,0,1,0,0,1],idle:680,red:6200,tau:.0025,pipe:[4.3,5.0],refl:-.62,lp:1650,res:[[72,1.3,8],[215,2,4],[900,2,-5]],intake:.24,mech:.03,lope:.2,crackle:.5,gain:1.05,ratios:[2.9,1.95,1.38,1.0,.75],fd:3.55},
 diesel:{name:'Turbo diesel',acc:1.15,cyl:4,bank:[0,0,0,0],idle:720,red:4300,tau:.0012,pipe:[2.9],refl:-.5,lp:1450,res:[[135,1.5,6],[480,3,3],[2900,2,3]],intake:.3,mech:.05,clatter:.6,turbo:1,lope:.03,crackle:0,gain:.95,ratios:[4.3,2.55,1.62,1.15,.86],fd:3.9},
 electric:{name:'Electric twin',electric:true,idle:0,red:13000,poles:4,teeth:23,gain:1,ratios:[9.2],fd:1}};
const EXH={stock:{lp:1,refl:1,cr:1,g:1},sport:{lp:1.35,refl:1.08,cr:1.8,g:1.12},straight:{lp:2.1,refl:1.14,cr:2.8,g:1.3}};
class Engine{
 constructor(sr){this.sr=sr;this.exh='stock';this.turboOn=null;this.vol=1;this.pan=0;this.setType('inline6')}
 setType(t){this.type=t;const p=this.p=ENG[t],sr=this.sr;this.state='off';this.rpm=0;this.tr=0;this.ext=0;this.thr=0;this.tt=0;this.ph=0;this.ign=false;this.P=[[],[]];this.clk=[];this.boost=0;this.bov=0;this.bovF=3000;this.prevT=0;this.st=0;
  this.pipes=(p.pipe||[3]).map(ms=>({buf:new Float32Array(Math.max(2,Math.round(ms*sr/1000))),i:0,lp:0}));this.ch={buf:new Float32Array(Math.round(1.3*sr/1000)),i:0};
  this.f={dc:new BQ(sr,'hp',28),res:(p.res||[]).map(r=>new BQ(sr,'pk',r[0],r[1],r[2])),mf:new BQ(sr,'lp',p.lp||2000,.8),mf2:new BQ(sr,'lp',(p.lp||2000)*1.6,.6),ib:new BQ(sr,'bp',800,1.2),mb:new BQ(sr,'bp',3500,1),
   ck:new BQ(sr,'hp',1800),ckp:new BQ(sr,'pk',3200,1.5,8),tw:new BQ(sr,'bp',3000,9),bv:new BQ(sr,'bp',2500,2),sw:new BQ(sr,'bp',900,3),side:new BQ(sr,'lp',900),hum:new BQ(sr,'lp',140),ehp:new BQ(sr,'hp',60)};
  this.pink=new Pink();this.brown=new Brown();this.twPh=0;this.sPh=0;this.e=[0,0,0,0]}
 start(){if(this.state==='run'||this.state==='crank')return;this.state=this.p.electric?'run':'crank';this.st=0;this.ign=!!this.p.electric;this.ready=this.p.electric?1:0}
 stop(){if(this.state==='off')return;this.state='stopping';this.ign=false}
 set(rpm,throttle){this.ext=rpm;this.tt=clamp(throttle,0,1)}
 load(){return this.thr}
 ctrl(dt){const p=this.p;this.st+=dt;
  if(this.state==='crank'){this.tr=210+40*Math.sin(this.st*9);if(this.st>.85+rnd()*.02){this.state='catch';this.st=0;this.ign=true}}
  else if(this.state==='catch'){this.tr=p.idle*1.9;if(this.st>.32){this.state='run'}}
  else if(this.state==='run'){this.tr=Math.max(p.idle,this.ext)}
  else if(this.state==='stopping'){this.tr=0;if(this.rpm<35){this.state='off';this.rpm=0;this.P=[[],[]];this.clk=[]}}
  this.thr+=(this.tt*(this.state==='run'?1:this.state==='catch'?.6:0)-this.thr)*(1-Math.exp(-dt*14));
  if(p.turbo||this.turboOn){const tgt=this.thr*clamp((this.rpm-p.idle)/(p.red*.55),0,1);this.boost+=(tgt-this.boost)*(1-Math.exp(-dt*(tgt>this.boost?1.6:3)));
   if(this.prevT>.55&&this.tt<.15&&this.boost>.35){this.bov=1;this.bovF=3400}this.bov*=Math.exp(-dt/.16);this.bovF*=Math.exp(-dt*1.6);this.f.bv.set(this.bovF,2);this.f.tw.set(1900+this.boost*6800,9)}
  this.prevT=this.tt;const E=EXH[this.exh];this.f.mf.set((p.lp||2000)*E.lp*(.62+.75*this.thr));this.f.mf2.set((p.lp||2000)*E.lp*1.7*(.7+.5*this.thr));this.f.ib.set(300+this.rpm*.22,1.2)}
 fire(slot){const p=this.p,b=p.bank[slot]||0;
  if(!this.ign){this.P[b].push({age:0,amp:.13,T:.0045*this.sr,n:.7});return}
  if(this.rpm>p.red*.985&&rnd()<.7)return;
  const low=clamp(1-(this.rpm-p.idle)/(p.idle*1.3),0,1),over=this.tt<.06&&this.rpm>p.idle*1.35&&this.state==='run';
  const amp=(.3+.7*this.thr)*(1+wn()*p.lope*(.35+low))*(over?.15:1),delay=Math.round(rnd()*p.lope*low*.005*this.sr),T=p.tau*this.sr*(1+(1-this.thr)*.35);
  this.P[b].push({age:-delay,amp,T,n:.32});
  if(p.clatter)this.clk.push({age:-delay,amp:p.clatter*(1.3-this.rpm/p.red)*(.7+.5*this.thr)});
  if(over&&p.crackle&&rnd()<p.crackle*EXH[this.exh].cr*.07)this.P[b].push({age:-Math.round(rr(.002,.014)*this.sr),amp:rr(1.4,3.2),T:.0007*this.sr,n:.95});
  if(this.state==='catch'&&rnd()<.25)this.P[b].push({age:-Math.round(rr(.001,.01)*this.sr),amp:rr(.8,1.6),T:.0009*this.sr,n:.9})}
 pv(q){if(q.age<0){q.age++;return 0}const a=q.age++,T=q.T;return q.amp*((Math.exp(-a/T)-Math.exp(-a/(T*.18)))*1.7+q.n*wn()*Math.exp(-a/(T*.7)))}
 render(L,R,n){if(this.state==='off')return;const p=this.p,sr=this.sr,E=EXH[this.exh],f=this.f;this.ctrl(n/sr);
  const kr=1-Math.exp(-1/(sr*(this.state==='stopping'?.45:this.state==='crank'?.08:.06)));const g=.32*this.vol*p.gain*E.g,[pl,pr]=pan2(this.pan);
  if(p.electric){this.renderEV(L,R,n,kr,g*1.6,pl,pr);return}
  const refl=p.refl*E.refl,cyl=p.cyl,banks=this.pipes.length,tb=p.turbo||this.turboOn;
  for(let i=0;i<n;i++){this.rpm+=(this.tr-this.rpm)*kr;const prev=this.ph;this.ph+=this.rpm/120/sr;if(this.ph>=1)this.ph-=1;const s0=Math.floor(prev*cyl),s1=Math.floor(this.ph*cyl);if(s0!==s1)this.fire(s1);
   const out=[0,0];for(let b=0;b<2;b++){const Q=this.P[b];let x=0;for(let k=Q.length-1;k>=0;k--){x+=this.pv(Q[k]);if(Q[k].age>Q[k].T*9)Q.splice(k,1)}
    if(b<banks){const pp=this.pipes[b],d=pp.buf[pp.i];pp.lp+=(d-pp.lp)*.45;const y=x+refl*pp.lp;pp.buf[pp.i]=y;pp.i=(pp.i+1)%pp.buf.length;out[b]=y}else out[0]+=x}
   let m=out[0]+out[1];const c=this.ch.buf[this.ch.i];m=m+.3*c;this.ch.buf[this.ch.i]=m;this.ch.i=(this.ch.i+1)%this.ch.buf.length;
   m=f.dc.p(m);for(const r of f.res)m=r.p(m);m=f.mf2.p(f.mf.p(m));
   const rr_=this.rpm/p.red;m+=f.ib.p(this.pink.p())*p.intake*(.15+.85*this.thr)*rr_*(.7+.3*Math.sin(this.ph*TAU*cyl))*3;m+=f.mb.p(wn())*p.mech*Math.pow(rr_,1.5)*2;
   if(this.clk.length){let cx=0;for(let k=this.clk.length-1;k>=0;k--){const q=this.clk[k];if(q.age<0){q.age++;continue}cx+=wn()*q.amp*Math.exp(-q.age/(.0006*sr));if(++q.age>.006*sr)this.clk.splice(k,1)}m+=f.ckp.p(f.ck.p(cx))*.9}
   if(tb){this.twPh+=(1900+this.boost*6800)/sr;m+=Math.sin(TAU*this.twPh)*.022*this.boost*this.boost+f.tw.p(wn())*.05*this.boost+f.bv.p(wn())*this.bov*.5}
   if(this.state==='crank'){this.sPh+=(780+this.rpm*.6)/sr;m+=(Math.sin(TAU*this.sPh)*.05+f.sw.p(wn())*.08)*(.7+.3*Math.sin(this.st*60))}
   const side=f.side.p(out[0]-out[1])*.35,v=Math.tanh(m*1.25)*g;L[i]+=(v+side*g)*pl*1.41;R[i]+=(v-side*g)*pr*1.41}}
 renderEV(L,R,n,kr,g,pl,pr){const p=this.p,sr=this.sr,f=this.f,e=this.e;
  for(let i=0;i<n;i++){this.rpm+=(Math.max(0,this.ext)-this.rpm)*kr;const r=this.rpm,ld=.25+.75*this.thr,fe=r/60*p.poles,fg=r/60*p.teeth;
   e[0]+=fe/sr;e[1]+=fg/sr;const pw=r<2800?520*(1+Math.floor(r/350)):0;e[2]+=pw/sr;e[0]%=1;e[1]%=1;e[2]%=1;
   let v=(.5*Math.sin(TAU*e[0])+.22*Math.sin(2*TAU*e[0])+.12*Math.sin(6*TAU*e[0]))*(.012+.05*ld)*Math.min(1,r/1200);
   v+=Math.sin(TAU*e[1])*.02*Math.min(1,r/3000)*(.4+.6*ld);if(pw)v+=Math.tanh(4*Math.sin(TAU*e[2]))*.012*this.thr*(1-r/2800);
   v+=f.hum.p(this.brown.p())*.05*(this.state==='run'?1:0)+f.ehp.p(wn())*.0015*ld;v*=g*2.4;L[i]+=v*pl*1.41;R[i]+=v*pr*1.41}}}

/* drivetrain helper: speed+throttle -> rpm with gears, launch slip, shift cuts */
class Drive{constructor(type='inline6'){this.setType(type)}
 setType(t){this.p=ENG[t];this.g=0;this.v=0;this.shift=0;this.rpm=this.p.idle}
 step(dt,thr,brake=0){const p=this.p,ratio=p.ratios[this.g]*p.fd,wr=.38,wheel=this.v/(TAU*wr)*60;let t=thr;if(this.shift>0){this.shift-=dt;t=0}
  let rpm=Math.max(p.idle,wheel*ratio);if(!p.electric&&this.v<4)rpm=Math.max(rpm,p.idle+t*2600*(1-this.v/4));
  const x=rpm/p.red,tc=p.electric?1-.55*x:Math.max(.15,Math.sin(Math.PI*clamp(x*.85+.12,0,1)));let a=t*tc*ratio*(p.electric?1.5:1.05)*(p.acc||1)-.0007*this.v*this.v-(this.v>.05?.3:0)-brake*9;
  if(rpm>=p.red&&t>0)a=Math.min(a,0);this.v=Math.max(0,this.v+a*dt);
  if(!p.electric){if(rpm>p.red*.93&&this.g<p.ratios.length-1&&this.shift<=0){this.g++;this.shift=.26}else if(rpm<p.red*.33&&this.g>0&&this.shift<=0){this.g--;this.shift=.2}}
  this.rpm=Math.min(rpm,p.red*1.01);return{rpm:this.rpm,throttle:t,speed:this.v,gear:this.g+1}}
 /* game hook: real speed from your physics -> rpm with auto gears + shift cuts */
 fromSpeed(v,thr,dt,wr=.42){const p=this.p;let t=thr;if(this.shift>0){this.shift-=dt;t=0}const ratio=p.ratios[this.g]*p.fd;let rpm=Math.max(p.idle,v/(TAU*wr)*60*ratio);
  if(!p.electric&&v<4)rpm=Math.max(rpm,p.idle+t*2600*(1-v/4));
  if(!p.electric){if(rpm>p.red*.9&&this.g<p.ratios.length-1&&this.shift<=0){this.g++;this.shift=.24}else if(rpm<p.red*.3&&this.g>0&&this.shift<=0){this.g--;this.shift=.18}}
  this.rpm=Math.min(rpm,p.red);return{rpm:this.rpm,throttle:t,gear:this.g+1}}}

/* ---------- tyres & suspension ---------- */
const SURF={asphalt:{rate:0,roll:[260,.16],hiss:.03},gravel:{rate:95,dur:5,bp:[1400,4800],q:1.3,amp:.55,roll:[320,.09]},dirt:{rate:38,dur:8,bp:[500,1700],q:1.1,amp:.5,roll:[250,.12]},
 grass:{rate:26,dur:22,bp:[2200,6000],q:.8,amp:.25,roll:[200,.05],hiss:.03},snow:{rate:48,dur:16,bp:[850,1500],q:6,amp:.5,roll:[200,.05]},mud:{rate:16,dur:38,bp:[140,480],q:2,amp:.8,roll:[170,.13]}};
class Tires{constructor(sr){this.sr=sr;this.speed=0;this.surface='dirt';this.slip=0;this.g=[];this.pool=[...Array(24)].map(()=>new BQ(sr,'bp',1000,1));this.pi=0;this.roll=new BQ(sr,'lp',260,.7);this.hiss=new BQ(sr,'hp',1500);this.sq=0;this.sqf=880;this.sqW=new Walk(3,-1,1);this.pink=new Pink();this.vol=1}
 set(speed,surface,slip=0){this.speed=Math.max(0,speed);if(surface&&SURF[surface])this.surface=surface;this.slip=clamp(slip,0,1)}
 render(L,R,n){const s=SURF[this.surface],sr=this.sr,sp=this.speed;if(sp<.05&&this.slip<.01&&!this.g.length)return;const lv=Math.pow(Math.min(1,sp/25),.8)*this.vol;this.roll.set(s.roll[0]+sp*6,.7);
  const rate=s.rate*sp*.35*(1+this.slip*2),pg=rate/sr;const sqF=880+this.sqW.step(n/sr)*70;
  for(let i=0;i<n;i++){if(s.rate&&rnd()<pg&&this.g.length<40){const b=this.pool[this.pi++%this.pool.length];b.set(rr(s.bp[0],s.bp[1]),s.q);this.g.push({a:0,d:s.dur*.001*sr*rr(.5,1.5),amp:s.amp*rr(.3,1),b,pan:rr(-.6,.6)})}
   let l=0,r=0;for(let k=this.g.length-1;k>=0;k--){const q=this.g[k],v=q.b.p(wn()*q.amp*Math.exp(-q.a/q.d))*2.2;l+=v*(1-q.pan)*.5;r+=v*(1+q.pan)*.5;if(++q.a>q.d*6)this.g.splice(k,1)}
   let m=this.roll.p(this.pink.p())*s.roll[1]*6*lv;if(s.hiss)m+=this.hiss.p(wn())*s.hiss*lv;
   if(this.slip>.02&&this.surface==='asphalt'){this.sq+=sqF/sr;m+=(Math.sin(TAU*this.sq)+.3*Math.sin(2*TAU*this.sq))*.09*this.slip*Math.min(1,sp/5)}
   L[i]+=(m+l*lv)*.5;R[i]+=(m+r*lv)*.5}}}

/* ---------- reverb (outdoor Schroeder) ---------- */
class Reverb{constructor(sr){const s=sr/44100,mk=d=>({b:new Float32Array(Math.round(d*s)),i:0,lp:0});this.cL=[1116,1188,1277,1356].map(mk);this.cR=[1139,1211,1300,1379].map(mk);this.aL=[556,441].map(mk);this.aR=[579,464].map(mk);this.fb=.74;this.damp=.32}
 comb(c,x){const o=c.b[c.i];c.lp=o*(1-this.damp)+c.lp*this.damp;c.b[c.i]=x+c.lp*this.fb;c.i=(c.i+1)%c.b.length;return o}
 ap(a,x){const o=a.b[a.i],y=-x+o;a.b[a.i]=x+o*.5;a.i=(a.i+1)%a.b.length;return y}
 run(SL,SR,L,R,n){for(let i=0;i<n;i++){const x=(SL[i]+SR[i])*.15;let l=0,r=0;for(const c of this.cL)l+=this.comb(c,x);for(const c of this.cR)r+=this.comb(c,x);for(const a of this.aL)l=this.ap(a,l);for(const a of this.aR)r=this.ap(a,r);L[i]+=l;R[i]+=r}}}

/* ---------- one-shot voices ---------- */
function voice(sr,dur,fn,o={}){const n=Math.round(dur*sr),[pl,pr]=pan2(o.pan||0);return{n,i:0,fn,pl,pr,gain:o.gain??1,send:o.send??.15,delay:Math.round((o.delay||0)*sr)}}
const env=(t,a,d)=>t<a?t/a:Math.exp(-(t-a)/d);
const SFX={
 tick:(sr)=>{const b=new BQ(sr,'bp',2600,3);return voice(sr,.03,t=>b.p(wn())*env(t,.0004,.004)*.9,{send:.02})},
 confirm:(sr)=>{let p=0;return voice(sr,.5,t=>{const f=t<.09?660:990;p+=f/sr;return (Math.sin(TAU*p)+.25*Math.sin(2*TAU*p))*env(t<.09?t:t-.09,.004,t<.09?.05:.14)*.22},{send:.25})},
 error:(sr)=>{let p=0;return voice(sr,.35,t=>{p+=(180-t*120)/sr;return Math.sin(TAU*p)*env(t,.005,.08)*.35},{send:.1})},
 ratchet:(sr)=>{const b=new BQ(sr,'bp',3800,4);return voice(sr,.55,t=>{const k=(t*26)%1;return b.p(wn())*Math.exp(-k*90)*(t<.5?1:0)*.9},{send:.08})},
 spray:(sr)=>{const b=new BQ(sr,'hp',3500);return voice(sr,.9,t=>b.p(wn())*(t<.05?t/.05:Math.max(0,1-(t-.6)/.3))*.25,{send:.05})},
 door:(sr)=>{const l=new BQ(sr,'lp',220),b=new BQ(sr,'bp',2800,3);let p=0;return voice(sr,.45,t=>{p+=(70-t*40)/sr;return Math.sin(TAU*p)*env(t,.003,.07)*.8+l.p(wn())*env(t,.001,.04)*1.2+(t>.06&&t<.08?b.p(wn())*.5:0)},{send:.2})},
 horn:(sr,o={})=>{const d=o.dur||.6,b1=new BQ(sr,'bp',1100,2),b2=new BQ(sr,'bp',2300,3);let p1=0,p2=0;return voice(sr,d,t=>{p1+=410/sr;p2+=495/sr;const s=Math.sign(Math.sin(TAU*p1))+Math.sign(Math.sin(TAU*p2));const e=Math.min(1,t/.02)*Math.min(1,(d-t)/.04);return (b1.p(s)*1.2+b2.p(s)*.6)*e*.4},{send:.3})},
 thud:(sr,o={})=>{const k=o.k??1,l=new BQ(sr,'lp',300);let p=0;return voice(sr,.35,t=>{p+=(55-t*30)/sr;return (Math.sin(TAU*p)*env(t,.002,.06)+l.p(wn())*env(t,.001,.03))*.7*k},{send:.05})},
 clunk:(sr,o={})=>{const k=o.k??1,l=new BQ(sr,'lp',350),b=new BQ(sr,'bp',3200,5);let p=0;return voice(sr,.5,t=>{p+=(48-t*25)/sr;const r=t>.02&&t<.25?b.p(wn())*Math.exp(-((t*35)%1)*20)*.25:0;return (Math.sin(TAU*p)*env(t,.002,.08)*.9+l.p(wn())*env(t,.001,.04)+r)*k*.75},{send:.06})},
 splash:(sr,o={})=>{const k=o.k??1,b=new BQ(sr,'bp',1600,.8),l=new BQ(sr,'lp',260);return voice(sr,1.1,t=>(b.p(wn())*env(t,.01,.22)*.8+l.p(wn())*env(t,.005,.08))*k,{send:.3})},
 foghorn:(sr)=>{const l=new BQ(sr,'lp',700),b=new BQ(sr,'pk',350,2,8);let p=0;return voice(sr,3.2,t=>{const f=t<2.6?88:88-(t-2.6)*45;p+=f/sr;const s=(p%1)*2-1;return b.p(l.p(s))*Math.min(1,t/.35)*Math.min(1,(3.2-t)/.5)*.38},{send:.7})},
 ferryhorn:(sr)=>{const l=new BQ(sr,'lp',900);let p1=0,p2=0;return voice(sr,2.2,t=>{p1+=110/sr;p2+=138/sr;return l.p(((p1%1)*2-1)+((p2%1)*2-1))*Math.min(1,t/.15)*Math.min(1,(2.2-t)/.3)*.25},{send:.6})},
 evready:(sr)=>{let p=0;return voice(sr,.75,t=>{const k=t<.12?0:t<.24?1:2,f=[523,784,1046][k],s=t-k*.12;p+=f/sr;return Math.sin(TAU*p)*env(s,.006,k<2?.06:.22)*.12},{send:.3})},
 /* wildlife */
 warbler:(sr,o)=>{const n=Math.floor(rr(5,11)),f0=rr(3200,4800),seq=[];let tt=0;for(let i=0;i<n;i++){const d=rr(.04,.075);seq.push([tt,d,f0*rr(.85,1.15),rr(.7,1.4)]);tt+=d+rr(.015,.04)}let p=0;
  return voice(sr,tt+.1,t=>{for(const[s,d,f,sw]of seq)if(t>=s&&t<s+d){const u=(t-s)/d;p+=f*Math.pow(sw,u)/sr;return Math.sin(TAU*p)*Math.pow(Math.sin(Math.PI*u),2)*.16}return 0},o)},
 thrush:(sr,o)=>{const notes=[...Array(Math.floor(rr(3,5)))].map(()=>[rr(1900,3300),rr(.12,.28)]);let tt=0;const seq=notes.map(([f,d])=>{const s=[tt,d,f];tt+=d+rr(.05,.12);return s});let p=0;
  return voice(sr,tt+.1,t=>{for(const[s,d,f]of seq)if(t>=s&&t<s+d){const u=(t-s)/d;p+=f*(1+.025*Math.sin(TAU*7*t))/sr;return (Math.sin(TAU*p)+.12*Math.sin(2*TAU*p))*Math.sin(Math.PI*u)*.14}return 0},o)},
 trill:(sr,o)=>{const f=rr(3600,5200),d=rr(.6,1.1);let p=0;return voice(sr,d,t=>{p+=f*(1-t*.08)/sr;const am=Math.max(0,Math.sin(TAU*24*t));return Math.sin(TAU*p)*am*am*Math.sin(Math.PI*t/d)*.12},o)},
 dove:(sr,o)=>{const seq=[[0,.25,520],[.38,.5,580],[1.0,.3,500],[1.4,.3,490]];let p=0;return voice(sr,1.8,t=>{for(const[s,d,f]of seq)if(t>=s&&t<s+d){const u=(t-s)/d;p+=f*(1-.08*u)/sr;return (Math.sin(TAU*p)+.18*Math.sin(2*TAU*p))*Math.pow(Math.sin(Math.PI*u),1.5)*.13}return 0},o)},
 crow:(sr,o)=>{const n=Math.floor(rr(2,4)),b1=new BQ(sr,'bp',1250,3),b2=new BQ(sr,'bp',2300,4);let p=0;return voice(sr,n*.45,t=>{const k=t%.45,u=k/.3;if(k>.3)return 0;p+=(560-u*140)/sr;const s=((p%1)*2-1)*.7+wn()*.3;return (b1.p(s)+b2.p(s)*.6)*Math.sin(Math.PI*u)*.5},o)},
 gull:(sr,o)=>{const b=new BQ(sr,'bp',2100,2);let p=0;return voice(sr,.75,t=>{const f=t<.25?1250-t*600:1000-((t-.25)/.5)*300;p+=f*(1+.03*Math.sin(TAU*28*t))/sr;return b.p((p%1)*2-1)*Math.sin(Math.PI*Math.min(1,t/.75))*.42},o)},
 owl:(sr,o)=>{const seq=[[0,.42,370],[.75,.22,390],[1.05,.55,360]];let p=0;return voice(sr,1.8,t=>{for(const[s,d,f]of seq)if(t>=s&&t<s+d){const u=(t-s)/d;p+=f*(1+.04*u)/sr;return (Math.sin(TAU*p)+.06*wn())*Math.pow(Math.sin(Math.PI*u),.8)*.2}return 0},{...o,send:.5})},
 /* weather */
 thunder:(sr,o={})=>{const km=o.km??1.5,near=km<.6,l=new BQ(sr,'lp',Math.max(90,700/(1+km*1.4))),h=new BQ(sr,'hp',300),br=new Brown(),dur=rr(5,9),sw=[...Array(Math.floor(rr(4,8)))].map((_,i)=>[i?rr(.1,dur*.6):0,rr(.4,1),rr(.6,2.2)]);
  return voice(sr,dur,t=>{let e=0;for(const[s,a,w]of sw)if(t>s)e+=a*Math.min(1,(t-s)/.08)*Math.exp(-(t-s)/w);let v=l.p(br.p())*e*1.6;if(near)v+=h.p(wn())*Math.exp(-t/.06)*1.2;return v*.75*(o.k??1)*Math.min(1,(dur-t)/1)},{delay:Math.min(8,km/.343),send:.9,gain:1/(1+km*.35)})}
};

/* ---------- ambience ---------- */
class Ambience{constructor(sr,mix){this.sr=sr;this.mix=mix;this.t={wind:0,rain:0,fire:0,water:0,day:0,night:0,roof:0,storm:0};this.v={...this.t};
 this.w={br:new Brown(),bp:new BQ(sr,'bp',400,.7),wh:new BQ(sr,'bp',1200,25),lv:new BQ(sr,'hp',2600),pk:new Pink(),f:new Walk(.4),g:new Walk(.7),wf:new Walk(.25)};
 this.r={pk:new Pink(),bp:new BQ(sr,'bp',2400,.5),lo:new BQ(sr,'lp',600),drops:[]};
 this.f={br:new Brown(),lp:new BQ(sr,'lp',230),hp:new BQ(sr,'hp',5200),fl:new Walk(3,.4,1),cr:[],pop:[],body:[...Array(4)].map(()=>new BQ(sr,'bp',1000,5)),bi:0,crlp:new BQ(sr,'hp',350)};
 this.wa={br:new Brown(),lp:new BQ(sr,'lp',420),rp:[],pool:[...Array(4)].map(()=>new BQ(sr,'bp',1500,3)),pi:0,t:0};
 this.cr=[...Array(4)].map(()=>({f:rr(4200,4900),ph:0,next:rr(0,1),t:-1,pan:rr(-.8,.8),per:rr(.55,1.1)}));this.next={bird:2,owl:8,thunder:6,gull:20}}
 set(o){for(const k in o)if(k in this.t)this.t[k]=clamp(+o[k]||0,0,1)}
 sched(dt){const v=this.v;for(const k in v)v[k]+=(this.t[k]-v[k])*(1-Math.exp(-dt*1.2));const N=this.next,M=this.mix;
  N.bird-=dt;if(N.bird<0){if(v.day>.1&&v.rain<.5)M.play(['warbler','warbler','thrush','trill','dove'][Math.floor(rnd()*5)],{pan:rr(-.9,.9),gain:v.day*rr(.9,1.8),send:.35});N.bird=rr(1.5,5)/(.3+v.day)}
  N.gull-=dt;if(N.gull<0){if(v.water>.3&&v.day>.3)M.play('gull',{pan:rr(-.8,.8),gain:.5*v.water,send:.4});N.gull=rr(12,30)}
  N.owl-=dt;if(N.owl<0){if(v.night>.4&&v.rain<.3)M.play('owl',{pan:rr(-.9,.9),gain:v.night*.8});N.owl=rr(14,32)}
  N.thunder-=dt;if(N.thunder<0){if(v.storm>.4)M.play('thunder',{km:rr(.4,4),pan:rr(-.8,.8),k:v.storm});N.thunder=rr(6,16)}}
 render(L,R,SL,SR,n){const sr=this.sr,dt=n/sr,v=this.v;this.sched(dt);const W=this.w,Rn=this.r,F=this.f,Wa=this.wa;
  const gust=W.g.step(dt),fl=F.fl.step(dt);W.bp.set(250+W.f.step(dt)*500,.7);W.wh.set(900+W.wf.step(dt)*700,25);
  const wl=v.wind*(.45+.75*gust),dropRate=v.rain*(380+v.storm*500)/sr,roof=v.roof,crRate=v.fire*(10+fl*14)/sr,popRate=v.fire*.6/sr;
  const lapA=.5+.25*Math.sin(Wa.t*.8)+.25*Math.sin(Wa.t*1.31);Wa.t+=dt;
  for(let i=0;i<n;i++){let l=0,r=0,sl=0,s;
   if(v.wind>.005){s=W.bp.p(W.br.p())*wl*.7+W.wh.p(wn())*v.wind*v.wind*gust*.12+W.lv.p(W.pk.p())*wl*.12;l+=s*(.9+gust*.2);r+=s*(1.1-gust*.2);sl+=s*.2}
   if(v.rain>.005){s=Rn.bp.p(Rn.pk.p())*v.rain*.35+Rn.lo.p(Rn.pk.p())*v.rain*.25*(1+roof);l+=s;r+=s;
    if(rnd()<dropRate&&Rn.drops.length<60){const f=roof>.5?rr(260,900):rr(1500,6200);Rn.drops.push({a:0,f,ph:0,d:(roof>.5?rr(.006,.014):rr(.001,.0035))*sr,amp:rr(.05,.25)*(1+roof),pan:rr(-1,1)})}
    for(let k=Rn.drops.length-1;k>=0;k--){const d=Rn.drops[k];d.ph+=d.f/sr;const e=Math.exp(-d.a/d.d);s=(Math.sin(TAU*d.ph)*e+(d.a<sr*.0004?wn()*.6:0))*d.amp;l+=s*(1-d.pan)*.5;r+=s*(1+d.pan)*.5;if(++d.a>d.d*7)Rn.drops.splice(k,1)}}
   if(v.fire>.005){s=F.lp.p(F.br.p())*v.fire*.55*fl+F.hp.p(wn())*v.fire*.018*fl;l+=s;r+=s;sl+=s*.3;
    if(rnd()<crRate){const nc=rnd()<.35?Math.floor(rr(2,7)):1;for(let c=0;c<nc;c++)F.cr.push({a:-Math.round(c*rr(.003,.012)*sr),d:rr(.0002,.0011)*sr,amp:rr(.2,.9)*v.fire,pan:rr(-.4,.4)})}
    if(rnd()<popRate){const b=F.body[F.bi++%4];b.set(rr(600,1700),5);F.pop.push({a:0,b,amp:v.fire*rr(.7,1.2)})}
    for(let k=F.cr.length-1;k>=0;k--){const q=F.cr[k];if(q.a<0){q.a++;continue}s=F.crlp.p(wn()*q.amp*Math.exp(-q.a/q.d))*1.3;l+=s*(1-q.pan)*.5;r+=s*(1+q.pan)*.5;sl+=s*.4;if(++q.a>q.d*8)F.cr.splice(k,1)}
    for(let k=F.pop.length-1;k>=0;k--){const q=F.pop[k],ex=wn()*Math.exp(-q.a/(.0015*sr));s=(ex*.6+q.b.p(ex)*3)*q.amp*Math.exp(-q.a/(.02*sr));l+=s;r+=s;sl+=s*.5;if(++q.a>.12*sr)F.pop.splice(k,1)}}
   if(v.water>.005){s=Wa.lp.p(Wa.br.p())*v.water*.45*lapA;l+=s;r+=s*.9;if(rnd()<v.water*5/sr&&Wa.rp.length<6){const b=Wa.pool[Wa.pi++%4];b.set(rr(700,2400),3);Wa.rp.push({a:0,b,amp:v.water*rr(.1,.3),pan:rr(-.7,.7)})}
    for(let k=Wa.rp.length-1;k>=0;k--){const q=Wa.rp[k];s=q.b.p(wn())*q.amp*env(q.a/sr,.008,.05);l+=s*(1-q.pan)*.5;r+=s*(1+q.pan)*.5;if(++q.a>.3*sr)Wa.rp.splice(k,1)}}
   if(v.night>.05)for(const c of this.cr){c.next-=1/sr;if(c.next<=0){c.t=0;c.next=c.per*rr(.85,1.15)}if(c.t>=0){c.ph+=c.f/sr;const k=Math.floor(c.t*41.6),on=k<6&&k%2===0;s=on?Math.sin(TAU*c.ph)*.035*v.night*(1-v.rain):0;l+=s*(1-c.pan)*.5;r+=s*(1+c.pan)*.5;c.t+=1/sr;if(c.t>.16)c.t=-1}}
   L[i]+=l;R[i]+=r;SL[i]+=sl;SR[i]+=sl}}}

/* ---------- mixer (the whole DSP graph) ---------- */
class HillDSP{constructor(sr){this.sr=sr;this.engine=new Engine(sr);this.tires=new Tires(sr);this.amb=new Ambience(sr,this);this.rev=new Reverb(sr);this.voices=[];this.master=.85;this.SL=new Float32Array(8192);this.SR=new Float32Array(8192);this.peak=0}
 play(name,o={}){const f=SFX[name];if(!f)return false;const v=f(this.sr,o);if(o.pan!==undefined){[v.pl,v.pr]=pan2(o.pan)}if(o.gain!==undefined)v.gain*=o.gain;if(o.send!==undefined)v.send=o.send;this.voices.push(v);if(this.voices.length>48)this.voices.shift();return true}
 render(L,R){const n=L.length,SL=this.SL,SR=this.SR;L.fill(0);R.fill(0);SL.fill(0,0,n);SR.fill(0,0,n);
  this.engine.render(L,R,n);for(let i=0;i<n;i++){SL[i]+=L[i]*.06;SR[i]+=R[i]*.06}this.tires.render(L,R,n);this.amb.render(L,R,SL,SR,n);
  for(let k=this.voices.length-1;k>=0;k--){const v=this.voices[k];for(let i=0;i<n;i++){if(v.delay>0){v.delay--;continue}if(v.i>=v.n)break;const x=v.fn(v.i/this.sr)*v.gain;v.i++;L[i]+=x*v.pl*1.2;R[i]+=x*v.pr*1.2;SL[i]+=x*v.send;SR[i]+=x*v.send}if(v.i>=v.n)this.voices.splice(k,1)}
  this.rev.run(SL,SR,L,R,n);let pk=0;for(let i=0;i<n;i++){L[i]=Math.tanh(L[i]*this.master);R[i]=Math.tanh(R[i]*this.master);const a=Math.abs(L[i]);if(a>pk)pk=a}this.peak=pk}}

/* ---------- WebAudio wrapper ---------- */
let ctx=null,node=null,dsp=null,an=null,out=null;
const api={
 ENGINES:Object.fromEntries(Object.entries(ENG).map(([k,v])=>[k,v.name])),SURFACES:Object.keys(SURF),SFX:Object.keys(SFX),EXHAUSTS:Object.keys(EXH),
 HillDSP,Drive,
 get ctx(){return ctx},get dsp(){return dsp},get analyser(){return an},
 init(){if(ctx)return api;const AC=window.AudioContext||window.webkitAudioContext;ctx=new AC({latencyHint:'interactive'});dsp=new HillDSP(ctx.sampleRate);
  node=ctx.createScriptProcessor(2048,0,2);node.onaudioprocess=e=>dsp.render(e.outputBuffer.getChannelData(0),e.outputBuffer.getChannelData(1));
  out=ctx.createGain();an=ctx.createAnalyser();an.fftSize=2048;an.smoothingTimeConstant=.75;node.connect(out);out.connect(an);an.connect(ctx.destination);return api},
 resume(){if(ctx)ctx.resume()},suspend(){if(ctx)ctx.suspend()},
 setMaster(v){if(out)out.gain.setTargetAtTime(v,ctx.currentTime,.05)},
 engine:{setType:t=>dsp&&dsp.engine.setType(t),start:()=>{if(!dsp)return;dsp.engine.start();if(dsp.engine.p.electric)dsp.play('evready')},stop:()=>dsp&&dsp.engine.stop(),
  set:(rpm,throttle)=>dsp&&dsp.engine.set(rpm,throttle),exhaust:m=>dsp&&EXH[m]&&(dsp.engine.exh=m),turbo:b=>dsp&&(dsp.engine.turboOn=b),
  place:(pan,vol)=>{if(dsp){dsp.engine.pan=pan;dsp.engine.vol=vol}},get state(){return dsp?dsp.engine.state:'off'},get rpm(){return dsp?dsp.engine.rpm:0}},
 tires:{set:(speed,surface,slip)=>dsp&&dsp.tires.set(speed,surface,slip)},
 ambience:o=>dsp&&dsp.amb.set(o),
 play:(name,o)=>dsp&&dsp.play(name,o),
 thunder:km=>dsp&&dsp.play('thunder',{km,pan:rr(-.8,.8)}),
 seed(fn){RNG=fn}};
return api})();
if(typeof window!=='undefined')window.HillAudio=HillAudio;
if(typeof module!=='undefined')module.exports=HillAudio;
