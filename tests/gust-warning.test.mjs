import assert from 'node:assert/strict';
import test from 'node:test';
import {gustWarningDisplay} from '../src/gustWarning.ts';

const reading={status:'pass',mph:10,gustStatus:'available',gustMph:20};
test('gust alerts use absolute speed and spread, including the agreed 12 to 16 case',()=>{
    for(const [mph,gustMph,severity] of [[2,5,'none'],[12,16,'none'],[5,9.999,'none'],
        [5,10,'gusty'],[8,14,'gusty'],[10,18,'gusty'],[12,17,'gusty'],[12,16.999,'none'],
        [15,19.999,'none'],[15,20,'strong'],[12,22,'strong'],[0,5,'none']]){
        const result=gustWarningDisplay({...reading,mph,gustMph});
        assert.equal(result.severity,severity,`${mph} to ${gustMph}`);
        assert.equal(result.active,severity!=='none');
    }
    assert.equal(gustWarningDisplay({...reading,gustMph:18}).label,'Gusty');
    assert.equal(gustWarningDisplay({...reading,gustMph:20}).label,'Strong gusts');
});
test('missing or stale gusts and invalid wind values never show a warning',()=>{
    for(const patch of [{status:'loading'},{status:'settings'},{status:'unavailable'},
        {gustStatus:'loading'},{gustStatus:'unavailable'},{gustMph:undefined},{gustMph:NaN},
        {gustMph:Infinity},{gustMph:-1},{mph:undefined},{mph:NaN},{mph:-1}]){
        assert.equal(gustWarningDisplay({...reading,gustMph:25,...patch}).active,false,JSON.stringify(patch));
    }
});
test('warning explains the gust and mean wind in the selected unit',()=>{
    const forecast={...reading,gustMph:25};
    assert.match(gustWarningDisplay(forecast).description,/Strong gusts: 25\.0 mph.*10\.0 mph.*\+15\.0 mph/);
    assert.match(gustWarningDisplay(forecast,'kt').description,/21\.7 kt.*8\.7 kt.*\+13\.0 kt/);
    assert.equal(gustWarningDisplay(forecast).difference,'+15.0 mph');
    for(const unit of ['mph','kt','km/h','m/s']){
        assert.equal(gustWarningDisplay({...reading,mph:12,gustMph:16},unit).severity,'none');
        assert.equal(gustWarningDisplay({...reading,mph:12,gustMph:17},unit).severity,'gusty');
        assert.equal(gustWarningDisplay(forecast,unit).severity,'strong');
    }
});
