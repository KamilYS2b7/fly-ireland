import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {polandSites} from '../src/polandSites.ts';
import {evaluateWind} from '../src/windForecast.ts';
import {createWindDirectionReview} from '../src/windDirectionReview.ts';
const report=JSON.parse(readFileSync(new URL('../reports/poland-owner-wind-review-2026-10-26.json',import.meta.url),'utf8'));
test('48 explicit owner-confirmed sectors activate exactly at their original site IDs and GPS',()=>{
 const confirmed=report.sites.filter(site=>site.confirmedAt);assert.equal(confirmed.length,48);
 for(const row of confirmed){
  const site=polandSites.find(site=>site.id===row.id);assert.ok(site,row.id);
  assert.equal(site.lat,row.lat);assert.equal(site.lon,row.lon);
  assert.deepEqual(site.windRanges,row.windRanges,site.name);assert.equal(site.directionUnverified,false);
  for(const range of row.windRanges){
   const sweep=(range.end-range.start+360)%360||360,direction=(range.start+sweep/2)%360,radians=direction*Math.PI/180;
   assert.equal(evaluateWind(site,[-4*Math.sin(radians),-4*Math.cos(radians)]).status,'pass',site.name);
  }
 }
 assert.equal(polandSites.filter(site=>site.directionUnverified).length,34);
 assert.equal(polandSites.filter(site=>!site.directionUnverified).length,62);
 assert.equal(polandSites.length,96);
 const review=createWindDirectionReview(polandSites),state=review.merge({},JSON.stringify(report));
 assert.equal(Object.keys(state).length,48);assert.equal(review.report(state).sites.length,48);
 assert.equal(review.eligible.length,34);assert.ok(!state[review.next(state,undefined).id]?.confirmedAt);
});
