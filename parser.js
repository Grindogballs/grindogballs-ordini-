(function(){
function norm(s){return (s||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ä/g,'a').replace(/ö/g,'o').replace(/ü/g,'u').replace(/ß/g,'ss');}
function capWords(s){return (s||'').trim().split(/\s+/).filter(Boolean).map(w=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join(' ');}
function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function escapeRe(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
const months={gennaio:0,januar:0,january:0,febbraio:1,februar:1,february:1,marzo:2,marz:2,maerz:2,march:2,aprile:3,april:3,maggio:4,mai:4,may:4,giugno:5,juni:5,june:5,luglio:6,juli:6,july:6,agosto:7,august:7,settembre:8,september:8,ottobre:9,oktober:9,october:9,novembre:10,november:10,dicembre:11,dezember:11,december:11};
const daysIt=['domenica','lunedi','martedi','mercoledi','giovedi','venerdi','sabato'];
const daysDe=['sonntag','montag','dienstag','mittwoch','donnerstag','freitag','samstag'];
const stopWords=/\b(posso|vorrei|voglio|volevo|ordinare|prenotare|bestellen|mochte|moechte|möchte|fare|una|un|per|fur|für|se|possibile|bitte|hallo|ciao|buona|buonasera|buongiorno|salve|ok|perfetto|allora)\b/i;
function productMatches(text){
  const n=norm(text); const out=[];
  for(const p of GB_CATALOG.products){
    for(const syn of p.synonyms){
      const k=norm(syn); if(!k) continue;
      const re=new RegExp('(^|[^a-z0-9])('+escapeRe(k)+')([^a-z0-9]|$)','gi'); let m;
      while((m=re.exec(n))){ out.push({product:p, start:m.index+(m[1]?m[1].length:0), end:m.index+(m[1]?m[1].length:0)+m[2].length, syn:k}); }
    }
  }
  out.sort((a,b)=>a.start-b.start || (b.end-b.start)-(a.end-a.start));
  const filtered=[];
  for(const m of out){
    if(filtered.some(x=>!(m.end<=x.start || m.start>=x.end))) continue;
    filtered.push(m);
  }
  return filtered;
}
function findProduct(fragment){
  const m=productMatches(fragment).sort((a,b)=>(b.end-b.start)-(a.end-a.start))[0];
  return m?m.product:null;
}
function parseName(text){
  const raw=text.replace(/\n/g,' ');
  const patterns=[
    /\b(?:ciao|buongiorno|buonasera|salve)?\s*sono\s+([A-ZÀ-Ý][a-zA-ZÀ-ÿ' -]{1,45})/i,
    /\bmi\s+chiamo\s+([A-ZÀ-Ý][a-zA-ZÀ-ÿ' -]{1,45})/i,
    /\bich\s+bin\s+([A-ZÀ-Ý][a-zA-ZÀ-ÿ' -]{1,45})/i,
    /\b(?:saluti|gruss|grusse|grüsse|lg|beste grusse|beste grüsse|danke|grazie)\s+([A-ZÀ-Ý][a-zA-ZÀ-ÿ' -]{1,45})\b/i
  ];
  for(const p of patterns){
    const m=raw.match(p); if(!m) continue;
    let candidate=m[1].trim();
    candidate=candidate.split(stopWords)[0].trim();
    candidate=candidate.split(/\d|,|\.|!|\?|\n/)[0].trim();
    const words=candidate.split(/\s+/).filter(w=>w && !stopWords.test(w)).slice(0,3);
    if(words.length) return capWords(words.join(' '));
  }
  return '';
}
function parseDate(text){
  const t=norm(text); const now=new Date();
  let m=t.match(/\b(\d{1,2})\s*(?:\.|\/|\-)?\s+(gennaio|januar|febbraio|februar|marzo|marz|maerz|aprile|april|maggio|mai|giugno|juni|luglio|juli|agosto|august|settembre|september|ottobre|oktober|novembre|november|dicembre|dezember)\b/);
  if(m && months[m[2]]!==undefined){let y=now.getFullYear(); return `${y}-${String(months[m[2]]+1).padStart(2,'0')}-${String(Number(m[1])).padStart(2,'0')}`;}
  if(/\b(oggi|heute)\b/.test(t)) return iso(now);
  if(/\b(domani|morgen)\b/.test(t)){let d=new Date(now); d.setDate(d.getDate()+1); return iso(d);}
  m=t.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if(m){let day=Number(m[1]), mon=Number(m[2]); if(mon>=1 && mon<=12 && day>=1 && day<=31){let y=m[3]?Number(m[3]):now.getFullYear(); if(y<100)y+=2000; return `${y}-${String(mon).padStart(2,'0')}-${String(day).padStart(2,'0')}`;}}
  // Punktdatum nur wenn Monat gueltig; 14.00 Uhr darf NICHT als Datum gelten
  m=t.match(/\b(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?\b/);
  if(m){let day=Number(m[1]), mon=Number(m[2]); if(mon>=1 && mon<=12 && day>=1 && day<=31){let y=m[3]?Number(m[3]):now.getFullYear(); if(y<100)y+=2000; return `${y}-${String(mon).padStart(2,'0')}-${String(day).padStart(2,'0')}`;}}
  for(let i=0;i<7;i++){
    const re=new RegExp('\\b('+daysIt[i]+'|'+daysDe[i]+')\\b');
    if(re.test(t)){let d=new Date(now); let diff=(i-d.getDay()+7)%7; if(diff===0) diff=7; d.setDate(d.getDate()+diff); return iso(d);}
  }
  return iso(now);
}
function parseTime(text){
  let m=text.match(/(?:um|alle|ore|verso|circa|ca\.?|gegen)?\s*(\d{1,2})[:\.](\d{2})\s*(?:uhr)?/i); if(m){let h=Number(m[1]); if(h>=0&&h<=23)return `${String(h).padStart(2,'0')}:${m[2]}`;}
  m=text.match(/(?:um|alle|ore|verso|circa|ca\.?|gegen|pomeriggio verso le)\s+(\d{1,2})\s*(?:uhr)?/i); if(m){let h=Number(m[1]); if(h>=0&&h<=23)return `${String(h).padStart(2,'0')}:00`;}
  return '';
}
function unitNorm(u){u=norm(u||''); if(['kg','kilo','kili','chili','chilo','kilos'].includes(u)) return 'kg'; if(['g','gr','gramm','grammi'].includes(u)) return 'g'; if(['volte','pack','packs','confezioni','menu','menu','x','pz','pezzi','piece','pieces','stuck','stueck','stück','stk'].includes(u)) return 'pz'; return 'pz';}

function maskNonOrderNumbers(text){
  let s=text;
  // times: 14.00, 16:00, um 16 Uhr, alle 14
  s=s.replace(/\b\d{1,2}[:\.]\d{2}\s*(?:uhr)?\b/gi,' ');
  s=s.replace(/\b(?:um|alle|ore|verso|circa|ca\.?|gegen)\s+\d{1,2}\s*(?:uhr)?\b/gi,' ');
  // dates with month names: 3 luglio, Freitag 3. Juli, sabato 6 luglio
  s=s.replace(/\b(?:domenica|lunedi|martedi|mercoledi|giovedi|venerdi|sabato|sonntag|montag|dienstag|mittwoch|donnerstag|freitag|samstag)?\s*\d{1,2}\s*\.?\s*(?:gennaio|januar|febbraio|februar|marzo|marz|maerz|aprile|april|maggio|mai|giugno|juni|luglio|juli|agosto|august|settembre|september|ottobre|oktober|novembre|november|dicembre|dezember)\b/gi,' ');
  // numeric dates: 03/07 or 03.07.2026
  s=s.replace(/\b\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?\b/g,' ');
  s=s.replace(/\b\d{1,2}\.\d{1,2}\.\d{2,4}\b/g,' ');
  return s;
}

function extractQuantities(text){
  const q=[]; const rx=/(\d+(?:[\.,]\d+)?)\s*(x|kg|kilo|kili|chili|chilo|g|gr|gramm|grammi|pz|pezzi|volte|pack|packs|confezioni|menu|stück|stuck|stueck|stk)?/gi; let m;
  while((m=rx.exec(text))){
    const qty=Number(m[1].replace(',','.')); const unit=unitNorm(m[2]||'pz');
    if(!isFinite(qty)) continue;
    // skip years in dates
    if(qty>1000) continue;
    q.push({qty,unit,start:m.index,end:rx.lastIndex,raw:m[0]});
  }
  return q;
}
function parseItems(text){
  const cleanText=maskNonOrderNumbers(text);
  const products=productMatches(cleanText); const quantities=extractQuantities(cleanText); const items=[]; const usedProducts=new Set();
  for(const q of quantities){
    // prefer first product after quantity, close enough, before next quantity
    const nextQ=quantities.find(x=>x.start>q.start); const limit=nextQ?nextQ.start:text.length;
    let candidates=products.filter(p=>p.start>=q.end-2 && p.start<=Math.min(limit+25,q.end+90));
    if(!candidates.length){ candidates=products.filter(p=>p.end<=q.start && q.start-p.end<45); }
    if(!candidates.length) continue;
    candidates.sort((a,b)=>{
      const da=a.start>=q.end? a.start-q.end : q.start-a.end;
      const db=b.start>=q.end? b.start-q.end : q.start-b.end;
      return da-db || (b.end-b.start)-(a.end-a.start);
    });
    const p=candidates[0];
    usedProducts.add(p.start+'-'+p.end);
    items.push({qty:q.qty, unit:q.unit, name:p.product.name, type:p.product.type, line:`${q.qty} ${q.unit} ${p.product.name}`});
  }
  // product without quantity fallback: for lines like "grill pack" no number -> 1 pz
  for(const p of products){
    const key=p.start+'-'+p.end; if(usedProducts.has(key)) continue;
    const around=text.slice(Math.max(0,p.start-15), Math.min(text.length,p.end+15));
    if(/\d/.test(around)) continue;
  }
  const seen=new Set();
  return items.filter(it=>{const k=it.qty+'|'+it.unit+'|'+it.name; if(seen.has(k))return false; seen.add(k); return true;});
}
function parseReservation(text){
  const cliente=parseName(text); const data=parseDate(text); const ora=parseTime(text);
  let m=text.match(/(\d{1,2})\s*(?:persone|personen|person|posti|plätze|platze|pax)/i) || text.match(/(?:per|für|fur)\s+(\d{1,2})\b/i);
  return {cliente,data,ora,persone:m?Number(m[1]):'',debug:{cliente,data,ora,persone:m?Number(m[1]):''}};
}
function parseMessage(text){
  const cliente=parseName(text); const data=parseDate(text); const ora=parseTime(text); const prodotti=parseItems(text);
  return {cliente,data,ora,prodotti,debug:{cliente,data,ora,prodotti:prodotti.length}};
}
window.GBParser={parseMessage,parseReservation,parseItems,parseName,parseDate,parseTime,findProduct,norm,productMatches,extractQuantities,maskNonOrderNumbers};
})();
