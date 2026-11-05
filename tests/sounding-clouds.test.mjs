import test from 'node:test';import assert from 'node:assert/strict';
import {soundingCloudBands} from '../src/soundingClouds.ts';
const profile={timestamp:0,terrainM:100,levels:[{heightM:100},{heightM:2000}],clouds:[{heightM:100,coverPct:0},{heightM:500,coverPct:60},{heightM:1000},{heightM:1500,coverPct:80},{heightM:2000,coverPct:0}]};
test('cloud cells are bounded by model-level midpoints and do not fill missing or clear levels',()=>{
 const bands=soundingCloudBands(profile);assert.equal(bands.length,2);
 assert.equal(bands[0].bottomM,300);assert.equal(bands[0].topM,750);assert.equal(bands[0].coverPct,60);
 assert.equal(bands[1].bottomM,1250);assert.equal(bands[1].topM,1750);
});
test('LCL or parcel data alone never create forecast clouds',()=>{
 assert.deepEqual(soundingCloudBands({...profile,clouds:undefined,surfaceLclM:800}),[]);
 assert.deepEqual(soundingCloudBands({...profile,clouds:profile.clouds.map(c=>({...c,coverPct:0}))}),[]);
});
test('a single cloud level is a point sample, not an invented cloud thickness',()=>{
 const bands=soundingCloudBands({...profile,clouds:[{heightM:900,coverPct:50}]});assert.equal(bands[0].bottomM,900);assert.equal(bands[0].topM,900);assert.equal(bands[0].pointOnly,true);
});
