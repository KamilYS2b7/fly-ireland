import assert from 'node:assert/strict';
import test from 'node:test';
import { createPointWindForecast, samplePointForecast } from '../src/pointForecast.ts';

const time = Date.UTC(2026, 9, 22, 12);
const spot = { id: 'north', lat: 55, lon: -6, sectorStart: 340, sectorEnd: 20 };
function payload(direction = 0) {
    return {
        status: 200,
        data: {
            header: { model: 'UKV' },
            data: {
                ts: [time, time + 10800000],
                wind: [4, 4],
                windDir: [direction, direction],
                windGust: [6, 8],
            },
        },
    };
}
function events() {
    const listeners = new Map();
    return {
        on(k, fn) {
            if (!listeners.has(k)) listeners.set(k, new Set());
            listeners.get(k).add(fn);
        },
        off(k, fn) {
            listeners.get(k)?.delete(fn);
        },
        emit(k) {
            for (const fn of listeners.get(k) ?? []) fn();
        },
    };
}
function fixture(loader = async () => payload(), profileLoader, getModelCalendar) {
    const data = {
        timestamp: time,
        product: 'ukv',
        overlay: 'wind',
        level: 'surface',
        calendar: { start: time, end: time + 10800000 },
    };
    const store = {
        ...events(),
        get: k => data[k],
        set(k, v) {
            data[k] = v;
            store.emit(k);
        },
    };
    const timers = new Map();
    const delays = [];
    let id = 0,
        updates = 0;
    const calls = [];
    const forecast = createPointWindForecast({
        store,
        getProfileForecast: profileLoader,
        getModelCalendar,
        getPointForecast: async (s, a, model, withLayers) => {
            calls.push({ spot: s, abort: a, model, withLayers });
            return loader(s, a, model, withLayers);
        },
        onChange: () => updates++,
        setTimer: (fn, delay) => {
            delays.push(delay);
            timers.set(++id, fn);
            return id;
        },
        clearTimer: id => timers.delete(id),
    });
    return {
        forecast,
        store,
        calls,
        timers,
        delays,
        get updates() {
            return updates;
        },
        async flush() {
            const pending = [...timers.values()];
            timers.clear();
            await Promise.all(pending.map(fn => fn()));
        },
    };
}

function layerPayload(model,withLayers){
    const p=payload();p.data.header={model,availableLevels:['surface','950h','975h','1000h']};
    if(withLayers)p.data.airgram={ts:[time,time+10800000],
        'wind-1000h':[4,4],'windDir-1000h':[0,0],
        'wind-950h':[8,8],'windDir-950h':[0,0]};
    return p;
}

test('a selected point-only Meteoblue forecast stays selected when Windy renders a different map model',async()=>{
    const app=fixture(async(s,a,model)=>{const p=payload();p.data.header.model=model;return p;});
    app.forecast.setSpots([spot]);await app.forecast.start();await app.flush();
    app.forecast.setPointModel?.('mblue');await app.flush();
    app.store.set('product','ecmwf');app.store.set('calendar',{productIdent:'ecmwf',start:time,end:time+10800000});await app.flush();
    assert.equal(app.forecast.get(spot).model,'mblue');
    assert.equal(app.forecast.getModel?.(),'mblue');
    assert.deepEqual(app.calls.map(call=>call.model),['ukv','mblue']);
    app.forecast.setPointModel(undefined);await app.flush();
    assert.equal(app.forecast.get(spot).model,'ecmwf');assert.equal(app.calls.at(-1).model,'ecmwf');
    app.forecast.stop();
});

