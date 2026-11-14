// SportRadar football diagnostic utilities. No network, bets, or account actions.
// All outputs are aggregate counts only. Use with real pipeline stages, never fabricate fixtures.
export function footballFunnel(events, {nowMs = Date.now(), maxAgeMs = 90_000} = {}) {
  if (!Array.isArray(events)) throw new TypeError("events must be an array");
  const counts = {found:0, missingTeams:0, missingKickoff:0, alreadyStarted:0,
    missingPrediction:0, invalidProbability:0, missingOdds:0, invalidOdds:0,
    staleOdds:0, marketMismatch:0, rejectedByPolicy:0, eligibleForPaperReview:0};
  for (const event of events) {
    counts.found++;
    if (!event || !event.home || !event.away) { counts.missingTeams++; continue; }
    const kickoff = Date.parse(event.kickoff);
    if (!Number.isFinite(kickoff)) { counts.missingKickoff++; continue; }
    if (kickoff <= nowMs) { counts.alreadyStarted++; continue; }
    if (event.prediction == null) { counts.missingPrediction++; continue; }
    if (typeof event.prediction !== "number" || !Number.isFinite(event.prediction) ||
        event.prediction < 0 || event.prediction > 1) { counts.invalidProbability++; continue; }
    if (event.odds == null) { counts.missingOdds++; continue; }
    if (typeof event.odds !== "number" || !Number.isFinite(event.odds) || event.odds <= 1) {
      counts.invalidOdds++; continue;
    }
    if (!Number.isFinite(event.oddsFetchedAtMs) ||
        event.oddsFetchedAtMs > nowMs + 5_000 ||
        nowMs - event.oddsFetchedAtMs > maxAgeMs) { counts.staleOdds++; continue; }
    if (event.market !== "1X2" || !["home","draw","away"].includes(event.selection)) {
      counts.marketMismatch++; continue;
    }
    if (event.policyApproved !== true) { counts.rejectedByPolicy++; continue; }
    counts.eligibleForPaperReview++;
  }
  return {schema:"sportradar.football-funnel.v1", counts,
    note:"Diagnostic only; eligibility does not authorize placing even demo tickets"};
}
export function expectedValue(probability, decimalOdds) {
  if (!Number.isFinite(probability) || probability < 0 || probability > 1 ||
      !Number.isFinite(decimalOdds) || decimalOdds <= 1) throw new RangeError("Invalid probability or odds");
  return probability * decimalOdds - 1;
}
export function brierScore(predictions, outcomes) {
  if (!Array.isArray(predictions) || !Array.isArray(outcomes) ||
      predictions.length === 0 || predictions.length !== outcomes.length) throw new RangeError("Invalid sample");
  let sum=0;
  for (let i=0;i<predictions.length;i++) {
    const p=predictions[i], y=outcomes[i];
    if (!Number.isFinite(p) || p<0 || p>1 || (y!==0 && y!==1)) throw new RangeError("Invalid sample value");
    sum+=(p-y)**2;
  }
  return sum/predictions.length;
}
