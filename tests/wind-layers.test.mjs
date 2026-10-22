import test from 'node:test';
import assert from 'node:assert/strict';
import {samplePointForecast} from '../src/pointSampler.ts';

const time=Date.UTC(2026,9,22,12), hour=3600000;
const spot={id:'layer',lat:55,lon:-6,sectorStart:340,sectorEnd:20};
function payload(){return {status:200,data:{
    header:{model:'UKV',modelElevation:100,availableLevels:['surface','100m','1000h','975h','950h','900h','150h','10h']},
    data:{ts:[time,time+hour,time+2*hour,time+3*hour],wind:[2,2,2,2],windDir:[0,0,0,0],
        windGust:[6,6,6,6],icon:[1,3,4,2],isDay:[1,1,1,1],precipAmount:[0.4,0,0,0],precipSnowAmount:[0,0,0,0]},
    airgram:{ts:[time,time+3*hour],'wind-surface':[2,2],'windDir-surface':[0,0],
        'wind-1000h':[4,4],'windDir-1000h':[0,0],'wind-950h':[8,8],'windDir-950h':[0,0],
        'wind-900h':[12,12],'windDir-900h':[0,0]},
    meteogram:{ts:[time,time+3*hour],'gh-1000h':[200,200],'gh-950h':[600,600],'gh-900h':[1000,1000]},
}};}
const near=(actual,want)=>assert.ok(Math.abs(actual-want)<1e-8,`${actual} != ${want}`);

test('selected pressure level replaces surface wind while preserving surface gusts and hourly weather',()=>{
    const p=payload();
    const surface=samplePointForecast(spot,p,time+hour,'ukv');
    const layer=samplePointForecast(spot,p,time+hour,'ukv','950h');
    near(layer.mph,8/0.44704);assert.equal(layer.reason,'too-strong');
    assert.equal(layer.level,'950h');assert.equal(layer.levelEstimated,false);
    assert.equal(layer.levelHeightM,600);near(surface.mph,2/0.44704);
    near(layer.gustMph,6/0.44704);assert.equal(layer.weatherIcon,3);
    assert.equal(layer.weatherTimestamp,time+hour);
});

test('profile time interpolation blends wind vectors through north and retains the chosen layer',()=>{
    const p=payload();p.data.airgram['windDir-950h']=[350,10];
    const layer=samplePointForecast(spot,p,time+1.5*hour,'ukv','950h');
    near(layer.mph,7.878462024097664/0.44704);
    assert.ok(layer.direction<1e-8||layer.direction>359.999999);
    p.data.airgram['windDir-900h']=[90,90];
    const east=samplePointForecast(spot,p,time,'ukv','900h');assert.equal(east.direction,90);
});

test('975 hPa uses a marked interpolation between profile levels instead of falling back to surface',()=>{
    const reading=samplePointForecast(spot,payload(),time,'ukv','975h');
    near(reading.mph,5.974356163829066/0.44704);
    near(reading.levelHeightM,397.4356163829066);
    assert.equal(reading.levelEstimated,true);assert.equal(reading.level,'975h');
});

test('100 m wind is relative to model ground, with no vertical extrapolation',()=>{
    const p=payload();p.data.meteogram['gh-1000h']=[310,310];
    const reading=samplePointForecast(spot,p,time,'ukv','100m');
    near(reading.mph,2.9/0.44704);assert.equal(reading.levelHeightM,200);
    assert.equal(reading.levelEstimated,true);
    p.data.header.modelElevation=NaN;
    assert.equal(samplePointForecast(spot,p,time,'ukv','100m').status,'unavailable');
    const highGround=payload();highGround.data.header.modelElevation=2000;
    assert.equal(samplePointForecast(spot,highGround,time,'ukv','100m').status,'unavailable');
});

test('missing, unsupported or invalid layer data never reuse surface winds or invent valid matches',()=>{
    for(const alter of [
        p=>delete p.data.airgram,
        p=>p.data.airgram.ts=[time+hour,time],
        p=>p.data.airgram.ts=[time+hour,time+2*hour],
        p=>p.data.airgram['wind-950h']=[null,null],
        p=>p.data.airgram['windDir-950h']=[null,null],
        p=>p.data.header.availableLevels=['surface'],
    ]){
        const p=payload();alter(p);
        const missing=samplePointForecast(spot,p,time,'ukv','950h');
        assert.equal(missing.status,'unavailable');assert.equal(missing.mph,undefined);
        assert.equal(missing.direction,undefined);assert.equal(missing.reason,undefined);
    }
    assert.equal(samplePointForecast(spot,payload(),time,'ukv','10h').status,'unavailable');
    assert.equal(samplePointForecast(spot,payload(),time,'gfs','950h').status,'unavailable');
    const calm=payload();calm.data.airgram['wind-950h']=[0,0];calm.data.airgram['windDir-950h']=[null,null];
    const reading=samplePointForecast(spot,calm,time,'ukv','950h');
    assert.equal(reading.mph,0);assert.equal(reading.direction,undefined);assert.equal(reading.reason,'too-light');
});
