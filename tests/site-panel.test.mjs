import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSitePanel } from '../src/sitePanel.ts';
import {samplePointForecast} from '../src/pointSampler.ts';
import {evaluateWind} from '../src/windForecast.ts';

const sites = [
    { id: 'b', name: 'Bay', lat: 54, lon: -6, sectorStart: 340, sectorEnd: 20 },
    { id: 'a', name: 'Abbey', lat: 53, lon: -7, sectorStart: 145, sectorEnd: 180 },
    { id: 'c', name: 'Cliff', lat: 52, lon: -8, sectorStart: 200, sectorEnd: 260 },
];
const timestamp = Date.UTC(2026, 9, 22, 12);
test('unverified Polish sectors retain forecast readings without suggesting a wind match',()=>{
 const spot={id:'pl-test',name:'Polish test',lat:49.5,lon:22,sectorStart:0,sectorEnd:0,windRanges:[],directionUnverified:true};
 const reading={...evaluateWind(spot,[0,-4]),timestamp};
 assert.equal(reading.status,'fail');assert.equal(reading.reason,'unverified-direction');
 const panel=buildSitePanel([spot],()=>reading,timestamp);
 assert.equal(panel.sites.length,0);assert.equal(panel.unavailable,0);
 assert.equal(panel.allSites[0].speed,'8.9 mph');
 assert.equal(panel.allSites[0].label,'Wind range not verified');
});

test('height cards distinguish estimates, surface comparisons and unavailable profiles', () => {
    const base = { timestamp, windMode:'altitude', surfaceMph:6, surfaceDirection:240,
        elevationM:390, modelElevationM:151, targetHeightM:400, altitudeNote:'Estimated at terrain + 10 m' };
    const panel = buildSitePanel(sites, s => s.id === 'a'
        ? {...base,status:'fail',reason:'too-strong',mph:16,direction:250}
        : {...base,status:'unavailable',altitudeNote:'Forecast runs differ or are unknown'}, timestamp);
    assert.equal(panel.allSites[0].surfaceForecast,'6.0 mph · 240°');
    assert.match(panel.allSites[0].heightInfo,/390 m.*151 m/);
    assert.equal(panel.allSites[0].targetHeightM,400);
    assert.equal(panel.allSites[1].speed,'No estimate');
    assert.equal(panel.allSites[1].label,'No height estimate');
    assert.equal(panel.sites.length,0);
});

test('review candidates are shown without forecasts or inclusion in wind matches', () => {
    const candidate = {...sites[0], toVerify:true, sourceUrl:'https://weather.flybubble.com/gortin-14732'};
    const panel = buildSitePanel([candidate], () => { throw new Error('Review sites must not request weather'); }, timestamp);
    assert.equal(panel.allSites.length,1);
    assert.equal(panel.allSites[0].label,'To verify');
    assert.equal(panel.sites.length,0);
    assert.equal(panel.loading,0);
    assert.equal(panel.unavailable,0);
});
test('panel lists only matching forecasts alphabetically with both required and forecast ranges', () => {
    const readings = { b: { status: 'pass', mph: 8, direction: 355, timestamp },
        a: { status: 'pass', mph: 12.99, direction: 160, timestamp },
        c: { status: 'fail', reason: 'too-strong', mph: 16, direction: 230, timestamp } };
    const panel = buildSitePanel(sites, site => readings[site.id], timestamp);
    assert.deepEqual(panel.sites.map(site => site.name), ['Abbey', 'Bay']);
    assert.equal(panel.sites[1].required, '5–15 mph · 340°–20°');
    assert.equal(panel.sites[1].forecast, '8.0 mph · 355°');
    assert.match(panel.time, /22 Oct.*13:00 UTC\+1/);
    assert.equal(panel.loading, 0);
    assert.equal(panel.unavailable, 0);
});

test('a 17:00 local forecast displays the same UTC instant and wind sample as the Windy timeline',()=>{
    const selected=Date.UTC(2026,9,23,16),hour=3600000;
    const payload={status:200,data:{header:{model:'UKV',utcOffset:1},data:{
        ts:[selected-hour,selected,selected+hour],wind:[5,6,8],windDir:[355,355,355],windGust:[9,10,12],
    }}};
    const reading=samplePointForecast(sites[0],payload,selected,'ukv');
    const panel=buildSitePanel([sites[0]],()=>reading,selected,'ukv','mph','surface',payload.data.header.utcOffset);
    assert.equal(panel.time,'23 Oct, 17:00 UTC+1');
    assert.equal(reading.timestamp,selected);
    assert.equal(panel.allSites[0].speed,'13.4 mph','Keep the 16:00 UTC wind, rather than shifting to the next forecast hour');
    const utcPanel=buildSitePanel([sites[0]],()=>reading,selected,'ukv','mph','surface',0);
    assert.equal(utcPanel.time,'23 Oct, 16:00 UTC');
    assert.equal(utcPanel.allSites[0].speed,panel.allSites[0].speed,'Clock labels must not change sampled data');
});

