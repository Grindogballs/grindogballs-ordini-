(function(){
function norm(s){return (s||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ä/g,'a').replace(/ö/g,'o').replace(/ü/g,'u').replace(/ß/g,'ss');}
function cap(s){s=(s||'').trim(); return s ? s.charAt(0).toUpperCase()+s.slice(1).toLowerCase() : '';}
function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function escapeRe(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
const months={gennaio:0,januar:0,january:0,febbraio:1,februar:1,february:1,marzo:2,marz:2,maerz:2,march:2,aprile:3,april:3,maggio:4,mai:4,may:4,giugno:5,juni:5,june:5,luglio:6,juli:6,july:6,agosto:7,august:7,settembre:8,september:8,ottobre:9,oktober:9,october:9,novembre:10,november:10,dicembre:11,dezember:11,december:11};
const daysIt=['domenica','lunedi','martedi','mercoledi','giovedi','venerdi','sabato'];
const daysDe=['sonntag','montag','dienstag','mittwoch','donnerstag','freitag','samstag'];
function findProduct(fragment){const n=norm(fragment); let best=null; let score=0; for(const p of GB_CATALOG.products){ for(const syn of p.synonyms){const k=norm(syn); const re=new RegExp('(^|[^a-z0-9])'+escapeRe(k)+'([^a-z0-9]|$)','i'); if(re.test(n) && k.length>score){best=p; score=k.length;} } } return best;}
function parseName(text){
  const patterns=[/\b(?:ciao|buongiorno|buonasera)?\s*sono\s+([A-ZÄÖÜ][a-zA-ZÀ-ÿäöüÄÖÜß' -]{1,25})/i,/\bmi\s+chiamo\s+([A-ZÄÖÜ][a-zA-ZÀ-ÿäöüÄÖÜß' -]{1,25})/i,/\bich\s+bin\s+([A-ZÄÖÜ][a-zA-ZÀ-ÿäöüÄÖÜß' -]{1,25})/i,/\b(?:saluti|gruss|grusse|grüsse|lg|beste grusse|beste grüsse|danke|grazie)\s+([A-ZÄÖÜ][a-zA-ZÀ-ÿäöüÄÖÜß' -]{1,25})\b/i];
  for(const p of patterns){const m=text.match(p); if(m){let name=m[1].trim().split(/\s+/)[0]; if(!/posso|vorrei|mochte|möchte|ordinare|prenotare/i.test(name)) return cap(name);}}
  return '';
}
function parseDate(text){
  const t=norm(text); const now=new Date();
  if(/\b(oggi|heute)\b/.test(t)) return iso(now);
  if(/\b(domani|morgen)\b/.test(t)){let d=new Date(now); d.setDate(d.getDate()+1); return iso(d);}
  let m=t.match(/\b(\d{1,2})[\.\/\-](\d{1,2})(?:[\.\/\-](\d{2,4}))?\b/); if(m){let y=m[3]?Number(m[3]):now.getFullYear(); if(y<100)y+=2000; return `${y}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;}
  m=t.match(/\b(\d{1,2})\s+([a-z]+)\b/); if(m && months[m[2]]!==undefined){let y=now.getFullYear(); return `${y}-${String(months[m[2]]+1).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;}
  for(let i=0;i<7;i++){ if(new RegExp('\\b('+daysIt[i]+'|'+daysDe[i]+')\\b').test(t)){let d=new Date(now); let diff=(i-d.getDay()+7)%7; if(diff===0) diff=7; d.setDate(d.getDate()+diff); return iso(d);} }
  return iso(now);
}
function parseTime(text){
  let m=text.match(/(?:um|alle|ore|verso|circa|ca\.?|gegen)?\s*(\d{1,2})[:\.](\d{2})\s*(?:uhr)?/i); if(m) return `${String(m[1]).padStart(2,'0')}:${m[2]}`;
  m=text.match(/(?:um|alle|ore|verso|circa|ca\.?|gegen)\s+(\d{1,2})\s*(?:uhr)?/i); if(m) return `${String(m[1]).padStart(2,'0')}:00`;
  return '';
}
function unitNorm(u){u=norm(u||''); if(['kg','kilo','kili','chili','kilos','kilo(s)'].includes(u)) return 'kg'; if(['g','gr','gramm','grammi'].includes(u)) return 'g'; return 'pz';}
function cleanProductFragment(s){return s.replace(/\b(per|fur|für|a|da|di|del|della|alle|um|ore|uhr|sabato|venerdi|freitag|samstag|domani|morgen|oggi|heute|posso|vorrei|ordinare|bestellen|mochte|möchte)\b/gi,' ');}
function parseItems(text){
  const compact=text.replace(/\n/g,' | ');
  const rx=/(\d+(?:[\.,]\d+)?)\s*(x|kg|kilo|kili|chili|g|gr|gramm|grammi|pz|pezzi|stuck|stück|stk)?\s*([a-zA-ZÀ-ÿäöüÄÖÜß][a-zA-ZÀ-ÿäöüÄÖÜß\- ]{1,45})/gi;
  const items=[]; let m;
  while((m=rx.exec(compact))){
    let qty=Number(m[1].replace(',','.')); let unit=unitNorm(m[2]||'pz');
    let frag=cleanProductFragment(m[3]).split('|')[0].trim();
    let p=findProduct(frag);
    if(!p){
      const next=compact.slice(rx.lastIndex, rx.lastIndex+55);
      p=findProduct(frag+' '+next);
    }
    if(p){items.push({qty,unit,name:p.name,type:p.type,line:`${qty} ${unit} ${p.name}`});}
  }
  // fallback: product before quantity, e.g. "piccante 10x"
  const rx2=/([a-zA-ZÀ-ÿäöüÄÖÜß][a-zA-ZÀ-ÿäöüÄÖÜß\- ]{2,35})\s+(\d+(?:[\.,]\d+)?)\s*(x|kg|kilo|kili|chili|g|gr|gramm|grammi|pz|pezzi|stuck|stück|stk)\b/gi;
  while((m=rx2.exec(compact))){const p=findProduct(m[1]); if(p){let qty=Number(m[2].replace(',','.')); let unit=unitNorm(m[3]); items.push({qty,unit,name:p.name,type:p.type,line:`${qty} ${unit} ${p.name}`});}}
  const seen=new Set(); return items.filter(it=>{const k=it.qty+'|'+it.unit+'|'+it.name; if(seen.has(k)) return false; seen.add(k); return true;});
}
function parseReservation(text){
  const name=parseName(text); const data=parseDate(text); const ora=parseTime(text);
  let m=text.match(/(\d{1,2})\s*(?:persone|personen|person|posti|plätze|platze|pax)/i) || text.match(/(?:per|für|fur)\s+(\d{1,2})\b/i);
  return {cliente:name,data,ora,persone:m?Number(m[1]):'',debug:{nameFound:!!name,timeFound:!!ora,peopleFound:!!m}};
}
function parseMessage(text){
  const cliente=parseName(text); const data=parseDate(text); const ora=parseTime(text); const prodotti=parseItems(text);
  return {cliente,data,ora,prodotti,debug:{cliente,data,ora,prodotti:prodotti.length}};
}
window.GBParser={parseMessage,parseReservation,parseItems,parseName,parseDate,parseTime,findProduct,norm};
})();
