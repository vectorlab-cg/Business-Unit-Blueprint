# Il modello dati

Definito in [`src/schema.js`](../src/schema.js) (`BU.schema`). Questo documento
spiega le scelte, non ripete il codice: se i due divergono, il codice ha
ragione.

## Business unit

```
{
  id, nome, stato,
  creata, modificata,
  campi: { identita: {...}, mercato: {...}, offerta: {...}, risorse: {...}, test: {...} },
  leve: [ ... ],
  materiali: { <idGeneratore>: {...} },
  risultati: { ... },
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
`mercato`, `offerta`, `risorse`, `test`) e ha un tipo:

- `testo` — stringa libera.
- `lista` — array di stringhe, una voce per riga in COMPILA.
- `durata` — `{ testo, dataFine }` (usato solo da `test.durata_test`).

Ogni campo, qualunque il tipo, ha sempre le stesse tre proprietà:

```
{ valore, stato, prova }
```

`stato` è uno tra `ipotesi | da_verificare | verificata | da_revisionare`.
`prova` è testo libero (fonte, dato, citazione).

I campi con `critico: true` nella definizione sono quelli la cui assenza
finisce nella sezione "Cosa fermerebbe questa business unit" del generatore
scheda.

### La regola sullo stato effettivo

Un campo `verificata` senza `prova` compilata **non è considerato
verificato** da nessuna parte del sistema: `BU.schema.statoEffettivoCampo(campo)`
lo declassa a `da_verificare`, e questo stato effettivo — non quello grezzo
salvato — è ciò che l'interfaccia colora, ciò che i generatori leggono, ciò
che conta per "stato della conoscenza". Il valore grezzo (`verificata`) resta
salvato così com'è: se l'utente compila la prova più tardi, il campo torna
verificato senza dover ritoccare il selettore.

Motivo: senza questo vincolo qualunque campo tende a scivolare verso
"verificata" per ottimismo, e la scheda finisce per mentire.

## Apertura

`identita.apertura` vale `perdita` o `risultato` e decide da quale lato
raccontare le leve. Cambia due cose, in modo verificabile:

- il blocco problema in landing: apre sul sintomo di oggi oppure sullo stato desiderato
- l'angolo di campagna: attacca dalla perdita in corso oppure dal risultato ottenibile

Il contenuto non cambia mai: cambia solo l'ordine in cui i due lati vengono
raccontati. Un test verifica che la landing generata sia effettivamente diversa
fra le due impostazioni — se qualcuno rende il campo inerte, la suite diventa
rossa.

Come ogni altro campo ha `stato` e `prova`, e nasce `ipotesi`. Non è una
decisione da prendere a tavolino: è una delle poche domande a cui una campagna
risponde bene e in fretta, mettendo in gara due angoli sullo stesso pubblico.
Diventa `verificata` quando il test lo dice, con la prova che lo dimostra.

Se il campo è vuoto i generatori assumono `perdita` e **lo dichiarano nel testo**
invece di nasconderlo.

## Leve

Da 3 a 5 per business unit (limite morbido in UI, non imposto al salvataggio:
una BU con 1 o 6 leve resta salvabile, l'interfaccia segnala solo quando sono
meno di 3). Struttura:

```
{ id, fatto_osservabile, come_lo_chiama_lui, come_lo_chiami_tu, come_lo_elimini }
```

Le leve non hanno `stato`/`prova`: sono l'unità grezza da cui i generatori
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
- Gli enum (`stato`, `tipo` di leva, `decisione`, stato materiale) fuori
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
