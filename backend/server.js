const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 3000;

app.use(express.json());

// ====== CARTELLA DATA ==================================================================================================
const dataDir = path.join(__dirname, '..', 'data');  // percorso completo della cartella data
const p = (f) => path.join(dataDir, f);  //funzione p prende in input un file json e ti da il percorso completo
const files = {          // dizionario dei file JSON, es scrivi files.users per avere il percorso completo di users.json
  users: p('users.json'), meso: p('meso.json'), micro: p('micro.json'),
  schede: p('schede.json'), workoutsPrev: p('workoutsPrev.json'),
  eserciziPrev: p('eserciziPrev.json'), logbook: p('logbook.json'),
  workoutsEse: p('workoutsEse.json'), eserciziEse: p('eserciziEse.json')
};

// ====== STATO MEMORIA ================================================================================================
let users=[], meso=[], micro=[], schede=[], workoutsPrev=[], eserciziPrev=[], logbook=[], workoutsEse=[], eserciziEse=[]; // array x dati memoria

function safeLoad(fp, fallback){    // carica file json in modo sicuro (se manca o errore ritorna fallback)
  try {
    if (!fs.existsSync(fp)) return fallback; // file non esiste
    const testo = fs.readFileSync(fp, 'utf8'); // se esiste legge il file
    const val = testo.trim() ? JSON.parse(testo) : fallback; // se è vuoto ritorna fallback, altrimenti trasforma da json in oggetto js
    // normalizza array
    return Array.isArray(val) ? val : fallback; // se non è un array ritorna fallback
  } catch (err) {  //se ci sono altri errori stampa messaggio e ritorna fallback
    console.error('errore di safeload per ', fp, err);
    return fallback;
  }
}

function save(fp, data, label){ //scrive i dati in un file json
  try {
    fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf8'); //scrive il file in formato json con indentazione 2 spazi
  } catch (err) {
    console.error(`Errore scrittura ${label}:`, err);
  }
}

function loadAll(){     // carica tutti i file json in memoria, come fallback usa array vuoti
  users = safeLoad(files.users, []); meso = safeLoad(files.meso, []); micro = safeLoad(files.micro, []);
  schede = safeLoad(files.schede, []); workoutsPrev = safeLoad(files.workoutsPrev, []); eserciziPrev = safeLoad(files.eserciziPrev, []);
  logbook = safeLoad(files.logbook, []); workoutsEse = safeLoad(files.workoutsEse, []); eserciziEse = safeLoad(files.eserciziEse, []);
}
loadAll();

// === HELPERS ==========================================================================================================
function nextId(pref, arr){ // genera nuovo id per le entità con prefisso e numero progressivo. es. pref=meso, arr=meso[]
  const max = arr.reduce((m, x)=>{  //reduce trova numero più alto esistente, m accumula il max, x è elemento corrente, cicla tutti elementi
    const n = parseInt(String(x.id||'').replace(pref,''),10); // estrae il numero dall'id e lo converte in intero base10
    return isNaN(n)? m: Math.max(m,n); // se n non è un numero ritorna m altrimenti il massimo tra m e n
  }, 0); // reduce parte da 0
  return `${pref}${max+1}`; //ritorna prefisso + numero +1
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/; // espressione regolare per formato YYYY-MM-DD
function isValidISODate(s) { // // controllo date: controlla se s è stringa, rispetta date_re e se data valida
  return typeof s === 'string' && DATE_RE.test(s) && !isNaN(Date.parse(s)); //
}

// ====== STATICO ===============================================================================================
app.use(express.static(path.join(__dirname, '..', 'frontend'))); // serve i file statici della cartella frontend

// Rotte pagine comode (serve home index.html a http://localhost:3000/)
app.get('/', (req,res)=> 
  res.sendFile(path.join(__dirname,'..','frontend','home','index.html'))
);

// ====== AUTENTICAZIONE MIDDLEWARE  ================================================================================ 
function authenticateToken(req, res, next){
  const token = req.headers['x-auth-token']; //cerca token "x-auth-token" nell'header
  if (!token) return res.status(401).json({ message: "Accesso negato, token mancante." });
  const ok = users.some(u => u.id === token); //controlla se esiste un utente con id uguale al token
  if (!ok) return res.status(403).json({ message: "Token non valido o utente inesistente." });
  req.userId = token; // aggiunge userId alla richiesta per usarlo dopo
  next();
}

// ====== AUTENTICAZIONE =======================================================================================================
app.post('/api/register', (req, res) => { 
  const { username, password } = req.body || {}; 
  const u = String(username || '').trim(); // normalizza a stringa e rimuove spazi
  const p = String(password || ''); // normalizza a stringa

  // controlli di lunghezza come fatto nel frontend
  if (u.length < 3 || u.length > 20) {
    return res.status(400).json({ message: "Username deve avere 3-20 caratteri." });
  }
  if (p.length < 6 || p.length > 30) {
    return res.status(400).json({ message: "Password deve avere 6-30 caratteri." });
  }

  // username già usato?
  const esiste = users.some(user => user.username.toLowerCase() === u.toLowerCase());
  if (esiste) return res.status(409).json({ message: "Username già in uso." }); //409=conflitto

  const newId = nextId('user', users);
  const user = { id: newId, username: u, password: p };
  users.push(user);
  save(files.users, users, 'users.json');

  res.status(201).json({ message: "Registrazione ok.", userId: user.id });
});


app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({message: "Credenziali non valide."});

  res.json({ //niente password, dopo login non deve uscire dal server
    message: "Login ok.",
    authToken: user.id, // usa l'id come token di autenticazione
    user: { id: user.id, username: user.username }
  });
});

// ====== CURRENT USER =================================================================================================
app.get('/api/users/current', authenticateToken, (req,res)=>{ //chi è utente loggato
  const u = users.find(x => x.id === req.userId);
  if (!u) return res.status(404).json({ message: "Utente non trovato." });
  const { password, ...data } = u; //estrae la password e metto il resto in data, non manda la password
  res.json(data);
});

