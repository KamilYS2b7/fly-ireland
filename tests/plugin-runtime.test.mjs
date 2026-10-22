import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { createPointWindForecast as createWindForecast } from '../src/pointForecast.ts';
import { buildSitePanel } from '../src/sitePanel.ts';
import { getSiteMetadata } from '../src/siteCatalog.ts';
import { defaultSiteFilters, normalizeSiteFilters, scopeSitePanel, sitesForView, readSiteFilters, saveSiteFilters } from '../src/siteFilters.ts';
import { rainDisplay } from '../src/rainForecast.ts';
import {gustWarningDisplay,GUST_WARNING_SVG} from '../src/gustWarning.ts';
import {weatherDisplay,weatherIconUrl,cloudBaseDisplay} from '../src/weatherForecast.ts';
import {flybubbleSites} from '../src/flybubbleSites.ts';
import {paraglidingMapSites,approvedParaglidingMapSites,paraglidingMapReviewCandidates} from '../src/paraglidingMapSites.ts';
import {paraglidingMapVideos} from '../src/paraglidingMapVideos.ts';
import {createSiteReview,SITE_REVIEW_STORAGE_KEY} from '../src/siteReview.ts';
import {windRanges,formatWindRanges} from '../src/windRanges.ts';
import {forecastModelLabel,pointModelSupported} from '../src/forecastModels.ts';
import * as modelHelpers from '../src/forecastModels.ts';
import {normalizeWindUnit,readWindUnit,saveWindUnit,convertWindSpeed,formatWindSpeed,windSpeedRange} from '../src/windUnits.ts';
import {windLevelLabel} from '../src/windLayers.ts';
import {formatForecastTime} from '../src/forecastTime.ts';
import {createVideoReview,applyVideoDecisions,mapVideoButtonHTML,VIDEO_REVIEW_STORAGE_KEY} from '../src/siteVideos.ts';

const source = readFileSync(new URL('../src/plugin.svelte', import.meta.url), 'utf8');
const script = source.match(/<script lang="ts">([\s\S]*?)<\/script>/)[1]
    .replace(/^import .*;\r?$/gm, '');
