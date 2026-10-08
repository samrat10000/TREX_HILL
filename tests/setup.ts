const data=new Map<string,string>();
Object.defineProperty(globalThis,'localStorage',{value:{
  getItem:(key:string)=>data.get(key)??null,
  setItem:(key:string,value:string)=>data.set(key,String(value)),
  removeItem:(key:string)=>data.delete(key),
  clear:()=>data.clear(),
  key:(index:number)=>[...data.keys()][index]??null,
  get length(){return data.size;},
},configurable:true});