app.delete('/api/users/current', authenticateToken, (req, res) => {
  const userId = req.userId; //usa solo l'id dal token

  if (!users.some(u => u.id === userId)) {
    return res.status(404).json({ message: "Utente non trovato." });
  }

  // trova e rimuovi tutti i dati collegati all'utente in cascata
  const mesoIds = meso.filter(m => m.ownerId === userId).map(m => m.id); // filter prende solo i meso dell'utente, map estrae gli id
  meso = meso.filter(m => m.ownerId !== userId); // rimuove i meso dell'utente

  const microIds = micro.filter(x => mesoIds.includes(x.mesoId)).map(x => x.id);
  micro = micro.filter(x => !mesoIds.includes(x.mesoId));

  const schedeIds = schede.filter(s => microIds.includes(s.microId)).map(s => s.id);
  schede = schede.filter(s => !microIds.includes(s.microId));

  const wpIds = workoutsPrev.filter(wp => schedeIds.includes(wp.schedaId)).map(wp => wp.id);
  workoutsPrev = workoutsPrev.filter(wp => !schedeIds.includes(wp.schedaId));

  eserciziPrev = eserciziPrev.filter(ep => !wpIds.includes(ep.workoutPrevId));

  const logIds = logbook.filter(lb => microIds.includes(lb.microId)).map(lb => lb.id);
  logbook = logbook.filter(lb => !microIds.includes(lb.microId));

  const weIds = workoutsEse.filter(we => logIds.includes(we.logId)).map(we => we.id);
  workoutsEse = workoutsEse.filter(we => !logIds.includes(we.logId));

  eserciziEse = eserciziEse.filter(ee => !weIds.includes(ee.workoutEseId));

  users = users.filter(u => u.id !== userId); // filter restituisce tutti gli utenti tranne quello da eliminare

  save(files.users, users, 'users.json'); save(files.meso, meso, 'meso.json'); save(files.micro, micro, 'micro.json');
  save(files.schede, schede, 'schede.json'); save(files.workoutsPrev, workoutsPrev, 'workoutsPrev.json');
  save(files.eserciziPrev, eserciziPrev, 'eserciziPrev.json'); save(files.logbook, logbook, 'logbook.json');
  save(files.workoutsEse, workoutsEse, 'workoutsEse.json'); save(files.eserciziEse, eserciziEse, 'eserciziEse.json');

  res.json({ message: "Account eliminato con tutti i dati collegati." }); // 200 OK
});

// ====== MESOCICLI ==================================================================================================
app.get('/api/mesocicli', authenticateToken, (req,res)=>{
  const list = meso.filter(m => m.ownerId === req.userId); //lista meso utente
  res.json(list);
});

app.get('/api/mesocicli/:id', authenticateToken, (req,res)=>{
  const item = meso.find(m => m.id === req.params.id && m.ownerId === req.userId); //trova singolo meso per id. req.params è id del mesociclo preso dalla URL (:id)
  if (!item) return res.status(404).json({ message: "Mesociclo non trovato." });
  res.json(item);
});

app.post('/api/mesocicli', authenticateToken, (req, res) => {
  const { nome, start } = req.body || {};
  const n = typeof nome === 'string' ? nome.trim() : ''; // se nome è stringa lo normalizza altrimenti stringa vuota
  const s = typeof start === 'string' ? start.trim() : '';

  if (!n) return res.status(400).json({ message: "Il nome è obbligatorio." });
  if (n.length > 30) return res.status(400).json({ message: "Nome max 30 caratteri." });
  if (!isValidISODate(s)) return res.status(400).json({ message: "Data deve essere in formato YYYY-MM-DD." });

  const id = nextId('meso', meso); //genera nuovo id
  const item = { id, ownerId: req.userId, nome: n, start: s }; // crea nuovo oggetto meso
  meso.push(item); // viene aggiunto all’array meso (in memoria).
  save(files.meso, meso, 'meso.json');
  res.status(201).json(item); //ritorna 201 Created con il nuovo oggetto meso
});

app.put('/api/mesocicli/:id', authenticateToken, (req, res) => {
  const idx = meso.findIndex(m => m.id === req.params.id && m.ownerId === req.userId); // cerca nell'array meso l'indice dell'elemento con id e ownerId corrispondenti
  if (idx === -1) return res.status(404).json({ message: "Mesociclo non trovato." });
  const { nome, start } = req.body || {};

  if (typeof nome !== 'string' || !nome.trim()) { // se nome non è stringa o è vuoto
    return res.status(400).json({ message: "Il nome è obbligatorio." });
  }
  const n = nome.trim(); 
  if (n.length > 30) { 
    return res.status(400).json({ message: "Nome max 30 caratteri." });
  }

  if (typeof start !== 'string' || !isValidISODate(start.trim())) {
    return res.status(400).json({ message: "Start deve essere in formato YYYY-MM-DD valido." });
  }
  const s = start.trim();

  meso[idx] = { ...meso[idx], nome: n, start: s }; //lo spread (...) copia tutte le proprietà esistenti (nome, start) e poi sovrascrive nome e start
  save(files.meso, meso, 'meso.json');
  res.json(meso[idx]);
});

