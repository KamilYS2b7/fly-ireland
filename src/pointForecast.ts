import { samplePointForecast } from './pointSampler.ts';
import { sampleAltitudeForecast } from './altitudeForecast.ts';
import { pointModelSupported, responseMatchesModel } from './forecastModels.ts';
import { windLevelSupported } from './windLayers.ts';
import type { ForecastModel } from './forecastModels';
import type { ForecastSpot, WindReading } from './windForecast';
export { samplePointForecast } from './pointSampler.ts';

type Dependencies = {
    store: {
        get: (key: any) => any;
        set: (key: any, value: any) => any;
        on: (key: any, callback: () => void) => any;
        off: (key: any, callback: () => void) => any;
    };
    getPointForecast: (spot: ForecastSpot, abort: AbortController, model: ForecastModel, withLayers?: boolean) => Promise<any>;
    getProfileForecast?: (spot: ForecastSpot, abort: AbortController) => Promise<any>;
    getModelCalendar?: (model: ForecastModel) => any;
    onChange: () => void;
    setTimer?: (callback: () => any, delay: number) => any;
    clearTimer?: (id: any) => void;
};
type RequestFailure = { status: number; retryable: boolean };
export function createPointWindForecast(deps: Dependencies) {
    const { store, onChange, getPointForecast } = deps;
    let pointModel: ForecastModel | undefined;
    const selectedModel = () => pointModel ?? store.get('product');
    const selectedCalendar = () => deps.getModelCalendar?.(selectedModel()) ?? store.get('calendar');
    const setTimer = deps.setTimer ?? setTimeout,
        clearTimer = deps.clearTimer ?? clearTimeout;
    const keys = ['timestamp', 'product', 'overlay', 'level', 'calendar'];
    let allSpots: ForecastSpot[] = [];
    type ModelCache = { key: string; points: Map<string, any>; profiles: Map<string, any>; layers: Set<string> };
    // Keep the latest run of up to four recently used models for instant return.
    const modelCaches = new Map<string, ModelCache>();
    let cache = new Map<string, any>();
    let profiles = new Map<string, any>();
    let layers = new Set<string>();
    const readings = new Map<string, { spot: ForecastSpot; point: any; profile: any; altitude: boolean; level: string; value: WindReading }>();
    let readingsTime: number | undefined;
    let previewTimestamp: number | undefined;
    let committedTimestamp = store.get('timestamp');
    const selectedTimestamp = () => previewTimestamp ?? store.get('timestamp');
    let altitudeEnabled = false;
    const selectedLevel = () => store.get('level') ?? 'surface';
    const needsLayers = () => selectedLevel() !== 'surface' && selectedModel() !== 'mblue';
    const needsLayerData = (spot: ForecastSpot) => {
        const available = cache.get(spot.id)?.data?.header?.availableLevels;
        return needsLayers() && !layers.has(spot.id) && (!Array.isArray(available) || available.includes(selectedLevel()));
    };
    const needsData = (spot: ForecastSpot) => !cache.has(spot.id) || needsLayerData(spot) || (altitudeEnabled && !profiles.has(spot.id));
    let active = false,
        configuring = false,
        running = false,
        generation = 0;
    let configurationFailed = false;
    let timer: any = null,
        notice: any = null,
        abort: AbortController | null = null;
    let recovery: any = null;
    let recoveryAttempt = 0;
    let requestFailure: RequestFailure | null = null;
    let lastSelection = '',
        lastCalendar = '';
    const settingsOK = () =>
        pointModelSupported(selectedModel()) &&
        store.get('overlay') === 'wind' &&
        windLevelSupported(selectedLevel());
    const calendarReady = () => {
        // Meteoblue AI has point forecasts but no raster calendar/manifest.
        if (selectedModel() === 'mblue') return true;
        const c = selectedCalendar();
        return !!c && (!c.productIdent || c.productIdent === selectedModel());
    };
    const calendarKey = () => {
        if (selectedModel() === 'mblue') {
            // Its response refTime is generated per request. Cache for an hour
            // independently of whichever map calendar was previously selected.
            return JSON.stringify(['mblue', 'point-only', Math.floor(Date.now() / 3600000)]);
        }
        const c = selectedCalendar();
        // Timeline bounds can change without a new forecast run.
        const run = Number.isFinite(c?.refTimeTs) ? c.refTimeTs : [c?.start, c?.end];
        return JSON.stringify([selectedModel(), calendarReady() ? run : 'pending']);
    };
    const selectionKey = () =>
        JSON.stringify([
            store.get('timestamp'),
            selectedModel(),
            store.get('overlay'),
            store.get('level'),
            calendarKey(),
        ]);
    function cancel() {
        previewTimestamp = undefined;
        generation++;
        abort?.abort();
        abort = null;
        running = false;
        if (timer !== null) clearTimer(timer);
        timer = null;
        if (notice !== null) clearTimer(notice);
        notice = null;
        if (recovery !== null) clearTimer(recovery);
        recovery = null;
        requestFailure = null;
        recoveryAttempt = 0;
    }
    function publish() {
        if (notice !== null) clearTimer(notice);
        notice = null;
        if (active) onChange();
    }
    function progress() {
        if (notice === null)
            notice = setTimer(() => {
                notice = null;
                if (active) onChange();
            }, 80);
    }
    async function readAll() {
        timer = null;
        if (!active || running || requestFailure || !settingsOK() || !calendarReady()) return;
        running = true;
        const model = selectedModel();
        const token = generation;
        const controller = new AbortController();
        abort = controller;
        const current = () => active && token === generation && !controller.signal.aborted;
        const pending = allSpots.filter(needsData);
        let index = 0;
        async function request(loader: Dependencies['getPointForecast'] | undefined, spot: ForecastSpot, profile = false, withLayers = false) {
            if (!loader) return null;
            for (let attempt = 0; attempt < (profile ? 2 : 1) && current(); attempt++) {
                try {
                    const response = await loader(spot, controller, model, withLayers);
                    if (profile && response?.status >= 500) continue;
                    return response;
                } catch (error: any) {
                    if (!profile) return {status: Number.isFinite(error?.status) ? error.status : 0};
                }
            }
            return null;
        }
        async function worker() {
            while (current() && !requestFailure && index < pending.length) {
                const spot = pending[index++];
                if (!cache.has(spot.id) || needsLayerData(spot)) {
                    const withLayers = needsLayers();
                    const response = await request(getPointForecast, spot, false, withLayers);
                    if (!current()) return;
                    const status = Number.isFinite(response?.status) ? response.status : 0;
                    if (status === 0 || status === 408 || status === 429 || status >= 500 || status === 401 || status === 403) {
                        // Stop the batch on shared service/access errors. Failed
                        // requests must not poison the cache for this model run.
                        if (!requestFailure || status === 401 || status === 403) {
                            requestFailure = {status, retryable: status !== 401 && status !== 403};
                        }
                        return;
                    }
                    const previous = cache.get(spot.id);
                    let next = response;
                    if (withLayers && previous?.status === 200 && status === 200) {
                        const run = Date.parse(previous.data?.header?.refTime);
                        if (!responseMatchesModel(model,response.data?.header?.model)) next = previous;
                        else if (responseMatchesModel(model,previous.data?.header?.model) && Number.isFinite(run)
                            && run === Date.parse(response.data?.header?.refTime)) {
                            // The profile can use a coarser grid. Retain the original
                            // hourly surface/weather series instead of downgrading it.
                            next = {...previous,data:{...previous.data,airgram:response.data?.airgram}};
                        }
                    }
                    // An unsupported upper profile must not discard a cached surface forecast.
                    if (status === 200 || !cache.has(spot.id)) cache.set(spot.id, next);
                    if (withLayers || response?.data?.airgram) layers.add(spot.id);
                    readings.delete(spot.id);
                    progress();
                }
                if (altitudeEnabled && !profiles.has(spot.id)) {
                    const response = await request(deps.getProfileForecast, spot, true);
                    if (!current()) return;
                    profiles.set(spot.id, response);
                    readings.delete(spot.id);
                }
                progress();
            }
        }
        await Promise.all(Array.from({ length: Math.min(4, pending.length) }, worker));
        if (!current()) return;
        running = false;
        // Workers can set this state after readAll's initial guard.
        const failure = requestFailure as RequestFailure | null;
        if (failure) {
            if (failure.retryable && recoveryAttempt < 2) {
                const delay = [2000, 8000][recoveryAttempt++];
                recovery = setTimer(() => {
                    recovery = null;
                    if (!current()) return;
                    requestFailure = null;
                    lastSelection = '';
                    refresh();
                }, delay);
            }
            publish();
            return;
        }
        recoveryAttempt = 0;
        // A toggle may have enabled profiles after some workers finished.
        lastSelection = '';
        refresh();
    }
    function refresh() {
        if (!active || configuring) return;
        const committed = store.get('timestamp');
        if (committed !== committedTimestamp) {
            committedTimestamp = committed;
            previewTimestamp = undefined;
        }
        const selection = selectionKey();
        if (selection === lastSelection) return;
        lastSelection = selection;
        const calendar = calendarKey();
        if (calendar !== lastCalendar) {
            cancel();
            readings.clear();
            const model = selectedModel();
            if (pointModelSupported(model) && calendarReady()) {
                let saved = modelCaches.get(model);
                if (!saved || saved.key !== calendar) saved = { key: calendar, points: new Map(), profiles: new Map(), layers: new Set() };
                modelCaches.delete(model);
                modelCaches.set(model, saved);
                while (modelCaches.size > 4) modelCaches.delete(modelCaches.keys().next().value!);
                cache = saved.points;
                profiles = saved.profiles;
                layers = saved.layers;
            } else {
                cache = new Map();
                profiles = new Map();
                layers = new Set();
            }
        }
        lastCalendar = calendar;
        if (settingsOK()) configurationFailed = false;
        publish();
        if (
            settingsOK() &&
            calendarReady() &&
            !requestFailure &&
            !running &&
            timer === null &&
            allSpots.some(needsData)
        )
            timer = setTimer(readAll, 150);
    }
    return {
        getModel: selectedModel,
        setPointModel(model?: ForecastModel) {
            if (pointModel === model) return;
            pointModel = model;
            lastSelection = '';
            refresh();
        },
        refreshModel() {
            lastSelection = '';
            refresh();
        },
        getTimestamp: selectedTimestamp,
        setPreviewTimestamp(timestamp?: number) {
            const next = Number.isFinite(timestamp) ? timestamp : undefined;
            if (!active || next === previewTimestamp) return;
            previewTimestamp = next;
            publish();
        },
        getTimelineSeries() {
            for (const spot of allSpots) {
                const point=cache.get(spot.id);
                if (point?.status === 200 && point.data?.data?.ts?.length) return point.data;
            }
            return undefined;
        },
        get(spot: ForecastSpot): WindReading {
            const timestamp = selectedTimestamp();
            const model = selectedModel();
            const level = selectedLevel();
            if (!settingsOK()) return { status: 'settings', timestamp, model, level, gustStatus: 'unavailable', rainStatus:'unavailable' };
            if (configurationFailed)
                return { status: 'unavailable', timestamp, gustStatus: 'unavailable', rainStatus:'unavailable' };
            if (requestFailure && needsData(spot)) return {
                status: 'unavailable', timestamp, model, level, requestStatus: requestFailure.status, retrying: recovery !== null,
                gustStatus: 'unavailable', rainStatus: 'unavailable',
            };
            if (!cache.has(spot.id) || needsLayerData(spot)) return { status: 'loading', timestamp, model, level, gustStatus: 'loading', rainStatus:'loading', windMode: altitudeEnabled ? 'altitude' : 'surface' };
            const point = cache.get(spot.id);
            const profile = profiles.get(spot.id);
            if (timestamp !== readingsTime) { readings.clear(); readingsTime = timestamp; }
            const saved = readings.get(spot.id);
            if (saved && saved.spot === spot && saved.point === point && saved.profile === profile && saved.altitude === altitudeEnabled && saved.level === level)
                return saved.value;
            let value: WindReading;
            if (!altitudeEnabled || level !== 'surface') value = samplePointForecast(spot, point, timestamp, model,level);
            else {
                const reading = sampleAltitudeForecast(spot, point, profile, timestamp);
                value = profiles.has(spot.id) ? reading : { ...reading, status: 'loading', altitudeNote: 'Loading UKV profile' };
            }
            readings.set(spot.id, { spot, point, profile, altitude: altitudeEnabled, level, value });
            return value;
        },
        retry() {
            if (!active || !requestFailure) return;
            cancel();
            lastSelection = '';
            refresh();
        },
        setAltitudeEnabled(enabled: boolean) {
            if (enabled === altitudeEnabled) return;
            altitudeEnabled = enabled;
            lastSelection = '';
            refresh();
        },
        setSpots(spots: ForecastSpot[]) {
            const changed = spots.length !== allSpots.length || spots.some((spot,index)=>spot.id !== allSpots[index]?.id);
            if (changed && active) cancel();
            allSpots = [...spots];
            lastSelection = '';
            refresh();
        },
        async start() {
            if (active) return;
            active = true;
            configuring = true;
            for (const key of keys) store.on(key, refresh);
            try {
                for (const [key, value] of [
                    ['overlay', 'wind'],
                ]) {
                    if (!active) return;
                    if (store.get(key) !== value) await store.set(key, value);
                }
            } catch {
                configurationFailed = true;
                lastSelection = '';
                publish();
                return;
            } finally {
                configuring = false;
            }
            refresh();
        },
        stop() {
            active = false;
            cancel();
            for (const key of keys) store.off(key, refresh);
            cache.clear();
            profiles.clear();
            layers.clear();
            modelCaches.clear();
            readings.clear();
            readingsTime = undefined;
            allSpots = [];
            lastSelection = '';
            lastCalendar = '';
            configurationFailed = false;
        },
    };
}
