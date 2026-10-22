import assert from 'node:assert/strict';
import test from 'node:test';
import {samplePointForecast} from '../src/pointSampler.ts';

const time=Date.UTC(2026,9,22,12),hour=3600000;
const spot={id:'cloud',lat:55,lon:-7,sectorStart:0,sectorEnd:360};
function payload(){return {status:200,data:{header:{model:'UKV',elevation:400,modelElevation:150,availableLevels:['surface','1000h','950h','900h','850h']},data:{
    ts:[time,time+3*hour,time+6*hour],wind:[4,4,4],windDir:[180,180,180],
    icon:[1,3,4],isDay:[1,0,-0.25],moonPhase:[7,7,7],
},meteogram:{ts:[time,time+3*hour,time+6*hour],cloudBase:[300,900,null]}}};}

test('weather symbols hold their forecast interval and cloud base interpolates with an explicit AGL datum',()=>{
    const reading=samplePointForecast(spot,payload(),time+hour);
    assert.equal(reading.weatherIcon,1);
    assert.equal(reading.weatherIsNight,false);
    assert.equal(reading.cloudBaseStatus,'available');
    assert.equal(reading.cloudBaseM,500);
    assert.equal(reading.cloudBaseReference,'AGL');
    assert.equal(reading.cloudBaseEstimated,false);
    const night=samplePointForecast(spot,payload(),time+3*hour);
    assert.equal(night.weatherIcon,3);assert.equal(night.weatherIsNight,true);assert.equal(night.weatherMoonPhase,7);
    assert.equal(samplePointForecast(spot,payload(),time+4*hour).cloudBaseStatus,'unavailable','Do not interpolate through a missing cloud base');
});

test('weather identifies the actual source hour and resolution rather than claiming hourly data from a coarse response',()=>{
    const coarse=samplePointForecast(spot,payload(),time+hour);
    assert.equal(coarse.weatherTimestamp,time);
    assert.equal(coarse.weatherStepHours,3);
    const p=payload();p.data.data.ts=[time,time+hour,time+2*hour];
    const hourly=samplePointForecast(spot,p,time+hour);
    assert.equal(hourly.weatherTimestamp,time+hour);
    assert.equal(hourly.weatherStepHours,1);
    assert.equal(hourly.weatherIcon,3);
    const last=samplePointForecast(spot,p,time+2*hour);
    assert.equal(last.weatherStepHours,1);
});

test('a missing UKV cloud base can be estimated from cloud layers in metres above sea level',()=>{
    const p=payload();delete p.data.meteogram.cloudBase;
    Object.assign(p.data.meteogram,{
        'gh-1000h':[100,100,100],'cloud-1000h':[100,100,100],
        'gh-950h':[500,500,500],'cloud-950h':[10,10,10],
        'gh-900h':[1000,1000,1000],'cloud-900h':[90,90,90],
        'gh-850h':[1500,1500,1500],'cloud-850h':[100,100,100],
    });
    const reading=samplePointForecast(spot,p,time);
    assert.equal(reading.cloudBaseM,750);
    assert.equal(reading.cloudBaseReference,'ASL');
    assert.equal(reading.cloudBaseEstimated,true);
    assert.equal(reading.status,'pass','Clouds do not change the wind-only filter');
});

test('missing, invalid and out-of-range cloud data never become a zero base or sunny weather',()=>{
    for(const bad of [null,-1,100000,NaN]){
        const p=payload();p.data.meteogram.cloudBase[0]=bad;
        assert.equal(samplePointForecast(spot,p,time).cloudBaseStatus,'unavailable');
    }
    const zero=payload();zero.data.meteogram.cloudBase[0]=0;
    assert.equal(samplePointForecast(spot,zero,time).cloudBaseM,0);
    const missing=payload();delete missing.data.meteogram;delete missing.data.data.icon;
    assert.equal(samplePointForecast(spot,missing,time).weatherStatus,'unavailable');
    assert.equal(samplePointForecast(spot,missing,time).cloudBaseStatus,'unavailable');
    const stale=payload();stale.data.meteogram.ts=stale.data.meteogram.ts.map(t=>t-24*hour);
    assert.equal(samplePointForecast(spot,stale,time).cloudBaseStatus,'unavailable');
    assert.equal(samplePointForecast(spot,payload(),time-1).weatherIcon,undefined);
    const wrong=payload();wrong.data.header.model='GFS';
    assert.equal(samplePointForecast(spot,wrong,time).cloudBaseM,undefined);
});

test('cloud estimates require terrain, cloud coverage and a valid layer height',()=>{
    for(const type of ['terrain','height','cloud','clear']){
        const p=payload();delete p.data.meteogram.cloudBase;
        Object.assign(p.data.meteogram,{'gh-950h':[500,500,500],'cloud-950h':[0,0,0],'gh-900h':[1000,1000,1000],'cloud-900h':[90,90,90]});
        if(type==='terrain')p.data.header.elevation=null;
        if(type==='height')p.data.meteogram['gh-900h'][0]=null;
        if(type==='cloud')p.data.meteogram['cloud-900h'][0]=null;
        if(type==='clear')p.data.meteogram['cloud-900h'][0]=0;
        assert.equal(samplePointForecast(spot,p,time).cloudBaseStatus,'unavailable',type);
    }
});

test('cloud estimation never invents a clear layer at a launch surrounded by model cloud',()=>{
    for(const low of [100,null]){
        const p=payload();delete p.data.meteogram.cloudBase;
        Object.assign(p.data.meteogram,{
            'gh-1000h':[100,100,100],'cloud-1000h':[100,100,100],
            'gh-950h':[500,500,500],'cloud-950h':[low,low,low],
            'gh-900h':[1000,1000,1000],'cloud-900h':[100,100,100],
        });
        const reading=samplePointForecast(spot,p,time);
        assert.equal(reading.cloudBaseStatus,'unavailable');
        assert.equal(reading.cloudBaseM,undefined,'A numeric base needs a known crossing, not an assumed clear ground');
    }
});