const code = ts.transpileModule(script, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;

// Windy owns the browser/map. Exercise the plugin against that boundary without
// a WebGL context, including Leaflet GL's lack of the old L.point factory.
function runtime({ legacyPoint = false, windValues = [0, 5, 0], savedFilters = new Map(), honorForecastStep = false, productMetadata = {}, asyncProductWrites = false, nativeDetailNavigation = false, enableCandidateReview = false, includeApprovedSites = false, testVideos = false, enableVideoReview = false, projectionScale = 1 } = {}) {
    const filterStorage={getItem:key=>savedFilters.get(key)??null,setItem:(key,value)=>savedFilters.set(key,value)};
    // Legacy wind fixtures retain the original 136-site catalogue. Dedicated
    // cases opt into either the historical review flow or approved additions.
    const reviewCandidates=enableCandidateReview?paraglidingMapSites:paraglidingMapReviewCandidates;
    const reviewWorkflow=createSiteReview(reviewCandidates);
    const browserListeners=new Map();
    const timers = new Map();
    const listeners = new Map();
    const layers = new Set();
    const panes = new Map();
    let nextTimer = 0;
    let mount;
    let destroy;
    let zoom = 10;
    let additions = 0;
    let reads = 0;
    let profileReads = 0;
    let pointProductQueries = 0;
    const requestedModels = [];
    const requestedIncludes = [];
    const pointResponses = [];
    let west = -1000;
    let lastView;
    let selectedAtNavigation = [];
    const layer = (coords, options) => ({
        coords, options,
        center: { setAttribute(name, value) { this[name] = value; } },
        reading: { textContent: '' },
        unit: {textContent:''},
        arrow: { setAttribute(name, value) { this[name] = value; } },
        sky: {style:{},attributes:{},getAttribute(name){return this.attributes[name];},setAttribute(name,value){this.attributes[name]=value;},removeAttribute(name){delete this.attributes[name];}},
        gustWarning: {style:{display:'none'},attributes:{},setAttribute(name,value){this.attributes[name]=value;}},
        setLatLng() { return this; },
        setContent(content) { this.content = content; return this; },
        addTo() { layers.add(this); additions++; return this; },
        remove() { layers.delete(this); },
        getElement() {
            const classes = new Set();
            return this.root ??= { style: {setProperty(name,value){this[name]=value;}}, dataset:{}, handlers:new Map(),
                addEventListener(name, callback) {this.handlers.set(name,callback);},
                click(target={closest:()=>null}) {this.handlers.get('click')?.({target,stopPropagation(){}});},
                classList: { add: value => classes.add(value), remove: value => classes.delete(value),
                    contains: value => classes.has(value), toggle: (value, active) => active ? classes.add(value) : classes.delete(value) },
                querySelector: selector => ['.mini-wind-center','.forecast-wind-center'].includes(selector) ? this.center
                : ['.mini-wind-reading','.forecast-wind-reading'].includes(selector) ? this.reading
                : ['.mini-wind-unit','.forecast-wind-unit'].includes(selector) ? this.unit
                : ['.mini-wind-direction','.forecast-wind-direction'].includes(selector) ? this.arrow
                : selector === '.map-weather-icon' ? this.sky
                : selector === '.map-gust-warning' && this.options?.icon?.html?.includes('map-gust-warning') ? this.gustWarning : null };
        },
    });
    const storeValues = { product: 'ukv', overlay: 'wind', level: 'surface',
        timestamp: 1792670400000, calendar: { start: 1792600000000, end: 1792800000000 } };
    const weatherListeners = new Map();
    const broadcasts = [];
    const detailSyncSelections = [];
    let detailSyncDestroyed = false;
    let detailSyncDependencies, nativeDetailModel;
    let refreshModelMetadata;
    const pendingProductWrites=[],productWrites=[];
    let activeProductWrites=0,maxProductWrites=0;
    const weatherEvents = {
        on(name, callback) { if (!weatherListeners.has(name)) weatherListeners.set(name, new Set()); weatherListeners.get(name).add(callback); },
        off(name, callback) { weatherListeners.get(name)?.delete(callback); },
        emit(...args) {
            broadcasts.push(JSON.parse(JSON.stringify(args)));
            if(nativeDetailNavigation && args[0]==='rqstOpen' && args[1]==='detail') {
                store.set('detailLocation',{...args[2],externalOpen:true});
                const location=store.get('detailLocation');
                if(location.externalOpen)map.setView([location.lat,location.lon],map.getZoom(),{animate:false});
            }
        },
    };
    const store = { ...weatherEvents, get: name => storeValues[name],
        set(name, value) {
            const apply=()=>{storeValues[name] = value; for (const callback of weatherListeners.get(name) ?? []) callback();};
            if(name==='product'&&asyncProductWrites){
                productWrites.push(value);activeProductWrites++;maxProductWrites=Math.max(maxProductWrites,activeProductWrites);
                return new Promise(resolve=>pendingProductWrites.push(()=>{apply();activeProductWrites--;resolve();}));
            }
            apply();
        },
    };
    const map = {
        getZoom: () => zoom,
        setView: (coords, z, options) => {
            selectedAtNavigation = [...layers].filter(layer=>layer.getElement().classList.contains('site-selected')).map(layer=>layer.flySpot?.id);
            zoom = z; lastView = { coords, zoom, options };
        },
        getPixelBounds: () => ({ min: { x: west, y: -5600 }, max: { x: west + 500, y: -5100 } }),
        unproject: p => ({ lat: -(p.y ?? p[1]) / 100, lng: (p.x ?? p[0]) / 100 }),
        project: p => ({ x: p.lng * 100 * projectionScale, y: -p.lat * 100 * projectionScale }),
        getPane: name => panes.get(name),
        createPane: name => { const pane = { style: {} }; panes.set(name, pane); return pane; },
        on(name, callback) {
            const callbacks = listeners.get(name) ?? new Set();
            callbacks.add(callback);
            listeners.set(name, callbacks);
        },
        off(name, callback) { listeners.get(name)?.delete(callback); },
        once(name, callback) {
            const wrapped = () => { map.off(name, wrapped); callback(); };
            map.on(name, wrapped);
        },
    };
    const L = {
        ...(legacyPoint ? { point: (x, y) => ({ x, y }) } : {}),
        latLng: (lat, lng) => ({ lat, lng }),
        latLngBounds: (a, b) => ({
            contains: ([lat, lng]) => lat >= Math.min(a.lat, b.lat) && lat <= Math.max(a.lat, b.lat)
                && lng >= Math.min(a.lng, b.lng) && lng <= Math.max(a.lng, b.lng),
        }),
        divIcon: options => options,
        marker: layer,
        tooltip: layer,
    };
    const context = vm.createContext({
        map, L, console, store, broadcast: weatherEvents, AbortController, buildSitePanel, localStorage:filterStorage,
        window:{addEventListener(name,callback){browserListeners.set(name,callback);},removeEventListener(name,callback){if(browserListeners.get(name)===callback)browserListeners.delete(name);}},
        getSiteMetadata, defaultSiteFilters, normalizeSiteFilters, scopeSitePanel, sitesForView, rainDisplay, gustWarningDisplay, GUST_WARNING_SVG, flybubbleSites, windRanges, formatWindRanges, forecastModelLabel,
        ...reviewWorkflow,SITE_REVIEW_STORAGE_KEY,
        paraglidingMapReviewCandidates:reviewCandidates,
        approvedParaglidingMapSites:includeApprovedSites?approvedParaglidingMapSites.map(site=>enableVideoReview?{...site,videoCandidates:paraglidingMapVideos[site.id]??[],youtube:(paraglidingMapVideos[site.id]??[]).map(v=>v.url)}:site).map(site=>testVideos&&['pgmap-127756','pgmap-127890'].includes(site.id)
            ?{...site,...(site.id==='pgmap-127890'?{toVerify:true,windRanges:[],sectorStart:NaN,sectorEnd:NaN}:{}),youtube:['https://www.youtube.com/watch?v=whaqT_LWvdk'],videoCandidates:[{url:'https://www.youtube.com/watch?v=whaqT_LWvdk',title:'Test flight'}]}:site):[],
        readSiteReview:(_storage,fallback)=>reviewWorkflow.readSiteReview(filterStorage,fallback),saveSiteReview:value=>reviewWorkflow.saveSiteReview(value,filterStorage),
        applyVideoDecisions,mapVideoButtonHTML,VIDEO_REVIEW_STORAGE_KEY,
        createVideoReview:sites=>{const w=createVideoReview(sites);return {...w,read:(_storage,fallback)=>w.read(filterStorage,fallback),save:decisions=>w.save(decisions,filterStorage)};},
        iconsDir:'https://www.windy.com/test-icons',weatherDisplay,weatherIconUrl,cloudBaseDisplay,
        normalizeWindUnit,convertWindSpeed,formatWindSpeed,windSpeedRange,windLevelLabel,formatForecastTime,
        readWindUnit:()=>readWindUnit(filterStorage),saveWindUnit:value=>saveWindUnit(value,filterStorage),
        readSiteFilters:()=>readSiteFilters(filterStorage), saveSiteFilters:value=>saveSiteFilters(value,filterStorage),
        pointModelSupported, forecastModelOptions:modelHelpers.forecastModelOptions,
        products:productMetadata,createDetailModelSync:deps=>{detailSyncDependencies=deps;return {select:model=>detailSyncSelections.push(model),getNativeModel:()=>nativeDetailModel,destroy:()=>{detailSyncDestroyed=true;}};},
        getAllPointProducts:({lat})=>{
            pointProductQueries++;
            return ['ukv','ecmwf','gfs','mblue',...(lat>54?['iconEu']:['aromeFrance'])];
        },
        watchTimelinePreview:()=>()=>{},watchModelRunRefresh:refresh=>{refreshModelMetadata=refresh;return()=>{refreshModelMetadata=undefined;};},
        createWindForecast: deps => createWindForecast({ ...deps,
            setTimer: callback => { const id = ++nextTimer; timers.set(id, callback); return id; },
            clearTimer: id => timers.delete(id),
        }),
        getPointForecastData: async (model,options,include) => {
            reads++;
            requestedModels.push(model);
            requestedIncludes.push(include);
            const speed=Math.hypot(windValues[0],windValues[1]);
            const direction=(Math.atan2(-windValues[0],-windValues[1])*180/Math.PI+360)%360;
            const response={status:200,data:{header:{model:forecastModelLabel(model),refTime:'2026-10-21T09:00:00Z',elevation:390,modelElevation:150},data:{
                ts:Array.from({length:4},(_,i)=>1792670400000+i*3600000),
                wind:Array(4).fill(speed),windDir:Array(4).fill(direction),windGust:Array(4).fill(6),
                precipAmount:[0.5,0,0.8,null],precipSnowAmount:[0,0,0,0],
                icon:[1,3,4,null],isDay:[1,1,0,0],moonPhase:[7,7,7,7],
            },meteogram:{ts:Array.from({length:4},(_,i)=>1792670400000+i*3600000),cloudBase:[300,600,900,null]}}};
            if(include.airgram)response.data.airgram={ts:[1792670400000,1792674000000,1792677600000,1792681200000],
                'wind-950h':[8,4,6,8],'windDir-950h':[0,90,180,270],
                'wind-1000h':[4,4,4,4],'windDir-1000h':[0,0,0,0]};
            if(honorForecastStep){
                response.data.data.wind=[2,5,3,4];
                if(options.step!==1){
                    for(const group of [response.data.data,response.data.meteogram])for(const [key,values]of Object.entries(group))group[key]=[values[0],values[3]];
                }
            }
            pointResponses.push(response);return response;
        },
        getMeteogramForecastData: async () => {
            profileReads++;
            return {status:200,data:{header:{model:'UKV',refTime:'2026-10-21T09:00:00Z',elevation:390,modelElevation:150},data:{
                hours:Array.from({length:4},(_,i)=>1792670400000+i*3600000),
                'wind_u-surface':Array(4).fill(windValues[0]),'wind_v-surface':Array(4).fill(windValues[1]),
                'gh-950h':Array(4).fill(400),'wind_u-950h':Array(4).fill(0),'wind_v-950h':Array(4).fill(-10),
            }}};
        },
        onMount: callback => { mount = callback; },
        onDestroy: callback => { destroy = callback; },
        setTimeout: callback => { const id = ++nextTimer; timers.set(id, callback); return id; },
        clearTimeout: id => timers.delete(id),
    });
    vm.runInContext(code, context);
    return {
        mount: () => mount(),
        destroy: () => destroy(),
        layers,
        store,
        broadcasts,
        detailSyncSelections,
        get detailSyncDestroyed(){return detailSyncDestroyed;},
        nativeModel(model){nativeDetailModel=model;detailSyncDependencies.onNativeModel(model);},
        refreshModelRuns(){refreshModelMetadata?.();},
        productWrites,completeProductWrite(){pendingProductWrites.shift()?.();},
        get maxProductWrites(){return maxProductWrites;},
        setWindValues(value) {
            windValues=value;
            for(const response of pointResponses)for(let i=1;i<4;i++){
                response.data.data.wind[i]=Math.hypot(value[0],value[1]);
                response.data.data.windDir[i]=(Math.atan2(-value[0],-value[1])*180/Math.PI+360)%360;
            }
        },
        setGustValues(value) {for(const response of pointResponses)response.data.data.windGust.fill(value);},
        setFilter(value) { vm.runInContext(value === 'matched' ? "setSiteFilter('matched')" : "setSiteFilter('all')", context); },
        get panel() { return vm.runInContext('sitePanel', context); },
        dialHTML(name) {context.dialTestName=name;return vm.runInContext('buildDialHTML(spots.find(s=>s.name===dialTestName),200,false)',context);},
        setFilters(value) {context.testFilters=value;vm.runInContext('setSiteFilters(testFilters)',context);},
        setUnit(value) {context.testUnit=value;vm.runInContext("typeof setWindUnit === 'function' && setWindUnit(testUnit)",context);},
        setModel(value) {context.testModel=value;return vm.runInContext("typeof setForecastModel === 'function' && setForecastModel(testModel)",context);},
        get models() {return JSON.parse(vm.runInContext("JSON.stringify(typeof forecastModels === 'undefined' ? [] : forecastModels)",context));},
        get pointProductQueries() {return pointProductQueries;},
        get scopedPanel() {return vm.runInContext('filteredPanel',context);},
        get filters() {return vm.runInContext('siteFilters',context);},
        review(id,decision) {context.reviewTestId=id;context.reviewTestDecision=decision;vm.runInContext('decideReview(reviewTestId,reviewTestDecision)',context);},
        undoReview() {vm.runInContext('undoReview()',context);},
        reviewVideo(id,url,decision) {context.testVideoChoice={id,url,decision};vm.runInContext('decideVideo(testVideoChoice.id,testVideoChoice.url,testVideoChoice.decision)',context);},
        get videoSummary() {return JSON.parse(vm.runInContext('JSON.stringify(videoSummary)',context));},
        get reviewSummary() {return JSON.parse(vm.runInContext('JSON.stringify(reviewSummary)',context));},
        emitStorage(key) {browserListeners.get('storage')?.({key});},
        get browserListenerCount(){return browserListeners.size;},
        selectFirstSite() { vm.runInContext('focusSite(sitePanel.sites[0])', context); },
        connectPanel(onReveal, onCollapse = () => {}) {context.onRevealTest=onReveal;context.onCollapseTest=onCollapse;vm.runInContext('sitePanelComponent={revealSite:onRevealTest,collapseOnMapClick:onCollapseTest}',context);},
        get selectedSiteId() {return vm.runInContext('selectedSiteId',context);},
        hoverSite(id) { context.hoverTestId=id; vm.runInContext('highlightSite(hoverTestId)', context); },
        get lastView() { return lastView; },
        get selectedAtNavigation() {return selectedAtNavigation;},
        setZoom: value => { zoom = value; },
        setWest: value => { west = value; },
        get reads() { return reads; },
        requestedModels,
        requestedIncludes,
        get profileReads() { return profileReads; },
        setAltitude(value) { context.testAltitude=value;vm.runInContext('setAltitudeEnabled(testAltitude)',context); },
        previewTime(value) { context.testPreviewTime=value;vm.runInContext('windForecast.setPreviewTimestamp(testPreviewTime)',context); },
        get additions() { return additions; },
        listenerCount: name => listeners.get(name)?.size ?? 0,
        emit: (name,event) => { for (const callback of [...(listeners.get(name) ?? [])]) callback(event); },
        async flush() {
            const pending = [...timers];
            timers.clear();
            await Promise.all(pending.map(([, callback]) => callback()));
        },
    };
}

test('sidebar model selection changes the shared Windy product without opening the forecast, preserves time and altitude, and reuses cached data',async()=>{
    const app=runtime();app.mount();await app.flush();await app.flush();
    app.store.set('level','950h');await app.flush();await app.flush();
    app.store.set('timestamp',1792674000000);
    const view=JSON.stringify(app.lastView),reads=app.reads;
    await app.setModel('gfs');
    assert.deepEqual(app.detailSyncSelections,['gfs']);
    assert.equal(app.store.get('product'),'gfs');
    assert.equal(app.panel.model,'gfs');
    assert.equal(app.panel.modelLabel,'GFS');
    assert.equal(app.store.get('level'),'950h');
    assert.equal(app.store.get('timestamp'),1792674000000);
    assert.equal(JSON.stringify(app.lastView),view);
    assert.equal(app.broadcasts.length,0,'Choosing a model must not open the bottom forecast');
    await app.flush();await app.flush();
    assert.equal(app.reads,reads+136);
    const loaded=app.reads;
    await app.setModel('gfs');await app.flush();assert.equal(app.reads,loaded);
    await app.setModel('ukv');await app.flush();await app.flush();
    assert.equal(app.store.get('product'),'ukv');assert.equal(app.reads,loaded);
    for(const invalid of ['radar','namConus',null])app.setModel(invalid);
    assert.deepEqual(app.detailSyncSelections,['gfs','gfs','ukv']);
    assert.equal(app.store.get('product'),'ukv');
    app.store.set('product','ecmwf');
    assert.equal(app.panel.model,'ecmwf','Panel follows model changes from Windy');
    app.destroy();assert.equal(app.detailSyncDestroyed,true);
});

test('sidebar offers models covering the whole site catalog independently of the viewport and filters',async()=>{
    const app=runtime();app.mount();await app.flush();await app.flush();
    assert.deepEqual(app.models.map(model=>model.id),['ukv','ecmwf','gfs','iconEu','aromeFrance','mblue']);
    assert.equal(app.pointProductQueries,136);
    const reads=app.reads;
    app.setWest(0);app.emit('moveend');app.setFilter('matched');await app.flush();
    assert.equal(app.reads,reads);assert.equal(app.pointProductQueries,136);
    assert.ok(app.models.some(model=>model.id==='aromeFrance'));
    app.store.set('product','iconD2');
    assert.equal(app.panel.model,'iconD2');
    assert.ok(app.models.some(model=>model.id==='iconD2'),'Preserve a model selected outside the plugin');
    app.destroy();
});

test('native Source changes synchronize point forecasts even without a map product change, retaining Meteoblue across map fallbacks',async()=>{
    const app=runtime();app.mount();await app.flush();await app.flush();
    app.nativeModel('mblue');await app.flush();await app.flush();
    assert.equal(app.panel.model,'mblue');assert.equal(app.store.get('product'),'ukv');
    app.store.set('product','ecmwf');await app.flush();
    assert.equal(app.panel.model,'mblue','Native map fallback must not replace the point forecast');
    app.nativeModel('ecmwf');await app.flush();await app.flush();
    assert.equal(app.panel.model,'ecmwf','An unchanged map product must still clear the point-only selection');
    app.nativeModel('gfs');await app.flush();await app.flush();
    assert.equal(app.store.get('product'),'ecmwf','Native Source handles its own raster model updates');assert.equal(app.panel.model,'gfs');
    app.destroy();
});

test('a map fallback outside regional coverage does not replace the selected site forecasts or fetch a different model',async()=>{
    const app=runtime({productMetadata:{ukv:{preferredProduct:'gfs',boundsAreInViewport:()=>false}}});
    app.mount();await app.flush();await app.flush();app.setModel('ukv');
    const reads=app.reads;app.store.set('product','gfs');await app.flush();
    assert.equal(app.panel.model,'ukv');assert.equal(app.reads,reads);assert.ok(app.requestedModels.every(model=>model==='ukv'));
    app.destroy();
});

test('rapid model choices serialize asynchronous Windy map writes and apply only the final model to native Source',async()=>{
    const app=runtime({asyncProductWrites:true});app.mount();await app.flush();await app.flush();
    const first=app.setModel('gfs');await Promise.resolve();await Promise.resolve();
    const skipped=app.setModel('ecmwf'),last=app.setModel('iconEu');
    assert.deepEqual(app.productWrites,['gfs']);assert.equal(app.panel.model,'iconEu');
    app.completeProductWrite();await first;
    for(let i=0;i<20&&app.productWrites.length<2;i++)await Promise.resolve();
    assert.equal(app.panel.model,'iconEu','A stale map completion must not replace the final point model');
    assert.deepEqual(app.productWrites,['gfs','iconEu']);assert.equal(app.maxProductWrites,1);
    app.completeProductWrite();await Promise.all([skipped,last]);
    assert.equal(app.store.get('product'),'iconEu');assert.deepEqual(app.detailSyncSelections,['iconEu']);
    app.destroy();
});

test('periodic metadata refresh updates a regional run while the map uses a fallback, including returned metadata without a product.minifest property',async()=>{
    let ref='2026-10-21T06:00:00Z';
    const app=runtime({productMetadata:{aromeFrance:{preferredProduct:'gfs',boundsAreInViewport:()=>false,loadMinifest:async()=>({ref})}}});
    app.mount();await app.flush();await app.flush();await app.setModel('aromeFrance');await app.flush();await app.flush();
    app.store.set('product','gfs');const reads=app.reads;
    ref='2026-10-21T12:00:00Z';app.refreshModelRuns();await Promise.resolve();await app.flush();await app.flush();
    assert.equal(app.panel.model,'aromeFrance');assert.equal(app.reads,reads+136);
    assert.ok(app.requestedModels.slice(reads).every(model=>model==='aromeFrance'));
    app.destroy();app.refreshModelRuns();await app.flush();assert.equal(app.reads,reads+136);
});

test('launch altitude is disabled even with a saved preference and only surface forecasts are fetched', async () => {
    const savedFilters = new Map([['fly-ireland.launch-altitude.v1','true']]);
    const app=runtime({savedFilters});app.mount();await app.flush();await app.flush();
    assert.equal(app.profileReads,0);
    assert.equal(app.reads,136);
    assert.ok(app.panel.sites.length>0);
    assert.equal(savedFilters.get('fly-ireland.launch-altitude.v1'),'false');
    app.setAltitude(true);await app.flush();
    assert.equal(app.profileReads,0);
    assert.ok(app.panel.allSites.every(s=>s.speed==='11.2 mph'));
    app.emit('moveend');app.store.set('timestamp',1792674000000);await app.flush();
    assert.equal(app.profileReads,0);assert.equal(app.reads,136);
    app.destroy();
});

test('altitude slider updates rose winds, directions, panel labels and matches from cached upper layers',async()=>{
    const app=runtime();app.mount();await app.flush();await app.flush();
    const reads=app.reads;assert.equal(app.profileReads,0);
    app.store.set('level','950h');await app.flush();await app.flush();
    assert.equal(app.store.get('level'),'950h');
    assert.equal(app.reads,reads*2);assert.equal(app.profileReads,0);
    assert.equal(app.requestedIncludes.filter(i=>i.airgram).length,reads);
    let marker=[...app.layers].find(layer=>layer.flySpot.name==='Big Colin');
    assert.equal(marker.reading.textContent,'17.9');assert.equal(marker.arrow.transform,'rotate(0)');
    assert.equal(app.panel.allSites.find(s=>s.id===marker.flySpot.id).speed,'17.9 mph');
    assert.equal(app.panel.levelLabel,'Wind at 950 hPa');assert.match(marker.root.title,/950 hPa/);
    app.setFilter('matched');await app.flush();assert.equal(app.layers.size,0);
    app.setFilter('all');await app.flush();
    app.store.set('timestamp',1792674000000);
    marker=[...app.layers].find(layer=>layer.flySpot.name==='Big Colin');
    assert.equal(marker.reading.textContent,'8.9');assert.equal(marker.arrow.transform,'rotate(90)');
    app.store.set('level','975h');await app.flush();
    assert.equal(app.panel.estimatedLayers,true);assert.match(marker.root.title,/Interpolated/);
    app.store.set('level','surface');await app.flush();
    assert.equal(app.panel.levelLabel,'Surface wind');assert.equal(marker.reading.textContent,'11.2');
    assert.equal(app.reads,reads*2);app.destroy();
});

test('rose clicks request native forecasts at the site coordinates with the current model, reveal cards and reuse the site cache',async()=>{
    const app=runtime();app.mount();await app.flush();await app.flush();
    const revealed=[];app.connectPanel(id=>revealed.push(id));
    for(const model of ['ukv','gfs']){
        app.store.set('product',model);await app.flush();await app.flush();
        const markers=[...app.layers].filter(layer=>layer.options?.icon?.className?.includes('mini-dial-icon'));
        const marker=markers[model==='ukv'?0:1];
        const view=JSON.stringify(app.lastView),reads=app.reads,time=app.store.get('timestamp');
        marker.getElement().click();
        assert.equal(revealed.at(-1),marker.flySpot.id);
        assert.equal(app.selectedSiteId,marker.flySpot.id);
        assert.deepEqual(app.broadcasts.at(-1),['rqstOpen','detail',{
            lat:marker.flySpot.lat,lon:marker.flySpot.lon,name:marker.flySpot.name,product:model,source:'other',
        }]);
        assert.equal(app.store.get('product'),model);
        assert.equal(app.store.get('timestamp'),time);
        assert.equal(JSON.stringify(app.lastView),view);
        await app.flush();assert.equal(app.reads,reads);
        const requests=app.broadcasts.length;
        marker.getElement().click({closest:()=>({tagName:'A'})});
        assert.equal(app.broadcasts.length,requests,'Menu links retain their own click action');
    }
    assert.equal(app.broadcasts.length,2);
    app.destroy();
});

test('selecting roses preserves the view when Windy opens its forecast and keeps selection after hover and redraw',async()=>{
    const app=runtime({nativeDetailNavigation:true});app.mount();await app.flush();await app.flush();
    const revealed=[];app.connectPanel(id=>revealed.push(id));
    const view=JSON.stringify(app.lastView);
    const sites=app.panel.allSites.slice(0,2);
    for(const site of sites){
        const marker=[...app.layers].find(layer=>layer.flySpot.id===site.id);
        marker.getElement().click();
        assert.equal(JSON.stringify(app.lastView),view,'Native forecast must not recenter a clicked rose');
        assert.equal(app.selectedSiteId,site.id);
        assert.equal(revealed.at(-1),site.id);
        assert.equal(app.store.get('detailLocation').externalOpen,false);
        app.hoverSite('');app.emit('moveend');await app.flush();
        const selected=[...app.layers].filter(layer=>layer.getElement().classList.contains('site-selected'));
        assert.equal(selected.length,1);
        assert.equal(selected[0].flySpot.id,site.id);
    }
    app.destroy();
});

test('a map background click clears selected and hovered roses without navigating, while rose clicks keep selection',async()=>{
    const app=runtime();app.mount();await app.flush();await app.flush();
    const marker=[...app.layers].find(layer=>layer.options?.icon?.className?.includes('mini-dial-icon'));
    marker.getElement().click();
    const selected=app.selectedSiteId,view=app.lastView,reads=app.reads;
    app.emit('click',{originalEvent:{target:{closest:()=>marker.getElement()}}});
    assert.equal(app.selectedSiteId,selected,'A bubbling click from a rose must keep its selection');
    app.emit('click',{originalEvent:{target:{closest:()=>null}}});
    assert.equal(app.selectedSiteId,'');
    assert.ok([...app.layers].every(layer=>!layer.getElement().classList.contains('site-selected')&&!layer.getElement().classList.contains('site-hovered')));
    app.emit('moveend');await app.flush();
    assert.ok([...app.layers].every(layer=>!layer.getElement().classList.contains('site-selected')));
    assert.equal(app.lastView,view,'Clearing selection must not navigate');
    app.selectFirstSite();assert.ok(app.selectedSiteId,'A card can select a site again');
    const cardView=app.lastView;
    app.emit('click');
    assert.equal(app.selectedSiteId,'');assert.equal(app.lastView,cardView);
    assert.equal(app.reads,reads);
    app.destroy();
    assert.equal(app.listenerCount('click'),0,'The map listener is removed when the plugin closes');
});

test('background map clicks request panel collapse even without a selected site and keep map layers active',async()=>{
    const app=runtime();app.mount();await app.flush();await app.flush();
    let collapsed=0;app.connectPanel(()=>{},()=>collapsed++);
    const layers=app.layers.size,reads=app.reads;
    app.emit('click',{originalEvent:{target:{closest:()=>null}}});
    assert.equal(collapsed,1);
    assert.equal(app.layers.size,layers);
    assert.equal(app.reads,reads);
    app.emit('click',{originalEvent:{target:{closest:()=>({})}}});
    assert.equal(collapsed,1,'Rose clicks must not collapse a revealed card');
    app.destroy();
});

test('wind units update cached roses and cards together and survive reopening without changing wind matches',async()=>{
    const savedFilters=new Map();let app=runtime({savedFilters});app.mount();await app.flush();await app.flush();
    const matches=app.panel.sites.map(site=>site.id),reads=app.reads,additions=app.additions;
    const marker=[...app.layers].find(layer=>layer.options?.icon?.className?.includes('mini-dial-icon'));
    app.setUnit('km/h');
    assert.equal(app.panel.allSites[0].speed,'18.0 km/h');
    assert.equal(app.panel.allSites[0].gust,'21.6 km/h');
    assert.match(app.panel.allSites[0].required,/8–20.9 km\/h/);
    assert.equal(marker.reading.textContent,'18.0');assert.equal(marker.unit.textContent,'km/h');
    assert.match(marker.root.title,/18.0 km\/h/);
    assert.deepEqual(app.panel.sites.map(site=>site.id),matches);
    await app.flush();assert.equal(app.reads,reads);assert.equal(app.additions,additions);
    app.destroy();app=runtime({savedFilters});app.mount();await app.flush();await app.flush();
    assert.equal(app.panel.allSites[0].speed,'18.0 km/h');
    app.setUnit('m/s');assert.equal(app.panel.allSites[0].speed,'5.0 m/s');
    app.setUnit('kt');assert.equal(app.panel.allSites[0].speed,'9.7 kt');
    app.setUnit('invalid');assert.equal(app.panel.allSites[0].speed,'11.2 mph');
    app.destroy();
});

test('weather symbols and cloud-base cards follow cached timeline previews and clear on a model switch',async()=>{
    const app=runtime();app.mount();await app.flush();await app.flush();
    assert.ok(app.requestedIncludes.every(include=>include.header&&include.meteogram));
    const marker=[...app.layers].find(layer=>layer.options?.icon?.className?.includes('mini-dial-icon'));
    assert.match(marker.sky.getAttribute('src'),/\/1\.png$/);
    assert.equal(app.panel.allSites[0].cloudBase.value,'300 m AGL');
    app.previewTime(1792674000000);await app.flush();
    assert.match(marker.sky.getAttribute('src'),/\/3\.png$/);
    assert.equal(app.panel.allSites[0].cloudBase.value,'600 m AGL');
    assert.equal(app.reads,136);assert.equal(app.profileReads,0);
    app.previewTime(1792677600000);await app.flush();
    assert.match(marker.sky.getAttribute('src'),/\/4_night_7\.png$/);
    app.store.set('product','gfs');
    assert.equal(marker.sky.style.display,'none');
    assert.equal(marker.sky.getAttribute('src'),undefined);
    assert.equal(app.panel.allSites[0].cloudBase.value,'Loading…');
    app.destroy();
});

test('requests hourly site forecasts so an hourly timeline uses its own hour for weather and wind',async()=>{
    const app=runtime({honorForecastStep:true});app.mount();await app.flush();await app.flush();
    app.store.set('timestamp',1792674000000);
    const marker=[...app.layers].find(layer=>layer.options?.icon?.className?.includes('mini-dial-icon'));
    assert.match(marker.sky.getAttribute('src'),/\/3\.png$/,'Use the weather for this hour, not the previous three-hour icon');
    assert.equal(marker.reading.textContent,'11.2','Use the actual hourly wind rather than interpolating a three-hour series');
    assert.equal(app.panel.allSites[0].weather.icon,3);
    assert.equal(app.reads,136,'Moving time must reuse the full hourly series');
    app.destroy();
});

test('plugin follows selected weather model at startup and on changes, updating map and panel labels', async () => {
    const app=runtime();app.store.set('product','ecmwf');app.mount();await app.flush();await app.flush();
    assert.equal(app.store.get('product'),'ecmwf');
    assert.equal(app.panel.modelLabel,'ECMWF');
    assert.ok(app.requestedModels.every(m=>m==='ecmwf'));
    app.setFilter('matched');await app.flush();assert.ok(app.layers.size>0);
    app.store.set('product','iconEu');
    assert.equal(app.panel.sites.length,0);assert.equal(app.panel.modelLabel,'ICON-EU');
    await app.flush();await app.flush();
    assert.equal(app.reads,272);assert.ok(app.requestedModels.slice(136).every(m=>m==='iconEu'));
    assert.ok(app.layers.size>0);
    const marker=[...app.layers].find(l=>l.options?.icon?.className?.includes('mini-dial-icon'));
    assert.match(marker.root.title ?? marker.options.title,/ICON-EU/);assert.doesNotMatch(marker.root.title ?? marker.options.title,/UKV/);
    app.emit('moveend');app.store.set('timestamp',1792674000000);await app.flush();
    assert.equal(app.reads,272);assert.equal(app.profileReads,0);
    app.store.set('product','ecmwf');await app.flush();await app.flush();
    assert.equal(app.reads,272,'returning to ECMWF must reuse all site forecasts');
    assert.equal(app.panel.modelLabel,'ECMWF');assert.ok(app.panel.sites.length>0);app.destroy();
});

test('Meteoblue AI populates roses and all site cards with no raster calendar', async () => {
    const app=runtime();app.mount();await app.flush();await app.flush();
    app.store.set('calendar',null);app.store.set('product','mblue');
    await app.flush();await app.flush();
    assert.equal(app.reads,272);
    assert.ok(app.requestedModels.slice(136).every(model=>model==='mblue'));
    assert.equal(app.panel.modelLabel,'Meteoblue AI');
    assert.equal(app.panel.allSites.length,136);
    assert.equal(app.panel.loading,0);assert.equal(app.panel.unavailable,0);
    const marker=[...app.layers].find(layer=>layer.flySpot.name==='Big Colin');
    assert.equal(marker.reading.textContent,'11.2');
    assert.equal(marker.arrow.visibility,'visible');
    assert.match(marker.root.title,/Meteoblue AI/);
    app.setWindValues([-3,0,0]);app.store.set('timestamp',1792674000000);await app.flush();
    assert.equal(marker.reading.textContent,'6.7');
    assert.equal(marker.arrow.transform,'rotate(90)');
    assert.equal(app.reads,272);
    app.destroy();
});

test('accepted imported locations use weather roses and cached forecasts, with old review filters migrated', async () => {
    const savedFilters=new Map([['fly-ireland.site-filters.v1',JSON.stringify({...defaultSiteFilters(),wind:'review'})]]);
    let app=runtime({savedFilters});app.mount();await app.flush();await app.flush();
    assert.equal(app.reads,136);
    assert.equal(app.panel.allSites.filter(s=>s.toVerify).length,0);
    assert.equal(app.filters.wind,'all');
    assert.equal(app.panel.allSites.filter(s=>s.id.startsWith('flybubble-')).length,38);
    const fullCircle=app.dialHTML('Knocknarea').match(/d="([^"]+)" class="use-arc/)[1];
    assert.equal((fullCircle.match(/ A /g)||[]).length,2,'360-degree ranges need two SVG arcs');
    const disjoint=app.dialHTML('Scalp').match(/d="([^"]+)" class="use-arc/)[1];
    assert.equal((disjoint.match(/M /g)||[]).length,2,'Disconnected ranges must stay separate on large roses');
    for(const zoom of [10,13,15]) {
        app.setZoom(zoom);app.emit('zoomend');await app.flush();
        assert.ok([...app.layers].every(l=>!l.options?.icon?.className?.includes('review-site-icon')));
        const marker=[...app.layers].find(l=>l.flySpot.name==='Scalp');
        app.hoverSite(marker.flySpot.id);
        assert.equal(marker.root.classList.contains('site-hovered'),true);
        app.store.set('timestamp',1792674000000);
        const card=app.panel.allSites.find(s=>s.name==='Scalp');
        assert.match(card.speed,/mph/);assert.match(card.gust,/mph/);
        assert.equal(card.rain.wet,false);
    }
    app.setFilter('matched');await app.flush();
    assert.ok([...app.layers].some(l=>l.flySpot.id.startsWith('flybubble-')));
    assert.equal(app.reads,136);
    app.destroy();assert.equal(app.layers.size,0);
    app=runtime({savedFilters});app.mount();await app.flush();await app.flush();
    assert.equal(app.filters.wind,'matched');assert.ok(app.layers.size>0);app.destroy();
});

