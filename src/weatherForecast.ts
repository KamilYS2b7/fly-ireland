import type {WindReading} from './windForecast';
import {lclDisplay} from './lclForecast.ts';

type CloudSeries = {times: number[]; bases: (number | undefined)[]; reference: 'AGL' | 'ASL'; estimated: boolean};
const cloudSeries = new WeakMap<object, CloudSeries | null>();
const heightFormat = new Intl.NumberFormat('en-GB',{maximumFractionDigits:0});
const weatherTimeFormat = new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'UTC'});
const validBase = (value: unknown): value is number => Number.isFinite(value) && (value as number) >= 0 && (value as number) < 50000;

function prepareClouds(payload: any): CloudSeries | undefined {
    if (cloudSeries.has(payload)) return cloudSeries.get(payload) ?? undefined;
    // The documented point-forecast DTO stores cloud base in data.cbase.
    // Retain support for older meteogram.cloudBase responses.
    const native = Array.isArray(payload.data?.cbase);
    const profile = native ? payload.data : payload.meteogram, times = profile?.ts;
    const bases = native ? profile?.cbase : profile?.cloudBase;
    let result: CloudSeries | undefined;
    if (Array.isArray(times) && times.length && times.every((t, i) => Number.isFinite(t) && (!i || t > times[i-1]))) {
        if (Array.isArray(bases)) {
            // Windy's native cloudBase is metres AGL, relative to model terrain.
            result = {times, bases: times.map((_t, i) => validBase(bases[i]) ? bases[i] : undefined), reference:'AGL', estimated:false};
        }
    }
    cloudSeries.set(payload, result ?? null);
    return result;
}

export function sampleWeather(payload: any, timestamp: number, index: number): Partial<WindReading> {
    const icon = payload.data?.icon?.[index], isDay = payload.data?.isDay?.[index], phase = payload.data?.moonPhase?.[index];
    const validIcon = Number.isInteger(icon) && icon > 0 && icon < 100;
    // Windy encodes twilight as fractions, not just a boolean day/night flag.
    const night = Number.isFinite(isDay) && ((isDay < 1 && isDay > .5) || (isDay > -.5 && isDay <= 0));
    const sourceTime = payload.data?.ts?.[index];
    const nextTime = payload.data?.ts?.[index+1];
    const period = nextTime === undefined ? sourceTime-payload.data?.ts?.[index-1] : nextTime-sourceTime;
    const reading: Partial<WindReading> = {weatherStatus:validIcon ? 'available' : 'unavailable',
        weatherIcon:validIcon ? icon : undefined, weatherIsNight:night,
        weatherMoonPhase:Number.isInteger(phase) && phase >= 0 && phase <= 30 ? phase : undefined,
        weatherTimestamp:validIcon && Number.isFinite(sourceTime) ? sourceTime : undefined,
        weatherStepHours:validIcon && Number.isFinite(period) && period > 0 ? period/3600000 : undefined,
        cloudBaseStatus:'unavailable'};
    const series = prepareClouds(payload);
    if (!series || timestamp < series.times[0] || timestamp > series.times.at(-1)!) return reading;
    const right = series.times.findIndex(t => t >= timestamp), left = series.times[right] === timestamp ? right : right-1;
    const a = series.bases[left], b = series.bases[right];
    if (!validBase(a) || !validBase(b)) return reading;
    const ratio = left === right ? 0 : (timestamp-series.times[left])/(series.times[right]-series.times[left]);
    return {...reading, cloudBaseStatus:'available', cloudBaseM:a+(b-a)*ratio,
        ...(Number.isFinite(payload.header?.modelElevation)?{cloudBaseAslM:payload.header.modelElevation+a+(b-a)*ratio,
            ...(Number.isFinite(payload.header?.elevation)?{cloudBaseAboveSiteM:payload.header.modelElevation+a+(b-a)*ratio-payload.header.elevation}:{})}:{}),
        cloudBaseReference:series.reference, cloudBaseEstimated:series.estimated};
}

