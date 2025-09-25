# LiftLog Workout Tracker

Applicazione web per la gestione del proprio allenamento in palestra. L'utente potrà organizzare i propri workout in mesocicli, microcicli, schede e logbook di allenamento, con possibilità di visualizzare grafici per l'andamendo del volume di lavoro. Backend sviluppato in **Node.js + Express.js** con persistenza su file JSON, frontend in **HTML5/CSS3/JS** e grafici tramite **Chart.js**.

## Installazione ed esecuzione

1. **Scarica o clona il progetto**

   Puoi clonare la repository Git oppure scaricare i file in locale.

   ```bash
   git clone <repository-url>
   ```

2. **Entra nella cartella principale del progetto**

   Apri il terminale e spostati nella directory che contiene i file:

   ```bash
   cd /percorso-alla-tua-cartella
   ```

3. **Installa le dipendenze necessarie**

   L'applicazione richiede Node.js ed Express.js. Per installare i pacchetti:

   ```bash
   npm install
   ```

4. **Avvia il server**

   Avvia l'applicazione con:

   ```bash
   node backend/server.js
   ```

5. **Apri il browser e accedi**

   Il server sarà disponibile all'indirizzo:

   ```
   http://localhost:3000
   ```
## Credenziali utente demo
**Username**: demo

**Password**: 123123

## Rotte REST

## 1) Autenticazione & Utente corrente

### POST /api/register

registra un nuovo utente

- **Headers:** `Content-Type: application/json`
- **Body:**
  ```json
  { "username": "demo", "password": "123123" }
  ```
- **Response:**
  ```json
  { "message": "Registrazione ok.", "userId": "user2" }
  ```

### POST /api/login

autentica l'utente e restituisce il token.

- **Headers:** `Content-Type: application/json`
- **Body:**
  ```json
  { "username": "demo", "password": "123123" }
  ```
- **Response:**
  ```json
  {
    "message": "Login ok.",
    "authToken": "user1",
    "user": { "id": "user1", "username": "demo" }
  }
  ```

### GET /api/users/current

restituisce i dati dell'utente loggato.

- **Headers:** `X-Auth-Token: <token>`
- **Response:**
  ```json
  { "id": "user1", "username": "demo" }
  ```

### DELETE /api/users/current

elimina l'account e tutti i dati collegati.

- **Headers:** `X-Auth-Token: <token>`
- **Response:**
  ```json
  { "message": "Account eliminato con tutti i dati collegati." }
  ```

## 2) Mesocicli

### GET /api/mesocicli

elenca i mesocicli dell'utente.

- **Headers:** `X-Auth-Token: <token>`
- **Response:**
  ```json
  [
    {
      "id": "meso1",
      "ownerId": "user1",
      "nome": "Mesociclo 1",
      "start": "2025-08-01"
    }
  ]
  ```

### GET /api/mesocicli/:id

