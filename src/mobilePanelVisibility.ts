// Observe the native sidebar, not the bottom forecast/timeline or our own panel.
const NATIVE_SIDEBARS = '#rhpane > *, [data-plugin="rhpane"] > *, #plugin-menu, #plugin-settings, #plugin-overlays, #plugin-layers';

export function watchMobilePanelVisibility(panel: HTMLElement, onHidden: (hidden: boolean) => void) {
    const media = window.matchMedia('(max-width: 600px)');
    let frame: number | null = null;
    let disposed = false;
    let previous: boolean | undefined;
    function measure() {
        frame = null;
        if (disposed) return;
        const hidden = media.matches && [...document.querySelectorAll<HTMLElement>(NATIVE_SIDEBARS)].some(node => {
            if (panel.contains(node) || node.contains?.(panel)) return false;
            const style = getComputedStyle(node);
            if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0
                || node.checkVisibility?.({checkOpacity:true,checkVisibilityCSS:true}) === false) return false;
            const r = node.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && r.left < window.innerWidth && r.right > 0
                && r.top < window.innerHeight && r.bottom > 0;
        });
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
    document.addEventListener('transitionend',schedule,true);
    document.addEventListener('transitionrun',schedule,true);
    document.addEventListener('animationend',schedule,true);
    measure();
    return () => {
        disposed = true;
        if (frame !== null) cancelAnimationFrame(frame);
        observer.disconnect();
        media.removeEventListener('change',schedule);
        document.removeEventListener('transitionend',schedule,true);
        document.removeEventListener('transitionrun',schedule,true);
        document.removeEventListener('animationend',schedule,true);
    };
}
