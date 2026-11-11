import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleSounding,createSoundingController} from '../src/sounding.ts';
const time=Date.UTC(2026,10,5,12),hour=3600000;
function payload(){const sounding={ts:[time,time+hour]};for(const [p,z,t,d,w,dir]of [[1000,100,293.15,285.15,3,350],[900,1000,284.15,278.15,5,10],[800,2000,278.15,270.15,8,20],[700,3000,270.15,264.15,12,30]])for(const [key,value]of Object.entries({gh:z,temp:t,dewPoint:d,wind:w,windDir:dir}))sounding[`${key}-${p}h`]=[value,key==='windDir'?(value+20)%360:value+(key==='temp'?2:0)];return{status:200,data:{header:{elevation:120,modelElevation:100},sounding}};}
const site={id:'a',name:'Hill',lat:54,lon:-6};
test('soundings interpolate Kelvin temperatures and winds on actual pressure levels',()=>{
 const profile=sampleSounding(payload(),time+hour/2);
 assert.equal(profile.levels.length,4);assert.equal(profile.levels[0].temperatureC,21);
 assert.ok(profile.levels[0].windDirection<1||profile.levels[0].windDirection>359);
 assert.equal(profile.levels[0].heightM,100);assert.equal(profile.terrainM,100);
 assert.ok(profile.parcel===undefined||profile.parcel.dry.length>1);
});
test('missing dew point falls back to valid RH without inventing missing wind',()=>{
 const p=payload();delete p.data.sounding['dewPoint-1000h'];p.data.sounding['rh-1000h']=[50,50];delete p.data.sounding['wind-900h'];
 const r=sampleSounding(p,time);assert.ok(r.levels[0].dewPointC>8&&r.levels[0].dewPointC<11);assert.equal(r.levels[1].windMps,undefined);
 p.data.sounding['temp-900h']=[null,null];assert.ok(!sampleSounding(p,time).levels.some(l=>l.pressureHpa===900));
});
test('missing profiles, outside time range, bad temperature and mismatched heights fail honestly',()=>{
 assert.throws(()=>sampleSounding({},time),/profile/i);
 assert.throws(()=>sampleSounding(payload(),time-hour),/time/i);
 const p=payload();for(const k of Object.keys(p.data.sounding))if(k.startsWith('gh-'))delete p.data.sounding[k];
 assert.throws(()=>sampleSounding(p,time),/levels|height/i);
});
test('controller loads on open only, reuses profiles for time changes and ignores stale locations',async()=>{
 let fetches=0,resolveA;const states=[];
 const controller=createSoundingController({fetch:async s=>{fetches++;if(s.id==='a')return new Promise(r=>resolveA=r);return payload();},onChange:s=>states.push(s)});
 controller.sync('ukv',time);assert.equal(fetches,0);
 const a=controller.open(site,'ukv',time);const b=controller.open({...site,id:'b',name:'Other',lon:-7},'ukv',time);
 await b;resolveA(payload());await a;assert.equal(states.at(-1).site.name,'Other');
 await controller.sync('ukv',time+hour/2);assert.equal(fetches,2);assert.equal(states.at(-1).profile.levels[0].temperatureC,21);
 controller.close();await controller.sync('gfs',time);assert.equal(fetches,2);assert.equal(states.at(-1).open,false);controller.destroy();
});
test('controller exposes retryable errors and ignores responses after close',async()=>{
 let calls=0,release;const states=[];
 const c=createSoundingController({fetch:async()=>{calls++;if(calls===1)throw Error('offline');return payload();},onChange:s=>states.push(s)});
 await c.open(site,'ukv',time);assert.equal(states.at(-1).status,'error');await c.retry();assert.equal(states.at(-1).status,'ready');c.destroy();
 const late=createSoundingController({fetch:()=>new Promise(r=>release=r),onChange:s=>states.push(s)});
 const request=late.open(site,'ukv',time);await Promise.resolve();late.close();release(payload());await request;assert.equal(states.at(-1).open,false);late.destroy();
});
export {payload,time,site};

test('changing model loads a distinct sounding while repeated open requests share the fetch',async()=>{
 let calls=0;const states=[];
 const c=createSoundingController({fetch:async()=>{calls++;return payload();},onChange:s=>states.push(s)});
 await c.open(site,'ukv',time);await c.sync('gfs',time);assert.equal(calls,2);assert.equal(states.at(-1).model,'gfs');
 await c.sync('ukv',time);assert.equal(calls,2);c.destroy();await c.open(site,'gfs',time);assert.equal(calls,2);
});

