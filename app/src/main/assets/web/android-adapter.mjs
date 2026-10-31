// The interface is exposed only in the local, CSP-restricted app document.
const originalClick=HTMLAnchorElement.prototype.click;
HTMLAnchorElement.prototype.click=function(){
 if(this.download && this.href.startsWith('blob:') && window.SportRadarAndroid){
  const name=this.download,uri=this.href;
  fetch(uri).then(r=>r.text()).then(text=>window.SportRadarAndroid.exportJson(name,text)).catch(()=>alert('Sicherung konnte nicht vorbereitet werden.'));
  return;
 }
 return originalClick.call(this);
};
