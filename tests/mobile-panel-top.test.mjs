import test from 'node:test';
import assert from 'node:assert/strict';
import {mobilePanelTop} from '../src/mobilePanelTop.ts';
const bar=(top,bottom,overrides={})=>({left:0,right:390,top,bottom,width:390,height:bottom-top,...overrides});
test('mobile panel clears sliding top controls and returns below its minimum offset',()=>{
    assert.equal(mobilePanelTop(8,288,0,[]),16);
    assert.equal(mobilePanelTop(8,288,0,[bar(-40,80)]),92);
    assert.equal(mobilePanelTop(8,288,0,[bar(-10,110)]),122);
    assert.equal(mobilePanelTop(8,288,0,[bar(0,140)]),152);
    assert.equal(mobilePanelTop(8,288,0,[bar(-140,0)]),16);
    assert.equal(mobilePanelTop(8,288,30,[]),46);
});
test('timeline, fullscreen wrappers, hidden and horizontally separate controls cannot push the panel down',()=>{
    assert.equal(mobilePanelTop(8,288,0,[bar(600,720),bar(0,844),bar(0,140,{left:300,right:390}),bar(0,140,{width:0})]),16);
});
