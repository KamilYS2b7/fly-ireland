import {parcelTrajectory,dewpoint,saturationVaporPressure} from './vendor/flyxc/atmosphere.ts';
import {sampleLcl} from './lclForecast.ts';
import type {ParcelData} from './vendor/flyxc/atmosphere';
export type SoundingSite={id:string;name:string;lat:number;lon:number};
export type SoundingLevel={pressureHpa:number;heightM:number;temperatureC:number;dewPointC?:number;windMps?:number;windDirection?:number;gapBefore?:boolean};
export type SoundingProfile={levels:SoundingLevel[];terrainM?:number;takeoffM?:number;timestamp:number;parcel?:ParcelData;surfaceLclM?:number};
export type SoundingState={open:boolean;site?:SoundingSite;model:string;timestamp:number;status:'loading'|'ready'|'error';profile?:SoundingProfile;error?:string};
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
    let parcel:ParcelData|undefined;
    // Use the lowest valid model level; never start a parcel below available data.
    if(usable.length>=3&&!usable.some(l=>l.gapBefore)&&usable[0].dewPointC!==undefined){
        try{
            const candidate=parcelTrajectory(usable.map(l=>l.pressureHpa),usable.map(l=>l.heightM),usable.map(l=>l.temperatureC+273.15),3,Math.max(terrainM??usable[0].heightM,usable[0].heightM),usable[0].dewPointC+273.15,80);
            if(candidate.dry.length>1&&finite(candidate.thermalTopElev)&&candidate.thermalTopElev>usable[0].heightM)parcel=candidate;
        }catch{/* Incomplete thermodynamics must not prevent the observed model profile. */}
    }
    const surfaceLclM=sampleLcl(data,timestamp).lclAslM;
    return{surfaceLclM,levels:usable,terrainM,takeoffM:finite(data?.header?.elevation)?data.header.elevation:undefined,timestamp,parcel};
}
export function createSoundingController({fetch,onChange,now=Date.now}:{fetch:(site:SoundingSite,model:string)=>Promise<any>;onChange:(state:SoundingState)=>void;now?:()=>number}){
    let state:SoundingState={open:false,model:'',timestamp:0,status:'loading'},sequence=0,destroyed=false,wanted='';
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
                if(!work){work=Promise.resolve().then(()=>fetch(site,model));pending.set(key,work);void work.finally(()=>{if(pending.get(key)===work)pending.delete(key);}).catch(()=>{});}
                payload=await work;
                if(!destroyed){cache.delete(key);cache.set(key,{payload,time:now()});if(cache.size>4)cache.delete(cache.keys().next().value!);}
            }
            const profile=sampleSounding(payload,timestamp);
            if(!destroyed&&ticket===sequence)publish({open:true,site,model,timestamp,status:'ready',profile});
        }catch(error){if(!destroyed&&ticket===sequence)publish({open:true,site,model,timestamp,status:'error',error:error instanceof Error?error.message:'Could not load the sounding. Try again.'});}
    }
    return{
        open:(site:SoundingSite,model:string,timestamp:number)=>load(site,model,timestamp),
        sync:(model:string,timestamp:number)=>state.open&&state.site?load(state.site,model,timestamp):Promise.resolve(),
        retry:()=>state.open&&state.site?load(state.site,state.model,state.timestamp,true):Promise.resolve(),
        close(){sequence++;wanted='';publish({...state,open:false});},
        destroy(){destroyed=true;sequence++;cache.clear();pending.clear();state={...state,open:false};},
    };
}