test('map uses one native weather icon while cards retain rain amounts through cached timeline changes', async () => {
    const app=runtime();app.mount();await app.flush();await app.flush();
    const reads=app.reads;const matched=app.panel.sites.map(s=>s.id);
    for(const zoom of [10,13,14]) {
        app.store.set('timestamp',1792670400000);app.setZoom(zoom);app.emit('zoomend');await app.flush();
        const marker=[...app.layers].find(layer=>layer.flySpot?.name==='Big Colin' && !layer.options?.icon?.className?.includes('ui-icon'));
        const html=marker.options?.icon?.html ?? marker.content;
        assert.equal((html.match(/class="map-weather-icon"/g)??[]).length,1);
        assert.doesNotMatch(html,/map-rain-indicator|rain-drops/,'Map must not duplicate native rain symbols with custom droplets');
        assert.equal(app.panel.allSites.find(s=>s.name==='Big Colin').rain.wet,true);
        app.store.set('timestamp',1792674000000);
        assert.match(marker.sky.getAttribute('src'),/\/3\.png$/);
        assert.equal(app.panel.allSites.find(s=>s.name==='Big Colin').rain.wet,false);
        app.store.set('timestamp',1792677600000);
        assert.match(marker.sky.getAttribute('src'),/\/4_night_7\.png$/);
        assert.equal(app.panel.allSites.find(s=>s.name==='Big Colin').rain.wet,true);
        app.store.set('timestamp',1792681200000);
        assert.equal(marker.sky.style.display,'none');
        assert.equal(app.panel.allSites.find(s=>s.name==='Big Colin').rain.value,'No data');
    }
    assert.deepEqual(app.panel.sites.map(s=>s.id),matched);assert.equal(app.reads,reads);app.destroy();
});

