# BU Blueprint

Applicazione web interna per portare un'idea di business unit da ipotesi a
decisione: **ipotesi → materiali semilavorati → landing → campagna di test →
decisione**.

Il sistema non decide se una business unit è valida. Obbliga a chiarire
l'idea, produce una prima versione coerente dei materiali, prepara un test di
mercato e raccoglie i risultati. La decisione resta alle persone.

Uso interno, pensato per 5-10 business unit nei prossimi due anni. Non è un
prodotto per clienti.

## Come si usa

Apri `index.html` con un doppio click. Non serve un server, non serve
installare niente: HTML, CSS e JavaScript puri, nessuna build, funziona da
`file://`.

I dati restano sul tuo computer, in `localStorage` del browser che usi per
aprire il file. Fai backup regolari con **"Esporta backup JSON"** nella
barra laterale — è l'unico modo di spostare i dati su un'altra macchina o di
recuperarli se svuoti la cache del browser.

## Le tre viste

Per ogni business unit:

- **Compila** — questionario per sezioni (Identità, Mercato, Offerta,
  Risorse, Test) più le leve. Ogni campo ha un valore, uno stato
  (`ipotesi | da_verificare | verificata | da_revisionare`) e una prova.
  Un campo segnato "verificata" senza prova compilata viene trattato dal
  sistema come "da verificare", e l'interfaccia lo segnala — vedi
  [docs/MODELLO.md](docs/MODELLO.md).
- **Materiali** — un blocco per generatore (vedi sotto), con stato di
  revisione, generazione/rigenerazione e testo modificabile a mano.
- **Validazione** — risultati del test (con le metriche che decidono
  davvero evidenziate) e la decisione finale: **Continua / Modifica /
  Ferma**, con motivazione e data.

## I cinque generatori

Ognuno produce Markdown a partire dai dati compilati, senza mai nascondere i
buchi: dove manca un dato compare `[MANCA: nome campo]`, dove serve
scrittura umana compare `[DA SCRIVERE: cosa]` insieme a un prompt già
compilato con i dati rilevanti, da incollare in uno strumento di scrittura
esterno (il sistema non chiama nessun modello linguistico).

1. **Scheda business unit** — sintesi interamente deterministica: identità,
   mercato, leve, offerta, risorse, stato della conoscenza, domande aperte,
   cosa fermerebbe questa business unit.
2. **Proposta di valore** — formula compilata dai campi, tre varianti di
   taglio, tabella di contrasto dalle leve, prompt per 8 headline.
3. **Struttura landing page** — otto sezioni fisse (hero, problema,
   contrasto, offerta, prove, chi lo fa, FAQ, chiusura) e un prompt per i
   testi che richiedono scrittura umana.
4. **Messaggi campagna** — un angolo per leva, email di primo contatto,
   messaggio LinkedIn, parole chiave dalle leve, prompt per gli annunci.
5. **Piano di validazione** — ipotesi da testare, scheda del test, le due
   soglie **separate** (segnale di messaggio ≠ segnale di mercato), costo di
   scoprire di aver sbagliato, metriche da registrare, criteri di decisione.

Le due soglie del test non si confondono mai: il **segnale di messaggio**
(il messaggio arriva) autorizza solo a telefonare; solo il **segnale di
mercato** (qualcuno paga) autorizza a costruire.

Aggiungere un sesto generatore costa un file e una riga in `index.html`:
[docs/AGGIUNGERE-UN-GENERATORE.md](docs/AGGIUNGERE-UN-GENERATORE.md).

## Struttura del progetto

```
index.html                 punto d'ingresso, apri questo
src/
  styles.css                tema scuro
  schema.js                 modello dati, costruttori, normalizzazione/migrazione
  store.js                  localStorage, export/import JSON
  render.js                 helper condivisi dai generatori (escaping, tabelle, segnaposto)
  ui.js                     le tre viste (Compila, Materiali, Validazione)
  app.js                    avvio, routing, sidebar, salvataggio differito
  gen/
    _registry.js             BU.registraGeneratore(...)
    01-scheda.js
    02-proposta-valore.js
    03-landing.js
    04-messaggi-campagna.js
    05-validazione.js
test/
  smoke.js                  test senza dipendenze — node test/smoke.js
docs/
  MODELLO.md                 il modello dati spiegato
  AGGIUNGERE-UN-GENERATORE.md
```

Niente framework, niente build step: gli script sono caricati come script
classici in ordine in `index.html` e si registrano su un namespace globale
`window.BU`.

## Test

```
node test/smoke.js
```

Nessuna dipendenza: carica i sorgenti in un contesto `vm` di Node con
`window` che punta a se stesso, per replicare il comportamento del browser
(`window.BU = ...` crea davvero una globale `BU`). Verifica: registrazione e
unicità dei generatori, esistenza nello schema di ogni campo richiesto,
generazione con una BU compilata (niente `undefined`, niente `[MANCA:`
residui), generazione con una BU vuota (nessuna eccezione, i buchi
segnalati), la regola "verificata senza prova ricade in da_verificare", e la
migrazione di dati salvati con uno schema precedente.

## Decisioni prese in autonomia

La specifica lasciava alcuni dettagli aperti. Scelte fatte, e perché:

- **Routing con hash** (`#idBU/vista`): il refresh della pagina non perde il
  contesto (BU e vista aperte). Dettaglio implementativo, reversibile senza
  toccare i dati.
- **`prompt()`/`confirm()` nativi** per creare/eliminare una business unit e
  per confermare operazioni distruttive (rigenerare un materiale modificato,
  ripristinare un backup), invece di modali custom: zero dipendenze, zero
  CSS aggiuntivo, coerente con "senza fronzoli".
- **Mappatura decisione → stato BU**: `continua → validata`,
  `modifica → da_modificare`, `ferma → archiviata`. Non esplicitata nella
  specifica; `in_sviluppo` resta un cambio di stato manuale successivo (il
  momento in cui si comincia davvero a costruire, non il momento della
  decisione).
- **"Troppe competenze mancanti"** (uno dei cinque motivi in "cosa
  fermerebbe questa business unit"): euristica arbitraria — competenze
  mancanti ≥ 2 e superiori alle competenze presenti. È un'euristica, non una
  soglia validata; se si rivela rumorosa, si cambia in `src/gen/01-scheda.js`.
- **Leve: 3-5 è un vincolo morbido**, non imposto al salvataggio. L'interfaccia
  avvisa sotto le 3 e disabilita "aggiungi" sopra le 5, ma una BU con meno di
  3 leve resta salvabile (per non bloccare la compilazione a metà).
- **`persone`** (sezione Risorse) è una lista di stringhe libere nel formato
  suggerito "nome — ruolo — cosa presidia", non una struttura dati con
  sotto-campi separati: la specifica la descrive come lista "una voce per
  riga", non come oggetto.
- **`durata_test`** è modellato come `{ testo, dataFine }` (non solo
  stringa, non solo data), per avere sia una descrizione libera sia "una
  data di fine" come richiesto esplicitamente dalla specifica.
- **FAQ sulle competenze mancanti** (generatore landing): la risposta è
  marcata `[DA SCRIVERE]` invece di essere dedotta automaticamente —
  rispondere pubblicamente su cosa manca ancora richiede un giudizio che il
  sistema non si prende.
- **Export Markdown della singola BU**: usa il testo già generato (ed
  eventualmente modificato a mano) se presente, altrimenti genera al volo
  per quel materiale — non forza mai una rigenerazione che sovrascriverebbe
  modifiche manuali.
