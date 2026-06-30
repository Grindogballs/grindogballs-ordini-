const storeKey='gb_orders_v4';
let orders=JSON.parse(localStorage.getItem(storeKey)||'[]');
let filter='all';
function v(id){return document.getElementById(id).value.trim()}
function persist(){localStorage.setItem(storeKey,JSON.stringify(orders))}
function analyze(){
  const text=document.getElementById('raw').value;
  const res=parseMessage(text);
  if(res.cliente) document.getElementById('cliente').value=res.cliente;
  document.getElementById('data').value=res.data;
  if(res.ora) document.getElementById('ora').value=res.ora;
  document.getElementById('prodotti').value=res.prodotti.map(p=>p.line).join('\n');
  const dbg=[
    `${res.cliente?'✅':'⚠️'} Cliente: ${res.cliente||'non trovato'}`,
    `✅ Data: ${res.data}`,
    `${res.ora?'✅':'⚠️'} Ora: ${res.ora||'non trovata'}`,
    `${res.prodotti.length?'✅':'⚠️'} Prodotti: ${res.prodotti.length}`,
    ...res.prodotti.map(p=>'• '+p.line)
  ];
  document.getElementById('parseInfo').innerHTML=dbg.join('\n');
}
function addQuick(name,unit){let q=prompt(`Quantità per ${name}?`,'1'); if(!q)return; let t=document.getElementById('prodotti'); t.value+=(t.value?'\n':'')+`${q} ${unit} ${name}`}
function saveOrder(){let o={id:Date.now(),cliente:v('cliente'),telefono:v('telefono'),data:v('data')||gbIso(new Date()),ora:v('ora'),luogo:v('luogo'),prodotti:v('prodotti'),note:v('note'),pagato:v('pagato'),stato:'da preparare'}; orders.unshift(o); persist(); clearForm(); renderAll(); alert('Ordine salvato')}
function clearForm(){['raw','cliente','telefono','ora','prodotti','note'].forEach(id=>document.getElementById(id).value=''); document.getElementById('data').value=gbIso(new Date()); document.getElementById('parseInfo').innerHTML=''}
function setTodayFilter(f){filter=f;renderOrders()}
function renderOrders(){let q=gbNorm(document.getElementById('search')?.value||''); let today=gbIso(new Date()); let tm=new Date();tm.setDate(tm.getDate()+1);let tomorrow=gbIso(tm); let arr=orders.filter(o=>filter==='all'||(filter==='today'&&o.data===today)||(filter==='tomorrow'&&o.data===tomorrow)).filter(o=>gbNorm(JSON.stringify(o)).includes(q)); document.getElementById('ordersList').innerHTML=arr.map(o=>`<div class="card order ${o.stato.replace(' ','')}"><div class="title">👤 ${o.cliente||'Senza nome'}</div><div class="small">📅 ${o.data} ${o.ora||''} · 📍 ${o.luogo} · 💰 ${o.pagato}</div><div class="items">${o.prodotti.split('\n').filter(Boolean).map(x=>`<div class="itemline">${x}</div>`).join('')}</div><div class="small">${o.note||''}</div><span class="pill">${o.stato}</span><br><button class="btn btn2" onclick="editOrder(${o.id})">✏️</button><button class="btn btnG" onclick="statusOrder(${o.id},'preparato')">Preparato</button><button class="btn btnG" onclick="statusOrder(${o.id},'consegnato')">Consegnato</button><button class="btn btnR" onclick="delOrder(${o.id})">Elimina</button></div>`).join('')||'<div class="card small">Nessun ordine</div>'}
function statusOrder(id,s){let o=orders.find(x=>x.id===id); if(o){o.stato=s;persist();renderAll()}}
function delOrder(id){if(confirm('Eliminare ordine?')){orders=orders.filter(x=>x.id!==id);persist();renderAll()}}
function editOrder(id){let o=orders.find(x=>x.id===id); if(!o)return; show('home',document.querySelector('.tab')); ['cliente','telefono','data','ora','luogo','prodotti','note','pagato'].forEach(k=>document.getElementById(k).value=o[k]||''); orders=orders.filter(x=>x.id!==id); persist(); renderAll()}
function renderProduction(){let d=document.getElementById('prodDate').value||gbIso(new Date()); let totals={}; orders.filter(o=>o.data===d).forEach(o=>o.prodotti.split('\n').forEach(line=>{let m=line.match(/(\d+(?:\.\d+)?)\s*(kg|g|pz)\s+(.+)/i); if(m){let key=m[3].trim()+' ('+m[2].toLowerCase()+')'; totals[key]=(totals[key]||0)+Number(m[1])}})); document.getElementById('prodList').innerHTML=Object.entries(totals).sort().map(([k,v])=>`<div class="tot"><b>${k}</b><span>${v}</span></div>`).join('')||'<p class="small">Nessuna produzione per questa data</p>'}
function renderClients(){let map={}; orders.forEach(o=>{if(!o.cliente)return; map[o.cliente]=(map[o.cliente]||0)+1}); document.getElementById('clientList').innerHTML=Object.entries(map).sort().map(([c,n])=>`<div class="tot"><b>${c}</b><span>${n} ordini</span></div>`).join('')||'<p class="small">Nessun cliente</p>'}
function renderAll(){renderOrders();renderProduction();renderClients()}
function show(id,el){document.querySelectorAll('section').forEach(s=>s.classList.add('hide'));document.getElementById(id).classList.remove('hide');document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));el.classList.add('active');renderAll()}
if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js?v=4').catch(()=>{})}
document.getElementById('data').value=gbIso(new Date()); document.getElementById('prodDate').value=gbIso(new Date()); renderAll();
