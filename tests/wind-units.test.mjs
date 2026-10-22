import assert from 'node:assert/strict';
import test from 'node:test';
import {readWindUnit,saveWindUnit,formatWindSpeed,WIND_UNIT_STORAGE_KEY} from '../src/windUnits.ts';

test('saved wind units tolerate absent, unsupported and inaccessible browser storage',()=>{
    const values=new Map();const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
    assert.equal(readWindUnit(storage),'mph');
    saveWindUnit('kt',storage);assert.equal(readWindUnit(storage),'kt');
    values.set(WIND_UNIT_STORAGE_KEY,'unexpected');assert.equal(readWindUnit(storage),'mph');
    const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
    assert.equal(readWindUnit(blocked),'mph');
    assert.doesNotThrow(()=>saveWindUnit('km/h',blocked));
});

test('display units preserve calm wind while invalid speeds remain missing data',()=>{
    for(const unit of ['mph','km/h','m/s','kt']){
        assert.equal(formatWindSpeed(0,unit),`0.0 ${unit}`);
        for(const invalid of [null,undefined,NaN,Infinity,-1])assert.equal(formatWindSpeed(invalid,unit),'No data');
    }
});
