type VerticalBounds = { top: number; bottom: number };

export function availablePanelHeight(top: number, viewportBottom: number, controls: VerticalBounds[]) {
    let boundary = viewportBottom;
    for (const rect of controls) {
        if (rect.bottom > top && rect.top < viewportBottom) boundary = Math.min(boundary, rect.top);
    }
    // Use all available space, keeping clearance above visible controls.
    return Math.max(0, Math.floor(boundary - top - 24));
}

// Windy's desktop detail table and mobile/desktop timeline plugin roots.
const BOTTOM_CONTROLS = '#plugin-detail, #plugin-progress-bar, #plugin-mobile-calendar';

export function watchPanelLayout(panel: HTMLElement) {
    let frame: number | null = null;
    let disposed = false;
    let previousHeight = -1;
    let targets = new Set<HTMLElement>();
    // Cache controls extending above each root. Forecast tables contain thousands
    // of cells; reading all of them on every timeline mutation blocks map drawing.
    const overflow = new Map<HTMLElement, Set<Element>>();
    const dirty = new Set<HTMLElement>();
    const changed = new Set<Element>();
    const visible = new Set<HTMLElement>();
    const visibilityStyles = new WeakMap<Element, string>();
    const geometry = new WeakMap<Element, {top: number; width: number; height: number}>();
    const sizes = new ResizeObserver(entries => {
        for (const entry of entries) if (targets.has(entry.target as HTMLElement)) dirty.add(entry.target as HTMLElement);
        schedule();
    });

    function invalidate() {
        for (const target of targets) dirty.add(target);
        schedule();
    }

    function isVisible(element: Element) {
        const style = getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0
            && element.checkVisibility?.({checkOpacity: true, checkVisibilityCSS: true}) !== false;
    }

    function visibilityStyle(element: Element) {
        const style = (element as HTMLElement).style;
        return [style?.display, style?.visibility, style?.opacity, style?.contentVisibility, style?.position].join(';');
    }

    function inspectSubtree(element: Element) {
        changed.add(element);
        for (const child of element.querySelectorAll('*')) changed.add(child);
    }

    function geometryChanged(element: Element, rect: DOMRect) {
        const previous = geometry.get(element);
        geometry.set(element, {top: rect.top, width: rect.width, height: rect.height});
        return !previous || previous.top !== rect.top || previous.width !== rect.width || previous.height !== rect.height;
    }

    function measure() {
        frame = null;
        if (disposed) return;
        const next = new Set(document.querySelectorAll<HTMLElement>(BOTTOM_CONTROLS));
        for (const target of targets) if (!next.has(target)) {
            sizes.unobserve(target);
            overflow.delete(target); dirty.delete(target); visible.delete(target);
        }
        for (const target of next) if (!targets.has(target)) {
            sizes.observe(target);
            overflow.set(target, new Set()); dirty.add(target);
        }
        targets = next;
        const panelRect = panel.getBoundingClientRect();
        const viewport = window.visualViewport;
        const bottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
        const controls: VerticalBounds[] = [];
        for (const target of targets) {
            if (!isVisible(target)) { visible.delete(target); continue; }
            if (!visible.has(target)) dirty.add(target);
            visible.add(target);
            const rect = target.getBoundingClientRect();
            if (geometryChanged(target, rect) && changed.has(target)) dirty.add(target);
            if (rect.width > 0 && rect.height > 0 && rect.right > panelRect.left && rect.left < panelRect.right) controls.push(rect);
            // The close button and timeline handles can extend above the plugin
            // root. Its bounding box alone does not include that overflow.
            const cached = overflow.get(target)!;
            for (const child of cached) if (!target.contains(child)) cached.delete(child);
            const candidates = dirty.has(target)
                ? new Set<Element>(target.querySelectorAll('*'))
                : new Set([...cached, ...[...changed].filter(child => child !== target && target.contains(child))]);
            dirty.delete(target);
            for (const child of candidates) {
                visibilityStyles.set(child, visibilityStyle(child));
                const childRect = child.getBoundingClientRect();
                // Vertical movement/resizing of a wrapper can expose new overflow.
                // Horizontal timeline scrolling leaves these bounds unchanged.
                if (geometryChanged(child, childRect) && changed.has(child)) {
                    for (const descendant of child.querySelectorAll('*')) candidates.add(descendant);
                }
                // Keep candidates irrespective of horizontal overlap or visibility:
                // moving a handle later can bring it into the panel's column.
                if (childRect.top < rect.top && childRect.width > 0 && childRect.height > 0) cached.add(child);
                if (childRect.top >= rect.top || childRect.width <= 0 || childRect.height <= 0
                    || childRect.right <= panelRect.left || childRect.left >= panelRect.right) continue;
                if (!isVisible(child)) continue;
                controls.push(childRect);
            }
        }
        changed.clear();
        const height = availablePanelHeight(panelRect.top, bottom, controls);
        if (height !== previousHeight) {
            previousHeight = height;
            panel.style.setProperty('--panel-available-height', `${height}px`);
        }
    }
    function schedule() {
        if (!disposed && frame === null) frame = requestAnimationFrame(measure);
    }
    const mutations = new MutationObserver(records => {
        let relevant = false;
        for (const record of records) {
            if (panel.contains(record.target)) continue;
            for (const target of targets) {
                if (target.contains(record.target)) {
                    relevant = true;
                    if (record.target instanceof Element && record.type === 'attributes') {
                        changed.add(record.target);
                        // Active forecast cells change class while scrubbing too.
                        // Rescan only that subtree, not all forecast columns.
                        if (record.attributeName !== 'style'
                            || (record.target !== target && visibilityStyles.get(record.target) !== visibilityStyle(record.target))) {
                            inspectSubtree(record.target);
                        }
                    }
                    for (const node of record.addedNodes) if (node instanceof Element) {
                        inspectSubtree(node);
                    }
                } else if (record.target.contains(target)) {
                    relevant = true;
                    // Ancestor visibility/classes can reveal previously hidden controls.
                    if (record.type === 'attributes') dirty.add(target);
                }
            }
            if ([...record.addedNodes, ...record.removedNodes].some(node => node instanceof Element
                && (node.matches(BOTTOM_CONTROLS) || node.querySelector(BOTTOM_CONTROLS)))) relevant = true;
        }
        if (relevant) schedule();
    });
    const transition = (event: Event) => {
        if (event.target instanceof Node && !panel.contains(event.target)
            && [...targets].some(target => target.contains(event.target as Node) || (event.target as Node).contains(target))) invalidate();
    };
    mutations.observe(document.body, {subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style', 'hidden']});
    mutations.observe(document.documentElement, {attributes: true, attributeFilter: ['class', 'style']});
    sizes.observe(panel);
    window.addEventListener('resize', invalidate);
    window.visualViewport?.addEventListener('resize', invalidate);
    window.visualViewport?.addEventListener('scroll', schedule);
    document.addEventListener('transitionend', transition, true);
    document.addEventListener('animationend', transition, true);
    measure();
    return () => {
        disposed = true;
        if (frame !== null) cancelAnimationFrame(frame);
        sizes.disconnect(); mutations.disconnect();
        window.removeEventListener('resize', invalidate);
        window.visualViewport?.removeEventListener('resize', invalidate);
        window.visualViewport?.removeEventListener('scroll', schedule);
        document.removeEventListener('transitionend', transition, true);
        document.removeEventListener('animationend', transition, true);
    };
}
