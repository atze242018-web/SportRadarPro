import {poisson,makeCase,fingerprint} from './core.mjs';
export const LEAGUES={bl1:'1. Bundesliga',bl2:'2. Bundesliga'};
export const SCOPE='Reguläre Spielzeit (90 Minuten)';
export const MODEL='Tor-Basismodell v1';
export function seasonFor(now=Date.now()){const d=new Date(now);return d.getUTCFullYear()-(d.getUTCMonth()<6?1:0);}
export function feedURL(league,season){if(!LEAGUES[league]||!Number.isInteger(season)||season<2000||season>2100)throw new Error('Liga oder Saison ungültig.');return `https://api.openligadb.de/getmatchdata/${league}/${season}`;}
export function normalizeMatches(raw,league,season){if(!Array.isArray(raw)||raw.length>600)throw new Error('Unerwartete Antwort der Datenquelle.');const seen=new Set();return raw.flatMap(m=>{const id=m?.matchID,a=m?.team1,b=m?.team2,time=Date.parse(m?.matchDateTimeUTC);if(!Number.isInteger(id)||seen.has(id)||!Number.isInteger(a?.teamId)||!Number.isInteger(b?.teamId)||a.teamId===b.teamId||typeof a.teamName!=='string'||typeof b.teamName!=='string'||!a.teamName.trim()||!b.teamName.trim()||!Number.isFinite(time)||m.leagueShortcut!==league||Number(m.leagueSeason)!==season)return [];seen.add(id);const ends=Array.isArray(m.matchResults)?m.matchResults.filter(r=>r.resultTypeID===2&&(!r.resultTypeKind||r.resultTypeKind==='After90Minutes')):[];const e=ends.length===1?ends[0]:null;const score=e&&[e.pointsTeam1,e.pointsTeam2].every(n=>Number.isInteger(n)&&n>=0&&n<=30)?[e.pointsTeam1,e.pointsTeam2]:null;return [{id,league,season,start:new Date(time).toISOString(),a:a.teamName.slice(0,120),b:b.teamName.slice(0,120),aId:a.teamId,bId:b.teamId,finished:m.matchIsFinished===true,score,round:String(m.group?.groupName||''),sourceUpdated:String(m.lastUpdateDateTime||'')}];}).sort((a,b)=>Date.parse(a.start)-Date.parse(b.start));}
export function baseline(match,matches,now=Date.now()){
 if(match.finished||Date.parse(match.start)<=now)return {error:'Berechnung nur vor Spielbeginn. Keine rückwirkenden oder Live-Prognosen.'};
 const hist=matches.filter(m=>m.finished&&m.score&&m.id!==match.id&&m.league===match.league&&m.season===match.season&&Date.parse(m.start)<Math.min(now,Date.parse(match.start)));
 const ah=hist.filter(m=>m.aId===match.aId||m.bId===match.aId).slice(-20),bh=hist.filter(m=>m.aId===match.bId||m.bId===match.bId).slice(-20);
 if(hist.length<30||ah.length<5||bh.length<5)return {error:'Noch zu wenig Saisonhistorie: mindestens 30 Ligaspiele und 5 Spiele je Team nötig.',n:hist.length,aN:ah.length,bN:bh.length};
 const gh=hist.reduce((s,m)=>s+m.score[0],0)/hist.length,ga=hist.reduce((s,m)=>s+m.score[1],0)/hist.length;
 if(gh<.05||ga<.05)return {error:'Ligatore reichen für eine stabile Berechnung nicht aus.'};
 // Venue-specific rates, shrunk toward league mean with 8 pseudo-matches.
 const homes=hist.filter(m=>m.aId===match.aId).slice(-10),aways=hist.filter(m=>m.bId===match.bId).slice(-10);
 const rate=(xs,i,prior)=>(xs.reduce((s,m)=>s+m.score[i],0)+8*prior)/(xs.length+8);
 const lambdaA=Math.max(.05,Math.min(6,rate(homes,0,gh)*rate(aways,0,gh)/gh));
 const lambdaB=Math.max(.05,Math.min(6,rate(aways,1,ga)*rate(homes,1,ga)/ga));
 const probabilities=poisson(lambdaA,lambdaB).map(x=>x/100);
 return {probabilities,lambdaA,lambdaB,n:hist.length,aN:ah.length,bN:bh.length,homeN:homes.length,awayN:aways.length,latest:hist.at(-1).start,model:MODEL};
}
export function caseFromMatch(m,matches,now=Date.now()){
 if(Date.parse(m.start)<=now||m.finished)throw new Error('Dieses Spiel hat bereits begonnen. Es wird kein neuer Vorab-Test angelegt.');
 const p=baseline(m,matches,now),c=makeCase();Object.assign(c,{a:m.a,b:m.b,competition:LEAGUES[m.league]+' '+m.season+'/'+(m.season+1),start:m.start,scope:SCOPE,feed:{provider:'openligadb',matchId:m.id,aId:m.aId,bId:m.bId,league:m.league,season:m.season,start:m.start},notesA:p.error?'Saisonhistorie noch unzureichend.':`${p.aN} abgeschlossene Spiele von ${m.a}; ${p.homeN} Heimspiele für die Torberechnung.`,notesB:p.error?'Saisonhistorie noch unzureichend.':`${p.bN} abgeschlossene Spiele von ${m.b}; ${p.awayN} Auswärtsspiele für die Torberechnung.`,sources:feedURL(m.league,m.season),context:'Automatische Ergebnisdaten: OpenLigaDB. Aufstellungen, Verletzungen, xG und Wettquoten fehlen. Ungeprüftes Tor-Basismodell; kein bestätigter Wettvorteil.'});
 if(!p.error){c.probabilities=p.probabilities.map(x=>Math.round(x*10000)/100);c.probabilities[2]=Math.round((100-c.probabilities[0]-c.probabilities[1])*100)/100;c.modelSnapshot={...p,createdAt:new Date(now).toISOString()};}
 return c;
}
export function settlement(c,m,now=Date.now()){
 const f=c.feed;if(!f||f.provider!=='openligadb'||!c.paper||c.demo||c.result!==null||c.market!=='1x2'||c.scope!==SCOPE||c.phase!=='pre')return null;
 if(!m.finished||!m.score||m.id!==f.matchId||m.league!==f.league||m.season!==f.season||m.aId!==f.aId||m.bId!==f.bId||m.a!==c.a||m.b!==c.b||m.start!==c.start||m.start!==f.start)return null;
 const kickoff=Date.parse(m.start);if(!Number.isFinite(kickoff)||kickoff>now||!Number.isFinite(Date.parse(c.paper.createdAt))||Date.parse(c.paper.createdAt)>=kickoff)return null;
 const result=m.score[0]>m.score[1]?0:m.score[0]===m.score[1]?1:2;
 return {...c,result,resultSource:{provider:'openligadb',matchId:m.id,score:m.score,checkedAt:new Date(now).toISOString(),source:feedURL(m.league,m.season)}};
}
