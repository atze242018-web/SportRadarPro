import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateForecasts} from './forecast-evaluation.mjs';
const row={eventId:'provider:1',league:'test',modelVersion:'poisson-v1',trainedThrough:'2026-01-01T00:00:00Z',predictedAt:'2026-01-02T00:00:00Z',kickoff:'2026-01-03T00:00:00Z',resultAvailableAt:'2026-01-03T02:00:00Z',resultVerified:true,outcome:'home',probabilities:{home:.6,draw:.25,away:.15},marketProbabilities:{home:.5,draw:.3,away:.2}};
const options={asOf:'2026-01-04T00:00:00Z'};
test('proper threeway scores and comparison use the same matches',()=>{
 const r=evaluateForecasts([row,{...row,eventId:'provider:2',marketProbabilities:null}],options);
 assert.equal(r.accepted,2);assert.equal(r.overall.paired.model.n,1);assert.equal(r.overall.paired.market.n,1);
 assert.ok(Math.abs(r.overall.model.brier-.245)<1e-12);assert.ok(Math.abs(r.overall.model.logLoss+Math.log(.6))<1e-12);
 assert.equal(r.overall.missingMarket,1);assert.equal(r.byLeague.test.model.n,2);
});
test('training after prediction, live predictions and unavailable results excluded',()=>{
 for(const change of [{trainedThrough:row.predictedAt},{predictedAt:row.kickoff},{resultAvailableAt:'2026-01-05T00:00:00Z'},{resultAvailableAt:row.predictedAt}]){
  assert.equal(evaluateForecasts([{...row,...change}],options).accepted,0);
 }
});
test('duplicate snapshots all excluded; input is preserved',()=>{
 const before=JSON.stringify(row);const r=evaluateForecasts([row,{...row,outcome:'away'}],options);
 assert.equal(r.accepted,0);assert.equal(r.rejected.duplicate_event,2);assert.equal(JSON.stringify(row),before);
});
test('two-way numbers, naive dates and unverified outcomes rejected',()=>{
 for(const change of [{probabilities:{home:.8,away:.2}},{kickoff:'2026-01-03T00:00:00'},{resultVerified:false}])assert.equal(evaluateForecasts([{...row,...change}],options).accepted,0);
 assert.throws(()=>evaluateForecasts([row],{asOf:'invalid'}));
});