test('known missing levels break plotted traces and disable a parcel based on an incomplete profile',()=>{
 const p=payload();p.data.sounding['temp-900h']=[null,null];
 const result=sampleSounding(p,time);assert.equal(result.levels.find(l=>l.pressureHpa===800).gapBefore,true);assert.equal(result.parcel,undefined);
});

test('an open sounding refreshes an expired cache even when forecast time has not changed',async()=>{
 let calls=0,clock=0;const c=createSoundingController({fetch:async()=>{calls++;return payload();},onChange:()=>{},now:()=>clock});
 await c.open(site,'ukv',time);await c.sync('ukv',time);assert.equal(calls,1);
 clock=600001;await c.sync('ukv',time);assert.equal(calls,2);c.destroy();
});

test('cloud cover uses its own pressure levels and actual time grid, including clear and missing values',()=>{
 const p=payload();p.data.sounding['cloud-1000h']=[0,0];p.data.sounding['cloud-950h']=[40,80];p.data.sounding['cloud-900h']=[null,null];p.data.sounding['cloud-800h']=[100,100];
 const r=sampleSounding(p,time+hour/2);assert.equal(r.clouds.length,4);
 assert.equal(r.clouds.find(l=>l.pressureHpa===1000).coverPct,0);
 const extra=r.clouds.find(l=>l.pressureHpa===950);assert.equal(extra.coverPct,60);assert.ok(extra.heightM>100&&extra.heightM<1000);
 assert.equal(r.clouds.find(l=>l.pressureHpa===900).coverPct,undefined);
 p.data.sounding['cloud-800h']=[120,120];assert.equal(sampleSounding(p,time).clouds.find(l=>l.pressureHpa===800).coverPct,undefined);
 assert.equal(sampleSounding(payload(),time).clouds,undefined);
});

test('surface wind uses its own time grid and model ground without altering parcel levels',()=>{
 const p=payload();p.data.header.modelElevation=0;
 p.data.data={ts:[time-hour,time+hour],wind:[4,8],windDir:[350,10]};
 const r=sampleSounding(p,time);assert.equal(r.surfaceWind.heightM,10);
 assert.ok(r.surfaceWind.windMps>5&&r.surfaceWind.windMps<6.1);
 assert.equal(r.levels[0].heightM,100);assert.equal(r.levels.length,4);
 assert.equal(sampleSounding(payload(),time).surfaceWind,undefined);
 delete p.data.header.modelElevation;assert.equal(sampleSounding(p,time).surfaceWind,undefined);
});

test('surface temperature and meteogram dew point use independent clocks and remain at 2 m AGL',()=>{
 const p=payload();p.data.header.modelElevation=0;
 p.data.data={ts:[time-hour,time+hour],temperature:[280,284]};
 p.data.meteogram={ts:[time,time+hour],dewPoint:[278,280]};
 const result=sampleSounding(p,time);assert.equal(result.surfaceThermo.heightM,2);
 assert.ok(Math.abs(result.surfaceThermo.temperatureC-8.85)<1e-6);
 assert.ok(Math.abs(result.surfaceThermo.dewPointC-4.85)<1e-6);
 p.data.meteogram.dewPoint=[290,290];assert.equal(sampleSounding(p,time).surfaceThermo.dewPointC,undefined);
 delete p.data.data.temperature;assert.equal(sampleSounding(p,time).surfaceThermo,undefined);
});

test('closing an overview aborts in-flight model requests and reopening starts a fresh request',async()=>{
 let calls=0;const signals=[];
 const c=createSoundingController({fetch:async(_s,_m,signal)=>{calls++;signals.push(signal);if(calls===1)await new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true}));return payload();},onChange:()=>{}});
 const first=c.open(site,'ukv',time);await Promise.resolve();c.close();await first;
 assert.equal(signals[0].aborted,true);await c.open(site,'ukv',time);assert.equal(calls,2);c.destroy();
});

test('an immediate plugin close cancels scheduled sounding fetch before it starts',async()=>{
 let calls=0;const c=createSoundingController({fetch:async()=>{calls++;return payload();},onChange:()=>{}});
 const request=c.open(site,'ukv',time);c.destroy();await request;assert.equal(calls,0);
});
