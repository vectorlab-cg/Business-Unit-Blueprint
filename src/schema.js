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

  var VERSIONE_SCHEMA = 1;

  // ---------------------------------------------------------------------
  // Enumerazioni
  // ---------------------------------------------------------------------

  var STATI_CAMPO = ['ipotesi', 'da_verificare', 'verificata', 'da_revisionare'];

  var STATI_CAMPO_ETICHETTE = {
    ipotesi: 'Ipotesi',
    da_verificare: 'Da verificare',
    verificata: 'Verificata',
    da_revisionare: 'Da revisionare'
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
  // verificata solo quando un test di campagna dice quale dei due converte.
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

  var SEZIONI = [
    { chiave: 'identita', etichetta: 'Identità' },
    { chiave: 'mercato', etichetta: 'Mercato' },
    { chiave: 'offerta', etichetta: 'Offerta' },
    { chiave: 'pilota', etichetta: 'Pilota' },
    { chiave: 'risorse', etichetta: 'Risorse' },
    { chiave: 'test', etichetta: 'Test' }
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

    // MERCATO
    { sezione: 'mercato', chiave: 'cliente_ideale', etichetta: 'Cliente ideale', tipo: 'testo', critico: true,
      aiuto: 'Tipo di azienda, settore, dimensione, momento.' },
    { sezione: 'mercato', chiave: 'decisore', etichetta: 'Decisore', tipo: 'testo', critico: true,
      aiuto: 'Il ruolo che firma.' },
    { sezione: 'mercato', chiave: 'contesto_decisore', etichetta: 'Contesto del decisore', tipo: 'testo', critico: false,
      aiuto: 'Cosa ha sulla scrivania quando arrivate.' },
    { sezione: 'mercato', chiave: 'alternativa_attuale', etichetta: 'Alternativa attuale', tipo: 'testo', critico: true,
      aiuto: 'Cosa fa oggi al posto vostro (la vera concorrenza).' },

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

    // RISORSE (liste, una voce per riga)
    { sezione: 'risorse', chiave: 'competenze_presenti', etichetta: 'Competenze presenti', tipo: 'lista', critico: false,
      aiuto: 'Una voce per riga.' },
    { sezione: 'risorse', chiave: 'competenze_mancanti', etichetta: 'Competenze mancanti', tipo: 'lista', critico: true,
      aiuto: 'Una voce per riga.' },
    { sezione: 'risorse', chiave: 'persone', etichetta: 'Persone', tipo: 'lista', critico: false,
      aiuto: 'Una voce per riga: nome — ruolo — cosa presidia.' },

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
    { chiave: 'note_risultati', etichetta: 'Note libere', decide: false }
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
    return { valore: valoreVuoto(tipo), stato: 'ipotesi', prova: '' };
  }

  function nuovaLeva() {
    return {
      id: generaId('leva'),
      fatto_osservabile: '',
      come_lo_chiama_lui: '',
      come_lo_chiami_tu: '',
      come_lo_elimini: ''
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

  function nuovaBU(nome) {
    var ora = new Date().toISOString();
    return {
      id: generaId('bu'),
      nome: (nome && String(nome).trim()) || 'Nuova business unit',
      stato: 'idea',
      creata: ora,
      modificata: ora,
      campi: nuoviCampi(),
      leve: [],
      materiali: {},
      risultati: nuoviRisultati(),
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

  // Regola 1: "verificata" senza prova ricade in "da_verificare".
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

  function statoEffettivoCampo(campo) {
    if (!campo) return 'ipotesi';
    if (campo.stato === 'verificata' && !(campo.prova && String(campo.prova).trim())) {
      return 'da_verificare';
    }
    return STATI_CAMPO.indexOf(campo.stato) !== -1 ? campo.stato : 'ipotesi';
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
      if (STATI_CAMPO.indexOf(grezzo.stato) !== -1) out.stato = grezzo.stato;
      if (typeof grezzo.prova === 'string') out.prova = grezzo.prova;
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
          modificatoAMano: !!m.modificatoAMano
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

  function normalizzaBU(grezzo) {
    grezzo = (grezzo && typeof grezzo === 'object') ? grezzo : {};
    var base = nuovaBU(typeof grezzo.nome === 'string' && grezzo.nome.trim() ? grezzo.nome : undefined);
    base.id = (typeof grezzo.id === 'string' && grezzo.id) ? grezzo.id : base.id;
    base.stato = STATI_BU.indexOf(grezzo.stato) !== -1 ? grezzo.stato : 'idea';
    base.creata = (typeof grezzo.creata === 'string' && grezzo.creata) ? grezzo.creata : base.creata;
    base.modificata = (typeof grezzo.modificata === 'string' && grezzo.modificata) ? grezzo.modificata : base.modificata;
    base.campi = normalizzaCampi(grezzo.campi);
    base.leve = Array.isArray(grezzo.leve) ? grezzo.leve.map(normalizzaLeva) : [];
    base.materiali = normalizzaMateriali(grezzo.materiali);
    base.risultati = normalizzaRisultati(grezzo.risultati);
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

    generaId: generaId,
    nuovaBU: nuovaBU,
    nuovaLeva: nuovaLeva,
    nuovoCampo: nuovoCampo,

    elencaCampi: elencaCampi,
    elencaCampiSezione: elencaCampiSezione,
    trovaCampoDef: trovaCampoDef,
    ottieniCampo: ottieniCampo,

    statoEffettivoCampo: statoEffettivoCampo,
    apertura: apertura,
    aperturaDecisa: aperturaDecisa,
    campoHaValore: campoHaValore,
    completezza: completezza,

    listaDaTesto: listaDaTesto,
    testoDaLista: testoDaLista,

    normalizzaBU: normalizzaBU
  };

}(typeof window !== 'undefined' ? window : this));
