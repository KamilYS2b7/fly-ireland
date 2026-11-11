import * as L from 'leaflet';
window.L=L;
export const map=L.map('map',{zoomControl:false,attributionControl:false}).setView([54.8,-6.1],11);
const emitter=()=>{const events=new Map();return{on(k,f){if(!events.has(k))events.set(k,new Set());events.get(k).add(f);},off(k,f){events.get(k)?.delete(f);},emit(k,...args){for(const f of [...(events.get(k)??[])])f(...args);},count(){return [...events.values()].reduce((n,s)=>n+s.size,0);}};};
export const broadcast=emitter();
const values={product:'ukv',level:'surface',overlay:'wind',timestamp:Date.UTC(2026,10,11,12),calendar:{start:Date.UTC(2026,10,11),end:Date.UTC(2026,10,15)}};
const events=emitter();
export const store={get:k=>values[k],set:async(k,v)=>{values[k]=v;events.emit(k,v);},on:events.on,off:events.off};
export const products=Object.fromEntries(['ukv','ecmwf','gfs'].map(id=>[id,{modelName:id.toUpperCase(),minifest:{ref:'2026-11-11T00:00:00Z'},loadMinifest:async()=>({ref:'2026-11-11T00:00:00Z'}),boundsAreInViewport:()=>true}]));
export const getAllPointProducts=()=>['ukv','ecmwf','gfs'];
export const iconsDir='/icons';
let requests=0;
export async function getPointForecastData(_model,_options,include,requestOptions){
 requests++;
 await new Promise((resolve,reject)=>{const id=setTimeout(resolve,100);requestOptions?.abortSignal?.addEventListener('abort',()=>{clearTimeout(id);reject(new DOMException('Aborted','AbortError'));},{once:true});});
 const ts=Array.from({length:72},(_,i)=>values.calendar.start+i*3600000),array=v=>ts.map(()=>v);
 const sounding={ts};
 for(const [p,z,t] of [[1000,100,285],[950,500,282],[900,1000,278],[800,2000,272]])for(const [key,v] of Object.entries({gh:z,temp:t,dewPoint:t-3,wind:4,windDir:220,cloud:30}))sounding[`${key}-${p}h`]=array(v);
 return {status:200,data:{header:{model:'UKV',elevation:318,modelElevation:100,refTime:'2026-11-11T00:00:00Z'},data:{ts,temperature:array(285),wind:array(4),windDir:array(220),windGust:array(6),pressure:array(100000),icon:array(1),isDay:array(1),precipAmount:array(0),precipSnowAmount:array(0)},meteogram:{ts,dewPoint:array(282),cloudBase:array(800)},...(include.sounding?{sounding}:{})}};
}
export const getMeteogramForecastData=getPointForecastData;
broadcast.on('rqstClose',ident=>{if(ident==='windy-plugin-fly-ireland')window.lifecyclePlugin?.onclose();});
window.lifecycleBoundary={map,broadcast,store,metrics:()=>({store:events.count(),broadcast:broadcast.count(),map:Object.values(map._events??{}).reduce((n,a)=>n+(Array.isArray(a)?a.length:0),0),layers:Object.keys(map._layers).length,panes:Object.keys(map.getPanes()).sort(),requests})};
