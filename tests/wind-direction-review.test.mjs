import assert from 'node:assert/strict';
import test from 'node:test';
import {parseDirectionRanges,createWindDirectionReview,createDirectionReviewFile,DIRECTION_REVIEW_STORAGE_KEY} from '../src/windDirectionReview.ts';
import {polandSites} from '../src/polandSites.ts';
const storage=()=>{const items=new Map();return {getItem:k=>items.get(k)??null,setItem:(k,v)=>items.set(k,v)};};
test('catalogue import preserves review history and pending drafts when confirmed sites become production sectors',()=>{
 const pending=['Alpha','Bravo'].map((name,index)=>({id:name,name,country:'poland',directionUnverified:true,lat:50+index,lon:20}));
 const store=storage(),before=createWindDirectionReview(pending,store);
 let state=before.confirm(before.draft({},'Alpha','80-130'),'Alpha');state=before.draft(state,'Bravo','285-15');before.save(state);
 const file=JSON.stringify(before.report(state));
 const after=createWindDirectionReview([{...pending[0],directionUnverified:false},pending[1]],store);
 const restored=after.read();assert.ok(!restored.error);assert.deepEqual(restored.state,state);
 assert.equal(after.eligible.length,1);assert.equal(after.next(restored.state,undefined).id,'Bravo');
 assert.deepEqual(after.merge({},file),state);assert.equal(after.report(restored.state).sites.length,2);
 assert.equal(after.report(restored.state).sites[0].confirmedAt,state.Alpha.confirmedAt);
});
test('next review follows alphabetical order, skips confirmed sites and wraps only at the end',()=>{
 const sites=['Zulu','Alpha','Charlie','Bravo'].map((name,index)=>({id:name,name,country:'poland',directionUnverified:true,lat:50+index,lon:20}));
 const review=createWindDirectionReview(sites,storage());
 assert.equal(review.next({},'Alpha').id,'Bravo');assert.equal(review.next({},'Bravo').id,'Charlie');
 assert.equal(review.next({},'Charlie').id,'Zulu');assert.equal(review.next({},'Zulu').id,'Alpha');
 assert.equal(review.next({},undefined).id,'Alpha');
 const state=review.confirm(review.draft({},'Bravo','80-130'),'Bravo');
 assert.equal(review.next(state,'Alpha').id,'Charlie');
 const skipped=review.draft(state,'Charlie','285-15');
 assert.equal(review.next(skipped,'Bravo').id,'Charlie');assert.equal(skipped.Charlie.draft,'285-15');
 for(const id of ['Alpha','Charlie','Zulu'])Object.assign(state,review.confirm(review.draft(state,id,'80-130'),id));
 assert.equal(review.next(state,'Zulu'),undefined);
 const one=createWindDirectionReview([sites[0]],storage());assert.equal(one.next({},'Zulu'),undefined);
});
test('direction entry validates multiple ranges, north crossings and explicit all directions',()=>{
 assert.deepEqual(parseDirectionRanges('80–130 / 280-360'),[{start:80,end:130},{start:280,end:360}]);
 assert.deepEqual(parseDirectionRanges('285 - 15'),[{start:285,end:15}]);
 assert.deepEqual(parseDirectionRanges('0-360'),[{start:0,end:360}]);
 for(const text of ['', '90','20-20','-5-20','0-361','NaN-20','0-90 /','10-40 rubbish','0-90 / 80-100 / 20-30 / 40-50 / 60-70'])assert.throws(()=>parseDirectionRanges(text),text);
});
test('drafts and confirmed ranges survive reopening without changing catalogue sectors or videos',()=>{
 const store=storage(),review=createWindDirectionReview(polandSites,store);
 assert.equal(review.eligible.length,34);
 const id='pl-map-just-roznowskie',source=polandSites.find(s=>s.id===id);
 let state=review.read().state;state=review.draft(state,id,'285-15');assert.equal(review.save(state),true);
 assert.equal(createWindDirectionReview(polandSites,store).read().state[id].draft,'285-15');
 assert.ok(!state[id].confirmedAt);state=review.confirm(state,id);review.save(state);
 assert.deepEqual(review.read().state[id].windRanges,[{start:285,end:15}]);
 assert.ok(review.read().state[id].confirmedAt);assert.deepEqual(source.windRanges,[{start:120,end:160}]);assert.equal(source.directionUnverified,false);
 const document=review.report(state);assert.equal(document.kind,'fly-ireland-wind-direction-review');assert.equal(document.sites[0].id,id);
 assert.equal(document.sites[0].lat,49.722607);assert.ok(document.sites[0].confirmedAt);
 const stale=review.draft(state,id,'bad');assert.equal(stale[id].confirmedAt,state[id].confirmedAt);assert.throws(()=>review.confirm(stale,id));
 const broken={getItem:()=>'{bad',setItem:()=>{throw Error('Blocked');}};
 assert.ok(createWindDirectionReview(polandSites,broken).read().error);assert.equal(createWindDirectionReview(polandSites,broken).save(state),false);
 assert.ok(store.getItem(DIRECTION_REVIEW_STORAGE_KEY));
});
test('reports validate identity and GPS before merging and never discard other completed sites',()=>{
 const review=createWindDirectionReview(polandSites,storage());
 const id=review.eligible[0].id,other=review.eligible[1].id;
 const state=review.confirm(review.draft({},id,'80-130'),id);
 const imported=review.confirm(review.draft({},other,'280-360'),other);
 const merged=review.merge(state,JSON.stringify(review.report(imported)));
 assert.ok(merged[id].confirmedAt&&merged[other].confirmedAt);
 for(const mutate of [r=>r.kind='other',r=>r.sites[0].id='missing',r=>r.sites[0].lat+=1,r=>r.sites[0].windRanges=[{start:50,end:50}],r=>r.sites.push(r.sites[0])]){
  const document=review.report(state);mutate(document);assert.throws(()=>review.merge({},JSON.stringify(document)));
 }
 const now=review.draft(state,id,'90-150');now[id].updatedAt='2099-01-01T00:00:00.000Z';
 assert.equal(review.merge(now,JSON.stringify(review.report(state)))[id].draft,'90-150');
});
test('connected review files write each checkpoint in order, merge existing data and report failures without truncating invalid files',async()=>{
 const review=createWindDirectionReview(polandSites,storage());let state={};const writes=[];
 const session=createDirectionReviewFile({getReport:()=>review.report(state),onImport:text=>{state=review.merge(state,text);}});
 const id=review.eligible[0].id,other=review.eligible[1].id;
 const old=review.confirm(review.draft({},other,'50-120'),other);
 let content=JSON.stringify(review.report(old));let active=0,max=0;
 const handle={name:'review.json',getFile:async()=>({text:async()=>content}),createWritable:async()=>{
  active++;max=Math.max(max,active);return {write:async text=>{await new Promise(r=>setTimeout(r,4));content=text;writes.push(JSON.parse(text));},close:async()=>{active--;}};
 }};
 await session.connect(handle);assert.ok(state[other].confirmedAt);
 state=review.confirm(review.draft(state,id,'285-15'),id);const first=session.save();
 state=review.confirm(review.draft(state,id,'280-20'),id);await Promise.all([first,session.save()]);
 assert.equal(max,1);assert.equal(writes.length,3);assert.ok(writes.at(-1).sites.find(s=>s.id===other));
 assert.deepEqual(writes.at(-1).sites.find(s=>s.id===id).windRanges,[{start:280,end:20}]);
 const invalid={...handle,getFile:async()=>({text:async()=>'{not a report'})};
 await assert.rejects(session.connect(invalid));assert.equal(writes.length,3);
 const failed=createDirectionReviewFile({getReport:()=>review.report(state),onImport:()=>{}});
 await assert.rejects(failed.connect({...handle,createWritable:async()=>{throw Error('Disk full');}}),/Disk full/);
});
test('reconnecting merges the latest draft and latest confirmation independently without losing accepted sectors',async()=>{
 const review=createWindDirectionReview(polandSites,storage()),id=review.eligible[0].id;
 const disk=review.confirm(review.draft({},id,'80-130'),id);disk[id].confirmedAt='2026-10-25T10:00:00.000Z';disk[id].updatedAt=disk[id].confirmedAt;
 const local=review.draft({},id,'90-150');local[id].updatedAt='2026-10-26T10:00:00.000Z';
 let state=local,written;
 const session=createDirectionReviewFile({getReport:()=>review.report(state),onImport:text=>{state=review.merge(state,text);}});
 await session.connect({getFile:async()=>({text:async()=>JSON.stringify(review.report(disk))}),createWritable:async()=>({write:async text=>{written=JSON.parse(text);},close:async()=>{}})});
 assert.equal(state[id].draft,'90-150');assert.deepEqual(state[id].windRanges,[{start:80,end:130}]);
 assert.equal(written.sites[0].confirmedAt,'2026-10-25T10:00:00.000Z');
 const latestDisk=review.confirm(review.draft({},id,'285-15'),id);latestDisk[id].confirmedAt='2026-10-27T10:00:00.000Z';latestDisk[id].updatedAt=latestDisk[id].confirmedAt;
 state[id].updatedAt='2026-10-28T10:00:00.000Z';
 const merged=review.merge(state,JSON.stringify(review.report(latestDisk)));
 assert.equal(merged[id].draft,'90-150');assert.deepEqual(merged[id].windRanges,[{start:285,end:15}]);
});
