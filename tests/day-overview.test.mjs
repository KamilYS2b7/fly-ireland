import test from 'node:test';import assert from 'node:assert/strict';
import {dayValue,dayColor,smoothGrid,dayReading,dayLayerBounds} from '../src/dayOverview.ts';
import {sampleSoundingDay} from '../src/sounding.ts';
const p={timestamp:0,levels:[{heightM:100,temperatureC:20,dewPointC:20,windMps:5,windDirection:0},{heightM:1100,temperatureC:10,dewPointC:5,windMps:10,windDirection:90}],clouds:[{heightM:100,coverPct:0},{heightM:600},{heightM:1100,coverPct:80}]};
test('overview preserves physical units, humidity, level gradients and missing coverage',()=>{
 assert.equal(dayValue(p,100,'humidity','m/s'),100);assert.equal(dayValue(p,600,'temperature','m/s'),15);
 assert.ok(Math.abs(dayValue(p,100,'wind','m/s')-5)<1e-6);assert.equal(dayValue(p,600,'lapse','m/s'),10);
 assert.equal(dayValue(p,100,'cloud','m/s'),0);assert.equal(dayValue(p,600,'cloud','m/s'),undefined);
 assert.equal(dayValue(p,50,'wind','m/s'),undefined);assert.notEqual(dayColor(0,'wind'),dayColor(40,'wind'));
 assert.equal(dayValue({...p,levels:[p.levels[0],{...p.levels[1],gapBefore:true}]},600,'lapse','m/s'),undefined);
});
test('unavailable forecast hours do not become invented overview columns',()=>assert.deepEqual(sampleSoundingDay({},Date.now()),[]));
test('day columns use the forecast time grid and selected UTC date without extra requests',()=>{
 const start=Date.UTC(2026,10,7),sounding={ts:[start+6*3600000,start+18*3600000]};
 for(const [pressure,height,temp] of [[1000,100,290],[900,1000,280]]){
  sounding[`gh-${pressure}h`]=[height,height];sounding[`temp-${pressure}h`]=[temp,temp+2];
 }
 const day=sampleSoundingDay({data:{header:{modelElevation:100},sounding}},start+12*3600000);
 assert.equal(day.length,13);assert.equal(day[0].timestamp,start+6*3600000);assert.equal(day.at(-1).timestamp,start+18*3600000);
 assert.ok(Math.abs(day[6].levels[0].temperatureC-17.85)<1e-6);
 assert.deepEqual(sampleSoundingDay({data:{sounding}},start+86400000),[]);
});

test('smooth rendering interpolates values without filling missing cells',()=>{
 assert.equal(smoothGrid([[0,10],[10,20]],.5,.5),10);
 assert.equal(smoothGrid([[0,undefined],[10,undefined]],.5,1),undefined);
 assert.equal(smoothGrid([[0,10],[undefined,undefined]],1,.5),undefined);
});
test('cloud percentages interpolate native levels while unknown samples break interpolation',()=>{
 const clouds={...p,clouds:[{heightM:100,coverPct:0},{heightM:1100,coverPct:100}]};
 assert.equal(dayValue(clouds,600,'cloud','m/s'),50);
 assert.equal(dayValue(p,350,'cloud','m/s'),undefined);

});

test('cursor interpolates fractional hours and preserves missing hours',()=>{
 const a={...p,timestamp:8*3600000},b={...p,timestamp:9*3600000,levels:p.levels.map(l=>({...l,temperatureC:l.temperatureC+10}))};
 assert.equal(dayReading([a,b],8.5*3600000,100,'temperature','m/s').value,25);
 assert.equal(dayReading([a,b],8.25*3600000,100,'temperature','m/s').value,22.5);
 assert.equal(dayReading([a],8.5*3600000,100,'temperature','m/s').value,undefined);
 assert.equal(dayReading([a],8*3600000,100,'temperature','m/s').value,20);
});

test('surface wind fills lower profile above 10 m only, using vectors and no invented thermodynamics',()=>{
 const profile={...p,terrainM:0,surfaceWind:{heightM:10,windMps:5,windDirection:350}};
 assert.ok(Math.abs(dayValue(profile,10,'wind','m/s')-5)<1e-6);
 assert.ok(dayValue(profile,55,'wind','m/s')>4);
 assert.equal(dayValue(profile,5,'wind','m/s'),undefined);
 assert.equal(dayValue(profile,55,'temperature','m/s'),undefined);
 assert.equal(dayValue({...profile,surfaceWind:undefined},55,'wind','m/s'),undefined);
});

test('near-surface thermodynamics complete temperature humidity and lapse without changing clouds',()=>{
 const profile={...p,surfaceThermo:{heightM:2,temperatureC:22,dewPointC:20}};
 assert.equal(dayValue(profile,2,'temperature','m/s'),22);
 assert.equal(dayValue(profile,51,'temperature','m/s'),21);
 assert.ok(dayValue(profile,51,'humidity','m/s')>90);
 assert.ok(Math.abs(dayValue(profile,51,'lapse','m/s')-2000/98)<1e-6);
 assert.equal(dayValue(profile,1,'temperature','m/s'),undefined);
 assert.equal(dayValue(profile,51,'cloud','m/s'),undefined);
});

test('layer bounds include real surface data and clouds keep their own native vertical extent',()=>{
 const profile={...p,surfaceThermo:{heightM:2,temperatureC:22,dewPointC:20},surfaceWind:{heightM:10,windMps:4}};
 assert.equal(dayLayerBounds(profile,'humidity').bottom,2);
 assert.equal(dayLayerBounds(profile,'wind').bottom,10);
 assert.equal(dayLayerBounds(profile,'cloud').bottom,100);
 assert.equal(dayLayerBounds({...profile,clouds:undefined},'cloud'),undefined);
 const lowClouds={...p,clouds:[{heightM:50,coverPct:30},{heightM:1100,coverPct:30}]};
 assert.equal(dayValue(lowClouds,50,'cloud','m/s'),30);
});
