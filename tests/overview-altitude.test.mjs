import test from 'node:test';import assert from 'node:assert/strict';
import {heightLabel,altitudeTicks,smoothHeightPath,sampleSmoothHeight,pairedReadoutPositions} from '../src/overviewAltitude.ts';
test('feet conversion and readable altitude ticks preserve underlying metre coordinates',()=>{
 assert.equal(heightLabel(304.8,'ft'),'1,000 ft');assert.equal(heightLabel(304.8,'m'),'305 m');
 const ticks=altitudeTicks(100,1200,'ft');assert.ok(ticks.length>2);assert.ok(ticks.every(h=>h>=100&&h<=1200));
 assert.ok(ticks.every(h=>Math.abs(h/0.3048/500-Math.round(h/0.3048/500))<1e-6));
});
test('smooth LCL keeps samples, segment bounds and missing-data gaps',()=>{
 const points=[{x:0,y:50},{x:10,y:10},{x:20,y:40},undefined,{x:40,y:25},{x:50,y:30}];
 const path=smoothHeightPath(points);assert.equal((path.match(/M/g)||[]).length,2);assert.equal((path.match(/C/g)||[]).length,3);
 const segments=[...path.matchAll(/C([^CM]+)/g)].map(m=>m[1].trim().split(/[ ,]+/).map(Number));
 for(const [i,[lo,hi]] of [[10,50],[10,40],[25,30]].entries()){
  assert.ok(segments[i][1]>=lo&&segments[i][1]<=hi);assert.ok(segments[i][3]>=lo&&segments[i][3]<=hi);
 }
 assert.ok(path.includes('10,10'));assert.ok(path.includes('20,40'));assert.ok(path.includes('M40,25'));
 assert.equal(smoothHeightPath([]),'');
});

test('LCL tracking samples the rendered curve and never crosses a missing hour',()=>{
 const points=[{x:8,y:200},{x:9,y:500},{x:10,y:300},undefined,{x:12,y:100}];
 assert.equal(sampleSmoothHeight(points,9),500);
 assert.ok(sampleSmoothHeight(points,8.5)>200&&sampleSmoothHeight(points,8.5)<500);
 assert.equal(sampleSmoothHeight(points,10.5),undefined);
 assert.equal(sampleSmoothHeight(points,7.5),undefined);
 assert.equal(sampleSmoothHeight(points,12),100);
 const line=[{x:8,y:100},{x:9,y:200}];assert.ok(Math.abs(sampleSmoothHeight(line,8.5)-150)<1e-6);
});

test('both inline readouts remain separated and inside the plot at overlapping heights and edges',()=>{
 for(const [a,b] of [[250,250],[28,28],[468,468],[35,460],[460,35]]){
  const p=pairedReadoutPositions(a,b,28,468);
  assert.ok(p.weather>=28&&p.weather+30<=468);
  assert.ok(p.lcl>=28&&p.lcl+46<=468);
  assert.ok(p.weather+30+9<=p.lcl||p.lcl+46+9<=p.weather);
 }
});
