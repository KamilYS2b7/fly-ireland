import assert from 'node:assert/strict';
import test from 'node:test';
import {revealPanelCard} from '../src/panelScroll.ts';

function fixture(run){
    const original=globalThis.ResizeObserver,observers=new Set();
    globalThis.ResizeObserver=class{
        constructor(callback){this.callback=callback;observers.add(this);}
        observe(){}
        disconnect(){observers.delete(this);}
    };
    const list=new EventTarget();
    Object.assign(list,{isConnected:true,scrollTop:0,clientHeight:800,scrollHeight:2200,
        contains:card=>card.isConnected,
        getBoundingClientRect:()=>({top:100,height:list.clientHeight}),
        scrollTo:({top})=>{list.scrollTop=top;},
    });
    const card={isConnected:true,getBoundingClientRect:()=>({top:1500-list.scrollTop,height:220})};
    const resize=()=>{for(const observer of [...observers])observer.callback([]);};
    let stop;
    try{stop=revealPanelCard(list,card);run({list,card,resize,stop,observers});}
    finally{stop?.();globalThis.ResizeObserver=original;}
}

test('revealed card stays fully visible as the timeline shrinks the list in stages',()=>{
    fixture(({list,card,resize})=>{
        assert.equal(list.scrollTop,1110);
        for(const height of [600,400,300]){
            list.clientHeight=height;resize();
            const rect=card.getBoundingClientRect();
            assert.ok(rect.top>=100&&rect.top+rect.height<=100+height);
        }
        assert.equal(list.scrollTop,1360);
    });
});

test('manual list navigation cancels automatic reveal adjustments',()=>{
    fixture(({list,resize,observers})=>{
        list.dispatchEvent(new Event('wheel'));list.scrollTop=200;
        list.clientHeight=400;resize();
        assert.equal(list.scrollTop,200);
        assert.equal(observers.size,0);
    });
});

test('a removed card or disposed reveal stops observing the list',()=>{
    fixture(({card,resize,observers})=>{
        card.isConnected=false;resize();assert.equal(observers.size,0);
    });
    fixture(({list,resize,stop,observers})=>{
        stop();list.scrollTop=150;list.clientHeight=400;resize();
        assert.equal(list.scrollTop,150);assert.equal(observers.size,0);
    });
});
