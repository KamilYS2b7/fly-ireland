import type {SoundingProfile} from './sounding';
import {soundingAtHeight} from './soundingInsights.ts';
import {mixingRatio,saturationVaporPressure} from './vendor/flyxc/atmosphere.ts';
export type ThermalPoint={heightM:number;speedMps:number};
export type ThermalScenario={points:ThermalPoint[];radiusM:number;excessK:number;endReason:'stalled'|'condensation'|'missing'|'profile-end'};
export type ThermalEstimate={status:'available'|'unavailable';central:ThermalScenario;low:ThermalScenario;high:ThermalScenario;initialExcessK:number;radiusM:number};
const KAPPA=287/1005,EPSILON=18.01528/28.9644,G=9.80665;
const finite=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value);
const virtualTemperature=(tempK:number,mixing:number)=>tempK*(1+mixing/EPSILON)/(1+mixing);
function environment(profile:SoundingProfile,height:number){
    const p=soundingAtHeight(profile,height);
    if(!p||!finite(p.dewPointC)||!finite(p.temperatureC)||p.dewPointC>p.temperatureC+.2)return;
    const tempK=p.temperatureC+273.15,vapor=saturationVaporPressure(p.dewPointC+273.15),pressure=p.pressureHpa;
    if(vapor<=0||vapor>=pressure*.95)return;
    return{pressure,tempK,theta:tempK*Math.pow(1000/pressure,KAPPA),mixing:mixingRatio(vapor,pressure)};
}
/**
 * Experimental entraining DRY parcel. Not a calibrated thermal forecast.
 * Potential temperature and water-vapour mixing ratio relax toward the environment
 * at epsilon=2*alpha/R (alpha=.1). Momentum includes entrainment, spherical drag
 * (Cd=.5), added mass (.5), and virtual-temperature buoyancy.
 * d(w²)/dz = 2 B/(1+addedMass) - 2 gamma w²,
 * gamma=epsilon+3 Cd/[8 R (1+addedMass)]. Energy is solved exactly over each 10 m
 * step using midpoint buoyancy. Ascent starts at rest at the lowest model level.
 * No wet/cloud physics, terrain forcing, radiative heating or wing sink rate.
 */
export function thermalScenario(profile:SoundingProfile,{radiusM,excessK}:{radiusM:number;excessK:number}):ThermalScenario{
    if(!finite(radiusM)||radiusM<25||radiusM>500||!finite(excessK)||excessK<0||excessK>5)throw RangeError('Unsupported thermal scenario assumptions.');
    const points:ThermalPoint[]=[],result=(endReason:ThermalScenario['endReason'])=>({points,radiusM,excessK,endReason});
    if(profile.levels.length<2)return result('missing');
    const start=profile.levels[0].heightM,ceiling=Math.min(7000,profile.levels.at(-1)!.heightM),initial=environment(profile,start);
    if(!initial||start>=ceiling)return result('missing');
    const epsilon=.2/radiusM,addedMass=.5,drag=.5,gamma=epsilon+3*drag/(8*radiusM*(1+addedMass));
    let theta=(initial.tempK+excessK)*Math.pow(1000/initial.pressure,KAPPA),mixing=initial.mixing,energy=0;
    const initialSaturation=saturationVaporPressure(initial.tempK+excessK);
    if(!finite(initialSaturation)||initialSaturation>=initial.pressure*.95)return result('missing');
    let deficit=mixingRatio(initialSaturation,initial.pressure)-mixing;
    points.push({heightM:start,speedMps:0});
    if(deficit<=0)return result('condensation');
    for(let z=start;z<ceiling-1e-6;){
        const dz=Math.min(10,ceiling-z),mid=environment(profile,z+dz/2),end=environment(profile,z+dz);
        if(!mid||!end)return result('missing');
        const decay=Math.exp(-epsilon*dz),half=Math.sqrt(decay);
        const midTheta=mid.theta+(theta-mid.theta)*half,midMixing=mid.mixing+(mixing-mid.mixing)*half;
        const midTemp=midTheta*Math.pow(mid.pressure/1000,KAPPA);
        const buoyancy=G*(virtualTemperature(midTemp,midMixing)/virtualTemperature(mid.tempK,mid.mixing)-1);
        const steady=buoyancy/((1+addedMass)*gamma);
        const energyAt=(distance:number)=>steady+(energy-steady)*Math.exp(-2*gamma*distance);
        const nextEnergy=energyAt(dz);
        const nextTheta=mid.theta+(theta-mid.theta)*decay,nextMixing=mid.mixing+(mixing-mid.mixing)*decay;
        const nextTemp=nextTheta*Math.pow(end.pressure/1000,KAPPA),sat=saturationVaporPressure(nextTemp);
        if(!finite(sat)||sat>=end.pressure*.95)return result('missing');
        const nextDeficit=mixingRatio(sat,end.pressure)-nextMixing;
        const condDistance=nextDeficit<=0?dz*deficit/(deficit-nextDeficit):Infinity;
        const stallDistance=nextEnergy<=0?(energy<=0?0:Math.max(0,Math.min(dz,-Math.log(-steady/(energy-steady))/(2*gamma)))):Infinity;
        const distance=Math.min(dz,condDistance,stallDistance);
        if(!finite(distance)||!finite(nextEnergy))return result('missing');
        const terminalEnergy=distance===stallDistance?0:Math.max(0,energyAt(distance));
        if(distance>1e-6)points.push({heightM:z+distance,speedMps:Math.sqrt(terminalEnergy)});
        if(stallDistance<=condDistance&&stallDistance<=dz)return result('stalled');
        if(condDistance<=dz)return result('condensation');
        z+=dz;theta=nextTheta;mixing=nextMixing;energy=Math.max(0,nextEnergy);deficit=nextDeficit;
    }
    return result('profile-end');
}
export function estimateThermalUpdraft(profile:SoundingProfile):ThermalEstimate{
    const central=thermalScenario(profile,{radiusM:100,excessK:3}),low=thermalScenario(profile,{radiusM:50,excessK:3}),high=thermalScenario(profile,{radiusM:200,excessK:3});
    return{status:central.points.length>1?'available':'unavailable',central,low,high,initialExcessK:3,radiusM:100};
}
function sampleScenario(scenario:ThermalScenario,height:number){
    const points=scenario.points,index=points.findIndex(p=>p.heightM>=height);
    if(index<0||!points.length||height<points[0].heightM)return;
    const b=points[index],a=b.heightM===height?b:points[index-1];if(!a)return;
    return a===b?b.speedMps:a.speedMps+(b.speedMps-a.speedMps)*(height-a.heightM)/(b.heightM-a.heightM);
}
export function thermalAtHeight(estimate:ThermalEstimate,height:number){
    if(estimate.status!=='available')return;
    const speedMps=sampleScenario(estimate.central,height);if(speedMps===undefined)return;
    const a=sampleScenario(estimate.low,height),b=sampleScenario(estimate.high,height);
    return{speedMps,lowMps:a===undefined||b===undefined?undefined:Math.min(a,b,speedMps),highMps:a===undefined||b===undefined?undefined:Math.max(a,b,speedMps)};
}
