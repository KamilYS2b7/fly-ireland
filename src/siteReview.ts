import {paraglidingMapReviewCandidates} from './paraglidingMapSites.ts';
import type {SiteMetadata} from './siteCatalog';

export type SiteReviewDecision = 'accepted' | 'rejected';
export type SiteReviewDecisions = Record<string, SiteReviewDecision>;
type ReviewStorage = Pick<Storage, 'getItem' | 'setItem'>;
export const SITE_REVIEW_STORAGE_KEY = 'fly-ireland.paraglidingmap-review.v1';

// Bind the review queue separately from permanent owner-approved locations.
// The same workflow can review a future batch without reopening finalized IDs.
export function createSiteReview(candidates = paraglidingMapReviewCandidates) {
    const candidateIds = new Set(candidates.map(site=>site.id));

    function normalizeDecisions(value: unknown): SiteReviewDecisions {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
        return Object.fromEntries(Object.entries(value).filter(([id,decision])=>
            candidateIds.has(id) && (decision === 'accepted' || decision === 'rejected')));
    }

    function readSiteReview(storage?: ReviewStorage, fallback: SiteReviewDecisions = {}): SiteReviewDecisions {
        try {
            const raw=(storage??globalThis.localStorage)?.getItem(SITE_REVIEW_STORAGE_KEY);
            const saved=raw?JSON.parse(raw):undefined;
            return saved?.version===1?normalizeDecisions(saved.decisions):fallback;
        } catch { return fallback; }
    }

    function saveSiteReview(decisions: SiteReviewDecisions, storage?: ReviewStorage): boolean {
        try {
            const target=storage??globalThis.localStorage;
            if (!target) return false;
            target.setItem(SITE_REVIEW_STORAGE_KEY,JSON.stringify({version:1,decisions:normalizeDecisions(decisions)}));
            return true;
        } catch { return false; }
    }

    function setSiteReviewDecision(decisions: SiteReviewDecisions, id: string, decision?: SiteReviewDecision): SiteReviewDecisions {
        if (!candidateIds.has(id) || (decision!==undefined && decision!=='accepted' && decision!=='rejected')) return decisions;
        const next={...decisions};
        if (decision===undefined) delete next[id];
        else next[id]=decision;
        return next;
    }

    function applySiteReview(decisions: SiteReviewDecisions) {
        return candidates.filter(site=>decisions[site.id]!=='rejected')
            .map(site=>({...site,reviewState:decisions[site.id]==='accepted'?'accepted' as const:'pending' as const}));
    }

    function siteReviewCounts(decisions: SiteReviewDecisions) {
        let accepted=0,rejected=0;
        for (const site of candidates) {
            if (decisions[site.id]==='accepted') accepted++;
            else if (decisions[site.id]==='rejected') rejected++;
        }
        const total=candidates.length;
        return {pending:total-accepted-rejected,accepted,rejected,total};
    }

    function exportSiteReview(decisions: SiteReviewDecisions) {
        return {version:1,catalogue:'paraglidingmap-ireland-2026-10-22',exportedAt:new Date().toISOString(),
            sites:candidates.map(site=>({id:site.id,name:site.name,lat:site.lat,lon:site.lon,
                decision:decisions[site.id]??'pending',sourceUrl:site.sourceUrl,sourceDirections:site.sourceDirections})),
        };
    }
    return {readSiteReview,saveSiteReview,setSiteReviewDecision,applySiteReview,siteReviewCounts,exportSiteReview};
}

export const {readSiteReview,saveSiteReview,setSiteReviewDecision,applySiteReview,siteReviewCounts,exportSiteReview}=createSiteReview();

export function isPendingSite(site: SiteMetadata): boolean {
    return !!site.toVerify && !site.reviewFinalized && site.reviewState!=='accepted';
}
