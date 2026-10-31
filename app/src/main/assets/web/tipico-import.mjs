const norm=s=>String(s??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const prices=s=>{if(/[€%]|\b\d{1,2}:\d{2}\b|\d{1,2}\.\d{1,2}\.\d{2,4}/.test(s))return [];return [...String(s).matchAll(/(?<![\d.,])\d{1,3}[.,]\d{2}(?![\d.,])/g)].map(m=>Number(m[0].replace(',','.'))).filter(n=>n>1&&n<=1000);};
// Strict import of selected-pick slips. Generic market grids lack a reliable link
// between outcome, period and price and are deliberately not auto-assigned.
export function extractTipicoQuotes(payload,legs){
 const text=String(payload?.text??'');if(text.length>60000||!Array.isArray(legs)||![2,3].includes(legs.length))throw Error('Ungültiger Quotenimport');
 const geometric=Array.isArray(payload.lines)&&payload.lines.length<=3000;
 const lines=geometric?payload.lines.filter(l=>typeof l?.text==='string'&&[l.x,l.y,l.w,l.h].every(Number.isFinite)).map(l=>({...l,n:norm(l.text)})):text.split(/\r?\n/).map((text,i)=>({text,n:norm(text),x:0,y:i,w:0,h:1}));
 return legs.map(leg=>{
  const pick=norm(leg.pick);if(!pick)return null;
  const hits=[];for(let i=0;i<lines.length;i++){
   const l=lines[i];if(!/^tipp\s/.test(l.n)||!(' '+l.n+' ').includes(' '+pick+' '))continue;
   const own=prices(l.text);if(own.length===1){hits.push(own[0]);continue;}
   if(own.length)continue;
   if(geometric){const row=lines.filter((r,j)=>j!==i&&r.x>l.x+l.w-5&&Math.abs((r.y+r.h/2)-(l.y+l.h/2))<=Math.max(l.h,r.h)*.7);const qs=row.flatMap(r=>prices(r.text));if(qs.length===1)hits.push(qs[0]);}
   else{const following=lines[i+1]?.text||'';if(/^\s*\d{1,3}[.,]\d{2}\s*$/.test(following)){const qs=prices(following);if(qs.length===1)hits.push(qs[0]);}}
  }
  // Multiple appearances, even with the same price, need manual disambiguation.
  return hits.length===1?{id:leg.id,pick:leg.pick,odds:hits[0]}:null;
 });
}