test('regional point forecasts use their own model run when the map falls back to another product',async()=>{
    let refTimeTs=100;
    const app=fixture(async(s,a,model)=>{const p=payload();p.data.header.model=model;return p;},undefined,
        model=>model==='aromeFrance'?{productIdent:model,refTimeTs}:undefined);
    app.store.set('calendar',{productIdent:'gfs',refTimeTs:999});app.store.set('product','gfs');
    app.forecast.setSpots([spot]);await app.forecast.start();await app.flush();
    app.forecast.setPointModel('aromeFrance');await app.flush();
    assert.equal(app.forecast.get(spot).model,'aromeFrance');assert.equal(app.forecast.get(spot).status,'pass');
    const reads=app.calls.length;
    app.store.set('calendar',{productIdent:'gfs',refTimeTs:1000});await app.flush();assert.equal(app.calls.length,reads);
    refTimeTs=200;app.forecast.refreshModel();await app.flush();
    assert.equal(app.calls.length,reads+1);assert.equal(app.calls.at(-1).model,'aromeFrance');
    app.forecast.stop();
});

test('starting at a selected altitude preserves the map level and loads all wind layers in the initial request',async()=>{
    const app=fixture(async(s,a,model,withLayers)=>layerPayload(model,withLayers));
    app.store.set('level','950h');app.forecast.setSpots([spot]);await app.forecast.start();await app.flush();
    assert.equal(app.store.get('level'),'950h');assert.equal(app.calls.length,1);
    assert.equal(app.calls[0].withLayers,true);
    assert.equal(app.forecast.get(spot).mph,8/0.44704);
    app.forecast.stop();
});

test('altitude changes lazily load one profile per site and reuse it across levels, time and model returns',async()=>{
    const app=fixture(async(s,a,model,withLayers)=>layerPayload(model,withLayers));
    const sites=[spot,{...spot,id:'other',lat:52}];
    app.forecast.setSpots(sites);await app.forecast.start();await app.flush();
    assert.equal(app.calls.length,2);assert.ok(app.calls.every(c=>!c.withLayers));
    app.store.set('level','950h');assert.equal(app.forecast.get(spot).status,'loading');
    assert.equal(app.forecast.get(spot).mph,undefined);
    await app.flush();assert.equal(app.calls.length,4);
    assert.ok(app.calls.slice(2).every(c=>c.withLayers));assert.equal(app.forecast.get(spot).mph,8/0.44704);
    app.store.set('level','975h');assert.equal(app.forecast.get(spot).levelEstimated,true);
    app.store.set('timestamp',time+3600000);await app.flush();assert.equal(app.calls.length,4);
    app.store.set('level','surface');assert.equal(app.forecast.get(spot).mph,4/0.44704);
    app.store.set('level','950h');await app.flush();assert.equal(app.calls.length,4);
    app.store.set('product','gfs');await app.flush();assert.equal(app.calls.length,6);
    assert.equal(app.forecast.get(spot).model,'gfs');assert.equal(app.forecast.get(spot).mph,8/0.44704);
    app.store.set('product','ukv');await app.flush();assert.equal(app.calls.length,6);
    assert.equal(app.forecast.get(spot).model,'ukv');assert.equal(app.forecast.get(spot).mph,8/0.44704);
    app.forecast.stop();
});

test('loading upper profiles preserves an existing hourly surface, gust, weather and timeline series from the same run',async()=>{
    const app=fixture(async(s,a,model,withLayers)=>{
        const p=layerPayload(model,withLayers);p.data.header.refTime='2026-10-21T09:00:00Z';
        if(withLayers){p.data.data.wind=[30,30];p.data.data.icon=[1,1];p.data.data.isDay=[1,1];}
        else p.data.data={ts:[time,time+3600000,time+10800000],wind:[2,5,4],windDir:[0,0,0],
            windGust:[6,7,8],icon:[1,3,4],isDay:[1,1,1]};
        return p;
    });
    app.forecast.setSpots([spot]);await app.forecast.start();await app.flush();
    app.store.set('timestamp',time+3600000);app.store.set('level','950h');await app.flush();
    const upper=app.forecast.get(spot);assert.equal(upper.mph,8/0.44704);
    assert.equal(upper.gustMph,7/0.44704);assert.equal(upper.weatherIcon,3);
    assert.deepEqual(app.forecast.getTimelineSeries().data.ts,[time,time+3600000,time+10800000]);
    app.store.set('level','surface');assert.equal(app.forecast.get(spot).mph,5/0.44704);
    assert.equal(app.calls.length,2);app.forecast.stop();
});

