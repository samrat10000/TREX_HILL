import { KIT } from '../../kit/core';
import { useGameStore } from '../../state';
import { Back,Card } from '../controls';
export function Play(){const s=useGameStore();return <><Back/><div className="sheet glass single"><div className="body"><h2>Your trips</h2><p>Each trip keeps its own map, camp, vehicles and postcards.</p><div className="cards">{s.saves.map((sv,i)=><Card key={i} title={`Slot ${i+1} · ${sv?sv.trip.region:'New trip'}`} detail={sv?`${KIT.VEH[sv.garage.vehicle].name} · ${sv.found.length} postcards`:'Wake up in Golden Meadow'} art={sv?'linear-gradient(#f7c58a,#c98a3a)':'repeating-linear-gradient(45deg,#eee2cc 0 10px,#e7d8be 10px 20px)'} onClick={()=>{if(sv){useGameStore.setState({slot:i});s.continueTrip()}else s.startTrip('meadow',i)}}/>)}</div></div></div></>}
