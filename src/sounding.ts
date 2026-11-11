import {dewpoint,saturationVaporPressure} from './vendor/flyxc/atmosphere.ts';
import {sampleLcl} from './lclForecast.ts';
import type {ParcelData} from './vendor/flyxc/atmosphere';
export type SoundingSite={id:string;name:string;lat:number;lon:number};
export type SoundingLevel={pressureHpa:number;heightM:number;temperatureC:number;dewPointC?:number;windMps?:number;windDirection?:number;gapBefore?:boolean};
export type SoundingCloudLevel={pressureHpa:number;heightM:number;coverPct?:number};
export type SoundingSurfaceWind={heightM:number;windMps:number;windDirection?:number};
export type SoundingSurfaceThermo={heightM:number;temperatureC:number;dewPointC?:number};
export type SoundingProfile={surfaceThermo?:SoundingSurfaceThermo;surfaceWind?:SoundingSurfaceWind;levels:SoundingLevel[];terrainM?:number;takeoffM?:number;timestamp:number;parcel?:ParcelData;surfaceLclM?:number;clouds?:SoundingCloudLevel[]};
export type SoundingState={open:boolean;site?:SoundingSite;model:string;timestamp:number;status:'loading'|'ready'|'error';profile?:SoundingProfile;day?:SoundingProfile[];error?:string};
const finite=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value);
export function sampleSounding(payload:any,timestamp:number):SoundingProfile{
    if(payload?.status!==undefined&&payload.status!==200)throw Error('Sounding forecast request failed.');
    const data=payload?.data?.header||payload?.data?.sounding?payload.data:payload;
    const sounding=data?.sounding,times=sounding?.ts;
    if(!Array.isArray(times)||times.length<1||!times.every((t:any,i:number)=>finite(t)&&(!i||t>times[i-1])))throw Error('No sounding profile is available for this model.');
    if(!finite(timestamp)||timestamp<times[0]||timestamp>times.at(-1))throw Error('No sounding profile is available for this forecast time.');
    const right=times.findIndex((t:number)=>t>=timestamp),left=times[right]===timestamp?right:right-1;
    const weight=left===right?0:(timestamp-times[left])/(times[right]-times[left]);
    const sample=(key:string,valid:(n:number)=>boolean=()=>true)=>{
        const values=sounding[key],a=values?.[left],b=values?.[right];
        return finite(a)&&finite(b)&&valid(a)&&valid(b)?a+(b-a)*weight:undefined;
    };
    const levels:SoundingLevel[]=[];
    for(const key of Object.keys(sounding)){
        const match=/^temp-(\d+)h$/.exec(key);if(!match)continue;
        const pressureHpa=Number(match[1]);if(pressureHpa<100||pressureHpa>1100)continue;
        const suffix=`${pressureHpa}h`,temp=sample(key,n=>n>150&&n<350),heightM=sample(`gh-${suffix}`,n=>n>=-500&&n<=25000);
        if(temp===undefined||heightM===undefined)continue;
        let dew=sample(`dewPoint-${suffix}`,n=>n>130&&n<350);
        if(dew===undefined){const rh=sample(`rh-${suffix}`,n=>n>0&&n<=100);if(rh!==undefined)dew=dewpoint(saturationVaporPressure(temp)*rh/100);}
        if(dew!==undefined&&dew>temp+.2)dew=undefined;
        const windMps=sample(`wind-${suffix}`,n=>n>=0&&n<=150);
        const da=sounding[`windDir-${suffix}`]?.[left],db=sounding[`windDir-${suffix}`]?.[right];
        const windDirection=finite(da)&&finite(db)&&da>=0&&da<=360&&db>=0&&db<=360?(da+(((db-da+540)%360)-180)*weight+360)%360:undefined;
        levels.push({pressureHpa,heightM,temperatureC:temp-273.15,dewPointC:dew===undefined?undefined:dew-273.15,windMps,windDirection});
    }
    levels.sort((a,b)=>b.pressureHpa-a.pressureHpa);
    const terrainM=finite(data?.header?.modelElevation)?data.header.modelElevation:undefined;
    const usable:SoundingLevel[]=[];
    const knownPressures=Object.keys(sounding).flatMap(key=>{const m=/^temp-(\d+)h$/.exec(key);return m?[Number(m[1])]:[];}).sort((a,b)=>b-a);
    for(const level of levels){
        const previous=usable.at(-1);
        if(level.heightM<(terrainM??-500)-1||(previous&&level.heightM<=previous.heightM))continue;
        if(previous&&knownPressures.indexOf(level.pressureHpa)>knownPressures.indexOf(previous.pressureHpa)+1)level.gapBefore=true;
        usable.push(level);
    }
    if(usable.length<2)throw Error('Not enough valid height and temperature levels for a sounding.');
    const cloudKeys=Object.keys(sounding).filter(key=>/^cloud-\d+h$/.test(key));
    const clouds:SoundingCloudLevel[]=[];
    for(const key of cloudKeys){
        const pressureHpa=Number(key.slice(6,-1));if(pressureHpa<100||pressureHpa>1100)continue;
        let heightM=sample(`gh-${pressureHpa}h`,n=>n>=-500&&n<=25000);
        if(heightM===undefined){
            const index=usable.findIndex(l=>l.pressureHpa<=pressureHpa);
            if(index<0||pressureHpa>usable[0].pressureHpa)continue;
            const b=usable[index],a=index?usable[index-1]:b;
            heightM=a===b?b.heightM:a.heightM+(b.heightM-a.heightM)*Math.log(pressureHpa/a.pressureHpa)/Math.log(b.pressureHpa/a.pressureHpa);
        }
        if(heightM<(terrainM??-500)-1)continue;
        clouds.push({pressureHpa,heightM,coverPct:sample(key,n=>n>=0&&n<=100)});
    }
    clouds.sort((a,b)=>a.heightM-b.heightM);
    // Surface fields have their own timestamps, independent of sounding levels.
    const scalarFrom=(values:any,grid:any,valid:(n:number)=>boolean)=>{
        if(!Array.isArray(grid)||!grid.length||!grid.every((t,i)=>finite(t)&&(!i||t>grid[i-1]))||timestamp<grid[0]||timestamp>grid.at(-1))return undefined;
        const r=grid.findIndex(t=>t>=timestamp),l=grid[r]===timestamp?r:r-1,a=values?.[l],b=values?.[r];
        return finite(a)&&finite(b)&&valid(a)&&valid(b)?a+(b-a)*(l===r?0:(timestamp-grid[l])/(grid[r]-grid[l])):undefined;
    };
    const surface=data?.data,grid=surface?.ts;
    const temperature=scalarFrom(surface?.temperature,grid,n=>n>150&&n<350);
    let dew=scalarFrom(surface?.dewPoint,grid,n=>n>130&&n<350)??scalarFrom(data?.meteogram?.dewPoint,data?.meteogram?.ts,n=>n>130&&n<350);
    if(dew===undefined&&temperature!==undefined){const rh=scalarFrom(surface?.rh,grid,n=>n>0&&n<=100);if(rh!==undefined)dew=dewpoint(saturationVaporPressure(temperature)*rh/100);}
    if(dew!==undefined&&temperature!==undefined&&dew>temperature+.2)dew=undefined;
    const surfaceThermo=terrainM!==undefined&&temperature!==undefined?{heightM:terrainM+2,temperatureC:temperature-273.15,dewPointC:dew===undefined?undefined:dew-273.15}:undefined;

    let surfaceWind:SoundingSurfaceWind|undefined;
    if(terrainM!==undefined&&Array.isArray(grid)&&grid.length&&grid.every((t,i)=>finite(t)&&(!i||t>grid[i-1]))&&timestamp>=grid[0]&&timestamp<=grid.at(-1)){
        const r=grid.findIndex(t=>t>=timestamp),l=grid[r]===timestamp?r:r-1,f=l===r?0:(timestamp-grid[l])/(grid[r]-grid[l]);
        const a=surface.wind?.[l],b=surface.wind?.[r],da=surface.windDir?.[l],db=surface.windDir?.[r];
        if(finite(a)&&finite(b)&&a>=0&&b>=0&&a<=150&&b<=150){
            let windMps=a+(b-a)*f,windDirection:number|undefined;
            if(finite(da)&&finite(db)&&da>=0&&da<=360&&db>=0&&db<=360){
                const u=a*Math.sin(da*Math.PI/180)*(1-f)+b*Math.sin(db*Math.PI/180)*f,v=a*Math.cos(da*Math.PI/180)*(1-f)+b*Math.cos(db*Math.PI/180)*f;
                windMps=Math.hypot(u,v);if(windMps>1e-6)windDirection=(Math.atan2(u,v)*180/Math.PI+360)%360;
            }
            surfaceWind={heightM:terrainM+10,windMps,windDirection};
        }
    }
    const surfaceLclM=sampleLcl(data,timestamp).lclAslM;
    return{surfaceThermo,surfaceWind,clouds:cloudKeys.length?clouds.filter((l,i)=>!i||l.heightM>clouds[i-1].heightM):undefined,surfaceLclM,levels:usable,terrainM,takeoffM:finite(data?.header?.elevation)?data.header.elevation:undefined,timestamp};
}
export function sampleSoundingDay(payload:any,timestamp:number):SoundingProfile[]{
    const start=Math.floor(timestamp/86400000)*86400000,profiles:SoundingProfile[]=[];
    for(let hour=0;hour<24;hour++){
        try{profiles.push(sampleSounding(payload,start+hour*3600000));}catch{/* Unavailable hours remain empty. */}
    }
    return profiles;
}
export function createSoundingController({fetch,onChange,now=Date.now}:{fetch:(site:SoundingSite,model:string,signal?:AbortSignal)=>Promise<any>;onChange:(state:SoundingState)=>void;now?:()=>number}){
    let state:SoundingState={open:false,model:'',timestamp:0,status:'loading'},sequence=0,destroyed=false,wanted='';
    const requests=new Set<AbortController>();
    const abortPending=()=>{for(const request of requests)request.abort();requests.clear();pending.clear();};
    const cache=new Map<string,{payload:any;time:number}>(),pending=new Map<string,Promise<any>>();
    const keyFor=(site:SoundingSite,model:string)=>JSON.stringify([site.lat,site.lon,model]);
    function publish(next:SoundingState){state=next;if(!destroyed)onChange(state);}
    async function load(site:SoundingSite,model:string,timestamp:number,force=false){
        if(destroyed)return;
        const key=keyFor(site,model),request=JSON.stringify([key,timestamp]);
        if(!force&&state.open&&wanted===request&&(state.status!=='ready'||(cache.has(key)&&now()-cache.get(key)!.time<10*60*1000)))return;
        wanted=request;const ticket=++sequence;
        publish({open:true,site,model,timestamp,status:'loading'});
        try{
            if(force)cache.delete(key);
            const old=cache.get(key);let payload=old&&now()-old.time<10*60*1000?old.payload:undefined;
            if(!payload){
                let work=pending.get(key);
                if(!work){const controller=new AbortController();requests.add(controller);work=Promise.resolve().then(()=>{if(controller.signal.aborted)throw Error('Sounding request cancelled.');return fetch(site,model,controller.signal);});pending.set(key,work);void work.finally(()=>{requests.delete(controller);if(pending.get(key)===work)pending.delete(key);}).catch(()=>{});}
                payload=await work;
                if(!destroyed){cache.delete(key);cache.set(key,{payload,time:now()});if(cache.size>4)cache.delete(cache.keys().next().value!);}
            }
            const profile=sampleSounding(payload,timestamp);
            if(!destroyed&&ticket===sequence)publish({open:true,site,model,timestamp,status:'ready',profile,day:sampleSoundingDay(payload,timestamp)});
        }catch(error){if(!destroyed&&ticket===sequence)publish({open:true,site,model,timestamp,status:'error',error:error instanceof Error?error.message:'Could not load the sounding. Try again.'});}
    }
    return{
        open:(site:SoundingSite,model:string,timestamp:number)=>load(site,model,timestamp),
        sync:(model:string,timestamp:number)=>state.open&&state.site?load(state.site,model,timestamp):Promise.resolve(),
        retry:()=>state.open&&state.site?load(state.site,state.model,state.timestamp,true):Promise.resolve(),
        close(){sequence++;wanted='';abortPending();publish({...state,open:false});},
        destroy(){destroyed=true;sequence++;abortPending();cache.clear();pending.clear();state={...state,open:false};},
    };
}
