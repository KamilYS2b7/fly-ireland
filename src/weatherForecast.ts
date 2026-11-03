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
        ...(Number.isFinite(payload.header?.modelElevation)?{cloudBaseAslM:payload.header.modelElevation+a+(b-a)*ratio}:{}),
        cloudBaseReference:series.reference, cloudBaseEstimated:series.estimated};
}

export function cloudBaseMarkerDisplay(reading:Partial<WindReading>) {
    const cloud=cloudBaseDisplay(reading),lcl=lclDisplay(reading);
    const parts=[];
    if(reading.cloudBaseStatus==='available')parts.push(`CB: ${cloud.value}`);
    if(reading.lclStatus==='available')parts.push(`LCL: ${lcl.value}`);
    return {text:parts.join('\n')||(reading.status==='loading'?'CB: Loading…':'CB: No data'),
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
    const aslValue=datum==='AGL'&&Number.isFinite(reading.cloudBaseAslM)?`${heightFormat.format(reading.cloudBaseAslM!)} m ASL`:'';
    return {label, value, aslValue, reference,
        description:`Model cloud base: ${value}. ${reference}; model terrain can differ from the actual launch elevation.`};
}