test('region and type filters scope all zoom tiers and panel counts without refetching', async () => {
    const app=runtime();app.mount();await app.flush();await app.flush();
    const reads=app.reads;
    const filters={regions:['north-east','north-west'],siteType:'coastal',wind:'all'};
    app.setFilters(filters);await app.flush();
    const expected=app.panel.allSites.filter(s=>filters.regions.includes(s.region)&&s.siteType==='coastal');
    assert.ok(expected.length>0&&expected.length<95);
    assert.deepEqual(app.scopedPanel.allSites.map(s=>s.id),expected.map(s=>s.id));
    for(const zoom of [10,13,14]){
        app.setZoom(zoom);app.emit('zoomend');await app.flush();
        assert.deepEqual(new Set([...app.layers].map(layer=>layer.flySpot.id)),new Set(expected.map(s=>s.id)));
        app.setFilter('matched');await app.flush();
        assert.deepEqual(new Set([...app.layers].map(layer=>layer.flySpot.id)),new Set(expected.filter(s=>s.status==='pass').map(s=>s.id)));
        app.setFilter('all');await app.flush();
    }
    app.setWest(1000);app.emit('moveend');await app.flush();
    assert.equal(app.layers.size,0);assert.equal(app.scopedPanel.allSites.length,expected.length);
    assert.equal(app.reads,reads);app.destroy();
});