test('height mode lazily fetches all profiles, preserves caches across time and toggles, and refreshes runs', async () => {
    const header = { model: 'UKV', refTime: '2026-10-21T09:00:00Z', elevation: 300, modelElevation: 100 };
    let profiles = 0;
    const app = fixture(async () => {
        const p = payload(); p.data.header = header; return p;
    }, async () => {
        profiles++;
        return { status: 200, data: { header, data: {
            hours: [time, time + 10800000], 'wind_u-surface': [0, 0], 'wind_v-surface': [-4, -4],
            'gh-950h': [510, 510], 'wind_u-950h': [0, 0], 'wind_v-950h': [-8, -8],
        } } };
    });
    const sites = Array.from({ length: 9 }, (_, i) => ({ ...spot, id: `height-${i}` }));
    app.forecast.setSpots(sites); await app.forecast.start(); await app.flush();
    assert.equal(profiles, 0);
    app.forecast.setAltitudeEnabled(true);
    assert.equal(app.forecast.get(sites[0]).status, 'loading');
    assert.equal(app.forecast.get(sites[0]).mph, undefined);
    await app.flush();
    assert.equal(profiles, 9); assert.equal(app.calls.length, 9);
    const estimate = app.forecast.get(sites[8]);
    assert.equal(estimate.mph, 6 / 0.44704);
    assert.equal(estimate.reason, 'too-strong');
    app.forecast.setAltitudeEnabled(false);
    assert.equal(app.forecast.get(sites[8]).status, 'pass');
    app.forecast.setAltitudeEnabled(true);
    app.store.set('timestamp', time + 3600000); await app.flush();
    assert.equal(profiles, 9); assert.equal(app.calls.length, 9);
    app.store.set('calendar', { start: time, end: time + 10800000, refTimeTs: time }); await app.flush();
    assert.equal(profiles, 18); assert.equal(app.calls.length, 18);
    app.forecast.stop();
});

test('height mode selected during point loading is fulfilled and failed profiles stay unavailable', async () => {
    let release; let profiles = 0;
    const app = fixture(() => new Promise(resolve => release = resolve), async () => { profiles++; throw new Error('offline'); });
    app.forecast.setSpots([spot]); await app.forecast.start();
    const pending = app.flush();
    app.forecast.setAltitudeEnabled(true); release(payload()); await pending; await app.flush();
    assert.equal(profiles, 2, 'bounded retry');
    assert.equal(app.forecast.get(spot).status, 'unavailable');
    app.forecast.setAltitudeEnabled(false);
    assert.equal(app.forecast.get(spot).status, 'pass');
    app.forecast.setAltitudeEnabled(true); await app.flush();
    assert.equal(profiles, 2);
    app.forecast.stop();
});

