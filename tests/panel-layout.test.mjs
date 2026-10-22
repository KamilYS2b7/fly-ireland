import assert from 'node:assert/strict';
import test from 'node:test';
import { availablePanelHeight } from '../src/panelLayout.ts';

test('panel shrinks above an expanded forecast and grows above a collapsed timeline', () => {
    assert.equal(availablePanelHeight(84,800,[{top:500,bottom:800}]),392);
    assert.equal(availablePanelHeight(84,800,[{top:740,bottom:800}]),632);
    assert.equal(availablePanelHeight(84,800,[]),692);
});
test('uses the highest visible bottom control and ignores offscreen controls', () => {
    assert.equal(availablePanelHeight(84,800,[{top:600,bottom:800},{top:720,bottom:800},{top:900,bottom:950}]),492);
    assert.equal(availablePanelHeight(84,800,[{top:-50,bottom:0}]),692);
    assert.equal(availablePanelHeight(84,800,[{top:50,bottom:800}]),0);
});
test('leaves clearance above controls protruding above the forecast table', () => {
    const height = availablePanelHeight(64,1256,[{top:1012,bottom:1256},{top:984,bottom:1022}]);
    assert.equal(64 + height,960);
});
