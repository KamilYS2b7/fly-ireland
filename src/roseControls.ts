const escape=(value: string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
const title=(name: string,visible: boolean)=>`${visible?'Hide':'Show'} large wind rose: ${name}`;
function contents(name: string,visible: boolean) {
    return `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>${visible?'':'<path d="m3 3 18 18"/>'}</svg><span class="rose-toggle-label">${visible?'Hide rose':`Show ${escape(name)}`}</span>`;
}
export function roseControlHTML(name: string,visible: boolean) {
    return `<button class="rose-visibility-toggle" type="button" aria-label="${escape(title(name,visible))}" title="${escape(title(name,visible))}" aria-pressed="${visible}">${contents(name,visible)}</button>`;
}
export function updateRoseControl(button: HTMLButtonElement | null | undefined,name: string,visible: boolean) {
    if(!button)return;
    button.title=title(name,visible);button.setAttribute('aria-label',title(name,visible));button.setAttribute('aria-pressed',String(visible));
    button.innerHTML=contents(name,visible);
}

const displayTitle=(name:string,points:boolean)=>`${points?'Show wind rose':'Show site points'}: ${name}`;
export function siteDisplayButtonContents(points:boolean){
    const symbol=points?'<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5Z"/>':'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>';
    return `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">${symbol}</svg><span>${points?'Show wind rose':'Show site points'}</span>`;
}
export function siteDisplayControlHTML(name:string,points:boolean){
    const label=escape(displayTitle(name,points));
    return `<button type="button" class="site-display-toggle" title="${label}" aria-label="${label}" aria-pressed="${points}">${siteDisplayButtonContents(points)}</button>`;
}
export function updateSiteDisplayControl(button:HTMLButtonElement|null|undefined,name:string,points:boolean){
    if(!button)return;
    button.title=displayTitle(name,points);button.setAttribute('aria-label',button.title);
    button.setAttribute('aria-pressed',String(points));button.innerHTML=siteDisplayButtonContents(points);
}
export function siteDisplayControlGroupHTML(name:string,points:boolean){
    return `<span class="site-layer-controls">${siteDisplayControlHTML(name,points)}</span>`;
}
export type ControlRect={x:number;y:number;width:number;height:number};
export function placeSiteDisplayControl({anchor,size,viewport,diameter,points,obstacles}:{
    anchor:{x:number;y:number};size:{width:number;height:number};viewport:{width:number;height:number};
    diameter:number;points:boolean;obstacles:ControlRect[];
}){
    const clamp=(value:number,max:number)=>Math.max(8,Math.min(Math.max(8,max-8),value));
    const candidate=(x:number,y:number)=>({x:clamp(x,viewport.width-size.width),y:clamp(y,viewport.height-size.height)});
    const centre=anchor.x-size.width/2;
    {
        const rose={x:anchor.x-diameter/2,y:anchor.y-diameter/2,width:diameter,height:diameter};
        const outside=[candidate(centre,rose.y-size.height-12),candidate(rose.x+diameter+12,anchor.y-size.height/2),candidate(rose.x-size.width-12,anchor.y-size.height/2),candidate(centre,rose.y+diameter+12)];
        const overlaps=(p:{x:number;y:number},r:ControlRect)=>p.x<r.x+r.width&&p.x+size.width>r.x&&p.y<r.y+r.height&&p.y+size.height>r.y;
        return outside.find(p=>![rose,...obstacles].some(r=>overlaps(p,r)))??outside.find(p=>!overlaps(p,rose))??outside[0];
    }
}

export function controlAnchorInViewport(anchor:{x:number;y:number},viewport:{width:number;height:number}){
    return anchor.x>=0&&anchor.y>=0&&anchor.x<=viewport.width&&anchor.y<=viewport.height;
}
