import test from 'node:test';
import assert from 'node:assert/strict';
import {watchMobilePanelVisibility} from '../src/mobilePanelVisibility.ts';

test('native side panels hide the phone panel, restore it after closing and do not affect desktop',()=>{
    const names=['window','document','MutationObserver','getComputedStyle','requestAnimationFrame','cancelAnimationFrame','setTimeout','clearTimeout'];
    const previous=Object.fromEntries(names.map(n=>[n,globalThis[n]]));
    let changed,frame,mobile=true,visible=true,left=40,disconnected=false;
    const events=new Map(),media={get matches(){return mobile;},addEventListener:(n,f)=>events.set('media',f),removeEventListener:()=>events.delete('media')};
    const native={checkVisibility:()=>visible,getBoundingClientRect:()=>({left,right:left+340,top:0,bottom:800,width:340,height:800})};
    const panel={contains:()=>false};
    const states=[];
    const timers=new Map();let timerId=0;
    Object.assign(globalThis,{
        window:{innerWidth:390,innerHeight:844,matchMedia:()=>media},
        document:{body:{},documentElement:{},querySelectorAll:()=>[native],addEventListener:(n,f)=>events.set(n,f),removeEventListener:n=>events.delete(n)},
        MutationObserver:class{constructor(f){changed=f;}observe(){}disconnect(){disconnected=true;}},
        getComputedStyle:()=>({display:'block',visibility:'visible',opacity:'1'}),
        requestAnimationFrame:f=>{frame=f;return 1;},cancelAnimationFrame:()=>{frame=undefined;},
        setTimeout:(f,delay)=>{timers.set(++timerId,{f,delay});return timerId;},clearTimeout:id=>timers.delete(id),
    });
    const flush=()=>{const f=frame;frame=undefined;f?.();};
    const settle=()=>{for(const [id,t] of [...timers])if(t.delay<1000){timers.delete(id);t.f();}flush();};
    let stop;
    try{
        const bus={on:(n,f)=>events.set('bus:'+n,f),off:n=>events.delete('bus:'+n)};
        stop=watchMobilePanelVisibility(panel,v=>states.push(v),bus);
        assert.equal(states.at(-1),true);
        visible=false;changed([{target:{}}]);flush();settle();assert.equal(states.at(-1),false);
        events.get('bus:rqstOpen')('detail');assert.equal(states.at(-1),false,'Bottom forecasts must not hide the plugin');
        events.get('bus:rqstOpen')('menu');assert.equal(states.at(-1),true,'Hide as soon as the menu is requested, before DOM visibility changes');
        events.get('bus:pluginOpened')('menu');flush();
        assert.equal(states.at(-1),true,'Opened event can precede the first visible animation frame');
        visible=true;changed([{target:{}}]);flush();
        const count=states.length;
        visible=false;changed([{target:{}}]);flush();
        assert.equal(states.length,count,'A transient invisible frame must not flash the panel');
        visible=true;changed([{target:{}}]);flush();settle();assert.equal(states.length,count);
        visible=false;events.get('bus:pluginClosed')('menu');flush();settle();assert.equal(states.at(-1),false);
        visible=true;changed([{target:{}}]);flush();assert.equal(states.at(-1),true);
        mobile=false;events.get('media')();flush();settle();assert.equal(states.at(-1),false);
        mobile=true;left=400;events.get('media')();flush();assert.equal(states.at(-1),false,'Offscreen sliding panels must not hide the plugin');
        left=40;events.get('transitionend')();flush();assert.equal(states.at(-1),true);
        stop();stop=undefined;assert.equal(disconnected,true);assert.equal(events.size,0);assert.equal(timers.size,0);
    }finally{stop?.();for(const n of names){if(previous[n]===undefined)delete globalThis[n];else globalThis[n]=previous[n];}}
});
