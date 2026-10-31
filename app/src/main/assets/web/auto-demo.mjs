import {selectAutomatic} from './auto-demo-core.mjs';
const KEY='sportradar.autodemo.v1',esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createAutoDemo({finder,demo,available,changed,notify}){
 let enabled=false,busy=false,next=0,lastCheck=0,lastRun=null,status='Ausgeschaltet. Du kannst den automatischen Demotest hier aktivieren.';
 try{enabled=JSON.parse(localStorage.getItem(KEY)||'{}').enabled===true;}catch{}
 function html(){return `<section class="panel form-panel"><div class="eyebrow">AUTOMATISCH · NUR VIRTUELLES GELD</div><h2>Auto-Demokonto</h2><p>${esc(!available()?'Benötigt die Android-App ab Version 0.5.':document.hidden&&enabled?'Pausiert, solange die App nicht sichtbar ist.':status)}</p><p><button class="button ${enabled?'':'primary'}" data-auto-demo-toggle ${!available()?'disabled':''}>${enabled?'Auto-Demo stoppen':'Auto-Demo aktivieren'}</button> ${enabled?`<button class="button small" data-auto-demo-now ${busy?'disabled':''}>Jetzt prüfen</button>`:''}</p><p class="hint">Nach Aktivierung: alle zehn Minuten kommende Spiele analysieren und passende Tipico-Quoten laden; Ergebnisse etwa alle zwei Minuten prüfen. Maximal drei neue Kombis pro deutschem Kalendertag und drei offene Kombis insgesamt. Einsatz ist dein eingestellter virtueller Standardeinsatz. Keine erneute Verwendung derselben Partien. Keine Auswahl wird erzwungen. ${lastRun?'Letzter Durchlauf: '+new Date(lastRun).toLocaleString('de-DE'):''}</p><p class="hint">Läuft bei geöffneter, sichtbarer App und setzt nach erneutem Öffnen fort. Kein Hintergrunddienst. Auswahl aus externen ESPN-Modellzahlen; die lokale Kalibrierungs-KI benötigt erst ausreichend Ergebnisse. Das Rechenziel von mindestens 50 % nach Puffer ist keine bewiesene Trefferquote.</p></section>`;}
 async function tick(force=false){if(!enabled||busy||document.hidden||!available())return;if(finder.isBusy()){status='Warte auf laufende Spiel- oder Quotenanalyse …';changed();return;}busy=true;try{
  if(Date.now()-lastCheck>=120000||force){const previous=status;status='Offene Demo-Ergebnisse werden geprüft …';changed();await demo.check();lastCheck=Date.now();status=previous;}
  if(Date.now()<next&&!force)return;
  const before=selectAutomatic(demo.state(),[]);if(before.daily>=3||before.open>=3||before.reason.includes('Guthaben')){status=before.reason;next=Date.now()+120000;return;}
  status='Suche passende Kombis und lade Tipico-Quoten …';changed();await finder.runAuto();
  if(!enabled||document.hidden){status='Pausiert. Keine neuen Tests gestartet.';return;}
  const decision=selectAutomatic(demo.state(),finder.autoTickets());let count=0;
  for(const t of decision.selected){if(!enabled||document.hidden)break;if(demo.place(t,{preserveDraft:true,silent:true}))count++;}
  status=count?count+' neue Kombi(s) automatisch im Demokonto gestartet.':decision.reason;lastRun=Date.now();next=Date.now()+600000;
 }catch(e){status='Automatik pausiert nach Fehler: '+e.message;next=Date.now()+120000;}finally{busy=false;changed();}}
 document.addEventListener('click',e=>{if(e.target.closest('[data-auto-demo-toggle]')){if(!available())return;const desired=!enabled;try{localStorage.setItem(KEY,JSON.stringify({enabled:desired}));enabled=desired;next=0;status=enabled?'Auto-Demo aktiviert. Starte Prüfung …':'Auto-Demo gestoppt. Offene Tests bleiben gespeichert.';changed();if(enabled)tick(true);}catch{notify('Automatik-Einstellung konnte nicht gespeichert werden.');}}if(e.target.closest('[data-auto-demo-now]'))tick(true);});
 const timer=setInterval(()=>tick(),30000);if(typeof window!=='undefined')document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});setTimeout(()=>tick(),1500);
 return {html};
}
