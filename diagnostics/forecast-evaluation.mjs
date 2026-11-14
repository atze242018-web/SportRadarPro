// Evaluation of frozen pre-match 1X2 forecasts only. No selection or money changes.
const outcomes=['home','draw','away'];
const time=s=>typeof s==='string'&&/(Z|[+-]\d\d:\d\d)$/.test(s)?Date.parse(s):NaN;
function distribution(p){
 return p && outcomes.every(k=>typeof p[k]==='number'&&Number.isFinite(p[k])&&p[k]>=0&&p[k]<=1)
  && Math.abs(outcomes.reduce((sum,k)=>sum+p[k],0)-1)<1e-8;
}
function metrics(rows,field){
 if(!rows.length)return {n:0,brier:null,logLoss:null,correct:0,accuracy:null};
 let brier=0,logLoss=0,correct=0;
 for(const r of rows){
  const p=r[field];
  brier+=outcomes.reduce((sum,k)=>sum+(p[k]-(k===r.outcome?1:0))**2,0);
  logLoss-=Math.log(Math.max(1e-15,p[r.outcome]));
  if(outcomes.reduce((best,k)=>p[k]>p[best]?k:best,'home')===r.outcome)correct++;
 }
 return {n:rows.length,brier:brier/rows.length,logLoss:logLoss/rows.length,correct,accuracy:correct/rows.length};
}
export function evaluateForecasts(rows,{asOf=new Date().toISOString()}={}){
 const now=time(asOf);
 if(!Array.isArray(rows)||!Number.isFinite(now))throw new RangeError('Rows and timezone-aware asOf required');
 const counts=new Map(),rejected={},accepted=[];
 for(const r of rows)if(r?.eventId)counts.set(r.eventId,(counts.get(r.eventId)||0)+1);
 const reject=reason=>{rejected[reason]=(rejected[reason]||0)+1;};
 for(const r of rows){
  if(!r||typeof r.eventId!=='string'||!r.eventId||typeof r.league!=='string'||!r.league||typeof r.modelVersion!=='string'||!r.modelVersion){reject('missing_identity_or_version');continue;}
  if(counts.get(r.eventId)!==1){reject('duplicate_event');continue;}
  const kickoff=time(r.kickoff),predicted=time(r.predictedAt),trained=time(r.trainedThrough),result=time(r.resultAvailableAt);
  if(![kickoff,predicted,trained,result].every(Number.isFinite)){reject('invalid_timestamp');continue;}
  if(!(trained<predicted&&predicted<kickoff&&kickoff<=result&&result<=now)){reject('temporal_leakage_or_unavailable_result');continue;}
  if(r.resultVerified!==true||!outcomes.includes(r.outcome)){reject('unverified_result');continue;}
  if(!distribution(r.probabilities)){reject('invalid_threeway_probabilities');continue;}
  accepted.push(r);
 }
 const report=rs=>{
  const paired=rs.filter(r=>distribution(r.marketProbabilities));
  return {model:metrics(rs,'probabilities'),paired:{model:metrics(paired,'probabilities'),market:metrics(paired,'marketProbabilities')},
   missingMarket:rs.length-paired.length};
 };
 return {schema:'sportradar.forecast-evaluation.v1',asOf,input:rows.length,accepted:accepted.length,rejected,
  overall:report(accepted),byLeague:Object.fromEntries([...new Set(accepted.map(r=>r.league))].map(k=>[k,report(accepted.filter(r=>r.league===k))])),
  limitations:'Input timestamps and frozen provenance must be independently audited. No ROI, calibration fit, selection change or profitability claim. Brier is sum over three outcomes; log loss floor 1e-15; ties use home/draw/away order.'};
}
