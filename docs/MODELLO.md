# Il modello dati

Definito in [`src/schema.js`](../src/schema.js) (`BU.schema`). Questo documento
spiega le scelte, non ripete il codice: se i due divergono, il codice ha
ragione.

## Business unit

```
{
  id, nome, stato,
  creata, modificata,
  campi: { identita: {...}, mercato: {...}, offerta: {...}, risorse: {...}, economia: {...}, pilota: {...}, test: {...} },
  leve: [ ... ],
  materiali: { <idGeneratore>: {...} },
  risultati: { ... },
  consegna: { <chiaveOutput>: { selezionato, nota } },
  lancio: { <chiaveVerifica>: { selezionato, nota } },
  decisione: null | 'continua' | 'modifica' | 'ferma',
  noteDecisione: { motivazione, data }
}
```

`stato` è uno tra: `idea`, `in_definizione`, `pronta_per_il_test`,
`test_attivo`, `da_modificare`, `validata`, `in_pausa`, `archiviata`,
`in_sviluppo`. Cambia manualmente dall'header, o automaticamente quando si
registra una decisione in VALIDAZIONE (vedi sotto).

## Campi

Ogni campo (`BU.schema.CAMPI`) appartiene a una sezione (`identita`,
`mercato`, `offerta`, `risorse`, `economia`, `pilota`, `test`) e ha un tipo:

- `testo` — stringa libera.
- `lista` — array di stringhe, una voce per riga in COMPILA.
- `durata` — `{ testo, dataFine }` (usato da `test.durata_test` e `pilota.durata_pilota`).
- `scelta` — stringa vincolata a un elenco di opzioni (`opzioni` +
  `etichetteOpzioni` nella definizione del campo); in COMPILA è un `<select>`
  con "— non deciso —" come default. Usato oggi solo da `identita.apertura`.

Ogni campo, qualunque il tipo, ha sempre le stesse due proprietà:

```
{ valore, stato }
```

`stato` è uno tra `ipotesi | generato_da_ia | mandatorio`:

- **`ipotesi`** — non ancora verificato, può cambiare. Stato di default per
  ogni campo nuovo.
