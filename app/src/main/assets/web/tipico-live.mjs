export const TIPICO_SPORTS={nba:'basketball',nfl:'football',mlb:'baseball',bl1:'soccer',epl:'soccer',liga:'soccer',atp:'tennis',wta:'tennis'};
const norm=v=>String(v??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const aliases=new Map([['bayern munich','bayern munchen'],['fc bayern munchen','bayern munchen'],['1 fc koln','fc koln'],['cologne','fc koln'],['borussia monchengladbach','borussia monchengladbach']]);
const canonical=v=>{const n=norm(v);return aliases.get(n)||n;};
export function tipicoURL(sport){if(!new Set(Object.values(TIPICO_SPORTS)).has(sport))throw Error('Sportart für Tipico-Abruf nicht freigegeben.');return 'https://sports.tipico.de/v1/tpapi/programgateway/program/events/hourEvents/48?language=de&maxMarkets=1&selectedSports='+sport;}
export function matchTipico(leg,data,sport,fetchedAt=Date.now(),now=Date.now()){
 if(TIPICO_SPORTS[leg.key]!==sport)return {error:'Sport oder Marktumfang wird nicht automatisch zugeordnet.'};
 if(!Number.isFinite(fetchedAt)||now-fetchedAt>90000||fetchedAt>now+5000)return {error:'Tipico-Abruf ist veraltet.'};
 const d=data?.UPCOMING;if(!d||d.live!==false||d.source!=='UPCOMING'||!d.events||!d.matchOddGroups)return {error:'Unbekanntes Tipico-Datenformat.'};
 const names=Array.isArray(leg.teamNames)?leg.teamNames:String(leg.name||'').split(' – ');
 if(names.length!==2||!names.every(n=>canonical(n)))return {error:'Beide Mannschaftsnamen fehlen.'};
 const wanted=names.map(canonical).sort().join('|'),pick=canonical(leg.pick),start=Date.parse(leg.date);
 if(!Number.isFinite(start)||start<=now)return {error:'Spiel hat begonnen oder Startzeit fehlt.'};
 const events=Object.values(d.events);if(events.length>5000)return {error:'Tipico-Antwort zu groß.'};
 const found=events.filter(e=>e&&e.status==='pre_match'&&Number.isFinite(e.eventStartTime)&&e.eventStartTime>now&&Math.abs(e.eventStartTime-start)<=120000&&[canonical(e.team1),canonical(e.team2)].sort().join('|')===wanted);
 if(found.length!==1)return {error:found.length?'Mehrere passende Tipico-Spiele; keine automatische Zuordnung.':'Kein eindeutiger Tipico-Treffer für Namen und Startzeit innerhalb der nächsten 48 Stunden.'};
 const e=found[0],groups=d.matchOddGroups[String(e.id)]?.standard;
 if(!Array.isArray(groups)||groups.length!==1)return {error:'Kein eindeutiger Standard-Siegermarkt.'};
 const m=groups[0],rs=m.results;
 if(m.originalMarketName!=='standard'||m.section!=null||m.fixedParamText!=null||m.halfTimeResult!=null||!Array.isArray(rs)||m.suspended===true||m.active===false)return {error:'Sondermarkt oder gesperrter Markt; nicht übernommen.'};
 const soccer=sport==='soccer',expected=soccer?['1','2','X']:['1','2'];
 if(rs.length!==expected.length||new Set(rs.map(r=>r.choiceParam)).size!==expected.length||rs.some(r=>!expected.includes(r.choiceParam)||r.caption!==r.choiceParam||!Number.isFinite(r.quoteFloatValue)||r.quoteFloatValue<=1||r.quoteFloatValue>1000||r.active===false||r.suspended===true))return {error:'Marktregeln oder Quoten passen nicht zum Tipp.'};
 const slot=pick===canonical(e.team1)?'1':pick===canonical(e.team2)?'2':null,chosen=rs.find(r=>r.choiceParam===slot);
 if(!chosen)return {error:'Gewählte Mannschaft passt nicht zum Markt.'};
 return {odds:chosen.quoteFloatValue,tipicoEventId:String(e.id),tipicoMarketId:String(m.id),tipicoOutcomeId:String(chosen.id),tipicoSport:sport,tipicoMarket:soccer?'Tipp 1X2 · reguläre Spielzeit':'Tipp 2-Wege · gesamtes Spiel',quoteSource:'Tipico · automatischer öffentlicher Abruf',quoteFetchedAt:new Date(fetchedAt).toISOString(),tipicoScopeVerified:true,tipicoAllOdds:rs.map(r=>({outcome:canonical(names[0])===canonical(e.team1)?r.choiceParam:({'1':'2','2':'1','X':'X'})[r.choiceParam],odds:r.quoteFloatValue})),quoteURL:tipicoURL(sport)};
}
export function createTipicoClient(bridge=globalThis.window?.SportRadarAndroid){
 const cache=new Map(),pending=new Map(),inflight=new Map();
 if(typeof window!=='undefined')window.addEventListener('tipico-program',e=>{const d=e.detail,p=pending.get(d?.requestId);if(!p)return;pending.delete(d.requestId);clearTimeout(p.timer);if(d.error)p.reject(Error(d.error));else{const v={data:d.data,fetchedAt:d.fetchedAt};cache.set(p.sport,v);p.resolve(v);}});
 const available=()=>typeof bridge?.readTipicoProgram==='function';
 async function load(sport){tipicoURL(sport);if(!available())throw Error('Automatische Tipico-Quoten benötigen die Android-App ab Version 0.4.');const c=cache.get(sport);if(c&&Date.now()-c.fetchedAt<30000)return c;if(inflight.has(sport))return inflight.get(sport);
 const requestId=crypto.randomUUID();const promise=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(requestId);reject(Error('Tipico-Abruf hat zu lange gedauert.'));},45000);pending.set(requestId,{sport,resolve,reject,timer});try{bridge.readTipicoProgram(sport,requestId);}catch(e){clearTimeout(timer);pending.delete(requestId);reject(e);}}).finally(()=>inflight.delete(sport));inflight.set(sport,promise);return promise;}
 async function quotes(legs){const sports=[...new Set(legs.map(l=>TIPICO_SPORTS[l.key]).filter(Boolean))],data=new Map();await Promise.all(sports.map(async sport=>{try{data.set(sport,await load(sport));}catch(e){data.set(sport,{error:e.message});}}));return legs.map(l=>{const sport=TIPICO_SPORTS[l.key],r=data.get(sport);return !sport?{error:'Kein geprüfter Tipico-Marktadapter für diese Sportart.'}:r.error?{error:r.error}:matchTipico(l,r.data,sport,r.fetchedAt);});}
 return {available,quotes};
}
export const tipicoClient=createTipicoClient();

export function stripTipicoQuote(leg){const copy={...leg};for(const key of Object.keys(copy))if(key.startsWith('tipico')||['quoteFetchedAt','quoteURL'].includes(key))delete copy[key];return copy;}