test('reopening restores all filter dimensions and reset restores all original and review sites', async () => {
    const savedFilters=new Map();
    let app=runtime({savedFilters});app.mount();await app.flush();await app.flush();
    const selected={...defaultSiteFilters(),regions:['south-west'],siteType:'inland',wind:'matched'};
    app.setFilters(selected);await app.flush();app.destroy();
    app=runtime({savedFilters});app.mount();await app.flush();await app.flush();
    assert.deepEqual(app.filters,selected);
    assert.ok(app.scopedPanel.allSites.every(site=>site.region==='south-west'&&site.siteType==='inland'));
    app.setFilters(defaultSiteFilters());await app.flush();
    assert.equal(app.scopedPanel.allSites.length,136);assert.equal(app.layers.size,136);app.destroy();
    app=runtime({savedFilters});app.mount();await app.flush();await app.flush();
    assert.deepEqual(app.filters,defaultSiteFilters());app.destroy();
});

test('YouTube filter shares map and sidebar membership at every zoom and survives reopening without refetching',async()=>{
    const savedFilters=new Map();
    const options={savedFilters,includeApprovedSites:true,projectionScale:10000};
    let app=runtime(options);app.mount();await app.flush();await app.flush();
    const reads=app.reads,all=app.panel.allSites;
    const videos=all.filter(site=>site.youtube?.length);
    assert.ok(videos.length>0&&videos.length<all.length);
    assert.ok(videos.some(site=>site.id.startsWith('pgmap-')),'Approved additions must be included');
    const selected={...defaultSiteFilters(),withVideos:true};
    app.setFilters(selected);await app.flush();
    for(const zoom of [10,13,14]){
        app.setZoom(zoom);app.emit('zoomend');await app.flush();
        assert.deepEqual(app.scopedPanel.allSites.map(site=>site.id),videos.map(site=>site.id));
        assert.deepEqual(new Set([...app.layers].map(layer=>layer.flySpot.id)),new Set(videos.map(site=>site.id)));
        app.setFilter('matched');await app.flush();
        assert.deepEqual(new Set([...app.layers].map(layer=>layer.flySpot.id)),new Set(videos.filter(site=>site.status==='pass').map(site=>site.id)));
        app.setFilter('all');await app.flush();
    }
    const first=videos[0];
    app.setFilters({...selected,regions:[first.region],siteType:first.siteType});await app.flush();
    assert.deepEqual(app.scopedPanel.allSites.map(site=>site.id),videos.filter(site=>site.region===first.region&&site.siteType===first.siteType).map(site=>site.id));
    app.setFilters(selected);await app.flush();
    assert.equal(app.reads,reads);assert.equal(app.panel.allSites.length,all.length);
    app.destroy();app=runtime(options);app.mount();await app.flush();await app.flush();
    assert.deepEqual(app.filters,selected);
    assert.deepEqual(app.scopedPanel.allSites.map(site=>site.id),videos.map(site=>site.id));
    const reopenedReads=app.reads;
    app.setFilters(defaultSiteFilters());await app.flush();
    assert.equal(app.scopedPanel.allSites.length,all.length);
    assert.equal(app.layers.size,all.length);assert.equal(app.reads,reopenedReads);app.destroy();
});

test('shows Irish spots with Leaflet GL, without the removed L.point factory', () => {
    const app = runtime();
    app.mount();
    app.emit('moveend');
    app.flush();
    assert.ok([...app.layers].some(layer =>
        layer.content?.includes('Big Colin') || layer.options?.title?.startsWith('Big Colin:')));
});

test('card hover identifies only its map site across zoom tiers without refetching or moving the map', async () => {
    const app=runtime(); app.mount(); await app.flush(); await app.flush();
    const [first,second]=app.panel.allSites;
    const reads=app.reads, view=app.lastView;
    for(const zoom of [10,13,14]) {
        app.setZoom(zoom); app.emit('zoomend'); await app.flush();
        app.hoverSite(first.id);
        let highlighted=[...app.layers].filter(layer=>layer.getElement().classList.contains('site-hovered'));
        assert.ok(highlighted.length>0);
        assert.ok(highlighted.every(layer=>layer.flySpot.id===first.id));
        app.hoverSite(second.id);
        app.emit('moveend'); await app.flush();
        highlighted=[...app.layers].filter(layer=>layer.getElement().classList.contains('site-hovered'));
        assert.ok(highlighted.length>0);
        assert.ok(highlighted.every(layer=>layer.flySpot.id===second.id));
        app.hoverSite('');
        assert.ok([...app.layers].every(layer=>!layer.getElement().classList.contains('site-hovered')));
    }
    assert.equal(app.reads,reads); assert.equal(app.lastView,view);
    app.destroy();
});

test('overlapping roses keep a unique geographic stacking order across zoom, filters and redraws',async()=>{
    const app=runtime();app.mount();await app.flush();await app.flush();
    const pair=['Mayobridge','Mayobridge North'];
    const ranks=()=>pair.map(name=>[...app.layers].filter(layer=>layer.flySpot?.name===name).map(layer=>Number(layer.getElement().style['--site-stack-order'])));
    const initial=ranks().map(values=>values[0]),reads=app.reads;
    assert.ok(initial.every(Number.isFinite),'Each site needs a fixed stacking priority');
    assert.ok(initial[0]>initial[1],'Keep the southern rose above its northern neighbour');
    for(const zoom of [9,10.5,12,13,14,15,10]){
        app.setZoom(zoom);app.emit('zoomend');await app.flush();
        for(const [index,values]of ranks().entries()){
            assert.ok(values.length>0);
            assert.ok(values.every(value=>value===initial[index]),'A site must keep its priority for both rose and menu layers');
        }
    }
    app.setFilters({wind:'all',regions:['north-east'],siteType:'inland'});await app.flush();
    assert.deepEqual(ranks().map(values=>values[0]),initial);
    app.setUnit('km/h');app.store.set('timestamp',1792674000000);
    assert.deepEqual(ranks().map(values=>values[0]),initial);
    assert.equal(app.reads,reads);
    app.destroy();
});

test('mini roses show speed in the center and update the incoming wind arrow with timeline changes', async () => {
    const app = runtime();
    app.mount();
    await app.flush();
    await app.flush();
    const marker = [...app.layers].find(layer => layer.options?.title?.startsWith('Big Colin:'));
    assert.ok(marker);
    assert.doesNotMatch(marker.options.icon.html, /<textPath|>N<|mini-wind-arc/);
    assert.match(marker.options.icon.html, /mini-wind-direction/);
    assert.equal(marker.center.fill, '#15803d');
    assert.equal(marker.reading.textContent, '11.2');
    assert.equal(marker.arrow.transform, 'rotate(180)');
    assert.equal(marker.arrow.visibility, 'visible');
    assert.equal(marker.options.icon.iconSize[0], 54);
    assert.match(marker.getElement().title, /Wind OK/);
    assert.match(marker.getElement().title, /11\.2 mph/);
    app.setWindValues([-3,0,0]);
    app.store.set('timestamp', 1792674000000);
    assert.equal(marker.reading.textContent, '6.7');
    assert.equal(marker.arrow.transform, 'rotate(90)');
    assert.match(marker.getElement().title, /90°/);
    app.store.set('product', 'radar');
    assert.equal(marker.reading.textContent, '—');
    assert.equal(marker.arrow.visibility, 'hidden');
    app.destroy();
    await app.flush();
    assert.equal(app.layers.size, 0);
});

test('large roses update speed, incoming direction and weather from cached time previews, units and model changes',async()=>{
    const app=runtime({projectionScale:10000});app.mount();await app.flush();await app.flush();
    app.setZoom(15);app.emit('zoomend');await app.flush();
    const marker=[...app.layers].find(layer=>layer.flySpot.name==='Big Colin'&&layer.options.icon.className.split(' ').includes('dial-icon'));
    assert.ok(marker);assert.match(marker.options.icon.html,/large-wind-direction/);assert.match(marker.options.icon.html,/large-wind-reading/);
    assert.equal(marker.reading.textContent,'11.2');assert.equal(marker.unit.textContent,'mph');
    assert.equal(marker.arrow.transform,'rotate(180)');assert.equal(marker.arrow.visibility,'visible');
    assert.equal(marker.center.fill,'#15803d');assert.match(marker.sky.getAttribute('src'),/\/1\.png$/);
    const committed=app.store.get('timestamp'),reads=app.reads,additions=app.additions;
    app.setWindValues([-3,0,0]);app.previewTime(committed+3600000);
    assert.equal(marker.reading.textContent,'6.7');assert.equal(marker.arrow.transform,'rotate(90)');
    assert.match(marker.sky.getAttribute('src'),/\/3\.png$/);
    app.setUnit('kt');assert.equal(marker.reading.textContent,'5.8');assert.equal(marker.unit.textContent,'kt');
    assert.equal(app.store.get('timestamp'),committed);assert.equal(app.reads,reads);assert.equal(app.additions,additions);
    app.store.set('product','gfs');assert.equal(marker.arrow.visibility,'hidden');assert.equal(marker.reading.textContent,'…');
    assert.equal(marker.sky.style.display,'none');await app.flush();await app.flush();
    assert.equal(marker.reading.textContent,'5.8');assert.equal(marker.arrow.transform,'rotate(90)');
    app.setWindValues([0,0,0]);app.previewTime(committed+7200000);
    assert.equal(marker.reading.textContent,'0.0');assert.equal(marker.arrow.visibility,'hidden');
    app.destroy();
});

test('uncommitted slider time updates map roses and cards together while Windy time stays unchanged',async()=>{
    const app=runtime();app.mount();await app.flush();await app.flush();
    const marker=[...app.layers].find(layer=>layer.flySpot.name==='Big Colin');
    const actualTime=app.store.get('timestamp'),reads=app.reads;
    app.setWindValues([-3,0,0]);app.previewTime(actualTime+3600000);
    assert.equal(app.store.get('timestamp'),actualTime);
    assert.equal(marker.reading.textContent,'6.7');
    assert.equal(marker.arrow.transform,'rotate(90)');
    assert.equal(app.panel.allSites.find(site=>site.name==='Big Colin').speed,'6.7 mph');
    assert.match(app.panel.time,/14:00 UTC\+1/);
    assert.match(marker.getElement().title,/14:00 UTC\+1/);
    assert.equal(app.reads,reads);
    app.previewTime(undefined);
    assert.equal(marker.reading.textContent,'11.2');
    assert.match(app.panel.time,/13:00 UTC\+1/);
    assert.match(marker.getElement().title,/13:00 UTC\+1/);
    app.destroy();
});

