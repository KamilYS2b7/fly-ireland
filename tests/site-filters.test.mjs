import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {getSiteMetadata, REGIONS} from '../src/siteCatalog.ts';
import {defaultSiteFilters, normalizeSiteFilters, matchesSiteArea, scopeSitePanel, sitesForView, readSiteFilters, saveSiteFilters, FILTER_STORAGE_KEY} from '../src/siteFilters.ts';
import {POLAND_ENABLED,releaseSiteFilters} from '../src/siteFilters.ts';

test('country availability follows the release switch without losing unrelated preferences',()=>{
    const saved={...defaultSiteFilters(),country:'poland',wind:'direction-review',withVideos:true,withGuide:true,siteType:'inland'};
    assert.deepEqual(releaseSiteFilters(saved,false),{...saved,country:'ireland',wind:'all'});
    assert.deepEqual(releaseSiteFilters(saved),POLAND_ENABLED?saved:{...saved,country:'ireland',wind:'all'});
    assert.deepEqual(releaseSiteFilters(saved,true),saved,'The preserved Polish workflow can be re-enabled');
    const ireland={...defaultSiteFilters(),regions:['north-east'],wind:'matched',withVideos:true};
    assert.deepEqual(releaseSiteFilters(ireland),ireland);
});

test('every source site has explicit metadata with the agreed region counts', () => {
    const source=readFileSync(new URL('../src/plugin.svelte',import.meta.url),'utf8');
    const names=[...source.matchAll(/\/\/\s*\r?\n([^\r\n]+)\r?\nLocation:/g)].map(match=>match[1].trim());
    assert.equal(names.length,98);
    const counts=Object.fromEntries(REGIONS.map(region=>[region.id,0]));
    for(const name of names){const meta=getSiteMetadata(name);assert.ok(meta.region,name);assert.ok(['coastal','inland'].includes(meta.siteType),name);counts[meta.region]++;}
    assert.deepEqual(counts,{'north-east':44,'north-west':15,west:4,'south-west':13,east:15,'south-east':7});
    for(const name of ['Bray Head','Rossbeigh Mountain','Keel Bay','Torr Head']) assert.equal(getSiteMetadata(name).siteType,'coastal');
    for(const name of ['Big Colin','Lough Tay S','Cliffs of Magho','Maulin Peak']) assert.equal(getSiteMetadata(name).siteType,'inland');
    assert.equal(getSiteMetadata('New unclassified site').siteType,undefined);
});

const entries=[
    {id:'a',name:'A',region:'north-east',siteType:'coastal',status:'pass'},
    {id:'b',name:'B',region:'north-west',siteType:'coastal',status:'fail'},
    {id:'c',name:'C',region:'north-east',siteType:'inland',status:'loading'},
    {id:'d',name:'D',region:'south-west',siteType:'coastal',status:'unavailable'},
];
const snapshot={allSites:entries,sites:[entries[0]],loading:1,unavailable:1,settings:false,time:'now'};
test('Polish direction review isolates remaining unknown sectors and survives saved filters',()=>{
 const sites=[{id:'unknown',country:'poland',directionUnverified:true},{id:'saved',country:'poland',directionUnverified:true,windReviewConfirmed:true},{id:'known',country:'poland'},{id:'irish',directionUnverified:true}];
 assert.deepEqual(sitesForView({...snapshot,allSites:sites},'direction-review').map(s=>s.id),['unknown']);
 assert.equal(normalizeSiteFilters({country:'poland',wind:'direction-review'}).wind,'direction-review');
 assert.equal(normalizeSiteFilters({country:'ireland',wind:'direction-review'}).wind,'all');
});
test('country filters preserve legacy Ireland settings and scope Polish map and panel membership',()=>{
    assert.equal(defaultSiteFilters().country,'ireland');
    const pl={id:'pl',name:'Dzikowiec',country:'poland',siteType:'inland',status:'pass'};
    const mixed={...snapshot,allSites:[...entries,pl],sites:[entries[0],pl]};
    assert.deepEqual(scopeSitePanel(mixed,defaultSiteFilters()).allSites,entries);
    const filters=normalizeSiteFilters({...defaultSiteFilters(),country:'poland',regions:['north-east']});
    assert.deepEqual(filters.regions,[],'Ireland regions must not exclude Polish sites');
    const scoped=scopeSitePanel(mixed,filters);
    assert.deepEqual(scoped.allSites,[pl]);assert.deepEqual(sitesForView(scoped,'matched'),[pl]);
    assert.equal(normalizeSiteFilters({country:'unknown'}).country,'ireland');
    const saved=new Map();const storage={getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value)};
    saveSiteFilters(filters,storage);assert.deepEqual(readSiteFilters(storage),filters);
    storage.setItem(FILTER_STORAGE_KEY,JSON.stringify({regions:['north-east'],wind:'matched'}));
    assert.equal(readSiteFilters(storage).country,'ireland');
});
test('region selection is OR and type selection is AND, with scoped status counts', () => {
    const filters={regions:['north-east','north-west'],siteType:'coastal',wind:'matched'};
    const scoped=scopeSitePanel(snapshot,filters);
    assert.deepEqual(scoped.allSites.map(site=>site.id),['a','b']);
    assert.deepEqual(scoped.sites.map(site=>site.id),['a']);
    assert.equal(scoped.loading,0);assert.equal(scoped.unavailable,0);
    assert.equal(matchesSiteArea(entries[2],filters),false);
    assert.deepEqual(scopeSitePanel(snapshot,defaultSiteFilters()),snapshot);
    assert.equal(matchesSiteArea({name:'Unknown'},defaultSiteFilters()),true);
    assert.equal(matchesSiteArea({name:'Unknown'},filters),false);
});

