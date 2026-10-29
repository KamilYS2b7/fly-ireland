import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateWind } from '../src/windForecast.ts';

const spot = { id: 'test', lat: 54.8, lon: -6.1, sectorStart: 145, sectorEnd: 180 };
const timestamp = Date.UTC(2026, 9, 22, 12);
function vector(mph, direction) {
    const radians = direction * Math.PI / 180;
    return [-mph * 0.44704 * Math.sin(radians), -mph * 0.44704 * Math.cos(radians), 0];
}

test('wind direction is meteorological FROM direction, with a 15 mph inclusive limit', () => {
    for (const mph of [13, 13.001, 14, 14.999, 15]) {
        assert.equal(evaluateWind(spot, vector(mph, 180)).status, 'pass', `${mph} mph is within the limit`);
    }
    assert.equal(evaluateWind(spot, vector(15.001, 180)).reason, 'too-strong');
    assert.equal(evaluateWind(spot, vector(10, 160)).status, 'pass');
    assert.equal(evaluateWind(spot, vector(10, 340)).status, 'fail');
    assert.equal(evaluateWind(spot, vector(14, 340)).reason, 'direction');
});

test('requires at least 5 mph and distinguishes light wind from missing data', () => {
    for (const mph of [0, 1, 4.999]) {
        const reading = evaluateWind(spot, vector(mph, 160));
        assert.equal(reading.status, 'fail');
        assert.equal(reading.reason, 'too-light');
    }
    assert.equal(evaluateWind(spot, vector(5, 160)).status, 'pass');
    assert.equal(evaluateWind(spot, vector(5.001, 160)).status, 'pass');
    assert.equal(evaluateWind(spot, vector(15.001, 160)).reason, 'too-strong');
    assert.equal(evaluateWind(spot, vector(8, 250)).reason, 'direction');
    assert.equal(evaluateWind(spot, [0, 0]).direction, undefined);
});

test('sector endpoints and north-crossing ranges are handled without rounding first', () => {
    const north = { ...spot, sectorStart: 340, sectorEnd: 20 };
    for (const direction of [340, 0, 360, 20]) {
        assert.equal(evaluateWind(north, vector(8, direction)).status, 'pass');
    }
    for (const direction of [339.9, 20.1, 180]) {
        assert.equal(evaluateWind(north, vector(8, direction)).status, 'fail');
    }
    assert.equal(evaluateWind(spot, vector(8, 145)).status, 'pass');
    assert.equal(evaluateWind(spot, vector(8, 144.99)).status, 'fail');
    assert.equal(evaluateWind({ ...spot, sectorStart: 0, sectorEnd: 360 }, vector(8, 270)).status, 'pass');
});

test('invalid values remain unavailable rather than being treated as light wind', () => {
    for (const values of [null, undefined, -1, NaN, [], [NaN, 1], [1, Infinity], [null, 1]]) {
        assert.equal(evaluateWind(spot, values).status, 'unavailable');
    }
});

