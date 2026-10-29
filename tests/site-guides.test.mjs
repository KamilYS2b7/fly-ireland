import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {guideKeyForSite,normalizeSiteGuide,createSiteGuideLoader,pointCoordinates,pointDirectionsUrl,pointKindLabel} from '../src/siteGuides.ts';
import {guideAssetUrl} from '../src/siteGuideAssets.ts';

const source=JSON.parse(readFileSync(new URL('../assets/assets/site_descriptions.json',import.meta.url),'utf8'));
test('Polish guide points are accepted while unassociated overseas points remain rejected',()=>{
 const raw={country:'poland',launches:[{label:'Take-off',lat:50.720596,lon:16.210896},{label:'Bad latitude',lat:92,lon:16},{label:'Overseas',lat:0,lon:0}]};
 assert.equal(normalizeSiteGuide('PL: Dzikowiec',raw).points.length,1);
 assert.equal(normalizeSiteGuide('Unclassified',{launches:raw.launches}).points.length,0);
 assert.equal(normalizeSiteGuide('PL: Dzikowiec',{country:'poland',launches:[{lat:54.8,lon:-6.1}]}).points.length,0);
});

test('guides follow explicit existing-site aliases and grouped slopes rather than nearest coordinates',()=>{
 for(const [name,key] of [['Agnews','Agnews Hill'],['Dungiven','Dungiven West'],['Dungiven NW','Dungiven North-West'],['Dungiven Boviel','Dungiven SW (Boviel)'],['Knockagh Monument','Knockagh'],['Cliffs of Magho','Lough Navar'],['Sorrel Hill','Lacken'],['Lough Bray Upper','Lough Bray'],['Lough Bray Lower','Lough Bray'],['White Mountain S','White Mountain'],['White Mountain W','White Mountain'],['Slieve Gullion S','Slieve Gullion'],['Barnevave','Barnavave']])assert.equal(guideKeyForSite({name}),key);
 assert.equal(guideKeyForSite({name:'Unknown hill',lat:54.802333,lon:-6.084265}),undefined);
 assert.equal(guideKeyForSite({name:'White Mountain W',lat:52,lon:-9}),undefined,'An unrelated same-name site must not inherit a guide');
});

test('original Android descriptions retain their sections and valid points without promoting uncertain locations',()=>{
 const guides=Object.entries(source).filter(([,raw])=>!raw.source).map(([key,raw])=>normalizeSiteGuide(key,raw));
 assert.equal(guides.length,30);
 assert.equal(guides.reduce((n,g)=>n+g.points.filter(p=>p.kind==='launch').length,0),48);
 assert.equal(guides.reduce((n,g)=>n+g.points.filter(p=>p.kind==='landing').length,0),46);
 assert.equal(guides.reduce((n,g)=>n+g.points.filter(p=>p.kind==='parking').length,0),38);
 assert.ok(guides.every(g=>g.sections.length===8&&g.images.length===1));
 const navar=guides.find(g=>g.key==='Lough Navar');assert.equal(navar.points.length,5);assert.ok(navar.points.every(p=>p.needsVerification));
 const sugar=guides.find(g=>g.key==='Great Sugar Loaf');
 assert.deepEqual(sugar.points.filter(p=>p.kind==='reference').map(p=>p.code),['C','D']);
 assert.equal(sugar.points.find(p=>p.code==='B').kind,'launch');
});

