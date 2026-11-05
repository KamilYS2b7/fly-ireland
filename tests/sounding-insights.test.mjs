import test from 'node:test';import assert from 'node:assert/strict';
import {soundingInsights,soundingAtHeight} from '../src/soundingInsights.ts';
const profile={timestamp:0,terrainM:100,takeoffM:300,levels:[
 {pressureHpa:1000,heightM:100,temperatureC:20,dewPointC:10,windMps:5,windDirection:350},
 {pressureHpa:950,heightM:600,temperatureC:15,dewPointC:7,windMps:5,windDirection:10},
 {pressureHpa:900,heightM:1100,temperatureC:17,dewPointC:5,windMps:15,windDirection:100},
 {pressureHpa:800,heightM:2100,temperatureC:-3,dewPointC:-6,windMps:20,windDirection:110},
 {pressureHpa:700,heightM:3100,temperatureC:-8,dewPointC:-12,windMps:22,windDirection:120},
]};
test('height cursor interpolates temperature and vector wind, with both ASL and takeoff clearance',()=>{
 const p=soundingAtHeight(profile,350);assert.equal(p.heightM,350);assert.equal(p.aboveTakeoffM,50);assert.equal(p.temperatureC,17.5);
 assert.ok(p.windDirection<1||p.windDirection>359);assert.ok(p.windMps<5&&p.windMps>4.8);
 assert.equal(soundingAtHeight(profile,50),undefined);
 const gap=structuredClone(profile);gap.levels[1].gapBefore=true;assert.equal(soundingAtHeight(gap,350),undefined);
 assert.equal(soundingAtHeight(gap,600).heightM,600);
});
test('inversion, freezing level and strong vector wind-change layers are derived from actual adjacent levels',()=>{
 const info=soundingInsights(profile);
 assert.equal(info.inversions.length,1);assert.equal(info.inversions[0].bottomM,600);assert.equal(info.inversions[0].topM,1100);
 assert.ok(Math.abs(info.freezingLevels[0]-1950)<1);
 assert.ok(info.windChanges.some(b=>b.bottomM===600&&b.vectorMpsPer100m>=1));
 assert.ok(info.lcl.heightM>1200&&info.lcl.heightM<1500);assert.equal(info.lcl.source,'lowest model level');
 assert.ok(info.dryTopM>600&&info.dryTopM<1100);
});
test('surface LCL takes precedence; missing fields and known profile gaps do not create diagnostics',()=>{
 const p=structuredClone(profile);p.surfaceLclM=900;assert.equal(soundingInsights(p).lcl.heightM,900);
 delete p.surfaceLclM;p.levels.forEach(l=>{delete l.dewPointC;delete l.windMps;});
 p.levels[2].gapBefore=true;p.levels[3].gapBefore=true;
 const info=soundingInsights(p);assert.equal(info.lcl,undefined);assert.equal(info.windChanges.length,0);assert.equal(info.freezingLevels.length,0);assert.equal(info.inversions.length,0);assert.equal(info.dryTopM,undefined);
});
test('wind direction is absent for cancellation to calm, and unknown launch elevation stays unknown',()=>{
 const p={timestamp:0,levels:[{pressureHpa:1000,heightM:0,temperatureC:10,windMps:5,windDirection:0},{pressureHpa:900,heightM:1000,temperatureC:5,windMps:5,windDirection:180}]};
 const value=soundingAtHeight(p,500);assert.ok(value.windMps<1e-6);assert.equal(value.windDirection,undefined);assert.equal(value.aboveTakeoffM,undefined);
});
