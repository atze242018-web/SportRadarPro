/* SportRadar football diagnostics: dependency-free, demo-only. */
export function poisson1x2(homeGoals, awayGoals, maxGoals = 12) {
  if (![homeGoals, awayGoals].every(x => Number.isFinite(x) && x > 0 && x <= 8)) throw new RangeError("Expected goals must be finite and in (0,8]");
  const pmf = (mean) => { const p=[Math.exp(-mean)]; for(let i=1;i<=maxGoals;i++)p.push(p[i-1]*mean/i);return p; };
  const h=pmf(homeGoals),a=pmf(awayGoals);
  let home=0,draw=0,away=0,total=0;
  for(let i=0;i<=maxGoals;i++)for(let j=0;j<=maxGoals;j++){const p=h[i]*a[j];total+=p;if(i>j)home+=p;else if(i===j)draw+=p;else away+=p;}
  return {home:home/total,draw:draw/total,away:away/total,method:"independent-poisson",truncatedTail:Math.max(0,1-total)};
}
export function decimalOddsValue(probability, odds) {
  if(!Number.isFinite(probability)||probability<0||probability>1||!Number.isFinite(odds)||odds<=1)throw new RangeError("Invalid probability or decimal odds");
  return {breakEvenProbability:1/odds, expectedReturnPerUnit:probability*odds-1, fairOdds:probability===0?null:1/probability};
}
export function diagnoseFootballFixture(fixture, options={}) {
  const reasons=[];
  if(!fixture||typeof fixture!=="object")return {eligible:false,reasons:["INVALID_FIXTURE"]};
  if(!fixture.homeTeam||!fixture.awayTeam)reasons.push("MISSING_TEAM");
  const start=Date.parse(fixture.kickoffUtc);
  const now=options.nowUtc?Date.parse(options.nowUtc):Date.now();
  if(!Number.isFinite(start))reasons.push("INVALID_KICKOFF");
  else if(start<=now)reasons.push("NOT_UPCOMING");
  if(!fixture.source)reasons.push("MISSING_SOURCE");
  if(!Number.isFinite(fixture.homeExpectedGoals)||!Number.isFinite(fixture.awayExpectedGoals))reasons.push("MISSING_GOAL_ESTIMATES");
  else if(fixture.homeExpectedGoals<=0||fixture.awayExpectedGoals<=0||fixture.homeExpectedGoals>8||fixture.awayExpectedGoals>8)reasons.push("INVALID_GOAL_ESTIMATES");
  const odds=fixture.odds1x2;
  if(!odds||![odds.home,odds.draw,odds.away].every(x=>Number.isFinite(x)&&x>1))reasons.push("MISSING_OR_INVALID_1X2_ODDS");
  if(options.requireVerifiedResult&&fixture.resultVerified!==true)reasons.push("RESULT_NOT_VERIFIED");
  return {eligible:reasons.length===0,reasons};
}
export function footballPipelineReport(fixtures, options={}) {
  if(!Array.isArray(fixtures))throw new TypeError("fixtures must be an array");
  const counts={}, accepted=[];
  for(const f of fixtures){const d=diagnoseFootballFixture(f,options);if(d.eligible)accepted.push(f);else for(const r of d.reasons)counts[r]=(counts[r]||0)+1;}
  return {total:fixtures.length,eligible:accepted.length,rejected:fixtures.length-accepted.length,reasonCounts:counts,eligibleFixtures:accepted};
}
