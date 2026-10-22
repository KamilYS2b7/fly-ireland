import test from 'node:test';
import assert from 'node:assert/strict';
import {watchTimelinePreview} from '../src/timelinePreview.ts';

const start=Date.UTC(2026,9,21,6), hour=3600000;
const series={header:{utcOffset:1},data:{ts:[start,start+3*hour,start+6*hour],hour:[7,10,13]}};

async function fixture(run,{cached=series,load=async()=>series}={}) {
    const names=['Element','document','window','MutationObserver','getComputedStyle','requestAnimationFrame','cancelAnimationFrame','setTimeout','clearTimeout'];
    const previous=Object.fromEntries(names.map(name=>[name,globalThis[name]]));
    const events=()=>{
        const listeners=new Map();
        return {listeners,addEventListener:(key,fn)=>{if(!listeners.has(key))listeners.set(key,new Set());listeners.get(key).add(fn);},
            removeEventListener:(key,fn)=>listeners.get(key)?.delete(fn),
            emit:(key,event)=>{for(const fn of [...listeners.get(key)??[]])fn(event);}};
    };
    const document=events(),window=events(),source=events();
    const store={get:key=>key==='timestamp'?start:key==='product'?'ukv':key==='detailLocation'?{lat:55,lon:-7}:undefined,
        on:source.addEventListener,off:source.removeEventListener};
    const frames=new Map(),timers=new Map(),values=[];let next=0,mutation,disconnected=0,loads=0;
    class Element {
        style={left:'10px'};className='timecode main-timecode';isConnected=true;
        closest(selector){return selector==='#plugin-detail'?root:this;}
    }
    const handle=new Element();
    const played={style:{width:'10px'},isConnected:true};
    const root={querySelectorAll:()=>[7,10,13].map(hour=>({textContent:String(hour)})),
        querySelector:selector=>selector.includes('sticky-label')?{firstChild:{textContent:'Wednesday 21 '}}:selector==='.progress-line .played'?played:{}};
    Object.assign(globalThis,{Element,document,window,getComputedStyle:()=>({getPropertyValue:()=> '30px'}),
        MutationObserver:class{constructor(callback){mutation=callback;}observe(){}disconnect(){disconnected++;}},
        requestAnimationFrame:fn=>{frames.set(++next,fn);return next;},cancelAnimationFrame:id=>frames.delete(id),
        setTimeout:fn=>{timers.set(++next,fn);return next;},clearTimeout:id=>timers.delete(id)});
    const stop=watchTimelinePreview({store,getSeries:()=>cached,loadSeries:(step,abort)=>{loads++;return load(step,abort);},onPreview:value=>values.push(value)});
    const flush=async()=>{await Promise.resolve();await Promise.resolve();const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn());};
    try {await run({handle,played,document,source,values,stop,flush,frames,timers,get disconnected(){return disconnected;},get loads(){return loads;},
        down:()=>document.emit('pointerdown',{button:0,target:handle}),move:left=>{handle.style.left=`${left}px`;played.style.width=`${left}px`;mutation?.();},
        moveProgress:left=>{played.style.width=`${left}px`;mutation?.();}});}
    finally {stop();for(const name of names){if(previous[name]===undefined)delete globalThis[name];else globalThis[name]=previous[name];}}
}

test('native slider styles update one preview per frame and stop at the committed timestamp',async()=>{
    await fixture(async app=>{
        app.down();app.move(12);app.move(15);await app.flush();
        assert.deepEqual(app.values.filter(Number.isFinite),[start+hour/2]);
        assert.equal(app.loads,0);
        app.document.emit('pointerup');
        app.source.emit('timestamp');await app.flush();
        const count=app.values.length;
        app.move(20);await app.flush();
        assert.equal(app.values.length,count,'A committed drag must no longer preview changes');
        assert.equal(app.values.at(-1),undefined);
        assert.equal(app.timers.size,0);
    });
});

test('a pinned yellow handle previews the selected time even when its own position stays fixed',async()=>{
    await fixture(async app=>{
        app.handle.className+=' timecode--stickied--left';
        app.handle.style.left='30px';
        app.down();app.moveProgress(12);app.moveProgress(15);await app.flush();
        assert.deepEqual(app.values.filter(Number.isFinite),[start+hour/2]);
        assert.equal(app.handle.style.left,'30px','The visible handle stays pinned while the selected time moves');
        assert.equal(app.loads,0);
        app.document.emit('pointerup');app.source.emit('timestamp');
        assert.equal(app.values.at(-1),undefined);
    });
});

test('late metadata cannot revive a released drag after Windy commits or a model changes',async()=>{
    for(const event of ['timestamp','product']){
        let resolve;
        await fixture(async app=>{
            app.down();app.move(15);app.document.emit('pointerup');app.source.emit(event);
            resolve(series);await app.flush();
            assert.deepEqual(app.values.filter(Number.isFinite),[]);
            assert.equal(app.frames.size,0);
        },{cached:null,load:()=>new Promise(done=>resolve=done)});
    }
});

test('closing removes pointer listeners, cancels scheduled paints and aborts metadata loading',async()=>{
    let request;
    await fixture(async app=>{
        app.down();app.move(15);app.stop();
        assert.equal(request.signal.aborted,true);
        await app.flush();
        assert.equal(app.frames.size,0);assert.equal(app.timers.size,0);
        assert.ok([...app.document.listeners.values()].every(listeners=>listeners.size===0));
        app.source.emit('product');
        assert.deepEqual(app.values.filter(Number.isFinite),[]);
    },{cached:null,load:(_step,abort)=>{request=abort;return new Promise(()=>{});}});
});

test('an hourly metadata grid is reused across drags without repeated requests',async()=>{
    await fixture(async app=>{
        for(let i=0;i<2;i++){
            app.down();app.move(15);await app.flush();
            assert.equal(app.values.at(-1),start+hour/2);
            app.document.emit('pointerup');app.source.emit('timestamp');
        }
        assert.equal(app.loads,1);
    },{cached:null});
});