test('samples UKV wind and gust at timeline time, with vector interpolation across north', () => {
    const p = payload();
    p.data.data.windDir = [350, 10];
    const value = samplePointForecast(spot, p, time + 5400000);
    assert.equal(value.status, 'pass');
    assert.ok(value.direction < 1e-8 || value.direction > 359.999);
    assert.ok(Math.abs(value.gustMph - 7 / 0.44704) < 1e-8);
    assert.equal(samplePointForecast(spot, p, time - 1).status, 'unavailable');
    assert.equal(samplePointForecast(spot, p, time + 10800001).status, 'unavailable');
});
test('wrong model, missing data and null speeds never become matching winds', () => {
    const wrong = payload();
    wrong.data.header.model = 'ECMWF';
    const missing = payload();
    missing.data.data.wind[0] = null;
    for (const p of [wrong, missing, null, { status: 404, data: {} }])
        assert.equal(samplePointForecast(spot, p, time).status, 'unavailable');
    const noGust = payload();
    noGust.data.data.windGust = [null, null];
    assert.equal(samplePointForecast(spot, noGust, time).status, 'pass');
    assert.equal(samplePointForecast(spot, noGust, time).gustStatus, 'unavailable');
});
test('fetches every site regardless of map position and caches forecast hours', async () => {
    const app = fixture();
    const sites = Array.from({ length: 95 }, (_, i) => ({
        ...spot,
        id: `site-${i}`,
        lat: 51 + i / 30,
    }));
    app.forecast.setSpots(sites);
    await app.forecast.start();
    await app.flush();
    assert.equal(app.calls.length, 95);
    for (const s of sites) assert.equal(app.forecast.get(s).status, 'pass');
    const oldUpdates = app.updates;
    app.store.set('calendar', { start: time, end: time + 10800000 });
    await app.flush();
    assert.equal(app.updates, oldUpdates);
    app.store.set('timestamp', time + 3600000);
    await app.flush();
    assert.equal(app.calls.length, 95);
    assert.equal(app.forecast.get(sites[94]).timestamp, time + 3600000);
    app.forecast.stop();
});
test('timeline changes during loading use the new hour without restarting point requests', async () => {
    let release;
    const app = fixture(
        () =>
            new Promise(resolve => {
                release = resolve;
            }),
    );
    app.forecast.setSpots([spot]);
    await app.forecast.start();
    const pending = app.flush();
    await new Promise(resolve => setImmediate(resolve));
    app.store.set('timestamp', time + 3600000);
    release(payload());
    await pending;
    assert.equal(app.calls.length, 1);
    assert.equal(app.forecast.get(spot).timestamp, time + 3600000);
    app.forecast.stop();
});
test('stop cancels requests and suppresses late updates', async () => {
    let release;
    const app = fixture(
        () =>
            new Promise(resolve => {
                release = resolve;
            }),
    );
    app.forecast.setSpots([spot]);
    await app.forecast.start();
    const pending = app.flush();
    await new Promise(resolve => setImmediate(resolve));
    app.forecast.stop();
    const count = app.updates;
    release(payload());
    await pending;
    await app.flush();
    assert.equal(app.updates, count);
    assert.equal(app.calls[0].abort.signal.aborted, true);
});

test('failed layer initialization is handled and a later valid selection recovers', async () => {
    const app = fixture();
    app.store.set('overlay', 'rain');
    const original = app.store.set;
    app.store.set = (key, value) => {
        if (key === 'overlay') throw new Error('layer unavailable');
        original(key, value);
    };
    app.forecast.setSpots([spot]);
    await assert.doesNotReject(() => app.forecast.start());
    assert.notEqual(app.forecast.get(spot).status, 'loading');
    app.store.set = original;
    app.store.set('overlay', 'wind');
    await app.flush();
    assert.equal(app.forecast.get(spot).status, 'pass');
    app.forecast.stop();
});

test('preserves selected model at startup and reloads every site on model switch without retaining old matches', async () => {
    const app=fixture(async (s,a,model)=>{
        const p=payload();p.data.header.model=model.toUpperCase();p.data.data.wind=[model==='gfs'?1:4,4];return p;
    });
    app.store.set('product','ecmwf');app.forecast.setSpots([spot,{...spot,id:'south'}]);
    await app.forecast.start();await app.flush();
    assert.equal(app.store.get('product'),'ecmwf');
    assert.ok(app.calls.every(c=>c.model==='ecmwf'));
    assert.equal(app.forecast.get(spot).status,'pass');
    app.store.set('product','gfs');
    assert.equal(app.forecast.get(spot).status,'loading');
    await app.flush();
    assert.equal(app.calls.length,4);assert.ok(app.calls.slice(2).every(c=>c.model==='gfs'));
    assert.equal(app.forecast.get(spot).reason,'too-light');
    app.store.set('timestamp',time+3600000);await app.flush();assert.equal(app.calls.length,4);
    app.forecast.stop();
});

