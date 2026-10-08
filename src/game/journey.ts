import { useGameStore } from '../state';
import { CHALLENGES,POIS,REGIONS,regionAt } from './worldData';
import { fogCells,postcardCount } from './progression';
/** Journey interactions run from the single game loop; only discoveries/actions write state. */
export function updateJourney(m:any,dt:number){const s=useGameStore.getState(),d=m.drive,t=m.time;
 const notify=(text:string)=>{m.discovery=text;m.discoveryUntil=t+3.8;m.sound?.('confirm');};
 m.makeCamp=(time:string)=>{const current=useGameStore.getState(),camp=POIS.find(p=>p.id===current.campMenu);if(!camp)return;current.configure({time});const at={x:camp.x+3.5,z:camp.z+2.2,yaw:d.yaw};useGameStore.setState({trip:{...current.trip,camps:[...new Set([...current.trip.camps,camp.id])],spawn:at},campMenu:null});d.safeX=at.x;d.safeZ=at.z;d.safeYaw=at.yaw;m.recoverAt=t;m.save?.();m.sound?.('door');notify('A fresh start at '+camp.name);};
 m.fastTravel=(id:string)=>{const current=useGameStore.getState(),camp=POIS.find(p=>p.id===id&&p.kind==='camp');if(!camp||!current.found.includes(id))return;const at={x:camp.x+3.5,z:camp.z+2.2,yaw:-.7};useGameStore.setState({pendingPose:at,trip:{...current.trip,spawn:at}});m.recoverAt=t;};
 m.finishFerry=()=>{if(!m.ferryTime)return;useGameStore.getState().configure(m.ferryRestore??{});m.ferryTime=null;m.cameraMode='chase';useGameStore.setState({credits:false});notify('There are still quiet roads ahead.');m.save?.();};
 m.interact=()=>{const current=useGameStore.getState(),poi=m.nearby;if(Math.abs(d.v)>1){m.context='Stop gently to use this place';m.contextUntil=t+2;return;}
  if(m.nearCaravan){useGameStore.setState({garage:{...current.garage,trailer:!current.garage.trailer}});m.sound?.('wrench');notify(current.garage.trailer?'Caravan unhitched':'Caravan hitched');return;}
  if(!poi)return;
  if(poi.kind==='camp'){useGameStore.setState({campMenu:poi.id});return;}
  if(poi.kind==='outpost'){if(current.towVehicle){const id=current.towVehicle;useGameStore.setState({garage:{...current.garage,owned:[...new Set([...current.garage.owned,id])]},towVehicle:null});current.award('vehicle-'+id);notify('Towed home: '+id);m.sound?.('wrench');}m.save?.();current.go('garage');return;}
  if(poi.kind==='vehicle'&&!current.garage.owned.includes(poi.vehicle)){if(current.garage.trailer){notify('Unhitch the caravan before towing a truck');return;}useGameStore.setState({towVehicle:poi.vehicle});m.disablePoiCollider?.(poi.id);notify('Tow attached. Bring it to an outpost.');m.sound?.('wrench');return;}
  if(poi.kind==='tower'){current.explore(fogCells(poi.x,poi.z,300));current.award(poi.id);notify(poi.name);return;}
  if(poi.kind==='ferry'){if(!REGIONS.every(r=>current.found.includes('region-'+r.id))){notify('Explore all six regions before the last ferry');return;}m.ferryRestore={time:current.settings.time,weather:current.settings.weather,cycle:current.settings.cycle};current.configure({time:'golden',weather:'clear',cycle:0});m.cameraMode='cinematic';m.ferryTime=t;current.award('ferry');return;}
 };
 if(s.screen!=='drive'||m.hidden||s.campMenu)return;
 const region=regionAt(d.x,d.z);if(!s.found.includes('region-'+region.id))s.award('region-'+region.id);
 const oldTier=m.partTier??Math.floor(postcardCount(s.found)/5),tier=Math.floor(postcardCount(useGameStore.getState().found)/5);if(tier>oldTier)notify(`Part tier ${tier} unlocked`);m.partTier=tier;
 for(const poi of POIS.filter(p=>p.kind==='tower'))if(Math.hypot(d.x-poi.x,d.z-poi.z)<6&&!s.found.includes('view-'+poi.id)){s.explore(fogCells(poi.x,poi.z,300));s.award(poi.id);s.award('view-'+poi.id);notify(poi.name);}
 if(!m.activeTrail){const trail=CHALLENGES.find(c=>!s.found.includes(c.id)&&Math.hypot(d.x-c.start.x,d.z-c.start.z)<8);if(trail){m.activeTrail={...trail,started:t};m.banner='Challenge trail · '+trail.name;m.bannerUntil=t+3.2;}}
 else if(Math.hypot(d.x-m.activeTrail.end.x,d.z-m.activeTrail.end.z)<10){const trail=m.activeTrail,seconds=t-trail.started;s.award(trail.id);if(s.settings.timedTrails)useGameStore.setState({trailTimes:{...s.trailTimes,[trail.id]:Math.min(seconds,s.trailTimes[trail.id]??Infinity)}});m.banner=trail.name+' · Postcard collected';m.bannerUntil=t+3.2;notify('The quiet way was worth taking');m.activeTrail=null;}
 if(s.settings.cycle>0){if(m.lastWeather!==s.settings.weather){m.lastWeather=s.settings.weather;m.weatherMinutes=0;m.nextWeatherMinutes=20+Math.random()*20;}m.weatherMinutes=(m.weatherMinutes??0)+dt*1440/(s.settings.cycle*60);if(m.weatherMinutes>(m.nextWeatherMinutes??30)){const choices=region.id==='pass'?['clear','snow','mist']:['clear','clear','rain','mist','storm'];s.configure({weather:choices[Math.floor(Math.random()*choices.length)]});}}
 if(m.ferryTime){if(t-m.ferryTime>8&&!s.credits)useGameStore.setState({credits:true});if(t-m.ferryTime>20)m.finishFerry();}
}
