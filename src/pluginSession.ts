export function createPluginSession(mount:()=>()=>void){
 let cleanup:(()=>void)|undefined,disposed=false,mounting=false,wanted=false;
 const close=()=>{wanted=false;const stop=cleanup;cleanup=undefined;stop?.();};
 return {
  open(){
   if(disposed||cleanup||mounting)return;
   wanted=true;mounting=true;
   try{const stop=mount();if(!wanted||disposed)stop();else cleanup=stop;}finally{mounting=false;}
  },close,destroy(){disposed=true;close();},
 };
}
export function createTaskScope(host:any=globalThis){
 let disposed=false;
 const timers=new Set<ReturnType<typeof host.setTimeout>>(),frames=new Set<number>(),listeners=new Set<()=>void>();
 const clearTimeout=(id:any)=>{host.clearTimeout(id);timers.delete(id);};
 const cancelAnimationFrame=(id:number)=>{host.cancelAnimationFrame(id);frames.delete(id);};
 return {
  setTimeout(callback:(...args:any[])=>void,delay=0,...args:any[]){
   if(disposed)return undefined;
   const id=host.setTimeout(()=>{timers.delete(id);if(!disposed)callback(...args);},delay);timers.add(id);return id;
  },clearTimeout,
  requestAnimationFrame(callback:FrameRequestCallback){
   if(disposed)return 0;
   const id=host.requestAnimationFrame(time=>{frames.delete(id);if(!disposed)callback(time);});frames.add(id);return id;
  },cancelAnimationFrame,
  listen(target:EventTarget,event:string,callback:any,options?:any){
   if(disposed)return()=>{};target.addEventListener(event,callback,options);
   const stop=()=>{target.removeEventListener(event,callback,options);listeners.delete(stop);};listeners.add(stop);return stop;
  },
  destroy(){disposed=true;for(const id of timers)host.clearTimeout(id);timers.clear();for(const id of frames)host.cancelAnimationFrame(id);frames.clear();for(const stop of listeners)stop();listeners.clear();},
 };
}
