import test from 'node:test';
import assert from 'node:assert/strict';
import {createDetailModelSync} from '../src/detailModelSync.ts';

function fixture(t,{open=true,menuOpen=false,mobile=false,delayedChoices=false,ignoreSelection=false,keepSelection,available=['ukv','gfs','ecmwf','mblue','aromeFrance'],disabled=[]}={}){
    const globals=['document','MutationObserver'];
    const previous=Object.fromEntries(globals.map(key=>[key,globalThis[key]]));
    const names={ukv:'UKV',gfs:'GFS',ecmwf:'ECMWF',mblue:'meteoblue AI',aromeFrance:'AROME FR'};
    const listeners=new Map(),observers=new Set(),clickListeners=new Set(),documentClicks=new Set(),clicked=[],notes=[],nativeChoices=[];
    let nativeModel='ukv',product='ukv',openClicks=0,basicClicks=0;
    const store={get:()=>product,on:(key,fn)=>listeners.set('store:'+key,fn),off:(key,fn)=>{if(listeners.get('store:'+key)===fn)listeners.delete('store:'+key);},
        set(key,value){product=value;listeners.get('store:'+key)?.();}};
    const broadcast={on:(key,fn)=>listeners.set(key,fn),off:(key,fn)=>{if(listeners.get(key)===fn)listeners.delete(key);}};
    const mutate=()=>{for(const observer of observers)observer.callback();};
    const classes=(contains)=>({contains});
    const userClick=target=>{for(const fn of [...documentClicks,...clickListeners])fn({target});};
    const source={classList:classes(c=>c==='opened'&&menuOpen),get textContent(){return 'Source: '+names[nativeModel];},
        closest:()=>source,isConnected:true,click(){userClick(source);openClicks++;queueMicrotask(()=>{menuOpen=!menuOpen;mutate();});}};
    const buttons=available.map(id=>({id,childNodes:[{nodeType:3,textContent:names[id]+' '},{nodeType:1,textContent:'7km'}],
        classList:classes(c=>(c==='disabled'&&disabled.includes(id))||(c==='selected'&&nativeModel===id)),closest(){return this;},click(){
            userClick(this);clicked.push(id);if(!ignoreSelection)queueMicrotask(()=>{nativeModel=id;store.set('product',id);mutate();});
        }}));
    const basic={click(){basicClicks++;disabled.splice(0);queueMicrotask(mutate);}};
    const root={classList:classes(c=>c==='open'&&open),
        querySelector:selector=>selector==='.ddmenu'?(mobile?null:source):basic,
        querySelectorAll:()=>!delayedChoices&&(menuOpen||mobile)?buttons:[],contains:element=>element===source||buttons.includes(element),
        addEventListener:(_,fn)=>clickListeners.add(fn),removeEventListener:(_,fn)=>clickListeners.delete(fn)};
    source.closest=selector=>selector.includes(':not')?null:source;
    Object.assign(globalThis,{document:{getElementById:()=>root,addEventListener:(_,fn)=>documentClicks.add(fn),removeEventListener:(_,fn)=>documentClicks.delete(fn)},MutationObserver:class{
        constructor(callback){this.callback=callback;}observe(){observers.add(this);}disconnect(){observers.delete(this);}
    }});
    const sync=createDetailModelSync({store,broadcast,keepSelection,modelName:id=>names[id],modelFromName:name=>Object.keys(names).find(id=>names[id].toLowerCase()===name.toLowerCase()),onNativeModel:model=>nativeChoices.push(model),onUnavailable:model=>notes.push(model)});
    t.after(()=>{sync.destroy();for(const key of globals){if(previous[key]===undefined)delete globalThis[key];else globalThis[key]=previous[key];}});
    return {sync,store,clicked,notes,source,nativeChoices,
        get nativeModel(){return nativeModel;},get menuOpen(){return menuOpen;},get observers(){return observers.size;},get openClicks(){return openClicks;},get basicClicks(){return basicClicks;},get listeners(){return listeners.size;},
        async flush(){for(let i=0;i<12;i++)await Promise.resolve();},
        open(){listeners.get('rqstOpen')?.('detail');open=true;listeners.get('pluginOpened')?.('detail');mutate();},
        close(){open=false;listeners.get('pluginClosed')?.('detail');},
        manual(model){buttons.find(button=>button.id===model).click();},
        mutate,
    };
}

test('sidebar model selection operates the native Source control and restores its collapsed menu',async t=>{
    const app=fixture(t);app.sync.select('gfs');app.store.set('product','gfs');await app.flush();
    assert.equal(app.nativeModel,'gfs');assert.equal(app.store.get('product'),'gfs');
    assert.deepEqual(app.clicked,['gfs']);assert.equal(app.menuOpen,false);assert.equal(app.observers,0);
    const clicks=app.openClicks;
    for(let i=0;i<50;i++)app.mutate();await app.flush();
    assert.equal(app.openClicks,clicks,'Completed synchronization must not observe timeline motion');
    app.sync.select('gfs');await app.flush();assert.deepEqual(app.clicked,['gfs']);
});

