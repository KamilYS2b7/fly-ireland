import type {WindReading} from './windForecast';

type RainReading = Pick<WindReading,'rainStatus'|'rainMm'|'rainStart'|'rainEnd'>;
export function sampleRain(data: any, index: number): RainReading {
    const missing: RainReading = {rainStatus:'unavailable'};
    const total = data?.precipAmount?.[index], snow = data?.precipSnowAmount?.[index];
    const start = data?.ts?.[index];
    const next = data?.ts?.[index+1];
    const duration = next === undefined ? start - data?.ts?.[index-1] : next - start;
    if (!Number.isFinite(total) || total < 0 || !Number.isFinite(start)
        || !Number.isFinite(duration) || duration <= 0) return missing;
    // v3 detail data uses interval totals, in mm water equivalent. Snow is
    // included in precipAmount; convective precipitation is also already included.
    // Windy's v3 renderer distributes each total across [ts[i], ts[i+1]), rather
    // than interpolating totals between wet and dry intervals. This differs from
    // the public v2 API's explicitly named past3hprecip field.
    // Verified against /v/51.3.2.ind.81aa/plugins/_shared-create-weather-rendering-data.js
    // and _shared-forecast-table.js on windy.com.
    if (total === 0 && (snow === undefined || snow === null || snow === 0)) {
        return {rainStatus:'available',rainMm:0,rainStart:start,rainEnd:start+duration};
    }
    if (!Number.isFinite(snow) || snow < 0 || snow > total + 1e-9) return missing;
    return {rainStatus:'available',rainMm:Math.max(0,total-snow),rainStart:start,rainEnd:start+duration};
}

const dateFormat = new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'UTC'});
export function rainDisplay(reading: Partial<WindReading>) {
    if (reading.rainStatus === 'loading' || reading.status === 'loading') {
        return {wet:false,value:'Loading…',description:'Rain forecast is loading.'};
    }
    const {rainMm:amount,rainStart:start,rainEnd:end} = reading;
    if (reading.rainStatus !== 'available' || !Number.isFinite(amount) || amount! < 0
        || !Number.isFinite(start) || !Number.isFinite(end) || end! <= start!) {
        return {wet:false,value:'No data',description:'Rain forecast unavailable.'};
    }
    const amountText = amount! > 0 && amount! < 0.1 ? '<0.1' : amount!.toFixed(1);
    const hours = (end! - start!)/3600000;
    return {wet:amount! > 0,value:`${amountText} mm / ${hours}h`,
        description:`Rain: ${amountText} mm over ${dateFormat.format(start)} – ${dateFormat.format(end)} UTC. Forecast interval total.`};
}

// Fixed SVG markup shared by map markers and cards; no user-provided HTML.
export const RAIN_DROPS_SVG = '<svg class="rain-drops" viewBox="0 0 30 18" width="30" height="18" aria-hidden="true"><path d="M5 3C4 5 1 8 1 11a4 4 0 0 0 8 0C9 8 6 5 5 3Z M15 0c-1 2-4 5-4 8a4 4 0 0 0 8 0c0-3-3-6-4-8Z M25 3c-1 2-4 5-4 8a4 4 0 0 0 8 0c0-3-3-6-4-8Z"/></svg>';