app.delete('/api/mesocicli/:id', authenticateToken, (req,res)=>{
  const { id } = req.params;
  const esiste = meso.some(m => m.id === id && m.ownerId === req.userId);
  if (!esiste) return res.status(404).json({ message: "Mesociclo non trovato." });

  meso = meso.filter(m => !(m.id === id && m.ownerId === req.userId)); // rimuove il meso solo se appartiene all'utente

  const microToRemove = micro.filter(x => x.mesoId === id).map(x => x.id); // id dei micro da rimuovere
  micro = micro.filter(x => x.mesoId !== id); // rimuove i micro del meso

  const schedeToRemove = schede.filter(s => microToRemove.includes(s.microId)).map(s => s.id); // per ogni scheda, se il suo microId è in microToRemove prendi il suo id
  schede = schede.filter(s => !microToRemove.includes(s.microId)); // tiene solo le schede il cui microId non è in microToRemove

  const wpToRemove = workoutsPrev.filter(wp => schedeToRemove.includes(wp.schedaId)).map(wp => wp.id); //togle i workoutPrev legati alle schede da rimuovere
  workoutsPrev = workoutsPrev.filter(wp => !schedeToRemove.includes(wp.schedaId));

  eserciziPrev = eserciziPrev.filter(ep => !wpToRemove.includes(ep.workoutPrevId)); // rimuove gli eserciziPrev legati ai workoutPrev rimossi

  const logToRemove = logbook.filter(lb => microToRemove.includes(lb.microId)).map(lb => lb.id); // logbook legati ai micro da rimuovere
  logbook = logbook.filter(lb => !microToRemove.includes(lb.microId));

  const weToRemove = workoutsEse.filter(we => logToRemove.includes(we.logId)).map(we => we.id); // workoutsEse legati ai logbook rimossi
  workoutsEse = workoutsEse.filter(we => !logToRemove.includes(we.logId));

  eserciziEse = eserciziEse.filter(ee => !weToRemove.includes(ee.workoutEseId)); // rimuove gli eserciziEse legati ai workoutsEse rimossi

  save(files.meso, meso, 'meso.json'); save(files.micro, micro, 'micro.json'); save(files.schede, schede, 'schede.json');
  save(files.workoutsPrev, workoutsPrev, 'workoutsPrev.json'); save(files.eserciziPrev, eserciziPrev, 'eserciziPrev.json');
  save(files.logbook, logbook, 'logbook.json'); save(files.workoutsEse, workoutsEse, 'workoutsEse.json'); save(files.eserciziEse, eserciziEse, 'eserciziEse.json');

  res.json({ message: 'Mesociclo eliminato' }); // 200 OK
});

// ====== MICROCICLI =======================================================================================================
app.get('/api/microcicli/:mesoId', authenticateToken, (req, res) => { 
  const list = micro.filter(m => m.mesoId === req.params.mesoId && m.ownerId === req.userId);
  res.json(list);
});

app.post('/api/microcicli', authenticateToken, (req,res)=>{
  const { mesoId } = req.body || {};
  if (!mesoId) return res.status(400).json({ message:"mesoId richiesto." });

  const parent = meso.find(m => m.id === mesoId && m.ownerId === req.userId); 
  if (!parent) return res.status(404).json({ message:"Mesociclo non trovato." });

  const count   = micro.filter(x => x.mesoId === mesoId && x.ownerId === req.userId).length; // conta micro esistenti per quel meso
  const newId   = nextId('micro', micro); 
  const nuovo   = { id:newId, ownerId:req.userId, mesoId, nome:`Microciclo ${count+1}` };
  micro.push(nuovo);
  save(files.micro, micro, 'micro.json');
  return res.status(201).json(nuovo);
});

app.post('/api/microcicli/:id/copies', authenticateToken, (req,res)=>{
  const srcId   = req.params.id; // id del micro sorgente da clonare
  const srcMicro= micro.find(x => x.id === srcId && x.ownerId === req.userId); // trova micro sorgente
  if (!srcMicro) return res.status(404).json({ message:"Micro sorgente non trovato." });

  const mesoId  = req.body.mesoId; // id del meso target dove creare il clone
  const parent  = meso.find(m => m.id === mesoId && m.ownerId === req.userId); // trova meso target
  if (!parent)  return res.status(404).json({ message:"Mesociclo target non trovato." });

  const count   = micro.filter(x => x.mesoId === mesoId && x.ownerId === req.userId).length; // conta micro esistenti per quel meso
  const newId   = nextId('micro', micro); // nuovo id per il micro clone
  const nuovo   = { id:newId, ownerId:req.userId, mesoId, nome: (`Microciclo ${count+1}`)}; // nuovo micro clone
  micro.push(nuovo);

  // clona scheda + wp + ep
  const srcScheda = schede.find(s => s.microId === srcMicro.id && s.ownerId === req.userId); // scheda sorgente
  if (srcScheda){ 
    const newSchedaId = nextId('scheda', schede); // nuovo id per la scheda clone
    schede.push({ id:newSchedaId, ownerId:req.userId, microId:newId, // inserisce la nuova scheda
      split: Array.isArray(srcScheda.split)? [...srcScheda.split] : [], // copia array split (se manca usa array vuoto)
      params: { ...(srcScheda.params || {}) } // copia oggetto params (se manca usa oggetto vuoto)
    });

    const wpMap = new Map(); // tabella di conversione id vecchi a id nuovi, per non lasciare i figli collegati (ep) ai genitori vecchi (wp)
    workoutsPrev.filter(w=> w.schedaId===srcScheda.id).forEach(w=>{  // prende tutti i workout della scheda sorgente
      const nid = nextId('wp', workoutsPrev); // nuovo id per il workout clone
      wpMap.set(w.id, nid); // mappa id vecchio -> nuovo
      workoutsPrev.push({ id:nid, ownerId:req.userId, schedaId:newSchedaId, nomeSeduta:w.nomeSeduta||'' }); // clona workout
    });

    const src = eserciziPrev.filter(e => wpMap.has(e.workoutPrevId)); // array di esercizi da clonare, solo quelli dei workout clonati, quelli con id in wpMap
    for (const e of src) { // il for itera sull'array src
      const newId = nextId('ep', eserciziPrev); // nuovo id per l'esercizio clone
      eserciziPrev.push({ // clona esercizio
        id: newId, ownerId: req.userId,
        workoutPrevId: wpMap.get(e.workoutPrevId), // recupera il nuovo id del workout dalla mappa
        esercizio: e.esercizio || '', recupero:  e.recupero  || '', set1: e.set1 || '', tempo1: e.tempo1 || '', set2: e.set2 || '', tempo2: e.tempo2 || '',
        set3: e.set3 || '', tempo3: e.tempo3 || '', set4: e.set4 || '', tempo4: e.tempo4 || '', set5: e.set5 || '', tempo5: e.tempo5 || '', gm: e.gm || ''
      });
    }}

  // clona logbook + we + ee
  const srcLog = logbook.find(l=> l.microId===srcMicro.id && l.ownerId===req.userId); // logbook sorgente 
  if (srcLog){
    const newLogId = nextId('log', logbook);
    logbook.push({ id:newLogId, ownerId:req.userId, microId:newId });

    const weMap = new Map(); // tabella di conversione id vecchi a id nuovi, per non lasciare i figli collegati (ee) ai genitori vecchi (we)
    workoutsEse.filter(w=> w.logId===srcLog.id).forEach(w=>{
      const nid = nextId('we', workoutsEse);
      weMap.set(w.id, nid);
      workoutsEse.push({ id:nid, ownerId:req.userId, logId:newLogId,
        nomeSeduta:w.nomeSeduta||'', note:w.note||'', data:'', durata:w.durata||'',
        peso:w.peso||'', oreSonno:w.oreSonno||'', alimentazione:w.alimentazione||'',
        qualita:w.qualita||'', cardio:w.cardio||'' });
    });

    const srcEE = eserciziEse.filter(e => weMap.has(e.workoutEseId)); // prende solo gli esercizi dei workout clonati
    for (const e of srcEE) {
      const newEeId = nextId('ee', eserciziEse);
      eserciziEse.push({
        id: newEeId, ownerId: req.userId,
        workoutEseId: weMap.get(e.workoutEseId), // collega al WE clonato
        esercizio: e.esercizio || '',
        set1: e.set1 || '', carico1: e.carico1 || '',
        set2: e.set2 || '', carico2: e.carico2 || '',
        set3: e.set3 || '', carico3: e.carico3 || '',
        set4: e.set4 || '', carico4: e.carico4 || '',
        set5: e.set5 || '', carico5: e.carico5 || ''
      });
    }}

  save(files.micro, micro, 'micro.json'); save(files.schede, schede, 'schede.json');
  save(files.workoutsPrev, workoutsPrev, 'workoutsPrev.json'); save(files.eserciziPrev, eserciziPrev, 'eserciziPrev.json');
  save(files.logbook, logbook, 'logbook.json'); save(files.workoutsEse, workoutsEse, 'workoutsEse.json');
  save(files.eserciziEse, eserciziEse, 'eserciziEse.json');
  return res.status(201).json(nuovo);
});