test('wind arrow uses the FROM side for all cardinal directions and hides for calm', async () => {
    for (const [windValues, direction] of [[[0,-5,0],0],[[-5,0,0],90],[[0,5,0],180],[[5,0,0],270],[[0,0,0],null]]) {
        const app=runtime({windValues}); app.mount(); await app.flush(); await app.flush();
        const marker=[...app.layers].find(layer=>layer.options?.title?.startsWith('Big Colin:'));
        assert.equal(marker.arrow.visibility,direction===null?'hidden':'visible');
        assert.equal(marker.arrow.transform,`rotate(${direction??0})`);
        if(direction===null) assert.equal(marker.reading.textContent,'0.0');
        app.destroy();
    }
});

test('light wind has a blue center and an English hover explanation', async () => {
    const app = runtime({ windValues: [0, 1, 0] });
    app.mount(); await app.flush(); await app.flush();
    const marker = [...app.layers].find(layer => layer.options?.title?.startsWith('Big Colin:'));
    assert.equal(marker.center.fill, '#2563eb');
    assert.equal(marker.reading.textContent, '2.2');
    assert.match(marker.getElement().title, /Too light/);
    assert.match(marker.getElement().title, /5–13 mph/);
    app.destroy();
});

test('mini and large roses switch between no alert, yellow gusts and red strong gusts without rebuilding markers',async()=>{
    for(const zoom of [10,15]){
        const app=runtime({projectionScale:10000});app.mount();await app.flush();await app.flush();
        app.setZoom(zoom);app.emit('zoomend');await app.flush();
        const marker=[...app.layers].find(layer=>layer.flySpot?.name==='Big Colin'&&layer.options?.icon?.html?.includes('forecast-wind-center'));
        const warning=marker.getElement().querySelector('.map-gust-warning');
        assert.ok(warning,'Both rose sizes need a gust-warning slot');
        assert.equal(warning.style.display,'none');
        const time=app.store.get('timestamp'),reads=app.reads,additions=app.additions,matched=app.panel.sites.map(site=>site.id);
        app.setGustValues(8);app.previewTime(time+3600000);
        assert.notEqual(warning.style.display,'none');
        assert.equal(warning.attributes['data-severity'],'gusty');
        assert.match(warning.title,/Gusty.*17\.9 mph/);
        assert.equal(app.panel.allSites.find(site=>site.id===marker.flySpot.id).gustWarning.label,'Gusty');
        app.setGustValues(11);app.previewTime(time+7200000);
        assert.notEqual(warning.style.display,'none');
        assert.equal(warning.attributes['data-severity'],'strong');
        assert.match(warning.title,/Strong gusts.*24\.6 mph/);
        assert.match(marker.getElement().title,/Strong gusts/);
        assert.equal(app.panel.allSites.find(site=>site.id===marker.flySpot.id).gustWarning?.active,true);
        assert.equal(marker.center.fill,'#15803d','Gust warning is independent of wind matching');
        assert.deepEqual(app.panel.sites.map(site=>site.id),matched);
        app.setUnit('kt');assert.match(warning.title,/21\.4 kt/);assert.notEqual(warning.style.display,'none');
        app.setWindValues([0,12*.44704,0]);app.setGustValues(16*.44704);app.previewTime(time+3600000);
        assert.equal(warning.style.display,'none','12 mph mean and 16 mph gusts must not warn');
        app.setGustValues(6);app.previewTime(time+3600000);assert.equal(warning.style.display,'none');
        assert.equal(app.panel.allSites.find(site=>site.id===marker.flySpot.id).gustWarning.active,false);
        app.setGustValues(NaN);app.previewTime(time+7200000);assert.equal(warning.style.display,'none');
        assert.equal(app.reads,reads);assert.equal(app.additions,additions);app.destroy();
    }
});

test('panel follows forecast changes and selecting a card focuses its site without fetching again', async () => {
    const app = runtime();
    app.mount(); await app.flush(); await app.flush();
    assert.ok(app.panel.sites.length > 0);
    const first = app.panel.sites[0];
    const readCount = app.reads;
    app.selectFirstSite(); await app.flush();
    assert.equal(app.lastView.coords[0], first.lat);
    assert.equal(app.lastView.coords[1], first.lon);
    assert.equal(app.lastView.zoom, 12);
    assert.equal(app.lastView.options.animate,true,'Card navigation must animate');
    assert.ok(app.lastView.options.duration>0,'Map movement needs a nonzero animation duration');
    assert.equal(app.selectedSiteId,first.id);
    assert.equal(app.reads, readCount);
    app.store.set('timestamp', 1792674000000);
    assert.ok(app.panel.sites.length > 0);
    assert.equal(app.panel.loading, 0);
    await app.flush();
    assert.ok(app.panel.sites.length > 0);
    app.store.set('product', 'radar');
    assert.equal(app.panel.sites.length, 0);
    assert.equal(app.panel.settings, true);
    app.destroy();
});

test('an offscreen card prepares its selected rose before navigation and keeps it rendered while moving without an entrance animation',async()=>{
    for(const zoom of [12,15]){
        const app=runtime();app.mount();await app.flush();await app.flush();
        const site=app.panel.sites[0],reads=app.reads;
        app.setWest(0);app.setZoom(zoom);app.emit('moveend');await app.flush();
        assert.ok(![...app.layers].some(layer=>layer.flySpot?.id===site.id),'The destination must begin outside the rendered viewport');
        app.selectFirstSite();
        assert.ok(app.selectedAtNavigation.includes(site.id),'Create the selected rose before starting the map animation');
        const rose=()=>[...app.layers].find(layer=>layer.flySpot?.id===site.id&&/mini-dial-icon| dial-icon/.test(layer.options?.icon?.className));
        assert.ok(rose(),'Selected rose must exist before deferred moveend rendering');
        app.emit('moveend');await app.flush();
        assert.ok(rose(),'Keep the selected rose even while bounds still report the previous viewport');
        assert.ok(rose().getElement().classList.contains('site-selected'));
        assert.doesNotMatch(rose().options.icon.html,/animate-pre|animate-arm/,'Do not fade the selected destination in after navigation');
        assert.equal(app.reads,reads,'Preparing a rose must use cached forecast data');
        app.destroy();assert.equal(app.layers.size,0);
    }
});

test('map filter hides non-matching roses and restores all sites without refetching', async () => {
    const app = runtime(); app.mount(); await app.flush(); await app.flush();
    const allIds = [...app.layers].map(layer=>layer.flySpot?.id).filter(Boolean).sort();
    const expected = app.panel.sites.map(site=>site.id).sort();
    const reads = app.reads;
    assert.ok(allIds.length > expected.length);
    app.setFilter('matched'); await app.flush();
    assert.deepEqual([...app.layers].map(layer=>layer.flySpot?.id).filter(Boolean).sort(), Array.from(expected));
    app.emit('moveend'); await app.flush();
    assert.equal(app.layers.size,expected.length);
    app.setFilter('all'); await app.flush();
    assert.deepEqual([...app.layers].map(layer=>layer.flySpot?.id).filter(Boolean).sort(),allIds);
    assert.equal(app.reads,reads);
    app.destroy();
});

test('matched filter removes every marker and label tier for excessive wind', async () => {
    const app=runtime({windValues:[0,8,0]}); app.mount(); await app.flush(); await app.flush();
    for (const zoom of [10,13,14]) {
        app.setFilter('all'); app.setZoom(zoom); app.emit('zoomend'); await app.flush();
        assert.ok(app.layers.size>0);
        app.setFilter('matched'); await app.flush();
        assert.equal(app.layers.size,0);
    }
    app.destroy();
});

test('matched map removes old matches for products without a wind forecast', async () => {
    const app=runtime(); app.mount(); await app.flush(); await app.flush();
    app.setFilter('matched'); await app.flush(); assert.ok(app.layers.size>0);
    app.store.set('product','radar'); await app.flush();
    assert.equal(app.layers.size,0);
    app.setFilter('all'); await app.flush(); assert.ok(app.layers.size>0);
    app.destroy();
});

test('matched map follows timeline results and adds matching roses back progressively', async () => {
    const app=runtime(); app.mount(); await app.flush(); await app.flush();
    app.setFilter('matched'); await app.flush(); assert.ok(app.layers.size>0);
    app.setWindValues([0,8,0]); app.store.set('timestamp',1792674000000);
    await app.flush(); await app.flush();
    assert.equal(app.layers.size,0);
    app.setWindValues([0,5,0]); app.store.set('timestamp',1792677600000);
    await app.flush(); await app.flush();
    assert.ok(app.layers.size>0);
    assert.ok([...app.layers].every(layer=>app.panel.sites.some(site=>site.id===layer.flySpot.id)));
    app.destroy();
});

test('light direction matches stay on the map and sidebar at every zoom without changing their blue warning state',async()=>{
    const app=runtime({projectionScale:10000});app.mount();await app.flush();await app.flush();
    app.setFilter('matched');await app.flush();
    const ids=app.panel.sites.map(site=>site.id),reads=app.reads;
    app.setWindValues([0,1,0]);app.store.set('timestamp',1792674000000);await app.flush();
    assert.deepEqual(app.panel.sites.map(site=>site.id),ids);
    assert.deepEqual(app.scopedPanel.sites.map(site=>site.id),ids);
    assert.ok(app.panel.sites.every(site=>site.status==='fail'&&site.label==='Too light'));
    assert.ok(!app.panel.sites.some(site=>site.name==='Slemish'),'An incorrect direction remains excluded even when the wind is weak');
    for(const zoom of [10,13,15]){
        app.setZoom(zoom);app.emit('zoomend');await app.flush();
        assert.deepEqual(new Set([...app.layers].map(marker=>marker.flySpot.id)),new Set(ids));
        const rose=[...app.layers].find(marker=>marker.flySpot.name==='Big Colin'&&marker.options?.icon?.html?.includes('forecast-wind-center'));
        assert.ok(rose);assert.match(rose.options.icon.html,/class="(?:mini|large)-wind-center forecast-wind-center"[^>]*fill="#2563eb"/);
    }
    assert.equal(app.reads,reads);app.destroy();
});

test('Skeagh uses the corrected 50–120 degree range for forecasts and map roses',async()=>{
    const app=runtime({windValues:[-4.330127018922193,-2.5,0]});app.mount();await app.flush();await app.flush();
    let site=app.panel.allSites.find(site=>site.name==='Skeagh');
    assert.equal(site.status,'pass','A wind from 60 degrees is in the corrected sector');
    assert.equal(site.required,'5–13 mph · 50°–120°');
    app.setWindValues([-2.5,4.330127018922193,0]);app.store.set('timestamp',1792674000000);
    site=app.panel.allSites.find(site=>site.name==='Skeagh');
    assert.equal(site.status,'fail');assert.equal(site.label,'Direction outside range');app.destroy();
});

