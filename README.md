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
tuo browser). Dettagli in [`src/cartella.js`](src/cartella.js).

## Le tre viste

- **Compila** — questionario per sezioni (Identità, Mercato, Offerta,
  Pilota, Risorse, Test) più le leve. Ogni campo ha uno stato
  (`ipotesi | generato_da_ia | mandatorio`), riportato con un'icona
  (💭 🤖 🔒) nel Markdown dei materiali interni — mai in quelli destinati a
  un cliente. Vedi [docs/MODELLO.md](docs/MODELLO.md).
- **Materiali** — un blocco per generatore, con generazione/rigenerazione e
  testo modificabile a mano.
- **Validazione** — risultati del test e decisione finale: **Continua /
  Modifica / Ferma**.

## I 15 generatori

Markdown dai dati compilati, buchi sempre segnalati (`[MANCA: ...]`,
`[DA SCRIVERE: ...]`) invece di essere inventati o saltati in silenzio.

BU One-Page · Problem Statement · Ideal Customer Profile · Criteri di
ricerca prospect · Proposta di valore · Offerta pilota · Brief demo/mockup ·
Landing page · Presentazione commerciale · Script discovery call · Template
proposta economica · Pipeline commerciale · Dashboard KPI · Criteri di
continuazione o chiusura · Analisi SWOT.

Codice in `src/gen/`, un file per generatore. Per aggiungerne uno:
[docs/AGGIUNGERE-UN-GENERATORE.md](docs/AGGIUNGERE-UN-GENERATORE.md).

## Un esempio

[`esempio/vectorlab-forge.json`](esempio/vectorlab-forge.json) — una vera
business unit, compilata e generata con lo stesso codice dell'app. Per
caricarla: **"Ripristina backup JSON"** nella sidebar (sostituisce le BU
locali).

## Struttura

```
index.html          punto d'ingresso
src/
  schema.js           modello dati, normalizzazione/migrazione
  store.js            localStorage, export/import JSON
  render.js           helper condivisi dai generatori
  ui.js                le tre viste
  app.js               avvio, routing, sidebar, cartella condivisa
  cartella.js          lettura/scrittura BU via API GitHub
  gen/                 un file per generatore
test/smoke.js        test senza dipendenze — node test/smoke.js
docs/
  MODELLO.md            il modello dati spiegato
  DECISIONI.md          scelte di design non ovvie dalla specifica
  AGGIUNGERE-UN-GENERATORE.md
```

Niente framework, niente build: script classici caricati in ordine da
`index.html`, registrati su un namespace globale `window.BU`.

## Test

```
node test/smoke.js
```

Nessuna dipendenza: sorgenti caricati in un contesto `vm` di Node.
Copre schema, generatori, migrazione, stato dei campi e cartella condivisa
(quest'ultima con `fetch` mockato contro un repository finto).
