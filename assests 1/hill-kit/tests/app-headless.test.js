const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(__dirname+'/../reference/hillkit.html','utf8');
const body=html.slice(html.indexOf('<body>')+6,html.indexOf('<script src='));
const dom=new JSDOM('<!doctype html><html><head></head><body>'+body+'</body></html>',{pretendToBeVisual:true});
const w=dom.window;global.window=w;global.document=w.document;global.navigator=w.navigator;global.HTMLElement=w.HTMLElement;global.performance=require('perf_hooks').performance;
w.matchMedia=global.matchMedia=()=>({matches:false,addEventListener(){}});global.devicePixelRatio=1;global.innerWidth=1400;global.innerHeight=900;
global.addEventListener=(...a)=>w.addEventListener(...a);
const g2={createRadialGradient:()=>({addColorStop(){}}),fillRect(){},beginPath(){},arc(){},fill(){},fillText(){},set fillStyle(v){},set font(v){},set textAlign(v){},set textBaseline(v){}};
w.HTMLCanvasElement.prototype.getContext=function(){return g2};
let frames=[];global.requestAnimationFrame=w.requestAnimationFrame=f=>{frames.push(f);return frames.length};
global.THREE=require('three');w.THREE=THREE;
class R{constructor(){this.shadowMap={};this.capabilities={isWebGL2:true}}setPixelRatio(){}getPixelRatio(){return 1}setSize(){}render(){}setClearColor(){}}
THREE.WebGLRenderer=R;
const load=p=>eval(fs.readFileSync(__dirname+'/node_modules/three/examples/js/'+p,'utf8'));
load('controls/OrbitControls.js');load('utils/BufferGeometryUtils.js');
const scripts=[...html.matchAll(/<script(?: id="kit")?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
eval(scripts[0]+';window.KIT=KIT;global.KIT=KIT;');
eval(scripts[1]);
const run=n=>{for(let i=0;i<n;i++){const f=frames.shift();if(f)f()}};
run(5);const $=s=>document.querySelector(s);const click=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
console.log('inspector:',$('#inspector h2').textContent,'| list items',document.querySelectorAll('.item').length);
for(const t of ['dawn','night','noon'])click(document.querySelector(`[data-time="${t}"]`));run(20);
for(const x of ['storm','snow','mist','rain','clear']){click(document.querySelector(`[data-wx="${x}"]`));run(15)}
for(const b of ['highland','autumn','desert','alpine','coast','meadow']){click(document.querySelector(`[data-biome="${b}"]`));run(3)}
click(document.querySelector('[data-cat="All"]'));const ids=[...document.querySelectorAll('.item')].map(b=>b.dataset.id);
for(const id of ids){click(document.querySelector(`.item[data-id="${id}"]`));run(4)}console.log('selected all',ids.length);
click(document.querySelector(`.item[data-id="bronc"]`));run(3);
for(const b of document.querySelectorAll('#inspector .seg button'))click(b);run(5);
document.querySelectorAll('#inspector .tog').forEach(t=>{t.checked=!t.checked;t.dispatchEvent(new w.Event('change',{bubbles:true}))});run(5);
document.querySelectorAll('#inspector input[type=range]').forEach(t=>{t.value=t.max;t.dispatchEvent(new w.Event('input',{bubbles:true}))});run(5);
click($('#tEdges'));run(3);click($('#tTurn'));click($('[data-view="under"]'));run(60);
click($('[data-mode="drive"]'));run(5);
const kd=c=>w.dispatchEvent(new w.KeyboardEvent('keydown',{code:c})),ku=c=>w.dispatchEvent(new w.KeyboardEvent('keyup',{code:c}));
kd('KeyW');run(240);kd('KeyA');run(120);ku('KeyA');kd('KeyD');run(120);ku('KeyW');kd('Space');run(60);kd('KeyH');kd('KeyC');run(10);
console.log('speed',$('#spd').textContent,'susp bars',$('#susp').children.length,[...$('#susp').children].map(i=>i.style.getPropertyValue('--v')).join(','));
click(document.querySelector(`[data-v="army6"]`)||$('#list'));
click(document.querySelector('[data-mode="diorama"]'));run(60);click(document.querySelector('[data-mode="inspect"]'));run(10);
console.log('done ok, theme',document.documentElement.dataset.theme);
