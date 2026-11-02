// Observe the native sidebar, not the bottom forecast/timeline or our own panel.
const NATIVE_SIDEBARS = '#rhpane > *, [data-plugin="rhpane"] > *, #plugin-menu, #plugin-settings, #plugin-overlays, #plugin-layers';

type PanelEvents={on:(event:string,callback:(name:string)=>void)=>unknown;off:(event:string,callback:(name:string)=>void)=>unknown};

export function watchMobilePanelVisibility(panel: HTMLElement, onHidden: (hidden: boolean) => void, events?:PanelEvents) {
    const media = window.matchMedia('(max-width: 600px)');
    let frame: number | null = null;
    let disposed = false;
    let previous: boolean | undefined;
    let opening:string|undefined;
    let openingTimer:ReturnType<typeof setTimeout>|undefined;
    function clearOpening(){opening=undefined;if(openingTimer!==undefined)clearTimeout(openingTimer);openingTimer=undefined;}
    function onOpen(name:string){
        if(!media.matches||!['menu','settings','overlays','layers','rhpane-top'].includes(name))return;
        clearOpening();opening=name;
        // Hide before Windy's pane starts crossing the map. Recover if opening fails.
        openingTimer=setTimeout(()=>{clearOpening();schedule();},1500);
        measure();
    }
    function onOpened(name:string){if(name===opening){clearOpening();schedule();}}
    function onClosed(name:string){if(name===opening)clearOpening();schedule();}
    function measure() {
        frame = null;
        if (disposed) return;
        const hidden = media.matches && (!!opening || [...document.querySelectorAll<HTMLElement>(NATIVE_SIDEBARS)].some(node => {
            if (panel.contains(node) || node.contains?.(panel)) return false;
            const style = getComputedStyle(node);
            if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0
                || node.checkVisibility?.({checkOpacity:true,checkVisibilityCSS:true}) === false) return false;
            const r = node.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && r.left < window.innerWidth && r.right > 0
                && r.top < window.innerHeight && r.bottom > 0;
        }));
        if (hidden !== previous) { previous = hidden; onHidden(hidden); }
    }
    function schedule() {
        if (!disposed && frame === null) frame = requestAnimationFrame(measure);
    }
    const observer = new MutationObserver(records => {
        if (records.some(record => !panel.contains(record.target))) schedule();
    });
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','hidden']});
    observer.observe(document.documentElement,{attributes:true,attributeFilter:['class','style']});
    media.addEventListener('change',schedule);
    events?.on('rqstOpen',onOpen);
    events?.on('pluginOpened',onOpened);
    events?.on('pluginClosed',onClosed);
    document.addEventListener('transitionend',schedule,true);
    document.addEventListener('transitionrun',schedule,true);
    document.addEventListener('animationend',schedule,true);
    measure();
    return () => {
        disposed = true;
        if (frame !== null) cancelAnimationFrame(frame);
        observer.disconnect();
        clearOpening();
        events?.off('rqstOpen',onOpen);
        events?.off('pluginOpened',onOpened);
        events?.off('pluginClosed',onClosed);
        media.removeEventListener('change',schedule);
        document.removeEventListener('transitionend',schedule,true);
        document.removeEventListener('transitionrun',schedule,true);
        document.removeEventListener('animationend',schedule,true);
    };
}
