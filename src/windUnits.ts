export const WIND_UNITS = ['mph','km/h','m/s','kt'] as const;
export type WindUnit = typeof WIND_UNITS[number];
export const WIND_UNIT_STORAGE_KEY = 'fly-ireland.wind-unit.v1';
type UnitStorage = Pick<Storage,'getItem'|'setItem'>;
const factors: Record<WindUnit,number> = {mph:1,'km/h':1.609344,'m/s':0.44704,kt:0.44704/ (1852/3600)};

export function normalizeWindUnit(value: unknown): WindUnit {
    return WIND_UNITS.includes(value as WindUnit) ? value as WindUnit : 'mph';
}
export function convertWindSpeed(mph: number, unit: WindUnit): number {
    return mph*factors[normalizeWindUnit(unit)];
}
export function formatWindSpeed(mph: number, unit: WindUnit): string {
    return Number.isFinite(mph) && mph >= 0 ? `${convertWindSpeed(mph,unit).toFixed(1)} ${normalizeWindUnit(unit)}` : 'No data';
}
export function windSpeedRange(unit: WindUnit): string {
    const normalized = normalizeWindUnit(unit);
    const limit = (mph: number) => convertWindSpeed(mph,normalized).toFixed(1).replace(/\.0$/,'');
    return `${limit(5)}–${limit(13)} ${normalized}`;
}
export function readWindUnit(storage?: UnitStorage): WindUnit {
    try {return normalizeWindUnit((storage ?? globalThis.localStorage)?.getItem(WIND_UNIT_STORAGE_KEY));}
    catch {return 'mph';}
}
export function saveWindUnit(unit: WindUnit, storage?: UnitStorage) {
    try {(storage ?? globalThis.localStorage)?.setItem(WIND_UNIT_STORAGE_KEY,normalizeWindUnit(unit));}
    catch { /* Blocked storage must not prevent changing display units. */ }
}
