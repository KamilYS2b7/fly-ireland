import test from 'node:test';
import assert from 'node:assert/strict';
import { pointModelSupported, forecastModelLabel, responseMatchesModel } from '../src/forecastModels.ts';
import * as forecastModels from '../src/forecastModels.ts';
import { samplePointForecast } from '../src/pointSampler.ts';

test('model choices contain only available weather products, deduplicated, and retain an externally selected model', () => {
    assert.deepEqual(forecastModels.forecastModelOptions?.(['gfs','radar','ukv','mblue','gfs',null,'iconEu'],'ecmwf'), [
        {id:'ukv',label:'UKV'}, {id:'ecmwf',label:'ECMWF'}, {id:'gfs',label:'GFS'},
        {id:'iconEu',label:'ICON-EU'}, {id:'mblue',label:'Meteoblue AI'},
    ]);
    assert.deepEqual(forecastModels.forecastModelOptions?.([], 'satellite'), []);
});

test('recognizes weather models and distinguishes regional variants from unrelated products', () => {
    for (const model of ['ukv','ecmwf','gfs','icon','iconEu','iconD2','arome','mblue']) assert.equal(pointModelSupported(model),true);
    for (const model of ['radar','satellite','ecmwfWaves','cams','',null]) assert.equal(pointModelSupported(model),false);
    assert.equal(responseMatchesModel('iconEu','ICON-EU'),true);
    assert.equal(responseMatchesModel('iconEu','ICON'),false);
    assert.equal(responseMatchesModel('ecmwf','UKV'),false);
    assert.equal(forecastModelLabel('iconEu'),'ICON-EU');
});

test('sampler accepts only the requested model, with unchanged speed units and missing-data handling', () => {
    const spot={id:'test',lat:55,lon:-7,sectorStart:0,sectorEnd:360};
    for(const model of ['ecmwf','gfs','iconEu','arome','mblue']) {
        const p={status:200,data:{header:{model:forecastModelLabel(model)},data:{ts:[1000,2000],wind:[3,3],windDir:[240,240],windGust:[5,5]}}};
        assert.equal(samplePointForecast(spot,p,1000,model).mph,3/0.44704);
        assert.equal(samplePointForecast(spot,p,1000,'ukv').status,'unavailable');
        p.data.data.wind=[null,null];assert.equal(samplePointForecast(spot,p,1000,model).status,'unavailable');
    }
});