app.delete('/api/microcicli/:id', authenticateToken, (req, res) => {
  const m = micro.find(x => x.id === req.params.id && x.ownerId === req.userId); // trova micro
  if (!m) return res.status(404).json({ message: 'Micro non trovato' });

  const schedaIds = schede.filter(s => s.microId === m.id).map(s => s.id); // id delle schede da rimuovere. map estrae solo gli id
  schede = schede.filter(s => s.microId !== m.id); // rimuove le schede del micro

  const wpIds = workoutsPrev.filter(w => schedaIds.includes(w.schedaId)).map(w => w.id); // id dei workoutPrev da rimuovere
  workoutsPrev = workoutsPrev.filter(w => !schedaIds.includes(w.schedaId)); // rimuove i workoutPrev delle schede
  eserciziPrev = eserciziPrev.filter(e => !wpIds.includes(e.workoutPrevId)); // rimuove gli eserciziPrev legati ai workoutPrev rimossi

  const logIds = logbook.filter(l => l.microId === m.id).map(l => l.id); // id dei logbook da rimuovere
  logbook = logbook.filter(l => l.microId !== m.id); // rimuove i logbook del micro
  const weIds = workoutsEse.filter(w => logIds.includes(w.logId)).map(w => w.id); // id dei workoutsEse da rimuovere
  workoutsEse = workoutsEse.filter(w => !logIds.includes(w.logId)); // rimuove i workoutsEse dei logbook rimossi
  eserciziEse = eserciziEse.filter(e => !weIds.includes(e.workoutEseId)); // rimuove gli eserciziEse legati ai workoutsEse rimossi

  micro = micro.filter(x => !(x.id === m.id && x.ownerId === req.userId)); // rimuove il micro, solo se appartiene all'utente

  save(files.schede, schede, 'schede.json'); save(files.workoutsPrev, workoutsPrev, 'workoutsPrev.json');
  save(files.eserciziPrev, eserciziPrev, 'eserciziPrev.json'); save(files.logbook, logbook, 'logbook.json');
  save(files.workoutsEse, workoutsEse, 'workoutsEse.json'); save(files.eserciziEse, eserciziEse, 'eserciziEse.json'); save(files.micro, micro, 'micro.json');
  res.json({ message: 'Microciclo eliminato' }); // 200 OK
});

app.get('/api/microcicli/:mesoId/stats/serie-gm', authenticateToken, (req, res) => {
  const { mesoId } = req.params; // estrae mesoId dai parametri della rotta
  const { gm } = req.query;  // estrae gm dai parametri della query string
  
  const ALLOWED_GM = ['petto','dorso','delt. lat.','delt. fr.','delt. po.','bicipiti','tricipiti','quadr.','femorali','polpacci','glutei','trapezi','addome'];
  if (!gm) return res.status(400).json({ message: "Parametro 'gm' richiesto." }); 
  if (!ALLOWED_GM.includes(gm)) return res.status(400).json({ message: "GM non valido." }); 
  
  const mesoItem = meso.find(m => m.id === mesoId && m.ownerId === req.userId); // controlla che il meso esista e appartenga all'utente
  if (!mesoItem) return res.status(404).json({ message: "Mesociclo non trovato." }); 

  const microList = micro.filter(m => m.mesoId === mesoId && m.ownerId === req.userId); // micro del meso per l'utente

  const SET_KEYS = ['set1','set2','set3','set4','set5']; // array delle chiavi dei set
  const countSets = (ex) => SET_KEYS.reduce((n,k) => n + ((ex[k] || '').trim() ? 1 : 0), 0); // conta i set non vuoti in un esercizio, reduce cicla su SET_KEYS, n accumula il conteggio, k è la chiave corrente, reduce somma 1 se il set non è vuoto

  const result = microList.map(mi => { //map trasforma ogni elemento di un array in un nuovo valore, qui trasforma ogni micro in un oggetto con id, nome e totale set
    const s = schede.find(x => x.microId === mi.id && x.ownerId === req.userId); // cerca la scheda di allenamento collegata a quel micro.
    if (!s) return { microId: mi.id, microNome: mi.nome, sets: 0 }; //se non c'è scheda, sets=0

    const sedute = workoutsPrev.filter(w => w.schedaId === s.id); // workoutPrev della scheda trovata

    let total = 0;
    for (const w of sedute) { // itera sulle sedute
      const righe = eserciziPrev.filter(e => e.workoutPrevId === w.id && e.gm === gm);  // eserciziPrev della seduta corrente e del gm richiesto
      for (const r of righe) total += countSets(r); // somma i set di ogni esercizio iterando su righe
    }
    return { microId: mi.id, microNome: mi.nome, sets: total }; // ritorna oggetto con id, nome e totale set
  });
  res.json({ gm, microcicli: result });
});

