//funzione debounce per evitare troppe chiamate al backend, limita fn chiamata ogni ms 
function debounce(fn, ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; } //...a num variabile di argomenti

(async function () {
  const p = new URLSearchParams(location.search);
  const microId   = p.get('microId'); // prendo il parametro da query string
  const microName = p.get('microName');
  const mesoId    = p.get('mesoId');
  const mesoName  = p.get('mesoName');

  const hTitle = document.getElementById('titolo-micro'); // titolo pagina
  if (hTitle) hTitle.textContent = `${microName} - Scheda di allenamento`; //se microName non definito, rimane "null - Scheda di allenamento"

  const toLog = document.getElementById('to-logbook'); // link al logbook
  if (toLog) {
    const qs = `?mesoId=${encodeURIComponent(mesoId)}&microId=${encodeURIComponent(microId)}&mesoName=${encodeURIComponent(mesoName)}&microName=${encodeURIComponent(microName)}`;
    toLog.href = '../logbook/index.html' + qs; 
  }

  if (!localStorage.getItem('authToken')) { //se non loggato
    ensureAuthModalOpen();
    return;
  }
  if (!microId){ location.href = '../microcicli/index.html'; return; } //se manca microId, torna a microcicli

  let scheda, schedaId; // definisci scheda e schedaId

  const getRes = await fetch(`/api/schede/${encodeURIComponent(microId)}`, { // chiamo metodo GET
    headers: { ...getAuthHeaders() }
  });

  if (getRes.status === 404) { // se la scheda non esiste, creala
    const createRes = await fetch(`/api/schede/${encodeURIComponent(microId)}`, { // chiamo metodo POST 
      method:'POST',
      headers:{ ...getAuthHeaders() }
    });
    if (!createRes.ok){ // se errore creazione scheda
      const msg = await createRes.json().catch(()=>({message:'Errore creazione scheda'}));
      alert(msg.message || 'Errore creazione scheda');
      return;
    }
    scheda = await createRes.json(); // scheda appena creata
  } else if (getRes.ok) { // se la scheda esiste, usala
    scheda = await getRes.json();
  } else { // se errore caricamento scheda
    const msg = await getRes.json().catch(()=>({message:'Errore caricamento scheda'}));
    alert(msg.message || 'Errore caricamento scheda');
    return;
  }
  schedaId = scheda.id; // assegna schedaId

  const splitInputs = [...document.querySelectorAll('.split-grid input')]; //seleziona tutti gli input nella griglia split html
  const paramInputs = [...document.querySelectorAll('.parametri-grid input')]; //seleziona tutti gli input nella griglia parametri html
  splitInputs.forEach(i => i.maxLength = 40); // limite split
  paramInputs.forEach(i => i.maxLength = 20); // limite parametri

  (scheda.split||[]).forEach((v,i)=>{ if(splitInputs[i]) splitInputs[i].value = v; }); //riempie splitinputs con i valori del backend
  const prm = scheda.params||{}; //prm è un oggetto con i parametri della scheda dal backend
  const map = ['durata','densita','intensita_carico','intensita_perc','volume'];
  map.forEach((k,i)=>{ if(paramInputs[i]) paramInputs[i].value = prm[k]||''; }); //riempie paraminputs con i valori del backend

  const saveScheda = debounce(async ()=>{   // funzione per salvare la scheda con debounce di 300ms
    const split = splitInputs.map(inp=>inp.value||''); // legge tutti gli input della split, estrae .value (se vuoto assegna "")
    const params = { // legge tutti gli input dei parametri, estrae .value (se vuoto assegna "")
      durata:           paramInputs[0].value||'',
      densita:          paramInputs[1].value||'',
      intensita_carico: paramInputs[2].value||'',
      intensita_perc:   paramInputs[3].value||'',
      volume:           paramInputs[4].value||'',
    };
    await fetch(`/api/schede/${encodeURIComponent(schedaId)}`, { // chiamo metodo PUT per salvare la scheda
      method:'PUT', headers:{'Content-Type':'application/json', ...getAuthHeaders()},
      body: JSON.stringify({ split, params })
    });
  }, 300);

  splitInputs.forEach(i=> i.addEventListener('input', saveScheda)); // Aggancia l’autosave ad ogni modifica degli input: split
  paramInputs.forEach(i=> i.addEventListener('input', saveScheda)); // Aggancia l’autosave ad ogni modifica degli input: parametri

  const seduteWrap = document.getElementById('sedute'); // contenitore per le sedute

  const HEADERS = ['Esercizio','Recupero','Set 1','Tempo','Set 2','Tempo','Set 3','Tempo','Set 4','Tempo','Set 5','Tempo','GM','Azioni'];
  const GM_OPTS_TABLE = ['/', 'petto','dorso','delt. lat.','delt. fr.','delt. po.','bicipiti','tricipiti','quadr.','femorali','polpacci','glutei','trapezi','addome'];

  function autoGrow(el){ el.style.height='auto'; el.style.height=el.scrollHeight+'px'; } // funzione per auto-adattare altezza textarea

  function makeHead(){ // crea l’intestazione della tabella
    const tr=document.createElement('tr');
    HEADERS.forEach(h=>{ const th=document.createElement('th'); th.textContent=h; tr.appendChild(th); }); // crea th per ogni header
    return tr;
  }

  function rowCell(type, value, onChange){ // Crea una cella <td> e in base a type decide contenuto. onChange funzione da chiamare al cambiamento del contenuto
    const td=document.createElement('td');
    if (type==='gm'){ //se type è gm, crea select con opzioni GM_OPTS_TABLE
      const sel=document.createElement('select'); sel.className='gm-select';
      GM_OPTS_TABLE.forEach(v=>{ const o=document.createElement('option'); o.value=v; o.textContent=v; sel.appendChild(o); });
      sel.value = value || '/'; // Imposta il valore selezionato (se value è null/undefined, usa '/')
      sel.addEventListener('change', onChange); //aggancia onChange all'evento change della select
      td.appendChild(sel); //aggiungi select alla cella td
    } else if (type==='btn'){ //se type è btn, crea bottone elimina riga
      const b=document.createElement('button'); b.className='btn btn-row-del'; b.textContent='Elimina riga'; b.type='button';
      b.addEventListener('click', onChange); td.appendChild(b);
    } else { //se type è text, crea textarea
      const ta=document.createElement('textarea'); ta.rows=1; ta.value=value||''; // textarea a 1 riga, con valore value o ''
      ta.maxLength = 60; // limite celle tabella (esercizio/recupero/set/tempo)
      ta.addEventListener('input', ()=>{ autoGrow(ta); onChange(); }); // auto-grow e onChange ad ogni input
      requestAnimationFrame(()=>autoGrow(ta)); // esegui autoGrow subito dopo il rendering
      td.appendChild(ta); //aggiungi textarea alla cella td
    }
    return td;
  }

  function makeTable(){ // Crea struttura tabella 
    const wrap=document.createElement('div'); wrap.className='tabella-wrap';
    const table=document.createElement('table'); table.className='tabella';
    const thead=document.createElement('thead'); const tbody=document.createElement('tbody');
    thead.appendChild(makeHead()); table.appendChild(thead); table.appendChild(tbody); wrap.appendChild(table);
    return {wrap, tbody}; //ritorna con tbody per aggiungere righe (wrap contenitore scroll orizzontale)
  }

  async function loadSedute(){
    seduteWrap.innerHTML=''; //pulisci contenitore sedute
    const sedute = await fetch(`/api/workoutsPrev/${encodeURIComponent(schedaId)}`, { headers:{...getAuthHeaders()} }).then(r=> r.ok?r.json():[]); //carica sedute dal backend
    for (const s of sedute){ seduteWrap.appendChild(await makeSedutaSection(s)); }//per ogni seduta crea sezione e aggiungila al contenitore
    renderGMChart(schedaId); //aggiorna grafico 
  }

  async function makeSedutaSection(seduta){
    const section = document.createElement('section'); section.className = 'seduta'; 

    // header (nome + pulsanti)
    const head = document.createElement('div'); head.className = 'seduta-head'; // contenitore header
    const nomeWrap = document.createElement('div'); nomeWrap.className = 'nome-seduta-wrap'; // contenitore nome seduta
    const eth = document.createElement('label'); eth.textContent = 'Nome seduta'; // etichetta nome seduta
    const inp = document.createElement('input'); inp.type='text'; inp.className='nome-seduta'; inp.value = seduta.nomeSeduta || '';
    inp.maxLength = 40; // limite nome seduta
    const saveNome = debounce(async ()=>{
      await fetch(`/api/workoutsPrev/${encodeURIComponent(seduta.id)}`, {
        method:'PUT', headers:{ 'Content-Type':'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ nomeSeduta: inp.value || '' }) //nel body invia oggetto con nomeSeduta
      });
    }, 400);
    inp.addEventListener('input', saveNome); //aggancia saveNome ad ogni modifica dell'input
    nomeWrap.append(eth, inp); //aggiungi etichetta e input al contenitore nome seduta

    const actions = document.createElement('div'); actions.className = 'seduta-actions'; // contenitore pulsanti addRow e deleteSeduta
    const addRowBtn = document.createElement('button'); addRowBtn.className='btn btn-add-row'; addRowBtn.textContent='Aggiungi riga'; addRowBtn.type='button';
    const delBtn    = document.createElement('button'); delBtn.className='btn btn-del-seduta'; delBtn.textContent='Elimina seduta'; delBtn.type='button';
    actions.append(addRowBtn, delBtn); //aggiungi pulsanti al contenitore azioni
    head.append(nomeWrap, actions); //aggiungi contenitore nome seduta e azioni all'header

    // TABELLA
    const {wrap, tbody} = makeTable(); // crea tabella e ottieni tbody per aggiungere righe
    section.append(head, wrap); //aggiungi header e tabella alla sezione

    // Carica righe
    let righe = await fetch(`/api/eserciziPrev/${encodeURIComponent(seduta.id)}`, { headers:{...getAuthHeaders()} }).then(r=> r.ok ? r.json() : []); //get righe

    function buildRow(r){
      const tr = document.createElement('tr'); // crea riga tabella

      const onSave = debounce(async ()=>{ // funzione per salvare la riga con debounce di 300ms
        const cells = tr.querySelectorAll('td'); // seleziona tutte le celle della riga
        const vals = {
          esercizio: cells[0].querySelector('textarea').value||'', recupero:  cells[1].querySelector('textarea').value||'',
          set1:      cells[2].querySelector('textarea').value||'', tempo1:    cells[3].querySelector('textarea').value||'',
          set2:      cells[4].querySelector('textarea').value||'', tempo2:    cells[5].querySelector('textarea').value||'',
          set3:      cells[6].querySelector('textarea').value||'', tempo3:    cells[7].querySelector('textarea').value||'',
          set4:      cells[8].querySelector('textarea').value||'', tempo4:    cells[9].querySelector('textarea').value||'',
          set5:      cells[10].querySelector('textarea').value||'', tempo5:    cells[11].querySelector('textarea').value||'',
          gm:        (cells[12].querySelector('select').value || '/')
        };
        Object.assign(r, vals); // aggiorna oggetto riga con i nuovi valori
        await fetch(`/api/eserciziPrev/${encodeURIComponent(r.id)}`, {
          method:'PUT', headers:{'Content-Type':'application/json', ...getAuthHeaders()},
          body: JSON.stringify(vals)
        });
        renderGMChart(schedaId);
      }, 300);

      tr.append( // crea e aggiungi celle alla riga
        rowCell('text', r.esercizio, onSave), rowCell('text', r.recupero,  onSave),
        rowCell('text', r.set1,     onSave), rowCell('text', r.tempo1,   onSave),
        rowCell('text', r.set2,     onSave), rowCell('text', r.tempo2,   onSave),
        rowCell('text', r.set3,     onSave), rowCell('text', r.tempo3,   onSave),
        rowCell('text', r.set4,     onSave), rowCell('text', r.tempo4,   onSave),
        rowCell('text', r.set5,     onSave), rowCell('text', r.tempo5,   onSave),
        rowCell('gm',   r.gm,       onSave),
        rowCell('btn',  null, async ()=>{
          const res = await fetch(`/api/eserciziPrev/${encodeURIComponent(r.id)}`, { method:'DELETE', headers:{...getAuthHeaders()} });
          if (res.ok){righe = righe.filter(x=>x.id!==r.id); tr.remove(); renderGMChart(schedaId);}
        })
      );

      return tr;
    }
    //render iniziale delle righe
    tbody.innerHTML = ''; //pulisci corpo tabella
    righe.forEach(r => tbody.appendChild(buildRow(r))); //per ogni riga, crea elemento e aggiungilo al corpo tabella

    addRowBtn.addEventListener('click', async ()=>{ // aggiungi nuova riga
      const res = await fetch(`/api/eserciziPrev/${encodeURIComponent(seduta.id)}`, { method:'POST', headers:{...getAuthHeaders()} });
      if (!res.ok) return;
      const nr = await res.json();
      righe.push(nr); // aggiungi nuova riga all'array righe
      tbody.appendChild(buildRow(nr)); // crea elemento riga e aggiungilo al corpo tabella
      renderGMChart(schedaId); // aggiorna grafico
    });

    delBtn.addEventListener('click', async ()=>{ // elimina seduta
      if (!confirm('Eliminare questa seduta?')) return;
      const res = await fetch(`/api/workoutsPrev/${encodeURIComponent(seduta.id)}`, { method:'DELETE', headers:{...getAuthHeaders()} });
      if (res.ok){ 
        section.remove(); // rimuovi sezione dal DOM
        renderGMChart(schedaId); // aggiorna grafico
      }
    });

    return section; //ritorna sezione completa
  }

  document.getElementById('add-seduta').addEventListener('click', async ()=>{ // aggiungi nuova seduta
    const r = await fetch(`/api/workoutsPrev/${encodeURIComponent(schedaId)}`, { method:'POST', headers:{...getAuthHeaders()} });
    if (r.ok){ await loadSedute(); } else { alert('Errore creazione seduta'); }
  });

  await loadSedute(); // carica sedute all'inizio

  async function fetchGMCounts(schedaId){
    try{
      const res = await fetch(`/api/schede/${encodeURIComponent(schedaId)}/stats/serie-gm`, {
        headers: { ...getAuthHeaders() }
      });
      if (!res.ok) return {};
      const json = await res.json();
      return json.counts || {}; //ritorna oggetto con conteggi
    }catch{ return {}; }
  }

  let gmChart = null;
  async function renderGMChart(schedaId){
    const canvas = document.getElementById('gmChart'); // seleziona elemento canvas
    if (!canvas || !window.Chart) return; // se manca canvas o libreria Chart.js, esci.

    const GM_OPTS = ['petto','dorso','delt. lat.','delt. fr.','delt. po.','bicipiti','tricipiti','quadr.','femorali','polpacci','glutei','trapezi','addome'];
    const counts = await fetchGMCounts(schedaId); 
    const labels = GM_OPTS;
    const data   = labels.map(gm => counts[gm] || 0); //restituisce ad esempio [10,5,0,0,3,...]

    const ctx = canvas.getContext('2d'); //oggetto che chart.js usa per disegnare

    const options = {
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ display:false } },
      layout:{ padding:4 },
      scales:{
        x:{ ticks:{ color:'#fff', font:{ family:getComputedStyle(document.body).fontFamily, size:13 } },
            grid:{ color:'rgba(255,255,255,.15)', lineWidth:1 } },
        y:{ beginAtZero:true, ticks:{ color:'#fff', stepSize:1, font:{ family:getComputedStyle(document.body).fontFamily, size:13 } },
            grid:{ color:'rgba(255,255,255,.15)', lineWidth:1 } }
      }
    };

    const dataset = {
      label:'Serie', data,
      backgroundColor: "oklch(0.76 0.1 355)", borderWidth:0, borderRadius:2,
      maxBarThickness:18, barThickness:'flex', categoryPercentage:0.6, barPercentage:0.7
    };

    if (!gmChart){ // se il grafico non esiste, crealo
      gmChart = new Chart(ctx, { type:'bar', data:{ labels, datasets:[dataset] }, options });
    } else { // se esiste, aggiornalo
      gmChart.data.labels = labels; // etichette sono i nomi dei gruppi muscolari
      gmChart.data.datasets[0] = dataset; // dataset[0] perché c'è un solo dataset
      gmChart.update();  // aggiorna il grafico
    }
  }
})();