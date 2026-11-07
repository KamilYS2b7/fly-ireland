import type {SoundingLevel,SoundingProfile} from './sounding';
import {boltonLcl} from './lclForecast.ts';
import {dryLapse} from './vendor/flyxc/atmosphere.ts';
export const WIND_CHANGE_THRESHOLD=1; // vector m/s per 100 m between model levels
const finite=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value);
const vector=(speed:number,direction:number)=>({u:-speed*Math.sin(direction*Math.PI/180),v:-speed*Math.cos(direction*Math.PI/180)});
export function soundingAtHeight(profile:SoundingProfile,heightM:number){
    const levels=profile.levels,index=levels.findIndex(l=>l.heightM>=heightM);
    if(index<0||heightM<levels[0].heightM)return;
    const b=levels[index],a=b.heightM===heightM?b:levels[index-1];
    if(!a||(a!==b&&b.gapBefore))return;
    const f=a===b?0:(heightM-a.heightM)/(b.heightM-a.heightM);
    const blend=(a:unknown,b:unknown)=>finite(a)&&finite(b)?a+(b-a)*f:undefined;
    let windMps=blend(a.windMps,b.windMps),windDirection:number|undefined;
    if(finite(a.windMps)&&finite(b.windMps)&&finite(a.windDirection)&&finite(b.windDirection)){
        const va=vector(a.windMps,a.windDirection),vb=vector(b.windMps,b.windDirection);
        const u=va.u+(vb.u-va.u)*f,v=va.v+(vb.v-va.v)*f;
        windMps=Math.hypot(u,v);if(windMps>=1e-6)windDirection=(Math.atan2(-u,-v)*180/Math.PI+360)%360;
    }
    return{heightM,aboveTakeoffM:finite(profile.takeoffM)?heightM-profile.takeoffM:undefined,
        pressureHpa:a.pressureHpa*Math.pow(b.pressureHpa/a.pressureHpa,f),temperatureC:blend(a.temperatureC,b.temperatureC)!,dewPointC:blend(a.dewPointC,b.dewPointC),windMps,windDirection};
}
export function soundingInsights(profile:SoundingProfile){
    const levels=profile.levels;
    const inversions:{bottomM:number;topM:number;temperatureRiseC:number}[]=[],windChanges:{bottomM:number;topM:number;vectorMpsPer100m:number}[]=[],freezingLevels:number[]=[];
    const first=levels[0];
    const lclEstimate=finite(first.dewPointC)?boltonLcl(first.temperatureC+273.15,first.dewPointC+273.15,first.pressureHpa*100):undefined;
    const lcl=finite(profile.surfaceLclM)?{heightM:profile.surfaceLclM,source:'surface parcel'}:lclEstimate?{heightM:first.heightM+lclEstimate.heightM,source:'lowest model level'}:undefined;
    let dryTopM:number|undefined,canTrace=true;
    const dryDifference=(level:SoundingLevel)=>dryLapse(level.pressureHpa,first.temperatureC+273.15+3,first.pressureHpa)-(level.temperatureC+273.15);
    for(let i=1;i<levels.length;i++){
        const a=levels[i-1],b=levels[i],dz=b.heightM-a.heightM;
        if(b.gapBefore||dz<=0){canTrace=false;continue;}
        if(canTrace&&dryTopM===undefined){const da=dryDifference(a),db=dryDifference(b);if(da>0&&db<=0)dryTopM=a.heightM+dz*da/(da-db);}
        if(b.temperatureC>a.temperatureC+1e-6){
            const previous=inversions.at(-1);
            if(previous?.topM===a.heightM){previous.topM=b.heightM;previous.temperatureRiseC+=b.temperatureC-a.temperatureC;}
            else inversions.push({bottomM:a.heightM,topM:b.heightM,temperatureRiseC:b.temperatureC-a.temperatureC});
        }
        for(const height of [a.temperatureC===0?a.heightM:undefined,b.temperatureC===0?b.heightM:undefined,a.temperatureC*b.temperatureC<0?a.heightM+dz*a.temperatureC/(a.temperatureC-b.temperatureC):undefined]){
            if(finite(height)&&!freezingLevels.some(z=>Math.abs(z-height)<1))freezingLevels.push(height);
        }
        if(finite(a.windMps)&&finite(b.windMps)&&finite(a.windDirection)&&finite(b.windDirection)){
            const va=vector(a.windMps,a.windDirection),vb=vector(b.windMps,b.windDirection);
            const shear=Math.hypot(vb.u-va.u,vb.v-va.v)/dz*100;
            if(shear>=WIND_CHANGE_THRESHOLD)windChanges.push({bottomM:a.heightM,topM:b.heightM,vectorMpsPer100m:shear});
        }
    }
    return{lcl,dryTopM,inversions,windChanges,freezingLevels:freezingLevels.sort((a,b)=>a-b)};
}

// Keep 10 m wind separate from pressure-level thermodynamics and parcel physics.
export function soundingWindAtHeight(profile:SoundingProfile,heightM:number){
 const first=profile.levels[0],surface=profile.surfaceWind;
 if(heightM>=first.heightM){const point=soundingAtHeight(profile,heightM);return point?.windMps===undefined?undefined:{windMps:point.windMps,windDirection:point.windDirection};}
 if(!surface||heightM<surface.heightM||surface.heightM>=first.heightM)return;
 if(heightM===surface.heightM)return surface;
 if(first.windMps===undefined)return;
 const f=(heightM-surface.heightM)/(first.heightM-surface.heightM);
 if(surface.windDirection!==undefined&&first.windDirection!==undefined){
  const a=vector(surface.windMps,surface.windDirection),b=vector(first.windMps,first.windDirection),u=a.u+(b.u-a.u)*f,v=a.v+(b.v-a.v)*f,windMps=Math.hypot(u,v);
  return{windMps,windDirection:windMps<1e-6?undefined:(Math.atan2(-u,-v)*180/Math.PI+360)%360};
 }
 return{windMps:surface.windMps+(first.windMps-surface.windMps)*f,windDirection:undefined};
}
