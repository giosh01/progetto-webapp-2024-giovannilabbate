const mesoGrid   = document.getElementById('meso-grid'); // contenitore delle cards
const addBtn     = document.getElementById('add-meso'); // bottone +
const modal      = document.getElementById('meso-modal'); // modale
const closeBtn   = document.getElementById('meso-close'); // bottone x
const form       = document.getElementById('meso-form'); // form
const modalTitle = document.getElementById('modal-title'); // titolo modale
const submitBtn  = document.getElementById('meso-submit'); // bottone submit

let mesocicli = []; // array di mesocicli 
let mesocicloEditingId = null; // se nullo: crea, altrimenti se =id del mesociclo parte modifica

function cardMesociclo(m){ // crea card html di un mesociclo
  const a = document.createElement('a'); // crea elemento <a> card
  a.className = 'card meso';
  a.href = `../microcicli/index.html?mesoId=${encodeURIComponent(m.id)}&mesoName=${encodeURIComponent(m.nome)}`; //dopo ? ci sono i parametri dell'url, si concatenano con &, i valori di una variabile si codificano con encodeURIComponent e si mettono dentro ${}

  // icona
  const icon = document.createElement('div');
  icon.className = 'icon';
  const img = document.createElement('img');
  img.src = '../../assets/img/funz1.png';
  icon.appendChild(img);

  // titolo
  const h3 = document.createElement('h3');
  h3.textContent = m.nome;

  // data
  const p = document.createElement('p');
  p.textContent = `Inizio: ${m.start}`;

  // bottone elimina
  const del = document.createElement('button'); // bottone elimina
  del.className = 'del'; // classe css
  del.type = 'button'; // serve per non farlo comportare come submit del form
  del.textContent = '✕'; 
  del.addEventListener('click', async (e)=>{
    e.stopPropagation(); e.preventDefault(); // per non far scattare il click sulla card e non far fare submit al form
    if (!confirm(`Eliminare "${m.nome}"? Tutti i dati collegati verranno rimossi.`)) return; //confirm fa comparire una finestra di dialogo con OK e Annulla
    const r = await fetch('/api/mesocicli/'+encodeURIComponent(m.id), {
      method:'DELETE',
      headers: { ...getAuthHeaders() }
    });
    if (!r.ok){
      const msg = await r.json().catch(()=>({message:'Errore eliminazione'})); //converte in json, se fallisce crea oggetto con messaggio di errore generico
      alert(msg.message || 'Errore eliminazione'); //se json ok, se c'è messaggio lo mostra, altrimenti errore generico
      return;
    }
    await loadMeso();
  });

  // bottone MODIFICA
  const edit = document.createElement('button'); //
  edit.className = 'edit';
  edit.type = 'button';
  edit.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M12 20h9"/>
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
    </svg>`;
  edit.addEventListener('click', (e)=>{
    e.stopPropagation(); e.preventDefault();
    modalTitle.textContent = 'Modifica mesociclo';
    submitBtn.textContent  = 'Salva';
    form.nome.value  = m.nome || '';  
    form.start.value = m.start || '';
    mesocicloEditingId = m.id;
    modal.classList.add('show'); // add aggiunge la classe "show" che rende visibile la modale. è definita nel css
  });

  a.append(icon, h3, p, del, edit); // aggiunge i figli alla card
  return a;
}

// aggiorna contenuto della griglia mesogrid: prima svuota le card esistenti, poi ricrea e inserisce le nuove card, mantenendo fisso il pulsante di aggiunta.
function render(){
  mesoGrid.querySelectorAll('.card.meso').forEach(el=>el.remove());  // svuota card esistenti
  const addCard = document.getElementById('add-meso'); // è il box di aggiunta
  mesocicli.forEach(m => mesoGrid.insertBefore(cardMesociclo(m), addCard)); // inserisce le nuove card prima del box di aggiunta
}

async function loadMeso(){
  const r = await fetch('/api/mesocicli', { headers: { ...getAuthHeaders() } }); //...getAuthHeaders() da oggetto con header di auth (modo compatto di scrivere)
  mesocicli = (r.status === 401 || r.status === 403) ? [] : await r.json(); //se non autorizzato array vuoto, altrimenti converte in json
  render(); //aggiorna griglia
}

// open modale (CREA)
addBtn.addEventListener('click', (e)=>{
  if (!localStorage.getItem('authToken')){ ensureAuthModalOpen(); return; } // se non autenticato, apri modale auth
  modalTitle.textContent = 'Nuovo mesociclo'; // titolo modale
  submitBtn.textContent  = 'Crea'; // testo bottone submit
  mesocicloEditingId = null; // indica che si sta creando
  form.reset(); 
  modal.classList.add('show'); // aggiunge classe "show" che rende visibile modale. è definita nel css
});
closeBtn.addEventListener('click', ()=> modal.classList.remove('show')); // close modale

form.addEventListener('submit', async e=>{ // submit form (crea o modifica)
  e.preventDefault(); // previene comportamento di default (ricarica pagina)
  if (!localStorage.getItem('authToken')){ ensureAuthModalOpen(); return; } // se non autenticato, apri modale auth
  if (!form.reportValidity()) return;  // funzione nativa che mostra messaggi di errore se campi non rispettano i vincoli html

  const dataObj = Object.fromEntries(new FormData(form).entries()); // .entries() ritorna array di coppie chiave-valore, formdata raccoglie i dati del form, object.fromentries converte array in oggetto
  const carico = { nome: dataObj.nome.trim(), start: dataObj.start }; // crea oggetto carico con i dati del form

  let url = '/api/mesocicli';
  let method = 'POST';
  if (mesocicloEditingId){ //decidiamo se usare post o put
    url = '/api/mesocicli/' + encodeURIComponent(mesocicloEditingId);
    method = 'PUT';
  }

  const r = await fetch(url, {
    method,
    headers:{ 'Content-Type':'application/json', ...getAuthHeaders() }, // getAuthHeaders() ritorna oggetto con header di auth (modo compatto di scrivere)
    body: JSON.stringify(carico)
  });

  if (!r.ok){
    const msg = await r.json().catch(()=>({message:'Errore'}));
    alert(msg.message || (mesocicloEditingId ? 'Errore salvataggio' : 'Errore creazione'));
    return;
  }

  form.reset(); // pulisce form
  modal.classList.remove('show'); // chiude modale
  mesocicloEditingId = null; // reset id creazione/modifica
  await loadMeso(); // ricarica mesocicli
});

loadMeso(); // carica mesocicli all'apertura della pagina