// ====== SCHEDA ALLENAMENTO =========================================================================================
app.get('/api/schede/:microId', authenticateToken, (req, res) => { // rotta per ottenere la scheda di un micro
  const { microId } = req.params; // estrae microId dai parametri della rotta
  const m = micro.find(x => x.id === microId && x.ownerId === req.userId); // controlla che il micro esista e appartenga all'utente
  if (!m) return res.status(404).json({ message: 'Microciclo non trovato.' }); 

  const s = schede.find(x => x.microId === microId && x.ownerId === req.userId); // cerca la scheda di allenamento collegata a quel micro.
  if (!s) return res.status(404).json({ message: 'Scheda non trovata.' }); // 404 se non c'è scheda

  res.json(s);
});

app.post('/api/schede/:microId', authenticateToken, (req, res) => { // crea una nuova scheda per un micro
  const { microId } = req.params; // estrae microId dai parametri della rotta
  const m = micro.find(x => x.id === microId && x.ownerId === req.userId); // controlla che il micro esista e appartenga all'utente
  if (!m) return res.status(404).json({ message: 'Microciclo non trovato.' }); 

  const exists = schede.find(x => x.microId === microId && x.ownerId === req.userId); // controlla se esiste già una scheda per quel micro
  if (exists) return res.status(409).json({ message: 'Scheda già esistente per questo microciclo.' }); // 409=conflitto

  const id = nextId('scheda', schede); //genera nuovo id
  const s = {
    id,
    microId,
    ownerId: req.userId, 
    split: Array(14).fill(''), // array di 14 stringhe vuote
    params: { durata:'', densita:'', intensita_carico:'', intensita_perc:'', volume:'' } 
  };
  schede.push(s);
  save(files.schede, schede, 'schede.json');
  res.status(201).json(s);
});

app.put('/api/schede/:id', authenticateToken, (req, res) => { // aggiorna la scheda esistente
  const idx = schede.findIndex(x => x.id === req.params.id && x.ownerId === req.userId); //findIndex restituisce indice elemento nell'array che soddisfa la condizione
  if (idx === -1) return res.status(404).json({ message: 'Scheda non trovata.' }); // -1 se non trovato
  const { split, params } = req.body || {}; 

  if (!Array.isArray(split) || split.length !== 14) {
    return res.status(400).json({ message: 'split deve essere un array di 14 elementi.' }); // valida split
  }
  const splitNorm = split.map(v => String(v ?? '').trim());
  if (splitNorm.some(s => s.length > 40)) {
    return res.status(400).json({ message: 'Ogni voce di split max 40 caratteri.' }); //valida lunghezza voci split
  }

  const requiredKeys = ['durata','densita','intensita_carico','intensita_perc','volume'];
  if (!params || typeof params !== 'object') {
    return res.status(400).json({ message: 'params è obbligatorio.' });
  } // valida che params sia un oggetto
  for (const k of requiredKeys) {
    if (!(k in params)) { // controlla che tutte le chiavi richieste siano presenti
      return res.status(400).json({ message: `params deve contenere tutte le chiavi: ${requiredKeys.join(', ')}` });
    }
  }
  const paramsNorm = {};
  for (const k of requiredKeys) { // normalizza e valida ogni valore
    const val = String(params[k] ?? '').trim(); // ?? se params[k] è null o undefined usa stringa vuota
    if (val.length > 20) {
      return res.status(400).json({ message: `${k} max 20 caratteri.` });
    }
    paramsNorm[k] = val;
  }
  schede[idx].split  = splitNorm; // aggiorna split normalizzato
  schede[idx].params = paramsNorm; // aggiorna params normalizzato
  save(files.schede, schede, 'schede.json');
  res.json(schede[idx]);
});

app.get('/api/schede/:schedaId/stats/serie-gm', authenticateToken, (req, res) => {
  const { schedaId } = req.params;
  const s = schede.find(x => x.id === schedaId);
  if (!s) return res.status(404).json({ message: 'Scheda non trovata.' });

  if (s.ownerId && s.ownerId !== req.userId) return res.status(403).json({ message: 'Forbidden' }); //se ownerId non corrisponde all'utente loggato

  const GM_OPTS = ['petto','dorso','delt. lat.','delt. fr.','delt. po.','bicipiti','tricipiti','quadr.','femorali','polpacci','glutei','trapezi','addome'];
  const counts = Object.fromEntries(GM_OPTS.map(gm => [gm, 0])); // crea oggetto con chiavi GM_OPTS e valori iniziali 0 ({petto:0, dorso:0, ...})
  const SET_KEYS = ['set1','set2','set3','set4','set5'];

  const sedute = workoutsPrev.filter(w => w.schedaId === schedaId); // workoutPrev della scheda

  for (const wp of sedute){ // itera sulle sedute
    const righe = eserciziPrev.filter(e => e.workoutPrevId === wp.id); // eserciziPrev della seduta corrente
    for (const r of righe){ // itera sulle righe
      const gm = r.gm || ''; // gruppo muscolare
      if (!(gm in counts)) continue; // salta se gm non è valido
      for (const k of SET_KEYS) if ((r[k]||'').trim()) counts[gm] += 1; // se r[k] (set1, set2, ...) non è vuoto incrementa il conteggio del gm. 
    }
  }
  res.json({ schedaId, counts });
});

