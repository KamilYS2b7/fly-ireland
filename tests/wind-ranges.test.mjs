import assert from 'node:assert/strict';
import test from 'node:test';
import {rangesFromFlybubble,windRanges,formatWindRanges} from '../src/windRanges.ts';
import {evaluateWind} from '../src/windForecast.ts';
const vector=d=>[-Math.sin(d*Math.PI/180)*4,-Math.cos(d*Math.PI/180)*4];
test('Flybubble sectors start at north and preserve disconnected direction ranges',()=>{
    const sectors=[2,1,0,0,0,0,2,1,0,0,0,0,0,0,0,0];
    const ranges=rangesFromFlybubble(sectors);
    assert.deepEqual(ranges,[{start:0,end:45,endExclusive:true},{start:135,end:180,endExclusive:true}]);
    const spot={id:'x',lat:54,lon:-7,sectorStart:0,sectorEnd:45,windRanges:ranges};
    for(const d of [0,22.5,44.999,135,160,179.999])assert.equal(evaluateWind(spot,vector(d)).status,'pass',String(d));
    for(const d of [45,90,180,270])assert.equal(evaluateWind(spot,vector(d)).reason,'direction',String(d));
    assert.equal(formatWindRanges(spot),'0°–45° / 135°–180°');
});
test('all-direction, north crossing, empty and malformed source sectors are handled',()=>{
    assert.deepEqual(rangesFromFlybubble(Array(16).fill(1)),[{start:0,end:360,endExclusive:true}]);
    assert.deepEqual(rangesFromFlybubble([2,...Array(14).fill(0),1]),[{start:337.5,end:22.5,endExclusive:true}]);
    for(const input of [[],null,Array(16).fill(0),Array(16).fill(3)])assert.deepEqual(rangesFromFlybubble(input),[]);
    const spot={id:'empty',lat:54,lon:-7,sectorStart:0,sectorEnd:360,windRanges:[]};
    assert.equal(evaluateWind(spot,vector(0)).status,'unavailable');
    assert.deepEqual(windRanges({sectorStart:340,sectorEnd:20}),[{start:340,end:20}]);
});
