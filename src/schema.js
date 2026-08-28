/*
 * schema.js
 * Definizione del modello dati di BU Blueprint: campi, stati, leve,
 * costruttori e normalizzazione (migrazione) dei dati salvati.
 *
 * Namespace globale: window.BU.schema
 */
(function (global) {
  'use strict';

  var BU = global.BU = global.BU || {};

  var VERSIONE_SCHEMA = 2;

  // ---------------------------------------------------------------------
  // Enumerazioni
  // ---------------------------------------------------------------------

  // Stato di un campo. Non è un giudizio di affidabilità con verifica
  // automatica (schema v1 aveva "verificata"/prova) — sono tre etichette
  // indipendenti:
  //   ipotesi         valore non ancora deciso/confermato
  //   generato_da_ia  la provenienza del testo (nato da una sessione
  //                   assistita da IA, non ancora riscritto/confermato da
  //                   una persona) — indipendente da quanto sia vero
  //   mandatorio      valore definitivo, non va cambiato senza motivo
  var STATI_CAMPO = ['ipotesi', 'generato_da_ia', 'mandatorio'];

  // Etichetta visibile diversa dal valore enum interno ('mandatorio', sopra):
  // "Mandatorio" in italiano suona come "obbligatorio", mentre il senso
  // reale è "deciso, non negoziabile senza una decisione esplicita a monte"
  // — "Confermato" lo dice meglio. Il valore enum resta invariato apposta:
  // cambiarlo avrebbe richiesto una migrazione dei dati già salvati.
  var STATI_CAMPO_ETICHETTE = {
    ipotesi: 'Ipotesi',
    generato_da_ia: 'Generato da IA',
    mandatorio: 'Confermato'
  };

  var STATI_BU = [
    'idea',
    'in_definizione',
    'pronta_per_il_test',
    'test_attivo',
    'da_modificare',
    'validata',
    'in_pausa',
    'archiviata',
    'in_sviluppo'
  ];

  var STATI_BU_ETICHETTE = {
    idea: 'Idea',
    in_definizione: 'In definizione',
    pronta_per_il_test: 'Pronta per il test',
    test_attivo: 'Test attivo',
    da_modificare: 'Da modificare',
    validata: 'Validata',
    in_pausa: 'In pausa',
    archiviata: 'Archiviata',
    in_sviluppo: 'In sviluppo'
  };

  var STATI_MATERIALE = ['bozza', 'da_revisionare', 'approvato', 'pubblicabile'];

  var STATI_MATERIALE_ETICHETTE = {
    bozza: 'Bozza',
    da_revisionare: 'Da revisionare',
    approvato: 'Approvato',
    pubblicabile: 'Pubblicabile'
  };

  // Da quale lato apre la comunicazione. È una scelta per business unit, non
  // per leva: la leva contiene già entrambi i lati (fatto_osservabile è la
  // perdita, come_lo_elimini è il risultato). Nasce come ipotesi e diventa
  // mandatoria solo quando un test di campagna dice quale dei due converte.
  var APERTURE = ['perdita', 'risultato'];

  var APERTURE_ETICHETTE = {
    perdita: 'Dalla perdita',
    risultato: 'Dal risultato'
  };

  var DECISIONI = ['continua', 'modifica', 'ferma'];

  var DECISIONI_ETICHETTE = {
    continua: 'Continua',
    modifica: 'Modifica',
    ferma: 'Ferma'
  };

  // Ordine in COMPILA: prima le sezioni sempre da compilare (Identità,
  // Mercato, Offerta, Risorse, Leve — quest'ultima non è in questo elenco,
  // vedi ui.js), poi quelle di supporto (Economia, Pilota, Test) in coda —
  // non perché contino meno (Economia e Test restano piene di campi
  // critici), solo perché tipicamente si compilano dopo aver già chiarito
  // identità/mercato/offerta e le leve.
  var SEZIONI = [
    { chiave: 'identita', etichetta: 'Identità', descrizione: 'Chi siete e cosa fate, in una frase.' },
    { chiave: 'mercato', etichetta: 'Mercato', descrizione: 'Chi comprerebbe, chi decide, e chi altro glielo offre già.' },
    { chiave: 'offerta', etichetta: 'Offerta', descrizione: 'Cosa vendete, a chi, e a quanto.' },
    { chiave: 'risorse', etichetta: 'Risorse', descrizione: 'Cosa avete già e cosa manca per erogare il servizio.' },
    { chiave: 'economia', etichetta: 'Economia', descrizione: 'Se conviene: costo di erogazione, capacità e dimensione del mercato.' },
    { chiave: 'pilota', etichetta: 'Pilota', descrizione: 'Versione ridotta per il primo cliente — facoltativa.' },
    { chiave: 'test', etichetta: 'Test', descrizione: 'Come e dove verificarlo tutto con un vero mercato.' }
  ];

  // ---------------------------------------------------------------------
  // Definizione dei campi
  // tipo: 'testo' | 'lista' | 'durata' | 'scelta'
  // ---------------------------------------------------------------------

  var CAMPI = [
    // IDENTITÀ
    { sezione: 'identita', chiave: 'descrizione', etichetta: 'Descrizione', tipo: 'testo', critico: true,
      aiuto: 'Una frase, cosa fa la BU senza aggettivi.' },
    { sezione: 'identita', chiave: 'meccanismo', etichetta: 'Meccanismo', tipo: 'testo', critico: true,
      aiuto: 'Cosa fate come AZIONE, non come categoria. Non "consulenza tecnica" ma "inseriamo risorse tecniche dentro il sistema aziendale del cliente".' },
    { sezione: 'identita', chiave: 'apertura', etichetta: 'Da dove apriamo', tipo: 'scelta',
      opzioni: APERTURE, etichetteOpzioni: APERTURE_ETICHETTE, critico: false,
      aiuto: 'Dalla perdita che il cliente subisce oggi, oppure dal risultato che otterrebbe. ' +
        'Orienta il taglio del blocco problema in landing e nella presentazione commerciale. ' +
        'Finché non lo ha deciso un test, resta un\'ipotesi.' },
    { sezione: 'identita', chiave: 'responsabile', etichetta: 'Responsabile della BU', tipo: 'testo', critico: true,
      aiuto: 'Chi la porta avanti e prende la decisione Continua/Modifica/Ferma in Validazione.' },

    // MERCATO
    { sezione: 'mercato', chiave: 'cliente_ideale', etichetta: 'Cliente ideale', tipo: 'testo', critico: true,
      aiuto: 'Tipo di azienda, settore, dimensione, momento.' },
    { sezione: 'mercato', chiave: 'decisore', etichetta: 'Decisore', tipo: 'testo', critico: true,
      aiuto: 'Il ruolo che firma.' },
    { sezione: 'mercato', chiave: 'contesto_decisore', etichetta: 'Contesto del decisore', tipo: 'testo', critico: false,
      aiuto: 'Cosa ha sulla scrivania quando arrivate.' },
    { sezione: 'mercato', chiave: 'alternativa_attuale', etichetta: 'Alternativa attuale', tipo: 'testo', critico: true,
      aiuto: 'Cosa fa oggi al posto vostro (la vera concorrenza).' },
    { sezione: 'mercato', chiave: 'differenziazione_competitiva', etichetta: 'Perché voi e non un concorrente', tipo: 'testo', critico: true,
      aiuto: 'Non "cosa fa oggi al posto vostro" (quello è alternativa attuale) — perché sceglierebbe voi ' +
        'e non un concorrente diretto che offre qualcosa di simile.' },
    { sezione: 'mercato', chiave: 'concorrenti_diretti', etichetta: 'Concorrenti diretti', tipo: 'lista', critico: false,
      aiuto: 'Una voce per riga: chi altro offre qualcosa di simile, oltre al confronto già fatto sopra.' },
    { sezione: 'mercato', chiave: 'sinergia_altre_bu', etichetta: 'Sinergia con altre business unit', tipo: 'testo', critico: false,
      aiuto: 'Questa BU si rivolge (anche) a clienti già serviti da un\'altra vostra business unit? Se sì, quale vantaggio dà ' +
        '(canale già caldo, credibilità, cross-sell).' },

    // OFFERTA
    { sezione: 'offerta', chiave: 'servizio', etichetta: 'Servizio', tipo: 'testo', critico: true,
      aiuto: 'Cosa riceve concretamente.' },
    { sezione: 'offerta', chiave: 'unita_vendita', etichetta: 'Unità di vendita', tipo: 'testo', critico: false,
      aiuto: 'La cosa che compra, in cinque parole.' },
    { sezione: 'offerta', chiave: 'risultato_promesso', etichetta: 'Risultato promesso', tipo: 'testo', critico: true,
      aiuto: 'Cosa cambia per lui, verificabile.' },
    { sezione: 'offerta', chiave: 'escluso', etichetta: 'Escluso', tipo: 'testo', critico: false,
      aiuto: 'Cosa NON è incluso.' },
    { sezione: 'offerta', chiave: 'prezzo', etichetta: 'Prezzo', tipo: 'testo', critico: true,
      aiuto: 'Un numero o una fascia.' },
    { sezione: 'offerta', chiave: 'modalita_vendita', etichetta: 'Modalità di vendita', tipo: 'testo', critico: false,
      aiuto: 'Come si arriva alla firma.' },
    { sezione: 'offerta', chiave: 'tempi', etichetta: 'Tempi', tipo: 'testo', critico: false,
      aiuto: 'Dal sì alla consegna.' },

    // RISORSE (liste, una voce per riga)
    { sezione: 'risorse', chiave: 'competenze_presenti', etichetta: 'Competenze presenti', tipo: 'lista', critico: false,
      aiuto: 'Una voce per riga.' },
    { sezione: 'risorse', chiave: 'competenze_mancanti', etichetta: 'Competenze mancanti', tipo: 'lista', critico: true,
      aiuto: 'Una voce per riga.' },
    { sezione: 'risorse', chiave: 'persone', etichetta: 'Persone', tipo: 'lista', critico: false,
      aiuto: 'Una voce per riga: nome — ruolo — cosa presidia.' },

    // ECONOMIA — i dati che dicono se la BU vale l'investimento, non solo
    // se il mercato la vuole: quanto costa erogarla, quante ne reggi in
    // parallelo, quanto è grande il mercato. Alimentano il generatore
    // "Dimensionamento". Una sezione a sé perché nell'output finiscono
    // sempre insieme, non spezzati tra Mercato/Offerta/Risorse.
    { sezione: 'economia', chiave: 'costo_erogazione', etichetta: 'Costo di erogazione', tipo: 'testo', critico: true,
      aiuto: 'Quanto costa erogare il servizio (tempo/risorse valorizzate, subappalti, strumenti). Il prezzo da solo non dice ' +
        'se la BU è profittevole: serve per capire il margine.' },
    { sezione: 'economia', chiave: 'capacita_erogazione', etichetta: 'Capacità di erogazione', tipo: 'testo', critico: true,
      aiuto: 'Quanti clienti/progetti puoi servire in parallelo (o in un anno) con le risorse attuali — stima approssimativa. ' +
        'Senza questo non sai se la BU può scalare o regge un solo cliente alla volta.' },
    { sezione: 'economia', chiave: 'dimensione_mercato', etichetta: 'Dimensione del mercato', tipo: 'testo', critico: true,
      aiuto: 'Quanti clienti così esistono, anche una stima grezza — e come ci sei arrivato. Senza questo non sai se, ' +
        'anche validata, la BU è abbastanza grande da valere l\'investimento.' },

    // PILOTA — versione ridotta dell'offerta per il primo cliente/i primi
    // clienti, pensata per abbassare la soglia d'ingresso. Non è la stessa
    // cosa del prezzo provvisorio dell'offerta standard (quello è già
    // offerta.prezzo, con il suo stato): qui il servizio stesso è ridotto.
    { sezione: 'pilota', chiave: 'servizio_pilota', etichetta: 'Servizio del pilota', tipo: 'testo', critico: false,
      aiuto: 'Cosa include, in versione ridotta rispetto al servizio standard.' },
    { sezione: 'pilota', chiave: 'prezzo_pilota', etichetta: 'Prezzo del pilota', tipo: 'testo', critico: false,
      aiuto: 'Spesso simbolico o scontato rispetto al prezzo standard.' },
    { sezione: 'pilota', chiave: 'durata_pilota', etichetta: 'Durata del pilota', tipo: 'durata', critico: false,
      aiuto: 'Con una data di fine.' },
    { sezione: 'pilota', chiave: 'criteri_successo_pilota', etichetta: 'Criteri di successo del pilota', tipo: 'lista', critico: false,
      aiuto: 'Una voce per riga: cosa deve succedere perché il pilota sia un successo.' },
    { sezione: 'pilota', chiave: 'condizioni_passaggio', etichetta: 'Condizioni di passaggio', tipo: 'testo', critico: false,
      aiuto: 'Cosa deve succedere per passare dal pilota all\'offerta standard, se il pilota ha successo.' },

    // TEST
    { sezione: 'test', chiave: 'canale_test', etichetta: 'Canale del test', tipo: 'testo', critico: true,
      aiuto: 'Un canale solo.' },
    { sezione: 'test', chiave: 'budget_test', etichetta: 'Budget del test', tipo: 'testo', critico: false,
      aiuto: '' },
    { sezione: 'test', chiave: 'durata_test', etichetta: 'Durata del test', tipo: 'durata', critico: false,
      aiuto: 'Con una data di fine.' },
    { sezione: 'test', chiave: 'azione_richiesta', etichetta: 'Azione richiesta', tipo: 'testo', critico: true,
      aiuto: 'Cosa deve fare l\'utente. È anche la CTA della landing.' },
    { sezione: 'test', chiave: 'soglia_messaggio', etichetta: 'Soglia di messaggio', tipo: 'testo', critico: false,
      aiuto: 'Quanti contatti, che tasso di compilazione. Autorizza a telefonare.' },
    { sezione: 'test', chiave: 'soglia_mercato', etichetta: 'Soglia di mercato', tipo: 'testo', critico: true,
      aiuto: 'Quante conversazioni devono arrivare al prezzo. Solo questa autorizza a costruire.' }
  ];

  // ---------------------------------------------------------------------
  // Risultati del test (vista VALIDAZIONE)
  // ---------------------------------------------------------------------

  var RISULTATI = [
    { chiave: 'contatti_raggiunti', etichetta: 'Contatti raggiunti', decide: false },
    { chiave: 'messaggi_ricevuti', etichetta: 'Messaggi / risposte ricevute', decide: false },
    { chiave: 'tasso_risposta', etichetta: 'Tasso di risposta', decide: false },
    { chiave: 'conversazioni_al_prezzo', etichetta: 'Conversazioni arrivate al prezzo', decide: true },
    { chiave: 'preventivi', etichetta: 'Preventivi inviati', decide: true },
    { chiave: 'vendite', etichetta: 'Vendite / contratti chiusi', decide: true },
    { chiave: 'angolo_vincente', etichetta: 'Angolo / leva vincente', decide: true },
    { chiave: 'obiezioni_raccolte', etichetta: 'Obiezioni raccolte', decide: false },
    { chiave: 'note_risultati', etichetta: 'Note libere', decide: false }
  ];

  // ---------------------------------------------------------------------
  // Output possibili per il team creativo (vista OUTPUT) — un elenco fisso
  // di ciò che un art director/copywriter potrebbe produrre a partire da
  // questa BU. Non tutti servono per ogni BU: si spunta cosa serve davvero,
  // il resto resta lì come promemoria di cosa esiste. Non influisce su
  // completezza/campi critici: è uno strumento di consegna, non di
  // validazione della BU.
  // ---------------------------------------------------------------------

  var OUTPUT_CREATIVI = [
    // Testi
    { chiave: 'claim', etichetta: 'Claim / tagline', categoria: 'testi' },
    { chiave: 'naming', etichetta: 'Naming', categoria: 'testi' },
    { chiave: 'copy_landing', etichetta: 'Copy landing page (per sezione)', categoria: 'testi' },
    { chiave: 'headline_varianti', etichetta: 'Headline / varianti per test A/B', categoria: 'testi' },
    { chiave: 'copy_annunci', etichetta: 'Copy annunci a pagamento', categoria: 'testi' },
    { chiave: 'post_linkedin_aziendali', etichetta: 'Post organici LinkedIn (aziendali)', categoria: 'testi' },
    { chiave: 'post_linkedin_personali', etichetta: 'Post organici LinkedIn (founder/personal branding)', categoria: 'testi' },
    { chiave: 'post_altri_social', etichetta: 'Post altri social', categoria: 'testi' },
    { chiave: 'messaggio_primo_contatto', etichetta: 'Messaggio di primo contatto LinkedIn / InMail', categoria: 'testi' },
    { chiave: 'sequenza_email_freddo', etichetta: 'Sequenza email di outreach a freddo', categoria: 'testi' },
    { chiave: 'sequenza_email_nurture', etichetta: 'Sequenza email di follow-up / nurture', categoria: 'testi' },
    { chiave: 'script_discovery_call', etichetta: 'Script discovery call (raffinato)', categoria: 'testi' },
    { chiave: 'copy_presentazione', etichetta: 'Copy presentazione commerciale', categoria: 'testi' },
    { chiave: 'copy_proposta_economica', etichetta: 'Copy proposta economica / preventivo', categoria: 'testi' },
    { chiave: 'case_study', etichetta: 'Case study / testimonianza (template)', categoria: 'testi' },
    { chiave: 'comunicato_stampa', etichetta: 'Comunicato stampa / annuncio di lancio', categoria: 'testi' },
    { chiave: 'bio_azienda', etichetta: 'Bio / descrizione azienda', categoria: 'testi' },
    { chiave: 'faq_standalone', etichetta: 'FAQ standalone', categoria: 'testi' },
    { chiave: 'comunicazione_interna', etichetta: 'Comunicazione interna di lancio', categoria: 'testi' },
    { chiave: 'script_video', etichetta: 'Script video', categoria: 'testi' },
    // Design
    { chiave: 'logo', etichetta: 'Logo', categoria: 'design' },
    { chiave: 'identita_visiva', etichetta: 'Palette e sistema di identità visiva', categoria: 'design' },
    { chiave: 'design_landing', etichetta: 'Design landing page', categoria: 'design' },
    { chiave: 'design_presentazione', etichetta: 'Design presentazione commerciale', categoria: 'design' },
    { chiave: 'design_proposta_economica', etichetta: 'Design proposta economica / preventivo', categoria: 'design' },
    { chiave: 'creativita_annunci', etichetta: 'Creatività per annunci a pagamento', categoria: 'design' },
    { chiave: 'template_social', etichetta: 'Template grafici per post social', categoria: 'design' },
    { chiave: 'mockup_demo', etichetta: 'Mockup / demo del prodotto', categoria: 'design' },
    { chiave: 'brochure', etichetta: 'Brochure / one-pager cliente', categoria: 'design' },
    { chiave: 'materiali_stampa', etichetta: 'Materiali stampa', categoria: 'design' },
    { chiave: 'video_motion', etichetta: 'Video / motion graphic', categoria: 'design' },
    { chiave: 'template_email', etichetta: 'Template email (design)', categoria: 'design' }
  ];

  // ---------------------------------------------------------------------
  // Checklist operativa di lancio (vista LANCIO) — un elenco fisso di
  // verifiche tecniche/operative per portare una BU dal nome al primo
  // lead: setup domini/social, messa online del sito, tracking/consenso/
  // Meta. Estratta da docs/vademecum-nuova-bu.html (dove ogni voce ha il
  // dettaglio, citato qui col riferimento §). Non tutte le voci si
  // applicano a ogni BU (es. una BU senza campagne Meta non avrà mai
  // bisogno delle voci di tracking/consenso): si spunta cosa è stato
  // verificato per QUESTA BU, non è un vincolo universale come i campi
  // critici.
  // ---------------------------------------------------------------------

  var CHECKLIST_LANCIO = [
    // A — Apertura: nome, domini, account
    { chiave: 'nome_validato_domini_social', etichetta: 'Nome validato in parallelo su domini e username social (§1.1)', categoria: 'apertura' },
    { chiave: 'domini_registrati', etichetta: 'Domini registrati, primario e redirect definiti (§1.3)', categoria: 'apertura' },
    { chiave: 'gerarchia_mail', etichetta: 'Mail madre, mail aziendali, mail di servizio (§1.4)', categoria: 'apertura' },
    { chiave: 'profili_social_aperti', etichetta: 'Profili social aperti, suffisso HQ se serve (§1.2)', categoria: 'apertura' },
    { chiave: 'due_fa_account_brand', etichetta: '2FA sull\'account brand, non su una persona (§1.5)', categoria: 'apertura' },
    { chiave: 'intestazione_pagine_bm', etichetta: 'Deciso chi intesta pagine, Business Manager e ad account (§10.1)', categoria: 'apertura' },
    { chiave: 'copertura_competenze_mancanti', etichetta: 'Deciso come coprire le competenze mancanti: assunzione, progetto o esterno (§8)', categoria: 'apertura' },

    // B — Messa online del sito
    { chiave: 'split_corporate_landing', etichetta: 'Split corporate / landing-ads deciso a inizio sviluppo (§2.2)', categoria: 'sito' },
    { chiave: 'affordance_ritorno_rimosse', etichetta: 'Affordance di ritorno rimosse dal flusso di conversione (§2.1)', categoria: 'sito' },
    { chiave: 'title_brand_puro', etichetta: 'Title impostato sul brand puro (§2.3)', categoria: 'sito' },
    { chiave: 'open_graph_scrape', etichetta: 'Open Graph 1200×630 + scrape forzato dal Sharing Debugger (§2.3)', categoria: 'sito' },
    { chiave: 'noindex_pagine_tecniche', etichetta: 'Noindex sulle pagine tecniche + esclusione dalla sitemap (§2.3)', categoria: 'sito' },
    { chiave: 'download_bloccato', etichetta: 'Deterrente al download di base attivato per immagini e testi (§2.3)', categoria: 'sito' },
    { chiave: 'player_video_conforme', etichetta: 'Player video: nessun controllo, loop, check desktop e mobile (§7.3)', categoria: 'sito' },
    { chiave: 'consensi_immagine_sito', etichetta: 'Consensi immagine raccolti per chi compare sul sito (§9, fase 4)', categoria: 'sito' },

    // C — Tracking, consenso e Meta
    { chiave: 'documenti_legali_generati', etichetta: 'Tre documenti legali generati sul sito reale (§5.1)', categoria: 'tracking_meta' },
    { chiave: 'mappatura_servizi_terzi', etichetta: 'Mappatura servizi terzi + punti di raccolta (§5.2)', categoria: 'tracking_meta' },
    { chiave: 'banner_produzione_configuratore', etichetta: 'Banner in produzione = configuratore (§5.4)', categoria: 'tracking_meta' },
    { chiave: 'tag_post_consenso_verificati', etichetta: 'Verificato lato browser e lato server (CAPI) che i tag partano post-consenso (§5.3)', categoria: 'tracking_meta' },
    { chiave: 'parametri_utm_tracciati', etichetta: 'Nove parametri tracciati fino al CRM, come campi dedicati (§3.1, §3.2)', categoria: 'tracking_meta' },
    { chiave: 'audit_pagine_collegate', etichetta: 'Audit pagine collegate: nessuna restrizione pregressa (§4.4)', categoria: 'tracking_meta' },
    { chiave: 'verifiche_meta_ordine', etichetta: 'Verifiche Meta nell\'ordine: profilo → portfolio → dominio → azienda (§4.1)', categoria: 'tracking_meta' },
    { chiave: 'eventi_pixel_capi_testati', etichetta: 'Quattro eventi testati su pixel e CAPI, deduplicazione via event_id verificata in Events Manager (§3.4)', categoria: 'tracking_meta' },
    { chiave: 'liste_clienti_target', etichetta: 'Liste clienti e target con almeno un identificatore forte (§4.6)', categoria: 'tracking_meta' },
    { chiave: 'privacy_policy_facebook', etichetta: 'Privacy policy linkata sulla pagina Facebook (§5.4)', categoria: 'tracking_meta' }
  ];

  // ---------------------------------------------------------------------
  // Id
  // ---------------------------------------------------------------------

  var contatoreId = 0;

  function generaId(prefisso) {
    contatoreId += 1;
    return (prefisso || 'id') + '_' + Date.now().toString(36) + '_' +
      contatoreId.toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  // ---------------------------------------------------------------------
  // Costruttori
  // ---------------------------------------------------------------------

  function valoreVuoto(tipo) {
    if (tipo === 'lista') return [];
    if (tipo === 'durata') return { testo: '', dataFine: '' };
    return '';
  }

  function nuovoCampo(tipo) {
    return { valore: valoreVuoto(tipo), stato: 'ipotesi' };
  }

  function nuovaLeva() {
    return {
      id: generaId('leva'),
      fatto_osservabile: '',
      come_lo_chiama_lui: '',
      come_lo_chiami_tu: '',
      come_lo_elimini: '',
      // Stesso enum di STATI_CAMPO (ipotesi/generato_da_ia/mandatorio): la
      // leva è di per sé un'ipotesi da testare, quindi il concetto vale
      // tanto quanto per un campo — anzi di più. Uno stato per l'intera
      // leva, non per ciascuno dei 4 campi sopra: nascono e si validano
      // insieme (stessa intervista, stesso insight), separarli avrebbe
      // aggiunto granularità senza un uso reale.
      stato: 'ipotesi'
    };
  }

  function nuoviCampi() {
    var campi = {};
    CAMPI.forEach(function (def) {
      if (!campi[def.sezione]) campi[def.sezione] = {};
      campi[def.sezione][def.chiave] = nuovoCampo(def.tipo);
    });
    return campi;
  }

  function nuoviRisultati() {
    var risultati = {};
    RISULTATI.forEach(function (def) {
      risultati[def.chiave] = '';
    });
    return risultati;
  }

  function nuovaConsegna() {
    var consegna = {};
    OUTPUT_CREATIVI.forEach(function (def) {
      consegna[def.chiave] = { selezionato: false, nota: '' };
    });
    return consegna;
  }

  function nuovoLancio() {
    var lancio = {};
    CHECKLIST_LANCIO.forEach(function (def) {
      lancio[def.chiave] = { selezionato: false, nota: '' };
    });
    return lancio;
  }

  function nuovaBU(nome) {
    var ora = new Date().toISOString();
    return {
      id: generaId('bu'),
      nome: (nome && String(nome).trim()) || 'Nuova business unit',
      stato: 'idea',
      creata: ora,
      modificata: ora,
      // Quando campi o leve sono stati modificati l'ultima volta — non
      // "modificata" in generale, che scatta anche per consegna/lancio/
      // decisione, cose che nessun generatore legge. Confrontato con
      // materiali[id].generatoIl da materialeObsoleto() per segnalare quali
      // materiali sono stati generati PRIMA dell'ultima modifica ai dati che
      // li alimentano.
      campiModificatiIl: ora,
      campi: nuoviCampi(),
      leve: [],
      materiali: {},
      risultati: nuoviRisultati(),
      consegna: nuovaConsegna(),
      lancio: nuovoLancio(),
      decisione: null,
      noteDecisione: { motivazione: '', data: '' }
    };
  }

  // ---------------------------------------------------------------------
  // Ricerca / lettura
  // ---------------------------------------------------------------------

  function elencaCampi() {
    return CAMPI.slice();
  }

  function elencaCampiSezione(sezione) {
    return CAMPI.filter(function (def) { return def.sezione === sezione; });
  }

  function trovaCampoDef(sezione, chiave) {
    for (var i = 0; i < CAMPI.length; i++) {
      if (CAMPI[i].sezione === sezione && CAMPI[i].chiave === chiave) return CAMPI[i];
    }
    return null;
  }

  function ottieniCampo(bu, sezione, chiave) {
    return bu && bu.campi && bu.campi[sezione] ? bu.campi[sezione][chiave] : undefined;
  }

  // ---------------------------------------------------------------------
  // Regole
  // ---------------------------------------------------------------------

  // Apertura scelta per questa BU. Se non è stata decisa si assume 'perdita',
  // ma `aperturaDecisa` permette ai generatori di dirlo invece di nasconderlo.
  function apertura(bu) {
    var campo = ottieniCampo(bu, 'identita', 'apertura');
    var v = campo && typeof campo.valore === 'string' ? campo.valore : '';
    return APERTURE.indexOf(v) !== -1 ? v : 'perdita';
  }

  function aperturaDecisa(bu) {
    var campo = ottieniCampo(bu, 'identita', 'apertura');
    return !!(campo && APERTURE.indexOf(campo.valore) !== -1);
  }

  // Uno stato fuori dai tre validi (es. dati salvati con lo schema v1:
  // da_verificare/verificata/da_revisionare) ricade su "ipotesi" invece di
  // propagare un valore sconosciuto nell'interfaccia o nei generatori.
  function statoEffettivoCampo(campo) {
    if (!campo) return 'ipotesi';
    return STATI_CAMPO.indexOf(campo.stato) !== -1 ? campo.stato : 'ipotesi';
  }

  function statoEffettivoLeva(leva) {
    if (!leva) return 'ipotesi';
    return STATI_CAMPO.indexOf(leva.stato) !== -1 ? leva.stato : 'ipotesi';
  }

  // Un materiale è obsoleto quando campi/leve sono stati modificati DOPO
  // l'ultima generazione — non quando è "vecchio" in assoluto, e non per
  // modifiche a consegna/lancio/decisione, che nessun generatore legge.
  // Confronto fra stringhe ISO 8601: ordina correttamente senza serve
  // costruire oggetti Date.
  function materialeObsoleto(bu, materiale) {
    if (!materiale || !bu) return false;
    var soglia = bu.campiModificatiIl;
    if (!soglia) return false;
    return materiale.generatoIl < soglia;
  }

  function campoHaValore(campo, tipo) {
    if (!campo) return false;
    var v = campo.valore;
    if (tipo === 'lista') {
      return Array.isArray(v) && v.some(function (r) { return r && String(r).trim(); });
    }
    if (tipo === 'durata') {
      return !!(v && ((v.testo && String(v.testo).trim()) || (v.dataFine && String(v.dataFine).trim())));
    }
    return typeof v === 'string' && v.trim().length > 0;
  }

  function completezza(bu) {
    var totali = CAMPI.length;
    var compilati = 0;
    CAMPI.forEach(function (def) {
      var campo = ottieniCampo(bu, def.sezione, def.chiave);
      if (campoHaValore(campo, def.tipo)) compilati++;
    });
    return {
      totali: totali,
      compilati: compilati,
      percentuale: totali ? Math.round((compilati / totali) * 100) : 0
    };
  }

  function listaDaTesto(testo) {
    if (!testo) return [];
    return String(testo).replace(/\r\n/g, '\n').split('\n');
  }

  function testoDaLista(lista) {
    return Array.isArray(lista) ? lista.join('\n') : '';
  }

  // ---------------------------------------------------------------------
  // Normalizzazione / migrazione
  // ---------------------------------------------------------------------

  function normalizzaCampo(grezzo, tipo) {
    var out = nuovoCampo(tipo);
    if (grezzo && typeof grezzo === 'object') {
      if (tipo === 'lista') {
        if (Array.isArray(grezzo.valore)) {
          out.valore = grezzo.valore.filter(function (r) { return typeof r === 'string'; });
        } else if (typeof grezzo.valore === 'string' && grezzo.valore) {
          out.valore = listaDaTesto(grezzo.valore);
        }
      } else if (tipo === 'durata') {
        if (grezzo.valore && typeof grezzo.valore === 'object' && !Array.isArray(grezzo.valore)) {
          out.valore = {
            testo: typeof grezzo.valore.testo === 'string' ? grezzo.valore.testo : '',
            dataFine: typeof grezzo.valore.dataFine === 'string' ? grezzo.valore.dataFine : ''
          };
        } else if (typeof grezzo.valore === 'string' && grezzo.valore) {
          out.valore = { testo: grezzo.valore, dataFine: '' };
        }
      } else {
        if (typeof grezzo.valore === 'string') out.valore = grezzo.valore;
      }
      // Stati dello schema v1 (da_verificare/verificata/da_revisionare) non
      // sono più validi: non passano il controllo, il campo resta "ipotesi"
      // (il default già impostato da nuovoCampo). Il vecchio campo `prova`
      // non esiste più nello schema: viene letto e scartato, non riportato.
      if (STATI_CAMPO.indexOf(grezzo.stato) !== -1) out.stato = grezzo.stato;
    }
    return out;
  }

  function normalizzaCampi(grezzi) {
    var campi = {};
    CAMPI.forEach(function (def) {
      if (!campi[def.sezione]) campi[def.sezione] = {};
      var sezioneGrezza = grezzi && typeof grezzi === 'object' ? grezzi[def.sezione] : null;
      var campoGrezzo = sezioneGrezza && typeof sezioneGrezza === 'object' ? sezioneGrezza[def.chiave] : null;
      campi[def.sezione][def.chiave] = normalizzaCampo(campoGrezzo, def.tipo);
    });
    return campi;
  }

  function normalizzaLeva(grezza) {
    var leva = nuovaLeva();
    if (grezza && typeof grezza === 'object') {
      if (typeof grezza.id === 'string' && grezza.id) leva.id = grezza.id;
      // `tipo` esisteva nello schema v1 (dolore|obiettivo). Non veniva letto da
      // nessun generatore ed è stato sostituito dal campo identita.apertura,
      // che è una scelta per business unit. I dati vecchi lo perdono in silenzio.
      ['fatto_osservabile', 'come_lo_chiama_lui', 'come_lo_chiami_tu', 'come_lo_elimini'].forEach(function (k) {
        if (typeof grezza[k] === 'string') leva[k] = grezza[k];
      });
      if (STATI_CAMPO.indexOf(grezza.stato) !== -1) leva.stato = grezza.stato;
    }
    return leva;
  }

  function normalizzaMateriali(grezzi) {
    var materiali = {};
    if (grezzi && typeof grezzi === 'object') {
      Object.keys(grezzi).forEach(function (id) {
        var m = grezzi[id];
        if (!m || typeof m !== 'object') return;
        materiali[id] = {
          stato: STATI_MATERIALE.indexOf(m.stato) !== -1 ? m.stato : 'bozza',
          testo: typeof m.testo === 'string' ? m.testo : '',
          generatoIl: typeof m.generatoIl === 'string' ? m.generatoIl : '',
          modificatoAMano: !!m.modificatoAMano,
          // Solo per i generatori haPrompt (vedi gen/_registry.js): il
          // risultato incollato a mano dal prompt generato, indipendente dal
          // testo — sopravvive alla rigenerazione del materiale.
          risultatoPrompt: typeof m.risultatoPrompt === 'string' ? m.risultatoPrompt : ''
        };
      });
    }
    return materiali;
  }

  function normalizzaRisultati(grezzi) {
    var risultati = nuoviRisultati();
    if (grezzi && typeof grezzi === 'object') {
      RISULTATI.forEach(function (def) {
        if (typeof grezzi[def.chiave] === 'string') risultati[def.chiave] = grezzi[def.chiave];
      });
    }
    return risultati;
  }

  function normalizzaConsegna(grezzi) {
    var consegna = nuovaConsegna();
    if (grezzi && typeof grezzi === 'object') {
      OUTPUT_CREATIVI.forEach(function (def) {
        var g = grezzi[def.chiave];
        if (g && typeof g === 'object') {
          consegna[def.chiave].selezionato = !!g.selezionato;
          if (typeof g.nota === 'string') consegna[def.chiave].nota = g.nota;
        }
      });
    }
    return consegna;
  }

  function normalizzaLancio(grezzi) {
    var lancio = nuovoLancio();
    if (grezzi && typeof grezzi === 'object') {
      CHECKLIST_LANCIO.forEach(function (def) {
        var g = grezzi[def.chiave];
        if (g && typeof g === 'object') {
          lancio[def.chiave].selezionato = !!g.selezionato;
          if (typeof g.nota === 'string') lancio[def.chiave].nota = g.nota;
        }
      });
    }
    return lancio;
  }

  function normalizzaBU(grezzo) {
    grezzo = (grezzo && typeof grezzo === 'object') ? grezzo : {};
    var base = nuovaBU(typeof grezzo.nome === 'string' && grezzo.nome.trim() ? grezzo.nome : undefined);
    base.id = (typeof grezzo.id === 'string' && grezzo.id) ? grezzo.id : base.id;
    base.stato = STATI_BU.indexOf(grezzo.stato) !== -1 ? grezzo.stato : 'idea';
    base.creata = (typeof grezzo.creata === 'string' && grezzo.creata) ? grezzo.creata : base.creata;
    base.modificata = (typeof grezzo.modificata === 'string' && grezzo.modificata) ? grezzo.modificata : base.modificata;
    // Dati salvati prima che questo campo esistesse: niente "ora" come
    // default (marcherebbe come obsoleto ogni materiale già generato, al
    // primo caricamento) — la creazione della BU è per costruzione sempre
    // precedente a qualunque generatoIl.
    base.campiModificatiIl = (typeof grezzo.campiModificatiIl === 'string' && grezzo.campiModificatiIl) ? grezzo.campiModificatiIl : base.creata;
    base.campi = normalizzaCampi(grezzo.campi);
    base.leve = Array.isArray(grezzo.leve) ? grezzo.leve.map(normalizzaLeva) : [];
    base.materiali = normalizzaMateriali(grezzo.materiali);
    base.risultati = normalizzaRisultati(grezzo.risultati);
    base.consegna = normalizzaConsegna(grezzo.consegna);
    base.lancio = normalizzaLancio(grezzo.lancio);
    base.decisione = DECISIONI.indexOf(grezzo.decisione) !== -1 ? grezzo.decisione : null;
    base.noteDecisione = {
      motivazione: (grezzo.noteDecisione && typeof grezzo.noteDecisione.motivazione === 'string') ? grezzo.noteDecisione.motivazione : '',
      data: (grezzo.noteDecisione && typeof grezzo.noteDecisione.data === 'string') ? grezzo.noteDecisione.data : ''
    };
    return base;
  }

  // ---------------------------------------------------------------------
  // Esportazione
  // ---------------------------------------------------------------------

  BU.schema = {
    VERSIONE_SCHEMA: VERSIONE_SCHEMA,
    STATI_CAMPO: STATI_CAMPO,
    STATI_CAMPO_ETICHETTE: STATI_CAMPO_ETICHETTE,
    STATI_BU: STATI_BU,
    STATI_BU_ETICHETTE: STATI_BU_ETICHETTE,
    STATI_MATERIALE: STATI_MATERIALE,
    STATI_MATERIALE_ETICHETTE: STATI_MATERIALE_ETICHETTE,
    APERTURE: APERTURE,
    APERTURE_ETICHETTE: APERTURE_ETICHETTE,
    DECISIONI: DECISIONI,
    DECISIONI_ETICHETTE: DECISIONI_ETICHETTE,
    SEZIONI: SEZIONI,
    CAMPI: CAMPI,
    RISULTATI: RISULTATI,
    OUTPUT_CREATIVI: OUTPUT_CREATIVI,
    CHECKLIST_LANCIO: CHECKLIST_LANCIO,

    generaId: generaId,
    nuovaBU: nuovaBU,
    nuovaLeva: nuovaLeva,
    nuovoCampo: nuovoCampo,

    elencaCampi: elencaCampi,
    elencaCampiSezione: elencaCampiSezione,
    trovaCampoDef: trovaCampoDef,
    ottieniCampo: ottieniCampo,

    statoEffettivoCampo: statoEffettivoCampo,
    statoEffettivoLeva: statoEffettivoLeva,
    apertura: apertura,
    aperturaDecisa: aperturaDecisa,
    campoHaValore: campoHaValore,
    materialeObsoleto: materialeObsoleto,
    completezza: completezza,

    listaDaTesto: listaDaTesto,
    testoDaLista: testoDaLista,

    normalizzaBU: normalizzaBU
  };

}(typeof window !== 'undefined' ? window : this));
