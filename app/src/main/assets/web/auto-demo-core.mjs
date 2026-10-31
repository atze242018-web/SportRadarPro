import {accountStats} from './demo-core.mjs';
import {dateKey} from './multisport.mjs';
const norm=v=>String(v||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function identities(l){const names=l.teamNames||String(l.name||'').split(' – ');return [l.id,'pair:'+l.key+':'+dateKey(new Date(l.date))+':'+names.map(norm).sort().join('|')];}
export function selectAutomatic(account,candidates,now=Date.now()){
 const used=new Set(account.tickets.flatMap(t=>t.legs.flatMap(identities))),day=dateKey(new Date(now));
 const daily=account.tickets.filter(t=>t.automatic&&dateKey(new Date(t.createdAt))===day).length,open=account.tickets.filter(t=>t.result===null).length;
 let balance=accountStats(account).balance,slots=Math.max(0,Math.min(3-daily,3-open));const selected=[];
 for(const c of candidates){if(!slots||balance<account.defaultStakeCents)break;
 if(!Number.isFinite(c.modelChance)||c.modelChance<=0||c.modelChance>=1||!Number.isFinite(c.bufferedChance)||c.bufferedChance<.5||c.bufferedChance>c.modelChance||!Array.isArray(c.legs)||![2,3].includes(c.legs.length))continue;
 if(c.legs.some(l=>!Number.isFinite(Date.parse(l.date))))continue;
 const keys=c.legs.flatMap(identities);if(new Set(keys).size!==keys.length||keys.some(k=>used.has(k)))continue;
 if(c.legs.some(l=>!l.tipicoEventId||l.tipicoScopeVerified!==true||!Number.isFinite(l.odds)||l.odds<=1||l.odds>1000||!Number.isFinite(Date.parse(l.quoteFetchedAt))||now-Date.parse(l.quoteFetchedAt)>90000||Date.parse(l.quoteFetchedAt)>now+5000||!Number.isFinite(Date.parse(l.date))||Date.parse(l.date)<=now))continue;
 selected.push({...c,automatic:true});keys.forEach(k=>used.add(k));balance-=account.defaultStakeCents;slots--;
 }return {selected,daily,open,balance,reason:daily>=3?'Tageslimit erreicht':open>=3?'Drei Kombis sind bereits offen':accountStats(account).balance<account.defaultStakeCents?'Guthaben reicht nicht für den Standardeinsatz':selected.length?'Passende virtuelle Tests ausgewählt':'Keine neue, eindeutig bepreiste Kombi erfüllt die Regeln'};
}