test('local forecast clocks handle midnight and the Irish clock change without a fixed one-hour correction',()=>{
    const panelAt=time=>buildSitePanel([],()=>({status:'loading'}),time).time;
    assert.equal(panelAt(Date.UTC(2026,9,23,23)),'24 Oct, 00:00 UTC+1');
    assert.equal(panelAt(Date.UTC(2026,9,25,0,30)),'25 Oct, 01:30 UTC+1');
    assert.equal(panelAt(Date.UTC(2026,9,25,1,30)),'25 Oct, 01:30 UTC');
    assert.equal(panelAt(Date.UTC(2026,11,23,16)),'23 Dec, 16:00 UTC');
    assert.equal(panelAt(NaN),'Forecast time unavailable');
});

test('timeline loading, settings and missing data never retain old matching cards', () => {
    for (const status of ['loading', 'settings', 'unavailable']) {
        const panel = buildSitePanel(sites, () => ({ status }), timestamp);
        assert.equal(panel.sites.length, 0);
        assert.equal(panel.loading, status === 'loading' ? 3 : 0);
        assert.equal(panel.unavailable, status === 'unavailable' ? 3 : 0);
        assert.equal(panel.settings, status === 'settings');
    }
});

test('service failures remain visible separately from wind criteria and missing point data', () => {
    const panel=buildSitePanel(sites, site=>site.id==='a'
        ? {status:'pass',mph:8,direction:160,timestamp}
        : {status:'unavailable',requestStatus:503,retrying:true,timestamp},timestamp);
    assert.equal(panel.requestStatus,503);
    assert.equal(panel.retrying,true);
    assert.equal(panel.sites.length,1);
    assert.equal(panel.unavailable,2);
    const missing=buildSitePanel(sites,()=>({status:'unavailable',timestamp}),timestamp);
    assert.equal(missing.requestStatus,undefined);
    assert.equal(missing.retrying,false);
});

test('rejects stale positive data and reports partial loading without hiding current matches', () => {
    const panel = buildSitePanel(sites, site => site.id === 'a'
        ? { status: 'pass', mph: 8, direction: 160, timestamp: timestamp - 3600000 }
        : site.id === 'b' ? { status: 'pass', mph: 8, direction: 355, timestamp }
        : { status: 'loading' }, timestamp);
    assert.deepEqual(panel.sites.map(site => site.id), ['b']);
    assert.equal(panel.loading, 1);
    assert.equal(panel.unavailable, 1);
});

test('all-sites view includes failing and missing sites with honest wind and gust states', () => {
    const panel=buildSitePanel(sites,site=> site.id==='a'
        ? {status:'pass',mph:8,direction:160,gustMph:15,gustStatus:'available',timestamp}
        : site.id==='b' ? {status:'fail',reason:'too-light',mph:2,direction:0,timestamp}
        : {status:'loading'},timestamp);
    assert.equal(panel.allSites.length,3);
    assert.equal(panel.sites.length,2);
    assert.equal(panel.allSites[0].gust,'15.0 mph');
    assert.equal(panel.allSites[1].label,'Too light');
    assert.equal(panel.allSites[2].direction,undefined);
    assert.equal(panel.allSites[2].speed,'Loading…');
});

test('Wind-matched includes light wind with a matching direction, retaining its Too light status',()=>{
    const cases=[
        {id:'light',name:'A',sectorStart:50,sectorEnd:120,mph:3,direction:90},
        {id:'wrong',name:'B',sectorStart:200,sectorEnd:250,mph:3,direction:90},
        {id:'strong',name:'C',sectorStart:50,sectorEnd:120,mph:15.01,direction:90},
        {id:'calm',name:'D',sectorStart:0,sectorEnd:360,mph:0,direction:90},
        {id:'limit',name:'E',sectorStart:50,sectorEnd:120,mph:15,direction:120},
        {id:'north',name:'F',sectorStart:285,sectorEnd:15,mph:1,direction:355},
        {id:'missing',name:'G',sectorStart:50,sectorEnd:120,mph:NaN,direction:90},
    ].map(site=>({...site,lat:54,lon:-6}));
    const getReading=site=>({...evaluateWind(site,[-site.mph*.44704*Math.sin(site.direction*Math.PI/180),-site.mph*.44704*Math.cos(site.direction*Math.PI/180)]),timestamp});
    for(const unit of ['mph','kt','km/h','m/s']){
        const panel=buildSitePanel(cases,getReading,timestamp,'ukv',unit);
        assert.deepEqual(panel.sites.map(site=>site.id),['light','limit','north']);
        assert.equal(panel.sites[0].status,'fail');assert.equal(panel.sites[0].label,'Too light');
        assert.equal(panel.allSites[1].label,'Too light','A low-speed label alone must not qualify an incorrect direction');
    }
});

