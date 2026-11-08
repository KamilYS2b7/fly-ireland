import test from 'node:test';import assert from 'node:assert/strict';
import {cloudContours} from '../src/cloudContours.ts';
test('cloud isolines match known coverage and do not manufacture contours in missing data',()=>{
 const paths=cloudContours([[0,0],[100,100]],[50]);assert.ok(paths.length>0);
 assert.ok(paths.every(p=>p.points.every(v=>Math.abs(v.x-.5)<1e-6)));
 assert.deepEqual(cloudContours([[undefined,undefined],[undefined,undefined]]),[]);
 assert.deepEqual(cloudContours([[10,10],[10,10]]),[]);
 assert.ok(cloudContours([[0,100],[100,0]],[50]).every(p=>p.points.every(v=>v.x>=0&&v.x<=1&&v.y>=0&&v.y<=1)));
});
