import type { GarageData } from '../state';
export const REGIONS=[
 {id:'meadow',name:'Golden Meadow',sub:'Rolling grass, first camp',colors:['#f7c58a','#f2c35c','#9a6224'],x:0,z:0,biome:'meadow'},
 {id:'ember',name:'Ember Woods',sub:'Maples, aspens and rivers',colors:['#f4a68c','#e8622f','#8a3e24'],x:-440,z:220,biome:'autumn'},
 {id:'pine',name:'Pinecrest',sub:'Lookouts and switchbacks',colors:['#bcd7ee','#8cbf5a','#2f5a2c'],x:390,z:-310,biome:'highland'},
 {id:'canyon',name:'Copper Canyon',sub:'Mesas and dry washes',colors:['#ffdcaa','#d07a4e','#7a3422'],x:720,z:310,biome:'desert',lock:'Reach the Pinecrest lookout'},
 {id:'pass',name:'Whitecap Pass',sub:'Snow, chains and aurora',colors:['#6e6aa6','#e8ecf4','#7d8293'],x:40,z:-780,biome:'alpine',lock:'Fit snow chains'},
 {id:'coast',name:'Bluewater Coast',sub:'Lighthouse, ferry and palms',colors:['#a8dbf2','#5ae4dc','#0a5a6a'],x:-740,z:-410,biome:'coast',lock:'Find the ferry ticket'},
] as const;
export type RegionId=typeof REGIONS[number]['id'];
export function regionAt(x:number,z:number){return REGIONS.reduce((best,r)=>Math.hypot(x-r.x,z-r.z)<Math.hypot(x-best.x,z-best.z)?r:best,REGIONS[0] as typeof REGIONS[number]);}
export function regionBlend(x:number,z:number){const ranked=REGIONS.map(r=>({region:r,d:Math.hypot(x-r.x,z-r.z)})).sort((a,b)=>a.d-b.d),w=Math.max(0,.5-(ranked[1].d-ranked[0].d)/200);return{a:ranked[0].region,b:ranked[1].region,weight:w};}
export function regionRequirement(id:string,found:string[],garage:GarageData){if(id==='canyon'&&!found.includes('pine-lookout'))return 'Reach the Pinecrest lookout';if(id==='pass'&&garage.loadouts[garage.vehicle]?.tires!=='chains')return 'Fit snow chains';if(id==='coast'&&!found.includes('ferry-ticket'))return 'Find the ferry ticket';return undefined;}
export type Poi={id:string;name:string;kind:string;x:number;z:number;region:RegionId;radius:number;description:string;vehicle?:string};
const poi=(id:string,name:string,kind:string,x:number,z:number,region:RegionId,radius=20,description='A view worth stopping for.'):Poi=>({id,name,kind,x,z,region,radius,description});
export const POIS:Poi[]=[
 poi('camp','Ember Camp','camp',0,0,'meadow',22,'Your first fire beneath the open sky.'),poi('ember-camp','Maple Rest','camp',-440,220,'ember'),poi('pine-camp','Pine Needle Camp','camp',390,-310,'pine'),poi('canyon-camp','Copper Camp','camp',720,310,'canyon'),poi('pass-camp','Whitecap Shelter','camp',40,-780,'pass'),poi('coast-camp','Saltwater Camp','camp',-740,-410,'coast'),
 poi('pine-lookout','Pinecrest Lookout','tower',450,-410,'pine'),poi('ember-lookout','Maple Watch','tower',-540,340,'ember'),poi('meadow-lookout','Golden Lookout','tower',130,150,'meadow'),poi('pass-lookout','Whitecap Summit','tower',110,-890,'pass'),
 poi('lighthouse','Bluewater Light','lighthouse',-870,-520,'coast'),poi('ferry','The Last Ferry','ferry',-865,-380,'coast',24),
 poi('garage','Ember Outpost','outpost',46,-14,'meadow'),poi('ferry-ticket','River Ranger Station','outpost',-280,80,'ember',18,'A ferry ticket left by a friendly ranger.'),poi('scrapjaw','Scrapjaw’s Yard','outpost',610,400,'canyon'),
 poi('aframe','The Little A-frame','aframe',-28,-32,'meadow'),poi('logcabin','Maple Cabin','logcabin',-580,150,'ember'),poi('waterfall','Silver Falls','waterfall',-350,390,'ember',25),poi('ford-west','Willow Ford','ford',-190,200,'ember'),poi('ford-east','Pinewater Ford','ford',150,-230,'pine'),poi('bridge','Old Timber Bridge','bridge',-235,260,'ember'),poi('lake','Willow Lake','lake',-80,58,'meadow',24),
];
const VEHICLES=['trek110','bronc','blazer','cruiser60','hauler70','van','army6','expedition','bus','scrapjaw'];
for(let i=0;i<10;i++){const region=REGIONS[1+Math.floor(i/2)%5],a=.6+i*1.7;POIS.push({...poi(`vehicle-${VEHICLES[i]}`,`Forgotten ${VEHICLES[i]}`,'vehicle',region.x+Math.cos(a)*110,region.z+Math.sin(a)*100,region.id,14,'A sleeping rig waiting for a tow home.'),vehicle:VEHICLES[i]});}
for(let i=0;i<20;i++){const region=REGIONS[i%6],a=i*2.39;POIS.push(poi(`photo-${i+1}`,['Morning on the ridge','A quiet bend','Light through the pines','The long horizon'][i%4],'photo',region.x+Math.cos(a)*140,region.z+Math.sin(a)*140,region.id,18,'Frame this view to keep its postcard.'));}
export const GATES=[{id:'gate-canyon',region:'canyon',x:550,z:0,yaw:0},{id:'gate-pass',region:'pass',x:220,z:-540,yaw:1.1},{id:'gate-coast',region:'coast',x:-590,z:-90,yaw:-.9}] as const;
export const CHALLENGES=Array.from({length:12},(_,i)=>{const r=REGIONS[i%6],a=i*1.6;return{id:`trail-${i+1}`,name:['Waterfall Climb','Meadow Ramble','Pine Switchback','Copper Wash','Whitecap Traverse','Salt Road'][i%6]+(i>=6?' · Long way':''),region:r.id,start:{x:r.x+Math.cos(a)*55,z:r.z+Math.sin(a)*55},end:{x:r.x+Math.cos(a+.8)*180,z:r.z+Math.sin(a+.8)*180}}});
