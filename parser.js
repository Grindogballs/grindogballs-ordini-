// Parser Grindogballs v4
function gbNorm(s){return (s||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ä/g,'a').replace(/ö/g,'o').replace(/ü/g,'u').replace(/ß/g,'ss')}
function gbIso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function gbCap(s){return (s||'').charAt(0).toUpperCase()+String(s||'').slice(1).toLowerCase()}
function gbEscape(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function gbProductIn(text){
  const n=gbNorm(text); let best=null;
  for(const prod of GB_CATALOGO){
    for(const syn of prod.sinonimi){
      const sn=gbNorm(syn);
      if(!sn) continue;
      const re=new RegExp('(^|[^a-z0-9])'+gbEscape(sn)+'([^a-z0-9]|$)','i');
      if(re.test(n) && (!best || sn.length>best.len)) best={nome:prod.nome,tipo:prod.tipo,len:sn.length,syn:sn};
    }
  }
  return best;
}
function gbParseName(text){
  const clean=text.replace(/\n/g,' ');
  const patterns=[
    /(?:ciao\s+)?sono\s+([A-ZÄÖÜ][a-zA-ZÀ-ÿäöüÄÖÜß' -]{1,30})/i,
    /mi\s+chiamo\s+([A-ZÄÖÜ][a-zA-ZÀ-ÿäöüÄÖÜß' -]{1,30})/i,
    /ich\s+bin\s+([A-ZÄÖÜ][a-zA-ZÀ-ÿäöüÄÖÜß' -]{1,30})/i,
    /(?:saluti|gruss|grusse|grüsse|lg|beste\s+grusse|beste\s+grüsse|grazie)\s+([A-ZÄÖÜ][a-zA-ZÀ-ÿäöüÄÖÜß' -]{1,30})/i
  ];
  for(const p of patterns){let m=clean.match(p); if(m){let raw=m[1].trim().split(/\s+/).filter(Boolean);
      const stops=['posso','vorrei','volevo','desidero','möchte','mochte','kann','posso','ordinare'];
      raw=raw.filter(w=>!stops.includes(gbNorm(w))).slice(0,2);
      let name=raw.join(' '); return name.split(' ').map(gbCap).join(' ')}}
  return '';
}
function gbParseTime(text){
  let m=text.match(/(?:um|alle|ore|verso|gegen|ca\.?|circa)?\s*(\d{1,2})[:\.](\d{2})\s*(?:uhr)?/i);
  if(m) return `${String(m[1]).padStart(2,'0')}:${m[2]}`;
  m=text.match(/(?:um|alle|ore|verso|gegen)\s+(\d{1,2})\s*(?:uhr)?/i);
  if(m) return `${String(m[1]).padStart(2,'0')}:00`;
  m=text.match(/\b(\d{1,2})\s*uhr\b/i);
  if(m) return `${String(m[1]).padStart(2,'0')}:00`;
  return '';
}
function gbParseDate(text){
  const t=gbNorm(text); const now=new Date();
  const months={gennaio:0,januar:0,january:0,febbraio:1,februar:1,marzo:2,marz:2,maerz:2,aprile:3,april:3,maggio:4,mai:4,giugno:5,juni:5,luglio:6,juli:6,agosto:7,august:7,settembre:8,september:8,ottobre:9,oktober:9,novembre:10,november:10,dicembre:11,dezember:11};
  if(/\b(domani|morgen)\b/.test(t)){let d=new Date(now); d.setDate(d.getDate()+1); return gbIso(d)}
  if(/\b(oggi|heute)\b/.test(t)) return gbIso(now);
  let m=t.match(/(\d{1,2})\s+(gennaio|januar|febbraio|februar|marzo|marz|maerz|aprile|april|maggio|mai|giugno|juni|luglio|juli|agosto|august|settembre|september|ottobre|oktober|novembre|november|dicembre|dezember)(?:\s+(\d{2,4}))?/i);
  if(m){let y=m[3]?Number(m[3]):now.getFullYear(); if(y<100)y+=2000; return `${y}-${String(months[m[2]]+1).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`}
  m=t.match(/(\d{1,2})[\.\/\-](\d{1,2})(?:[\.\/\-](\d{2,4}))?/);
  if(m){let y=m[3]?Number(m[3]):now.getFullYear(); if(y<100)y+=2000; return `${y}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`}
  const daysIt=['domenica','lunedi','martedi','mercoledi','giovedi','venerdi','sabato'];
  const daysDe=['sonntag','montag','dienstag','mittwoch','donnerstag','freitag','samstag'];
  for(let i=0;i<7;i++){
    if(new RegExp('\\b('+daysIt[i]+'|'+daysDe[i]+')\\b').test(t)){
      let d=new Date(now); let diff=(i-d.getDay()+7)%7; if(diff===0) diff=7; d.setDate(d.getDate()+diff); return gbIso(d);
    }
  }
  return gbIso(now);
}
function gbUnit(u){
  u=gbNorm(u||'');
  if(['kg','kilo','kili','chili','kilos','kilogramm','kilogrammi'].includes(u)) return 'kg';
  if(['g','gr','gramm','grammi'].includes(u)) return 'g';
  if(['x','pz','pezzo','pezzi','stuck','stk','stueck','stucke','stuecke','stück','stücke'].includes(u)) return 'pz';
  return 'pz';
}
function gbParseItems(text){
  const items=[]; const seen=new Set();
  let normalized=text.replace(/\r/g,'\n').replace(/(\d)\s*x\b/gi,'$1 x ');
  // 1) Segmenti separati: righe, virgole, e la parola "e/und" quando introduce nuova quantità
  let segments=normalized.split(/\n|,|;|\s+(?:e|und|&|\+)\s+(?=\d)/i).map(s=>s.trim()).filter(Boolean);
  // 2) Aggiunge anche match globali per frasi lunghe tipo: 4 chili dolce 4 pezzi piccante
  let global=[]; let rx=/(\d+(?:[\.,]\d+)?)\s*(x|kg|kilo|kili|chili|g|gr|gramm|grammi|pz|pezzo|pezzi|stk|stuck|stück|stueck|stücke|stuecke)?\s+([^\d\n,;]{2,45}?)(?=\s+\d+(?:[\.,]\d+)?\s*(?:x|kg|kilo|kili|chili|g|gr|gramm|grammi|pz|pezzo|pezzi|stk|stuck|stück|stueck|stücke|stuecke)?\s+|$|[\n,;])/gi;
  let m; while((m=rx.exec(normalized))){ global.push(`${m[1]} ${m[2]||''} ${m[3]}`.trim()) }
  segments=[...segments,...global];
  for(const seg of segments){
    if((seg.match(/\d+(?:[\.,]\d+)?\s*(?:x|kg|kilo|kili|chili|g|gr|gramm|grammi|pz|pezzo|pezzi|stk|stuck|stück|stueck|stücke|stuecke)/gi)||[]).length>1) continue;
    const product=gbProductIn(seg); if(!product) continue;
    const qm=seg.match(/(\d+(?:[\.,]\d+)?)\s*(x|kg|kilo|kili|chili|g|gr|gramm|grammi|pz|pezzo|pezzi|stk|stuck|stück|stueck|stücke|stuecke)?/i);
    if(!qm) continue;
    const qty=qm[1].replace(',','.'); const unit=gbUnit(qm[2]||'pz');
    const key=`${qty}|${unit}|${product.nome}`;
    if(!seen.has(key)){seen.add(key); items.push({qty,unit,name:product.nome,type:product.tipo,line:`${qty} ${unit} ${product.nome}`})}
  }
  return items;
}
function parseMessage(text){
  const prodotti=gbParseItems(text);
  return {cliente:gbParseName(text), data:gbParseDate(text), ora:gbParseTime(text), prodotti, debug:{prodotti:prodotti.length}};
}