test('malformed coordinates and unsafe photo paths never reach map or image attributes',()=>{
 const guide=normalizeSiteGuide('Test',{title:'Test <hill>',summary:'Plain <script>text</script>',images:['assets/sites/ok.jpg','https://example.com/x.jpg','assets/sites/../../secret.jpg'],launches:[{label:'Valid',code:'A',lat:54,lon:-7},{label:'Bad',lat:NaN,lon:-7},{label:'Elsewhere',lat:0,lon:0}],launchMarkers:['Q: 54.1, -7.2 | #fff','not a coordinate'],landings:null});
 assert.equal(guide.sections[0].text,'Plain <script>text</script>');
 assert.deepEqual(guide.images,['assets/sites/ok.jpg']);assert.equal(guide.points.length,2);
 assert.equal(guide.points[1].kind,'reference');
 assert.throws(()=>guideAssetUrl('../secret','https://localhost:9999/plugin.js'));
 assert.equal(guideAssetUrl('assets/sites/ok.jpg','https://windy-plugins.com/12509319/windy-plugin-fly-ireland/1.1.28/plugin.min.js'),'https://raw.githubusercontent.com/KamilYS2b7/fly-ireland/9c31a9a32f52f7876c3fd0ba5d9a282a8bcc85c2/assets/assets/sites/ok.jpg');
 assert.equal(guideAssetUrl('assets/site_descriptions.json','https://windy-plugins.com/12509319/windy-plugin-fly-ireland/1.1.28/plugin.min.js'),'https://windy-plugins.com/12509319/windy-plugin-fly-ireland/1.1.28/assets/site_descriptions.json');
 assert.equal(guideAssetUrl('assets/sites/ok.jpg','https://localhost:9999/plugin.js'),'https://localhost:9999/assets/sites/ok.jpg');
});

test('description loading is on demand, shared across sites, retriable, and abortable on plugin destruction',async()=>{
 let requests=0,fail=true,signal;
 const loader=createSiteGuideLoader({moduleUrl:'https://localhost:9999/plugin.js',fetch:async(url,options)=>{
  requests++;signal=options.signal;assert.equal(url,'https://localhost:9999/assets/site_descriptions.json');
  if(fail)return {ok:false,status:503};return {ok:true,json:async()=>source};
 }});
 assert.equal(requests,0);assert.equal(await loader.load({name:'Unknown'}),undefined);assert.equal(requests,0);
 await assert.rejects(loader.load({name:'Dungiven'}),/503/);fail=false;
 const [west,nw]=await Promise.all([loader.load({name:'Dungiven'}),loader.load({name:'Dungiven NW'})]);
 assert.equal(west.key,'Dungiven West');assert.equal(nw.key,'Dungiven North-West');assert.equal(requests,2);
 await loader.load({name:'Big Colin'});assert.equal(requests,2);
 loader.destroy();assert.equal(signal.aborted,true);await assert.rejects(loader.load({name:'Dungiven'}),/closed/i);
});

test('point actions use the selected point rather than a site centroid',()=>{
 const parking=normalizeSiteGuide('Big Colin',source['Big Colin']).points.find(p=>p.kind==='parking');
 assert.equal(pointCoordinates(parking),'54.801111, -6.079409');
 assert.equal(pointDirectionsUrl(parking),'https://www.google.com/maps/dir/?api=1&destination=54.80111125662587%2C-6.079408524065345');
});

test('Big Colin has one access gate with its own map point and navigation coordinates',()=>{
 const guide=normalizeSiteGuide('Big Colin',source['Big Colin']);
 const gates=guide.points.filter(point=>point.kind==='access');
 assert.equal(gates.length,1,'The gate must be available separately from parking and take-offs');
 const gate=gates[0];
 assert.equal(gate.code,'F');assert.equal(gate.label,'Site access gate');
 assert.equal(pointKindLabel(gate.kind),'Access gate');
 assert.deepEqual([gate.lat,gate.lon],[54.806302,-6.073211]);
 assert.equal(pointCoordinates(gate),'54.806302, -6.073211');
 assert.equal(pointDirectionsUrl(gate),'https://www.google.com/maps/dir/?api=1&destination=54.806302%2C-6.073211');
 assert.equal(gate.needsVerification,false);
 assert.equal(guide.points.length,6);
});

