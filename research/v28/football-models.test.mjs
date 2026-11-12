import test from 'node:test';
import assert from 'node:assert/strict';
import {poissonPmf,matchProbabilities,eloExpected,eloUpdate,weightedXg} from './football-models.mjs';
test('Poisson zero goals',()=>assert.ok(Math.abs(poissonPmf(0,1)-Math.exp(-1))<1e-12));
test('symmetric teams',()=>{const p=matchProbabilities(1.3,1.3);assert.ok(Math.abs(p.home-p.away)<1e-10);assert.ok(Math.abs(p.home+p.away+p.draw-1)<1e-10)});
test('Dixon-Coles perturbation',()=>{const p=matchProbabilities(1.2,1.1,{rho:-.1});assert.ok(p.draw>0 && p.draw<1)});
test('Elo',()=>{assert.equal(eloExpected(1500,1500),.5);assert.equal(eloUpdate(1500,.5,1,20),1510)});
test('weighted xG',()=>assert.deepEqual(weightedXg([2,1],[1,2],[3,1]),{for:1.75,against:1.25}));
test('invalid values',()=>{assert.throws(()=>matchProbabilities(-1,1));assert.throws(()=>weightedXg([1],[1],[0]))});
