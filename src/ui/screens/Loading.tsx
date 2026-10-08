import { useGameStore } from '../../state';
import { TruckIcon } from '../controls';
export function Loading({progress}:{progress:number}){const target=useGameStore(s=>s.loadingTarget);return <div className="loading-inner"><span className="label">{target==='drive'?'Heading out':'Waking the world'}</span><h2>Every horizon has a story.</h2><p>Take the quiet road. Your next camp is never a deadline.</p><div className="loading-road"><i style={{width:`${progress*100}%`}}/><span style={{left:`${progress*100}%`}}><TruckIcon/></span></div><p role="status">{Math.round(progress*100)}%</p></div>}
