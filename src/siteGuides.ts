import {SITE_GUIDE_INDEX} from './siteGuideIndex.ts';
import {guideAssetUrl} from './siteGuideAssets.ts';

export type GuideSite = {name: string;lat?: number;lon?: number};
export type GuidePoint = {
    id: string; kind: 'launch' | 'landing' | 'parking' | 'access' | 'reference';
    label: string; code: string; lat: number; lon: number; needsVerification: boolean;
};
export type SiteGuideData = {
    key: string; title: string; sections: {id: string;title: string;text: string}[];
    images: string[]; points: GuidePoint[];
    source?: {title: string;edition: string;pages: number[];note: string;url?: string};
};
const sectionTitles = [
    ['summary','Overview'],['takeoff','Take-off'],['landing','Landing'],['toplanding','Top landing'],
    ['access','Access'],['parking','Parking'],['hazards','Hazards'],['airtrafficcontrolrestrictions','Airspace'],
];
const normalizeName = (name: string) => name.normalize('NFKD').toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const index = new Map(SITE_GUIDE_INDEX.flatMap(row => row.names.map(name => [normalizeName(name),row] as const)));
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';

export function guideKeyForSite(site: GuideSite): string | undefined {
    const row = index.get(normalizeName(site.name));
    if (!row) return;
    if (site.lat !== undefined || site.lon !== undefined) {
        if (!Number.isFinite(site.lat) || !Number.isFinite(site.lon)) return;
        // Catalogue variants are within 2 km of their shared guide anchor.
        // Reject same-name sites in a different area; proximity never creates a match.
        const north = (site.lat! - row.lat) * 111_200;
        const east = (site.lon! - row.lon) * 111_200 * Math.cos(row.lat * Math.PI / 180);
        if (Math.hypot(north,east) > 5_000) return;
    }
    return row.key;
}

export function normalizeSiteGuide(key: string,raw: unknown): SiteGuideData {
    const data = raw && typeof raw === 'object' ? raw as Record<string,unknown> : {};
    const points: GuidePoint[] = [];
    const withinCountry = (lat: number,lon: number) => data.country === 'poland'
        ? lat >= 48.9 && lat <= 55 && lon >= 14 && lon <= 24.2
        : lat >= 51 && lat <= 56 && lon >= -11 && lon <= -5;
    const add = (kind: GuidePoint['kind'],value: any) => {
        if (!value || typeof value !== 'object' || !Number.isFinite(value.lat) || !Number.isFinite(value.lon)
            || !withinCountry(value.lat,value.lon)) return;
        const code = text(value.code).replace(/[^a-z0-9]/gi,'').slice(0,8) || String(points.length + 1);
        const label = text(value.label) || `${pointKindLabel(kind)} ${code}`;
        points.push({id:`${key}-${kind}-${points.length}`,kind,code,
            label:label.replace(/\s*\(to refine\)/gi,'').trim(),lat:value.lat,lon:value.lon,
            needsVerification:value.needsVerification === true || key === 'Lough Navar' || /to refine|unconfirmed|approximate/i.test(label)});
    };
    for (const [field,kind] of [['launches','launch'],['landings','landing'],['parkings','parking'],['accessPoints','access'],['referencePoints','reference']] as const) {
        if (Array.isArray(data[field])) for (const point of data[field]) add(kind,point);
    }
    for (const field of ['launchMarkers','landingMarkers','parkingMarkers']) {
        if (!Array.isArray(data[field])) continue;
        for (const value of data[field]) {
            if (typeof value !== 'string') continue;
            const match = value.match(/^\s*([a-z0-9]+):\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)(?:\s*\|\s*#[a-f0-9]{3,8})?\s*$/i);
            if (match) add('reference',{code:match[1],label:`Reference point ${match[1]}`,lat:+match[2],lon:+match[3]});
        }
    }
    const rawSource = data.source && typeof data.source === 'object' ? data.source as Record<string,unknown> : undefined;
    const source = rawSource && text(rawSource.title) ? {
        title:text(rawSource.title),edition:text(rawSource.edition),note:text(rawSource.note),
        ...(/^https:\/\/[^\s]+$/i.test(text(rawSource.url)) ? {url:text(rawSource.url)} : {}),
        pages:Array.isArray(rawSource.pages) ? [...new Set(rawSource.pages.filter((page): page is number =>
            typeof page === 'number' && Number.isInteger(page) && page > 0 && page <= 999))] : [],
    } : undefined;
    return {key,title:text(data.title) || key,points,...(source ? {source} : {}),
        sections:sectionTitles.flatMap(([id,title]) => text(data[id]) ? [{id,title,text:text(data[id])}] : []),
        images:Array.isArray(data.images) ? [...new Set(data.images.filter((path): path is string =>
            typeof path === 'string' && /^assets\/sites\/[a-z0-9_-]+\.(?:jpe?g|png|webp)$/i.test(path)))] : [],
    };
}

export function pointKindLabel(kind: GuidePoint['kind']): string {
    return {launch:'Take-off',landing:'Landing',parking:'Parking',access:'Access gate',reference:'Reference'}[kind];
}
export function pointCoordinates(point: GuidePoint): string {
    return `${point.lat.toFixed(6)}, ${point.lon.toFixed(6)}`;
}
export function pointDirectionsUrl(point: GuidePoint): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${point.lat},${point.lon}`)}`;
}

export function createSiteGuideLoader(options: {moduleUrl?: string;fetch?: typeof fetch} = {}) {
    let pending: Promise<Record<string,unknown>> | undefined;
    let closed = false;
    const abort = new AbortController();
    const fetchData = options.fetch ?? globalThis.fetch.bind(globalThis);
    return {
        async load(site: GuideSite): Promise<SiteGuideData | undefined> {
            if (closed) throw new Error('Site guide loader is closed');
            const key = guideKeyForSite(site);
            if (!key) return;
            if (!pending) pending = (async () => {
                const response = await fetchData(guideAssetUrl('assets/site_descriptions.json',options.moduleUrl),{signal:abort.signal});
                if (!response.ok) throw new Error(`Site guide request failed (${response.status})`);
                const data = await response.json();
                if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid site guide data');
                return data;
            })().catch(error => {pending=undefined;throw error;});
            const data = await pending;
            if (closed) throw new Error('Site guide loader is closed');
            if (!Object.hasOwn(data,key)) throw new Error(`Site guide not found: ${key}`);
            return normalizeSiteGuide(key,data[key]);
        },
        destroy() {closed=true;abort.abort();pending=undefined;},
    };
}
