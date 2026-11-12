// SportRadar V28: standalone, read-only paper analytics (no orders, no network).
// Probabilities must be calibrated out-of-sample before use for decisions.
export function expectedValue(probability, decimalOdds) {
  if (!(probability >= 0 && probability <= 1) || !(decimalOdds > 1)) throw new RangeError("Invalid probability or odds");
  return probability * decimalOdds - 1;
}
export function impliedProbability(decimalOdds) {
  if (!(decimalOdds > 1)) throw new RangeError("Invalid odds");
  return 1 / decimalOdds;
}
export function brierScore(samples) {
  if (!samples.length) return null;
  return samples.reduce((s, x) => {
    if (!(x.probability >= 0 && x.probability <= 1) || ![0, 1].includes(x.outcome)) throw new RangeError("Invalid sample");
    return s + (x.probability - x.outcome) ** 2;
  }, 0) / samples.length;
}
export function logLoss(samples) {
  if (!samples.length) return null;
  const epsilon = 1e-12;
  return samples.reduce((s, x) => {
    if (!(x.probability >= 0 && x.probability <= 1) || ![0, 1].includes(x.outcome)) throw new RangeError("Invalid sample");
    const p = Math.min(1 - epsilon, Math.max(epsilon, x.probability));
    return s - x.outcome * Math.log(p) - (1 - x.outcome) * Math.log(1 - p);
  }, 0) / samples.length;
}
export function calibrationBins(samples, binCount = 10) {
  if (!Number.isInteger(binCount) || binCount < 2) throw new RangeError("Invalid bin count");
  const bins = Array.from({length: binCount}, (_, i) => ({from: i/binCount, to: (i+1)/binCount, count: 0, predictedSum: 0, actualSum: 0}));
  for (const x of samples) {
    if (!(x.probability >= 0 && x.probability <= 1) || ![0, 1].includes(x.outcome)) throw new RangeError("Invalid sample");
    const b = bins[Math.min(binCount-1, Math.floor(x.probability * binCount))];
    b.count++; b.predictedSum += x.probability; b.actualSum += x.outcome;
  }
  return bins.map(({from,to,count,predictedSum,actualSum}) => ({from,to,count,meanPredicted: count ? predictedSum/count : null, observedRate: count ? actualSum/count : null}));
}
export function closingLineValue(entryOdds, closingOdds) {
  if (!(entryOdds > 1 && closingOdds > 1)) throw new RangeError("Invalid odds");
  // Simple odds-ratio proxy, not a de-vigged market probability.
  return entryOdds / closingOdds - 1;
}
export function fractionalKelly(probability, decimalOdds, fraction = 0.25, cap = 0.01) {
  if (!(fraction >= 0 && fraction <= 1) || !(cap >= 0 && cap <= 1)) throw new RangeError("Invalid limits");
  const edge = expectedValue(probability, decimalOdds);
  return Math.min(cap, Math.max(0, fraction * edge / (decimalOdds - 1)));
}
export function exposureReport(bankroll, openStakes, maxFraction = 0.10) {
  if (!(bankroll > 0) || !(openStakes >= 0) || !(maxFraction >= 0 && maxFraction <= 1)) throw new RangeError("Invalid exposure");
  return {openStakes, bankroll, fraction: openStakes / bankroll, limit: bankroll * maxFraction, exceedsLimit: openStakes > bankroll * maxFraction};
}
export function walkForwardSplit(rows, trainCount, testCount) {
  // Caller must supply chronological observations with no shared event leakage.
  if (!Number.isInteger(trainCount) || !Number.isInteger(testCount) || trainCount < 1 || testCount < 1) throw new RangeError("Invalid window");
  const result = [];
  for (let end = trainCount; end + testCount <= rows.length; end += testCount) {
    result.push({train: rows.slice(0,end), test: rows.slice(end,end+testCount)});
  }
  return result;
}
