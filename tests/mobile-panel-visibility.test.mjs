import test from 'node:test';
import assert from 'node:assert/strict';
import {watchMobilePanelVisibility} from '../src/mobilePanelVisibility.ts';

test('native side panels hide the phone panel, restore it after closing and do not affect desktop',()=>{
    const names=['window','document','MutationObserver','getComputedStyle','requestAnimationFrame','cancelAnimationFrame'];
    const previous=Object.fromEntries(names.map(n=>[n,globalThis[n]]));
    let changed,frame,mobile=true,visible=true,left=40,disconnected=false;
    const events=new Map(),media={get matches(){return mobile;},addEventListener:(n,f)=>events.set('media',f),removeEventListener:()=>events.delete('media')};
    const native={checkVisibility:()=>visible,getBoundingClientRect:()=>({left,right:left+340,top:0,bottom:800,width:340,height:800})};
    const panel={contains:()=>false};
    const states=[];
    Object.assign(globalThis,{
        window:{innerWidth:390,innerHeight:844,matchMedia:()=>media},
        document:{body:{},documentElement:{},querySelectorAll:()=>[native],addEventListener:(n,f)=>events.set(n,f),removeEventListener:n=>events.delete(n)},
        MutationObserver:class{constructor(f){changed=f;}observe(){}disconnect(){disconnected=true;}},
        getComputedStyle:()=>({display:'block',visibility:'visible',opacity:'1'}),
        requestAnimationFrame:f=>{frame=f;return 1;},cancelAnimationFrame:()=>{frame=undefined;},
    });
    const flush=()=>{const f=frame;frame=undefined;f?.();};
    let stop;
    try{
        stop=watchMobilePanelVisibility(panel,v=>states.push(v));
        assert.equal(states.at(-1),true);
        visible=false;changed([{target:{}}]);flush();assert.equal(states.at(-1),false);
        visible=true;changed([{target:{}}]);flush();assert.equal(states.at(-1),true);
        mobile=false;events.get('media')();flush();assert.equal(states.at(-1),false);
        mobile=true;left=400;events.get('media')();flush();assert.equal(states.at(-1),false,'Offscreen sliding panels must not hide the plugin');
        left=40;events.get('transitionend')();flush();assert.equal(states.at(-1),true);
        stop();stop=undefined;assert.equal(disconnected,true);assert.equal(events.size,0);
    }finally{stop?.();for(const n of names){if(previous[n]===undefined)delete globalThis[n];else globalThis[n]=previous[n];}}
});
