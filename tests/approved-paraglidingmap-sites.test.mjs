import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import * as catalogue from '../src/paraglidingMapSites.ts';
import * as review from '../src/siteReview.ts';
import {buildSitePanel} from '../src/sitePanel.ts';
import {evaluateWind} from '../src/windForecast.ts';
import {rangesFromParaglidingMap} from '../src/windRanges.ts';
const owner=JSON.parse(readFileSync(new URL('../reports/paraglidingmap-owner-review-2026-10-22.json',import.meta.url),'utf8'));
const sourceAudit=JSON.parse(readFileSync(new URL('../reports/paraglidingmap-wind-directions-2026-10-22.json',import.meta.url),'utf8'));
const ownerRanges={
    'pgmap-146764':[{start:260,end:280}],'pgmap-127205':[{start:80,end:150}],'pgmap-133439':[{start:45,end:130}],
    'pgmap-127366':[{start:285,end:300}],'pgmap-127496':[{start:100,end:175}],
    'pgmap-127502':[{start:300,end:360}],'pgmap-127626':[{start:90,end:300}],'pgmap-127627':[{start:60,end:330}],
    'pgmap-127681':[{start:320,end:360}],'pgmap-146770':[{start:330,end:360}],
    'pgmap-127852':[{start:285,end:15}],'pgmap-127825':[{start:80,end:130},{start:280,end:360}],
    'pgmap-127809':[{start:30,end:360}],'pgmap-127890':[{start:280,end:15}],
};

test('permanent additions preserve accepted locations except for later owner removals',()=>{
    assert.ok(Array.isArray(catalogue.approvedParaglidingMapSites),'Approved locations must be part of the shipped catalogue');
    const expected=owner.sites.filter(site=>site.decision==='accepted'&&!['pgmap-127367','pgmap-127568','pgmap-162917','pgmap-127656','pgmap-127835','pgmap-127745'].includes(site.id));
    assert.equal(catalogue.approvedParaglidingMapSites.length,71);
    assert.deepEqual(catalogue.approvedParaglidingMapSites.map(site=>site.id).sort(),expected.map(site=>site.id).sort());
    for(const site of catalogue.approvedParaglidingMapSites){
        const accepted=expected.find(row=>row.id===site.id);
        assert.equal(site.name,accepted.name);assert.equal(site.lat,accepted.lat);assert.equal(site.lon,accepted.lon);
        assert.equal(site.reviewState,'accepted');assert.equal(site.reviewFinalized,true);
        assert.equal(site.sourceDirections,accepted.sourceDirections);
        const ranges=ownerRanges[site.id]??rangesFromParaglidingMap(accepted.sourceDirections);
        assert.equal(site.toVerify,ranges.length===0,'Published source directions or owner-confirmed ranges enable wind assessment');
        assert.deepEqual(site.windRanges,ranges);
    }
    const timestamp=Date.UTC(2026,9,22,12);
    let reads=0;
    const panel=buildSitePanel(catalogue.approvedParaglidingMapSites,site=>{
        reads++;
        const range=site.windRanges[0],sweep=((range.end-range.start)%360+360)%360||360;
        const degrees=(range.start+sweep/2)%360;
        return {...evaluateWind(site,[-Math.sin(degrees*Math.PI/180)*4,-Math.cos(degrees*Math.PI/180)*4]),timestamp};
    },timestamp);
    assert.equal(reads,71);assert.equal(panel.allSites.length,71);assert.equal(panel.sites.length,71);
    assert.equal(panel.allSites.filter(site=>site.label==='Location accepted'&&site.toVerify).length,0);
    assert.ok(panel.sites.every(site=>site.reviewFinalized&&site.status==='pass'&&site.required.includes('5–15 mph')));
});

test('completed review cannot resurrect rejected sites or let stale browser choices hide permanent approved locations',()=>{
    assert.ok(Array.isArray(catalogue.paraglidingMapReviewCandidates),'Completed decisions must be removed from the review queue');
    assert.equal(catalogue.paraglidingMapReviewCandidates.length,0);
    assert.deepEqual(review.applySiteReview({}),[]);
    assert.deepEqual(review.applySiteReview(Object.fromEntries(owner.sites.map(site=>[site.id,site.decision==='accepted'?'rejected':'accepted']))),[]);
    assert.deepEqual(review.siteReviewCounts({}),{pending:0,accepted:0,rejected:0,total:0});
    const ids=new Set(catalogue.approvedParaglidingMapSites.map(site=>site.id));
    for(const site of owner.sites.filter(site=>site.decision==='rejected'))assert.equal(ids.has(site.id),false,site.name);
    assert.equal(ids.has('pgmap-127367'),false,'Carrigeenina was removed by the owner');
    assert.deepEqual(review.applySiteReview({'pgmap-127367':'accepted'}),[]);
    assert.equal(ids.has('pgmap-127568'),false,'Slieve Mish Mts. was removed by the owner');
    assert.deepEqual(review.applySiteReview({'pgmap-127568':'accepted'}),[]);
    for(const id of ['pgmap-162917','pgmap-127656','pgmap-127835','pgmap-127745']){
        assert.equal(ids.has(id),false,'The owner removed this location');
        assert.deepEqual(review.applySiteReview({[id]:'accepted'}),[]);
    }
});

