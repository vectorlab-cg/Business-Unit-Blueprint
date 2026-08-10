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
