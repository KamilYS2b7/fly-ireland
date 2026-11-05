import test from 'node:test';import assert from 'node:assert/strict';
import {buildSoundingChart} from '../src/soundingChart.ts';
const profile={timestamp:0,terrainM:100,levels:[{pressureHpa:1000,heightM:100,temperatureC:20,dewPointC:10,windMps:5,windDirection:350},{pressureHpa:900,heightM:1000,temperatureC:10},{pressureHpa:800,heightM:2000,temperatureC:5,dewPointC:0,windMps:10,windDirection:10}]};
test('mobile sounding geometry stays finite and leaves gaps for missing fields',()=>{
 const chart=buildSoundingChart(profile,'m/s',340);
 assert.ok(chart.tempRight>chart.left);assert.ok(chart.windRight>chart.windLeft);
 assert.doesNotMatch(chart.temperature,/NaN|Infinity/);
 assert.equal((chart.dewPoint.match(/M/g)||[]).length,2);
 assert.equal((chart.wind.match(/M/g)||[]).length,2);
 assert.ok(chart.y(2000)<chart.y(100));assert.equal(chart.arrows.length,2);
});
test('wind plotting uses selected units without changing the temperature profile',()=>{
 const a=buildSoundingChart(profile,'m/s'),b=buildSoundingChart(profile,'km/h');
 assert.equal(a.temperature,b.temperature);assert.notEqual(a.windMax,b.windMax);
 assert.ok(Math.abs(b.windMax-40)<1);assert.equal(a.parcel,'');
});
