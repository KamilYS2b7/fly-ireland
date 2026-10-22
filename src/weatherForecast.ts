import type {WindReading} from './windForecast';

type CloudSeries = {times: number[]; bases: (number | undefined)[]; reference: 'AGL' | 'ASL'; estimated: boolean};
const cloudSeries = new WeakMap<object, CloudSeries | null>();
const heightFormat = new Intl.NumberFormat('en-GB',{maximumFractionDigits:0});
const weatherTimeFormat = new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'UTC'});
const validBase = (value: unknown): value is number => Number.isFinite(value) && (value as number) >= 0 && (value as number) < 50000;

function prepareClouds(payload: any): CloudSeries | undefined {
    if (cloudSeries.has(payload)) return cloudSeries.get(payload) ?? undefined;
    const profile = payload.meteogram, times = profile?.ts;
    let result: CloudSeries | undefined;
    if (Array.isArray(times) && times.length && times.every((t, i) => Number.isFinite(t) && (!i || t > times[i-1]))) {
        if (Array.isArray(profile.cloudBase)) {
            // Windy's native cloudBase is metres AGL, relative to model terrain.
            result = {times, bases: times.map((_t, i) => validBase(profile.cloudBase[i]) ? profile.cloudBase[i] : undefined), reference:'AGL', estimated:false};
        } else if (Number.isFinite(payload.header?.elevation)) {
            const terrain = payload.header.elevation;
            const levels = Object.keys(profile).filter(key => /^cloud-\d+h$/.test(key))
                .map(key => key.slice(6)).sort((a,b) => Number.parseInt(b)-Number.parseInt(a));
            // UKV has cloud profiles rather than a native cloud-base field.
            // Estimate the first 50% cloud-cover crossing above local terrain.
            // Geopotential heights are ASL; keep that datum explicit rather than
            // treating model terrain and the launch elevation as interchangeable.
            const bases = times.map((_t, i) => {
                let lowHeight: number | undefined, lowCloud: number | undefined;
                for (const level of levels) {
                    const height = profile[`gh-${level}`]?.[i], cloud = profile[`cloud-${level}`]?.[i];
                    if (!Number.isFinite(height) || !Number.isFinite(cloud) || cloud < 0 || cloud > 100) {lowHeight=undefined;lowCloud=undefined;continue;}
                    if (height < terrain) continue;
                    if (cloud >= 50) {
                        // Do not assume clear air at the launch or bridge a
                        // missing layer. An already-cloudy lowest level cannot
                        // establish the cloud base above this site.
                        if (lowHeight === undefined || lowCloud === undefined || height <= lowHeight) return;
                        return Math.round(lowHeight + (height-lowHeight)*(50-lowCloud)/(cloud-lowCloud));
                    }
                    lowHeight = height; lowCloud = cloud;
                }
            });
            result = {times, bases, reference:'ASL', estimated:true};
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
        cloudBaseReference:series.reference, cloudBaseEstimated:series.estimated};
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
    const label = reading.cloudBaseEstimated ? 'Est. cloud base' : 'Cloud base';
    if (reading.status === 'loading' || reading.cloudBaseStatus === 'loading') return {label, value:'Loading…', reference:'', description:'Cloud-base forecast is loading.'};
    const datum = reading.cloudBaseReference;
    if (reading.cloudBaseStatus !== 'available' || !validBase(reading.cloudBaseM) || (datum !== 'AGL' && datum !== 'ASL')) {
        return {label, value:'No data', reference:'', description:'Cloud-base forecast unavailable for this model and time.'};
    }
    const reference = datum === 'AGL' ? 'Above model ground' : 'Above mean sea level';
    const value = `${heightFormat.format(reading.cloudBaseM!)} m ${datum}`;
    return {label, value, reference, description:reading.cloudBaseEstimated
        ? `Estimated cloud base: ${value}. ${reference}. First 50% cloud-cover crossing in the forecast profile above local terrain.`
        : `Cloud base: ${value}. ${reference}; model terrain can differ from the actual launch elevation.`};
}
