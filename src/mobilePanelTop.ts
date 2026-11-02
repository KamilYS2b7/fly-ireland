type Bounds = {left:number;right:number;top:number;bottom:number;width:number;height:number};

export function mobilePanelTop(left:number,right:number,viewportTop:number,controls:Bounds[]) {
    let top = viewportTop + 120;
    for (const rect of controls) {
        // Exclude fullscreen roots, offscreen controls and the bottom timeline.
        if (rect.width <= 0 || rect.height <= 0 || rect.height > 180
            || rect.top > viewportTop + 160 || rect.bottom <= viewportTop
            || rect.right <= left || rect.left >= right) continue;
        top = Math.max(top, rect.bottom + 12);
    }
    return Math.ceil(top);
}

const HEADERS = '#search, #search-container, #mobile-top, #mobile-header, #top-bar, #plugin-mobile-ui, #mobile-ui, #plugin-mobile-ui header, #plugin-mobile-ui nav, #plugin-mobile-ui .top-bar, #plugin-mobile-ui .search';

export function watchMobilePanelTop(panel:HTMLElement) {
    const media = window.matchMedia('(max-width: 600px)');
    let frame:number|null = null, until = 0, previous = -1, disposed = false;
    function measure() {
        frame = null;
        if (disposed) return;
        if (media.matches) {
            const rect = panel.getBoundingClientRect();
            const controls = [...document.querySelectorAll<HTMLElement>(HEADERS)]
                .filter(node => !panel.contains(node) && node.checkVisibility?.({checkOpacity:true,checkVisibilityCSS:true}) !== false)
                .filter(node => {const s=getComputedStyle(node);return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)!==0;})
                .map(node => node.getBoundingClientRect());
            const top = mobilePanelTop(rect.left,rect.right,window.visualViewport?.offsetTop ?? 0,controls);
            if (top !== previous) { previous = top;panel.style.setProperty('--mobile-panel-top',`${top}px`); }
        }
        if (media.matches && performance.now() < until) schedule();
    }
    function schedule() {if (!disposed && frame === null) frame=requestAnimationFrame(measure);}
    function animate(event:Event) {
        const target=event.target;
        if (!(target instanceof Element) || panel.contains(target)) return;
        if (![...document.querySelectorAll(HEADERS)].some(node=>node.contains(target)||target.contains(node))) return;
        until=performance.now()+1000;
        schedule();
    }
    const observer=new MutationObserver(records=>{
        if(records.some(record=>!panel.contains(record.target)))schedule();
    });
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','hidden']});
    observer.observe(document.documentElement,{attributes:true,attributeFilter:['class','style']});
    const resize=new ResizeObserver(schedule);resize.observe(panel);
    media.addEventListener('change',schedule);
    window.addEventListener('resize',schedule);
    window.visualViewport?.addEventListener('resize',schedule);
    window.visualViewport?.addEventListener('scroll',schedule);
    document.addEventListener('transitionrun',animate,true);
    document.addEventListener('animationstart',animate,true);
    measure();
    return ()=>{
        disposed=true;if(frame!==null)cancelAnimationFrame(frame);
        observer.disconnect();resize.disconnect();
        media.removeEventListener('change',schedule);
        window.removeEventListener('resize',schedule);
        window.visualViewport?.removeEventListener('resize',schedule);
        window.visualViewport?.removeEventListener('scroll',schedule);
        document.removeEventListener('transitionrun',animate,true);
        document.removeEventListener('animationstart',animate,true);
    };
}
