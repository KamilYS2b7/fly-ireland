import test from 'node:test';import assert from 'node:assert/strict';
import {dayValue,dayColor} from '../src/dayOverview.ts';
import {sampleSoundingDay} from '../src/sounding.ts';
const p={timestamp:0,levels:[{heightM:100,temperatureC:20,dewPointC:20,windMps:5,windDirection:0},{heightM:1100,temperatureC:10,dewPointC:5,windMps:10,windDirection:90}],clouds:[{heightM:100,coverPct:0},{heightM:600},{heightM:1100,coverPct:80}]};
test('overview preserves physical units, humidity, level gradients and missing coverage',()=>{
 assert.equal(dayValue(p,100,'humidity','m/s'),100);assert.equal(dayValue(p,600,'temperature','m/s'),15);
 assert.ok(Math.abs(dayValue(p,100,'wind','m/s')-5)<1e-6);assert.equal(dayValue(p,600,'lapse','m/s'),10);
 assert.equal(dayValue(p,200,'cloud','m/s'),0);assert.equal(dayValue(p,600,'cloud','m/s'),undefined);
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
