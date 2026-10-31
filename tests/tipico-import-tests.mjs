import test from 'node:test';
import assert from 'node:assert/strict';
import {extractTipicoQuotes} from '../app/src/main/assets/web/tipico-import.mjs';
const legs=[{id:'b',pick:'Bayern München'},{id:'f',pick:'Eintracht Frankfurt'}];
test('Tipico selected slips map quotes by exact chosen name',()=>{const m=extractTipicoQuotes({text:'10,00 €\nTipp: Bayern München 1,30\nBayern München - Dortmund\nTipp: Eintracht Frankfurt\n1,52\n01.11.2026 17:30'},legs);assert.deepEqual(m.map(x=>x?.odds),[1.3,1.52]);});
test('OCR geometry connects the quote beside its selection, regardless of block order',()=>{const lines=[{text:'1,52',x:610,y:950,w:60,h:30},{text:'Tipp: Bayern München',x:80,y:720,w:420,h:32},{text:'1,30',x:610,y:721,w:60,h:30},{text:'Tipp: Eintracht Frankfurt',x:80,y:950,w:420,h:32}];assert.deepEqual(extractTipicoQuotes({text:'',lines},legs).map(m=>m?.odds),[1.3,1.52]);});
test('generic grids, cashout, currency, partial names and duplicate appearances do not auto-map',()=>{for(const text of ['Bayern München\nTipp\n1 1,75 X 2,80 2 6,50','Cashout 5,81 €','Tipp: Bayern Mün 1,30','Tipp: Bayern München 10,00 €','Tipp: Bayern München 1,30\nTipp: Bayern München 1,30'])assert.equal(extractTipicoQuotes({text},legs)[0],null);});
test('multiple same-row prices and malformed image geometry remain unassigned',()=>{assert.equal(extractTipicoQuotes({text:'Tipp: Bayern München 1,30 1,52'},legs)[0],null);assert.equal(extractTipicoQuotes({text:'',lines:[{text:'Tipp: Bayern München',x:0,y:0,w:NaN,h:1}]},legs)[0],null);});
