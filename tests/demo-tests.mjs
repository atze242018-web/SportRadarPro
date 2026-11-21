import test from 'node:test';
import assert from 'node:assert/strict';
import {newAccount,accountStats,placeTicket,settleTicket,validateAccount,legResult} from '../app/src/main/assets/web/demo-core.mjs';
const now=Date.parse('2026-10-31T18:00Z');
const legs=[1,2].map(i=>({id:'nba:'+i,key:'nba',eventId:String(i),competitionId:String(i),date:'2026-11-01T00:00Z',pick:'Home '+i,pickId:'h'+i,teamIds:['h'+i,'a'+i],odds:1.5}));
test('100 euros start, stake reservation and winning payout use cents',()=>{let a=newAccount(now);assert.equal(accountStats(a).balance,10000);a=placeTicket(a,{stakeCents:500,legs},now);assert.equal(accountStats(a).balance,9500);assert.equal(accountStats(a).open,500);a=settleTicket(a,a.tickets[0].id,'won','test',now);assert.equal(accountStats(a).balance,10625);assert.equal(accountStats(a).profit,625);assert.equal(accountStats(a).open,0);});
test('loss, void and repeated settlement cannot create extra credit',()=>{let a=placeTicket(newAccount(now),{stakeCents:1000,legs},now);a=settleTicket(a,a.tickets[0].id,'lost');assert.equal(accountStats(a).balance,9000);a=settleTicket(a,a.tickets[0].id,'won');assert.equal(accountStats(a).balance,9000);let b=placeTicket(newAccount(now),{stakeCents:1000,legs},now);b=settleTicket(b,b.tickets[0].id,'void');assert.equal(accountStats(b).balance,10000);});
test('insufficient balance, invalid odds, duplicate and begun games rejected',()=>{const a=newAccount(now);assert.throws(()=>placeTicket(a,{stakeCents:10001,legs},now));assert.throws(()=>placeTicket(a,{stakeCents:100,legs:[legs[0],legs[0]]},now));assert.throws(()=>placeTicket(a,{stakeCents:100,legs:[{...legs[0],odds:0},legs[1]]},now));assert.throws(()=>placeTicket(a,{stakeCents:100,legs},now+86400000));assert.throws(()=>validateAccount({...a,initialCents:100000}));});
test('automatic settlement requires final status and exact competitor identity',()=>{const d={header:{competitions:[{id:'1',date:'2026-11-01T00:00Z',status:{type:{completed:true,state:'post',name:'STATUS_FINAL'}},competitors:[{id:'h1',winner:true},{id:'a1',winner:false}]}]}};assert.equal(legResult(legs[0],d,now+86400000),'won');assert.equal(legResult({...legs[0],teamIds:['other','a1']},d,now+86400000),null);d.header.competitions[0].status.type.completed=false;assert.equal(legResult(legs[0],d,now+86400000),null);});

test('confirmed 90-minute football draws settle a team-win leg as a loss',()=>{
 const leg={...legs[0],key:'bl1'};
 const game={
  id:leg.competitionId,date:leg.date,status:{period:2,type:{completed:true,state:'post',name:'STATUS_FULL_TIME'}},
  competitors:[{id:'h1',score:'1'},{id:'a1',score:'1'}]
 };
 const final=Date.parse(leg.date)+7200000;
 const result=()=>legResult(leg,{header:{competitions:[game]}},final);
 assert.equal(result(),'lost');
 game.competitors[0].score='2';
 assert.equal(result(),'won');
 game.status.period=3;
 assert.equal(result(),null);
 game.status.period=2;
 game.status.type.name='STATUS_CANCELED';
 assert.equal(result(),null);
 game.status.type.name='STATUS_FINAL';
 game.competitors[0].score=null;
 assert.equal(result(),null);
 game.competitors[0].score='2';
 game.date='2026-11-01T00:30Z';
 assert.equal(result(),null);
});
