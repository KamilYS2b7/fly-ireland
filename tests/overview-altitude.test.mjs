import test from 'node:test';import assert from 'node:assert/strict';
import {heightLabel,altitudeTicks,smoothHeightPath} from '../src/overviewAltitude.ts';
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
