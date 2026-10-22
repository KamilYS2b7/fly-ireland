import assert from 'node:assert/strict';
import test from 'node:test';
import {rangesFromParaglidingMap,directionMatches} from '../src/windRanges.ts';
import {evaluateWind} from '../src/windForecast.ts';
const vector=d=>[-Math.sin(d*Math.PI/180)*4,-Math.cos(d*Math.PI/180)*4];
const compass=['N','NE','E','SE','S','SW','W','NW'];

test('Paragliding Map compass wedges are centred on their eight labels and retain disconnected sectors',()=>{
    assert.deepEqual(rangesFromParaglidingMap('SE, S, NW'),[
        {start:112.5,end:202.5,endExclusive:true},
        {start:292.5,end:337.5,endExclusive:true},
    ]);
    assert.deepEqual(rangesFromParaglidingMap('N, NE, NW'),[{start:292.5,end:67.5,endExclusive:true}]);
    assert.deepEqual(rangesFromParaglidingMap('N'),[{start:337.5,end:22.5,endExclusive:true}]);
    assert.deepEqual(rangesFromParaglidingMap(' s, SE, s '),rangesFromParaglidingMap('SE, S'));
    const spot={id:'source',lat:53,lon:-9,sectorStart:NaN,sectorEnd:NaN,windRanges:rangesFromParaglidingMap('SE, S, NW')};
    for(const d of [112.5,135,180,202.499,292.5,315,337.499])assert.equal(evaluateWind(spot,vector(d)).status,'pass',String(d));
    for(const d of [0,90,202.5,225,270,337.5])assert.equal(evaluateWind(spot,vector(d)).reason,'direction',String(d));
});

test('all eight compass directions cover a full circle; missing or malformed labels never create a range',()=>{
    assert.deepEqual(rangesFromParaglidingMap(compass.join(', ')),[{start:0,end:360,endExclusive:true}]);
    for(const value of ['',null,undefined,[],123,'NNE','N, unknown','N,','N/S','0–90'])assert.deepEqual(rangesFromParaglidingMap(value),[],String(value));
});

test('every combination of source compass wedges matches only its own sectors, including north and exact boundaries',()=>{
    for(let mask=0;mask<256;mask++){
        const selected=compass.filter((_,i)=>mask&(1<<i));
        const ranges=rangesFromParaglidingMap(selected.join(', '));
        for(let i=0;i<8;i++){
            const expected=!!(mask&(1<<i));
            for(const d of [i*45,((i*45-22.5)+360)%360,(i*45+22.5-0.001)%360]){
                assert.equal(directionMatches(ranges,d),expected,`${selected}: ${d}`);
            }
        }
    }
});