// ====== WORKOUT PREVISTI =======================================================================================
app.get('/api/workoutsPrev/:schedaId', authenticateToken, (req,res)=>{
  const s = schede.find(x=>x.id===req.params.schedaId && x.ownerId===req.userId); // trova la scheda per id e ownerId
  if (!s) return res.status(404).json({ message:'Scheda non trovata.' }); // 404 se non c'è scheda
  res.json(workoutsPrev.filter(w=>w.schedaId===s.id)); // filtra e ritorna solo i workoutPrev della scheda trovata
});

app.post('/api/workoutsPrev/:schedaId', authenticateToken, (req,res)=>{ // crea nuovo workoutPrev per la scheda
  const s = schede.find(x=>x.id===req.params.schedaId && x.ownerId===req.userId); // trova la scheda per id e ownerId
  if (!s) return res.status(404).json({ message:'Scheda non trovata.' }); // 404 se non c'è scheda
  const id = nextId('wp', workoutsPrev); //genera nuovo id
  const item = { id, ownerId: req.userId, schedaId:s.id, nomeSeduta:`` }; // item con nomeSeduta vuoto di default
  workoutsPrev.push(item); // viene aggiunto all’array workoutsPrev (in memoria).
  save(files.workoutsPrev, workoutsPrev, 'workoutsPrev.json');
  res.status(201).json(item); //ritorna 201 Created con il nuovo oggetto workoutPrev
});

app.put('/api/workoutsPrev/:id', authenticateToken, (req,res)=>{ // aggiorna workoutPrev esistente
  const w = workoutsPrev.find(x=>x.id === req.params.id); // trova il workoutPrev per id
  if (!w) return res.status(404).json({ message:'Seduta non trovata.' });
  const s = schede.find(x=>x.id === w.schedaId && x.ownerId === req.userId); // trova la scheda del workout e controlla che appartenga all'utente
  if (!s) return res.status(403).json({ message:'Non autorizzato.' });

  const { nomeSeduta } = req.body || {};
  if (nomeSeduta === undefined) { // nomeSeduta non deve essere undefined
    return res.status(400).json({ message:'nomeSeduta è richiesto.' });
  }
  const n = String(nomeSeduta).trim(); // normalizza
  if (n.length > 40) { // valida lunghezza
    return res.status(400).json({ message:'Nome seduta max 40 caratteri.' });
  }
  w.nomeSeduta = n; // aggiorna nomeSeduta
  save(files.workoutsPrev, workoutsPrev, 'workoutsPrev.json');
  res.json(w);
});

app.delete('/api/workoutsPrev/:id', authenticateToken, (req,res)=>{
  const w = workoutsPrev.find(x=>x.id===req.params.id); // trova il workoutPrev per id
  if (!w) return res.status(404).json({ message:'Seduta non trovata.' }); // 404 se non c'è workoutPrev
  const s = schede.find(x=>x.id===w.schedaId && x.ownerId===req.userId); // trova la scheda del workout e controlla che appartenga all'utente
  if (!s) return res.status(403).json({ message:'Non autorizzato.' });

  eserciziPrev = eserciziPrev.filter(e=>e.workoutPrevId!==w.id); // rimuove gli eserciziPrev collegati al workoutPrev
  workoutsPrev = workoutsPrev.filter(x=>x.id!==w.id); // rimuove il workoutPrev
  save(files.workoutsPrev, workoutsPrev, 'workoutsPrev.json');
  save(files.eserciziPrev, eserciziPrev, 'eserciziPrev.json');
  res.json({message:'Seduta eliminata.'});
});

// ====== ESERCIZI PREVISTI ===========================================================================================
app.get('/api/eserciziPrev/:workoutPrevId', authenticateToken, (req,res)=>{
  const w = workoutsPrev.find(x=>x.id===req.params.workoutPrevId); // trova il workoutPrev per id
  if (!w) return res.status(404).json({ message:'Seduta non trovata.' });
  const s = schede.find(x=>x.id===w.schedaId && x.ownerId===req.userId); // trova la scheda del workout e controlla che appartenga all'utente
  if (!s) return res.status(403).json({ message:'Non autorizzato.' });
  res.json(eserciziPrev.filter(e=>e.workoutPrevId===w.id)); // filtra e ritorna solo gli eserciziPrev del workout trovato
});

app.post('/api/eserciziPrev/:workoutPrevId', authenticateToken, (req,res)=>{ // crea nuovo esercizioPrev per il workoutPrev
  const w = workoutsPrev.find(x=>x.id===req.params.workoutPrevId); // trova il workoutPrev per id
  if (!w) return res.status(404).json({ message:'Seduta non trovata.' }); 
  const s = schede.find(x=>x.id===w.schedaId && x.ownerId===req.userId); // trova la scheda del workout e controlla che appartenga all'utente
  if (!s) return res.status(403).json({ message:'Non autorizzato.' });
  const id = nextId('ep', eserciziPrev); //genera nuovo id
  const row = { 
    id, ownerId: req.userId, workoutPrevId:w.id,
    esercizio:'', recupero:'', set1:'', tempo1:'', set2:'', tempo2:'', set3:'', tempo3:'', set4:'', tempo4:'', set5:'', tempo5:'',
    gm:'/'
  };
  eserciziPrev.push(row); 
  save(files.eserciziPrev, eserciziPrev, 'eserciziPrev.json');
  res.status(201).json(row);
});