test('area and video filters retain light-wind sites already included in Wind-matched',()=>{
    const light={...entries[1],youtube:['https://www.youtube.com/watch?v=whaqT_LWvdk']};
    const panel={...snapshot,allSites:[entries[0],light,entries[2],entries[3]],sites:[entries[0],light]};
    const filters={...defaultSiteFilters(),regions:['north-west'],siteType:'coastal',withVideos:true,wind:'matched'};
    const scoped=scopeSitePanel(panel,filters);
    assert.deepEqual(sitesForView(scoped,'matched').map(site=>site.id),['b']);
    assert.equal(scoped.sites[0].status,'fail');
});
test('normalization keeps valid settings, removes duplicates and resets invalid input', () => {
    assert.deepEqual(normalizeSiteFilters({regions:['north-east','bad','north-east'],siteType:'coastal',wind:'matched'}),{...defaultSiteFilters(),regions:['north-east'],siteType:'coastal',wind:'matched'});
    for(const value of [null,42,[],{regions:'north',siteType:'other',wind:'bad'}]) assert.deepEqual(normalizeSiteFilters(value),defaultSiteFilters());
    assert.deepEqual(normalizeSiteFilters({regions:REGIONS.map(r=>r.id)}).regions,[]);
});
test('settings survive reopen and reset, while corrupt or blocked storage is harmless', () => {
    const values=new Map();const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
    const selected={...defaultSiteFilters(),regions:['north-west'],siteType:'coastal',wind:'matched',withVideos:true};
    saveSiteFilters(selected,storage);assert.deepEqual(readSiteFilters(storage),selected);
    saveSiteFilters(defaultSiteFilters(),storage);assert.deepEqual(readSiteFilters(storage),defaultSiteFilters());
    storage.setItem(FILTER_STORAGE_KEY,'{broken');assert.deepEqual(readSiteFilters(storage),defaultSiteFilters());
    const denied={getItem(){throw new Error('denied');},setItem(){throw new Error('denied');}};
    assert.deepEqual(readSiteFilters(denied),defaultSiteFilters());assert.doesNotThrow(()=>saveSiteFilters(selected,denied));
});

test('YouTube-only filtering combines with area and wind while keeping scoped counts accurate',()=>{
    const youtube=['https://www.youtube.com/watch?v=whaqT_LWvdk'];
    const allSites=[
        {id:'legacy',region:'north-west',siteType:'coastal',status:'pass',youtube},
        {id:'approved',region:'north-west',siteType:'coastal',status:'fail',youtube},
        {id:'loading',region:'north-west',siteType:'coastal',status:'loading',youtube:['https://youtu.be/whaqT_LWvdk']},
        {id:'unavailable',region:'north-west',siteType:'coastal',status:'unavailable',youtube},
        {id:'inland',region:'north-west',siteType:'inland',status:'pass',youtube},
        {id:'south',region:'south-west',siteType:'coastal',status:'pass',youtube},
        {id:'none',region:'north-west',siteType:'coastal',status:'pass'},
        {id:'rejected',region:'north-west',siteType:'coastal',status:'pass',youtube:[],videoCandidates:[{url:youtube[0],reviewStatus:'rejected'}]},
        {id:'invalid',region:'north-west',siteType:'coastal',status:'loading',youtube:['','https://example.com/watch?v=whaqT_LWvdk']},
    ];
    const panel={allSites,sites:allSites.filter(s=>s.status==='pass'),loading:2,unavailable:1};
    assert.deepEqual(scopeSitePanel(panel,defaultSiteFilters()),panel);
    const filters={...defaultSiteFilters(),regions:['north-west'],siteType:'coastal',withVideos:true};
    const scoped=scopeSitePanel(panel,filters);
    assert.deepEqual(sitesForView(scoped,'all').map(s=>s.id),['legacy','approved','loading','unavailable']);
    assert.deepEqual(sitesForView(scoped,'matched').map(s=>s.id),['legacy']);
    assert.equal(scoped.loading,1);assert.equal(scoped.unavailable,1);
    assert.equal(panel.allSites.length,9);
});

