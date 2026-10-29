import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {polandGuideSites as polandSites} from '../src/polandSites.ts';
import {guideKeyForSite,normalizeSiteGuide} from '../src/siteGuides.ts';
import {evaluateWind} from '../src/windForecast.ts';
import {ownerPolandWindRanges} from '../src/polandWindApproval.ts';

const guides=JSON.parse(readFileSync(new URL('../assets/assets/site_descriptions.json',import.meta.url),'utf8'));
test('all 30 approved Polish areas have distinct identifiers, source links and English guides',()=>{
 assert.equal(polandSites.length,30);assert.equal(new Set(polandSites.map(s=>s.id)).size,30);
 for(const site of polandSites){
  assert.equal(site.country,'poland');assert.equal(site.siteType,'inland');
  assert.ok(site.lat>=48.9&&site.lat<=55&&site.lon>=14&&site.lon<=24.2,site.name);
  assert.ok(new URL(site.sourceUrl).protocol==='https:');
  const key=guideKeyForSite(site);assert.ok(key,site.name);
  const guide=normalizeSiteGuide(key,guides[key]);
  assert.ok(guide.sections.some(s=>s.id==='summary'),site.name);
  assert.ok(guide.points.length>0,site.name);
  assert.ok(guide.points.every(p=>p.lat>48.9&&p.lon>14),site.name);
 }
 assert.equal(polandSites.filter(s=>s.guideDepth==='brief').length,8);
});
test('preferred bearings remain unassessed unless the owner supplies explicit sector bounds',()=>{
 for(const name of ['Chełmiec','Kudowa-Zdrój – Czermna','Grzmiąca','Bezmiechowa','Małe Jasło','Żar','Ćwilin']){
  const site=polandSites.find(s=>s.name===name);assert.ok(site,name);
  const approved=ownerPolandWindRanges[site.id];
  assert.deepEqual(site.windRanges,approved??[]);assert.equal(site.directionUnverified,!approved);
  const reading=evaluateWind(site,[0,-4]);assert.equal(reading.status,'fail');assert.ok(Number.isFinite(reading.mph));
 }
 assert.deepEqual(polandSites.find(s=>s.name==='Wołowa Góra').windRanges,[{start:330,end:10}]);
 assert.deepEqual(polandSites.find(s=>s.name==='Góra Szybowcowa – Jeżów Sudecki').windRanges,[{start:160,end:220},{start:330,end:10}]);
});
test('Skrzyczne uses the east face and current Lipowa landings without resurrecting Kaimówka',()=>{
 const site=polandSites.find(s=>s.name==='Skrzyczne');const guide=normalizeSiteGuide(guideKeyForSite(site),guides[guideKeyForSite(site)]);
 assert.deepEqual(site.windRanges,[{start:45,end:112.5}]);
 const landings=guide.points.filter(p=>p.kind==='landing');assert.equal(landings.length,2);
 assert.deepEqual(landings.map(p=>[p.lat,p.lon]),[[49.697102,19.089718],[49.678713,19.086896]]);
 assert.ok(!landings.some(p=>/kaim/i.test(p.label)));
 assert.match(guide.sections.find(s=>s.id==='landing').text,/no longer an official landing/i);
});

test('an uncertain guide reference remains visibly unverified on its country card',()=>{
 for(const site of polandSites){
  const key=guideKeyForSite(site);const guide=normalizeSiteGuide(key,guides[key]);
  if(guide.points.some(p=>p.kind==='reference'&&p.code==='A'&&p.needsVerification)){
   assert.equal(site.locationNeedsVerification,true,`${site.name}: the sidebar must retain the guide position warning`);
  }
 }
});
