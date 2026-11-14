// Research-only three-way football model. No network access, no wagers.
// Inputs are pre-match expected goals from independently validated sources.
// Independent Poisson is a baseline, NOT Dixon-Coles or a calibrated model.
function rate(x) {
  if (typeof x !== 'number' || !Number.isFinite(x) || x <= 0 || x > 8)
    throw new RangeError('Expected goals must be finite and in (0,8]');
}
function pmf(k, lambda) {
  let p=Math.exp(-lambda);
  for(let i=1;i<=k;i++) p*=lambda/i;
  return p;
}
export function threeWayProbabilities(homeXg, awayXg, maxGoals=32) {
  rate(homeXg);rate(awayXg);
  if(!Number.isInteger(maxGoals)||maxGoals<20||maxGoals>60)
    throw new RangeError('maxGoals must be an integer in [20,60]');
  const home=Array.from({length:maxGoals+1},(_,i)=>pmf(i,homeXg));
  const away=Array.from({length:maxGoals+1},(_,i)=>pmf(i,awayXg));
  const total=home.reduce((a,b)=>a+b,0)*away.reduce((a,b)=>a+b,0);
  if(total<.999999) throw new RangeError('Truncation error too large');
  let h=0,d=0,a=0;
  for(let i=0;i<=maxGoals;i++) for(let j=0;j<=maxGoals;j++){
    const p=home[i]*away[j];
    if(i>j)h+=p;else if(i===j)d+=p;else a+=p;
  }
  return {home:h/total,draw:d/total,away:a/total};
}
export function threeWayMarket(odds) {
  if(!odds||!['home','draw','away'].every(k=>typeof odds[k]==='number'&&Number.isFinite(odds[k])&&odds[k]>1))
    throw new RangeError('Three valid decimal odds required');
  const implied=Object.fromEntries(['home','draw','away'].map(k=>[k,1/odds[k]]));
  const overround=implied.home+implied.draw+implied.away;
  return {implied,overround,normalized:Object.fromEntries(Object.entries(implied).map(([k,v])=>[k,v/overround]))};
}
export function assessThreeWay({homeXg,awayXg,odds,modelValidated=false,oddsFresh=false,sourceLicensed=false,minEdge=.03}) {
  const probabilities=threeWayProbabilities(homeXg,awayXg);
  const market=threeWayMarket(odds);
  if(typeof minEdge!=='number'||!Number.isFinite(minEdge)||minEdge<0||minEdge>1)throw new RangeError('Invalid minEdge');
  const estimatedROI=Object.fromEntries(Object.keys(probabilities).map(k=>[k,probabilities[k]*odds[k]-1]));
  const reasons=[];
  if(!modelValidated)reasons.push('model_not_validated');
  if(!oddsFresh)reasons.push('odds_not_fresh');
  if(!sourceLicensed)reasons.push('source_rights_unverified');
  const best=Object.keys(estimatedROI).sort((x,y)=>estimatedROI[y]-estimatedROI[x])[0];
  if(estimatedROI[best]<minEdge)reasons.push('insufficient_estimated_edge');
  return {probabilities,market,estimatedROI,bestOutcome:best,decision:reasons.length?'reject':'paper_review_only',reasons};
}
