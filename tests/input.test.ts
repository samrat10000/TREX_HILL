import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { DEFAULT_SETTINGS,DEFAULT_KEYS,useGameStore } from '../src/state';
import { boundAction,useGameInput } from '../src/game/input';
const effects=vi.hoisted(()=>({cleanup:[] as (()=>void)[]}));
vi.mock('react',async original=>({...await original<typeof import('react')>(),useEffect:(fn:()=>undefined|(()=>void))=>{const cleanup=fn();if(cleanup)effects.cleanup.push(cleanup)}}));
let listeners:Map<string,(event:any)=>void>,sim:any;
const key=(type:string,code:string,editable=false)=>listeners.get(type)?.({code,repeat:false,target:{closest:()=>editable?{}:null},preventDefault:vi.fn(),stopPropagation:vi.fn()});
beforeEach(()=>{listeners=new Map();const events={addEventListener:(name:string,fn:any)=>listeners.set(name,fn),removeEventListener:(name:string)=>listeners.delete(name)};vi.stubGlobal('window',events);vi.stubGlobal('document',{...events,hidden:false});useGameStore.setState({screen:'drive',binding:null,campMenu:null,credits:false,settings:{...DEFAULT_SETTINGS,keys:{...DEFAULT_KEYS}}});sim={current:{keys:{},photoKeys:{},drive:{range:'H'},save:vi.fn()}};useGameInput(sim)});
afterEach(()=>{effects.cleanup.splice(0).forEach(fn=>fn());vi.unstubAllGlobals()});
describe('parallel driving keys',()=>{
 it('supports arrows alongside WASD and keeps acceleration held until both keys release',()=>{key('keydown','KeyW');key('keydown','ArrowUp');key('keyup','KeyW');expect(sim.current.keys.up).toBe(true);key('keyup','ArrowUp');expect(sim.current.keys.up).toBe(false);key('keydown','ArrowLeft');expect(sim.current.keys.left).toBe(true);key('keyup','ArrowLeft');expect(sim.current.keys.left).toBe(false);expect(boundAction('ArrowDown',DEFAULT_KEYS)).toBe('down');expect(boundAction('ArrowRight',DEFAULT_KEYS)).toBe('right');});
 it('honours an explicit arrow rebind and leaves menus and editable controls alone',()=>{useGameStore.getState().configure({keys:{...DEFAULT_KEYS,map:'ArrowUp'}});key('keydown','ArrowUp');expect(useGameStore.getState().screen).toBe('map');expect(sim.current.keys.up).not.toBe(true);useGameStore.setState({screen:'drive'});key('keydown','ArrowRight',true);expect(sim.current.keys.right).not.toBe(true);useGameStore.setState({screen:'title'});key('keydown','ArrowRight');expect(sim.current.keys.right).not.toBe(true);});
 it('clears all held aliases on blur and supports toggle accelerator with arrows',()=>{key('keydown','ArrowUp');listeners.get('blur')?.({});expect(sim.current.keys.up).toBe(false);key('keydown','KeyW');key('keyup','KeyW');expect(sim.current.keys.up).toBe(false);useGameStore.getState().configure({hold:true});key('keydown','ArrowUp');key('keyup','ArrowUp');expect(sim.current.keys.up).toBe(true);key('keydown','ArrowUp');expect(sim.current.keys.up).toBe(false);});
});
