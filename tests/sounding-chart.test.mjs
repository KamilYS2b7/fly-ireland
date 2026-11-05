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

test('lower-atmosphere zoom and resized plot preserve data and expose reversible height coordinates',()=>{
 const high={...profile,levels:[...profile.levels,{pressureHpa:500,heightM:6000,temperatureC:-25,dewPointC:-30,windMps:30,windDirection:100}]};
 const full=buildSoundingChart(high,'mph',390),zoom=buildSoundingChart(high,'mph',390,{zoom:true,height:580});
 assert.ok(zoom.maxHeight<full.maxHeight);assert.equal(zoom.height,580);
 assert.ok(Math.abs(zoom.heightAtY(zoom.y(1500))-1500)<1e-6);
 assert.doesNotMatch(zoom.temperature,/NaN|Infinity/);
});

test('wind curve and height cursor use the same vector interpolation through turning winds',()=>{
 const p={timestamp:0,levels:[{pressureHpa:1000,heightM:0,temperatureC:20,windMps:10,windDirection:0},{pressureHpa:900,heightM:1000,temperatureC:10,windMps:10,windDirection:180}]};
 const chart=buildSoundingChart(p,'m/s');
 assert.ok(chart.wind.includes(`${chart.windLeft.toFixed(2)},${chart.y(500).toFixed(2)}`));
});

test('direct plot labels keep close height markers readable inside chart bounds',async()=>{
 const {placeSoundingLabels}=await import('../src/soundingChart.ts');
 const chart=buildSoundingChart(profile,'mph');
 const labels=placeSoundingLabels([{heightM:1000},{heightM:1010},{heightM:1020}],chart);
 assert.equal(labels.length,3);
 assert.ok(labels[0].labelY>=chart.top+10);assert.ok(labels.at(-1).labelY<=chart.bottom-16);
 for(let i=1;i<labels.length;i++)assert.ok(labels[i].labelY-labels[i-1].labelY>=27.9);
});
