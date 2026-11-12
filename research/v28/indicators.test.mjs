import test from 'node:test';
import assert from 'node:assert/strict';
import {expectedValue,impliedProbability,brierScore,logLoss,calibrationBins,closingLineValue,fractionalKelly,exposureReport,walkForwardSplit} from './indicators.mjs';
test('expected value and implied odds',()=>{assert.ok(Math.abs(expectedValue(.6,1.8)-.08)<1e-10);assert.ok(Math.abs(impliedProbability(2)-.5)<1e-10)});
test('calibration scores',()=>{assert.equal(brierScore([{probability:1,outcome:1},{probability:0,outcome:0}]),0);assert.ok(logLoss([{probability:.8,outcome:1}])>0);assert.equal(calibrationBins([{probability:.6,outcome:1}])[6].count,1)});
test('closing odds and conservative risk',()=>{assert.ok(closingLineValue(2.1,2)>0);assert.ok(fractionalKelly(.6,1.8)<=.01);assert.equal(exposureReport(100,85).exceedsLimit,true)});
test('chronological folds',()=>{const folds=walkForwardSplit([1,2,3,4,5,6],2,2);assert.deepEqual(folds[0],{train:[1,2],test:[3,4]});assert.equal(folds.length,2)});
test('invalid inputs fail closed',()=>{assert.throws(()=>expectedValue(1.2,2));assert.throws(()=>brierScore([{probability:.5,outcome:2}]));});
