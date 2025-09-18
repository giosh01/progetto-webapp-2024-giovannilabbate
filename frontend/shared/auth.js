function setupAuthModal() {             //funzione per modale autenticazione
  const modal    = document.getElementById("auth-modal"); //prende elemento HTML con id auth-modal
  if (!modal) return; //entra solo se esiste il modal

  const closeBtn = document.getElementById("auth-close"); //pulsante chiudi
  const tabs     = modal.querySelectorAll(".tab"); //seleziona tutti gli elementi dentro la modale con classe .tab, restituisce un nodelist
  const panels   = modal.querySelectorAll(".panel"); //tutti i pannelli

  const tokenKey = 'authToken'; //chiave per token in localStorage
  const userKey  = 'username'; // chiave per username in localStorage

  const getToken = () => localStorage.getItem(tokenKey); //ottengo il token dal localStorage

  function switchTab(name) { //cambia tab
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name)); //per ogni tab, aggiunge/rimuove classe active in base a se  data-tab = nome passato
    panels.forEach(p => p.classList.toggle('active', p.dataset.panel === name)); //per ogni pannello, aggiunge/rimuove classe active se data-panel = nome passato
    if (name === 'profile') { //se la tab attiva è profile
      const u = localStorage.getItem(userKey) || ''; //prende username da localStorage
      const el = document.getElementById('profile-username'); //prende elemento HTML con id profile-username
      if (el) el.textContent = u; //se esiste l'elemento imposta il testo al suo interno con l'username
    }
  }

function setHeaderLink() { //imposta link di login in header
  const loginLink = document.getElementById("login-pulsante"); //prende elemento HTML con id login-pulsante
  if (!loginLink) return; //esce se non esiste
  
  if (getToken()) { //se token esiste, utente loggato
    document.body.classList.add('authenticated'); //aggiunge classe authenticated al body
    loginLink.textContent = 'Profilo'; //cambia testo del link
    loginLink.onclick = () => { //al click 
      modal.classList.add("show"); //mostra modale
      switchTab('profile');  //apre tab profilo
    };
  } else {  // altrimenti utente non loggato
    document.body.classList.remove('authenticated'); //rimuove classe authenticated dal body
    loginLink.textContent = 'Accedi'; //cambia testo del link
    loginLink.onclick = () => {  //al click
      modal.classList.add("show");  //mostra modale 
      switchTab('login'); //apre tab login
    };
  }
}

  tabs.forEach(tab => tab.addEventListener("click", () => switchTab(tab.dataset.tab))); //per ogni tab, al click chiama switchTab con il valore di data-tab
  closeBtn.addEventListener("click", () => modal.classList.remove("show")); //pulsante chiudi modale 

  // LOGIN
  document.getElementById("form-login").addEventListener("submit", async e => {
    e.preventDefault(); //previene comportamento di default (invio dati e refresh pagina)
    const f = new FormData(e.target); //formData estrae i dati dal form e ci crea un oggetto
    const username = String(f.get('username') || '').trim(); 
    const password = String(f.get('password') || '');
    if (!username || !password) return;  //se username o password vuoti esce

    const r = await fetch('/api/login', { //chiede al server di fare login
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }) //converte oggetto in stringa JSON
    });

    if (!r.ok) { alert('Credenziali non valide'); return; } //r.ok è true se status 200-299, altrimenti mostra alert e esce
    const out = await r.json(); //prende risposta e la converte in JSON
    localStorage.setItem(tokenKey, out.authToken); //salva token (out.authToken) in localStorage
    localStorage.setItem(userKey, username); //salva username in localStorage
    location.reload(); //ricarica pagina
  });

  // SIGNUP
  const signupForm = document.getElementById("form-signup"); // prende form signup dal DOM
  const pass = document.getElementById('signup-password'); 
  const conf = document.getElementById('signup-confirm');

  conf?.addEventListener('input', () => { //controllo conferma password live
    if (conf.value !== pass.value) {
      conf.setCustomValidity("Le password non coincidono"); //errore se non coincidono
    } else {
      conf.setCustomValidity("");
    }
  });

  signupForm.addEventListener("submit", async e => { //al submit del form
    e.preventDefault();
    const f = new FormData(e.target);
    const username = String(f.get('username') || '').trim();
    const password = String(f.get('password') || '');
    const confirm  = String(f.get('confirm')  || '');
    
    if (!username || !password || password !== confirm) { 
      alert('Controlla i campi'); 
      return; 
    }

    const r = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!r.ok) {
      const msg = await r.json().catch(() => ({ message: 'Errore' })); //converte in json, se fallisce crea oggetto con messaggio di errore generico
      alert(msg.message || 'Errore registrazione'); //se json ok, se c'è messaggio lo mostra, altrimenti errore generico
      return;
    }

    const l = await fetch('/api/login', { //auto-login dopo signup
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (l.ok) {
      const out = await l.json();
      localStorage.setItem(tokenKey, out.authToken);
      localStorage.setItem(userKey, username);
      location.reload();
    }
  });

  // LOGOUT
  document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userKey);
    location.href = '/home/index.html';
  });

  // DELETE ACCOUNT
  document.getElementById('btn-delete-account').addEventListener('click', async () => {
    if (!getToken()) { alert('Non sei loggato.'); return; }
    if (!confirm('Sei sicuro di eliminare il tuo account?')) return; //confirm mostra popup con ok/cancella

    const res = await fetch('/api/users/current', {
      method: 'DELETE',
      headers: { ...getAuthHeaders() } 
    });
    const out = await res.json().catch(() => ({ message: 'Operazione completata' }));
    alert(out.message || 'Account eliminato.');

    if (res.ok) {
      localStorage.removeItem(tokenKey);
      localStorage.removeItem(userKey);
      location.href = '/home/index.html';
    }
  });
  setHeaderLink();
}

document.addEventListener('DOMContentLoaded', setupAuthModal); //parte al carico della pagina

// window = oggetto globale del browser, quindi queste funzioni sono accessibili da qualsiasi script
window.getAuthHeaders = function () { //ritorna header con token per richieste autenticazione
  const t = localStorage.getItem('authToken');
  return t ? { 'X-Auth-Token': t } : {};
};
window.ensureAuthModalOpen = function(){ //apre modale se non autenticato
  document.getElementById('auth-modal')?.classList.add('show');
};
