import type {WindReading} from './windForecast';

// Bounded weather names/numeric samples only; never headers or full responses.
export function lclInputDiagnostics(payload:any,left:number,right:number) {
    const lines=[`Model: ${String(payload?.header?.model??'unknown').slice(0,40)}`];
    for(const group of ['data','meteogram','airgram']){
        const values=payload?.[group];
        if(!values||typeof values!=='object')continue;
        const keys=Object.keys(values);
        lines.push(`${group} fields: ${keys.slice(0,60).join(', ')}`);
        for(const key of keys.filter(k=>/temp|dew|pressure|humid|^rh$|cbase/i.test(k)).slice(0,12)){
            const sample=(i:number)=>Number.isFinite(values[key]?.[i])?String(values[key][i]):'missing/non-numeric';
            lines.push(`${group}.${key}: ${sample(left)} / ${sample(right)}`);
        }
    }
    return lines.join('\n');
}

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
    const scalar=(values:any,grid:any)=>{
        if(!Array.isArray(grid)||!grid.length||!grid.every((t:number,i:number)=>Number.isFinite(t)&&(!i||t>grid[i-1]))
            ||timestamp<grid[0]||timestamp>grid.at(-1))return undefined;
        const r=grid.findIndex((t:number)=>t>=timestamp),l=grid[r]===timestamp?r:r-1;
        const a=values?.[l],b=values?.[r];
        if(!Number.isFinite(a)||!Number.isFinite(b))return undefined;
        return l===r?a:a+(b-a)*(timestamp-grid[l])/(grid[r]-grid[l]);
    };
    // Observed Windy point format: temperature lives on the surface grid,
    // dewPoint can live in the meteogram with a different time resolution.
    const temperature=scalar(Array.isArray(data.temperature)?data.temperature:data.temp,times);
    const dewPoint=Array.isArray(data.dewPoint)?scalar(data.dewPoint,times)
        :scalar(payload.meteogram?.dewPoint,payload.meteogram?.ts);
    const pressure=scalar(data.pressure,times);
    const absent=[[temperature,'temperature'],[dewPoint,'dew point'],[pressure,'surface pressure']]
        .filter(([value])=>!Number.isFinite(value)).map(([,name])=>name);
    if(absent.length)return {...missing,lclNote:`LCL unavailable: missing ${absent.join(', ')} for this forecast time.`,lclDiagnostics:lclInputDiagnostics(payload,left,right)};
    const lcl=boltonLcl(temperature!,dewPoint!,pressure!);
    if(!lcl)return {...missing,lclNote:'LCL unavailable: forecast inputs or units are outside the supported range.',lclDiagnostics:lclInputDiagnostics(payload,left,right)};
    const terrain=payload.header?.modelElevation;
    const site=payload.header?.elevation;
    const asl=Number.isFinite(terrain)&&terrain>=-500&&terrain<9000?terrain+lcl.heightM:undefined;
    return {lclStatus:'available',lclAglM:lcl.heightM,lclPressurePa:lcl.pressurePa,
        ...(asl!==undefined?{lclAslM:asl}:{}),
        ...(asl!==undefined&&Number.isFinite(site)&&site>=-500&&site<9000?{lclAboveSiteM:asl-site}:{})};
}

const heightFormat=new Intl.NumberFormat('en-GB',{maximumFractionDigits:0});
export function lclDisplay(reading:Partial<WindReading>) {
    const label='Estimated cumulus base (LCL)';
    if(reading.status==='loading'||reading.lclStatus==='loading')return {label,value:'Loading…',aslValue:'',diagnostics:'',description:'Near-surface parcel LCL is loading.'};
    if(reading.lclStatus!=='available'||!Number.isFinite(reading.lclAglM))return {label,value:'No data',aslValue:'',diagnostics:reading.lclDiagnostics??'',description:reading.lclNote??'LCL requires valid near-surface temperature, dew point and surface pressure from the selected model.'};
    const value=`~${heightFormat.format(reading.lclAglM!)} m AGL`;
    const aslValue=Number.isFinite(reading.lclAslM)?`~${heightFormat.format(reading.lclAslM!)} m ASL`:'';
    const siteValue=Number.isFinite(reading.lclAboveSiteM)
        ?`~${heightFormat.format(Math.abs(reading.lclAboveSiteM!))} m ${reading.lclAboveSiteM!<0?'below':'above'} takeoff`
        :'Site elevation unavailable';
    const siteTone=!Number.isFinite(reading.lclAboveSiteM)?'unknown':reading.lclAboveSiteM!<0?'below':reading.lclAboveSiteM!>0?'above':'level';
    return {label,value,aslValue,siteValue,siteTone,diagnostics:'',description:`Bolton parcel LCL with a dry-adiabatic height estimate: ${aslValue||'ASL elevation unavailable'}. ${siteValue}. Site clearance uses Windy's terrain elevation at the site coordinates, not a surveyed take-off height. This does not guarantee cloud formation or the actual cloud base.`};
}