app.put('/api/eserciziPrev/:id', authenticateToken, (req,res)=>{
  const { id } = req.params; // id dell'esercizioPrev da aggiornare
  const idx = eserciziPrev.findIndex(x => x.id === id); // trova l'indice dell'esercizioPrev nell'array
  if (idx === -1) return res.status(404).json({ message:'Riga non trovata.' });

  const w = workoutsPrev.find(x => x.id === eserciziPrev[idx].workoutPrevId); // trova il workoutPrev collegato all'esercizioPrev
  const s = schede.find(x => x.id === w.schedaId && x.ownerId === req.userId); // trova la scheda del workout e controlla che appartenga all'utente
  if (!s) return res.status(403).json({ message:'Non autorizzato.' }); 

  const required = ['esercizio','recupero','set1','tempo1','set2','tempo2','set3','tempo3','set4','tempo4','set5','tempo5','gm'];
  const body = req.body || {}; // evita errore se req.body è undefined
  for (const f of required) {if (!(f in body)) return res.status(400).json({ message:`Campo mancante: ${f}.` });}

  const up = Object.fromEntries(required.map(f => [f, String(body[f] ?? '').trim()])); //up è un oggetto. require è un array di campi richiesti. map crea array di coppie [chiave, valore], ad esempio [['nomeSeduta', 'Allenamento 1']

  const ALLOWED_GM = ['/','petto','dorso','delt. lat.','delt. fr.','delt. po.','bicipiti','tricipiti','quadr.','femorali','polpacci','glutei','trapezi','addome'];
  if (!ALLOWED_GM.includes(up.gm)) return res.status(400).json({ message:'GM non valido.' });

  for (const f of required) {if (up[f].length > 60) return res.status(400).json({ message:`${f} max 60 caratteri.` });}

  required.forEach(f => { eserciziPrev[idx][f] = up[f]; }); // aggiorna i campi dell'esercizioPrev
  save(files.eserciziPrev, eserciziPrev, 'eserciziPrev.json');
  res.json(eserciziPrev[idx]);
});

app.delete('/api/eserciziPrev/:id', authenticateToken, (req,res)=>{ // elimina esercizioPrev
  const row = eserciziPrev.find(x=>x.id===req.params.id);
  if (!row) return res.status(404).json({ message:'Riga non trovata.' });
  const w = workoutsPrev.find(x=>x.id===row.workoutPrevId);
  const s = schede.find(x=>x.id===w.schedaId && x.ownerId===req.userId);
  if (!s) return res.status(403).json({ message:'Non autorizzato.' });
  eserciziPrev = eserciziPrev.filter(x=>x.id!==row.id);
  save(files.eserciziPrev, eserciziPrev, 'eserciziPrev.json');
  res.json({message:'Riga eliminata.'});
});

// ====== LOGBOOK ==============================================================================================
app.get('/api/logbooks/:microId', authenticateToken, (req, res) => {
  const { microId } = req.params; // estrae microId dai parametri della rotta
  const m = micro.find(x => x.id === microId && x.ownerId === req.userId); // controlla che il micro esista e appartenga all'utente
  if (!m) return res.status(404).json({ message: 'Microciclo non trovato.' });
  const lb = logbook.find(l => l.microId === microId && l.ownerId === req.userId); // restituisce l'oggetto logbook
  if (!lb) return res.status(404).json({ message: 'Logbook non presente.' });
  res.json(lb); // 200
});

app.post('/api/logbooks/:microId', authenticateToken, (req, res) => {
  const { microId } = req.params; // estrae microId dai parametri della rotta
  const m = micro.find(x => x.id === microId && x.ownerId === req.userId); // controlla che il micro esista e appartenga all'utente
  if (!m) return res.status(404).json({ message: 'Microciclo non trovato.' });
  if (logbook.some(l => l.microId === microId && l.ownerId === req.userId)) { // controlla se esiste già un logbook per quel micro
    return res.status(409).json({ message: 'Logbook già esistente.' });
  }
  const lb = { id: nextId('log', logbook), ownerId: req.userId, microId }; // crea nuovo logbook
  logbook.push(lb);
  save(files.logbook, logbook, 'logbook.json');
  res.status(201).json(lb);
});

// ====== WORKOUT ESEGUITO =================================================================================================
app.get('/api/workoutsEse/:logId', authenticateToken, (req, res) => {
  const { logId } = req.params; // estrae logId dai parametri della rotta
  const lb = logbook.find(l => l.id === logId && l.ownerId === req.userId); // controlla che il logbook esista e appartenga all'utente
  if (!lb) return res.status(404).json({ message: 'Logbook inesistente o non autorizzato.' });

  const list = workoutsEse.filter(w => w.logId === logId); // filtra e ritorna solo i workoutsEse del logbook trovato
  res.json(list);
});

app.post('/api/workoutsEse/:logId', authenticateToken, (req, res) => {
  const { logId } = req.params;
  const lb = logbook.find(l => l.id === logId && l.ownerId === req.userId);
  if (!lb) return res.status(404).json({ message: 'Logbook inesistente o non autorizzato.' });

  const id = nextId('we', workoutsEse); //genera nuovo id
  const item = {
    id, ownerId: req.userId, logId, nomeSeduta: '', note: '', data: '', durata: '', peso: '', oreSonno: '', alimentazione: '', qualita: '', cardio: ''
  };
  workoutsEse.push(item);
  save(files.workoutsEse, workoutsEse, 'workoutsEse.json');
  res.status(201).json(item);
});

app.put('/api/workoutsEse/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const idx = workoutsEse.findIndex(w => w.id === id); // trova l'indice del workoutEse per :id
  if (idx === -1) return res.status(404).json({ message: 'Workout eseguito non trovato.' });

  const w = workoutsEse[idx]; // workoutEse da aggiornare
  const lb = logbook.find(l => l.id === w.logId && l.ownerId === req.userId); // trova il logbook del workout e controlla che appartenga all'utente
  if (!lb) return res.status(403).json({ message: 'Non autorizzato.' });

  const body = req.body || {}; // corpo della richiesta
  const required = ['nomeSeduta','note','data','durata','peso','oreSonno','alimentazione','qualita','cardio']; // campi richiesti

  for (const f of required) { // controlla che tutti i campi richiesti siano presenti
    if (!(f in body)) return res.status(400).json({ message: `Campo mancante: ${f}.` });
  }

  const up = Object.fromEntries(required.map(f => [f, String(body[f] ?? '')])); // up è un oggetto. require è un array di campi richiesti. map crea array di coppie [chiave, valore], ad esempio [['nomeSeduta', 'Allenamento 1']

  if (up.data !== '' && !isValidISODate(up.data)) {return res.status(400).json({ message: 'Data non valida (YYYY-MM-DD).' }); }
  if (up.nomeSeduta.trim().length > 40) {return res.status(400).json({ message: 'Nome seduta max 40 caratteri.' });}
  if (up.note.length > 500) {return res.status(400).json({ message: 'Note max 500 caratteri.' });}
  const shortFields = ['durata','peso','oreSonno','alimentazione','cardio'];
  for (const f of shortFields) {
    if (up[f].trim().length > 40) {return res.status(400).json({ message: `${f} max 40 caratteri.` });}
  }
  if (up.qualita.length > 20) {return res.status(400).json({ message: 'Qualità max 20 caratteri.' });}

  required.forEach(f => { w[f] = up[f]; }); // copia tutti i valori da up a w
  save(files.workoutsEse, workoutsEse, 'workoutsEse.json');
  res.json(w);
});

