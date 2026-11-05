import test from 'node:test';import assert from 'node:assert/strict';
import {thermalScenario,estimateThermalUpdraft,thermalAtHeight} from '../src/thermalUpdraft.ts';
const makeProfile=(delta=0)=>({timestamp:0,terrainM:0,levels:Array.from({length:21},(_,i)=>{const z=i*100,p=1000*Math.exp(-z/8500);return{pressureHpa:p,heightM:z,temperatureC:20-z*.0098+delta,dewPointC:-10-z*.002,windMps:4,windDirection:220};})});
test('a warm dry parcel accelerates in m/s; zero temperature excess does not invent lift in a neutral column',()=>{
 const p=makeProfile();const warm=thermalScenario(p,{radiusM:100,excessK:3});
 assert.ok(warm.points.length>3);assert.equal(warm.points[0].speedMps,0);assert.ok(warm.points[3].speedMps>0);
 assert.ok(warm.points.every(p=>Number.isFinite(p.speedMps)&&p.speedMps>=0));
 const neutral={...p,levels:p.levels.map(l=>({...l,temperatureC:(293.15*Math.pow(l.pressureHpa/1000,287/1005))-273.15}))};
 const result=thermalScenario(neutral,{radiusM:100,excessK:0});assert.ok(result.points.every(p=>p.speedMps<.05));
});
test('entrainment/radius scenarios produce ordered bounds without claiming a statistical confidence interval',()=>{
 const result=estimateThermalUpdraft(makeProfile());assert.equal(result.status,'available');
 const point=thermalAtHeight(result,300);assert.ok(point.speedMps>0);assert.ok(point.lowMps<=point.highMps);assert.ok(point.speedMps>=point.lowMps&&point.speedMps<=point.highMps);
 assert.equal(result.initialExcessK,3);assert.equal(result.radiusM,100);
});
test('calculation stops at condensation rather than projecting dry ascent into a cloud',()=>{
 const p=makeProfile();p.levels.forEach(l=>l.dewPointC=l.temperatureC-.2);
 const result=thermalScenario(p,{radiusM:100,excessK:3});
 assert.equal(result.endReason,'condensation');assert.ok(result.points.at(-1).heightM<1000);
});
test('missing moisture or known gaps do not generate a curve beyond the missing layer',()=>{
 const p=makeProfile();delete p.levels[1].dewPointC;
 const result=thermalScenario(p,{radiusM:100,excessK:3});assert.equal(result.endReason,'missing');assert.ok(result.points.at(-1).heightM<100);
 const gap=makeProfile();gap.levels[2].gapBefore=true;const broken=thermalScenario(gap,{radiusM:100,excessK:3});assert.equal(broken.endReason,'missing');assert.ok(broken.points.at(-1).heightM<=100);
 const absent=makeProfile();delete absent.levels[0].dewPointC;assert.equal(estimateThermalUpdraft(absent).status,'unavailable');
});
test('sampling does not extrapolate above condensation or beyond the profile',()=>{
 const result=estimateThermalUpdraft(makeProfile());assert.equal(thermalAtHeight(result,3000),undefined);assert.equal(thermalAtHeight(result,-10),undefined);
});

test('unsupported scenario inputs and impossible saturation pressure are not presented as valid lift',()=>{
 assert.throws(()=>thermalScenario(makeProfile(),{radiusM:0,excessK:3}),/assumptions/);
 const p=makeProfile();p.levels.forEach((l,i)=>{l.pressureHpa=100-i;l.temperatureC=75;l.dewPointC=-10;});
 assert.equal(thermalScenario(p,{radiusM:100,excessK:3}).endReason,'missing');
});
