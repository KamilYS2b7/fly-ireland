export type VideoDecision = 'accepted' | 'rejected';
export type VideoDecisions = Record<string,VideoDecision>;
export type SiteVideo = {
    url:string;title:string;channel?:string;matchNote?:string;
    confidence?:'site'|'area';reviewStatus?:VideoDecision|'pending';reviewFinalized?:boolean;
};
type VideoSite = {id:string;name:string;youtube?:string[];videoCandidates?:SiteVideo[]};
type VideoStorage = Pick<Storage,'getItem'|'setItem'>;
export const VIDEO_REVIEW_STORAGE_KEY='fly-ireland.site-video-review.v1';

export function canonicalYouTubeUrl(value:unknown):string|undefined {
    if(typeof value!=='string')return;
    try{
        const url=new URL(value);
        if(!['https:','http:'].includes(url.protocol))return;
        const host=url.hostname.toLowerCase();
        let id:string|null|undefined;
        if(host==='youtu.be')id=url.pathname.split('/')[1];
        else if(['youtube.com','www.youtube.com','m.youtube.com'].includes(host)){
            if(url.pathname==='/watch')id=url.searchParams.get('v');
            else if(/^\/(embed|shorts)\//.test(url.pathname))id=url.pathname.split('/')[2];
        }
        if(id&&/^[\w-]{11}$/.test(id))return `https://www.youtube.com/watch?v=${id}`;
    }catch{/* Invalid imported links never become clickable. */}
}
export function videoReviewKey(siteId:string,url:string):string {
    const canonical=canonicalYouTubeUrl(url);
    return canonical?`${siteId}:${canonical.slice(-11)}`:'';
}

export function createVideoReview(sites:VideoSite[]) {
    const known=new Set(sites.flatMap(site=>(site.videoCandidates??[]).filter(video=>!video.reviewFinalized).map(video=>videoReviewKey(site.id,video.url))).filter(Boolean));
    const normalize=(input:unknown):VideoDecisions=>!input||typeof input!=='object'||Array.isArray(input)?{}
        :Object.fromEntries(Object.entries(input).filter(([key,value])=>known.has(key)&&(value==='accepted'||value==='rejected')));
    function read(storage?:VideoStorage,fallback:VideoDecisions={}):VideoDecisions {
        try{
            const target=storage??globalThis.localStorage;
            if(!target)return normalize(fallback);
            const raw=target.getItem(VIDEO_REVIEW_STORAGE_KEY);
            if(raw===null)return {};
            const saved=JSON.parse(raw);
            return saved?.version===1?normalize(saved.decisions):normalize(fallback);
        }catch{return normalize(fallback);}
    }
    function save(decisions:VideoDecisions,storage?:VideoStorage):boolean {
        try{
            const target=storage??globalThis.localStorage;if(!target)return false;
            target.setItem(VIDEO_REVIEW_STORAGE_KEY,JSON.stringify({version:1,decisions:normalize(decisions)}));return true;
        }catch{return false;}
    }
    function set(decisions:VideoDecisions,siteId:string,url:string,decision?:VideoDecision):VideoDecisions {
        const key=videoReviewKey(siteId,url);
        if(!known.has(key)||(decision!==undefined&&decision!=='accepted'&&decision!=='rejected'))return decisions;
        const next={...decisions};if(decision===undefined)delete next[key];else next[key]=decision;return next;
    }
    function count(decisions:VideoDecisions) {
        const values=normalize(decisions),all=Object.values(values);
        const accepted=all.filter(value=>value==='accepted').length,rejected=all.filter(value=>value==='rejected').length;
        return {pending:known.size-accepted-rejected,accepted,rejected,total:known.size};
    }
    function exportDecisions(decisions:VideoDecisions) {
        const values=normalize(decisions);
        return {version:1,exportedAt:new Date().toISOString(),
            sites:sites.filter(site=>site.videoCandidates?.length).map(site=>({id:site.id,name:site.name,
                videos:site.videoCandidates!.map(video=>({...video,decision:video.reviewFinalized?'accepted':values[videoReviewKey(site.id,video.url)]??'pending'}))}))};
    }
    return {read,save,set,count,export:exportDecisions};
}

export function applyVideoDecisions<T extends VideoSite>(sites:T[],decisions:VideoDecisions):T[] {
    return sites.map(site=>{
        if(!site.videoCandidates?.length)return site;
        const candidates=site.videoCandidates.flatMap(video=>{
            const url=canonicalYouTubeUrl(video.url);return url?[{...video,url,reviewStatus:video.reviewFinalized?'accepted' as const:decisions[videoReviewKey(site.id,url)]??'pending' as const}]:[];
        });
        const visible=candidates.filter(video=>video.reviewStatus!=='rejected')
            .sort((a,b)=>Number(b.reviewStatus==='accepted')-Number(a.reviewStatus==='accepted'));
        return {...site,videoCandidates:candidates,youtube:visible.map(video=>video.url)};
    });
}

const escapeHTML=(value:string)=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
export function mapVideoButtonHTML(site:VideoSite):string {
    const videos=(site.videoCandidates??[]).filter(video=>video.reviewStatus!=='rejected'&&canonicalYouTubeUrl(video.url))
        .sort((a,b)=>Number(b.reviewStatus==='accepted')-Number(a.reviewStatus==='accepted'));
    if(!videos.length)return '';
    const video=videos[0],accepted=video.reviewStatus==='accepted';
    const label=`${accepted?'Accepted video':'Video to review'}: ${site.name} — ${video.title}${videos.length>1?' · More videos in the site card':''}`;
    return `<a class="site-video-button${accepted?' video-accepted':''}" href="${canonicalYouTubeUrl(video.url)}" target="_blank" rel="noopener noreferrer" title="${escapeHTML(label)}" aria-label="${escapeHTML(label)}">
        <svg viewBox="0 0 24 18" width="18" height="14" aria-hidden="true"><rect width="24" height="18" rx="4" fill="#e62117"/><path d="M9 4.5 17 9 9 13.5Z" fill="#fff"/></svg>${accepted?'':'<span class="video-review-dot" aria-hidden="true">?</span>'}</a>`;
}
