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

### Cartella condivisa (opzionale)

Se apri l'app da un browser con `fetch` (praticamente tutti), nella barra
laterale trovi anche una sezione che legge le business unit dalla cartella
`BU/` di questo stesso repository su GitHub (creata automaticamente al primo
salvataggio), tramite le API REST di GitHub — niente server aggiuntivo,
niente configurazione di cartelle locali.
La lettura funziona sempre, senza login: il repo è pubblico. Per **salvare**
serve invece un tuo [token GitHub personale](https://github.com/settings/tokens)
(permesso `repo` o, per un fine-grained token, accesso in scrittura ai
contenuti di questo repo) da incollare nell'apposito campo — resta solo nel
`localStorage` del tuo browser, non è mai scritto nel codice: un token
condiviso in un sito pubblico sarebbe leggibile da chiunque. Chi non ha un
token può comunque leggere tutte le BU condivise, semplicemente non può
salvare le proprie modifiche in cartella (restano comunque in locale). Vedi
[`src/cartella.js`](src/cartella.js).

## Un esempio

[`esempio/vectorlab-forge.json`](esempio/vectorlab-forge.json) è una vera
business unit ("progetti a corpo" — software custom a prezzo e perimetro
fissi), compilata tramite un'intervista reale e generata con lo stesso
codice dell'app (non scritta a mano): 23/28 campi (82%), 4 leve, tutti e 15
i materiali generati. Per caricarla, apri l'app e usa **"Ripristina backup
JSON"** nella barra laterale — attenzione, sostituisce tutte le business
unit locali, quindi usalo su un'installazione vuota o dopo aver fatto un
backup delle tue.

La sezione **Pilota** è lasciata vuota di proposito: per questa BU non è
un'offerta ridotta per abbassare la soglia d'ingresso, è una fase
(*Software Discovery*) già consolidata e presente altrove nell'offerta —
buona conferma dal vivo del perché quella sezione non ha campi critici.

## Le tre viste

Per ogni business unit:

- **Compila** — questionario per sezioni (Identità, Mercato, Offerta,
  Pilota, Risorse, Test) più le leve. Ogni campo ha un valore e uno stato
  (`ipotesi | generato_da_ia | mandatorio`) — vedi
  [docs/MODELLO.md](docs/MODELLO.md). Alcuni materiali "interni" riportano
  questo stato accanto al valore nel Markdown generato, con un'icona per
  stato (💭 ipotesi, 🤖 generato da IA, 🔒 mandatorio) e una legenda in testa
  al documento, in modo che chi legge capisca a colpo d'occhio cosa è deciso
  e cosa no anche senza un renderer Markdown sottomano; i materiali destinati
  a un cliente (landing, presentazione commerciale, proposta economica,
  script discovery call) non lo riportano mai.
- **Materiali** — un blocco per generatore (vedi sotto), con stato di
  revisione, generazione/rigenerazione e testo modificabile a mano.
- **Validazione** — risultati del test (con le metriche che decidono
  davvero evidenziate) e la decisione finale: **Continua / Modifica /
  Ferma**, con motivazione e data.

## I quindici generatori

Ognuno produce Markdown a partire dai dati compilati, senza mai nascondere i
buchi: dove manca un dato compare `[MANCA: nome campo]`, dove serve
scrittura umana compare `[DA SCRIVERE: cosa]` insieme a un prompt già
compilato con i dati rilevanti, da incollare in uno strumento di scrittura
esterno (il sistema non chiama nessun modello linguistico e non ha accesso a
dati esterni: non inventa mai aziende, persone o numeri).

1. **BU One-Page** — la sintesi di una pagina: cosa facciamo, per chi,
   offerta, pilota, leve principali, cosa fermerebbe la business unit.
2. **Problem Statement** — chi ha il problema, il problema dalle leve,
   perché adesso, perché le soluzioni attuali non bastano, costo di non
   risolverlo.
3. **Ideal Customer Profile** — profilo, chi decide, segnali osservabili da
   cercare (dalle leve), cosa fa oggi, criteri di esclusione.
4. **Criteri di ricerca prospect** — titolo, settore, dimensione azienda e
   parole chiave per cercare 50 prospect su LinkedIn (o strumento
   equivalente). Produce solo i *criteri* di ricerca: lo strumento non ha
   dati esterni e non deve mai inventare nominativi.
5. **Proposta di valore** — formula compilata dai campi, tre varianti di
   taglio, tabella di contrasto dalle leve, prompt per 8 headline.
6. **Offerta pilota** — confronto servizio/prezzo tra offerta standard e
   pilota, durata, criteri di successo.
7. **Brief demo/mockup** — non è il materiale finale: è il brief per chi
   costruisce la demo — obiettivo, pubblico, cosa dimostrare leva per leva.
8. **Landing page** — otto sezioni fisse (hero, problema, contrasto,
   offerta, prove, chi lo fa, FAQ, chiusura) e un prompt per i testi che
   richiedono scrittura umana.
9. **Presentazione commerciale** — struttura slide-per-slide di un deck di
   vendita: problema, soluzione, prove, offerta, prossimi passi.
10. **Script discovery call** — domande di scoperta dalle leve,
    qualificazione, transizione all'offerta, chiusura.
11. **Template proposta economica** — documento inviabile al cliente:
    problema, proposta, cosa non include, investimento, tempi, validità.
12. **Pipeline commerciale** — documento *statico*: le fasi della pipeline e
    dove si inseriscono le due soglie del test. Non traccia i contatti
    (niente CRM dentro l'app — quello resta in uno strumento esterno).
13. **Dashboard KPI** — documento *statico*: fotografia dei risultati
    inseriti in VALIDAZIONE al momento della generazione, con le metriche
    che decidono davvero evidenziate. Non è un cruscotto vivo: si rigenera
    a mano dopo aver aggiornato i risultati.
14. **Criteri di continuazione o chiusura** — ipotesi da testare, scheda del
    test, le due soglie **separate** (segnale di messaggio ≠ segnale di
    mercato), costo di scoprire di aver sbagliato, criteri **Continua /
    Modifica / Ferma**.
15. **Analisi SWOT** — Forze e Debolezze ricavate da risorse e dai campi
    critici mancanti (meccaniche, non un'opinione); Opportunità e Minacce
    parziali, con la parte che richiede un giudizio sul mercato segnata
    `[DA SCRIVERE]` invece di inventata.

Le due soglie del test non si confondono mai: il **segnale di messaggio**
(il messaggio arriva) autorizza solo a telefonare; solo il **segnale di
mercato** (qualcuno paga) autorizza a costruire. Compaiono nominate così, in
più di un generatore, apposta.

`identita.apertura` (perdita | risultato) decide da quale lato raccontare le
leve — cambia davvero l'output di Landing e Presentazione commerciale, non
solo esteticamente: un test verifica che il markdown generato sia
effettivamente diverso fra le due impostazioni.

Aggiungere un sedicesimo generatore costa un file e una riga in
`index.html`: [docs/AGGIUNGERE-UN-GENERATORE.md](docs/AGGIUNGERE-UN-GENERATORE.md).

## Struttura del progetto

```
index.html                 punto d'ingresso, apri questo
src/
  styles.css                tema scuro
  schema.js                 modello dati, costruttori, normalizzazione/migrazione
  store.js                  localStorage, export/import JSON
  render.js                 helper condivisi dai generatori (escaping, tabelle, segnaposto)
  ui.js                     le tre viste (Compila, Materiali, Validazione)
  app.js                    avvio, routing, sidebar, salvataggio differito, cartella condivisa
  cartella.js                lettura/scrittura BU tramite le API GitHub Contents
  gen/
    _registry.js             BU.registraGeneratore(...)
    01-bu-one-page.js
    02-problem-statement.js
    03-icp.js
    04-criteri-prospect.js
    05-proposta-valore.js
    06-offerta-pilota.js
    07-demo-brief.js
    08-landing.js
    09-presentazione-commerciale.js
    10-script-discovery-call.js
    11-template-proposta-economica.js
    12-pipeline-commerciale.js
    13-dashboard-kpi.js
    14-criteri-decisione.js
    15-swot.js
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
segnalati), il modello a tre stati del campo (`ipotesi | generato_da_ia |
mandatorio`) e la sua annotazione nel Markdown dei materiali interni (mai in
quelli esterni), la migrazione di dati salvati con uno schema precedente, e
la cartella condivisa su GitHub (lettura, scrittura, creazione, eliminazione)
contro un repository finto simulato via mock di `fetch`.

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
- **"Messaggi campagna" (angoli, email, messaggio LinkedIn) è stato tolto**
  nel passaggio dai 5 ai 14 generatori: non aveva un corrispondente esplicito
  nella nuova lista. Se serve ancora, va riaggiunto come generatore a parte
  — il contenuto (angoli dalle leve, email, messaggio LinkedIn) esisteva già
  e si recupera facilmente dallo storico.
- **"Lista di 50 prospect" produce solo i criteri di ricerca, mai nomi
  inventati.** Lo strumento non ha accesso a dati esterni: una lista di
  aziende o persone generata qui sarebbe per forza fabbricata. Il generatore
  "Criteri di ricerca prospect" produce titolo, settore, dimensione azienda
  e parole chiave da usare su LinkedIn (o strumento equivalente) — i 50
  nominativi restano un lavoro umano con dati reali.
- **"Demo o mockup" diventa un brief testuale**, non il materiale finale:
  non è un artefatto che uno strumento di solo testo può produrre. Il
  generatore "Brief demo/mockup" dice cosa mostrare e a chi; la demo vera
  la costruisce una persona.
- **"Pipeline commerciale" e "Dashboard KPI" restano documenti statici**,
  non un CRM o un cruscotto vivo dentro l'app — coerente con "niente CRM,
  automazioni, analytics" della specifica originale. "Dashboard KPI" legge
  comunque i valori reali già inseriti in VALIDAZIONE (non è un template
  vuoto), ma è una fotografia: si rigenera a mano, non si aggiorna da sola.
- **Sezione "Pilota" separata da "Offerta"**, con un `servizio_pilota` tutto
  suo: un pilota non è solo un prezzo più basso, è un servizio ridotto
  apposta per abbassare la soglia d'ingresso. Nessun campo è critico: è un
  percorso opzionale. Il "prezzo provvisorio" richiesto separatamente nella
  lista originale non ha un campo dedicato: coincide con `offerta.prezzo`
  finché il suo stato resta "ipotesi" — aggiungerne uno avrebbe duplicato
  un dato che il sistema ha già.
- **`mercato.differenziazione_competitiva`** (nuovo campo, critico): "cosa
  fa oggi al posto vostro" (`alternativa_attuale`) non è la stessa domanda
  di "perché scegliere voi e non un concorrente diretto" — la prima copre
  lo status quo/non-consumo, la seconda la concorrenza vera. Segnalato da
  un revisore esterno del progetto; senza questo campo l'Analisi SWOT
  avrebbe Minacce vuote nella maggior parte dei casi.
- **L'Analisi SWOT usa anche Risorse**, benché la richiesta iniziale la
  escludesse: Forze e Debolezze coincidono quasi esattamente con competenze
  presenti/mancanti — escluderle avrebbe lasciato quei due quadranti vuoti
  o inventati. Opportunità e Minacce restano volutamente parziali (leve e
  concorrenza diretta sì, trend di mercato e rischi macro no: lo strumento
  non ha dati esterni) — è una SWOT onesta sui dati che il sistema conosce,
  non una SWOT completa.
- **Stato del campo a tre valori** (`ipotesi | generato_da_ia | mandatorio`),
  al posto delle quattro precedenti con la regola "verificata senza prova
  ricade in da_verificare": il campo `prova` è stato eliminato insieme alla
  regola. `generato_da_ia` indica **provenienza** (il testo viene da una
  sessione assistita da IA, tipicamente la condensazione di un'intervista),
  non affidabilità — non sostituisce un giudizio umano sulla qualità del
  contenuto. I materiali interni riportano lo stato nel Markdown accanto al
  valore; quelli destinati a un cliente no, per non far trapelare metadati
  interni in un testo che parte così com'è. Vedi [docs/MODELLO.md](docs/MODELLO.md).
- **Cartella condivisa via API GitHub invece che via file locale**: il primo
  design (File System Access API + cartella su OneDrive condivisa) è stato
  abbandonato perché non tutti i browser interni la supportano (Brave, in
  particolare, non espone `showDirectoryPicker`). Le business unit condivise
  vivono invece come file JSON nella cartella `BU/` dello stesso repository
  pubblico che ospita l'app, letti/scritti tramite le API REST di GitHub
  direttamente dal browser: la lettura non richiede login, la scrittura
  richiede un token personale che resta solo nel `localStorage` di chi lo
  inserisce. Restare nello stesso repo pubblico (invece che spostare i dati
  in uno privato) è stata una scelta esplicita, con il compromesso — dati di
  business unit permanentemente visibili pubblicamente — dichiarato e
  accettato prima di procedere.
