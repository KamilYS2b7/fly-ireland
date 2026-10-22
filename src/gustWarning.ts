import type {WindReading} from './windForecast';
import {formatWindSpeed,convertWindSpeed} from './windUnits.ts';
import type {WindUnit} from './windUnits';

type GustWarning = {
    active:boolean; severity:'none'|'gusty'|'strong'; label:string;
    description:string; difference:string; differenceValue:string;
};

export function gustWarningDisplay(reading: Partial<WindReading>, unit: WindUnit = 'mph'): GustWarning {
    const mean = reading.mph, gust = reading.gustMph;
    if ((reading.status !== 'pass' && reading.status !== 'fail') || reading.gustStatus !== 'available'
        || !Number.isFinite(mean) || mean! < 0 || !Number.isFinite(gust) || gust! < 0)
        return {active:false,severity:'none',label:'',description:'',difference:'',differenceValue:''};
    const spread = gust! - mean!;
    const severity = gust! + 1e-9 >= 20 ? 'strong'
        : gust! + 1e-9 >= 10 && spread + 1e-9 >= 5 ? 'gusty' : 'none';
    const label = severity === 'strong' ? 'Strong gusts' : severity === 'gusty' ? 'Gusty' : '';
    const sign = spread < 0 ? '−' : '+';
    const difference = `${sign}${formatWindSpeed(Math.abs(spread),unit)}`;
    return {active:severity !== 'none',severity,label,difference,
        differenceValue:`${sign}${convertWindSpeed(Math.abs(spread),unit).toFixed(1)}`,
        description:`${label || 'Gusts'}: ${formatWindSpeed(gust!,unit)}. Mean wind: ${formatWindSpeed(mean!,unit)}; difference: ${difference}.`};
}

const gustLines = 'M2 8h9a2 2 0 1 0-1.2-3.6 M2 12h16a3.5 3.5 0 1 0-3.5-3.5 M2 16h11a2.5 2.5 0 1 1-2.5 2.5';
export const GUST_WARNING_SVG = `<svg class="gust-icon" viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${gustLines}" stroke="#fff" stroke-width="4.5"/><path class="gust-icon-lines" d="${gustLines}" stroke="var(--gust-warning-color,#d99000)" stroke-width="2.5"/></g></svg>`;