test('cards flag strong gusts without changing wind matching and clear stale warnings',()=>{
    const readings={
        a:{status:'pass',mph:10,direction:160,gustStatus:'available',gustMph:25,timestamp},
        b:{status:'pass',mph:12,direction:355,gustStatus:'available',gustMph:16,timestamp},
        c:{status:'pass',mph:10,direction:230,gustStatus:'available',gustMph:30,timestamp:timestamp-3600000},
    };
    const panel=buildSitePanel(sites,site=>readings[site.id],timestamp);
    assert.equal(panel.allSites[0].gustWarning?.active,true);
    assert.match(panel.allSites[0].gustWarning.description,/Strong gusts: 25\.0 mph.*10\.0 mph/);
    assert.equal(panel.allSites[1].gustWarning.active,false);
    assert.equal(panel.allSites[2].gustWarning.active,false);
    assert.deepEqual(panel.sites.map(site=>site.id),['a','b']);
    const knots=buildSitePanel(sites,site=>readings[site.id],timestamp,'ukv','kt');
    assert.equal(knots.allSites[0].gustWarning.active,true);
    assert.match(knots.allSites[0].gustWarning.description,/21\.7 kt/);
    const loading=buildSitePanel(sites,()=>({status:'loading'}),timestamp);
    assert.ok(loading.allSites.every(site=>!site.gustWarning.active));
});
test('rain amounts are displayed separately and stale rain is cleared', () => {
    const rain={rainStatus:'available',rainMm:0.8,rainStart:timestamp,rainEnd:timestamp+10800000};
    const panel=buildSitePanel(sites,site=>({status:'pass',mph:8,direction:160,...rain,timestamp:site.id==='a'?timestamp-3600000:timestamp}),timestamp);
    assert.equal(panel.allSites[0].rain.wet,false);
    assert.equal(panel.allSites[0].rain.value,'No data');
    assert.equal(panel.allSites[1].rain.wet,true);
    assert.equal(panel.allSites[1].rain.value,'0.8 mm / 3h');
    assert.equal(panel.sites.length,2,'rain does not change the wind-only filter');
});

test('cloud-base cards always identify the height datum and discard stale cloud readings',()=>{
    const panel=buildSitePanel(sites,site=>({status:'pass',mph:8,direction:160,timestamp,
        weatherStatus:'available',weatherIcon:3,weatherIsNight:false,
        cloudBaseStatus:'available',cloudBaseM:750,cloudBaseReference:site.id==='a'?'ASL':'AGL',cloudBaseEstimated:site.id==='a',
        ...(site.id==='c'?{timestamp:timestamp-3600000}:{})}),timestamp);
    assert.equal(panel.allSites[0].cloudBase?.value,'750 m ASL');
    assert.equal(panel.allSites[0].cloudBase?.reference,'Above mean sea level');
    assert.equal(panel.allSites[0].cloudBase?.label,'Est. cloud base');
    assert.equal(panel.allSites[1].cloudBase?.value,'750 m AGL');
    assert.equal(panel.allSites[1].cloudBase?.reference,'Above model ground');
    assert.equal(panel.allSites[1].weather?.icon,3);
    assert.equal(panel.allSites[2].cloudBase?.value,'No data');
    assert.equal(panel.allSites[2].weather?.available,false);
});

test('wind unit selection converts speed, gusts and limits without changing matching sites',()=>{
    for(const [unit,speed,gust,required] of [
        ['mph','8.0 mph','15.0 mph','5–15 mph'],
        ['km/h','12.9 km/h','24.1 km/h','8–24.1 km/h'],
        ['m/s','3.6 m/s','6.7 m/s','2.2–6.7 m/s'],
        ['kt','7.0 kt','13.0 kt','4.3–13 kt'],
    ]){
        const panel=buildSitePanel(sites,()=>({status:'pass',mph:8,gustStatus:'available',gustMph:15,direction:160,timestamp}),timestamp,'ukv',unit);
        assert.equal(panel.allSites[0].speed,speed);
        assert.equal(panel.allSites[0].gust,gust);
        assert.ok(panel.allSites[0].required.startsWith(required));
        assert.equal(panel.sites.length,3);
    }
});
