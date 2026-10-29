import {guideKeyForSite} from './siteGuides.ts';
import type {GuideSite,SiteGuideData,createSiteGuideLoader} from './siteGuides';

export function createAutomaticGuidePoints({loader,points,setTimer=setTimeout,clearTimer=clearTimeout}: {
    loader: Pick<ReturnType<typeof createSiteGuideLoader>,'load'>;
    points: {setAutomatic(guides: SiteGuideData[]): void};
    setTimer?: (callback: ()=>void,delay: number)=>any;
    clearTimer?: (timer: any)=>void;
}) {
    const cached=new Map<string,SiteGuideData>();
    const pending=new Set<string>();
    let wanted=new Map<string,GuideSite>();
    let timer: any;
    let closed=false;
    function paint() {
        points.setAutomatic([...wanted.keys()].flatMap(key=>cached.has(key)?[cached.get(key)!]:[]));
    }
    function deferPaint() {
        if(closed||timer!==undefined)return;
        // Never mutate Leaflet layers inside its own map event/render callback.
        timer=setTimer(()=>{timer=undefined;if(!closed)paint();},0);
    }
    return {
        update(sites: GuideSite[]) {
            if(closed)return;
            wanted=new Map(sites.flatMap(site=>{const key=guideKeyForSite(site);return key?[[key,site] as const]:[];}));
            paint();
            for(const [key,site] of wanted){
                if(cached.has(key)||pending.has(key))continue;
                pending.add(key);
                void loader.load(site).then(guide=>{
                    if(closed||!guide)return;
                    cached.set(key,guide);deferPaint();
                }).catch(()=>{
                    // A later viewport update or the guide dialog can retry a failed asset read.
                }).finally(()=>pending.delete(key));
            }
        },
        destroy() {
            closed=true;if(timer!==undefined)clearTimer(timer);timer=undefined;
            wanted.clear();cached.clear();pending.clear();points.setAutomatic([]);
        },
    };
}
