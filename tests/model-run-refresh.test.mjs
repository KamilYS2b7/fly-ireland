import test from 'node:test';
import assert from 'node:assert/strict';
import {watchModelRunRefresh} from '../src/modelRunRefresh.ts';

test('model metadata refreshes every thirty minutes and on returning to the page, with no work while hidden or after teardown',t=>{
    const previous={window:globalThis.window,document:globalThis.document};
    const events=new Map();let timer,delay,cleared=false,calls=0;
    const eventTarget={addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:name=>events.delete(name)};
    Object.assign(globalThis,{window:{...eventTarget,setInterval:(fn,ms)=>{timer=fn;delay=ms;return 1;},clearInterval:()=>{cleared=true;timer=undefined;}},document:{...eventTarget,visibilityState:'visible'}});
    t.after(()=>{for(const key of ['window','document']){if(previous[key]===undefined)delete globalThis[key];else globalThis[key]=previous[key];}});
    const stop=watchModelRunRefresh(()=>calls++);
    assert.equal(delay,1800000);assert.equal(calls,0);
    timer();events.get('focus')();assert.equal(calls,2);
    document.visibilityState='hidden';timer();events.get('visibilitychange')();assert.equal(calls,2);
    document.visibilityState='visible';events.get('visibilitychange')();assert.equal(calls,3);
    stop();assert.equal(cleared,true);assert.equal(events.size,0);
});
