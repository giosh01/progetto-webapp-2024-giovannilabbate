const p = new URLSearchParams(location.search); // p è un dizionario con i parametri passati in query string
const mesoId   = p.get('mesoId'); // prendo il parametro mesoId
const mesoName = p.get('mesoName'); //prendo il parametro mesoName per mostrare nome su pagina

if (!mesoId) { location.href = '../mesocicli/index.html'; throw new Error("mesoId mancante"); }

document.getElementById('titolo-meso').textContent = mesoName; // mostro nome mesociclo

const ul      = document.getElementById('lista-micro'); // ul dove mettere i microcicli
const addBtn  = document.getElementById('btn-add'); // bottone "Aggiungi"
const gmSel   = document.getElementById('gm-select'); // select gruppo muscolare per grafico
const chartEl = document.getElementById('setsChart'); // canvas grafico

let microList = []; // lista microcicli caricati
let setsChart = null; // variabile per tenere il grafico, inizialmente null

async function load(){ // Carica lista micro + grafico
  ul.innerHTML = ''; // svuota lista
  const r = await fetch(`/api/microcicli/${encodeURIComponent(mesoId)}`, { headers: { ...getAuthHeaders() } });
  microList = r.ok ? await r.json() : [];
  microList.forEach(m => ul.appendChild(riga(m))); // aggiorna il dom con le righe micro create dalla funzione riga()
  refreshChart(); // aggiorna il grafico
}

function riga(m){
  const li = document.createElement('li'); // crea li per ogni microciclo
  li.className = 'riga';

  const nome = document.createElement('div'); // div per il nome
  nome.className = 'nome';
  nome.textContent = m.nome;

  const del = document.createElement('button'); // bottone elimina
  del.className = 'del-micro';
  del.type = 'button';
  del.title = 'Elimina';
  del.textContent = '✕';

  li.append(nome, del); // niente più contenitore actions

  del.addEventListener('click', async (e)=>{     // elimina micro
    e.stopPropagation(); // evita che si attivi il click sul li
    if (!confirm('Eliminare microciclo?')) return; // conferma eliminazione

    const res = await fetch(`/api/microcicli/${m.id}`, { method:'DELETE', headers:{ ...getAuthHeaders() } });
    if (res.ok){
      li.remove(); // rimuovi dal DOM
      microList = microList.filter(x => x.id !== m.id); // rimuovi da lista
      refreshChart(); // aggiorna grafico
    }
  });

  li.addEventListener('click', ()=>{ // click su riga per andare al dettaglio
    location.href =
      `../dettaglio/index.html?mesoId=${encodeURIComponent(mesoId)}&microId=${encodeURIComponent(m.id)}&mesoName=${encodeURIComponent(mesoName)}&microName=${encodeURIComponent(m.nome)}`;
  });

  return li;
}

function askDuplica(){  // modale crea nuovo / duplica
  return new Promise(resolve=>{ // restituisce una promise, si aspetta la scelta dell'utente
    const modal = document.getElementById('confirm-duplica'); // prendo il modal

    const btnNew = document.getElementById('btn-nuovo'); // bottone nuovo
    const btnDup = document.getElementById('btn-duplica'); // bottone duplica
    const btnX   = document.getElementById('duplica-close'); // bottone chiudi

    const close  = (val)=>{ modal.classList.remove('show'); resolve(val); }; // funzione per chiudere il modal e risolvere la promise

    btnNew.addEventListener('click', ()=> close('nuovo'), { once:true }); // chiude modal e risolve promise con 'nuovo'
    btnDup.addEventListener('click', ()=> close('duplica'), { once:true }); // chiude modal e risolve promise con 'duplica'
    btnX.addEventListener('click',   ()=> close('chiudi'), { once:true }); // chiude modal e risolve promise con 'chiudi'

    modal.classList.add('show'); // mostra il modal
  });
}

