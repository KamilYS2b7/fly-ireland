import test from 'node:test';
import assert from 'node:assert/strict';
import {watchPanelLayout} from '../src/panelLayout.ts';

test('timeline handle motion does not repeatedly measure every forecast cell', () => {
    const names=['Element','Node','document','window','MutationObserver','ResizeObserver','getComputedStyle','requestAnimationFrame','cancelAnimationFrame'];
    const previous=Object.fromEntries(names.map(n=>[n,globalThis[n]]));
    let reads=0,mutation;const frames=new Map();let next=0;
    class Element {
        constructor(id='',top=600,height=20){this.id=id;this.top=top;this.height=height;this.children=[];this.style={setProperty:(k,v)=>this[k]=v};}
        contains(n){return n===this||this.children.some(c=>c.contains(n));}
        matches(){return ['plugin-detail','plugin-progress-bar','plugin-mobile-calendar'].includes(this.id);}
        querySelectorAll(){return this.children.flatMap(c=>[c,...c.querySelectorAll()]);}
        querySelector(){return this.querySelectorAll().find(c=>c.matches());}
        getBoundingClientRect(){reads++;return {top:this.top,bottom:this.top+this.height,left:0,right:300,width:300,height:this.height};}
        checkVisibility(){return true;}
    }
    const panel=new Element('panel',80,500), table=new Element('plugin-detail',600,200),handle=new Element('handle',578);
    table.children=[...Array.from({length:1500},()=>new Element()),handle];
    const body=new Element('body',0,800);body.children=[panel,table];
    const eventTarget={addEventListener(){},removeEventListener(){}};
    Object.assign(globalThis,{Element,Node:Element,document:{...eventTarget,body,documentElement:new Element(),querySelectorAll:()=>[table]},
        window:{...eventTarget,innerHeight:800},getComputedStyle:()=>({display:'block',visibility:'visible',opacity:'1'}),
        MutationObserver:class{constructor(cb){mutation=cb;}observe(){}disconnect(){}},
        ResizeObserver:class{observe(){}unobserve(){}disconnect(){}},
        requestAnimationFrame:cb=>{frames.set(++next,cb);return next;},cancelAnimationFrame:id=>frames.delete(id)});
    const flush=()=>{const pending=[...frames.values()];frames.clear();pending.forEach(f=>f());};
    let stop;
    try {
        stop=watchPanelLayout(panel);flush();reads=0;
        for(let i=0;i<20;i++){
            mutation([{type:'attributes',attributeName:'style',target:handle,addedNodes:[],removedNodes:[]}]);flush();
        }
        assert.ok(reads<200,`Handle motion caused ${reads} geometry reads`);
        assert.equal(panel['--panel-available-height'],'474px');
        reads=0;
        for(let i=0;i<20;i++){
            mutation([{type:'attributes',attributeName:'class',target:table.children[i],addedNodes:[],removedNodes:[]}]);flush();
        }
        assert.ok(reads<200,`Active forecast cell changes caused ${reads} geometry reads`);
        // Newly inserted overflowing controls must still reduce available space.
        const close=new Element('close',550,30);table.children.push(close);
        mutation([{type:'childList',target:table,addedNodes:[close],removedNodes:[]}]);flush();
        assert.equal(panel['--panel-available-height'],'446px');
        close.top=530;
        mutation([{type:'attributes',attributeName:'style',target:close,addedNodes:[],removedNodes:[]}]);flush();
        assert.equal(panel['--panel-available-height'],'426px');
        table.children=table.children.filter(c=>c!==close);
        mutation([{type:'childList',target:table,addedNodes:[],removedNodes:[close]}]);flush();
        assert.equal(panel['--panel-available-height'],'474px');
        // Moving a wrapper can reveal overflow from a previously ordinary child.
        const wrapper=new Element('wrapper',650,50), floating=new Element('floating',610);
        wrapper.children=[floating];table.children.push(wrapper);
        mutation([{type:'childList',target:table,addedNodes:[wrapper],removedNodes:[]}]);flush();
        wrapper.top=610;floating.top=570;
        mutation([{type:'attributes',attributeName:'style',target:wrapper,addedNodes:[],removedNodes:[]}]);flush();
        assert.equal(panel['--panel-available-height'],'466px');
    } finally {stop?.();for(const n of names){if(previous[n]===undefined)delete globalThis[n];else globalThis[n]=previous[n];}}
});
