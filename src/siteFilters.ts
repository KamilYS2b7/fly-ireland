import {REGIONS} from './siteCatalog.ts';
import type {RegionId, SiteType, SiteMetadata, SiteCountry} from './siteCatalog.ts';
import type {buildSitePanel} from './sitePanel';
import {canonicalYouTubeUrl} from './siteVideos.ts';
import {guideKeyForSite} from './siteGuides.ts';

export type SiteFilters = { country: SiteCountry; regions: RegionId[]; siteType: 'all' | SiteType; wind: 'all' | 'matched' | 'review' | 'video-review' | 'direction-review'; withVideos: boolean; withGuide: boolean };
export const FILTER_STORAGE_KEY = 'fly-ireland.site-filters.v1';
// Temporarily keep the Polish catalogue out of the published interface.
// Its records, guides and owner approvals remain available in the source.
export const POLAND_ENABLED = false;
type FilterStorage = Pick<Storage, 'getItem' | 'setItem'>;
export const defaultSiteFilters = (): SiteFilters => ({country:'ireland',regions:[],siteType:'all',wind:'all',withVideos:false,withGuide:false});

export function normalizeSiteFilters(value: unknown): SiteFilters {
    if (!value || typeof value !== 'object') return defaultSiteFilters();
    const input = value as Partial<SiteFilters>;
    const regions = REGIONS.map(region=>region.id).filter(id=>Array.isArray(input.regions)&&input.regions.includes(id));
    return {
        country:input.country === 'poland' ? 'poland' : 'ireland',
        regions:input.country === 'poland' || regions.length === REGIONS.length ? [] : regions,
        siteType:input.siteType === 'coastal' || input.siteType === 'inland' ? input.siteType : 'all',
        wind:input.wind === 'direction-review' && input.country === 'poland' ? input.wind : input.wind === 'matched' || input.wind === 'review' || input.wind === 'video-review' ? input.wind : 'all',
        withVideos:input.withVideos === true,
        withGuide:input.withGuide === true,
    };
}

export function releaseSiteFilters(value: unknown, polandEnabled = POLAND_ENABLED): SiteFilters {
    const filters = normalizeSiteFilters(value);
    if (polandEnabled || filters.country !== 'poland') return filters;
    return {...filters,country:'ireland',regions:[],wind:filters.wind === 'direction-review' ? 'all' : filters.wind};
}

export function matchesSiteArea(site: SiteMetadata, filters: SiteFilters): boolean {
    return (site.country ?? 'ireland') === (filters.country ?? 'ireland')
        && (!filters.regions.length || (site.region !== undefined && filters.regions.includes(site.region)))
        && (filters.siteType === 'all' || filters.siteType === site.siteType);
}

export function scopeSitePanel(snapshot: ReturnType<typeof buildSitePanel>, filters: SiteFilters) {
    const allSites = snapshot.allSites.filter(site=>matchesSiteArea(site,filters)
        && (!filters.withVideos || site.youtube?.some(url=>canonicalYouTubeUrl(url) !== undefined))
        && (!filters.withGuide || guideKeyForSite(site) !== undefined));
    const visibleIds = new Set(allSites.map(site=>site.id));
    return {...snapshot,allSites,sites:snapshot.sites.filter(site=>visibleIds.has(site.id)),
        loading:allSites.filter(site=>site.status === 'loading').length,
        unavailable:allSites.filter(site=>site.status === 'unavailable').length};
}

// Share view membership between sidebar cards, counts, hover and all map tiers.
// Video review is independent of weather availability and wind suitability.
export function sitesForView(snapshot:ReturnType<typeof buildSitePanel>,view:SiteFilters['wind']) {
    if(view==='direction-review')return snapshot.allSites.filter(site=>site.country==='poland'&&site.directionUnverified&&!site.windReviewConfirmed);
    if(view==='matched')return snapshot.sites;
    if(view==='review')return snapshot.allSites.filter(site=>site.toVerify&&!site.reviewFinalized);
    if(view==='video-review')return snapshot.allSites.filter(site=>site.videoCandidates?.some(video=>
        !video.reviewFinalized&&(video.reviewStatus===undefined||video.reviewStatus==='pending')));
    return snapshot.allSites;
}

export function readSiteFilters(storage?: FilterStorage): SiteFilters {
    try {
        const saved = (storage ?? globalThis.localStorage)?.getItem(FILTER_STORAGE_KEY);
        return saved ? normalizeSiteFilters(JSON.parse(saved)) : defaultSiteFilters();
    } catch { return defaultSiteFilters(); }
}
export function saveSiteFilters(filters: SiteFilters, storage?: FilterStorage) {
    try { (storage ?? globalThis.localStorage)?.setItem(FILTER_STORAGE_KEY,JSON.stringify(normalizeSiteFilters(filters))); }
    catch { /* Private browsing or blocked storage must not prevent filtering. */ }
}
