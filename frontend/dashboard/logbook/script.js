//funzione debounce per evitare troppe chiamate al backend, limita fn chiamata ogni ms 
function debounce(fn, ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; } //...a num variabile di argomenti

(async () => {
  const p = new URLSearchParams(location.search); 
  const microId   = p.get('microId'); // prendo il parametro da query string
  const microName = p.get('microName');
  const mesoId    = p.get('mesoId');
  const mesoName  = p.get('mesoName');

  const hTitle = document.getElementById('titolo-micro'); // Titolo h1
  if (hTitle) hTitle.textContent = `${microName} - Logbook`;

  const toScheda = document.getElementById('to-scheda'); // Link alla scheda allenamento
  if (toScheda) {
    const qs = `?mesoId=${encodeURIComponent(mesoId)}&microId=${encodeURIComponent(microId)}&mesoName=${encodeURIComponent(mesoName)}&microName=${encodeURIComponent(microName)}`; // ricostruisco query string
    toScheda.href = '../scheda_allenamento/index.html' + qs; //link alla scheda allenamento
  }

  if (!localStorage.getItem('authToken')) { //se non loggato
    ensureAuthModalOpen();
    return;
  }
  if (!microId){ location.href = '../microcicli/index.html'; return; } // se manca microId, torno a microcicli

  async function getOrCreateLogbook(microId){    // Recupera logbook esistente o crealo se manca
    const headers = { ...getAuthHeaders() }; // headers con auth

    let r = await fetch(`/api/logbooks/${encodeURIComponent(microId)}`, { headers }); //get logbook
    if (r.status === 404) { // se non esiste, lo creo
      r = await fetch(`/api/logbooks/${encodeURIComponent(microId)}`, { method:'POST', headers });
    }
    if (!r.ok) throw new Error('Errore caricamento/creazione logbook');
    return r.json();
  }
  const log = await getOrCreateLogbook(microId); // prendo o creo il logbook
  const logId = log.id; // id del logbook

  const seduteWrap   = document.getElementById('sedute'); // wrapper per sedute
  const addSedutaBtn = document.getElementById('add-seduta'); // bottone aggiungi seduta

  const HEADERS = ['Esercizio','Set 1','Carico','Set 2','Carico','Set 3','Carico','Set 4','Carico','Set 5','Carico','Azioni'];

  function autoGrow(el){ el.style.height='auto'; el.style.height = el.scrollHeight + 'px'; } // auto-grow textarea

  function makeHead(){ // crea l’intestazione della tabella
    const tr=document.createElement('tr');
    HEADERS.forEach(h=>{ const th=document.createElement('th'); th.textContent=h; tr.appendChild(th); }); // crea th per ogni header
    return tr;
  }

  function rowCell(type, value, onChange){ // Crea una cella <td> e in base a type decide contenuto. onChange funzione da chiamare al cambiamento del contenuto
    const td = document.createElement('td');
    if (type === 'btn'){ // bottone elimina
      const b = document.createElement('button');
      b.className = 'btn btn-row-del';
      b.type = 'button';
      b.textContent = 'Elimina riga';
      b.addEventListener('click', onChange);
      td.append(b);
    } else { //altre celle (carico, set, esercizio)
      const ta = document.createElement('textarea');
      ta.rows = 1;
      ta.value = value || '';
      ta.maxLength = 60; 
      ta.addEventListener('input', () => { autoGrow(ta); onChange(); });
      requestAnimationFrame(() => autoGrow(ta));
      td.append(ta);
    }
    return td;
  }

  function makeTable(){ // Crea struttura tabella 
    const wrap  = document.createElement('div');  wrap.className = 'tabella-wrap';
    const table = document.createElement('table'); table.className = 'tabella';
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
    thead.append(makeHead());
    table.append(thead, tbody);
    wrap.append(table);
    return { wrap, tbody }; //ritorna con tbody per aggiungere righe (wrap contenitore scroll orizzontale)
  }

  async function loadSedute(){
    seduteWrap.innerHTML = ''; // pulisci contenitore sedute  
    const sedute = await fetch(`/api/workoutsEse/${encodeURIComponent(logId)}`, { headers:{...getAuthHeaders()} }).then(r => r.ok ? r.json():[]); //get sedute
    for (const s of sedute){seduteWrap.append(await makeSedutaSection(s));} //per ogni seduta crea sezione e aggiungila al contenitore
  }

  async function makeSedutaSection(seduta){
    const section = document.createElement('section'); section.className = 'seduta';

    // parametri giornata + note
    const top = document.createElement('div'); top.className = 'seduta-top';
    const box = document.createElement('div'); box.className = 'box';
    const h3a = document.createElement('h3'); h3a.textContent = 'Parametri giornata';
    const grid = document.createElement('div'); grid.className = 'quick-grid';
    
    const addRow = (labelText, el) => { // funzione di utilità per aggiungere le righe dei parametri giornata
      const lab = document.createElement('label'); lab.textContent = labelText;
      grid.append(lab, el);
    };

    const inData  = document.createElement('input'); inData.type='date';  inData.value = seduta.data || '';
    const inDur   = document.createElement('input'); inDur.type='text';   inDur.value  = seduta.durata || ''; inDur.maxLength = 40;
    const inPeso  = document.createElement('input'); inPeso.type='text';  inPeso.value = seduta.peso || '';   inPeso.maxLength = 40;
    const inSonno = document.createElement('input'); inSonno.type='text'; inSonno.value= seduta.oreSonno || ''; inSonno.maxLength = 40;
    const inAlim  = document.createElement('input'); inAlim.type='text';  inAlim.value = seduta.alimentazione || ''; inAlim.maxLength = 40;
    const taQual = document.createElement('input'); taQual.type='text'; taQual.value = seduta.qualita || ''; taQual.maxLength = 20;
    const inCard  = document.createElement('input'); inCard.type='text';  inCard.value = seduta.cardio || ''; inCard.maxLength = 40; 

    addRow('Data', inData); addRow('Durata', inDur); addRow('Peso corporeo', inPeso); addRow('Ore sonno', inSonno); addRow('Regime alimentare', inAlim);
    addRow('Qualità allenamento', taQual); addRow('Cardio', inCard);

    box.append(h3a, grid); // appendo intestazione + griglia al box

    const noteBox = document.createElement('div'); noteBox.className = 'note-box'; // contenitore note
    const h3b = document.createElement('h3'); h3b.textContent = 'Note';
    const noteTa = document.createElement('textarea');
    noteTa.className = 'note-area'; noteTa.rows = 6; noteTa.value = seduta.note || '';
    noteTa.maxLength = 500; 

    noteBox.append(h3b, noteTa); // appendo intestazione + textarea al box note
    top.append(box, noteBox); // appendo box parametri + box note al top
    section.append(top); // appendo top alla sezione

    // --- HEAD (nome + azioni)
    const head = document.createElement('div'); head.className = 'seduta-head';
    const nomeWrap = document.createElement('div'); nomeWrap.className = 'nome-seduta-wrap';
    const nomeLbl = document.createElement('label'); nomeLbl.textContent = 'Nome seduta';
    const nomeInp = document.createElement('input'); nomeInp.type='text'; nomeInp.className='nome-seduta'; nomeInp.value = seduta.nomeSeduta || '';
    nomeInp.maxLength = 40; 
    nomeWrap.append(nomeLbl, nomeInp);

    const actions = document.createElement('div'); actions.className = 'seduta-actions';
    const addRowBtn = document.createElement('button'); addRowBtn.type='button'; addRowBtn.className='btn btn-add-row'; addRowBtn.textContent='Aggiungi riga';
    const delBtn    = document.createElement('button'); delBtn.type='button'; delBtn.className='btn btn-del-seduta'; delBtn.textContent='Elimina seduta';
    actions.append(addRowBtn, delBtn);

    head.append(nomeWrap, actions);
    section.append(head);

    // --- TABELLA
    const { wrap, tbody } = makeTable(); // crea tabella e ottieni tbody per aggiungere righe e wrapper per scroll orizzontale
    section.append(wrap); // appendo tabella alla sezione

    // Carica righe esercizi 
    let righe = await fetch(`/api/eserciziEse/${encodeURIComponent(seduta.id)}`, { headers:{...getAuthHeaders()} }).then(r => r.ok ? r.json():[]); //get righe

    function buildRow(r){
      const tr = document.createElement('tr');

      const onSave = debounce(async ()=>{ // funzione per salvare la riga con debounce di 300ms
        const cells = tr.querySelectorAll('td'); // seleziona tutte le celle della riga
        const vals = { // prendi i valori dalle celle
          esercizio: cells[0].querySelector('textarea').value || '', 
          set1:      cells[1].querySelector('textarea').value || '', carico1: cells[2].querySelector('textarea').value || '',
          set2:      cells[3].querySelector('textarea').value || '', carico2: cells[4].querySelector('textarea').value || '',
          set3:      cells[5].querySelector('textarea').value || '', carico3: cells[6].querySelector('textarea').value || '',
          set4:      cells[7].querySelector('textarea').value || '', carico4: cells[8].querySelector('textarea').value || '',
          set5:      cells[9].querySelector('textarea').value || '', carico5: cells[10].querySelector('textarea').value || ''
        };
        Object.assign(r, vals); // aggiorna l'oggetto riga con i nuovi valori
        await fetch(`/api/eserciziEse/${encodeURIComponent(r.id)}`, {
          method:'PUT', headers:{'Content-Type':'application/json', ...getAuthHeaders()}, body: JSON.stringify(vals)
        });
      }, 300);

      tr.append(  // crea e aggiungi celle alla riga
        rowCell('text', r.esercizio, onSave),
        rowCell('text', r.set1, onSave), rowCell('text', r.carico1, onSave),
        rowCell('text', r.set2, onSave), rowCell('text', r.carico2, onSave),
        rowCell('text', r.set3, onSave), rowCell('text', r.carico3, onSave),
        rowCell('text', r.set4, onSave), rowCell('text', r.carico4, onSave),
        rowCell('text', r.set5, onSave), rowCell('text', r.carico5, onSave),
        rowCell('btn',  null, async ()=>{
          const res = await fetch(`/api/eserciziEse/${encodeURIComponent(r.id)}`, { method:'DELETE', headers:{...getAuthHeaders()} });
          if (res.ok){ righe = righe.filter(x => x.id !== r.id); tr.remove(); }
        })
      );

      return tr;
    }

    // render iniziale delle righe
    tbody.innerHTML = ''; //pulisci corpo tabella
    righe.forEach(r => tbody.append(buildRow(r))); //per ogni riga, crea elemento e aggiungilo al corpo tabella

    addRowBtn.addEventListener('click', async ()=>{ //aggiungi nuova riga
      const res = await fetch(`/api/eserciziEse/${encodeURIComponent(seduta.id)}`, { method:'POST', headers:{...getAuthHeaders()} });
      if (!res.ok) return;
      const nr = await res.json();
      righe.push(nr); // aggiungi nuova riga all'array righe
      tbody.appendChild(buildRow(nr)); // crea elemento riga e aggiungilo al corpo tabella
    }); 

    // Elimina seduta
    delBtn.addEventListener('click', async ()=>{ //elimina seduta
      if (!confirm('Eliminare questa seduta?')) return; // conferma eliminazione
      const res = await fetch(`/api/workoutsEse/${encodeURIComponent(seduta.id)}`, { method:'DELETE', headers:{...getAuthHeaders()} });
      if (res.ok){ section.remove(); } // rimuovi sezione dal DOM
    });

    // salva seduta (parametri + note) con debounce di 300ms
    const saveSeduta = debounce(async ()=>{
      const dataObj = {
        nomeSeduta:     nomeInp.value,
        note:           noteTa.value,
        data:           inData.value,
        durata:         inDur.value,
        peso:           inPeso.value,
        oreSonno:       inSonno.value,
        alimentazione:  inAlim.value,
        qualita:        taQual.value, 
        cardio:         inCard.value
      };
      await fetch(`/api/workoutsEse/${encodeURIComponent(seduta.id)}`, {
        method:'PUT', headers:{'Content-Type':'application/json', ...getAuthHeaders()}, body: JSON.stringify(dataObj)
      });
    }, 300);

    [inData,inDur,inPeso,inSonno,inAlim,taQual,inCard,noteTa,nomeInp].forEach(el=>{el.addEventListener('input', saveSeduta);}); //salva quando dati cambiano

    return section; //ritorna la sezione completa
  }

  addSedutaBtn.addEventListener('click', async ()=>{ // aggiungi nuova seduta
  const res = await fetch(`/api/workoutsEse/${encodeURIComponent(logId)}`, { method: 'POST', headers: { ...getAuthHeaders() } });
  if (res.ok){ await loadSedute();} else { alert('Errore creazione seduta'); }
});

  await loadSedute(); // carica sedute all’inizio

})();