test('switching models aborts pending requests and rejects late responses even before calendar changes', async () => {
    let release;
    const app=fixture(async (s,a,model)=>{
        if(model==='ukv')return new Promise(resolve=>release=resolve);
        const p=payload();p.data.header.model='ECMWF';p.data.data.wind=[1,1];return p;
    });
    app.forecast.setSpots([spot]);await app.forecast.start();const pending=app.flush();
    app.store.set('product','ecmwf');assert.equal(app.calls[0].abort.signal.aborted,true);
    await app.flush();release(payload());await pending;await app.flush();
    assert.equal(app.forecast.get(spot).reason,'too-light');
    app.store.set('product','radar');await app.flush();
    assert.equal(app.forecast.get(spot).status,'settings');assert.equal(app.calls.length,2);
    app.forecast.stop();
});

test('a new UKV model run refreshes cached series even if its forecast window is unchanged', async () => {
    const app = fixture();
    app.store.set('calendar', { start: time, end: time + 10800000, refTimeTs: time - 3600000 });
    app.forecast.setSpots([spot]);
    await app.forecast.start();
    await app.flush();
    app.store.set('calendar', { start: time, end: time + 10800000, refTimeTs: time });
    await app.flush();
    assert.equal(app.calls.length, 2);
    app.forecast.stop();
});

test('returning to a loaded model reuses its forecast and changing only the calendar window does not refetch a known run', async () => {
    const app=fixture(async(s,a,model)=>{const p=payload();p.data.header.model=model;return p;});
    const cal={start:time,end:time+10800000,refTimeTs:time-3600000};
    app.store.set('calendar',cal);app.forecast.setSpots([spot]);await app.forecast.start();await app.flush();
    app.store.set('product','ecmwf');await app.flush();
    app.store.set('product','ukv');assert.equal(app.forecast.get(spot).status,'pass');await app.flush();
    assert.equal(app.calls.length,2,'switching back must not reload the same model run');
    app.store.set('calendar',{...cal,end:time+21600000});await app.flush();assert.equal(app.calls.length,2);
    app.store.set('calendar',{...cal,refTimeTs:time});await app.flush();assert.equal(app.calls.length,3);
    app.forecast.stop();
});

test('waits for the selected model calendar instead of fetching twice during a model transition', async () => {
    const app=fixture(async(s,a,model)=>{const p=payload();p.data.header.model=model;return p;});
    const cal={start:time,end:time+10800000,refTimeTs:time-3600000};
    app.store.set('calendar',{...cal,productIdent:'ukv'});app.forecast.setSpots([spot]);await app.forecast.start();await app.flush();
    app.store.set('product','ecmwf');await app.flush();
    assert.equal(app.calls.length,1);assert.equal(app.forecast.get(spot).status,'loading');
    app.store.set('calendar',null);await app.flush();assert.equal(app.calls.length,1);
    app.store.set('calendar',{...cal,productIdent:'ecmwf'});await app.flush();assert.equal(app.calls.length,2);
    app.store.set('product','ukv');await app.flush();assert.equal(app.calls.length,2);
    app.store.set('calendar',{...cal,productIdent:'ukv'});await app.flush();
    assert.equal(app.calls.length,2);assert.equal(app.forecast.get(spot).status,'pass');app.forecast.stop();
});

