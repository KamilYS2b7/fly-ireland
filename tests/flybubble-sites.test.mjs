import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {flybubbleSites} from '../src/flybubbleSites.ts';
import {evaluateWind} from '../src/windForecast.ts';

test('active imported catalogue preserves accepted locations and evaluates every source sector',()=>{
    const report=JSON.parse(readFileSync(new URL('../reports/flybubble-ireland-comparison.json',import.meta.url),'utf8'));
    const expected=report.rows.filter(r=>r.status==='new_area_candidate' && ![14732,15458].includes(r.flybubble_id));
    assert.equal(flybubbleSites.length,38);
    assert.equal(new Set(flybubbleSites.map(s=>s.reviewGroup)).size,33);
    assert.equal(new Set(flybubbleSites.map(s=>s.id)).size,38);
    assert.ok(flybubbleSites.every(s=>!['Gortin','Flagstaff'].includes(s.name)));
    for(const site of flybubbleSites){
        const source=expected.find(r=>`flybubble-${r.flybubble_id}`===site.id);
        assert.ok(source);
        assert.equal(site.name,source.flybubble_name);
        assert.equal(site.lat,source.latitude);assert.equal(site.lon,source.longitude);
        assert.equal(site.toVerify,false);
        assert.equal(Number.isFinite(site.sectorStart),true);
        assert.equal(site.sourceWindSectors.length,16);
        assert.ok(site.region);
        assert.ok(['coastal','inland'].includes(site.siteType));
        for(let i=0;i<16;i++){
            const angle=(i*22.5+11.25)*Math.PI/180;
            assert.equal(evaluateWind(site,[-4*Math.sin(angle),-4*Math.cos(angle)]).status,
                site.sourceWindSectors[i]>0?'pass':'fail',`${site.name}, sector ${i}`);
        }
    }
});
