import assert from 'node:assert/strict';
import test from 'node:test';
import {samplePointForecast} from '../src/pointForecast.ts';
import {rainDisplay} from '../src/rainForecast.ts';

const time=Date.UTC(2026,9,22,12), hour=3600000;
const spot={id:'rain',lat:55,lon:-6,sectorStart:0,sectorEnd:360};
function payload(){return {status:200,data:{header:{model:'UKV'},data:{
    ts:[time,time+3*hour,time+6*hour],wind:[4,4,4],windDir:[180,180,180],windGust:[6,6,6],
    precipAmount:[1.2,0,3],precipSnowAmount:[0.2,0,3],precipConvectiveAmount:[0.3,0,0],
}}};}
test('rain uses the containing v3 forecast interval without interpolating wet and dry totals',()=>{
    const p=payload();
    for(const timestamp of [time,time+hour,time+3*hour-1]){
        const reading=samplePointForecast(spot,p,timestamp);
        assert.equal(reading.rainStatus,'available');assert.equal(reading.rainMm,1);
        assert.equal(reading.rainStart,time);assert.equal(reading.rainEnd,time+3*hour);
        assert.equal(reading.status,'pass');
    }
    assert.equal(samplePointForecast(spot,p,time+3*hour).rainMm,0);
    assert.equal(samplePointForecast(spot,p,time+6*hour).rainMm,0,'snow is not rain');
    assert.equal(samplePointForecast(spot,p,time-1).rainStatus,'unavailable');
});
test('rain supports hourly data and invalid/missing fields never become dry forecasts',()=>{
    const p=payload();p.data.data.ts=[time,time+hour,time+2*hour];
    assert.equal(samplePointForecast(spot,p,time).rainEnd,time+hour);
    for(const bad of [null,-1,NaN]){
        const broken=payload();broken.data.data.precipAmount[0]=bad;
        assert.equal(samplePointForecast(spot,broken,time).rainStatus,'unavailable');
    }
    const missingSnow=payload();delete missingSnow.data.data.precipSnowAmount;
    assert.equal(samplePointForecast(spot,missingSnow,time).rainStatus,'unavailable');
    const missingWind=payload();missingWind.data.data.wind[0]=null;
    assert.equal(samplePointForecast(spot,missingWind,time).rainMm,1,'rain can be known when wind is not');
});
test('rain display distinguishes trace rain, dry, loading and unavailable and names the period',()=>{
    const wet={rainStatus:'available',rainMm:0.01,rainStart:time,rainEnd:time+3*hour};
    assert.equal(rainDisplay(wet).wet,true);assert.equal(rainDisplay(wet).value,'<0.1 mm / 3h');
    assert.match(rainDisplay(wet).description,/12:00.*15:00.*UTC/);
    assert.equal(rainDisplay({...wet,rainMm:0}).wet,false);
    assert.equal(rainDisplay({rainStatus:'loading'}).value,'Loading…');
    assert.equal(rainDisplay({rainStatus:'unavailable'}).value,'No data');
});