test('panning and zooming reuse all-site readings and mini roses remain through zoom 13 without label cards', async () => {
    const app = runtime();
    app.mount(); await app.flush(); await app.flush();
    const initialReads = app.reads;
    assert.ok(initialReads > 0);
    app.setWest(1000); app.emit('moveend'); await app.flush();
    assert.equal(app.layers.size, 0);
    app.setWest(-1000); app.emit('moveend'); await app.flush();
    const marker = [...app.layers].find(layer => layer.options?.title?.startsWith('Big Colin:'));
    assert.match(marker.options.title, /Wind OK/);
    assert.match(marker.options.icon.html, />11\.2<\/text>/);
    assert.match(marker.options.icon.html, />mph<\/text>/);
    app.setZoom(12); app.emit('zoomend'); await app.flush();
    assert.ok([...app.layers].some(layer => layer.options?.icon?.className.includes('mini-dial-icon')));
    app.setZoom(13); app.emit('zoomend'); await app.flush();
    assert.ok([...app.layers].some(layer => layer.options?.title?.startsWith('Big Colin:')));
    assert.ok([...app.layers].every(layer => layer.options?.icon?.className.includes('mini-dial-icon')));
    for(const zoom of [14,15]){
        app.setZoom(zoom);app.emit('zoomend');await app.flush();
        assert.ok(app.layers.size>0);
        assert.ok([...app.layers].every(layer=>!layer.content),'Crowded roses stay miniature instead of becoming label cards');
    }
    assert.equal(app.reads, initialReads);
    app.store.set('timestamp', 1792674000000); await app.flush();
    assert.equal(app.reads, initialReads);
    app.destroy();
});

test('defers layer updates until after the map moveend callback returns', () => {
    const app = runtime({ legacyPoint: true });
    app.mount();
    app.emit('moveend');
    assert.equal(app.layers.size, 0);
    app.flush();
    assert.ok(app.layers.size > 0);
});

test('closing before initial render leaves no layers or delayed startup', () => {
    const app = runtime({ legacyPoint: true });
    app.mount();
    app.destroy();
    app.flush();
    app.emit('moveend');
    app.flush();
    assert.equal(app.layers.size, 0);
    assert.equal(app.additions, 0);
});

test('closing cancels a pending render after panning', () => {
    const app = runtime({ legacyPoint: true });
    app.mount();
    app.emit('moveend');
    app.flush();
    assert.ok(app.layers.size > 0);
    app.emit('moveend');
    app.destroy();
    app.flush();
    assert.equal(app.layers.size, 0);
});

test('startup also renders when setView does not emit moveend', () => {
    const app = runtime({ legacyPoint: true });
    app.mount();
    app.flush();
    assert.ok(app.layers.size > 0);
});

test('all site forecasts load even when the viewport contains no sites, and the panel stays stable on pan/zoom', async () => {
    const app=runtime();app.setWest(1000);app.mount();await app.flush();await app.flush();
    assert.equal(app.layers.size,0);
    assert.equal(app.reads,136);
    const names=app.panel.sites.map(site=>site.name).join('|');
    assert.ok(names.includes('Big Colin'));
    app.setWest(-1000);app.setZoom(15);app.emit('moveend');app.emit('zoomend');await app.flush();
    assert.equal(app.panel.sites.map(site=>site.name).join('|'),names);
    assert.equal(app.reads,136);
    app.setFilter('matched');await app.flush();
    app.setWest(1000);app.emit('moveend');await app.flush();
    assert.equal(app.layers.size,0);
    assert.equal(app.panel.sites.map(site=>site.name).join('|'),names);
    app.destroy();
});

test('candidate decisions preserve original forecasts, keep accepted pins and remove rejected pins across reopening',async()=>{
    const savedFilters=new Map();
    const app=runtime({savedFilters,enableCandidateReview:true});
    app.mount();await app.flush();await app.flush();
    const [accepted,rejected]=paraglidingMapSites;
    assert.equal(app.filters.wind,'review');assert.equal(app.lastView.zoom,7);
    assert.equal(app.panel.allSites.length,215);
    assert.equal(app.panel.allSites.filter(site=>site.id.startsWith('pgmap-')).length,79);
    assert.equal(app.reads,136,'Preview locations must not join the forecast request queue');
    const reads=app.reads,view=JSON.stringify(app.lastView);
    app.review(accepted.id,'accepted');await app.flush();
    const acceptedPin=[...app.layers].find(layer=>layer.flySpot.id===accepted.id);
    assert.match(acceptedPin.options.icon.className,/review-accepted/);
    assert.match(acceptedPin.options.icon.html,/✓/);
    app.review(rejected.id,'rejected');await app.flush();
    assert.equal(app.panel.allSites.some(site=>site.id===rejected.id),false);
    assert.equal([...app.layers].some(layer=>layer.flySpot.id===rejected.id),false);
    assert.deepEqual(app.reviewSummary,{pending:77,accepted:1,rejected:1,total:79});
    assert.equal(app.panel.allSites.filter(site=>!site.toVerify).length,136);
    assert.equal(app.panel.sites.some(site=>site.id===accepted.id),false,'Accepting a location does not verify its wind limits');
    assert.equal(app.reads,reads);assert.equal(JSON.stringify(app.lastView),view);
    app.undoReview();await app.flush();
    assert.equal(app.panel.allSites.find(site=>site.id===rejected.id).reviewState,'pending');
    assert.ok([...app.layers].some(layer=>layer.flySpot.id===rejected.id));
    app.review(rejected.id,'rejected');await app.flush();
    app.destroy();assert.equal(app.browserListenerCount,0);
    const reopened=runtime({savedFilters,enableCandidateReview:true});
    reopened.mount();await reopened.flush();await reopened.flush();
    assert.deepEqual(reopened.reviewSummary,{pending:77,accepted:1,rejected:1,total:79});
    assert.equal(reopened.panel.allSites.length,214);
    assert.equal(reopened.panel.allSites.find(site=>site.id===accepted.id).reviewState,'accepted');
    assert.equal(reopened.panel.allSites.some(site=>site.id===rejected.id),false);
    reopened.setFilter('all');await reopened.flush();
    assert.equal(reopened.scopedPanel.allSites.length,214);
    reopened.destroy();
});

test('review changes from another tab refresh markers without reloading forecasts and unsubscribe on teardown',async()=>{
    const savedFilters=new Map();
    const app=runtime({savedFilters,enableCandidateReview:true});app.mount();await app.flush();await app.flush();
    const [site]=paraglidingMapSites,reads=app.reads;
    savedFilters.set(SITE_REVIEW_STORAGE_KEY,JSON.stringify({version:1,decisions:{[site.id]:'accepted'}}));
    app.emitStorage(SITE_REVIEW_STORAGE_KEY);await app.flush();
    assert.equal(app.panel.allSites.find(spot=>spot.id===site.id).reviewState,'accepted');
    assert.match([...app.layers].find(layer=>layer.flySpot.id===site.id).options.icon.className,/review-accepted/);
    assert.equal(app.reads,reads);assert.equal(app.browserListenerCount,1);
    app.destroy();assert.equal(app.browserListenerCount,0);
    app.emitStorage(SITE_REVIEW_STORAGE_KEY);await app.flush();assert.equal(app.layers.size,0);
});

test('stale tabs and Undo preserve choices already saved by another tab before its storage event arrives',async()=>{
    const savedFilters=new Map(),first=runtime({savedFilters,enableCandidateReview:true}),second=runtime({savedFilters,enableCandidateReview:true});
    first.mount();second.mount();await first.flush();await second.flush();await first.flush();await second.flush();
    const [a,b]=paraglidingMapSites;
    first.review(a.id,'accepted');
    // The second instance has not received the first instance's storage event.
    second.review(b.id,'rejected');
    let saved=JSON.parse(savedFilters.get(SITE_REVIEW_STORAGE_KEY)).decisions;
    assert.equal(saved[a.id],'accepted','A stale tab must not erase the other tab’s acceptance');
    assert.equal(saved[b.id],'rejected');
    // Undo in the first instance must preserve the second instance's rejection.
    first.undoReview();
    saved=JSON.parse(savedFilters.get(SITE_REVIEW_STORAGE_KEY)).decisions;
    assert.equal(saved[a.id],undefined);assert.equal(saved[b.id],'rejected');
    first.emitStorage(SITE_REVIEW_STORAGE_KEY);second.emitStorage(SITE_REVIEW_STORAGE_KEY);
    assert.deepEqual(first.reviewSummary,{pending:78,accepted:0,rejected:1,total:79});
    assert.deepEqual(second.reviewSummary,first.reviewSummary);
    first.destroy();second.destroy();
});

test('71 approved permanent locations appear beside 136 original sites independently of stale or absent browser review choices',async()=>{
    for(const stale of [false,true]){
        const savedFilters=new Map();
        if(stale){
            savedFilters.set(SITE_REVIEW_STORAGE_KEY,JSON.stringify({version:1,decisions:Object.fromEntries(paraglidingMapSites.map(site=>[site.id,['pgmap-127367','pgmap-127568','pgmap-162917','pgmap-127656','pgmap-127835','pgmap-127745'].includes(site.id)?'accepted':'rejected']))}));
            savedFilters.set('fly-ireland.site-filters.v1',JSON.stringify({...defaultSiteFilters(),wind:'review'}));
        }
        const app=runtime({savedFilters,includeApprovedSites:true});app.mount();await app.flush();await app.flush();
        assert.equal(app.filters.wind,'all','Completed location reviews should open the permanent catalogue');
        assert.equal(app.panel.allSites.length,207);
        assert.equal(new Set(app.panel.allSites.map(site=>site.id)).size,207);
        assert.equal(app.panel.allSites.filter(site=>site.reviewFinalized).length,71);
        assert.deepEqual(app.reviewSummary,{pending:0,accepted:0,rejected:0,total:0});
        assert.equal(app.reads,207,'The 71 imported sites with source or owner-confirmed sectors join the forecast request queue');
        for(const id of ['pgmap-127414','pgmap-127748','pgmap-127367','pgmap-127568','pgmap-162917','pgmap-127656','pgmap-127835','pgmap-127745']){
            assert.equal(app.panel.allSites.some(site=>site.id===id),false);
            assert.equal([...app.layers].some(layer=>layer.flySpot.id===id),false);
        }
        for(const site of approvedParaglidingMapSites){
            const marker=[...app.layers].find(layer=>layer.flySpot.id===site.id);
            assert.ok(marker,site.name);
            if(site.toVerify)assert.match(marker.options.icon.className,/review-accepted/);
            else assert.doesNotMatch(marker.options.icon.className,/review-site-icon/);
        }
        const reads=app.reads;
        app.setFilter('matched');await app.flush();
        assert.ok([...app.layers].every(layer=>!layer.flySpot.toVerify));
        assert.ok([...app.layers].some(layer=>layer.flySpot.reviewFinalized),'Source wind sectors should participate in wind matches');
        app.setFilter('all');await app.flush();assert.equal(app.layers.size,207);
        app.store.set('timestamp',1792674000000);await app.flush();
        assert.equal(app.reads,reads);assert.equal(app.panel.allSites.length,207);
        app.destroy();assert.equal(app.layers.size,0);
    }
});

