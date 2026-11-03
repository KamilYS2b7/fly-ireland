import test from 'node:test';
import assert from 'node:assert/strict';
import {boltonLcl,sampleLcl,lclDisplay} from '../src/lclForecast.ts';
import {cloudBaseMarkerDisplay} from '../src/weatherForecast.ts';
const time=Date.UTC(2026,10,3,12),hour=3600000;
const payload=()=>({header:{modelElevation:400,elevation:700},data:{ts:[time,time+hour],temp:[293.15,295.15],dewPoint:[283.15,283.15],pressure:[100000,99000]}});
test('Bolton reference parcel gives about 1.25 km LCL; saturated parcels give zero',()=>{
    const result=boltonLcl(293.15,283.15,100000);
    assert.ok(Math.abs(result.temperatureK-280.93)<0.01);
    assert.ok(Math.abs(result.pressurePa/100-861.67)<0.02);
    assert.ok(Math.abs(result.heightM-1251)<2);
    assert.equal(boltonLcl(293.15,293.15,100000).heightM,0);
    const low=boltonLcl(293.15,283.15,80000);
    assert.equal(low.heightM,result.heightM);
    assert.ok(low.pressurePa<result.pressurePa);
});
test('invalid, missing or ambiguous units never become a parcel estimate',()=>{
    for(const args of [[20,10,1000],[293.15,294.15,100000],[293.15,null,100000],[NaN,283.15,100000],[293.15,283.15,undefined]])assert.equal(boltonLcl(...args),undefined);
    for(const key of ['temp','dewPoint','pressure']){
        const p=payload();p.data[key][1]=null;
        assert.equal(sampleLcl(p,time+hour/2).lclStatus,'unavailable');
    }
    assert.equal(sampleLcl(payload(),time-1).lclStatus,'unavailable');
});
test('inputs interpolate at the requested time and ASL uses only model terrain, never launch elevation',()=>{
    const p=payload(),reading=sampleLcl(p,time+hour/2);
    assert.equal(reading.lclStatus,'available');
    assert.equal(reading.lclAglM,boltonLcl(294.15,283.15,99500).heightM);
    assert.equal(reading.lclAslM,reading.lclAglM+400);
    delete p.header.modelElevation;
    assert.equal(sampleLcl(p,time).lclAslM,undefined);
    assert.equal(lclDisplay(reading).label,'Estimated cumulus base (LCL)');
    assert.match(lclDisplay(reading).value,/m AGL/);
    assert.match(lclDisplay(reading).aslValue,/m ASL/);
});
test('miniature labels distinguish native cloud base, estimated LCL and missing data',()=>{
    const r={status:'pass',cloudBaseStatus:'available',cloudBaseM:900,cloudBaseReference:'AGL',...sampleLcl(payload(),time)};
    assert.match(cloudBaseMarkerDisplay(r).text,/CB: 900 m AGL\nLCL: ~1,251 m AGL/);
    assert.match(cloudBaseMarkerDisplay(sampleLcl(payload(),time)).text,/^LCL:/);
    assert.equal(cloudBaseMarkerDisplay({}).text,'CB: No data');
});
