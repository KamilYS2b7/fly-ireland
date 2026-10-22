type TimelineSeries = {
    header?: {utcOffset?: number};
    data?: {ts?: number[]; hour?: number[]};
};
type TimelineAxis = {times: number[]; width: number; utcOffset: number};

export function matchTimelineSeries(hours: number[], day: number, series: TimelineSeries | undefined, width: number): TimelineAxis | undefined {
    const times = series?.data?.ts, localHours = series?.data?.hour, offset = series?.header?.utcOffset;
    if (!times || !localHours || !Number.isFinite(offset) || !Number.isFinite(width) || width <= 0 || hours.length < 2) return;
    const start = times.findIndex((time, index) => localHours[index] === hours[0]
        && new Date(time + offset! * 3600000).getUTCDate() === day);
    if (start < 0) return;
    const length = Math.min(times.length - start, hours.length);
    if (length < 2) return;
    for (let i = 0; i < length; i++) {
        if (hours[i] !== localHours[start + i] || !Number.isFinite(times[start + i])
            || (i && times[start + i] <= times[start + i - 1])) return;
    }
    return {times: times.slice(start, start + length), width, utcOffset: offset!};
}

export function timelineTimestamp(axis: TimelineAxis, left: number): number | undefined {
    if (!Number.isFinite(left) || left < 0 || left >= axis.times.length * axis.width) return;
    const position = left / axis.width, index = Math.floor(position);
    const step = (axis.times[index + 1] ?? axis.times[index] + axis.times[index] - axis.times[index - 1]) - axis.times[index];
    if (!(step > 0)) return;
    // Same piecewise projection as Windy's forecast-table slider. Preserve the
    // actual UTC intervals, including changes in forecast resolution and DST.
    const hours = step / 3600000;
    const shift = ((axis.utcOffset % hours + hours) % hours) * 3600000;
    return axis.times[index] + (position - index) * step - shift;
}

type PreviewDependencies = {
    store: {get(key: any): any; on(key: any, callback: () => void): any; off(key: any, callback: () => void): any};
    getSeries(): TimelineSeries | undefined;
    loadSeries(step: number, abort: AbortController): Promise<TimelineSeries | undefined>;
    onPreview(timestamp?: number): void;
};

// Windy's detail slider commits store.timestamp only after its 100 ms debounce.
// Read its selected position while dragging, without changing Windy's map time or
// starting point requests on each movement. The normal store commit ends preview.
export function watchTimelinePreview({store, getSeries, loadSeries, onPreview}: PreviewDependencies) {
    let disposed = false;
    let active: {position: HTMLElement; property: 'width' | 'left'; axis?: TimelineAxis; observer: MutationObserver; token: number} | undefined;
    let frame: number | undefined, release: ReturnType<typeof setTimeout> | undefined;
    let token = 0;
    let dragging = false;
    let abort: AbortController | undefined;
    const cached = new Map<string, Promise<TimelineSeries | undefined>>();

    function clear() {
        token++;
        dragging = false;
        active?.observer.disconnect(); active = undefined;
        if (frame !== undefined) cancelAnimationFrame(frame);
        frame = undefined;
        if (release !== undefined) clearTimeout(release);
        release = undefined;
        onPreview(undefined);
    }
    function paint() {
        frame = undefined;
        if (!active?.axis || !active.position.isConnected) return;
        const left = Number.parseFloat(active.position.style[active.property]);
        onPreview(timelineTimestamp(active.axis, left));
    }
    function schedule() {
        if (!disposed && active && frame === undefined) frame = requestAnimationFrame(paint);
    }
    function start(event: PointerEvent) {
        if (event.button !== 0 || !(event.target instanceof Element)) return;
        const handle = event.target.closest<HTMLElement>('#plugin-detail .main-timecode');
        const root = handle?.closest<HTMLElement>('#plugin-detail');
        if (!handle || !root) return;
        // A pinned handle stays at the scroll boundary even as the selection
        // changes. The played bar always holds the actual selected coordinate.
        const played = root.querySelector<HTMLElement>('.progress-line .played');
        if (!played && handle.className.includes('stickied')) return;
        clear();
        const cells = [...root.querySelectorAll<HTMLElement>('.tr--hour td, .tr--hourNoSeparator td')];
        const hours = cells.map(cell => {
            const match = /^(\d{1,2})(?:\s*(AM|PM))?$/i.exec(cell.textContent?.trim() ?? '');
            if (!match) return NaN;
            return match[2] ? Number(match[1]) % 12 + (match[2].toUpperCase() === 'PM' ? 12 : 0) : Number(match[1]);
        });
        const dayLabel = root.querySelector('.tr--days .sticky-label')?.firstChild?.textContent;
        const day = Number(dayLabel?.match(/\d{1,2}/)?.[0]);
        const table = root.querySelector<HTMLElement>('.forecast-table__table');
        const width = table ? Number.parseFloat(getComputedStyle(table).getPropertyValue('--td-width')) : NaN;
        if (!Number.isFinite(day) || hours.some(hour => !Number.isFinite(hour)) || !Number.isFinite(width)) return;
        dragging = true;
        const observer = new MutationObserver(schedule);
        active = {position: played ?? handle, property: played ? 'width' : 'left', observer,
            axis: matchTimelineSeries(hours, day, getSeries(), width), token};
        observer.observe(active.position, {attributes: true, attributeFilter: ['style']});
        if (!active.axis) {
            // A 1h table can differ from the cached 3h site series. Fetch its time
            // grid once and reuse it; never infer time from translated clock text.
            const step = hours.length > 1 && (hours[1] - hours[0] + 24) % 24 === 1 ? 1 : 3;
            const location = store.get('detailLocation');
            const key = JSON.stringify([store.get('product'), store.get('calendar')?.refTimeTs, location?.lat, location?.lon, step, day, hours.length]);
            let pending = cached.get(key);
            if (!pending) {
                abort?.abort(); abort = new AbortController();
                pending = loadSeries(step, abort).catch(() => undefined);
                cached.set(key, pending);
                while (cached.size > 4) cached.delete(cached.keys().next().value!);
            }
            const current = token;
            void pending.then(series => {
                if (!series && cached.get(key) === pending) cached.delete(key);
                if (disposed || !active || current !== active.token) return;
                active.axis = matchTimelineSeries(hours, day, series, width);
                schedule();
            });
        }
    }
    function end() {
        if (!active) return;
        dragging = false;
        schedule();
        // Keep the final preview until Windy commits; cover a no-change release.
        release = setTimeout(clear, 300);
    }
    function changed() {
        abort?.abort(); cached.clear(); clear();
    }
    function committed() {
        if (active && !dragging) clear();
    }
    document.addEventListener('pointerdown', start, true);
    document.addEventListener('pointerup', end, true);
    document.addEventListener('pointercancel', clear, true);
    window.addEventListener('blur', clear);
    store.on('product', changed);
    store.on('calendar', changed);
    store.on('timestamp', committed);
    return () => {
        disposed = true;
        document.removeEventListener('pointerdown', start, true);
        document.removeEventListener('pointerup', end, true);
        document.removeEventListener('pointercancel', clear, true);
        window.removeEventListener('blur', clear);
        store.off('product', changed); store.off('calendar', changed);
        store.off('timestamp', committed);
        abort?.abort(); cached.clear(); clear();
    };
}
