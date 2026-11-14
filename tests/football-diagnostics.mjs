import test from 'node:test';
import assert from 'node:assert/strict';
import {poisson1x2,decimalOddsValue,diagnoseFootballFixture,footballPipelineReport} from '../src/football/diagnostics.mjs';
test('Poisson probabilities sum to one',()=>{const p=poisson1x2(1.5,1.1);assert.ok(Math.abs(p.home+p.draw+p.away-1)<1e-12);assert.ok(p.home>p.away);});
test('Fair odds and break-even',()=>{const v=decimalOddsValue(.5,2);assert.equal(v.expectedReturnPerUnit,0);assert.equal(v.breakEvenProbability,.5);});
test('Reject incomplete soccer feed with explicit reasons',()=>{const r=diagnoseFootballFixture({homeTeam:'A',awayTeam:'B',kickoffUtc:'2030-01-01T12:00:00Z',source:'demo'},{nowUtc:'2026-11-14T12:00:00Z'});assert.ok(r.reasons.includes('MISSING_GOAL_ESTIMATES'));assert.ok(r.reasons.includes('MISSING_OR_INVALID_1X2_ODDS'));});
test('Count rejected fixtures',()=>{const r=footballPipelineReport([{}],{nowUtc:'2026-11-14T12:00:00Z'});assert.equal(r.total,1);assert.equal(r.eligible,0);assert.equal(r.reasonCounts.MISSING_TEAM,1);});