test('Meteoblue AI loads point forecasts without a map calendar and reuses them across timeline changes', async () => {
    const app=fixture(async (_spot,_abort,model)=>{
        const response=payload();response.data.header.model=model;return response;
    });
    app.store.set('product','mblue');app.store.set('calendar',null);
    app.forecast.setSpots([spot]);await app.forecast.start();await app.flush();
    assert.equal(app.forecast.get(spot).status,'pass');
    assert.equal(app.forecast.get(spot).model,'mblue');
    assert.equal(app.calls.length,1);
    app.store.set('timestamp',time+3600000);await app.flush();
    assert.equal(app.forecast.get(spot).status,'pass');
    assert.equal(app.calls.length,1);
    // A leftover raster calendar must not block or restart a point-only forecast.
    app.store.set('calendar',{start:time,end:time+10800000,productIdent:'ecmwf'});await app.flush();
    assert.equal(app.forecast.get(spot).status,'pass');
    assert.equal(app.calls.length,1);
    app.store.set('product','ecmwf');await app.flush();
    assert.equal(app.forecast.get(spot).status,'pass');
    assert.equal(app.calls.length,2);
    app.store.set('product','mblue');app.store.set('calendar',null);await app.flush();
    assert.equal(app.forecast.get(spot).status,'pass');
    assert.equal(app.calls.length,2);
    app.forecast.stop();
});

test('reuses sampled readings within a timeline frame without retaining a previous timestamp', async () => {
    const app=fixture();app.forecast.setSpots([spot]);await app.forecast.start();await app.flush();
    const first=app.forecast.get(spot);assert.equal(app.forecast.get(spot),first);
    app.store.set('timestamp',time+3600000);const next=app.forecast.get(spot);
    assert.notEqual(next,first);assert.equal(next.timestamp,time+3600000);
    assert.equal(app.forecast.get(spot),next);app.forecast.stop();
});

test('timeline drag preview updates readings immediately without changing Windy time or refetching', async () => {
    const app=fixture();app.forecast.setSpots([spot]);await app.forecast.start();await app.flush();
    app.forecast.setPreviewTimestamp(time+3600000);
    assert.equal(app.forecast.getTimestamp(),time+3600000);
    assert.equal(app.forecast.get(spot).timestamp,time+3600000);
    assert.equal(app.store.get('timestamp'),time);
    await app.flush();assert.equal(app.calls.length,1);
    app.store.set('timestamp',time+3600000);
    app.store.set('timestamp',time+7200000);
    assert.equal(app.forecast.getTimestamp(),time+7200000);
    app.forecast.setPreviewTimestamp(time+3600000);
    app.store.set('product','gfs');
    assert.equal(app.forecast.getTimestamp(),time+7200000);
    app.forecast.stop();
});

test('model cache is bounded and evicts the least recently used model', async () => {
    const app=fixture(async(s,a,model)=>{const p=payload();p.data.header.model=model;return p;});
    app.forecast.setSpots([spot]);await app.forecast.start();await app.flush();
    for(const model of ['ecmwf','gfs','icon']){app.store.set('product',model);await app.flush();}
    app.store.set('product','ukv');await app.flush();assert.equal(app.calls.length,4);
    app.store.set('product','arome');await app.flush();assert.equal(app.calls.length,5);
    app.store.set('product','ecmwf');await app.flush();assert.equal(app.calls.length,6);
    app.forecast.stop();
});

test('a completed empty profile response replaces a memoized loading reading', async () => {
    let release;
    const app=fixture(async()=>payload(),()=>new Promise(resolve=>release=resolve));
    app.forecast.setSpots([spot]);await app.forecast.start();await app.flush();
    app.forecast.setAltitudeEnabled(true);const pending=app.flush();
    assert.equal(app.forecast.get(spot).status,'loading');
    release(undefined);await pending;
    assert.equal(app.forecast.get(spot).status,'unavailable');app.forecast.stop();
});

test('a transient point request failure retries without losing other sites', async () => {
    let calls = 0;
    const app = fixture(async () => {
        if (++calls === 1) throw new Error('temporary network failure');
        return payload();
    });
    app.forecast.setSpots([spot, { ...spot, id: 'south', lat: 51 }]);
    await app.forecast.start();
    await app.flush();
    assert.equal(app.calls.length,2,'No immediate retry before the recovery timer');
    assert.equal(app.forecast.get(spot).status,'unavailable');
    await app.flush();await app.flush();
    assert.equal(app.calls.length, 3);
    assert.equal(app.forecast.get(spot).status, 'pass');
    app.forecast.stop();
});