test('imported ranges agree with the historical source audit except for explicit owner-confirmed numeric limits',()=>{
    assert.equal(sourceAudit.sites.length,77);assert.equal(new Set(sourceAudit.sites.map(site=>site.id)).size,77);
    assert.equal(sourceAudit.sites.filter(site=>site.status==='active').length,57);
    assert.equal(sourceAudit.sites.filter(site=>site.sourceDirectionsUnknown).length,20);
    for(const site of catalogue.approvedParaglidingMapSites){
        const source=sourceAudit.sites.find(row=>row.id===site.id);
        assert.ok(source,site.name);
        assert.equal(source.sourceDirections,site.sourceDirections);
        assert.equal(site.toVerify,source.sourceDirectionsUnknown&&!ownerRanges[site.id]);
        assert.equal(source.lat,site.lat);assert.equal(source.lon,site.lon);assert.equal(source.sourceUrl,site.sourceUrl);
        assert.deepEqual(site.windRanges,ownerRanges[site.id]??source.windRanges);
    }
});

test('all owner-specified ranges include exact endpoints and retain existing launch coordinates',()=>{
    for(const expected of [
        {id:'pgmap-146764',name:'Shillelagh',lat:52.7823,lon:-6.55568,start:260,end:280},
        {id:'pgmap-127205',name:'Dunran Hill',lat:53.0556,lon:-6.11782,start:80,end:150},
        {id:'pgmap-133439',name:'Ballinglen',lat:52.8238,lon:-6.45197,start:45,end:130},
        {id:'pgmap-127366',name:'Galty Mountains',lat:52.3469,lon:-8.25679,start:285,end:300},
        {id:'pgmap-127496',name:'Mass Mt.',lat:51.6996,lon:-9.69374,start:100,end:175},
        {id:'pgmap-127502',name:'Healy Pass',lat:51.7247,lon:-9.75836,start:300,end:360},
        {id:'pgmap-127626',name:'Bolus Head',lat:51.8012,lon:-10.321,start:90,end:300},
        {id:'pgmap-127627',name:'Knocknadobar',lat:51.9927,lon:-10.1751,start:60,end:330},
        {id:'pgmap-127681',name:'Cruach Marthain',lat:52.1495,lon:-10.4311,start:320,end:360},
        {id:'pgmap-146770',name:'Farrandalouge',lat:52.2378,lon:-10.1276,start:330,end:360},
        {id:'pgmap-127852',name:'Glengesh Hill',lat:54.7461,lon:-8.46274,start:285,end:15},
        {id:'pgmap-127825',name:'Mulmosog Mountain',lat:54.732,lon:-8.39117,start:80,end:130,ranges:[{start:80,end:130},{start:280,end:360}]},
        {id:'pgmap-127809',name:'Scraigs',lat:54.8601,lon:-8.10277,start:30,end:360},
        {id:'pgmap-127890',name:'Bloody Foreland',lat:55.1374,lon:-8.26028,start:280,end:15},
    ]){
        const site=catalogue.approvedParaglidingMapSites.find(site=>site.id===expected.id);
        assert.equal(site.name,expected.name);assert.equal(site.lat,expected.lat);assert.equal(site.lon,expected.lon);
        assert.equal(site.toVerify,false);assert.equal(site.sectorStart,expected.start);assert.equal(site.sectorEnd,expected.end);
        const ranges=expected.ranges??[{start:expected.start,end:expected.end}];
        assert.deepEqual(site.windRanges,ranges);
        for(const range of ranges){
            const sweep=((range.end-range.start)%360+360)%360||360;
            for(const degrees of [range.start,(range.start+sweep/2)%360,range.end])assert.equal(evaluateWind(site,[-Math.sin(degrees*Math.PI/180)*4,-Math.cos(degrees*Math.PI/180)*4]).status,'pass',`${site.name}: ${degrees}`);
            for(const degrees of [range.start-0.1,range.end+0.1])assert.equal(evaluateWind(site,[-Math.sin(degrees*Math.PI/180)*4,-Math.cos(degrees*Math.PI/180)*4]).reason,'direction',`${site.name}: ${degrees}`);
            if(range.end===360||range.start>range.end)assert.equal(evaluateWind(site,[0,-4]).status,'pass',`${site.name}: north equals 360°`);
        }
    }
});
