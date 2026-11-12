// V28 research-only football models. No network access, no betting actions.
function factorial(n) { let v=1; for(let i=2;i<=n;i++)v*=i; return v; }
export function poissonPmf(goals, lambda) {
  if (!Number.isInteger(goals) || goals<0 || !(lambda>=0) || !Number.isFinite(lambda)) throw new RangeError('Invalid goals/lambda');
  return Math.exp(-lambda)*Math.pow(lambda,goals)/factorial(goals);
}
export function dixonColesAdjustment(homeGoals,awayGoals,homeLambda,awayLambda,rho=0) {
  if (![homeLambda,awayLambda,rho].every(Number.isFinite) || homeLambda<0 || awayLambda<0) throw new RangeError('Invalid inputs');
  if(homeGoals===0 && awayGoals===0)return 1-homeLambda*awayLambda*rho;
  if(homeGoals===0 && awayGoals===1)return 1+homeLambda*rho;
  if(homeGoals===1 && awayGoals===0)return 1+awayLambda*rho;
  if(homeGoals===1 && awayGoals===1)return 1-rho;
  return 1;
}
export function matchProbabilities(homeLambda,awayLambda,{rho=0,maxGoals=12}={}) {
  if (!(homeLambda>0 && awayLambda>0) || !Number.isInteger(maxGoals) || maxGoals<3 || maxGoals>30) throw new RangeError('Invalid model parameters');
  let home=0,draw=0,away=0,total=0;
  for(let h=0;h<=maxGoals;h++)for(let a=0;a<=maxGoals;a++){
    const weight=poissonPmf(h,homeLambda)*poissonPmf(a,awayLambda)*dixonColesAdjustment(h,a,homeLambda,awayLambda,rho);
    if(weight<0)throw new RangeError('Dixon-Coles rho produces negative probability');
    total+=weight;
    if(h>a)home+=weight;else if(h===a)draw+=weight;else away+=weight;
  }
  if(total<=0)throw new RangeError('No probability mass');
  return {home:home/total,draw:draw/total,away:away/total,tailMass:Math.max(0,1-total)};
}
export function eloExpected(homeRating,awayRating,homeAdvantage=0) {
  if(![homeRating,awayRating,homeAdvantage].every(Number.isFinite))throw new RangeError('Invalid rating');
  return 1/(1+Math.pow(10,(awayRating-homeRating-homeAdvantage)/400));
}
export function eloUpdate(rating,expected,actual,k=20) {
  if(![rating,expected,actual,k].every(Number.isFinite)||expected<0||expected>1||actual<0||actual>1||k<0)throw new RangeError('Invalid rating update');
  return rating+k*(actual-expected);
}
export function weightedXg(forValues,againstValues,weights) {
  if(!forValues.length||forValues.length!==againstValues.length||forValues.length!==weights.length)throw new RangeError('Invalid series');
  let w=0,f=0,a=0;
  for(let i=0;i<weights.length;i++){
    if(![forValues[i],againstValues[i],weights[i]].every(Number.isFinite)||forValues[i]<0||againstValues[i]<0||weights[i]<0)throw new RangeError('Invalid xG');
    w+=weights[i];f+=weights[i]*forValues[i];a+=weights[i]*againstValues[i];
  }
  if(w<=0)throw new RangeError('Zero total weight');
  return {for:f/w,against:a/w};
}