restituisce un mesociclo per id (se dell'utente).

- **Headers:** `X-Auth-Token: <token>`
- **Response:**
  ```json
  {
    "id": "meso1",
    "ownerId": "user1",
    "nome": "Mesociclo 1",
    "start": "2025-08-01"
  }
  ```

### POST /api/mesocicli

crea un nuovo mesociclo.

- **Headers:** `Content-Type: application/json`, `X-Auth-Token: <token>`
- **Body:**
  ```json
  { "nome": "Mesociclo 2", "start": "2025-09-01" }
  ```
- **Response:**
  ```json
  {
    "id": "meso2",
    "ownerId": "user1",
    "nome": "Mesociclo 2",
    "start": "2025-09-01"
  }
  ```

### PUT /api/mesocicli/:id

aggiorna nome e data di un mesociclo esistente.

- **Headers:** `Content-Type: application/json`, `X-Auth-Token: <token>`
- **Body:**
  ```json
  { "nome": "Mesociclo 2 – Update", "start": "2025-10-01" }
  ```
- **Response:**
  ```json
  {
    "id": "meso2",
    "ownerId": "user1",
    "nome": "Mesociclo 2 – Update",
    "start": "2025-10-01"
  }
  ```

### DELETE /api/mesocicli/:id

elimina un mesociclo e la relativa gerarchia (micro, schede, ecc.).

- **Headers:** `X-Auth-Token: <token>`
- **Response:**
  ```json
  { "message": "Mesociclo eliminato" }
  ```

## 3) Microcicli

### GET /api/microcicli/:mesoId

elenca i microcicli di un mesociclo (dell'utente).

- **Headers:** `X-Auth-Token: <token>`
- **Response:**
  ```json
  [
    {
      "id": "micro1",
      "ownerId": "user1",
      "mesoId": "meso1",
      "nome": "Microciclo 1"
    }
  ]
  ```

### POST /api/microcicli

crea un microciclo nel mesociclo indicato.

- **Headers:** `Content-Type: application/json`, `X-Auth-Token: <token>`
- **Body:**
  ```json
  { "mesoId": "meso1" }
  ```
- **Response:**
  ```json
  {
    "id": "micro2",
    "ownerId": "user1",
    "mesoId": "meso1",
    "nome": "Microciclo 2"
  }
  ```

### POST /api/microcicli/:id/copies

duplica un microciclo in un mesociclo target.

- **Headers:** `Content-Type: application/json`, `X-Auth-Token: <token>`
- **Body:**
  ```json
  { "mesoId": "meso1" }
  ```
- **Response:**
  ```json
  {
    "id": "micro3",
    "ownerId": "user1",
    "mesoId": "meso1",
    "nome": "Microciclo 3"
  }
  ```

### DELETE /api/microcicli/:id

elimina un microciclo e i dati correlati.

- **Headers:** `X-Auth-Token: <token>`
- **Response:**
  ```json
  { "message": "Microciclo eliminato" }
  ```

### GET /api/microcicli/:mesoId/stats/serie-gm

ritorna, per ogni microciclo del mesociclo, il numero di serie di uno specifico gruppo muscolare.

- **Headers:** `X-Auth-Token: <token>`
- **Query:** `?gm=petto`
- **Response:**
  ```json
  {
    "gm": "petto",
    "microcicli": [
      { "microId": "micro1", "microNome": "Microciclo 1", "sets": 12 },
      { "microId": "micro2", "microNome": "Microciclo 2", "sets": 8 }
    ]
  }
  ```

## 4) Scheda di allenamento

### GET /api/schede/:microId

recupera la scheda associata a un microciclo.

- **Headers:** `X-Auth-Token: <token>`
- **Response:**
  ```json
  {
    "id": "scheda1",
    "microId": "micro1",
    "ownerId": "user1",
    "split": [
      "Upper 1",
      "Lower 1",
      "",
      "Upper 2",
      "Lower 2",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      ""
    ],
    "params": {
      "durata": "8 settimane",
      "densita": "bassa",
      "intensita_carico": "alta",
      "intensita_perc": "alta",
      "volume": "basso"
    }
  }
  ```

### POST /api/schede/:microId

crea la scheda (se assente) per il micro indicato.

- **Headers:** `X-Auth-Token: <token>`
- **Response:**
  ```json
  {
    "id": "scheda2",
    "microId": "micro1",
    "ownerId": "user1",
    "split": ["", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    "params": {
      "durata": "",
      "densita": "",
      "intensita_carico": "",
      "intensita_perc": "",
      "volume": ""
    }
  }
  ```

### PUT /api/schede/:id

aggiorna split e params della scheda.

- **Headers:** `Content-Type: application/json`, `X-Auth-Token: <token>`
- **Body:**
  ```json
  {
    "split": ["U1", "L1", "", "U2", "L2", "", "", "", "", "", "", "", "", ""],
    "params": {
      "durata": "6 sett",
      "densita": "media",
      "intensita_carico": "media",
      "intensita_perc": "media",
      "volume": "medio"
    }
  }
  ```
- **Response:**
  ```json
  {
    "id": "scheda2",
    "microId": "micro1",
    "ownerId": "user1",
    "split": ["U1", "L1", "", "U2", "L2", "", "", "", "", "", "", "", "", ""],
    "params": {
      "durata": "6 sett",
      "densita": "media",
      "intensita_carico": "media",
      "intensita_perc": "media",
      "volume": "medio"
    }
  }
  ```

### GET /api/schede/:schedaId/stats/serie-gm

calcola le serie per gruppo muscolare nella scheda.

- **Headers:** `X-Auth-Token: <token>`
- **Response:**
  ```json
  {
    "schedaId": "scheda1",
    "counts": {
      "petto": 10,
      "dorso": 6,
      "delt. lat.": 3,
      "delt. fr.": 0,
      "delt. po.": 2,
      "bicipiti": 4,
      "tricipiti": 3,
      "quadr.": 5,
      "femorali": 4,
      "polpacci": 0,
      "glutei": 0,
      "trapezi": 0,
      "addome": 2
    }
  }
  ```

## 5) Workout previsti

### GET /api/workoutsPrev/:schedaId

elenca i workout previsti legati a una scheda.

- **Headers:** `X-Auth-Token: <token>`
- **Response:**
  ```json
  [
    {
      "id": "wp1",
      "ownerId": "user1",
      "schedaId": "scheda1",
      "nomeSeduta": "Upper 1"
    }
  ]
  ```

### POST /api/workoutsPrev/:schedaId

crea un nuovo workout previsto nella scheda.

- **Headers:** `X-Auth-Token: <token>`
- **Response:**
  ```json
  { "id": "wp2", "ownerId": "user1", "schedaId": "scheda1", "nomeSeduta": "" }
  ```

### PUT /api/workoutsPrev/:id

aggiorna il nome della seduta prevista.

- **Headers:** `Content-Type: application/json`, `X-Auth-Token: <token>`
- **Body:**
  ```json
  { "nomeSeduta": "Upper 1 – Progressioni" }
  ```
- **Response:**
  ```json
  {
    "id": "wp2",
    "ownerId": "user1",
    "schedaId": "scheda1",
    "nomeSeduta": "Upper 1 – Progressioni"
  }
  ```

### DELETE /api/workoutsPrev/:id

elimina un workout previsto e i suoi esercizi previsti.

- **Headers:** `X-Auth-Token: <token>`
- **Response:**
  ```json
  { "message": "Seduta eliminata." }
  ```

## 6) Esercizi previsti

### GET /api/eserciziPrev/:workoutPrevId

elenca le righe esercizio previste di un workout previsto.

- **Headers:** `X-Auth-Token: <token>`
- **Response:**
  ```json
  [
    {
      "id": "ep1",
      "ownerId": "user1",
      "workoutPrevId": "wp1",
      "esercizio": "Smith slight incline",
      "recupero": "3'",
      "set1": "5/8",
      "tempo1": "2-0-0-0",
      "set2": "12/15",
      "tempo2": "2-0-0-0",
      "set3": "",
      "tempo3": "",
      "set4": "",
      "tempo4": "",
      "set5": "",
      "tempo5": "",
      "gm": "petto"
    }
  ]
  ```

### POST /api/eserciziPrev/:workoutPrevId

aggiunge una riga esercizio prevista al workout.

- **Headers:** `X-Auth-Token: <token>`
- **Response:**
  ```json
  {
    "id": "ep2",
    "ownerId": "user1",
    "workoutPrevId": "wp1",
    "esercizio": "",
    "recupero": "",
    "set1": "",
    "tempo1": "",
    "set2": "",
    "tempo2": "",
    "set3": "",
    "tempo3": "",
    "set4": "",
    "tempo4": "",
    "set5": "",
    "tempo5": "",
    "gm": "/"
  }
  ```

### PUT /api/eserciziPrev/:id

aggiorna i campi della riga esercizio prevista.

- **Headers:** `Content-Type: application/json`, `X-Auth-Token: <token>`
- **Body:**
  ```json
  {
    "esercizio": "Panca manubri",
    "recupero": "2'",
    "set1": "8",
    "tempo1": "2-0-0-0",
    "set2": "10",
    "tempo2": "2-0-0-0",
    "set3": "",
    "tempo3": "",
    "set4": "",
    "tempo4": "",
    "set5": "",
    "tempo5": "",
    "gm": "petto"
  }
  ```
- **Response:**
  ```json
  {
    "id": "ep2",
    "ownerId": "user1",
    "workoutPrevId": "wp1",
    "esercizio": "Panca manubri",
    "recupero": "2'",
    "set1": "8",
    "tempo1": "2-0-0-0",
    "set2": "10",
    "tempo2": "2-0-0-0",
    "set3": "",
    "tempo3": "",
    "set4": "",
    "tempo4": "",
    "set5": "",
    "tempo5": "",
    "gm": "petto"
  }
  ```

### DELETE /api/eserciziPrev/:id

elimina una riga esercizio prevista.

- **Headers:** `X-Auth-Token: <token>`
- **Response:**
  ```json
  { "message": "Riga eliminata." }
  ```

## 7) Logbook

### GET /api/logbooks/:microId

restituisce il logbook del micro (se presente).

- **Headers:** `X-Auth-Token: <token>`
- **Response:**
  ```json
  { "id": "log2", "ownerId": "user1", "microId": "micro1" }
  ```

### POST /api/logbooks/:microId

crea il logbook per un micro che ne è sprovvisto.

- **Headers:** `X-Auth-Token: <token>`
- **Response:**
  ```json
  { "id": "log3", "ownerId": "user1", "microId": "micro1" }
  ```

## 8) Workout eseguiti

### GET /api/workoutsEse/:logId

elenca i workout eseguiti collegati al logbook.

- **Headers:** `X-Auth-Token: <token>`
- **Response:**
  ```json
  [
    {
      "id": "we1",
      "ownerId": "user1",
      "logId": "log2",
      "nomeSeduta": "Upper 1",
      "note": "Ottima seduta, progressioni ok",
      "data": "2025-09-01",
      "durata": "2h",
      "peso": "75kg",
      "oreSonno": "7h30",
      "alimentazione": "bulk",
      "qualita": "ottima",
      "cardio": "Camminata 10'"
    }
  ]
  ```

### POST /api/workoutsEse/:logId

crea un workout eseguito nel logbook indicato.

- **Headers:** `X-Auth-Token: <token>`
- **Response:**
  ```json
  {
    "id": "we2",
    "ownerId": "user1",
    "logId": "log2",
    "nomeSeduta": "",
    "note": "",
    "data": "",
    "durata": "",
    "peso": "",
    "oreSonno": "",
    "alimentazione": "",
    "qualita": "",
    "cardio": ""
  }
  ```

### PUT /api/workoutsEse/:id

aggiorna i campi del workout eseguito.

- **Headers:** `Content-Type: application/json`, `X-Auth-Token: <token>`
- **Body:**
  ```json
  {
    "nomeSeduta": "Upper 1",
    "note": "Buona seduta",
    "data": "2025-09-02",
    "durata": "90m",
    "peso": "75.2kg",
    "oreSonno": "7h",
    "alimentazione": "normo",
    "qualita": "buona",
    "cardio": "bike 10'"
  }
  ```
- **Response:**
  ```json
  {
    "id": "we2",
    "ownerId": "user1",
    "logId": "log2",
    "nomeSeduta": "Upper 1",
    "note": "Buona seduta",
    "data": "2025-09-02",
    "durata": "90m",
    "peso": "75.2kg",
    "oreSonno": "7h",
    "alimentazione": "normo",
    "qualita": "buona",
    "cardio": "bike 10'"
  }
  ```

### DELETE /api/workoutsEse/:id

elimina un workout eseguito e le righe esercizio collegate.

- **Headers:** `X-Auth-Token: <token>`
- **Response:**
  ```json
  { "message": "Workout eseguito eliminato." }
  ```

## 9) Esercizi eseguiti

### GET /api/eserciziEse/:workoutEseId

elenca le righe esercizio di un workout eseguito.

- **Headers:** `X-Auth-Token: <token>`
- **Response:**
  ```json
  [
    {
      "id": "ee1",
      "ownerId": "user1",
      "workoutEseId": "we1",
      "esercizio": "es1",
      "set1": "100kg",
      "carico1": "6reps",
      "set2": "70kg",
      "carico2": "10reps",
      "set3": "",
      "carico3": "",
      "set4": "",
      "carico4": "",
      "set5": "",
      "carico5": ""
    }
  ]
  ```

### POST /api/eserciziEse/:workoutEseId

aggiunge una riga esercizio al workout eseguito.

- **Headers:** `X-Auth-Token: <token>`
- **Response:**
  ```json
  {
    "id": "ee2",
    "ownerId": "user1",
    "workoutEseId": "we1",
    "esercizio": "",
    "set1": "",
    "carico1": "",
    "set2": "",
    "carico2": "",
    "set3": "",
    "carico3": "",
    "set4": "",
    "carico4": "",
    "set5": "",
    "carico5": ""
  }
  ```

### PUT /api/eserciziEse/:id

aggiorna i campi della riga esercizio eseguito.

- **Headers:** `Content-Type: application/json`, `X-Auth-Token: <token>`
- **Body:**
  ```json
  {
    "esercizio": "Panca piana",
    "set1": "6",
    "carico1": "100kg",
    "set2": "10",
    "carico2": "70kg",
    "set3": "",
    "carico3": "",
    "set4": "",
    "carico4": "",
    "set5": "",
    "carico5": ""
  }
  ```
- **Response:**
  ```json
  {
    "id": "ee2",
    "ownerId": "user1",
    "workoutEseId": "we1",
    "esercizio": "Panca piana",
    "set1": "6",
    "carico1": "100kg",
    "set2": "10",
    "carico2": "70kg",
    "set3": "",
    "carico3": "",
    "set4": "",
    "carico4": "",
    "set5": "",
    "carico5": ""
  }
  ```

### DELETE /api/eserciziEse/:id

elimina una riga esercizio eseguito.

- **Headers:** `X-Auth-Token: <token>`
- **Response:**
  ```json
  { "message": "Riga eliminata." }
  ```

## Esempi di richieste e risposte

### Login Utente

curl -X POST http://localhost:3000/api/login -H "Content-Type: application/json" -d "{\"username\":\"demo\",\"password\":\"123123\"}"
Risposta: {"message":"Login ok.","authToken":"user1","user":{"id":"user1","username":"demo"}}

### Crea nuovo mesociclo

curl -X POST http://localhost:3000/api/mesocicli -H "Content-Type: application/json" -H "X-Auth-Token: user1" -d "{\"nome\":\"Mesociclo 2\",\"start\":\"2025-10-01\"}"
Risposta: {"id":"meso3","ownerId":"user1","nome":"Mesociclo 2","start":"2025-10-01"}

### Crea nuovo microciclo

curl -X POST http://localhost:3000/api/microcicli -H "Content-Type: application/json" -H "X-Auth-Token: user1" -d "{\"mesoId\":\"meso3\"}"
Risposta: {"id":"micro11","ownerId":"user1","mesoId":"meso3","nome":"Microciclo 1"}
