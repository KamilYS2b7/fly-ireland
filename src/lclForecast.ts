import type {WindReading} from './windForecast';

// Bolton (1980), Eq. 22: lifting-condensation temperature in kelvin.
// Pressure uses dry Poisson ascent; height is a dry-adiabatic estimate.
// This near-surface parcel diagnostic is NOT a forecast of all cloud layers.
export function boltonLcl(temperatureK:number,dewPointK:number,pressurePa:number) {
    if(!Number.isFinite(temperatureK)||temperatureK<183.15||temperatureK>333.15
        ||!Number.isFinite(dewPointK)||dewPointK<173.15||dewPointK>temperatureK
        ||!Number.isFinite(pressurePa)||pressurePa<30000||pressurePa>110000)return;
    const temperature=1/(1/(dewPointK-56)+Math.log(temperatureK/dewPointK)/800)+56;
    const pressure=pressurePa*Math.pow(temperature/temperatureK,1004/287.05);
    const height=1004*(temperatureK-temperature)/9.80665;
    if(!Number.isFinite(height)||height<0||height>15000)return;
    return {heightM:height,pressurePa:pressure,temperatureK:temperature};
}

export function sampleLcl(payload:any,timestamp:number):Partial<WindReading> {
    const missing:Partial<WindReading>={lclStatus:'unavailable'};
    const data=payload?.data,times=data?.ts;
    if(!Array.isArray(times)||!times.length||!times.every((t,i)=>Number.isFinite(t)&&(!i||t>times[i-1]))
        ||!Number.isFinite(timestamp)||timestamp<times[0]||timestamp>times.at(-1))return missing;
    const right=times.findIndex(t=>t>=timestamp),left=times[right]===timestamp?right:right-1;
    const ratio=left===right?0:(timestamp-times[left])/(times[right]-times[left]);
    const inputs=[['temp','temperature'],['dewPoint','dew point'],['pressure','surface pressure']] as const;
    const absent=inputs.filter(([key])=>![data[key]?.[left],data[key]?.[right]].every(Number.isFinite));
    if(absent.length)return {...missing,lclNote:`LCL unavailable: missing ${absent.map(([,name])=>name).join(', ')} for this forecast time.`};
    const a=boltonLcl(data.temp?.[left],data.dewPoint?.[left],data.pressure?.[left]);
    const b=boltonLcl(data.temp?.[right],data.dewPoint?.[right],data.pressure?.[right]);
    if(!a||!b)return {...missing,lclNote:'LCL unavailable: forecast inputs or units are outside the supported range.'};
    const blend=(values:number[])=>values[left]+(values[right]-values[left])*ratio;
    const lcl=boltonLcl(blend(data.temp),blend(data.dewPoint),blend(data.pressure));
    if(!lcl)return missing;
    const terrain=payload.header?.modelElevation;
    return {lclStatus:'available',lclAglM:lcl.heightM,lclPressurePa:lcl.pressurePa,
        ...(Number.isFinite(terrain)&&terrain>=-500&&terrain<9000?{lclAslM:terrain+lcl.heightM}:{})};
}

const heightFormat=new Intl.NumberFormat('en-GB',{maximumFractionDigits:0});
export function lclDisplay(reading:Partial<WindReading>) {
    const label='Estimated cumulus base (LCL)';
    if(reading.status==='loading'||reading.lclStatus==='loading')return {label,value:'Loading…',aslValue:'',description:'Near-surface parcel LCL is loading.'};
    if(reading.lclStatus!=='available'||!Number.isFinite(reading.lclAglM))return {label,value:'No data',aslValue:'',description:reading.lclNote??'LCL requires valid near-surface temperature, dew point and surface pressure from the selected model.'};
    const value=`~${heightFormat.format(reading.lclAglM!)} m AGL`;
    const aslValue=Number.isFinite(reading.lclAslM)?`~${heightFormat.format(reading.lclAslM!)} m ASL`:'';
    return {label,value,aslValue,description:`Bolton parcel LCL with a dry-adiabatic height estimate: ${value}${aslValue?` / ${aslValue}`:''}. AGL is above model ground, not the launch. This does not guarantee cloud formation or the actual cloud base.`};
}
