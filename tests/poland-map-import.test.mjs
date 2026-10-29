import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {polandSites,polandGuideSites} from '../src/polandSites.ts';
import {polandMapSites} from '../src/polandMapSites.ts';
import {ownerPolandWindRanges} from '../src/polandWindApproval.ts';
import {guideKeyForSite} from '../src/siteGuides.ts';
import {evaluateWind} from '../src/windForecast.ts';
import {canonicalYouTubeUrl,createVideoReview,applyVideoDecisions,videoPlaybackUrl} from '../src/siteVideos.ts';

const report=JSON.parse(readFileSync(new URL('../reports/poland-google-map-comparison-2026-10-26.json',import.meta.url),'utf8'));
test('every one of the 96 source pins has a reviewed outcome instead of a nearest-GPS import',()=>{
 assert.equal(report.entries.length,96);assert.equal(new Set(report.entries.map(r=>r.index)).size,96);
 assert.equal(polandGuideSites.length,30);assert.equal(polandMapSites.length,66);assert.equal(polandSites.length,96);
 assert.equal(new Set(polandSites.map(s=>s.id)).size,96);
 for(const row of report.entries){assert.ok(row.reason);if(row.action!=='exclude')assert.ok(polandSites.some(s=>s.id===row.targetId),row.name);}
 assert.deepEqual(report.entries.filter(r=>r.action==='exclude').map(r=>r.index).sort((a,b)=>a-b),[2,7,36]);
 assert.equal(report.entries.find(r=>r.index===0).targetId,'pl-skrzetla');
 assert.equal(report.entries.find(r=>r.index===85).targetId,'pl-klin');
 assert.equal(report.entries.find(r=>r.index===86).targetId,'pl-klin');
});
test('adjacent launch variants stay separate and misleading repeated labels are reconciled with video context',()=>{
 for(const pair of [[8,47],[73,74],[9,93],[78,79]]){
  assert.notEqual(report.entries.find(r=>r.index===pair[0]).targetId,report.entries.find(r=>r.index===pair[1]).targetId);
 }
 assert.equal(report.entries.find(r=>r.index===61).targetId,report.entries.find(r=>r.index===95).targetId);
 assert.notEqual(report.entries.find(r=>r.index===94).targetId,report.entries.find(r=>r.index===95).targetId);
 assert.notEqual(report.entries.find(r=>r.index===82).targetId,'pl-chelmiec');
});
test('unknown map sectors never produce matches and unprovided descriptions do not create broken guides',()=>{
 for(const site of polandMapSites){
  assert.equal(site.country,'poland');assert.equal(site.locationNeedsVerification,site.id!=='pl-map-just-roznowskie');
  assert.equal(guideKeyForSite(site),undefined,site.name);
  const approved=ownerPolandWindRanges[site.id];
  assert.deepEqual(site.windRanges,approved??[]);assert.equal(site.directionUnverified,!approved);
  if(!approved)assert.notEqual(evaluateWind(site,[0,-4]).status,'pass');
 }
 assert.equal(polandMapSites.filter(s=>s.siteType==='coastal').length,16);
 const just=polandMapSites.find(s=>s.id==='pl-map-just-roznowskie');
 assert.ok(!just.toVerify);assert.equal(just.locationNeedsVerification,false);
 assert.equal(just.lat,49.722607);assert.equal(just.lon,20.645784);
 assert.match(just.reviewNote,/confirmed by the owner/i);
 assert.ok(just.videoCandidates.some(v=>v.url.endsWith('mcBsqPUUaWU')));
});
test('owner-approved map videos merge once per site and stay accepted after reopening with stale decisions',()=>{
 const all=polandSites.flatMap(s=>(s.videoCandidates??[]).map(v=>({site:s,video:v})));
 assert.ok(all.length>100);
 for(const site of polandSites){
  const urls=(site.videoCandidates??[]).map(v=>canonicalYouTubeUrl(v.url));
  assert.ok(urls.every(Boolean));assert.equal(new Set(urls).size,urls.length,site.name);
  assert.ok((site.videoCandidates??[]).every(v=>v.title&&v.channel&&v.reviewFinalized&&v.reviewStatus==='accepted'));
 }
 const south=polandSites.find(s=>s.id===report.entries.find(r=>r.index===12).targetId);
 const north=polandSites.find(s=>s.id===report.entries.find(r=>r.index===13).targetId);
 const film=s=>s.videoCandidates.find(v=>v.url.endsWith('h8GvgR6POXE'));
 assert.equal(film(south).startSeconds,70);assert.equal(film(north).startSeconds,280);
 assert.ok(videoPlaybackUrl(film(south)).endsWith('&t=70s'));
 const workflow=createVideoReview(polandSites),decisions={[south.id+':h8GvgR6POXE']:'rejected'};
 const applied=applyVideoDecisions([south,north],decisions);
 assert.ok(applied[0].youtube.some(u=>canonicalYouTubeUrl(u)===film(south).url));
 assert.ok(applied[1].youtube.some(u=>canonicalYouTubeUrl(u)===film(north).url));
 const saved=new Map(),storage={getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v)};
 storage.setItem('fly-ireland.site-video-review.v1',JSON.stringify({version:1,decisions}));
 assert.deepEqual(workflow.read(storage),{});
 assert.deepEqual(workflow.count(workflow.read(storage)),{pending:0,accepted:0,rejected:0,total:0});
 assert.deepEqual(workflow.set({},south.id,film(south).url,'rejected'),{});
 assert.ok(applyVideoDecisions(polandSites,workflow.read(storage)).flatMap(s=>s.videoCandidates??[]).every(v=>v.reviewStatus==='accepted'));
 assert.deepEqual(applyVideoDecisions(polandSites,{}).find(s=>s.id==='pl-map-just-roznowskie').windRanges,[{start:120,end:160}],'Video decisions must preserve the separately confirmed owner wind sector');
 for(const id of ['h7PGJqA5f4o','sz8IjV1IKIo','GhcGG-DcMyM','7XCAMKWW_cw'])assert.ok(!all.some(({video})=>video.url.endsWith(id)));
});
