import test from 'node:test';
import assert from 'node:assert/strict';
import {matchTimelineSeries,timelineTimestamp} from '../src/timelinePreview.ts';

const hour=3600000;
const start=Date.UTC(2026,9,21,6);
const series={header:{utcOffset:1},data:{ts:[start,start+3*hour,start+6*hour,start+9*hour],hour:[7,10,13,16]}};

test('preview uses the forecast table time projection continuously between model hours',()=>{
    const axis=matchTimelineSeries([7,10,13,16],21,series,30);
    assert.ok(axis);
    // Windy's table shifts each interval by utcOffset modulo its duration.
    assert.equal(timelineTimestamp(axis,10),start);
    assert.equal(timelineTimestamp(axis,15),start+hour/2);
    assert.equal(timelineTimestamp(axis,40),start+3*hour);
    assert.equal(timelineTimestamp(axis,45),start+3.5*hour);
});

test('preview supports hourly and mixed resolution series without borrowing another day',()=>{
    const times=[start,start+hour,start+2*hour,start+5*hour];
    const data={header:{utcOffset:1},data:{ts:times,hour:[7,8,9,12]}};
    const axis=matchTimelineSeries([7,8,9,12],21,data,30);
    assert.equal(timelineTimestamp(axis,15),start+0.5*hour);
    assert.equal(timelineTimestamp(axis,75),start+2.5*hour);
    assert.equal(matchTimelineSeries([7,8,9,12],22,data,30),undefined);
});

test('preview rejects mismatched table hours and keeps UTC spacing through the autumn clock change',()=>{
    assert.equal(matchTimelineSeries([7,8,9],21,series,30),undefined);
    const autumn=Date.UTC(2026,9,25);
    const axis=matchTimelineSeries([1,3,6],25,{header:{utcOffset:1},data:{ts:[autumn,autumn+3*hour,autumn+6*hour],hour:[1,3,6]}},30);
    assert.equal(timelineTimestamp(axis,10),autumn);
    assert.equal(timelineTimestamp(axis,40),autumn+3*hour);
    assert.equal(timelineTimestamp(axis,-1),undefined);
    assert.equal(timelineTimestamp(axis,1000),undefined);
});
