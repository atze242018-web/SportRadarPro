import test from 'node:test';
import assert from 'node:assert/strict';
import {marketComparison,wilson,calibrationExperiment,observations,qualityFlags} from '../app/src/main/assets/web/quality-core.mjs';
import {newAccount,placeTicket,validateAccount,draftInput} from '../app/src/main/assets/web/demo-core.mjs';
import {curatedDraft} from '../app/src/main/assets/web/prepared.mjs';
import {createDemo} from '../app/src/main/assets/web/demo.mjs';
const now=Date.parse('2026-10-31T10:00Z');
const legs=[1,2].map(i=>({id:'nba:'+i,key:'nba',date:'2026-11-01T00:00Z',pick:'Team '+i,odds:null}));
test('market baseline removes overround and does not replace the model',()=>{const m=marketComparison([1.8,2.1],[.6,.4],0);assert.ok(Math.abs(m.fair[0]+m.fair[1]-1)<1e-12);assert.ok(m.overround>0);assert.ok(Math.abs(m.expectedReturn-.08)<1e-10);assert.throws(()=>marketComparison([1.5,0],null,0));assert.equal(marketComparison([1.3,6.2,8],null,0).edge,null);});
test('Wilson interval reflects small sample uncertainty',()=>{assert.equal(wilson(0,0),null);const [lo,hi]=wilson(1,1);assert.ok(lo<.3);assert.ok(hi>.99);});
test('ML uses earlier settled training cases and later unseen outcomes',()=>{const rows=Array.from({length:80},(_,i)=>({p:.9,y:i%2,created:now+i*86400000,settled:now+i*86400000+3600000}));const e=calibrationExperiment(rows);assert.equal(e.ready,true);assert.equal(e.train,60);assert.equal(e.test,20);assert.equal(e.better,true);assert.equal(calibrationExperiment(rows.map(r=>({...r,settled:now+100*86400000}))).ready,false);assert.equal(calibrationExperiment(rows.slice(0,79)).ready,false);});
test('diagnostics exclude manual outcomes and overlapping events',()=>{const t={id:'one',createdAt:new Date(now).toISOString(),settledAt:new Date(now+86400000).toISOString(),legs,modelChance:.7,result:'won',settlementSource:'ESPN-Endergebnis'};const r=observations([t,{...t,id:'two'},{...t,id:'three',settlementSource:'manuell'}],now+2*86400000);assert.equal(r.rows.length,1);assert.equal(r.excluded,2);});
test('backup rejects corrupted legs, odds products and probabilities',()=>{const a=placeTicket(newAccount(now),draftInput({legs},[1.5,1.6],500),now);assert.doesNotThrow(()=>validateAccount(a));for(const mutate of [a=>a.tickets[0].legs[0].pick=null,a=>a.tickets[0].odds=99,a=>a.tickets[0].modelChance=2]){const b=structuredClone(a);mutate(b);assert.throws(()=>validateAccount(b));}});
test('curated transfer supplies both picks but never stale model confidence',()=>{const d=curatedDraft(now);assert.equal(d.legs.length,2);assert.equal(d.modelChance,null);assert.throws(()=>curatedDraft(Date.parse('2026-11-01T01:00Z')));});
test('prepared tips transfer to demo before prices; reservation occurs only on confirmation',async()=>{
 const realDocument=globalThis.document,realStorage=globalThis.localStorage;
 const handlers={},store=new Map(),elements={};
 globalThis.document={addEventListener:(n,f)=>handlers[n]=f,getElementById:id=>elements[id]};globalThis.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
 try{let message='';const demo=createDemo({notify:m=>message=m,changed:()=>{}});const future=Date.now()+86400000;const d={modelChance:.7,legs:legs.map(l=>({...l,date:new Date(future).toISOString()}))};assert.equal(demo.prepare(d),true);let a=JSON.parse(store.get('sportradar.demo.account.v1'));assert.equal(a.tickets.length,0);assert.equal(a.draft.legs.length,2);assert.match(demo.html(),/Deine vorbereitete 2er-Kombi/);elements['draft-confirm']={checked:true};elements['draft-odds-0']={value:'1,5'};elements['draft-odds-1']={value:'1.6'};await handlers.click({target:{closest:s=>s==='[data-demo-start]'?{}:null}});a=JSON.parse(store.get('sportradar.demo.account.v1'));assert.equal(a.tickets.length,1);assert.equal(a.tickets[0].legs[0].pick,'Team 1');assert.equal(a.tickets[0].stakeCents,500);assert.equal(a.draft,null);assert.match(message,/Demo-Kombi gespeichert/);
 }finally{globalThis.document=realDocument;globalThis.localStorage=realStorage;}
});
test('missing data remains visible in quality checks',()=>{const flags=qualityFlags({probabilities:null,checkedAt:null,teams:[{games:[],injuryCoverage:false}]});assert.ok(flags.includes('Kein numerisches Prognosemodell'));assert.ok(flags.includes('Ausfälle unvollständig'));});
