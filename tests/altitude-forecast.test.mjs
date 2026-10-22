import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleAltitudeForecast } from '../src/altitudeForecast.ts';

const time = Date.UTC(2026, 9, 22, 8);
const spot = { id: 'hill', lat: 55, lon: -7, sectorStart: 0, sectorEnd: 360 };
function fixture() {
    const header = { model: 'UKV', refTime: '2026-10-21T09:00:00Z', elevation: 300, modelElevation: 100 };
    const point = { status: 200, data: { header: { ...header }, data: {
        ts: [time, time + 3600000], wind: [2, 2], windDir: [270, 270], windGust: [5, 5],
    } } };
    const profile = { status: 200, data: { header: { ...header }, data: {
        hours: [time, time + 3600000], 'wind_u-surface': [2, 2], 'wind_v-surface': [0, 0],
        'gh-950h': [510, 510], 'wind_u-950h': [6, 6], 'wind_v-950h': [0, 0],
    } } };
    return { point, profile };
}
test('estimates at terrain + 10 m using model ground + 10 m, keeping surface and gusts separate', () => {
    const { point, profile } = fixture();
    const r = sampleAltitudeForecast(spot, point, profile, time);
    assert.equal(r.status, 'pass');
    assert.equal(r.mph, 4 / 0.44704);
    assert.equal(r.surfaceMph, 2 / 0.44704);
    assert.equal(r.gustMph, 5 / 0.44704);
    assert.equal(r.targetHeightM, 310);
    assert.equal(r.elevationM, 300);
    assert.equal(r.modelElevationM, 100);
    assert.equal(r.direction, 270);
});
test('interpolates vectors vertically and then in time, including direction through north', () => {
    const { point, profile } = fixture();
    profile.data.data['wind_u-surface'] = [-2, 2];
    profile.data.data['wind_v-surface'] = [-2, -2];
    profile.data.data['wind_u-950h'] = [-6, 6];
    profile.data.data['wind_v-950h'] = [-6, -6];
    profile.data.data['gh-950h'][1] = 910;
    const r = sampleAltitudeForecast(spot, point, profile, time + 1800000);
    assert.ok(Math.abs(r.mph - Math.hypot(-0.5, -3.5) / 0.44704) < 1e-9);
    assert.ok(r.direction < 10);
});
test('does not force a stronger estimate and excludes pressure levels below model ground', () => {
    const { point, profile } = fixture();
    Object.assign(profile.data.data, { 'wind_u-950h': [0, 0], 'gh-1000h': [50, 50],
        'wind_u-1000h': [100, 100], 'wind_v-1000h': [100, 100] });
    const r = sampleAltitudeForecast(spot, point, profile, time);
    assert.equal(r.mph, 1 / 0.44704);
    assert.equal(r.reason, 'too-light');
});
test('calm height estimate does not inherit the surface wind direction', () => {
    const { point, profile } = fixture();
    profile.data.data['wind_u-950h'] = [-2, -2];
    const r = sampleAltitudeForecast(spot, point, profile, time);
    assert.equal(r.mph, 0);
    assert.equal(r.reason, 'too-light');
    assert.equal(r.direction, undefined);
    assert.equal(r.surfaceDirection, 270);
});
test('requires matching valid UKV runs and never silently falls back to surface', () => {
    for (const mutate of [
        f => f.profile.data.header.refTime = '2026-10-21T03:00:00Z',
        f => delete f.point.data.header.refTime,
        f => f.profile.data.header.model = 'ECMWF',
        f => f.profile.status = 503,
    ]) {
        const f = fixture(); mutate(f);
        const r = sampleAltitudeForecast(spot, f.point, f.profile, time);
        assert.equal(r.status, 'unavailable');
        assert.equal(r.mph, undefined);
        assert.equal(r.surfaceMph, 2 / 0.44704);
    }
});
test('no extrapolation below model surface, above profile, or outside forecast time', () => {
    for (const elevation of [50, 700]) {
        const f = fixture(); f.point.data.header.elevation = elevation;
        const r = sampleAltitudeForecast(spot, f.point, f.profile, time);
        assert.equal(r.status, 'unavailable');
        assert.equal(r.mph, undefined);
    }
    const f = fixture();
    assert.equal(sampleAltitudeForecast(spot, f.point, f.profile, time - 1).status, 'unavailable');
});
test('missing heights/vectors are not zero, but an exact surface-height match needs no upper level', () => {
    for (const value of [null, undefined, NaN]) {
        const f = fixture(); f.profile.data.data['gh-950h'][0] = value;
        assert.equal(sampleAltitudeForecast(spot, f.point, f.profile, time).status, 'unavailable');
    }
    const f = fixture(); f.point.data.header.elevation = 100;
    delete f.profile.data.data['gh-950h'];
    assert.equal(sampleAltitudeForecast(spot, f.point, f.profile, time).mph, 2 / 0.44704);
});
