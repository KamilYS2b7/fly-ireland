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

test('experimental updraft has a distinct m/s scale and scenario envelope without changing temperature geometry',()=>{
 const scenario=(scale,radiusM)=>({radiusM,excessK:3,endReason:'profile-end',points:[{heightM:100,speedMps:0},{heightM:1000,speedMps:scale},{heightM:2000,speedMps:scale/2}]});
 const estimate={status:'available',initialExcessK:3,radiusM:100,central:scenario(3,100),low:scenario(2,50),high:scenario(4,200)};
 const normal=buildSoundingChart(profile,'kt'),chart=buildSoundingChart(profile,'kt',640,{thermal:estimate});
 assert.equal(chart.temperature,normal.temperature);assert.equal(chart.updraftMax,4);assert.ok(chart.updraft);assert.ok(chart.updraftBand.endsWith('Z'));
 assert.equal(chart.xUpdraft(0),chart.windLeft);assert.equal(chart.xUpdraft(4),chart.windRight);
 assert.doesNotMatch(chart.updraftBand,/NaN|Infinity/);
});

test('desktop layout reserves a wide wind panel and intermediate ticks while keeping phone geometry compact',()=>{
 const desktop=buildSoundingChart(profile,'kt',1060),phone=buildSoundingChart(profile,'kt',340);
 assert.ok(desktop.windRight-desktop.windLeft>=220);
 assert.ok(desktop.tempRight-desktop.left>500);
 assert.equal(phone.windRight-phone.windLeft,72);
 assert.equal(desktop.profileTicks.length,5);assert.equal(phone.profileTicks.length,2);
});

test('user height range scales the profile above model ground and adds useful low-level ticks',()=>{
 const high={...profile,terrainM:1500,levels:[{pressureHpa:850,heightM:1500,temperatureC:15,windMps:3},{pressureHpa:700,heightM:3000,temperatureC:5,windMps:10},{pressureHpa:400,heightM:7000,temperatureC:-20,windMps:40}]};
 const low=buildSoundingChart(high,'m/s',640,{depthM:1000});
 assert.equal(low.maxHeight,2500);assert.ok(low.ticks.includes(1750));
 assert.ok(Math.abs(low.heightAtY(low.y(2000))-2000)<1e-6);
 assert.equal(buildSoundingChart(high,'m/s',640,{depthM:9000}).maxHeight,7000);
 assert.equal(buildSoundingChart(high,'m/s',640,{depthM:-10}).maxHeight,2000);
 assert.doesNotMatch(low.temperature,/NaN|Infinity/);
});