export function cloudBaseMarkerDisplay(reading:Partial<WindReading>,compact=false) {
    const cloud=cloudBaseDisplay(reading),lcl=lclDisplay(reading);
    const rows:{label:string;value:string;tone:string}[]=[];
    if(reading.cloudBaseStatus==='available'){
        rows.push({label:'CB · sea level',value:cloud.aslValue||'No ASL data',tone:cloud.siteTone??'unknown'});
        rows.push({label:(reading.cloudBaseAboveSiteM??0)<0?'CB · below takeoff':'CB · above takeoff',value:cloud.siteValue?.replace(/ (above|below) takeoff$/,'')||'No elevation data',tone:cloud.siteTone??'unknown'});
    }
    if(reading.lclStatus==='available'){
        rows.push({label:'LCL · sea level',value:lcl.aslValue||'No ASL data',tone:lcl.siteTone??'unknown'});
        rows.push({label:(reading.lclAboveSiteM??0)<0?'LCL · below takeoff':'LCL · above takeoff',value:lcl.siteValue?.replace(/ (above|below) takeoff$/,'')||'No elevation data',tone:lcl.siteTone??'unknown'});
    }
    if(!rows.length)rows.push({label:'Cloud heights',value:reading.status==='loading'?'Loading…':'No data',tone:'unknown'});
    if(compact)for(const row of rows){
        row.label=row.label.replace(' · sea level',' ASL');
        row.value=row.value.replace(' m ASL',' m');
        if(row.value==='No ASL data'||row.value==='No elevation data'||row.value==='Site elevation unavailable')row.value='—';
        if(row.label==='Cloud heights')row.label='CB / LCL';
    }
    const escape=(text:string)=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
    const html=rows.map(row=>`<span class="cloud-height-row" data-clearance="${row.tone}"><span class="cloud-height-label">${escape(row.label)}</span><strong class="cloud-height-value">${escape(row.value)}</strong></span>`).join('');
    return {text:rows.map(row=>`${row.label}: ${row.value}`).join('\n'),html,
        description:`${cloud.description} ${lcl.description}`};
}

export function weatherDisplay(reading: Partial<WindReading>) {
    return {available:reading.weatherStatus === 'available' && Number.isInteger(reading.weatherIcon),
        icon:reading.weatherIcon, night:!!reading.weatherIsNight, moonPhase:reading.weatherMoonPhase,
        description:Number.isFinite(reading.weatherTimestamp)
            ? `Weather source: ${weatherTimeFormat.format(reading.weatherTimestamp)} UTC${Number.isFinite(reading.weatherStepHours) ? ` · ${reading.weatherStepHours}h forecast data` : ''}.`
            : 'Weather at the selected forecast time.'};
}

export function weatherIconUrl(weather: ReturnType<typeof weatherDisplay> | undefined, iconsDir: string): string | undefined {
    if (!weather?.available || !iconsDir || !Number.isInteger(weather.icon) || weather.icon! <= 0 || weather.icon! >= 100) return;
    const suffix = weather.night && Number.isInteger(weather.moonPhase) ? `_night_${weather.moonPhase}` : '';
    return `${iconsDir}/png_25@2x/${weather.icon}${suffix}.png`;
}

export function cloudBaseDisplay(reading: Partial<WindReading>) {
    const label = 'Cloud base';
    if (reading.status === 'loading' || reading.cloudBaseStatus === 'loading') return {label, value:'Loading…', aslValue:'', reference:'', description:'Cloud-base forecast is loading.'};
    const datum = reading.cloudBaseReference;
    if (reading.cloudBaseStatus !== 'available' || !validBase(reading.cloudBaseM) || (datum !== 'AGL' && datum !== 'ASL')) {
        return {label, value:'No data', aslValue:'', reference:'', description:'Cloud-base forecast unavailable for this model and time.'};
    }
    const reference = datum === 'AGL' ? 'Above model ground' : 'Above mean sea level';
    const value = `${heightFormat.format(reading.cloudBaseM!)} m ${datum}`;
    const aslValue=datum==='ASL'?value:Number.isFinite(reading.cloudBaseAslM)?`${heightFormat.format(reading.cloudBaseAslM!)} m ASL`:'';
    const clearance=reading.cloudBaseAboveSiteM;
    const siteTone=!Number.isFinite(clearance)?'unknown':clearance!<0?'below':clearance!>0?'above':'level';
    const siteValue=Number.isFinite(clearance)?`${heightFormat.format(Math.abs(clearance!))} m ${clearance!<0?'below':'above'} takeoff`:'Site elevation unavailable';
    return {label, value, aslValue, reference, siteValue, siteTone,
        description:`Model cloud base: ${aslValue||"ASL elevation unavailable"}. ${siteValue}. Site clearance uses terrain at the site coordinates, not a surveyed take-off height.`};
}
