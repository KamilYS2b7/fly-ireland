import { evaluateWind } from './windForecast.ts';
import { samplePointForecast } from './pointSampler.ts';
import type { ForecastSpot, WindReading } from './windForecast';

type Vector = [number, number];
type Level = { z: number; vector: Vector };
const blend = (a: Vector, b: Vector, fraction: number): Vector =>
    [a[0] + (b[0] - a[0]) * fraction, a[1] + (b[1] - a[1]) * fraction];

// This is a vertical-profile estimate, not a simulation of local ridge flow.
// Heights are metres AMSL; only the surface anchor is 10 m above model ground.
export function sampleAltitudeForecast(
    spot: ForecastSpot, point: any, profile: any, timestamp: number,
): WindReading {
    const surface = samplePointForecast(spot, point, timestamp);
    const header = point?.data?.header;
    const elevation = header?.elevation;
    const modelElevation = header?.modelElevation;
    const metadata: Partial<WindReading> = {
        windMode: 'altitude', surfaceMph: surface.mph, surfaceDirection: surface.direction,
        elevationM: Number.isFinite(elevation) ? elevation : undefined,
        modelElevationM: Number.isFinite(modelElevation) ? modelElevation : undefined,
        targetHeightM: Number.isFinite(elevation) ? elevation + 10 : undefined,
    };
    const missing = (altitudeNote: string): WindReading => ({
        ...surface, ...metadata, status: 'unavailable', mph: undefined,
        direction: undefined, reason: undefined, altitudeNote,
    });
    const payload = profile?.data;
    if (point?.status !== 200 || profile?.status !== 200 ||
        header?.model?.toLowerCase() !== 'ukv' || payload?.header?.model?.toLowerCase() !== 'ukv')
        return missing('UKV profile unavailable');
    const run = Date.parse(header.refTime), profileRun = Date.parse(payload.header.refTime);
    if (!Number.isFinite(run) || run !== profileRun) return missing('Forecast runs differ or are unknown');
    if (!Number.isFinite(elevation) || !Number.isFinite(modelElevation) ||
        !Number.isFinite(payload.header.modelElevation) ||
        Math.abs(modelElevation - payload.header.modelElevation) > 1)
        return missing('Terrain heights unavailable or inconsistent');
    const target = elevation + 10, surfaceHeight = modelElevation + 10;
    if (target < surfaceHeight) return missing('Target is below model surface');
    const data = payload.data, times = data?.hours;
    if (!Array.isArray(times) || !times.length || !Number.isFinite(timestamp) ||
        times.some((t: number, i: number) => !Number.isFinite(t) || (i > 0 && t <= times[i - 1])) ||
        timestamp < times[0] || timestamp > times[times.length - 1])
        return missing('Time outside the available profile');
    const right = times.findIndex((t: number) => t >= timestamp);
    const left = times[right] === timestamp ? right : right - 1;
    function at(index: number): Vector | undefined {
        const levels: Level[] = [];
        const add = (key: string, z: unknown) => {
            const u = data[`wind_u-${key}`]?.[index], v = data[`wind_v-${key}`]?.[index];
            if (typeof z === 'number' && Number.isFinite(z) && z >= surfaceHeight &&
                Number.isFinite(u) && Number.isFinite(v)) levels.push({ z, vector: [u, v] });
        };
        add('surface', surfaceHeight);
        for (const key of Object.keys(data)) {
            if (/^gh-\d+h$/.test(key)) add(key.slice(3), data[key]?.[index]);
        }
        levels.sort((a, b) => a.z - b.z);
        const exact = levels.find(level => Math.abs(level.z - target) < 1e-6);
        if (exact) return exact.vector;
        const upper = levels.findIndex(level => level.z > target);
        if (upper <= 0) return undefined;
        const a = levels[upper - 1], b = levels[upper];
        return blend(a.vector, b.vector, (target - a.z) / (b.z - a.z));
    }
    const a = at(left), b = left === right ? a : at(right);
    if (!a || !b) return missing('No layers bracket the launch height');
    const vector = left === right ? a : blend(a, b, (timestamp - times[left]) / (times[right] - times[left]));
    const estimate = evaluateWind(spot, vector);
    return { ...surface, ...estimate, ...metadata,
        mph: estimate.mph, direction: estimate.direction, reason: estimate.reason,
        altitudeNote: 'Estimated at terrain + 10 m' };
}