test('IHPA regional guides follow confirmed catalogue names with independent Achill anchors',async()=>{
 const loader=createSiteGuideLoader({fetch:async()=>({ok:true,json:async()=>source})});
 const expected=[
  ['Mount Leinster',52.616587,-6.779473,'Mount Leinster'],
  ['Mount Leinster N',52.636022,-6.813285,'Mount Leinster'],
  ['Croagh Patrick',53.7599,-9.65878,'Croagh Patrick'],
  ['Croagh Patrick South take-off',53.7628,-9.6364,'Croagh Patrick'],
  ['Croagh Patrick East Site',53.7628,-9.6351,'Croagh Patrick'],
  ['Sky Road',53.5006,-10.0962,'Sky Road'],
  ['Maumturk Mts',53.4943,-9.664,'Maumturks'],
  ['Minaun Heights',53.954746,-10.025487,'Achill Island'],
  ['Atlantic Drive',53.897575,-9.992084,'Achill Island'],
  ['Rossbeigh Mountain',52.0476,-9.981986,'Rossbeigh'],
 ];
 for(const [name,lat,lon,key] of expected){
  const site={name,lat,lon};assert.equal(guideKeyForSite(site),key,`Missing association for ${name}`);
  const guide=await loader.load(site);assert.equal(guide.key,key);
  assert.equal(guide.source.title,'IHPA Site Guide');assert.equal(guide.source.edition,'Issue 4, July 2015');
  assert.ok(guide.source.pages.length&&guide.sections.length===8);
 }
 assert.equal(guideKeyForSite({name:'Keel Bay',lat:53.962694,lon:-10.046897}),undefined,'An unconfirmed neighbouring site must not inherit a guide');
 assert.equal(guideKeyForSite({name:'Atlantic Drive',lat:52,lon:-9}),undefined);
 loader.destroy();
});

test('IHPA imports cover all missing launch descriptions without inventing Knockmore coordinates',()=>{
 const keys=['Mount Leinster','Croagh Patrick','Sky Road','Maumturks','Achill Island','Rossbeigh'];
 assert.equal(Object.keys(source).length,66);
 assert.deepEqual(Object.keys(source).filter(key=>source[key].source?.title==='IHPA Site Guide').sort(),[...keys].sort());
 for(const key of keys)assert.ok(source[key],`Missing regional guide ${key}`);
 const mount=normalizeSiteGuide('Mount Leinster',source['Mount Leinster']);
 const mountText=mount.sections.map(s=>s.text).join('\n');
 for(const name of ['Westerly Car Park','Black Banks','Slevebawn','Mast'])assert.ok(mountText.includes(name));
 const achill=normalizeSiteGuide('Achill Island',source['Achill Island']);
 const achillText=achill.sections.map(s=>s.text).join('\n');
 for(const name of ['Minaun Heights','Minaun Lower Cliffs','Keel West','Knockmore','Atlantic Drive'])assert.ok(achillText.includes(name));
 assert.ok(!achill.points.some(p=>/knockmore/i.test(p.label)),'Known duplicated coordinates cannot become a Knockmore map pin');
 assert.equal(achill.points.find(p=>p.code==='LC').kind,'parking');
 assert.equal(achill.points.find(p=>p.code==='AD').kind,'reference');
 const maum=normalizeSiteGuide('Maumturks',source['Maumturks']);
 assert.equal(maum.points.find(p=>p.kind==='launch').needsVerification,true,'The PDF explicitly describes an approximate launch');
});

test('guide metadata and structured reference points preserve explicit uncertainty while rejecting invalid values',()=>{
 const guide=normalizeSiteGuide('Example',{
  source:{title:'IHPA Site Guide',edition:'Issue 4, July 2015',pages:[8,-1,'9',NaN,8],note:'Published source; not recently verified.'},
  launches:[{code:'A',label:'Shoulder',lat:53.761588,lon:-9.639639,needsVerification:true},{code:'B',label:'Other shoulder',lat:53.763,lon:-9.69,needsVerification:'true'}],
  referencePoints:[{code:'R',label:'Ridge reference',lat:53.879717,lon:-9.966301,needsVerification:true},{code:'X',lat:0,lon:0}],
 });
 assert.deepEqual(guide.source,{title:'IHPA Site Guide',edition:'Issue 4, July 2015',pages:[8],note:'Published source; not recently verified.'});
 assert.equal(guide.points[0].needsVerification,true);assert.equal(guide.points[1].needsVerification,false);
 assert.equal(guide.points[2].kind,'reference');assert.equal(guide.points[2].label,'Ridge reference');
 assert.equal(guide.points[2].needsVerification,true);assert.equal(guide.points.length,3);
 assert.equal(normalizeSiteGuide('Old',{source:'not metadata'}).source,undefined);
 assert.equal(normalizeSiteGuide('Old',{source:{title:'',pages:null}}).source,undefined);
});