test('point request retries are bounded', async () => {
    const app = fixture(async () => {
        throw new Error('offline');
    });
    app.forecast.setSpots([spot]);
    await app.forecast.start();
    for(let i=0;i<8;i++)await app.flush();
    assert.equal(app.calls.length, 3);
    assert.equal(app.forecast.get(spot).status, 'unavailable');
    assert.equal(app.forecast.get(spot).retrying,false);
    app.forecast.stop();
});

test('service errors pause the batch and recover after a delay without discarding successful sites', async () => {
    let unavailable=true;
    const app=fixture(async site=>site.id==='north'||!unavailable ? payload() : {status:503});
    const sites=[spot,...Array.from({length:12},(_,i)=>({...spot,id:`site-${i}`}))];
    app.forecast.setSpots(sites);await app.forecast.start();await app.flush();
    assert.equal(app.forecast.get(spot).status,'pass');
    assert.equal(app.forecast.get(sites[12]).status,'unavailable');
    assert.equal(app.forecast.get(sites[12]).requestStatus,503);
    assert.equal(app.forecast.get(sites[12]).retrying,true);
    assert.ok(app.calls.length<=5,'A service failure must stop new requests in the batch');
    assert.ok(app.delays.some(delay=>delay>=1000),'Recovery must wait instead of retrying immediately');
    app.store.set('timestamp',time+3600000);
    assert.equal(app.forecast.get(sites[12]).requestStatus,503);
    unavailable=false;await app.flush();await app.flush();
    assert.equal(app.forecast.get(sites[12]).status,'pass');
    assert.equal(app.calls.filter(c=>c.spot.id==='north').length,1);
    app.forecast.stop();
});

test('rate limits use bounded recovery and manual retry can recover the same model run', async () => {
    let unavailable=true;
    const app=fixture(async()=>{if(unavailable)throw {status:429};return payload();});
    app.forecast.setSpots([spot]);await app.forecast.start();
    for(let i=0;i<8;i++)await app.flush();
    assert.equal(app.forecast.get(spot).status,'unavailable');
    assert.equal(app.forecast.get(spot).requestStatus,429);
    assert.equal(app.forecast.get(spot).retrying,false);
    assert.equal(app.calls.length,3,'Stop after the initial request and two delayed recovery attempts');
    unavailable=false;app.forecast.retry();await app.flush();
    assert.equal(app.forecast.get(spot).status,'pass');
    app.forecast.stop();
});

test('switching models cancels service recovery and never serves a cached failure on return', async () => {
    let unavailable=true;
    const app=fixture(async(_site,_abort,model)=>{
        if(unavailable&&model==='ukv')return {status:503};
        const p=payload();p.data.header.model=model;return p;
    });
    app.forecast.setSpots([spot]);await app.forecast.start();await app.flush();
    app.store.set('product','ecmwf');await app.flush();
    assert.equal(app.forecast.get(spot).status,'pass');
    unavailable=false;app.store.set('product','ukv');await app.flush();
    assert.equal(app.forecast.get(spot).status,'pass');
    app.forecast.stop();
    assert.equal(app.timers.size,0);
});

test('access errors keep manual recovery even when another in-flight request fails differently', async () => {
    for(const statuses of [[403,503],[503,403]]) {
        const app=fixture(async site=>({status:statuses[site.id==='north'?0:1]}));
        app.forecast.setSpots([spot,{...spot,id:'south'}]);await app.forecast.start();await app.flush();
        assert.equal(app.forecast.get(spot).requestStatus,403);
        assert.equal(app.forecast.get(spot).retrying,false);
        assert.equal(app.timers.size,0);
        app.forecast.stop();
    }
});