test('YouTube filter defaults off for older settings and only accepts a boolean',()=>{
    assert.equal(defaultSiteFilters().withVideos,false);
    const old={regions:['north-east'],siteType:'inland',wind:'matched'};
    assert.deepEqual(normalizeSiteFilters(old),{...old,country:'ireland',withVideos:false,withGuide:false});
    assert.equal(normalizeSiteFilters({...old,withVideos:true}).withVideos,true);
    for(const withVideos of [undefined,null,'true','false',1,{}]){
        assert.equal(normalizeSiteFilters({...old,withVideos}).withVideos,false);
    }
});

test('site guide filtering combines with videos, area and wind, retaining light-wind matches and accurate counts',()=>{
    const youtube=['https://www.youtube.com/watch?v=whaqT_LWvdk'];
    const allSites=[
        {id:'colin',name:'Big Colin',region:'north-east',siteType:'inland',status:'pass',youtube},
        {id:'divis',name:'Divis',region:'north-east',siteType:'inland',status:'fail'},
        {id:'mayo',name:'Mayobridge',region:'north-east',siteType:'inland',status:'loading',youtube},
        {id:'torr',name:'Torr Head',region:'north-east',siteType:'coastal',status:'unavailable'},
        {id:'unknown',name:'No guide here',region:'north-east',siteType:'inland',status:'pass',youtube},
        {id:'different',name:'White Mountain W',lat:52,lon:-9,region:'south-west',siteType:'inland',status:'pass'},
    ];
    const panel={allSites,sites:[allSites[0],allSites[1],allSites[4],allSites[5]],loading:1,unavailable:1};
    const filters={...defaultSiteFilters(),withGuide:true};
    const scoped=scopeSitePanel(panel,filters);
    assert.deepEqual(sitesForView(scoped,'all').map(site=>site.id),['colin','divis','mayo','torr']);
    assert.deepEqual(sitesForView(scoped,'matched').map(site=>site.id),['colin','divis']);
    assert.equal(scoped.loading,1);assert.equal(scoped.unavailable,1);
    const combined=scopeSitePanel(panel,{...filters,regions:['north-east'],siteType:'inland',withVideos:true});
    assert.deepEqual(combined.allSites.map(site=>site.id),['colin','mayo']);
    assert.deepEqual(combined.sites.map(site=>site.id),['colin']);assert.equal(combined.unavailable,0);
    assert.deepEqual(scopeSitePanel(panel,defaultSiteFilters()),panel);
});

test('site guide preference survives reopening and reset while older settings default off',()=>{
    const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
    const selected={...defaultSiteFilters(),withGuide:true,withVideos:true};
    saveSiteFilters(selected,storage);assert.deepEqual(readSiteFilters(storage),selected);
    saveSiteFilters(defaultSiteFilters(),storage);assert.equal(readSiteFilters(storage).withGuide,false);
    for(const withGuide of [undefined,null,'true','false',1,{}])assert.equal(normalizeSiteFilters({withGuide}).withGuide,false);
    storage.setItem(FILTER_STORAGE_KEY,JSON.stringify({regions:['north-east'],wind:'matched',withVideos:true}));
    assert.equal(readSiteFilters(storage).withGuide,false);assert.equal(readSiteFilters(storage).withVideos,true);
});

test('video-review view includes only sites with undecided candidates, including unknown winds and loading forecasts',()=>{
    const allSites=[
        {id:'pending',region:'north-west',status:'fail',videoCandidates:[{reviewStatus:'pending'}]},
        {id:'mixed',region:'north-west',status:'pass',videoCandidates:[{reviewStatus:'accepted'},{reviewStatus:'pending'}]},
        {id:'unknown-wind',region:'north-east',toVerify:true,reviewFinalized:true,status:'review',videoCandidates:[{reviewStatus:'pending'}]},
        {id:'loading',region:'north-west',status:'loading',videoCandidates:[{}]},
        {id:'accepted',status:'pass',videoCandidates:[{reviewStatus:'accepted'}]},
        {id:'rejected',status:'fail',videoCandidates:[{reviewStatus:'rejected'}]},
        {id:'old-video',status:'pass',youtube:['https://www.youtube.com/watch?v=whaqT_LWvdk']},
        {id:'empty',status:'pass',videoCandidates:[]},
    ];
    const panel={allSites,sites:allSites.filter(s=>s.status==='pass'),loading:1,unavailable:0};
    assert.deepEqual(sitesForView(panel,'video-review').map(site=>site.id),['pending','mixed','unknown-wind','loading']);
    assert.deepEqual(sitesForView(panel,'all'),allSites);
    assert.deepEqual(sitesForView(panel,'matched'),panel.sites);
    const filters={...defaultSiteFilters(),regions:['north-west'],wind:'video-review'};
    assert.deepEqual(sitesForView(scopeSitePanel(panel,filters),'video-review').map(site=>site.id),['pending','mixed','loading']);
    const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
    saveSiteFilters(filters,storage);assert.deepEqual(readSiteFilters(storage),filters);
});
