import {windRanges,directionMatches} from './windRanges.ts';
import type {WindRange} from './windRanges';
export type ForecastSpot = {
    id: string;
    lat: number;
    lon: number;
    sectorStart: number;
    sectorEnd: number;
    windRanges?: WindRange[];
    directionUnverified?: boolean;
};

export type WindReading = {
    requestStatus?: number;
    retrying?: boolean;
    model?: string;
    level?: string;
    levelEstimated?: boolean;
    levelHeightM?: number;
    levelNote?: string;
    windMode?: 'surface' | 'altitude';
    surfaceMph?: number;
    surfaceDirection?: number;
    elevationM?: number;
    modelElevationM?: number;
    targetHeightM?: number;
    altitudeNote?: string;
    status: 'loading' | 'settings' | 'unavailable' | 'pass' | 'fail';
    timestamp?: number;
    mph?: number;
    direction?: number;
    gustMph?: number;
    gustStatus?: 'loading' | 'available' | 'unavailable';
    rainStatus?: 'loading' | 'available' | 'unavailable';
    rainMm?: number;
    rainStart?: number;
    rainEnd?: number;
    weatherStatus?: 'loading' | 'available' | 'unavailable';
    weatherIcon?: number;
    weatherIsNight?: boolean;
    weatherMoonPhase?: number;
    weatherTimestamp?: number;
    weatherStepHours?: number;
    cloudBaseStatus?: 'loading' | 'available' | 'unavailable';
    cloudBaseM?: number;
    cloudBaseReference?: 'AGL' | 'ASL';
    cloudBaseEstimated?: boolean;
    reason?: 'too-light' | 'too-strong' | 'direction' | 'unverified-direction';
};

const MPH_IN_METRES_PER_SECOND = 0.44704;
export const MIN_MPH = 5;
export const MAX_MPH = 15;
const norm = (degrees: number) => ((degrees % 360) + 360) % 360;

export function evaluateWind(spot: ForecastSpot, values: unknown): WindReading {
    if (!Array.isArray(values) || !Number.isFinite(values[0]) || !Number.isFinite(values[1])) {
        return { status: 'unavailable' };
    }
    const [u, v] = values;
    const speed = Math.hypot(u, v);
    const ranges=windRanges(spot);
    if (!Number.isFinite(speed) || (!ranges.length && !spot.directionUnverified)) {
        return { status: 'unavailable' };
    }
    const mph = speed / MPH_IN_METRES_PER_SECOND;
    if (spot.directionUnverified) return {status:'fail',reason:'unverified-direction',mph,
        ...(speed > 0 ? {direction:norm(Math.atan2(-u,-v)*180/Math.PI)} : {})};
    // Calm is a valid low-speed reading, but has no meaningful direction.
    if (speed === 0) return { status: 'fail', reason: 'too-light', mph };
    const direction = norm(Math.atan2(-u, -v) * 180 / Math.PI);
    const inSector = directionMatches(ranges,direction);
    const reason = mph < MIN_MPH - 1e-9 ? 'too-light'
        : mph > MAX_MPH + 1e-9 ? 'too-strong' : !inSector ? 'direction' : undefined;
    return { status: reason ? 'fail' : 'pass', reason, mph, direction };
}

