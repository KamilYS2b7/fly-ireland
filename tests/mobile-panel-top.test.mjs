import test from 'node:test';
import assert from 'node:assert/strict';
import {mobilePanelTop,topControlBounds} from '../src/mobilePanelTop.ts';
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

test('unrecognised mobile header is detected from the screen stack, excluding the plugin and map markers',()=>{
    const names=['document','HTMLElement','getComputedStyle'];
    const previous=Object.fromEntries(names.map(n=>[n,globalThis[n]]));
    class Element{
        constructor(rect,marker=false){this.rect=rect;this.marker=marker;}
        contains(n){return n===this;}
        closest(){return this.marker?this:null;}
        checkVisibility(){return true;}
        getBoundingClientRect(){return this.rect;}
    }
    const panel=new Element(bar(16,96)),header=new Element(bar(0,110)),marker=new Element(bar(0,150),true);
    let shown=true;
    Object.assign(globalThis,{HTMLElement:Element,document:{querySelectorAll:()=>[],elementsFromPoint:()=>shown?[panel,header,marker]:[panel,marker]},getComputedStyle:()=>({display:'block',visibility:'visible',opacity:'1'})});
    try{
        assert.equal(mobilePanelTop(8,288,0,topControlBounds(panel,8,288,0)),122);
        shown=false;
        assert.equal(mobilePanelTop(8,288,0,topControlBounds(panel,8,288,0)),16);
    }finally{for(const n of names){if(previous[n]===undefined)delete globalThis[n];else globalThis[n]=previous[n];}}
});
