import assert from 'node:assert/strict';
import test from 'node:test';
import {LARGE_ROSES_STORAGE_KEY,SITE_ROSE_VISIBILITY_STORAGE_KEY,readLargeRosesVisible,saveLargeRosesVisible,normalizeSiteRoseVisibility,readSiteRoseVisibility,saveSiteRoseVisibility} from '../src/mapDisplay.ts';

test('large-rose visibility defaults on and only an explicit saved false hides roses',()=>{
 for(const stored of [null,undefined,'','true','FALSE','null','{}','0'])assert.equal(readLargeRosesVisible({getItem:()=>stored}),true);
 assert.equal(readLargeRosesVisible({getItem:()=> 'false'}),false);
 const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
 saveLargeRosesVisible(false,storage);assert.equal(values.get(LARGE_ROSES_STORAGE_KEY),'false');assert.equal(readLargeRosesVisible(storage),false);
 saveLargeRosesVisible(true,storage);assert.equal(readLargeRosesVisible(storage),true);
});

test('blocked browser storage does not prevent reading defaults or changing visibility',()=>{
 const blocked={getItem(){throw Error('Blocked');},setItem(){throw Error('Blocked');}};
 assert.equal(readLargeRosesVisible(blocked),true);
 assert.doesNotThrow(()=>saveLargeRosesVisible(false,blocked));
 assert.deepEqual(readSiteRoseVisibility(blocked),{});assert.doesNotThrow(()=>saveSiteRoseVisibility({colin:false},blocked));
});

test('site rose choices preserve explicit overrides and reject malformed or inherited values',()=>{
 const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
 saveSiteRoseVisibility({colin:false,dungiven:true},storage);
 assert.deepEqual(readSiteRoseVisibility(storage),{colin:false,dungiven:true});
 assert.equal(values.get(SITE_ROSE_VISIBILITY_STORAGE_KEY),'{"colin":false,"dungiven":true}');
 for(const raw of ['invalid','null','[]','false','"false"']){values.set(SITE_ROSE_VISIBILITY_STORAGE_KEY,raw);assert.deepEqual(readSiteRoseVisibility(storage),{});}
 assert.deepEqual(normalizeSiteRoseVisibility(JSON.parse('{"colin":false,"bad":"false","other":null,"__proto__":false,"constructor":true}')),{colin:false});
 assert.deepEqual(normalizeSiteRoseVisibility(Object.assign(Object.create({inherited:false}),{own:true})),{own:true});
});
