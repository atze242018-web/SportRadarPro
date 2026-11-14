export const FEEDS={
 nba:{name:'NBA',sport:'basketball',icon:'🏀',path:'basketball/nba',scope:'Sieger inklusive Verlängerung'},
 nfl:{name:'NFL',sport:'american',icon:'🏈',path:'football/nfl',scope:'Sieger inklusive Verlängerung; Remis-Regeln prüfen'},
 nhl:{name:'NHL',sport:'hockey',icon:'🏒',path:'hockey/nhl',scope:'Sieger inklusive Verlängerung / Shootout'},
 mlb:{name:'MLB',sport:'baseball',icon:'⚾',path:'baseball/mlb',scope:'Sieger inklusive Extra Innings; Pitcher-Regeln prüfen'},
 bl1:{name:'Bundesliga',sport:'football',icon:'⚽',path:'soccer/ger.1',scope:'Sieger nach 90 Minuten'},
 epl:{name:'Premier League',sport:'football',icon:'⚽',path:'soccer/eng.1',scope:'Sieger nach 90 Minuten'},
 liga:{name:'La Liga',sport:'football',icon:'⚽',path:'soccer/esp.1',scope:'Sieger nach 90 Minuten'},
 atp:{name:'ATP Einzel',sport:'tennis',icon:'🎾',path:'tennis/atp',scope:'Matchsieger; Aufgabe-Regeln prüfen'},
 wta:{name:'WTA Einzel',sport:'tennis',icon:'🎾',path:'tennis/wta',scope:'Matchsieger; Aufgabe-Regeln prüfen'}
};
export function sourceURL(key,resource='scoreboard',params={}){if(!FEEDS[key]||!['scoreboard','summary'].includes(resource))throw Error('Unbekannte Datenquelle');return `https://site.api.espn.com/apis/site/v2/sports/${FEEDS[key].path}/${resource}?${new URLSearchParams(params)}`;}
export function dateKey(date=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(date).replaceAll('-','');}
export function safeLink(raw){try{const u=new URL(raw);return u.protocol==='https:'&&(u.hostname==='espn.com'||u.hostname.endsWith('.espn.com')||u.hostname==='site.api.espn.com')?u.href:null;}catch{return null;}}
export function normalizeBoard(raw,key,now=Date.now()){
 if(!FEEDS[key]||!Array.isArray(raw.events)||raw.events.length>500)throw Error('Ungültige Spielantwort');const rows=[];
 for(const e of raw.events){const comps=FEEDS[key].sport==='tennis'?(e.groupings||[]).filter(g=>/singles/.test(g.grouping?.slug||'')).flatMap(g=>g.competitions||[]):e.competitions||[];
 for(const c of comps){const status=c.status||e.status,stamp=Date.parse(c.date||e.date);if(status?.type?.state!=='pre'||status.type.completed||!Number.isFinite(stamp)||stamp<=now||stamp>now+72*3600000||c.competitors?.length!==2)continue;
 const parts=[...c.competitors].sort((a,b)=>(a.homeAway==='home'?0:1)-(b.homeAway==='home'?0:1));
 const teams=parts.map(x=>({id:String(x.id),name:String(x.team?.displayName||x.athlete?.displayName||''),records:(x.records||[]).map(r=>({type:r.type,summary:r.summary})),form:String(x.form||''),rank:x.curatedRank?.current||null}));
 if(teams.some(t=>!t.name||!t.id))continue;const id=String(c.id||e.id);if(!/^\d+(?:-\d+)?$/.test(id))continue;
 rows.push({id:key+':'+id,eventId:String(e.id),competitionId:id,key,date:new Date(stamp).toISOString(),teams,source:safeLink((e.links||[]).find(x=>x.rel?.includes('summary'))?.href||(e.links||[]).find(x=>x.rel?.includes('gamecast'))?.href)||sourceURL(key,'scoreboard',{dates:dateKey(new Date(stamp))}),rawOdds:c.odds||[],status:'pre'});
 }}return [...new Map(rows.map(r=>[r.id,r])).values()];
}
const numeric=x=>x!==null&&x!==undefined&&String(x).trim()!==''&&Number.isFinite(Number(x))?Number(x):null;
export function recordInfo(team,sport){const r=team.records.find(x=>x.type==='total')?.summary;if(!r)return null;const nums=r.split('-').map(Number);if(nums.length<2||nums.some(x=>!Number.isFinite(x)||x<0))return null;const n=nums.reduce((a,b)=>a+b,0);if(!n)return null;const wins=nums[0],draws=sport==='football'?(nums[1]||0):sport==='american'?(nums[2]||0):0;return {text:r,n,rate:(wins+.5*draws)/n};}
export function deriveAnalysis(row,data,now=Date.now()){
 const feed=FEEDS[row.key],teamDetails=row.teams.map(t=>{const h=(data.lastFiveGames||[]).find(g=>String(g.team?.id)===t.id);const games=(h?.events||[]).filter(g=>Date.parse(g.gameDate||g.date)<now).sort((a,b)=>Date.parse(b.gameDate||b.date)-Date.parse(a.gameDate||a.date)).slice(0,5).map(g=>({date:g.gameDate||g.date,result:g.gameResult||g.result||'?',score:g.score||'',opponent:g.opponent?.displayName||g.opponent?.abbreviation||'Gegner',url:safeLink(g.links?.[0]?.href)}));const injuryGroup=(data.injuries||[]).find(g=>String(g.team?.id)===t.id);const injuries=(injuryGroup?.injuries||[]).slice(0,12).map(i=>({name:i.athlete?.displayName||'Spieler',status:i.status||i.type?.description||'Status offen',detail:i.details?.type||i.type?.detail||''}));return {...t,record:recordInfo(t,feed.sport),games,injuries,injuryCoverage:Boolean(injuryGroup),lastDate:games.length?games.map(g=>Date.parse(g.date)).filter(Number.isFinite).sort((a,b)=>b-a)[0]:null};});
 let probabilities=null,probabilitySource=null;const pred=data.predictor;
 if(pred){const values=row.teams.map(t=>{const p=[pred.homeTeam,pred.awayTeam].find(x=>String(x?.id)===t.id);return numeric(p?.gameProjection);});if(values.every(p=>p!==null&&p>=0&&p<=100)&&values.reduce((a,b)=>a+b,0)<=100.5&&values.reduce((a,b)=>a+b,0)>=95){probabilities=values.map(x=>x/100);probabilitySource='ESPN Matchup Predictor';}}
 let pick=null,basis='Keine belastbare Sieg-Tendenz';if(probabilities){pick=probabilities[0]>=probabilities[1]?0:1;basis='Externes Prognosemodell';}else{const records=teamDetails.map(x=>x.record);if(records.every(x=>x&&x.n>=5)&&Math.abs(records[0].rate-records[1].rate)>=.18){pick=records[0].rate>records[1].rate?0:1;basis='Saisonbilanz · vorläufige Tendenz, keine Siegprognose';}}
 const warnings=['Tipico-Verfügbarkeit und genaue Wettregeln noch prüfen.','Keine vollständige Web- oder KI-Recherche; strukturierte ESPN-Datenanalyse.'];if(!teamDetails.every(x=>x.injuryCoverage))warnings.push('Ausfallinformationen sind mindestens für eine Seite nicht geliefert.');else warnings.push('Ausfalllisten sind unvollständig möglich und werden nicht in die Modellzahl eingerechnet.');if(!probabilities)warnings.push('Keine Sieg-Wahrscheinlichkeit geliefert; 50-%-Risikoziel nicht berechenbar.');if(feed.sport==='tennis')warnings.push('Belag, Aufgabe-Regeln und aktuelle Fitness nicht vollständig geprüft.');if(feed.sport==='hockey')warnings.push('Starttorhüter und 60-Minuten-/Shootout-Regeln vor Auswahl prüfen.');warnings.push('Prognosequalität für diese App noch nicht rückgetestet.');
 const news=(data.news?.articles||[]).slice(0,4).map(a=>({title:String(a.headline||''),url:safeLink(a.links?.web?.href||a.links?.api?.news?.href)})).filter(x=>x.url&&x.title);
 return {...row,teams:teamDetails,pick,probabilities,probabilitySource,basis,warnings,news,checkedAt:new Date(now).toISOString(),sourceSummary:sourceURL(row.key,'summary',{event:row.eventId})};
}
export function buildCombos(analyses,{size=2,maxRisk=.5,buffer=.05,now=Date.now()}={}){
 if(![2,3].includes(size)||maxRisk<0||maxRisk>.5||buffer<0||buffer>.2)throw Error('Ungültige Kombi-Einstellung');
 const candidates=analyses.filter(a=>FEEDS[a.key]?.sport!=='football'&&a.pick!==null&&a.probabilities&&Date.parse(a.date)>now&&now-Date.parse(a.checkedAt)<600000&&Date.parse(a.checkedAt)<=now+300000).sort((a,b)=>b.probabilities[b.pick]-a.probabilities[a.pick]).slice(0,24),out=[];
 function walk(start,chosen){if(chosen.length===size){const p=chosen.reduce((v,a)=>v*a.probabilities[a.pick],1),lower=chosen.reduce((v,a)=>v*Math.max(0,a.probabilities[a.pick]-buffer),1);if(1-lower<=maxRisk)out.push({legs:chosen,p,lower,risk:1-lower});return;}for(let i=start;i<candidates.length;i++){const a=candidates[i];if(chosen.some(b=>b.id===a.id||b.teams.some(t=>a.teams.some(u=>t.name===u.name))))continue;walk(i+1,[...chosen,a]);}}
 walk(0,[]);return out.sort((a,b)=>a.risk-b.risk).slice(0,3);
}
