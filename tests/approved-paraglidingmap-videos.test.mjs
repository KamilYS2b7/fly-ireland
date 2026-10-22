import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {approvedParaglidingMapSites} from '../src/paraglidingMapSites.ts';
import {createVideoReview,applyVideoDecisions,videoReviewKey,mapVideoButtonHTML} from '../src/siteVideos.ts';
import {sitesForView} from '../src/siteFilters.ts';
const report=JSON.parse(readFileSync(new URL('../reports/paraglidingmap-owner-video-review-2026-10-22.json',import.meta.url),'utf8'));

test('shipped videos exactly match the owner report: 31 approved associations at 22 sites, with all 20 rejected associations absent',()=>{
    const expected=report.sites.flatMap(site=>site.videos.map(video=>({siteId:site.id,...video})));
    const videos=approvedParaglidingMapSites.flatMap(site=>site.videoCandidates.map(video=>({siteId:site.id,...video})));
    assert.equal(videos.length,31);assert.equal(new Set(videos.map(video=>video.url)).size,30);
    assert.equal(new Set(videos.map(video=>video.siteId)).size,22);
    for(const row of expected){
        const site=approvedParaglidingMapSites.find(site=>site.id===row.siteId);
        const published=site.videoCandidates.find(video=>video.url===row.url);
        if(row.decision==='accepted'){
            assert.ok(published,site.name);assert.equal(published.reviewStatus,'accepted');assert.equal(published.reviewFinalized,true);
            assert.equal(published.title,row.title);assert.ok(site.youtube.includes(row.url));
        }else{assert.equal(published,undefined,site.name);assert.ok(!site.youtube.includes(row.url));}
    }
});

test('approved imported videos work without browser storage and ignore stale contrary choices while preserving owner wind ranges',()=>{
    const stale=Object.fromEntries(report.sites.flatMap(site=>site.videos.map(video=>[videoReviewKey(site.id,video.url),video.decision==='accepted'?'rejected':'accepted'])));
    const workflow=createVideoReview(approvedParaglidingMapSites);
    for(const decisions of [{},stale]){
        const applied=applyVideoDecisions(approvedParaglidingMapSites,decisions);
        assert.equal(applied.flatMap(site=>site.youtube).length,31);
        assert.deepEqual(workflow.count(decisions),{pending:0,accepted:0,rejected:0,total:0});
        assert.equal(sitesForView({allSites:applied},'video-review').length,0);
        const glengesh=applied.find(site=>site.id==='pgmap-127852');
        assert.equal(glengesh.toVerify,false);assert.deepEqual(glengesh.windRanges,[{start:285,end:15}]);
        assert.equal(glengesh.youtube.length,1);assert.match(mapVideoButtonHTML(glengesh),/Accepted video/);
        assert.ok(!applied.some(site=>['pgmap-127835','pgmap-127745'].includes(site.id)));
        assert.equal(mapVideoButtonHTML(applied.find(site=>site.id==='pgmap-127756')),'');
    }
});
