import type { ForecastSpot, WindReading } from './windForecast';
import type { SiteMetadata } from './siteCatalog';
import {rainDisplay} from './rainForecast.ts';
import {gustWarningDisplay} from './gustWarning.ts';
import {weatherDisplay,cloudBaseDisplay} from './weatherForecast.ts';
import {formatWindRanges,windRanges,directionMatches} from './windRanges.ts';
import {forecastModelLabel} from './forecastModels.ts';
import {formatWindSpeed,windSpeedRange} from './windUnits.ts';
import type {WindUnit} from './windUnits';
import {windLevelLabel} from './windLayers.ts';
import {formatForecastTime} from './forecastTime.ts';

export type NamedSpot = ForecastSpot & SiteMetadata & { name: string };
export type PanelSite = NamedSpot & {
    required: string; forecast: string; speed: string; gust: string;
    gustWarning: ReturnType<typeof gustWarningDisplay>;
    direction?: number; status: WindReading['status'] | 'review'; label: string;
    windMatched: boolean;
    rain: ReturnType<typeof rainDisplay>;
    weather: ReturnType<typeof weatherDisplay>;
    cloudBase: ReturnType<typeof cloudBaseDisplay>;
    levelEstimated?: boolean; layerHeight?: string;
    surfaceForecast?: string; heightInfo?: string; targetHeightM?: number; altitudeNote?: string;
};
export function buildSitePanel(spots: NamedSpot[], getReading: (spot: NamedSpot) => WindReading, timestamp: number, model = 'ukv', unit: WindUnit = 'mph', level = 'surface', utcOffset?: number) {
    const allSites: PanelSite[] = [];
    let loading = 0;
    let unavailable = 0;
    let settings = false;
    let requestStatus: number | undefined;
    let retrying = false;
    const weatherSteps = new Set<number>();
    for (const spot of spots) {
        if (spot.toVerify) {
            allSites.push({...spot,status:'review',windMatched:false,label:spot.reviewState==='accepted'?'Location accepted':'To verify',required:'Not verified',
                forecast:'Not assessed',speed:'Not assessed',gust:'Not assessed',gustWarning:gustWarningDisplay({}),rain:rainDisplay({}),weather:weatherDisplay({}),cloudBase:cloudBaseDisplay({})});
            continue;
        }
        let reading = getReading(spot);
        if (reading.status !== 'loading' && reading.status !== 'settings' && reading.timestamp !== timestamp) {
            reading = { status: 'unavailable' };
        }
        if (reading.status === 'loading') loading++;
        else if (reading.status === 'settings') settings = true;
        else if (reading.status === 'unavailable') unavailable++;
        if (reading.status === 'unavailable' && Number.isFinite(reading.requestStatus)) {
            requestStatus = reading.requestStatus;
            retrying ||= !!reading.retrying;
        }
        if (reading.weatherStatus === 'available' && Number.isFinite(reading.weatherStepHours)) weatherSteps.add(reading.weatherStepHours!);
        const valid = (reading.status === 'pass' || reading.status === 'fail') && Number.isFinite(reading.mph);
        const direction = valid && Number.isFinite(reading.direction) ? reading.direction : undefined;
        // Light wind stays visible in Wind-matched only when its actual
        // direction matches. Its status remains Too light, rather than Wind OK.
        const windMatched = valid && (reading.status === 'pass' || (reading.reason === 'too-light'
            && reading.mph! > 0 && direction !== undefined && directionMatches(windRanges(spot),direction)));
        const heightMode = reading.windMode === 'altitude';
        const speed = valid ? formatWindSpeed(reading.mph!,unit) : reading.status === 'loading' ? 'Loading…' : heightMode ? 'No estimate' : 'No data';
        const label = reading.status === 'pass' ? 'Wind criteria met' : reading.status === 'loading' ? 'Loading forecast'
            : reading.status === 'settings' ? 'Select a weather model / Wind' : reading.status === 'unavailable' ? (heightMode ? 'No height estimate' : level !== 'surface' ? 'No data for this layer' : 'No wind data')
            : reading.reason === 'too-light' ? 'Too light' : reading.reason === 'too-strong' ? 'Too strong' : 'Direction outside range';
        allSites.push({ ...spot, status: reading.status, windMatched, label, direction, speed, gustWarning:gustWarningDisplay(reading,unit),rain:rainDisplay(reading),weather:weatherDisplay(reading),cloudBase:cloudBaseDisplay(reading),
            levelEstimated:!!reading.levelEstimated,
            layerHeight:level!=='surface'&&Number.isFinite(reading.levelHeightM)?`${Math.round(reading.levelHeightM!)} m ASL`:undefined,
            surfaceForecast: heightMode ? (Number.isFinite(reading.surfaceMph)
                ? `${formatWindSpeed(reading.surfaceMph!,unit)} · ${Number.isFinite(reading.surfaceDirection) ? `${Math.round(reading.surfaceDirection!) % 360}°` : 'Calm'}` : 'No data') : undefined,
            heightInfo: heightMode && Number.isFinite(reading.elevationM) && Number.isFinite(reading.modelElevationM)
                ? `Terrain ${Math.round(reading.elevationM!)} m · Model ${Math.round(reading.modelElevationM!)} m ASL` : undefined,
            targetHeightM: reading.targetHeightM, altitudeNote: reading.altitudeNote,
            required: `${windSpeedRange(unit)} · ${formatWindRanges(spot)}`,
            forecast: `${speed} · ${direction === undefined ? 'No direction' : `${Math.round(direction) % 360}°`}`,
            gust: reading.gustStatus === 'available' && Number.isFinite(reading.gustMph) ? formatWindSpeed(reading.gustMph!,unit)
                : reading.gustStatus === 'loading' ? 'Loading…' : 'No data',
        });
    }
    allSites.sort((a, b) => a.name.localeCompare(b.name, 'en'));
    const sites = allSites.filter(site => site.windMatched);
    const time = formatForecastTime(timestamp,utcOffset);
    const weatherResolution = weatherSteps.size ? `Weather data: ${[...weatherSteps].sort((a,b)=>a-b).map(step=>`${step}h`).join(' / ')}` : '';
    return { sites, allSites, loading, unavailable, settings, requestStatus, retrying, time, model, modelLabel: forecastModelLabel(model), weatherResolution,
        level,levelLabel:windLevelLabel(level),estimatedLayers:allSites.some(site=>site.levelEstimated) };
}
