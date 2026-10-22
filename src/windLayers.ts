import {evaluateWind} from './windForecast.ts';
import type {ForecastSpot,WindReading} from './windForecast';

type Vector=[number,number];
type Sample={vector?:Vector;height?:number};
type Profile={times:number[];estimated:boolean;at(index:number):Sample};
const profiles=new WeakMap<object,Map<string,Profile|null>>();
const validTimes=(times:unknown):times is number[]=>Array.isArray(times)&&times.length>0
    &&times.every((time,i)=>Number.isFinite(time)&&(!i||time>times[i-1]));
const blend=(a:Vector,b:Vector,r:number):Vector=>[a[0]+(b[0]-a[0])*r,a[1]+(b[1]-a[1])*r];

export function windLevelSupported(level:unknown):level is string {
    return typeof level==='string'&&(level==='surface'||level==='100m'||/^\d{2,4}h$/.test(level));
}
export function windLevelLabel(level='surface'):string {
    if(level==='surface')return 'Surface wind';
    if(level==='100m')return 'Wind at 100 m AGL';
    return /^\d+h$/.test(level)?`Wind at ${level.slice(0,-1)} hPa`:'Selected wind layer';
}
function bracket(times:number[],time:number):[number,number,number]|undefined {
    if(!Number.isFinite(time)||time<times[0]||time>times[times.length-1])return;
    let lo=0,hi=times.length-1;
    while(lo<hi){const mid=(lo+hi)>>1;if(times[mid]<time)lo=mid+1;else hi=mid;}
    const left=times[lo]===time?lo:lo-1;
    if(left<0)return;
    return [left,lo,left===lo?0:(time-times[left])/(times[lo]-times[left])];
}
function vector(data:any,level:string,index:number):Vector|undefined {
    const speed=data[`wind-${level}`]?.[index],direction=data[`windDir-${level}`]?.[index];
    if(!Number.isFinite(speed)||speed<0||(speed!==0&&!Number.isFinite(direction)))return;
    const angle=(speed===0?0:direction)*Math.PI/180;
    return [-speed*Math.sin(angle),-speed*Math.cos(angle)];
}
function prepare(payload:any,level:string):Profile|undefined {
    if(!payload||typeof payload!=='object')return;
    let saved=profiles.get(payload);
    if(saved?.has(level))return saved.get(level)??undefined;
    if(!saved){saved=new Map();profiles.set(payload,saved);}
    const data=payload.airgram,times=data?.ts,heights=payload.meteogram;
    const available=payload.header?.availableLevels;
    let profile:Profile|undefined;
    if(validTimes(times)&&(!Array.isArray(available)||available.includes(level))){
        const heightTimes=validTimes(heights?.ts)?heights.ts:undefined;
        const heightSeries=(key:string):(number|undefined)[]=>times.map(time=>{
            if(!heightTimes)return;
            const bounds=bracket(heightTimes,time);if(!bounds)return;
            const [left,right,r]=bounds,a=heights[`gh-${key}`]?.[left],b=heights[`gh-${key}`]?.[right];
            return Number.isFinite(a)&&Number.isFinite(b)?a+(b-a)*r:undefined;
        });
        if(Array.isArray(data[`wind-${level}`])){
            const z=level==='100m'&&Number.isFinite(payload.header?.modelElevation)
                ?times.map(()=>payload.header.modelElevation+100):heightSeries(level);
            profile={times,estimated:false,at:index=>({vector:vector(data,level,index),height:z[index]})};
        }else{
            const keys=Object.keys(data).filter(key=>/^wind-\d+h$/.test(key)).map(key=>key.slice(5));
            if(/^\d+h$/.test(level)){
                const pressure=Number(level.slice(0,-1));
                const sorted=keys.map(key=>({key,p:Number(key.slice(0,-1))})).sort((a,b)=>a.p-b.p);
                const upper=sorted.findIndex(entry=>entry.p>pressure);
                if(upper>0){
                    const a=sorted[upper-1],b=sorted[upper];
                    const r=(Math.log(pressure)-Math.log(a.p))/(Math.log(b.p)-Math.log(a.p));
                    const za=heightSeries(a.key),zb=heightSeries(b.key);
                    profile={times,estimated:true,at:index=>{
                        const va=vector(data,a.key,index),vb=vector(data,b.key,index),ha=za[index],hb=zb[index];
                        return {vector:va&&vb?blend(va,vb,r):undefined,
                            height:ha!==undefined&&hb!==undefined?ha+(hb-ha)*r:undefined};
                    }};
                }
            }else if(level==='100m'&&Number.isFinite(payload.header?.modelElevation)){
                const ground=payload.header.modelElevation,target=ground+100,surface=ground+10;
                const layers=keys.map(key=>({key,z:heightSeries(key)}));
                profile={times,estimated:true,at:index=>{
                    const entries=[{z:surface,vector:vector(data,'surface',index)},
                        ...layers.filter(layer=>layer.z[index]!==undefined&&layer.z[index]!>=surface)
                            .map(layer=>({z:layer.z[index]!,vector:vector(data,layer.key,index)}))]
                        .sort((a,b)=>a.z-b.z);
                    const exact=entries.find(entry=>entry.z===target);if(exact)return {vector:exact.vector,height:target};
                    const upper=entries.findIndex(entry=>entry.z>target);if(upper<=0)return {};
                    const a=entries[upper-1],b=entries[upper];
                    return {vector:a.vector&&b.vector?blend(a.vector,b.vector,(target-a.z)/(b.z-a.z)):undefined,height:target};
                }};
            }
        }
    }
    saved.set(level,profile??null);
    return profile;
}

// Missing profile levels are interpolated only between known neighbours.
// 100 m is above model terrain; pressure-level heights are metres ASL.
export function sampleWindLayer(spot:ForecastSpot,payload:any,timestamp:number,level:string):WindReading {
    const missing:WindReading={status:'unavailable',mph:undefined,direction:undefined,reason:undefined,level,
        levelEstimated:false,levelHeightM:undefined,levelNote:'Selected layer unavailable in the point forecast'};
    if(level==='100m'&&!Number.isFinite(payload?.header?.modelElevation)&&!Array.isArray(payload?.airgram?.['wind-100m']))return missing;
    const profile=prepare(payload,level);if(!profile)return missing;
    const bounds=bracket(profile.times,timestamp);if(!bounds)return missing;
    const [left,right,r]=bounds,a=profile.at(left),b=left===right?a:profile.at(right);
    if(!a.vector||!b.vector)return missing;
    return {...missing,...evaluateWind(spot,blend(a.vector,b.vector,r)),level,levelEstimated:profile.estimated,
        levelHeightM:a.height!==undefined&&b.height!==undefined?a.height+(b.height-a.height)*r:undefined,
        levelNote:profile.estimated?'Interpolated between available profile levels':undefined};
}
