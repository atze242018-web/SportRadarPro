import test from 'node:test';
import assert from 'node:assert/strict';
import {threeWayProbabilities,threeWayMarket,assessThreeWay} from './football-threeway.mjs';
test('three way probabilities sum to one',()=>{
 const p=threeWayProbabilities(1.6,1.1);
 assert.ok(Math.abs(p.home+p.draw+p.away-1)<1e-10);
 assert.ok(p.home>p.away);assert.ok(p.draw>0);
});
test('equal teams symmetric and draw remains',()=>{
 const p=threeWayProbabilities(1.4,1.4);
 assert.ok(Math.abs(p.home-p.away)<1e-10);
 assert.ok(p.draw>.1);
});
test('overround normalized market',()=>{
 const m=threeWayMarket({home:2,draw:3.5,away:4});
 assert.ok(m.overround>1);
 assert.ok(Math.abs(Object.values(m.normalized).reduce((a,b)=>a+b,0)-1)<1e-10);
});
test('fail closed until model and source validated',()=>{
 const a=assessThreeWay({homeXg:1.5,awayXg:1,odds:{home:2,draw:4,away:6}});
 assert.equal(a.decision,'reject');assert.ok(a.reasons.includes('model_not_validated'));
});
test('reject missing draw market and invalid xg',()=>{
 assert.throws(()=>threeWayMarket({home:2,away:4}));
 assert.throws(()=>threeWayProbabilities(-1,1));
});
