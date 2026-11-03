import test from 'node:test';
import assert from 'node:assert/strict';
import {boltonLcl,sampleLcl,lclDisplay,lclInputDiagnostics} from '../src/lclForecast.ts';
import {cloudBaseMarkerDisplay} from '../src/weatherForecast.ts';
const time=Date.UTC(2026,10,3,12),hour=3600000;
const payload=()=>({header:{modelElevation:400,elevation:700},data:{ts:[time,time+hour],temp:[293.15,295.15],dewPoint:[283.15,283.15],pressure:[100000,99000]}});

test('observed ICON-EU format reads data.temperature and meteogram.dewPoint on separate time grids',()=>{
    const p={header:{model:'ICON-EU',modelElevation:222},data:{ts:[time,time+hour],temperature:[278.71,278.71],pressure:[104032.83,104032.83]},meteogram:{ts:[time,time+3*hour],dewPoint:[277.87,277.87]}};
    const r=sampleLcl(p,time);
    assert.equal(r.lclStatus,'available');
    assert.ok(r.lclAglM>80&&r.lclAglM<130);
    assert.equal(r.lclAslM,r.lclAglM+222);
    p.data.temperature=[293.15,295.15];p.meteogram.dewPoint=[283.15,286.15];
    assert.equal(sampleLcl(p,time+hour/2).lclAglM,boltonLcl(294.15,283.65,104032.83).heightM);
    p.meteogram.ts=[time+hour,time+3*hour];
    assert.equal(sampleLcl(p,time+hour/2).lclStatus,'unavailable','Never use a dew point outside its own forecast range');
});
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
        assert.match(sampleLcl(p,time+hour/2).lclNote,/missing/);
    }
    assert.equal(sampleLcl(payload(),time-1).lclStatus,'unavailable');
});
test('inputs interpolate at the requested time and ASL uses only model terrain, never launch elevation',()=>{
    const p=payload(),reading=sampleLcl(p,time+hour/2);
    assert.equal(reading.lclStatus,'available');
    assert.equal(reading.lclAglM,boltonLcl(294.15,283.15,99500).heightM);
    assert.equal(reading.lclAslM,reading.lclAglM+400);
    assert.equal(reading.lclAboveSiteM,reading.lclAslM-700);
    delete p.header.modelElevation;
    assert.equal(sampleLcl(p,time).lclAslM,undefined);
    assert.equal(sampleLcl(p,time).lclAboveSiteM,undefined);
    assert.equal(lclDisplay(reading).label,'Estimated cumulus base (LCL)');
    assert.match(lclDisplay(reading).value,/m AGL/);
    assert.match(lclDisplay(reading).aslValue,/m ASL/);
});
test('miniature labels distinguish native cloud base, estimated LCL and missing data',()=>{
    const r={status:'pass',cloudBaseStatus:'available',cloudBaseM:900,cloudBaseAslM:1300,cloudBaseAboveSiteM:600,cloudBaseReference:'AGL',...sampleLcl(payload(),time)};
    assert.match(cloudBaseMarkerDisplay(r).text,/CB · sea level: 1,300 m ASL/);
    assert.match(cloudBaseMarkerDisplay(r).text,/LCL · sea level: ~1,651 m ASL/);
    assert.match(cloudBaseMarkerDisplay(r).text,/LCL · above takeoff: ~951 m/);
    assert.doesNotMatch(cloudBaseMarkerDisplay(r).html,/AGL|model ground/);
    assert.equal(cloudBaseMarkerDisplay({}).text,'Cloud heights: No data');
});

test('height colours follow site clearance, with unknown and zero values neutral',()=>{
    const r={lclStatus:'available',lclAglM:100,lclAslM:300,lclAboveSiteM:20};
    assert.match(cloudBaseMarkerDisplay(r).html,/data-clearance="above"/);
    r.lclAboveSiteM=-80;
    assert.match(cloudBaseMarkerDisplay(r).html,/data-clearance="below"/);
    assert.match(cloudBaseMarkerDisplay(r).text,/below takeoff: ~80 m/);
    r.lclAboveSiteM=0;
    assert.match(cloudBaseMarkerDisplay(r).html,/data-clearance="level"/);
    delete r.lclAboveSiteM;
    assert.match(cloudBaseMarkerDisplay(r).html,/data-clearance="unknown"/);
});

test('site clearance preserves negative values instead of inventing a positive cloud base above launch',()=>{
    const r={lclStatus:'available',lclAglM:100,lclAslM:300,lclAboveSiteM:20};
    assert.equal(lclDisplay(r).siteValue,'~20 m above takeoff');
    r.lclAboveSiteM=-80;
    assert.equal(lclDisplay(r).siteValue,'~80 m below takeoff');
    delete r.lclAboveSiteM;
    assert.equal(lclDisplay(r).siteValue,'Site elevation unavailable');
});

test('unavailable LCL exposes actual forecast field names and numeric samples without raw response metadata',()=>{
    const p=payload();delete p.data.temp;delete p.data.dewPoint;
    p.data['temp-surface']=[290,291];p.data['dewpoint-surface']=[280,281];
    p.headers={authorization:'do-not-display'};
    const reading=sampleLcl(p,time);
    assert.equal(reading.lclStatus,'unavailable','Unknown names must be diagnosed, not silently guessed');
    assert.match(lclDisplay(reading).diagnostics,/temp-surface: 290 \/ 290/);
    assert.match(lclInputDiagnostics(p,0,1),/dewpoint-surface: 280 \/ 281/);
    assert.doesNotMatch(lclDisplay(reading).diagnostics,/authorization|do-not-display/);
});

test('compact rose heights retain ASL and takeoff clearance with direction in labels',()=>{
 const r={lclStatus:'available',lclAglM:100,lclAslM:1300,lclAboveSiteM:-80};
 const d=cloudBaseMarkerDisplay(r,true);
 assert.match(d.html,/LCL ASL/);assert.match(d.html,/~1,300 m</);
 assert.match(d.html,/LCL · below takeoff/);assert.match(d.html,/~80 m</);assert.doesNotMatch(d.html,/[−-]80/);
 assert.match(d.description,/below takeoff/);
 assert.doesNotMatch(d.html,/sea level|above site|below site/);
});

test('compact missing elevations fit the small rose panel',()=>{
 const d=cloudBaseMarkerDisplay({lclStatus:'available',lclAglM:100},true);
 assert.doesNotMatch(d.html,/unavailable|No ASL data|No elevation data/);
 assert.match(d.html,/—/);
});

test('ASL values stay green below takeoff while clearance alone turns red',()=>{
 const r={lclStatus:'available',lclAglM:100,lclAslM:300,lclAboveSiteM:-80,cloudBaseStatus:'available',cloudBaseM:120,cloudBaseReference:'AGL',cloudBaseAslM:320,cloudBaseAboveSiteM:-60};
 const html=cloudBaseMarkerDisplay(r,true).html;
 for(const label of ['LCL ASL','CB ASL'])assert.match(html,new RegExp('data-clearance="above"><span class="cloud-height-label">'+label));
 assert.match(html,/data-clearance="below"><span class="cloud-height-label">LCL · below takeoff/);
 assert.match(html,/data-clearance="below"><span class="cloud-height-label">CB · below takeoff/);
 delete r.lclAslM;
 assert.match(cloudBaseMarkerDisplay(r,true).html,/data-clearance="unknown"><span class="cloud-height-label">LCL ASL/);
});
