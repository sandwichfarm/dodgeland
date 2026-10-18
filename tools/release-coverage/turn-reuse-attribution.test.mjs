import test from 'node:test';
import assert from 'node:assert/strict';
import {turnReuseAttribution} from '../../tests/turn-reuse-attribution.mjs';

test('reuse adapter rejects missing overlap and stale completed wrappers without dispatch',async()=>{
 let calls=0;const adapter=await turnReuseAttribution({mode:'race',factory:()=>++calls,Coordinator:class{},lifetimes:2});
 await assert.rejects(()=>adapter.finish(),/Incomplete/);
 const first=adapter.lifetime();assert.throws(()=>adapter.lifetime(),/Overlapping/);
 first.acquire();first.interval('first',()=>calls++);first.finish();
 const second=adapter.lifetime(),before=calls;
 assert.throws(()=>first.acquire(),/Finished/);assert.throws(()=>first.interval('late',()=>calls++),/Finished/);assert.throws(()=>first.finish(),/Duplicate/);assert.equal(calls,before);
 await assert.rejects(()=>adapter.finish(),/Incomplete/);
 second.acquire();second.interval('second',()=>calls++);second.finish();await adapter.finish();
});