- **`generato_da_ia`** — indica **provenienza**, non affidabilità: il testo
  viene da una sessione assistita da IA (es. condensazione di un'intervista)
  e non è stato ancora riscritto/confermato a mano. Non dice se il contenuto
  è giusto o sbagliato, solo da dove viene.
- **`mandatorio`** — deciso, non negoziabile: non va cambiato senza una
  decisione esplicita a monte (es. un vincolo di prodotto o di prezzo già
  fissato altrove).

I campi con `critico: true` nella definizione sono quelli la cui assenza
finisce nella sezione "Cosa fermerebbe questa business unit" del generatore
BU One-Page.

### Stato riportato nel Markdown

Alcuni generatori — quelli "interni" (letti da chi lavora sulla BU, mai
spediti così a un cliente o pubblicati) — riportano lo stato accanto al
valore del campo, tramite `render.testoCampoConStato()`: es. "600€ al mese
`🔒 Mandatorio`" oppure "risolve X per Y `🤖 Generato da IA`". Ogni stato ha
un'icona (💭 ipotesi, 🤖 generato da IA, 🔒 mandatorio) riconoscibile a colpo
d'occhio anche nel markdown grezzo, non renderizzato, dove il colore non è
disponibile; il badge `` `testo` `` (inline code) lo separa visivamente dalla
prosa circostante. Ogni materiale interno apre con una riga di legenda
(`render.legendaStatiCampo()`) che spiega le tre icone una volta sola, prima
di incontrarle nel testo. `render.testoCampo()` (senza stato) resta l'helper
per i materiali *esterni* (landing, presentazione commerciale, template
proposta economica, script discovery call): un cliente non deve mai vedere
un'annotazione interna come "🤖 Generato da IA" nel testo che riceve.

## Apertura

`identita.apertura` vale `perdita` o `risultato` e decide da quale lato
raccontare le leve. Cambia due cose, in modo verificabile:

- il blocco problema in landing: apre sul sintomo di oggi oppure sullo stato desiderato
- la slide problema della presentazione commerciale: idem

Il contenuto non cambia mai: cambia solo l'ordine in cui i due lati vengono
raccontati. Un test verifica che landing e presentazione generate siano
effettivamente diverse fra le due impostazioni — se qualcuno rende il campo
inerte, la suite diventa rossa.

Come ogni altro campo ha `stato`, e nasce `ipotesi`. Non è una decisione da
prendere a tavolino: è una delle poche domande a cui un test di campagna
risponde bene e in fretta, mettendo in gara due angoli sullo stesso pubblico.
Diventa `mandatorio` quando il test lo dice.

Se il campo è vuoto i generatori assumono `perdita` e **lo dichiarano nel testo**
invece di nasconderlo.

## Leve

Da 3 a 5 per business unit (limite morbido in UI, non imposto al salvataggio:
una BU con 1 o 6 leve resta salvabile, l'interfaccia segnala solo quando sono
meno di 3). Struttura:

```
{ id, fatto_osservabile, come_lo_chiama_lui, come_lo_chiami_tu, come_lo_elimini }
```

Le leve non hanno `stato`: sono l'unità grezza da cui i generatori
derivano blocco problema, riga di contrasto, angolo di campagna, FAQ e
ipotesi da testare. Non hanno una casa in una sezione di `campi` perché non
sono un "campo" nel senso sopra — sono una lista propria (`bu.leve`).

### Perché non c'è un tipo `dolore | obiettivo`

C'era, nello schema v1, e non veniva letto da nessun generatore: cambiarlo
produceva materiale identico byte per byte. Era decorativo.

Ma il difetto vero era di modello, non di implementazione: **la leva contiene
già entrambi i lati.** `fatto_osservabile` è la perdita che il cliente subisce,
`come_lo_elimini` è il risultato che otterrebbe. La tabella di contrasto li
mette già affiancati nelle sue due colonne. Un campo che sceglie fra i due
duplicava ciò che la struttura esprime da sola.

Quello che invece mancava è una decisione **per business unit**, non per leva:
da quale lato apre la comunicazione. È diventata `identita.apertura`.

## Economia

`costo_erogazione`, `capacita_erogazione`, `dimensione_mercato` — tutti e
tre critici. Rispondono a una domanda che il resto dello schema non fa:
non "il mercato vuole questo servizio" ma "vale la pena costruirlo". Una BU
può avere offerta chiara, differenziazione netta e un test che converte, ed
essere comunque un cattivo investimento — perché il costo di erogarla
mangia il margine, perché il team regge un solo cliente alla volta, o
perché il mercato indirizzabile è troppo piccolo. Sezione a sé anziché
sparsi in Mercato/Offerta/Risorse (dove concettualmente potrebbero stare
uno alla volta) perché nell'output finiscono sempre insieme: alimentano il
generatore "Dimensionamento", che li mette fianco a fianco.

`mercato.concorrenti_diretti` e `mercato.sinergia_altre_bu` restano invece
in Mercato, e facoltativi: arricchiscono il quadro competitivo ma non sono
condizioni per procedere.

## Pilota

Sezione separata da `offerta`: `servizio_pilota`, `prezzo_pilota`,
`durata_pilota`, `criteri_successo_pilota`. Un pilota non è l'offerta
standard con uno sconto — è un servizio volutamente più piccolo, per
abbassare la soglia d'ingresso del primo cliente. Per questo ha un
`servizio_pilota` proprio, non solo un prezzo diverso.

Non va confuso con il "prezzo provvisorio" dell'offerta standard: quello
è semplicemente `offerta.prezzo` finché il suo stato resta `ipotesi` —
non serve un campo a parte, lo stato del campo lo dice già.

Nessun campo di questa sezione è critico: il pilota è un percorso
opzionale, non una condizione per cui la business unit si ferma se manca.

## Materiali

Uno per generatore registrato, indicizzato per `id` del generatore:

```
{ stato: 'bozza' | 'da_revisionare' | 'approvato' | 'pubblicabile',
  testo, generatoIl, modificatoAMano }
```

Se manca la chiave, il materiale non è mai stato generato: la vista
MATERIALI lo mostra come "Non ancora generato", non ricostruisce un
oggetto vuoto solo per popolare la UI.

## Risultati e decisione

`risultati` (`BU.schema.RISULTATI`) è una lista piatta di metriche testuali,
non annidata per sezione. Alcune hanno `decide: true`: sono le uniche che
autorizzano una decisione (conversazioni arrivate al prezzo, preventivi,
vendite, angolo vincente) — le altre (contatti, tasso di risposta) misurano
solo il segnale di messaggio.

`decisione` e `noteDecisione` sono due proprietà separate della BU (non
annidate l'una nell'altra), per rispecchiare la richiesta originale del
modello dati. Le tre decisioni possibili aggiornano anche `stato`:

| decisione | stato BU risultante |
|---|---|
| continua | `validata` |
| modifica | `da_modificare` |
| ferma    | `archiviata` |

Questa mappa è una scelta di design (vedi la sezione "Decisioni prese" nel
README), non parte del modello dati in senso stretto — vive in
`BU.ui.MAPPA_DECISIONE_STATO` (`src/ui.js`), non in `schema.js`.

## Consegna

`consegna` (`BU.schema.OUTPUT_CREATIVI`) è un catalogo fisso di 32 possibili
output che un art director o un copywriter potrebbero produrre a partire da
questa BU — non tutti servono per ogni BU. Ogni voce ha `{ selezionato,
nota }`: si spunta cosa serve davvero, il resto resta visibile come
promemoria di cosa esiste. A differenza di `campi`, non ha uno `stato`
ipotesi/generato-da-IA/mandatorio (non è un dato della BU, è uno strumento
di consegna) e non entra mai in `completezza()` o in "cosa fermerebbe
questa business unit": una BU non è "meno pronta" se non hai ancora deciso
quali output servono al team creativo.

## Lancio

`lancio` (`BU.schema.CHECKLIST_LANCIO`) è lo stesso meccanismo di
`consegna` — stessa forma `{ selezionato, nota }`, stessa esclusione da
completezza/campi critici — ma per un contenuto diverso: 34 verifiche
tecniche/operative di lancio (setup domini/social, sito, tracking e
consenso, Meta, software di qualificazione), raggruppate in quattro
categorie (`apertura`, `sito`, `tracking_meta`, `riscan`) invece delle due
di `consegna` (`testi`, `design`). Il contenuto viene da
[`docs/vademecum-nuova-bu.html`](vademecum-nuova-bu.html), un documento
company-wide (uguale per ogni BU) linkato dalla sidebar — non duplicato
nei dati della BU: solo le 34 voci-checklist e il loro stato per-BU vivono
in `schema.js`, il resto (le regole, il perché, le tabelle di competenze e
deliverable) resta nel documento.

## Normalizzazione / migrazione

`BU.schema.normalizzaBU(datiGrezzi)` prende **qualunque cosa** — `undefined`,
un oggetto vuoto, una BU salvata con uno schema precedente — e restituisce
sempre una BU completa e valida secondo lo schema corrente. Regole:

- Ogni campo/sezione/leva/materiale mancante viene creato con i valori di
  default (mai `undefined` nei dati salvati).
- I valori di tipo sbagliato vengono convertiti quando ha senso (es. una
  lista salvata come stringa singola diventa un array di una riga; una
  `durata_test` salvata come stringa diventa `{ testo: quella stringa,
  dataFine: '' }), altrimenti scartati in favore del default.
- Gli enum (`stato` dei campi, `apertura`, `decisione`, stato materiale) fuori
  dai valori validi ricadono sul default piuttosto che propagare un valore
  sconosciuto nell'interfaccia.
- Niente viene mai scartato silenziosamente per il solo fatto di non essere
  nella forma attesa: viene recuperato quando possibile, altrimenti
  sostituito da un default esplicito.

`BU.store.carica()` chiama `normalizzaBU` su ogni BU letta da localStorage,
quindi la migrazione è automatica e trasparente: aggiungere un campo allo
schema non richiede uno script di migrazione separato, basta aggiungere la
definizione in `CAMPI` (o `RISULTATI`) — i dati vecchi la riceveranno vuota
al primo caricamento.
