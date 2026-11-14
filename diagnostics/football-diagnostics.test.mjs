import test from "node:test";
import assert from "node:assert/strict";
import {footballFunnel, expectedValue, brierScore} from "./football-diagnostics.mjs";
const now = Date.parse("2026-11-14T12:00:00Z");
const valid = {home:"A",away:"B",kickoff:"2026-11-14T13:00:00Z",prediction:.55,
  odds:2.1,oddsFetchedAtMs:now-10_000,market:"1X2",selection:"home",policyApproved:true};
test("valid football event is counted without placing tickets",()=>{
  assert.equal(footballFunnel([valid],{nowMs:now}).counts.eligibleForPaperReview,1);
});
test("missing odds and stale odds have separate counters",()=>{
  const r=footballFunnel([{...valid,odds:null},{...valid,oddsFetchedAtMs:now-100_000}],{nowMs:now});
  assert.equal(r.counts.missingOdds,1);assert.equal(r.counts.staleOdds,1);
});
test("soccer three-way market is required",()=>{
  assert.equal(footballFunnel([{...valid,market:"1X2",selection:"draw"}],{nowMs:now}).counts.eligibleForPaperReview,1);
  assert.equal(footballFunnel([{...valid,market:"2way"}],{nowMs:now}).counts.marketMismatch,1);
});
test("EV and calibration metrics",()=>{
  assert.ok(Math.abs(expectedValue(.55,2)-.1)<1e-10);
  assert.ok(Math.abs(brierScore([.8,.2],[1,0])-.04)<1e-10);
  assert.throws(()=>expectedValue(1.2,2));
});
