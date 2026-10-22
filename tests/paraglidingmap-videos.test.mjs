import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {approvedParaglidingMapSites,paraglidingMapSites} from '../src/paraglidingMapSites.ts';
import {paraglidingMapVideos} from '../src/paraglidingMapVideos.ts';
import {canonicalYouTubeUrl} from '../src/siteVideos.ts';

test('researched videos belong only to accepted additions, including unknown-direction sites, and keep canonical unique URLs',()=>{
    const ids=new Set(approvedParaglidingMapSites.map(site=>site.id));
    assert.equal(Object.keys(paraglidingMapVideos).length,30);
    assert.equal(Object.values(paraglidingMapVideos).flat().length,51);
    assert.equal(new Set(Object.values(paraglidingMapVideos).flat().map(video=>video.url)).size,50);
    assert.equal(paraglidingMapSites.filter(site=>!site.sourceDirections&&paraglidingMapVideos[site.id]?.length).length,5);
    for(const [id,videos]of Object.entries(paraglidingMapVideos)){
        assert.ok(ids.has(id),id);assert.ok(videos.length<=2&&videos.length>0);
        assert.equal(new Set(videos.map(video=>video.url)).size,videos.length);
        for(const video of videos){
            assert.equal(canonicalYouTubeUrl(video.url),video.url);assert.ok(video.title&&video.channel&&video.matchNote);
            assert.ok(['site','area'].includes(video.confidence));assert.equal(video.reviewStatus,undefined,'Research must not pre-approve candidates');
        }
    }
});

test('historical research report accounts for every new location and verifies availability of all researched videos',()=>{
    const report=JSON.parse(readFileSync(new URL('../reports/paraglidingmap-youtube-review-2026-10-22.json',import.meta.url),'utf8'));
    assert.equal(report.sites.length,77);assert.equal(new Set(report.sites.map(site=>site.siteId)).size,77);
    for(const site of approvedParaglidingMapSites){
        const checked=report.sites.find(row=>row.siteId===site.id);assert.ok(checked,site.name);
        assert.ok(checked.queries.length>0);assert.equal(checked.name,site.name);
        const researched=paraglidingMapVideos[site.id]??[];
        assert.equal(checked.videos.length,researched.length);
        for(const video of checked.videos){
            assert.equal(video.availability.available,true);assert.equal(video.availability.status,200);
            assert.ok(video.sourceEvidence);
            const published=researched.find(row=>row.url===video.url);assert.ok(published);
            assert.equal(published.title,video.availability.title);
        }
    }
});
