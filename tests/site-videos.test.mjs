import assert from 'node:assert/strict';
import test from 'node:test';
import {canonicalYouTubeUrl,videoPlaybackUrl,videoReviewKey,createVideoReview,applyVideoDecisions,mapVideoButtonHTML,VIDEO_REVIEW_STORAGE_KEY} from '../src/siteVideos.ts';
const url='https://www.youtube.com/watch?v=whaqT_LWvdk';
const sites=[{id:'pgmap-a',name:'Test hill',toVerify:true,windRanges:[],youtube:[url],videoCandidates:[{url,title:'Flying <Test> "hill"',matchNote:'Hill known; launch side unconfirmed.'}]},
    {id:'pgmap-b',name:'Another hill',youtube:[url],videoCandidates:[{url,title:'Another flight'}]},
    {id:'original',name:'Original site',youtube:[url]}];
const storage=()=>{const items=new Map();return {items,getItem:key=>items.get(key)??null,setItem:(key,value)=>items.set(key,value)};};
test('map chapters open at the supplied time without splitting video review identity',()=>{
 const candidate={url,title:'Coastal flying',startSeconds:510};
 const site={id:'pl-map-coast',name:'Coast',videoCandidates:[candidate]};
 assert.equal(videoPlaybackUrl(candidate),url+'&t=510s');
 assert.equal(videoReviewKey(site.id,url+'&t=510s'),videoReviewKey(site.id,url));
 const workflow=createVideoReview([site]);const decisions=workflow.set({},site.id,url+'&t=510s','accepted');
 const applied=applyVideoDecisions([site],decisions)[0];
 assert.deepEqual(applied.youtube,[url+'&t=510s']);
 assert.equal(applied.videoCandidates[0].reviewStatus,'accepted');
 assert.ok(mapVideoButtonHTML(applied).includes(url+'&t=510s'));
 for(const startSeconds of [-1,Infinity,NaN,1.5,'510',90000])assert.equal(videoPlaybackUrl({...candidate,startSeconds}),url);
 assert.equal(videoPlaybackUrl({url:'javascript:alert(1)',startSeconds:510}),undefined);
});

test('YouTube links are canonical and unrelated or malformed URLs are excluded',()=>{
    assert.equal(canonicalYouTubeUrl('https://youtu.be/whaqT_LWvdk?t=30'),url);
    assert.equal(canonicalYouTubeUrl('https://www.youtube.com/embed/whaqT_LWvdk'),url);
    assert.equal(canonicalYouTubeUrl(url+'&feature=share'),url);
    for(const value of [null,'javascript:alert(1)','https://youtube.com.evil.org/watch?v=whaqT_LWvdk','https://example.com/whaqT_LWvdk','https://youtube.com/watch?v=bad'])assert.equal(canonicalYouTubeUrl(value),undefined);
});

test('video decisions are per site and video, survive reopening and do not alter wind validation',()=>{
    const workflow=createVideoReview(sites),store=storage();
    const accepted=workflow.set({},'pgmap-a',url,'accepted');
    assert.equal(workflow.save(accepted,store),true);
    assert.deepEqual(workflow.read(store),accepted);
    const applied=applyVideoDecisions(sites,workflow.read(store));
    assert.equal(applied[0].videoCandidates[0].reviewStatus,'accepted');
    assert.equal(applied[1].videoCandidates[0].reviewStatus,'pending');
    assert.equal(applied[0].toVerify,true);assert.deepEqual(applied[0].windRanges,[]);
    assert.deepEqual(applied[2],sites[2]);
    assert.deepEqual(workflow.count(accepted),{pending:1,accepted:1,rejected:0,total:2});
    const rejected=workflow.set(accepted,'pgmap-a',url,'rejected');
    assert.deepEqual(applyVideoDecisions(sites,rejected)[0].youtube,[]);
    assert.equal(mapVideoButtonHTML(applyVideoDecisions(sites,rejected)[0]),'');
    assert.equal(applyVideoDecisions(sites,rejected)[0].videoCandidates[0].reviewStatus,'rejected');
    const undone=workflow.set(rejected,'pgmap-a',url,undefined);
    assert.deepEqual(applyVideoDecisions(sites,undone)[0].youtube,[url]);
    const exported=workflow.export(accepted);
    assert.equal(exported.sites[0].videos[0].decision,'accepted');assert.equal(exported.sites[1].videos[0].decision,'pending');
});

test('bad storage and unknown candidate IDs cannot introduce links; blocked saves are reported',()=>{
    const w=createVideoReview(sites),s=storage(),fallback=w.set({},'pgmap-a',url,'accepted');
    assert.deepEqual(w.read(s,fallback),{},'A successfully read missing key means another tab cleared its decisions');
    s.setItem(VIDEO_REVIEW_STORAGE_KEY,'{bad');assert.deepEqual(w.read(s,fallback),fallback);
    s.setItem(VIDEO_REVIEW_STORAGE_KEY,JSON.stringify({version:1,decisions:{[videoReviewKey('pgmap-a',url)]:'accepted','unlisted:whatever':'accepted'}}));
    assert.deepEqual(w.read(s),fallback);
    assert.deepEqual(w.set({},'other',url,'accepted'),{});
    assert.equal(w.save(fallback,{setItem(){throw Error('Blocked');}}),false);
});

test('map button opens a real candidate in another tab and escapes text, including unknown-wind markers',()=>{
    const applied=applyVideoDecisions(sites,{});
    const html=mapVideoButtonHTML(applied[0]);
    assert.match(html,/class="site-video-button/);assert.match(html,/target="_blank"/);assert.match(html,/rel="noopener noreferrer"/);
    assert.ok(html.includes(url));assert.match(html,/Video to review/);assert.ok(html.includes('&lt;Test&gt; &quot;hill&quot;'));
    assert.equal(mapVideoButtonHTML(sites[2]),'','Existing videos keep their existing large-rose menu');
    const approved=applyVideoDecisions(sites,createVideoReview(sites).set({},'pgmap-a',url,'accepted'));
    assert.match(mapVideoButtonHTML(approved[0]),/Accepted video/);
    assert.doesNotMatch(mapVideoButtonHTML(approved[0]),/video-review-dot|✓/);
});

test('permanent owner-approved videos cannot be changed by stale browser choices and never return to review',()=>{
    const final=[{...sites[0],videoCandidates:[{...sites[0].videoCandidates[0],reviewStatus:'accepted',reviewFinalized:true}]}];
    const workflow=createVideoReview(final),store=storage();
    const stale={[videoReviewKey('pgmap-a',url)]:'rejected'};
    store.setItem(VIDEO_REVIEW_STORAGE_KEY,JSON.stringify({version:1,decisions:stale}));
    assert.deepEqual(workflow.read(store),{});
    assert.deepEqual(workflow.count(workflow.read(store)),{pending:0,accepted:0,rejected:0,total:0});
    assert.deepEqual(workflow.set({},'pgmap-a',url,'rejected'),{});
    const applied=applyVideoDecisions(final,stale);
    assert.equal(applied[0].videoCandidates[0].reviewStatus,'accepted');
    assert.deepEqual(applied[0].youtube,[url]);assert.equal(applied[0].toVerify,true);
    assert.equal(workflow.export(stale).sites[0].videos[0].decision,'accepted');
});