app.delete('/api/workoutsEse/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const w = workoutsEse.find(x => x.id === id);
  if (!w) return res.status(404).json({ message: 'Workout eseguito non trovato.' });

  const lb = logbook.find(l => l.id === w.logId && l.ownerId === req.userId);
  if (!lb) return res.status(403).json({ message: 'Non autorizzato.' });

  workoutsEse = workoutsEse.filter(x => x.id !== id); // rimuove il workoutEse
  eserciziEse = eserciziEse.filter(e => e.workoutEseId !== id); // rimuove gli eserciziEse collegati al workoutEse
  save(files.workoutsEse, workoutsEse, 'workoutsEse.json');
  save(files.eserciziEse, eserciziEse, 'eserciziEse.json');
  res.json({ message: 'Workout eseguito eliminato.' });
});

// ====== ESERCIZI ESEGUITI =====================================================================================
app.get('/api/eserciziEse/:workoutEseId', authenticateToken, (req,res)=>{
  const { workoutEseId } = req.params; // estrae workoutEseId dai parametri della rotta
  const w = workoutsEse.find(x => x.id === workoutEseId); // trova il workoutEse per id
  if (!w) return res.status(404).json({ message:'Workout eseguito inesistente.' }); 

  const lb = logbook.find(l => l.id === w.logId); // trova il logbook del workout e controlla che appartenga all'utente
  if (!lb || lb.ownerId !== req.userId) return res.status(403).json({ message:'Non autorizzato.' });

  res.json(eserciziEse.filter(e => e.workoutEseId === workoutEseId)); // filtra e ritorna solo gli eserciziEse del workoutEse trovato
});

app.post('/api/eserciziEse/:workoutEseId', authenticateToken, (req,res)=>{
  const { workoutEseId } = req.params; // estrae workoutEseId dai parametri della rotta
  const w = workoutsEse.find(x => x.id === workoutEseId); // trova il workoutEse per id
  if (!w) return res.status(404).json({ message:'Workout eseguito inesistente.' });

  const lb = logbook.find(l => l.id === w.logId); // trova il logbook del workout e controlla che appartenga all'utente
  if (!lb || lb.ownerId !== req.userId) return res.status(403).json({ message:'Non autorizzato.' });

  const id = nextId('ee', eserciziEse); //genera nuovo id
  const row = { // nuovo esercizioEse con campi vuoti
    id, ownerId: req.userId, workoutEseId, esercizio: '', set1:'', carico1:'', set2:'', carico2:'', set3:'', carico3:'', set4:'', carico4:'', set5:'', carico5:''
  };
  eserciziEse.push(row);
  save(files.eserciziEse, eserciziEse, 'eserciziEse.json');
  res.status(201).json(row);
});

app.put('/api/eserciziEse/:id', authenticateToken, (req,res)=>{
  const { id } = req.params; // estrae id dai parametri della rotta 
  const idx = eserciziEse.findIndex(e => e.id === id); // trova l'indice dell'esercizioEse per :id
  if (idx === -1) return res.status(404).json({ message:'Riga esercizio non trovata.' });

  const row = eserciziEse[idx]; // riga da aggiornare
  const w = workoutsEse.find(x => x.id === row.workoutEseId); // trova il workoutEse dell esercizioEse
  const lb = logbook.find(l => l.id === w?.logId); // trova il logbook del workout e controlla che appartenga all'utente
  if (!lb || lb.ownerId !== req.userId) return res.status(403).json({ message:'Non autorizzato.' });

  const required = ['esercizio','set1','carico1','set2','carico2','set3','carico3','set4','carico4','set5','carico5'];
  const body = req.body || {}; // corpo della richiesta
  for (const f of required) if (!(f in body)) return res.status(400).json({ message:`Campo mancante: ${f} (può essere stringa vuota).` });

  const up = Object.fromEntries(required.map(f => [f, String(body[f] ?? '').trim()])); 
  for (const f of required) if (up[f].length > 60) return res.status(400).json({ message: `${f} max 60 caratteri.` });

  required.forEach(f => { row[f] = up[f]; }); // copia tutti i valori da up a row
  save(files.eserciziEse, eserciziEse, 'eserciziEse.json');
  res.json(row);
});

app.delete('/api/eserciziEse/:id', authenticateToken, (req,res)=>{
  const { id } = req.params; // estrae id dai parametri della rotta
  const row = eserciziEse.find(e => e.id === id); // trova l'esercizioEse per id
  if (!row) return res.status(404).json({ message:'Riga esercizio non trovata.' });

  const w = workoutsEse.find(x => x.id === row.workoutEseId); // trova il workoutEse dell esercizioEse
  const lb = logbook.find(l => l.id === w?.logId); // trova il logbook del workout e controlla che appartenga all'utente
  if (!lb || lb.ownerId !== req.userId) return res.status(403).json({ message:'Non autorizzato.' });

  eserciziEse = eserciziEse.filter(e => e.id !== id); // rimuove l'esercizioEse
  save(files.eserciziEse, eserciziEse, 'eserciziEse.json'); 
  res.json({ message:'Riga eliminata.' });
});

// ====== START ====================================================================================================
app.listen(PORT, ()=> {
  console.log(`Server in ascolto su http://localhost:${PORT}`);
});
