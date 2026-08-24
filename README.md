# BU Blueprint

**App**: https://vectorlab-cg.github.io/Business-Unit-Blueprint/

Porta un'idea di business unit da ipotesi a decisione: **ipotesi → materiali →
landing → test → decisione**. Non decide se una BU è valida: obbliga a
chiarire l'idea, genera una prima versione coerente dei materiali, prepara un
test di mercato. La decisione resta alle persone. Uso interno, per 5-10
business unit nei prossimi due anni.

## Uso

- **Online**: il link sopra.
- **Locale**: apri `index.html` con doppio click — nessun server, nessuna
  installazione, HTML/CSS/JS puri, funziona da `file://`.

I dati restano in `localStorage` del browser che usi. Esporta backup JSON
regolarmente — è l'unico modo di spostarli o recuperarli.

La sidebar ha anche una sezione **cartella condivisa**: legge le business
unit dalla cartella `BU/` di questo repo tramite le API GitHub (nessun
login richiesto), e le salva lì se incolli un tuo
[token GitHub personale](https://github.com/settings/tokens) (resta solo nel
tuo browser). Una BU creata senza token esiste solo sul tuo browser — è
marcata **"Solo locale"** in sidebar finché non premi **"Condividi su
GitHub"** (compare in testa non appena c'è un token). Dettagli in
[`src/cartella.js`](src/cartella.js).

In fondo alla sidebar, **"Vademecum operativo"** apre
[docs/vademecum-nuova-bu.html](docs/vademecum-nuova-bu.html): regole,
competenze e checklist per il lancio di una BU (setup domini/social,
tracking, Meta, privacy, deliverable). È un documento a sé, uguale per ogni
BU — non cambia in base a quale hai selezionato, quindi vive fuori dal
flusso Compila/Materiali/.../Output invece che come tab.

## Le sei viste

- **Compila** — questionario per sezioni (Identità, Mercato, Offerta,
  Risorse, Economia, Pilota, Test), apribili/chiudibili una per una, più le
  leve. Ogni campo ha uno stato (`ipotesi | generato_da_ia | mandatorio`),
  riportato con un'icona (💭 🤖 🔒) nel Markdown dei materiali interni — mai
  in quelli destinati a un cliente. Vedi [docs/MODELLO.md](docs/MODELLO.md).
- **Materiali** — un blocco per generatore, con generazione/rigenerazione e
  testo modificabile a mano.
- **Documento** — tutti i materiali concatenati e renderizzati (titoli,
  tabelle, badge di stato), con il download del file .md grezzo.
- **Lancio** — checklist operativa di 34 verifiche tecniche per portare la
  BU dal nome al primo lead (setup domini/social, sito, tracking/Meta,
  software di qualificazione), estratta dal
  [Vademecum operativo](docs/vademecum-nuova-bu.html) — il § in ogni voce
  rimanda al dettaglio. Come Output: si spunta cosa è stato verificato per
  questa BU, non è un vincolo universale.
- **Validazione** — risultati del test e decisione finale: **Continua /
  Modifica / Ferma**.
- **Output** — checklist di tutto ciò che un art director/copywriter
  potrebbe produrre a partire da questa BU (claim, copy landing, annunci,
  post LinkedIn, logo, identità visiva, ecc. — 32 voci fisse, testi e
  design). Si spunta cosa serve davvero per questa BU specifica; non
  influisce su completezza o campi critici, è solo un promemoria per il
  brief di consegna al team creativo.

## I 16 generatori

Markdown dai dati compilati, buchi sempre segnalati (`[MANCA: ...]`,
`[DA SCRIVERE: ...]`) invece di essere inventati o saltati in silenzio.

BU One-Page · Problem Statement · Ideal Customer Profile · Criteri di
ricerca prospect · Proposta di valore · Offerta pilota · Brief demo/mockup ·
Landing page · Presentazione commerciale · Script discovery call · Template
proposta economica · Pipeline commerciale · Dashboard KPI · Criteri di
continuazione o chiusura · Analisi SWOT · Dimensionamento.

**Dimensionamento** mette fianco a fianco prezzo, costo di erogazione,
capacità e dimensione del mercato — i dati che dicono se una BU vale
l'investimento, non solo se il mercato la vuole. Non calcola un ricavo
potenziale da solo (i campi sono spesso una fascia, non un numero): lo
lascia `[DA SCRIVERE]`, con un prompt che riporta i dati per farlo a mano.

Codice in `src/gen/`, un file per generatore. Per aggiungerne uno:
[docs/AGGIUNGERE-UN-GENERATORE.md](docs/AGGIUNGERE-UN-GENERATORE.md).

## Struttura

```
index.html          punto d'ingresso
src/
  schema.js           modello dati, normalizzazione/migrazione
  store.js            localStorage, export/import JSON
  render.js           helper condivisi dai generatori
  markdown.js          renderer Markdown -> HTML per la vista Documento
  ui.js                le quattro viste
  app.js               avvio, routing, sidebar, cartella condivisa
  cartella.js          lettura/scrittura BU via API GitHub
  gen/                 un file per generatore
test/
  smoke.js             test senza dipendenze — node test/smoke.js
  browser.js           test end-to-end in browser reale — node test/browser.js
docs/
  MODELLO.md            il modello dati spiegato
  DECISIONI.md          scelte di design non ovvie dalla specifica
  AGGIUNGERE-UN-GENERATORE.md
```

Niente framework, niente build: script classici caricati in ordine da
`index.html`, registrati su un namespace globale `window.BU`. L'app non ha
nessuna dipendenza — `package.json` esiste solo per i test end-to-end (vedi
sotto) e non viene mai caricato da `index.html`.

## Test

```
node test/smoke.js
```

Nessuna dipendenza: sorgenti caricati in un contesto `vm` di Node. Copre
schema, generatori, migrazione, stato dei campi, il renderer Markdown e la
cartella condivisa lato API (`fetch` mockato contro un repository finto) —
tutto ciò che non richiede un DOM vero.

```
npm install && node test/browser.js
```

Test end-to-end in un browser reale (Puppeteer, unica dipendenza del
progetto, usata solo qui): copre lo stato e il DOM di `app.js`/`ui.js` che
`smoke.js` non può toccare — es. che una business unit creata senza token
GitHub non sparisca quando la cartella condivisa si aggiorna. Anche qui
nessuna rete vera: le API di GitHub sono finte. Gira anche in CI
(`.github/workflows/ci.yml`).
