import {pointKindLabel} from './siteGuides.ts';
import type {GuidePoint,SiteGuideData} from './siteGuides';

const escape = (value: string) => value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));

function pointSymbol(kind: GuidePoint['kind'],color: string,unverified: boolean) {
    const symbols = {
        launch:`<path d="M2 14C4 1 32 1 34 14c-8-5-24-5-32 0Z" fill="${color}" stroke="#fff" stroke-width="2"/>
            <path d="m5 13 8 13m18-13-8 13M11 11l4 13m10-13-4 13" fill="none" stroke="#fff" stroke-width="3.5" stroke-linejoin="round"/>
            <path d="m5 13 8 13m18-13-8 13M11 11l4 13m10-13-4 13" fill="none" stroke="${color}" stroke-width="1.3" stroke-linejoin="round"/>
            <path d="M12 26h12v2c0 4-3 5-6 5s-6-1-6-5Z" fill="${color}" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>
            <path d="M12 18v4l4 4m8-8v4l-4 4M18 24v4M15 30v4h2m4-4v4h-2" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 18v4l4 4m8-8v4l-4 4M18 24v4M15 30v4h2m4-4v4h-2" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="18" cy="20.5" r="2.7" fill="${color}" stroke="#fff" stroke-width="1.5"/>`,
        landing:`<ellipse cx="18" cy="29" rx="14" ry="5" fill="#fff" stroke="${color}" stroke-width="2"/>
            <ellipse cx="18" cy="29" rx="6" ry="2" fill="${color}"/>
            <path d="M18 3v18m-7-7 7 7 7-7" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M18 3v18m-7-7 7 7 7-7" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`,
        parking:`<circle cx="18" cy="18" r="15" fill="${color}" stroke="#fff" stroke-width="2"/>
            <path d="M14 27V10h7c7 0 7 10 0 10h-7" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>`,
        access:`<path d="M4 7v24M32 7v24M7 12h22v14H7ZM14 12v14m8-14v14" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M4 7v24M32 7v24M7 12h22v14H7ZM14 12v14m8-14v14" fill="none" stroke="${color}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`,
        reference:`<path d="M18 34S6 23 6 14a12 12 0 0 1 24 0c0 9-12 20-12 20Z" fill="${color}" stroke="#fff" stroke-width="2"/>
            <circle cx="18" cy="14" r="4" fill="#fff"/>`,
    };
    const warning = unverified ? `<g class="guide-point-unverified"><circle cx="31" cy="5" r="7" fill="#7c3aed" stroke="#fff" stroke-width="1.5"/><text x="31" y="9" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif" font-size="11" font-weight="700">?</text></g>` : '';
    return `<svg class="guide-point-symbol" viewBox="0 0 36 36" width="36" height="36" aria-hidden="true" style="display:block;overflow:visible;filter:drop-shadow(0 1px 2px #0006)">${symbols[kind]}${warning}</svg>`;
}

export function createSiteGuideMap({map,L,onSelect=()=>{}}: {map: any;L: any;onSelect?: (point: GuidePoint,guide: SiteGuideData)=>void}) {
    const markers = new Map<string,{point: GuidePoint;guide: SiteGuideData;marker: any;signature: string}>();
    let automatic = new Map<string,SiteGuideData>();
    let manual: SiteGuideData | undefined;
    let closed = false;
    const pane = 'flyIrelandGuidePoints';
    function clear() {if(closed)return;manual=undefined;reconcile();}
    function focus(point: GuidePoint) {
        const entry=markers.get(point.id);
        if (closed || !entry) return;
        manual=entry.guide;reconcile();
        map.setView([entry.point.lat,entry.point.lon],Math.max(15,map.getZoom()),{animate:true,duration:650});
        onSelect(entry.point,entry.guide);
    }
    function reconcile() {
        const guides=new Map(automatic);
        if(manual)guides.set(manual.key,manual);
        const desired=new Map([...guides.values()].flatMap(guide=>guide.points.map(point=>[point.id,{point,guide,signature:JSON.stringify(point)}] as const)));
        for(const [id,entry] of markers){
            if(desired.get(id)?.signature!==entry.signature){entry.marker.remove();markers.delete(id);}
        }
        if(!desired.size)return;
        const element = map.getPane(pane) || map.createPane(pane);
        element.style.zIndex='1000';
        for (const [id,{point,guide,signature}] of desired) {
            const existing=markers.get(id);
            if(existing){existing.guide=guide;continue;}
            const color = point.needsVerification ? '#7c3aed' : {launch:'#15803d',landing:'#1768c5',parking:'#ad6500',access:'#0f766e',reference:'#596675'}[point.kind];
            const caption = `${pointKindLabel(point.kind)} ${point.code}`;
            const title = `${guide.title} · ${pointKindLabel(point.kind)} ${point.code}: ${point.label}${point.needsVerification ? ' · Needs verification' : ''}`;
            const icon=L.divIcon({className:'fly-guide-point-icon',iconSize:[36,36],iconAnchor:[18,18],
                html:`<button type="button" title="${escape(title)}" aria-label="${escape(title)}" style="position:relative;display:flex;align-items:center;justify-content:center;width:36px;height:36px;padding:0;box-sizing:border-box;overflow:visible;border:0;border-radius:0;background:transparent;color:${color};box-shadow:none;cursor:pointer;font:600 15px system-ui;text-transform:none;letter-spacing:normal">
                  ${pointSymbol(point.kind,color,point.needsVerification)}
                  <span class="guide-point-caption" aria-hidden="true" style="position:absolute;top:calc(100% + 5px);left:50%;transform:translateX(-50%);display:block;width:max-content;padding:3px 7px;border:1px solid ${color};border-radius:6px;background:#fffffff5;color:#243b36;box-shadow:0 1px 4px #0003;white-space:nowrap;font:500 12px/16px system-ui,sans-serif;text-transform:none;letter-spacing:normal">${escape(caption)}</span>
                </button>`});
            const marker=L.marker([point.lat,point.lon],{icon,pane,interactive:true,keyboard:false,bubblingMouseEvents:false,title}).addTo(map);
            marker.flyGuideKey=guide.key;marker.flyGuidePoint=point;
            marker.getElement?.()?.addEventListener('click',(event: Event)=>{event.stopPropagation();focus(point);});
            markers.set(id,{point,guide,marker,signature});
        }
    }
    function setAutomatic(guides: SiteGuideData[]) {
        if(closed)return;
        automatic=new Map(guides.map(guide=>[guide.key,guide]));reconcile();
    }
    function show(guide: SiteGuideData,selected?: GuidePoint) {
        if (closed) return;
        manual=guide;reconcile();
        const points=guide.points;
        if (selected) focus(selected);
        else if (points.length === 1) focus(points[0]);
        else if (points.length) {
            const phone=typeof window !== 'undefined' && window.innerWidth <= 600;
            map.fitBounds(points.map(point=>[point.lat,point.lon]),{paddingTopLeft:[phone?35:340,phone?210:100],paddingBottomRight:[35,160],maxZoom:15,animate:true,duration:650});
        }
    }
    return {show,focus,clear,setAutomatic,destroy(){
        closed=true;for(const {marker} of markers.values())marker.remove();
        markers.clear();automatic.clear();manual=undefined;
    }};
}
