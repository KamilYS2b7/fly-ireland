import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {buildSitePanel} from '../src/sitePanel.ts';
const catalogue=await import('../src/paraglidingMapSites.ts').catch(()=>({}));
const reviewModule=await import('../src/siteReview.ts').catch(()=>({}));
// Exercise the reusable review flow against its original candidate snapshot;
// the live queue is now empty because the owner finalized all 79 choices.
const review={...reviewModule,...reviewModule.createSiteReview(catalogue.paraglidingMapSites)};

test('preview contains exactly the 79 requested candidates, without duplicates or rejected/uncertain source entries',()=>{
    assert.ok(Array.isArray(catalogue.paraglidingMapSites),'Candidate catalogue must exist');
    const expected=JSON.parse(readFileSync(new URL('../reports/paraglidingmap-ireland-comparison.json',import.meta.url),'utf8')).rows
        .filter(row=>['missing_area_candidate','additional_launch_candidate'].includes(row.status));
    assert.equal(catalogue.paraglidingMapSites.length,79);
    assert.equal(new Set(catalogue.paraglidingMapSites.map(s=>s.id)).size,79);
    for(const site of catalogue.paraglidingMapSites){
        const row=expected.find(row=>site.id===`pgmap-${row.id}`);
        assert.ok(row,site.name);assert.equal(site.name,row.name);
        assert.equal(site.lat,row.lat);assert.equal(site.lon,row.lon);
        assert.equal(site.sourceUrl,row.url);assert.equal(site.sourceDirections,row.wind);
        assert.equal(site.toVerify,true);assert.equal(site.reviewState,'pending');
        assert.deepEqual(site.windRanges,[],'Location review must not invent precise wind limits');
    }
});

test('accept keeps the location, reject hides it, and clearing a decision restores the pending candidate',()=>{
    assert.equal(typeof review.setSiteReviewDecision,'function');
    const [first,second]=catalogue.paraglidingMapSites;
    const initial={};
    const accepted=review.setSiteReviewDecision(initial,first.id,'accepted');
    const decisions=review.setSiteReviewDecision(accepted,second.id,'rejected');
    const visible=review.applySiteReview(decisions);
    assert.deepEqual(initial,{},'Do not mutate the previous state used by Undo');
    assert.equal(visible.length,78);
    assert.equal(visible.find(site=>site.id===first.id).reviewState,'accepted');
    assert.equal(visible.some(site=>site.id===second.id),false);
    assert.equal(review.isPendingSite(visible.find(site=>site.id===first.id)),false);
    const restored=review.applySiteReview(review.setSiteReviewDecision(decisions,second.id,undefined));
    assert.equal(restored.length,79);
    assert.equal(restored.find(site=>site.id===second.id).reviewState,'pending');
    assert.deepEqual(review.siteReviewCounts(decisions),{pending:77,accepted:1,rejected:1,total:79});
    assert.deepEqual(review.setSiteReviewDecision(decisions,'flybubble-9562','rejected'),decisions,'Existing sites cannot be rejected through candidate review');
});

test('decisions survive reopening and accept only known candidate IDs and valid states',()=>{
    assert.equal(typeof review.readSiteReview,'function');
    const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
    const id=catalogue.paraglidingMapSites[0].id;
    assert.deepEqual(review.readSiteReview(storage),{});
    assert.equal(review.saveSiteReview({[id]:'accepted'},storage),true);
    assert.deepEqual(review.readSiteReview(storage),{[id]:'accepted'});
    storage.setItem(review.SITE_REVIEW_STORAGE_KEY,JSON.stringify({version:1,decisions:{[id]:'rejected','pgmap-invalid':'accepted','flybubble-9562':'rejected'}}));
    assert.deepEqual(review.readSiteReview(storage),{[id]:'rejected'});
    storage.setItem(review.SITE_REVIEW_STORAGE_KEY,'{broken');assert.deepEqual(review.readSiteReview(storage),{});
    storage.setItem(review.SITE_REVIEW_STORAGE_KEY,JSON.stringify({version:9,decisions:{[id]:'accepted'}}));assert.deepEqual(review.readSiteReview(storage),{});
    const denied={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
    assert.deepEqual(review.readSiteReview(denied),{});
    assert.equal(review.saveSiteReview({[id]:'accepted'},denied),false,'Report unsaved decisions honestly');
    assert.deepEqual(review.readSiteReview(denied,{[id]:'accepted'}),{[id]:'accepted'},'Keep in-memory decisions when storage cannot be read');
});

test('accepted positions remain outside wind matches until their launch limits are verified',()=>{
    assert.equal(typeof review.applySiteReview,'function');
    const id=catalogue.paraglidingMapSites[0].id;
    const sites=review.applySiteReview({[id]:'accepted'});
    const panel=buildSitePanel(sites,()=>{throw Error('Location previews must not request forecasts');},Date.UTC(2026,9,22,12));
    assert.equal(panel.allSites.length,79);assert.equal(panel.sites.length,0);
    assert.equal(panel.loading,0);assert.equal(panel.unavailable,0);
    assert.equal(panel.allSites.find(site=>site.id===id).label,'Location accepted');
    assert.equal(panel.allSites.find(site=>site.id===id).forecast,'Not assessed');
    assert.equal(panel.allSites.filter(review.isPendingSite).length,78);
});

test('export records every choice with stable IDs and coordinates for final catalogue promotion',()=>{
    assert.equal(typeof review.exportSiteReview,'function');
    const [first,second]=catalogue.paraglidingMapSites;
    const result=review.exportSiteReview({[first.id]:'accepted',[second.id]:'rejected'});
    assert.equal(result.version,1);assert.equal(result.sites.length,79);
    assert.equal(result.sites.find(site=>site.id===first.id).decision,'accepted');
    assert.equal(result.sites.find(site=>site.id===first.id).lat,first.lat);
    assert.equal(result.sites.find(site=>site.id===second.id).decision,'rejected');
    assert.equal(result.sites.filter(site=>site.decision==='pending').length,77);
    assert.doesNotThrow(()=>JSON.parse(JSON.stringify(result)));
});
