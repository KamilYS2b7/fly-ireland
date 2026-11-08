import test from 'node:test';import assert from 'node:assert/strict';
import {cloudSymbols} from '../src/cloudSymbols.ts';
test('illustrative clouds are deterministic, coverage-dependent and absent from clear or missing fields',()=>{
 assert.deepEqual(cloudSymbols([[0,0],[0,0]]),[]);
 assert.deepEqual(cloudSymbols([[undefined,undefined],[undefined,undefined]]),[]);
 const few=cloudSymbols([[30,30],[30,30]]),many=cloudSymbols([[90,90],[90,90]]);
 assert.ok(many.length>few.length&&few.length>0);
 assert.deepEqual(many,cloudSymbols([[90,90],[90,90]]));
 assert.ok(many.every(p=>p.x>0&&p.x<1&&p.y>0&&p.y<1));
});