test('a model chosen while the forecast is closed applies on reopening, and newer map choices supersede pending choices',async t=>{
    const app=fixture(t,{open:false});app.sync.select('gfs');app.store.set('product','gfs');await app.flush();
    assert.equal(app.openClicks,0);assert.equal(app.observers,0);
    app.store.set('product','ecmwf');app.open();await app.flush();
    assert.equal(app.nativeModel,'ecmwf');assert.equal(app.menuOpen,false);assert.equal(app.observers,0);
    app.close();app.sync.select('mblue');app.store.set('product','mblue');await app.flush();app.open();await app.flush();
    assert.equal(app.nativeModel,'mblue');
});

test('only the latest sidebar choice is applied, including exact regional model names, without closing an already open Source menu',async t=>{
    const app=fixture(t,{menuOpen:true});
    app.sync.select('gfs');app.sync.select('aromeFrance');app.store.set('product','aromeFrance');await app.flush();
    assert.deepEqual(app.clicked,['aromeFrance']);assert.equal(app.nativeModel,'aromeFrance');assert.equal(app.menuOpen,true);
});

test('unsupported display combinations switch to Basic while unavailable models are reported without a silent fallback',async t=>{
    const app=fixture(t,{available:['ukv','gfs'],disabled:['gfs']});
    app.sync.select('gfs');app.store.set('product','gfs');await app.flush();
    assert.equal(app.basicClicks,1);assert.equal(app.nativeModel,'gfs');assert.equal(app.observers,0);
    app.sync.select('ecmwf');app.store.set('product','ecmwf');await app.flush();
    assert.equal(app.nativeModel,'gfs');assert.equal(app.store.get('product'),'ecmwf');
    assert.equal(app.notes.at(-1),'ecmwf');assert.equal(app.menuOpen,false);assert.equal(app.observers,0);
});

test('native interactions and plugin teardown cancel pending synchronization without fighting subsequent model choices',async t=>{
    const app=fixture(t,{menuOpen:true});app.sync.select('gfs');
    app.manual('ecmwf');await app.flush();assert.equal(app.nativeModel,'ecmwf');assert.deepEqual(app.clicked,['ecmwf']);
    app.sync.select('mblue');app.sync.destroy();await app.flush();
    assert.equal(app.nativeModel,'ecmwf');assert.equal(app.observers,0);assert.equal(app.listeners,0);
});

test('native Source clicks are reported even after synchronization ends, including point-only and unchanged map models',async t=>{
    const app=fixture(t,{menuOpen:true});app.sync.select('gfs');await app.flush();
    app.manual('mblue');await app.flush();app.manual('ecmwf');await app.flush();
    assert.deepEqual(app.nativeChoices,['mblue','ecmwf']);assert.equal(app.sync.getNativeModel(),'ecmwf');
    assert.equal(app.observers,0);app.close();assert.equal(app.sync.getNativeModel(),undefined);
});

test('mobile changes the native model switch directly without requiring a desktop Source dropdown',async t=>{
    const app=fixture(t,{mobile:true});app.sync.select('mblue');await app.flush();
    assert.equal(app.nativeModel,'mblue');assert.equal(app.sync.getNativeModel(),'mblue');
    assert.equal(app.openClicks,0);assert.equal(app.observers,0);
    app.manual('ecmwf');await app.flush();assert.equal(app.sync.getNativeModel(),'ecmwf');
    assert.deepEqual(app.nativeChoices,['ecmwf']);
});

test('a user closing Source while its model choices are mounting does not have the menu toggled open again',async t=>{
    const app=fixture(t,{delayedChoices:true});app.sync.select('gfs');await app.flush();
    assert.equal(app.menuOpen,true);assert.equal(app.observers,1);
    app.source.click();await app.flush();
    assert.equal(app.menuOpen,false);assert.equal(app.observers,0);
});

test('an unresponsive native model control cannot create an endless microtask retry loop',async t=>{
    const app=fixture(t,{ignoreSelection:true});app.sync.select('gfs');await app.flush();
    assert.deepEqual(app.clicked,['gfs']);assert.equal(app.nativeModel,'ukv');
    assert.equal(app.notes.at(-1),'gfs');assert.equal(app.observers,0);
});

test('automatic map coverage fallback does not replace the model queued for the closed forecast',async t=>{
    const app=fixture(t,{open:false,keepSelection:(selected,map)=>selected==='ukv'&&map==='gfs'});
    app.sync.select('ukv');app.store.set('product','gfs');await app.flush();app.open();await app.flush();
    assert.equal(app.nativeModel,'ukv');assert.equal(app.openClicks,0);
});

test('a late update from the previously closed Source cannot overwrite the next sidebar model',async t=>{
    const app=fixture(t);app.sync.select('gfs');await app.flush();app.close();
    app.sync.select('ukv');app.store.set('product','ukv');await app.flush();
    app.store.set('product','gfs');await app.flush();
    assert.equal(app.sync.getRequestedModel(),'ukv');
    app.open();await app.flush();assert.equal(app.nativeModel,'ukv');assert.equal(app.sync.getRequestedModel(),undefined);
});
