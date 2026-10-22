// Atmospheric point-forecast products exposed by Windy's fetch API.
// Wave, air-quality and observation products cannot supply site wind forecasts.
const models = {
    ukv: 'UKV', ecmwf: 'ECMWF', gfs: 'GFS', icon: 'ICON', iconEu: 'ICON-EU', iconD2: 'ICON-D2',
    arome: 'AROME', aromeFrance: 'AROME France', aromeAntilles: 'AROME Antilles', aromeReunion: 'AROME Reunion',
    mblue: 'Meteoblue AI', namConus: 'NAM CONUS', namAlaska: 'NAM Alaska', namHawaii: 'NAM Hawaii',
    hrrrConus: 'HRRR CONUS', hrrrAlaska: 'HRRR Alaska', canHrdps: 'HRDPS', czeAladin: 'ALADIN',
    bomAccess: 'ACCESS', bomAccessAd: 'ACCESS Adelaide', bomAccessBn: 'ACCESS Brisbane',
    bomAccessDn: 'ACCESS Darwin', bomAccessNq: 'ACCESS North Queensland', bomAccessPh: 'ACCESS Perth',
    bomAccessSy: 'ACCESS Sydney', bomAccessVt: 'ACCESS Victoria', jmaMsm: 'MSM',
} as const;
export type ForecastModel = keyof typeof models;
export type ForecastModelOption = { id: ForecastModel; label: string };
export function pointModelSupported(model: unknown): model is ForecastModel {
    return typeof model === 'string' && Object.hasOwn(models, model);
}
export function forecastModelLabel(model: unknown): string {
    return pointModelSupported(model) ? models[model] : typeof model === 'string' ? model.toUpperCase() : 'Weather';
}
export function forecastModelOptions(available: readonly unknown[], current?: unknown): ForecastModelOption[] {
    const choices = new Set([...available, current].filter(pointModelSupported));
    // Stable order across locations, including point-only Meteoblue AI. Keep
    // the current model visible when it was selected elsewhere in Windy.
    return (Object.keys(models) as ForecastModel[]).filter(id => choices.has(id))
        .map(id => ({ id, label: models[id] }));
}
const normalize = (model: string) => model.toLowerCase().replace(/[^a-z0-9]/g, '');
export function responseMatchesModel(expected: string, actual: unknown): boolean {
    if (!pointModelSupported(expected) || typeof actual !== 'string') return false;
    // Keep regional models distinct; never accept a fallback to another model.
    return normalize(actual) === normalize(expected) || normalize(actual) === normalize(models[expected]);
}
