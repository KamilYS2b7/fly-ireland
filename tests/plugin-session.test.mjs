import test from 'node:test';import assert from 'node:assert/strict';
import {createPluginSession,createTaskScope} from '../src/pluginSession.ts';
test('native close disposes one complete session; repeated open/close and destroy are safe',()=>{
 let live=0,mounts=0,cleanups=0;
 const session=createPluginSession(()=>{live++;mounts++;return()=>{live--;cleanups++;};});
 session.open();session.open();assert.equal(live,1);session.close();session.close();assert.equal(live,0);
 session.open();assert.equal(live,1);session.destroy();session.open();assert.equal(live,0);assert.equal(mounts,2);assert.equal(cleanups,2);
});

test('closing or destroying during mount prevents a resurrected session',()=>{
 let live=0;let session;
 session=createPluginSession(()=>{live++;session.close();return()=>live--;});
 session.open();assert.equal(live,0);
 session=createPluginSession(()=>{live++;session.destroy();return()=>live--;});
 session.open();assert.equal(live,0);
});

test('destroy cancels deferred work and removes listener callbacks without touching foreign work',()=>{
 let next=0,count=0;const timers=new Map(),frames=new Map();
 const scope=createTaskScope({setTimeout:fn=>{const id=++next;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>{const id=++next;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id)});
 const target=new EventTarget();let native=0;target.addEventListener('test',()=>native++);
 scope.listen(target,'test',()=>count++);scope.setTimeout(()=>count++);scope.requestAnimationFrame(()=>count++);
 target.dispatchEvent(new Event('test'));assert.equal(count,1);
 scope.destroy();target.dispatchEvent(new Event('test'));
 assert.equal(count,1);assert.equal(native,2);assert.equal(timers.size,0);assert.equal(frames.size,0);
 scope.setTimeout(()=>count++);assert.equal(timers.size,0);
});