addBtn.addEventListener('click', async ()=>{ // click su bottone aggiungi (+)
  if (!localStorage.getItem('authToken')){ ensureAuthModalOpen(); return; } // se non autenticato, apri modale auth

  const choice = await askDuplica(); // aspetta la scelta dell'utente ('nuovo', 'duplica', 'chiudi')
  if (choice === 'chiudi') return; // se chiudi, esci

  if (choice === 'duplica'){ // se l'utente sceglie duplica
    if (microList.length === 0){ 
      alert('Nessun microciclo da duplicare');
      return;
    }
    const last = microList.at(-1); // prendo l'ultimo microciclo
    const res = await fetch(`/api/microcicli/${encodeURIComponent(last.id)}/copies`, { //passo l'id dell'ultimo microciclo
      method:'POST',
      headers:{ 'Content-Type':'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ mesoId })
    });
    if (!res.ok){ alert('Errore duplicazione'); return; }
    const m = await res.json();
    microList.push(m); // aggiungo alla lista
    ul.appendChild(riga(m)); // aggiungo al DOM
    refreshChart(); // aggiorno grafico
    return;
  }

  const res = await fetch('/api/microcicli', {  //se l'utente sceglie nuovo
    method:'POST',
    headers:{ 'Content-Type':'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ mesoId })
  });
  if (!res.ok){ alert('Errore creazione microciclo'); return; }

  const m = await res.json();
  microList.push(m);
  ul.appendChild(riga(m));
  refreshChart();
});

async function fetchChartData(gm){ // prendo i dati per il grafico
  if (!gm || !mesoId) return { labels: [], data: [] }; // se manca gm o mesoId, restituisci vuoto
  const res = await fetch(`/api/microcicli/${encodeURIComponent(mesoId)}/stats/serie-gm?gm=${encodeURIComponent(gm)}`, { headers: { ...getAuthHeaders() } });
  if (!res.ok) return { labels: [], data: [] }; // se errore, restituisci vuoto
  const json = await res.json(); 
  return {
    labels: json.microcicli.map(m => m.microNome), // etichette sono i nomi dei microcicli
    data:   json.microcicli.map(m => m.sets) // dati sono il numero di serie per ogni microciclo
  };
}

async function refreshChart(){ // aggiorna o crea il grafico
  if (!chartEl|| !window.Chart) return; // se manca canvas o libreria Chart.js, esci.
  const gm  = gmSel.value ; // legge il gruppo muscolare selezionato, default 'petto'
  const ctx = chartEl.getContext('2d'); //oggetto che charta.js usa per disegnare

  const { labels, data } = await fetchChartData(gm); // prendo i dati per il grafico

  const options = { // opzioni del grafico
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display:false } },
    layout: { padding: 4 },
    scales: {
      x: { ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,.15)', lineWidth: 1 } },
      y: { beginAtZero: true, ticks: { color: '#fff', stepSize: 1 }, grid: { color: 'rgba(255,255,255,.15)', lineWidth: 1 } }
    }
  };

  const dataset = { // dataset per il grafico
    label: `Serie (${gm})`, data, backgroundColor: "oklch(0.76 0.1 355)", borderWidth: 0,
    borderSkipped: false, borderRadius: 2, categoryPercentage: 0.6, barPercentage: 0.7, maxBarThickness: 18, barThickness: 'flex' 
  };

  if (!setsChart) { // se il grafico non esiste, crealo
    setsChart = new Chart(ctx, { type: 'bar', data: { labels, datasets: [dataset] }, options }); //crea il grafico
  } else { // se esiste, aggiornalo
    setsChart.data.labels = labels;
    setsChart.data.datasets[0] = dataset;
    setsChart.update();
  }
}

gmSel.addEventListener('change', refreshChart); // cambio gruppo muscolare, aggiorna grafico

if (!localStorage.getItem('authToken')) ensureAuthModalOpen(); // se non autenticato, apri modale auth
load().catch(console.error); 