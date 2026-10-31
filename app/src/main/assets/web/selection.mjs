import {analyze,fingerprint} from './core.mjs';
// Imported reports are inputs, not validated predictors. No risk guarantee.
export function suggest(cases,now=Date.now(),maxRisk=.5){
 const excluded=[],candidates=[];
 for(const c of cases){let reason='';const r=c.analysis,a=analyze(c);
 if(c.demo||c.phase!=='pre'||!Number.isFinite(Date.parse(c.start))||Date.parse(c.start)<=now||Date.parse(c.start)>now+48*3600000)reason='Kein kommendes Vorab-Spiel innerhalb von 48 Stunden';
 else if(a.errors.length||!a.hasP)reason='Vollständige Quoten oder Wahrscheinlichkeiten fehlen';
 else if(!r||r.caseFingerprint!==fingerprint(c)||!r.sources?.length)reason='Passender Recherchebericht mit Quellen fehlt';
 else if(!Number.isFinite(Date.parse(r.createdAt))||now-Date.parse(r.createdAt)>6*3600000||Date.parse(r.createdAt)>now+300000)reason='Recherchebericht ist nicht aktuell';
 else if(now-Date.parse(c.observedAt)>1800000||Date.parse(c.observedAt)>now+300000)reason='Quoten älter als 30 Minuten oder Zeit ungültig';
 else if(!(Number(c.uncertainty)>=5))reason='Mindestens fünf Prozentpunkte Rechenpuffer nötig';
 if(reason){excluded.push({id:c.id,name:c.a+' – '+c.b,reason});continue;}
 // Only winner markets; no same-event or shared-team combinations.
 if(!['1x2','winner'].includes(c.market)){excluded.push({id:c.id,name:c.a+' – '+c.b,reason:'Nur Siegermärkte werden kombiniert'});continue;}
 const ranked=a.rows.map((r,i)=>({...r,index:i})).filter(r=>c.market!=='1x2'||r.index!==1).sort((x,y)=>y.lower-x.lower);
 const row=ranked[0];if(row?.lower>0)candidates.push({c,row});
 }
 const combos=[];
 for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++){
 const x=candidates[i],y=candidates[j];
 if(x.c.sport!==y.c.sport||[x.c.a,x.c.b].some(t=>[y.c.a,y.c.b].includes(t))||x.c.feed?.matchId&&x.c.feed.matchId===y.c.feed?.matchId)continue;
 const p=x.row.p*y.row.p,buffered=x.row.lower*y.row.lower,odds=x.row.odds*y.row.odds;
 // Also require positive buffered expected value. No forced daily tip.
 if(1-buffered<=maxRisk&&buffered*odds>1)combos.push({legs:[x,y],p,buffered,odds,risk:1-buffered,ev:buffered*odds-1});
 }
 return {combos:combos.sort((a,b)=>a.risk-b.risk||b.ev-a.ev).slice(0,3),excluded,candidates:candidates.length};
}
