# Decisioni prese in autonomia

La specifica originale lasciava alcuni dettagli aperti. Scelte fatte, e perché
— spostate qui dal README per tenerlo breve.

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
  soglia validata; se si rivela rumorosa, si cambia in `src/gen/01-bu-one-page.js`.
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
  interni in un testo che parte così com'è. Vedi [MODELLO.md](MODELLO.md).
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
- **`caricaDaCartella()` unisce l'elenco locale con quello letto da GitHub,
  non lo sostituisce.** Prima versione: lo sostituiva. Bug reale — una BU
  creata senza token esiste solo in `localStorage`; sostituire l'elenco ad
  ogni lettura della cartella (che avviene ad ogni avvio dell'app) la faceva
  sparire dalla vista, e il salvataggio automatico successivo la cancellava
  per sempre. Ora una BU senza file su GitHub resta in elenco, marcata "Solo
  locale" in sidebar, con un pulsante "Condividi su GitHub" per spingerla
  quando c'è un token. Una BU che aveva già un file su GitHub e non
  ricompare più nella cartella è invece considerata eliminata da qualcun
  altro, non "solo locale": per quelle la cartella condivisa resta la fonte
  di verità. Coperto da [test/browser.js](../test/browser.js) — è lo stato
  DOM/app che `test/smoke.js` non può testare, quindi il bug non sarebbe
  mai risultato in un test rosso senza un secondo strato di test in un
  browser reale.
- **Conflitto di scrittura (409) su GitHub → messaggio dedicato invece
  dell'errore grezzo dell'API.** Capita quando due persone salvano la stessa
  BU quasi insieme: chi arriva secondo non aveva più lo sha corrente. Il
  messaggio dell'API GitHub ("does not match...") non dice a chi lo legge
  cosa fare; `BU.cartella.verificaRisposta()` lo intercetta e spiega di
  aggiornare da GitHub e riapplicare le modifiche. Non tenta un merge
  automatico: due scritture concorrenti sullo stesso file restano un caso
  raro per un team di questa dimensione, non vale la complessità.
- **Sette campi nuovi per colmare un buco di metodo, non di dati**: senza
  dimensione del mercato, costo di erogazione e capacità, una BU può passare
  ogni verifica dello strumento (offerta chiara, differenziazione netta,
  test che converte) ed essere comunque un cattivo investimento — troppo
  piccola, non profittevole, o oltre quello che il team regge. Quattro sono
  mandatori, allo stesso livello di prezzo/decisore/servizio: **dimensione
  del mercato**, **costo di erogazione**, **capacità di erogazione** (le tre
  raccolte nella nuova sezione **Economia**, vedi sotto) e **responsabile
  della BU** (Identità — governance: con 5-10 BU in due anni, ognuna deve
  avere un nome accountable). Tre restano facoltativi, arricchimento non
  blocco: **concorrenti diretti** (Mercato, lista, oltre al confronto
  singolo già in `differenziazione_competitiva`), **sinergia con altre
  business unit** (Mercato: canale già caldo, se c'è — ma una BU su mercato
  vergine resta valida senza), **condizioni di passaggio dal pilota**
  (coerente col resto della sezione Pilota, tutta facoltativa per design).
  Un ottavo campo, **obiezioni raccolte**, vive in `RISULTATI` (Validazione)
  non in `CAMPI`: nasce dal test, non è una condizione per partire.
- **Sezione "Economia" a parte, invece di lasciare `dimensione_mercato`,
  `costo_erogazione` e `capacita_erogazione` sparsi in Mercato/Offerta/
  Risorse dove starebbero una alla volta.** Nell'output (BU One-Page,
  Dimensionamento) finiscono sempre insieme: separarli nel COMPILA li
  avrebbe tenuti lontani proprio nel momento in cui si compilano, mentre chi
  li legge dopo li vede fianco a fianco. Vedi [MODELLO.md](MODELLO.md).
- **Le sezioni del COMPILA si aprono e si chiudono, stato tenuto solo in
  memoria** (non salvato con la BU, si azzera al ricaricamento). Con 7
  sezioni invece delle 6 originali la form è più lunga; poter chiudere
  quelle già compilate riduce lo scroll senza dover nascondere per sempre
  nulla — si riapre con un click.
- **Il generatore "Dimensionamento" non calcola un ricavo potenziale.**
  Prezzo, costo e capacità sono testo libero — spesso una fascia ("20.000-
  100.000 €"), non un numero — quindi lo strumento non può moltiplicarli in
  modo affidabile. Mette i quattro dati fianco a fianco e lascia il calcolo
  vero e proprio `[DA SCRIVERE]`, con un prompt che li riporta: stessa
  logica già usata altrove (es. gli 8 headline della proposta di valore) per
  tutto ciò che richiede un giudizio che lo strumento non si prende.