test('videos appear only on large roses, while decisions survive zoom and reopening without forecast requests',async()=>{
    const savedFilters=new Map(),url='https://www.youtube.com/watch?v=whaqT_LWvdk';
    const app=runtime({includeApprovedSites:true,testVideos:true,savedFilters,projectionScale:10000});app.mount();await app.flush();await app.flush();
    for(const id of ['pgmap-127756','pgmap-127890']){
        const marker=[...app.layers].find(layer=>layer.flySpot.id===id);
        assert.doesNotMatch(marker.options.icon.html,/site-video-button/);
    }
    const reads=app.reads,unknownBefore=app.panel.allSites.find(site=>site.id==='pgmap-127890');
    app.reviewVideo('pgmap-127890',url,'accepted');await app.flush();
    assert.equal(app.panel.allSites.find(site=>site.id==='pgmap-127890').toVerify,unknownBefore.toVerify);
    assert.doesNotMatch([...app.layers].find(layer=>layer.flySpot.id==='pgmap-127890').options.icon.html,/site-video-button/);
    app.setZoom(15);app.emit('zoomend');await app.flush();
    const videoMenu=[...app.layers].find(layer=>layer.flySpot.id==='pgmap-127756'&&layer.options.icon.className.includes('ui-icon'));
    assert.match(videoMenu.options.icon.html,/site-video-button/);assert.ok(videoMenu.options.icon.html.includes(url));
    const viewBefore=app.lastView;
    videoMenu.getElement().click({closest:()=>({tagName:'A'})});
    assert.equal(app.selectedSiteId,'','A video click should not select or pan to the site');
    assert.deepEqual(app.lastView,viewBefore);
    let revealed;app.connectPanel(id=>{revealed=id;});
    videoMenu.getElement().click({closest:()=>({matches:selector=>selector==='.info-main'})});
    assert.equal(revealed,'pgmap-127756');assert.deepEqual(app.lastView,viewBefore,'Info reveals the card without moving the map');
    app.reviewVideo('pgmap-127756',url,'rejected');await app.flush();
    assert.ok([...app.layers].filter(layer=>layer.flySpot.id==='pgmap-127756').every(layer=>!layer.options.icon.html.includes('site-video-button')));
    assert.equal(app.reads,reads);assert.equal(app.panel.allSites.length,207);
    app.destroy();
    const reopened=runtime({includeApprovedSites:true,testVideos:true,savedFilters,projectionScale:10000});reopened.mount();await reopened.flush();await reopened.flush();
    assert.equal(reopened.panel.allSites.find(site=>site.id==='pgmap-127756').videoCandidates[0].reviewStatus,'rejected');
    assert.equal(reopened.panel.allSites.find(site=>site.id==='pgmap-127890').videoCandidates[0].reviewStatus,'accepted');
    reopened.reviewVideo('pgmap-127756',url,undefined);await reopened.flush();
    assert.ok([...reopened.layers].every(layer=>!layer.options.icon.html.includes('site-video-button')));
    reopened.setZoom(15);reopened.emit('zoomend');await reopened.flush();
    assert.ok([...reopened.layers].some(layer=>layer.flySpot.id==='pgmap-127756'&&layer.options.icon.className.includes('ui-icon')&&layer.options.icon.html.includes(url)));
    reopened.setZoom(13);reopened.emit('zoomend');await reopened.flush();
    assert.ok([...reopened.layers].every(layer=>!layer.options.icon.html.includes('site-video-button')));
    reopened.destroy();
});

test('video review merges other tabs before saving and storage updates never reload forecasts or validate unknown winds',async()=>{
    const savedFilters=new Map(),url='https://www.youtube.com/watch?v=whaqT_LWvdk';
    const first=runtime({includeApprovedSites:true,testVideos:true,savedFilters}),second=runtime({includeApprovedSites:true,testVideos:true,savedFilters});
    first.mount();second.mount();await first.flush();await first.flush();await second.flush();await second.flush();
    const firstReads=first.reads,secondReads=second.reads;
    first.reviewVideo('pgmap-127890',url,'accepted');await first.flush();
    second.reviewVideo('pgmap-127756',url,'rejected');await second.flush();
    first.emitStorage(VIDEO_REVIEW_STORAGE_KEY);await first.flush();
    for(const app of [first,second]){
        assert.equal(app.panel.allSites.find(site=>site.id==='pgmap-127890').videoCandidates[0].reviewStatus,'accepted');
        assert.equal(app.panel.allSites.find(site=>site.id==='pgmap-127756').videoCandidates[0].reviewStatus,'rejected');
        assert.equal(app.panel.allSites.find(site=>site.id==='pgmap-127890').toVerify,true);
    }
    savedFilters.delete(VIDEO_REVIEW_STORAGE_KEY);first.emitStorage(null);await first.flush();
    assert.equal(first.panel.allSites.find(site=>site.id==='pgmap-127890').videoCandidates[0].reviewStatus,'pending');
    second.reviewVideo('pgmap-127756',url,'accepted');await second.flush();
    assert.equal(second.panel.allSites.find(site=>site.id==='pgmap-127890').videoCandidates[0].reviewStatus,'pending','A delayed clear event must not restore deleted choices');
    assert.equal(first.reads,firstReads);assert.equal(second.reads,secondReads);
    first.destroy();second.destroy();assert.equal(first.browserListenerCount,0);assert.equal(second.browserListenerCount,0);
});

test('video-review filter stays synchronized between cards and every map zoom and removes finished sites without fetching again',async()=>{
    const savedFilters=new Map();
    const app=runtime({includeApprovedSites:true,savedFilters,enableVideoReview:true});app.mount();await app.flush();await app.flush();
    const reads=app.reads,view={...defaultSiteFilters(),wind:'video-review'};
    app.setFilters(view);await app.flush();
    const pending=()=>sitesForView(app.scopedPanel,app.filters.wind);
    assert.equal(pending().length,30);assert.equal(app.layers.size,30);
    assert.ok([...app.layers].every(marker=>marker.flySpot.videoCandidates.some(v=>v.reviewStatus==='pending')));
    assert.ok([...app.layers].some(marker=>marker.flySpot.id==='pgmap-127852'&&!marker.flySpot.toVerify),'Owner-confirmed sectors remain active while their videos are reviewed');
    const site=app.panel.allSites.find(s=>s.id==='pgmap-127756');
    app.reviewVideo(site.id,site.videoCandidates[0].url,'accepted');await app.flush();
    assert.ok(pending().some(s=>s.id===site.id),'The second undecided video keeps its site visible');
    app.reviewVideo(site.id,site.videoCandidates[1].url,'rejected');await app.flush();
    assert.equal(pending().length,29);assert.equal(app.layers.size,29);
    assert.ok([...app.layers].every(marker=>marker.flySpot.id!==site.id));
    for(const zoom of [13,15,17]){
        app.setZoom(zoom);app.emit('zoomend');await app.flush();
        assert.ok([...app.layers].every(marker=>pending().some(s=>s.id===marker.flySpot.id)));
    }
    app.store.set('timestamp',1792674000000);await app.flush();
    assert.equal(pending().length,29);assert.equal(app.reads,reads);
    app.destroy();
    const reopened=runtime({includeApprovedSites:true,savedFilters,enableVideoReview:true});reopened.mount();await reopened.flush();await reopened.flush();
    assert.equal(reopened.filters.wind,'video-review');
    assert.equal(sitesForView(reopened.scopedPanel,reopened.filters.wind).length,29);assert.equal(reopened.layers.size,29);
    reopened.setFilters({...view,regions:['north-west']});await reopened.flush();
    assert.ok([...reopened.layers].every(marker=>marker.flySpot.region==='north-west'));
    reopened.setFilter('all');await reopened.flush();
    assert.ok([...reopened.layers].some(marker=>!marker.flySpot.videoCandidates?.length),'All sites exits the review view');
    reopened.destroy();
});

test('owner-approved videos ship independently of browser choices, retire completed review and keep original forecasts intact',async()=>{
    const report=JSON.parse(readFileSync(new URL('../reports/paraglidingmap-owner-video-review-2026-10-22.json',import.meta.url),'utf8'));
    const pairs=report.sites.flatMap(site=>site.videos.map(video=>({id:site.id,...video})));
    for(const stale of [false,true]){
        const savedFilters=new Map();
        savedFilters.set('fly-ireland.site-filters.v1',JSON.stringify({...defaultSiteFilters(),wind:'video-review'}));
        if(stale)savedFilters.set(VIDEO_REVIEW_STORAGE_KEY,JSON.stringify({version:1,decisions:Object.fromEntries(pairs.map(row=>[row.id+':'+row.url.slice(-11),row.decision==='accepted'?'rejected':'accepted']))}));
        const app=runtime({includeApprovedSites:true,savedFilters});app.mount();await app.flush();await app.flush();
        assert.equal(app.filters.wind,'all');assert.equal(app.panel.allSites.length,207);assert.equal(app.reads,207);
        assert.deepEqual(app.videoSummary,{pending:0,accepted:0,rejected:0,total:0});
        assert.equal(app.panel.allSites.flatMap(site=>site.videoCandidates??[]).length,31);
        for(const pair of pairs){
            const site=app.panel.allSites.find(site=>site.id===pair.id),video=site.videoCandidates.find(video=>video.url===pair.url);
            if(pair.decision==='accepted'){assert.ok(video,site.name);assert.equal(video.reviewFinalized,true);assert.equal(video.reviewStatus,'accepted');}
            else assert.equal(video,undefined,site.name);
        }
        assert.equal(app.panel.allSites.find(site=>site.id==='pgmap-127852').toVerify,false);
        const before=app.reads,approved=pairs.find(row=>row.decision==='accepted');
        app.reviewVideo(approved.id,approved.url,'rejected');await app.flush();
        assert.equal(app.panel.allSites.find(site=>site.id===approved.id).videoCandidates.find(video=>video.url===approved.url).reviewStatus,'accepted');
        assert.equal(app.reads,before);
        app.previewTime(1792674000000);await app.flush();assert.equal(app.reads,before);
        assert.equal(app.panel.allSites.flatMap(site=>site.videoCandidates??[]).length,31);
        app.destroy();
    }
});
