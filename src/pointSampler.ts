import { evaluateWind } from './windForecast.ts';
import { sampleRain } from './rainForecast.ts';
import { sampleWeather } from './weatherForecast.ts';
import { responseMatchesModel } from './forecastModels.ts';
import { sampleWindLayer } from './windLayers.ts';
import type { ForecastSpot, WindReading } from './windForecast';

// Point forecasts contain the whole time series and never depend on map tiles.
export function samplePointForecast(
    spot: ForecastSpot,
    response: any,
    timestamp: number,
    model = 'ukv',
    level = 'surface',
): WindReading {
    const missing: WindReading = { status: 'unavailable', gustStatus: 'unavailable', rainStatus:'unavailable', weatherStatus:'unavailable', cloudBaseStatus:'unavailable', timestamp, model,level };
    const payload = response?.data;
    if (response?.status !== 200 || !responseMatchesModel(model, payload?.header?.model)) return missing;
    const data = payload.data;
    const times = data?.ts;
    if (
        !Array.isArray(times) ||
        !times.length ||
        !Number.isFinite(timestamp) ||
        timestamp < times[0] ||
        timestamp > times[times.length - 1]
    )
        return missing;
    const right = times.findIndex((time: number) => time >= timestamp);
    if (right < 0) return missing;
    const left = times[right] === timestamp ? right : right - 1;
    if (left < 0 || !Number.isFinite(times[left]) || !Number.isFinite(times[right])) return missing;
    const ratio = left === right ? 0 : (timestamp - times[left]) / (times[right] - times[left]);
    if (!Number.isFinite(ratio)) return missing;
    const scalar = (values: any) => {
        const a = values?.[left],
            b = values?.[right];
        return Number.isFinite(a) && Number.isFinite(b) && a >= 0 && b >= 0
            ? a + (b - a) * ratio
            : undefined;
    };
    const vector = (index: number) => {
        const speed = data.wind?.[index],
            direction = data.windDir?.[index];
        if (!Number.isFinite(speed) || speed < 0 || (speed !== 0 && !Number.isFinite(direction)))
            return null;
        const angle = ((speed === 0 ? 0 : direction) * Math.PI) / 180;
        return [-speed * Math.sin(angle), -speed * Math.cos(angle)];
    };
    const a = vector(left),
        b = vector(right);
    const gust = scalar(data.windGust);
    const reading =
        a && b
            ? evaluateWind(spot, [a[0] + (b[0] - a[0]) * ratio, a[1] + (b[1] - a[1]) * ratio])
            : missing;
    return {
        ...reading,
        ...sampleRain(data,left),
        ...sampleWeather(payload,timestamp,left),
        ...(level==='surface'?{}:sampleWindLayer(spot,payload,timestamp,level)),
        timestamp,
        model,
        level,
        gustStatus: gust === undefined ? 'unavailable' : 'available',
        gustMph: gust === undefined ? undefined : gust / 0.44704,
    };
}

