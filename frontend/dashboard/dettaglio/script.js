(async function () {
  const p = new URLSearchParams(location.search); // p sono i parametri della querystring
  const mesoId    = p.get('mesoId'); // get prende il valore del parametro
  const mesoName  = p.get('mesoName'); 
  const microId   = p.get('microId'); 
  const microName = p.get('microName');

  if (!mesoId || !microId) { //se manca mesoId o microId
    const qs = mesoId ? `?mesoId=${encodeURIComponent(mesoId)}` : ''; // ricostruisce querystring con solo mesoId se esiste
    location.href = '../microcicli/index.html' + qs; // reindirizza a microcicli
    return;
  }

  if (!localStorage.getItem('authToken')) { // se non c'è token di autenticazione
    ensureAuthModalOpen();
    return;
  }

  document.getElementById('titolo-micro').textContent = microName; // imposta il titolo del microciclo

  const linkQs =      // costruisce querystring per i link
    `?mesoId=${encodeURIComponent(mesoId)}` +
    `&microId=${encodeURIComponent(microId)}` +
    `&mesoName=${encodeURIComponent(mesoName)}` +
    `&microName=${encodeURIComponent(microName)}`;

  const linkScheda  = document.querySelector('.pane.sx'); // seleziona il link alla scheda (pannello sinistro)
  const linkLogbook = document.querySelector('.pane.dx'); // seleziona il link al logbook (pannello destro)
  if (linkScheda)  linkScheda.href  = '../scheda_allenamento/index.html' + linkQs; // imposta href con querystring
  if (linkLogbook) linkLogbook.href = '../logbook/index.html' + linkQs; // imposta href con querystring
})();
