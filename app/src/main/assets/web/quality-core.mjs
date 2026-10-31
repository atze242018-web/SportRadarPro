// Local, reproducible diagnostics. No external service or credentials.
const clamp=p=>Math.min(1-1e-6,Math.max(1e-6,p));
export function marketComparison(odds,probabilities,pick){
 if(!Array.isArray(odds)||![2,3].includes(odds.length)||odds.some(q=>!Number.isFinite(q)||q<=1||q>1000))throw Error('Alle zwei oder drei Marktquoten zwischen 1 und 1000 eingeben.');
 const total=odds.reduce((s,q)=>s+1/q,0),fair=odds.map(q=>1/q/total);
 const p=probabilities?.[pick];return {overround:total-1,fair,edge:Number.isFinite(p)?p-fair[pick]:null,expectedReturn:Number.isFinite(p)?p*odds[pick]-1:null};
}
export function wilson(wins,n){if(!n)return null;const z=1.959963984540054,p=wins/n,d=1+z*z/n,c=(p+z*z/(2*n))/d,h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return [Math.max(0,c-h),Math.min(1,c+h)];}
export function scores(rows,predict=r=>r.p){if(!rows.length)return null;let b=0,l=0;for(const r of rows){const p=clamp(predict(r));b+=(p-r.y)**2;l-=r.y*Math.log(p)+(1-r.y)*Math.log(1-p);}return {n:rows.length,brier:b/rows.length,logLoss:l/rows.length};}
export function observations(tickets,now=Date.now()){
 // Keep the earliest ticket for each event set. Overlapping combinations are not independent trials.
 const used=new Set(),rows=[];let excluded=0;
 for(const t of [...tickets].sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt))){
  const created=Date.parse(t.createdAt),settled=Date.parse(t.settledAt),ids=t.legs?.map(l=>l.id)||[];
  if(!['won','lost'].includes(t.result)||!Number.isFinite(t.modelChance)||t.modelChance<=0||t.modelChance>=1||!Number.isFinite(created)||!Number.isFinite(settled)||settled>now||settled<created||ids.length<2||t.legs.some(l=>Date.parse(l.date)<=created||!Number.isFinite(Date.parse(l.date)))||t.settlementSource!=='ESPN-Endergebnis'){excluded++;continue;}
  if(ids.some(id=>used.has(id))){excluded++;continue;}ids.forEach(id=>used.add(id));rows.push({p:t.modelChance,y:t.result==='won'?1:0,created,settled,id:t.id});
 }return {rows,excluded};
}
function fit(rows){let a=0,b=1;const rate=.08;for(let step=0;step<1800;step++){let da=0,db=0;for(const r of rows){const x=Math.log(clamp(r.p)/(1-clamp(r.p))),e=1/(1+Math.exp(-(a+b*x)))-r.y;da+=e;db+=e*x;}a-=rate*(da/rows.length+.02*a);b-=rate*(db/rows.length+.02*(b-1));}return {a,b};}
export function calibrated(p,model){const x=Math.log(clamp(p)/(1-clamp(p)));return 1/(1+Math.exp(-(model.a+model.b*x)));}
export function calibrationExperiment(rows){
 const ordered=[...rows].sort((a,b)=>a.created-b.created);
 if(ordered.length<80)return {ready:false,reason:`${ordered.length} unabhängige, automatisch abgerechnete Kombis. Mindestens 80 erforderlich.`};
 const cut=Math.floor(ordered.length*.75),test=ordered.slice(cut),cutoff=test[0].created;
 const train=ordered.slice(0,cut).filter(r=>r.settled<cutoff);
 if(train.length<60||test.length<20||train.filter(r=>r.y===1).length<5||train.filter(r=>r.y===0).length<5)return {ready:false,reason:'Zu wenige vor dem Prüfzeitraum abgeschlossene Trainingsfälle oder zu wenig Siege/Niederlagen.'};
 const model=fit(train),baseline=scores(test),candidate=scores(test,r=>calibrated(r.p,model));
 return {ready:true,train:train.length,test:test.length,model,baseline,candidate,better:candidate.brier<baseline.brier&&candidate.logLoss<baseline.logLoss,cutoff};
}
export function diagnostics(tickets,now=Date.now()){
 const {rows,excluded}=observations(tickets,now),wins=rows.filter(r=>r.y===1).length;
 const bins=Array.from({length:5},(_,i)=>{const a=i/5,b=(i+1)/5,rs=rows.filter(r=>r.p>=a&&(r.p<b||i===4));return {from:a,to:b,n:rs.length,p:rs.length?rs.reduce((s,r)=>s+r.p,0)/rs.length:null,actual:rs.length?rs.reduce((s,r)=>s+r.y,0)/rs.length:null};});
 return {n:rows.length,wins,excluded,interval:wilson(wins,rows.length),score:scores(rows),bins,experiment:calibrationExperiment(rows)};
}
export function qualityFlags(a,now=Date.now()){const flags=[];if(!a.probabilities)flags.push('Kein numerisches Prognosemodell');if(!a.teams.every(t=>t.injuryCoverage))flags.push('Ausfälle unvollständig');if(!a.teams.every(t=>t.games?.length>=5))flags.push('Weniger als fünf Formspiele geliefert');if(!Number.isFinite(Date.parse(a.checkedAt))||now-Date.parse(a.checkedAt)>600000)flags.push('Daten älter als zehn Minuten oder Datum fehlt');flags.push('Bestätigte Aufstellung nicht automatisch geprüft');return flags;}
