/*
 * test/smoke.js
 * Test di fumo senza dipendenze. Esecuzione: node test/smoke.js
 *
 * Carica i file sorgente in un contesto vm con `window` che punta a se
 * stesso: nel browser `window` È l'oggetto globale, quindi `window.BU = ...`
 * crea davvero una globale `BU`. Se non facessimo puntare `window` a se
 * stesso, `window.BU = ...` scriverebbe su un oggetto qualsiasi e la
 * globale `BU` non esisterebbe mai, il codice sorgente (pensato per il
 * browser) non funzionerebbe nello stesso modo qui.
 */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var RADICE = path.join(__dirname, '..');

// I generatori si scoprono leggendo src/gen/: aggiungerne uno non richiede
// toccare questo file, solo crearlo e registrarlo in index.html (vedi
// docs/AGGIUNGERE-UN-GENERATORE.md). _registry.js deve caricare per primo,
// perché definisce BU.registraGeneratore usato da tutti gli altri.
function elencaFileGeneratori() {
  var dirGen = path.join(RADICE, 'src/gen');
  if (!fs.existsSync(dirGen)) return [];
  var file = fs.readdirSync(dirGen).filter(function (f) { return f.slice(-3) === '.js'; });
  file.sort();
  var registro = '_registry.js';
  var resto = file.filter(function (f) { return f !== registro; });
  var ordinati = file.indexOf(registro) !== -1 ? [registro].concat(resto) : resto;
  return ordinati.map(function (f) { return 'src/gen/' + f; });
}

var FILE_SORGENTE = ['src/schema.js', 'src/store.js', 'src/cartella.js', 'src/render.js', 'src/markdown.js'].concat(elencaFileGeneratori());

// ---------------------------------------------------------------------
// Localstorage minimale, per testare store.js in Node
// ---------------------------------------------------------------------

function creaLocalStorageFinto() {
  var dati = {};
  return {
    getItem: function (chiave) {
      return Object.prototype.hasOwnProperty.call(dati, chiave) ? dati[chiave] : null;
    },
    setItem: function (chiave, valore) {
      dati[chiave] = String(valore);
    },
    removeItem: function (chiave) {
      delete dati[chiave];
    },
    clear: function () {
      dati = {};
    }
  };
}

function creaContesto() {
  var sandbox = {};
  sandbox.window = sandbox;
  sandbox.console = console;
  sandbox.localStorage = creaLocalStorageFinto();
  // TextEncoder/TextDecoder/btoa/atob servono a cartella.js per il base64
  // UTF-8; sono globali in Node ma non attraversano da soli il contesto vm.
  sandbox.TextEncoder = TextEncoder;
  sandbox.TextDecoder = TextDecoder;
  sandbox.btoa = btoa;
  sandbox.atob = atob;
  vm.createContext(sandbox);
  FILE_SORGENTE.forEach(function (relativo) {
    var percorso = path.join(RADICE, relativo);
    if (!fs.existsSync(percorso)) return; // file non ancora creato durante lo sviluppo incrementale
    var codice = fs.readFileSync(percorso, 'utf8');
    vm.runInContext(codice, sandbox, { filename: relativo });
  });
  return sandbox;
}

// ---------------------------------------------------------------------
// Harness di test minimale
// ---------------------------------------------------------------------

var esiti = [];
var promesseInSospeso = [];

// Supporta anche test asincroni: se fn() restituisce una promise, l'esito
// viene aggiornato quando si risolve, e il riepilogo finale aspetta tutte
// le promesse in sospeso prima di stampare (vedi in fondo al file).
function test(nome, fn) {
  var voce = { nome: nome, ok: null, errore: null };
  esiti.push(voce);
  try {
    var risultato = fn();
    if (risultato && typeof risultato.then === 'function') {
      promesseInSospeso.push(risultato.then(function () {
        voce.ok = true;
      }).catch(function (e) {
        voce.ok = false;
        voce.errore = e && e.stack ? e.stack : String(e);
      }));
      return;
    }
    voce.ok = true;
  } catch (e) {
    voce.ok = false;
    voce.errore = e && e.stack ? e.stack : String(e);
  }
}

function assicura(condizione, messaggio) {
  if (!condizione) throw new Error(messaggio || 'Asserzione fallita');
}

function assicuraUguale(attuale, atteso, messaggio) {
  if (attuale !== atteso) {
    throw new Error((messaggio || 'Valori diversi') + ' - atteso: ' + JSON.stringify(atteso) + ', ottenuto: ' + JSON.stringify(attuale));
  }
}

// ---------------------------------------------------------------------
// Fixture: una BU completamente compilata e una vuota
// ---------------------------------------------------------------------

function creaBuCompilata(sandbox) {
  var schema = sandbox.BU.schema;
  var bu = schema.nuovaBU('Ricambi su misura');

  function imposta(sezione, chiave, valore, stato) {
    var campo = bu.campi[sezione][chiave];
    campo.valore = valore;
    campo.stato = stato || 'ipotesi';
  }

  imposta('identita', 'descrizione', 'Produciamo ricambi meccanici su misura per linee di imballaggio ferme.', 'mandatorio');
  imposta('identita', 'apertura', 'perdita', 'ipotesi');
  imposta('identita', 'meccanismo', 'Inseriamo un tecnico in stabilimento che rileva la quota e consegna il pezzo entro 48 ore.', 'ipotesi');
  imposta('identita', 'responsabile', 'Marco Verdi.', 'mandatorio');

  imposta('mercato', 'cliente_ideale', 'PMI manifatturiere 50-200 dipendenti con linee automatizzate.', 'mandatorio');
  imposta('mercato', 'decisore', 'Responsabile di manutenzione.', 'ipotesi');
  imposta('mercato', 'contesto_decisore', 'Ha una linea ferma e un fornitore che risponde in due settimane.', 'ipotesi');
  imposta('mercato', 'alternativa_attuale', 'Aspettano il ricambio originale dal produttore della macchina.', 'generato_da_ia');
  imposta('mercato', 'differenziazione_competitiva', 'Gli altri produttori di ricambi custom hanno tempi di 1-2 settimane, noi consegniamo in 48 ore.', 'ipotesi');
  imposta('mercato', 'concorrenti_diretti', ['Officina Rossi (ricambi custom generici)', 'Service locali non specializzati'], 'ipotesi');
  imposta('mercato', 'sinergia_altre_bu', 'Alcuni di questi clienti sono già serviti da Ynsera per staff augmentation: canale caldo.', 'ipotesi');

  imposta('offerta', 'servizio', 'Rilievo, disegno CAD e produzione del pezzo di ricambio.', 'ipotesi');
  imposta('offerta', 'unita_vendita', 'Un pezzo di ricambio urgente.', 'ipotesi');
  imposta('offerta', 'risultato_promesso', 'Linea riavviata entro 48 ore invece di due settimane.', 'mandatorio');
  imposta('offerta', 'escluso', 'Manutenzione ordinaria e assistenza da remoto.', 'ipotesi');
  imposta('offerta', 'prezzo', '800-1500 euro a pezzo.', 'ipotesi');
  imposta('offerta', 'modalita_vendita', 'Preventivo telefonico, conferma via email.', 'ipotesi');
  imposta('offerta', 'tempi', '48 ore dalla conferma.', 'ipotesi');

  imposta('economia', 'costo_erogazione', 'Circa 300-500 euro a pezzo (materiale, tornitura, ore tecnico).', 'ipotesi');
  imposta('economia', 'capacita_erogazione', 'Circa 10 pezzi urgenti al mese con il tecnico attuale.', 'ipotesi');
  imposta('economia', 'dimensione_mercato', 'Stima: circa 800 PMI manifatturiere nel raggio di 150km con linee automatizzate (dato camere di commercio locali).', 'generato_da_ia');

  imposta('pilota', 'servizio_pilota', 'Un solo pezzo di ricambio, senza accordo quadro.', 'ipotesi');
  imposta('pilota', 'prezzo_pilota', '400 euro, indipendentemente dalla complessità.', 'ipotesi');
  bu.campi.pilota.durata_pilota.valore = { testo: '1 intervento', dataFine: '2026-08-15' };
  imposta('pilota', 'criteri_successo_pilota', ['Consegna entro 48 ore', 'Il cliente richiede un secondo pezzo'], 'ipotesi');
  imposta('pilota', 'condizioni_passaggio', 'Se il cliente richiede un secondo pezzo entro 60 giorni, passa a listino standard.', 'ipotesi');

  imposta('risorse', 'competenze_presenti', ['Disegno CAD', 'Tornitura CNC'], 'ipotesi');
  imposta('risorse', 'competenze_mancanti', ['Logistica urgente su tutto il territorio'], 'ipotesi');
  imposta('risorse', 'persone', ['Marco — tecnico rilievo — visite in stabilimento'], 'ipotesi');

  imposta('test', 'canale_test', 'LinkedIn Ads', 'ipotesi');
  imposta('test', 'budget_test', '600 euro', 'ipotesi');
  bu.campi.test.durata_test.valore = { testo: '4 settimane', dataFine: '2026-09-01' };
  imposta('test', 'azione_richiesta', 'Prenota una diagnosi gratuita della linea.', 'ipotesi');
  imposta('test', 'soglia_messaggio', '20 contatti, 30% di compilazione modulo.', 'ipotesi');
  imposta('test', 'soglia_mercato', 'Almeno 5 conversazioni arrivate al prezzo.', 'ipotesi');

  bu.risultati.contatti_raggiunti = '34';
  bu.risultati.messaggi_ricevuti = '11';
  bu.risultati.tasso_risposta = '32%';
  bu.risultati.conversazioni_al_prezzo = '6';
  bu.risultati.preventivi = '4';
  bu.risultati.vendite = '2';
  bu.risultati.angolo_vincente = 'La leva sul fermo linea.';
  bu.risultati.obiezioni_raccolte = 'Il prezzo sembra alto finché non lo confrontano col costo di una linea ferma due settimane.';
  bu.risultati.note_risultati = 'Test durato 4 settimane su LinkedIn Ads.';

  bu.leve = [
    Object.assign(schema.nuovaLeva(), {
      fatto_osservabile: 'La linea si ferma e resta ferma per giorni.',
      come_lo_chiama_lui: 'Non troviamo il pezzo in tempo.',
      come_lo_chiami_tu: 'Assenza di un fornitore di ricambi a risposta rapida.',
      come_lo_elimini: 'Rileviamo e produciamo il pezzo entro 48 ore.'
    }),
    Object.assign(schema.nuovaLeva(), {
      fatto_osservabile: 'Il fornitore originale ha tempi di due settimane.',
      come_lo_chiama_lui: 'Ci tengono in ostaggio.',
      come_lo_chiami_tu: 'Dipendenza da un unico fornitore con lead time lungo.',
      come_lo_elimini: 'Offriamo un canale alternativo qualificato in 48 ore.'
    }),
    Object.assign(schema.nuovaLeva(), {
      fatto_osservabile: 'Il responsabile vuole ridurre i fermi macchina annuali.',
      come_lo_chiama_lui: 'Vogliamo meno fermi linea.',
      come_lo_chiami_tu: 'Riduzione del downtime non pianificato.',
      come_lo_elimini: 'Accordo quadro con tempi di consegna garantiti.'
    })
  ];

  return bu;
}

module.exports = { creaContesto: creaContesto, creaBuCompilata: creaBuCompilata, test: test, assicura: assicura, assicuraUguale: assicuraUguale };

// ---------------------------------------------------------------------
// Test: schema
// ---------------------------------------------------------------------

var sandbox = creaContesto();
var schema = sandbox.BU.schema;

test('schema: definisce almeno i campi richiesti dalla specifica', function () {
  var attesi = [
    'identita.descrizione', 'identita.meccanismo',
    'mercato.cliente_ideale', 'mercato.decisore', 'mercato.contesto_decisore', 'mercato.alternativa_attuale',
    'offerta.servizio', 'offerta.unita_vendita', 'offerta.risultato_promesso', 'offerta.escluso',
    'offerta.prezzo', 'offerta.modalita_vendita', 'offerta.tempi',
    'risorse.competenze_presenti', 'risorse.competenze_mancanti', 'risorse.persone',
    'test.canale_test', 'test.budget_test', 'test.durata_test', 'test.azione_richiesta',
    'test.soglia_messaggio', 'test.soglia_mercato'
  ];
  var presenti = schema.CAMPI.map(function (c) { return c.sezione + '.' + c.chiave; });
  attesi.forEach(function (chiave) {
    assicura(presenti.indexOf(chiave) !== -1, 'campo mancante nello schema: ' + chiave);
  });
});

test('schema: nessuna coppia sezione/chiave duplicata', function () {
  var viste = {};
  schema.CAMPI.forEach(function (c) {
    var k = c.sezione + '.' + c.chiave;
    assicura(!viste[k], 'campo duplicato: ' + k);
    viste[k] = true;
  });
});

test('schema: nuovaBU produce una struttura completa', function () {
  var bu = schema.nuovaBU('Test');
  assicura(!!bu.id, 'manca id');
  assicuraUguale(bu.stato, 'idea');
  assicuraUguale(bu.decisione, null);
  schema.CAMPI.forEach(function (def) {
    assicura(bu.campi[def.sezione] && bu.campi[def.sezione][def.chiave], 'campo assente: ' + def.sezione + '.' + def.chiave);
  });
  assicuraUguale(bu.leve.length, 0);
  schema.RISULTATI.forEach(function (def) {
    assicuraUguale(bu.risultati[def.chiave], '');
  });
  schema.OUTPUT_CREATIVI.forEach(function (def) {
    assicura(bu.consegna[def.chiave], 'voce di consegna assente: ' + def.chiave);
    assicuraUguale(bu.consegna[def.chiave].selezionato, false);
    assicuraUguale(bu.consegna[def.chiave].nota, '');
  });
});

test('schema: OUTPUT_CREATIVI ha solo le categorie testi/design, nessuna chiave duplicata', function () {
  var chiavi = {};
  schema.OUTPUT_CREATIVI.forEach(function (def) {
    assicura(def.categoria === 'testi' || def.categoria === 'design', 'categoria non valida per "' + def.chiave + '": ' + def.categoria);
    assicura(!chiavi[def.chiave], 'chiave duplicata in OUTPUT_CREATIVI: ' + def.chiave);
    chiavi[def.chiave] = true;
  });
});

test('normalizzazione: consegna preserva selezionato/nota, scarta chiavi sconosciute e valori non validi', function () {
  var grezzo = {
    consegna: {
      claim: { selezionato: true, nota: 'Da fare entro venerdì' },
      logo: { selezionato: 'sì', nota: 42 }, // valori non validi: selezionato forzato a booleano, nota scartata
      chiave_inesistente: { selezionato: true, nota: 'ignorata' }
    }
  };
  var bu = schema.normalizzaBU(grezzo);
  assicuraUguale(bu.consegna.claim.selezionato, true);
  assicuraUguale(bu.consegna.claim.nota, 'Da fare entro venerdì');
  assicuraUguale(bu.consegna.logo.selezionato, true, 'una stringa truthy dovrebbe normalizzarsi a true');
  assicuraUguale(bu.consegna.logo.nota, '', 'un valore non stringa per nota dovrebbe ricadere sul default');
  assicura(!bu.consegna.chiave_inesistente, 'una chiave non in OUTPUT_CREATIVI non dovrebbe sopravvivere alla normalizzazione');
});

test('regola: i tre stati validi restano invariati', function () {
  ['ipotesi', 'generato_da_ia', 'mandatorio'].forEach(function (s) {
    var campo = { valore: 'x', stato: s };
    assicuraUguale(schema.statoEffettivoCampo(campo), s);
  });
});

test('regola: uno stato dello schema v1 (non più valido) ricade su ipotesi', function () {
  ['verificata', 'da_verificare', 'da_revisionare', 'qualcosa-di-inventato'].forEach(function (s) {
    var campo = { valore: 'x', stato: s };
    assicuraUguale(schema.statoEffettivoCampo(campo), 'ipotesi', 'stato non valido "' + s + '" non ricade su ipotesi');
  });
});

test('regola: il campo prova non esiste più — nuovoCampo non lo crea', function () {
  var campo = schema.nuovoCampo('testo');
  assicuraUguale(Object.prototype.hasOwnProperty.call(campo, 'prova'), false);
});

test('migrazione: una BU con schema precedente viene normalizzata senza perdite', function () {
  var vecchia = {
    id: 'bu-vecchia-1',
    nome: 'BU storica',
    stato: 'test_attivo',
    campi: {
      // "verificata" e "prova" appartengono allo schema v1: non esistono più.
      identita: { descrizione: { valore: 'Vecchia descrizione', stato: 'verificata', prova: 'fonte' } },
      mercato: { decisore: { valore: 'CFO' } },
      risorse: {
        // formato precedente: valore come stringa invece che array
        competenze_mancanti: { valore: 'Vendita\nMarketing', stato: 'ipotesi' },
        persone: { valore: 'Anna — vendite — clienti' }
      },
      test: {
        // formato precedente: durata come stringa semplice
        durata_test: { valore: '3 settimane' }
      }
    },
    leve: [
      { tipo: 'dolore', fatto_osservabile: 'x', come_lo_chiama_lui: 'y' }
      // campi mancanti: come_lo_chiami_tu, come_lo_elimini, id
    ],
    // materiali, risultati, decisione, noteDecisione assenti del tutto
    campoIgnoto: 'valore che non deve rompere nulla'
  };

  var bu = schema.normalizzaBU(vecchia);

  assicuraUguale(bu.id, 'bu-vecchia-1', 'id non preservato');
  assicuraUguale(bu.nome, 'BU storica', 'nome non preservato');
  assicuraUguale(bu.stato, 'test_attivo', 'stato non preservato');
  assicuraUguale(bu.campi.identita.descrizione.valore, 'Vecchia descrizione', 'valore del campo non preservato');
  assicuraUguale(bu.campi.identita.descrizione.stato, 'ipotesi', '"verificata" (schema v1) non ricade su "ipotesi"');
  assicuraUguale(Object.prototype.hasOwnProperty.call(bu.campi.identita.descrizione, 'prova'), false, 'il campo "prova" (schema v1) non doveva sopravvivere');
  assicuraUguale(bu.campi.mercato.decisore.valore, 'CFO');

  // campi non presenti nella BU vecchia devono comunque esistere con default
  assicura(!!bu.campi.offerta.prezzo, 'campo nuovo non popolato di default');
  assicuraUguale(bu.campi.offerta.prezzo.valore, '');

  // conversione stringa -> lista
  assicuraUguale(bu.campi.risorse.competenze_mancanti.valore.length, 2);
  assicuraUguale(bu.campi.risorse.competenze_mancanti.valore[0], 'Vendita');
  assicuraUguale(bu.campi.risorse.persone.valore[0], 'Anna — vendite — clienti');

  // conversione stringa -> oggetto durata
  assicuraUguale(bu.campi.test.durata_test.valore.testo, '3 settimane');
  assicuraUguale(bu.campi.test.durata_test.valore.dataFine, '');

  // leva incompleta viene completata, non scartata
  assicuraUguale(bu.leve.length, 1);
  assicuraUguale(bu.leve[0].tipo, undefined); // rimosso dallo schema: sostituito da identita.apertura
  assicuraUguale(bu.leve[0].fatto_osservabile, 'x');
  assicuraUguale(bu.leve[0].come_lo_chiama_lui, 'y');
  assicuraUguale(bu.leve[0].come_lo_chiami_tu, '');
  assicura(!!bu.leve[0].id, 'id leva non generato');

  // sezioni interamente assenti nella BU vecchia
  assicuraUguale(bu.materiali && typeof bu.materiali === 'object', true);
  assicuraUguale(Object.keys(bu.materiali).length, 0);
  assicuraUguale(bu.decisione, null);
  assicuraUguale(bu.noteDecisione.motivazione, '');
});

test('migrazione: dati completamente vuoti o non validi non lanciano eccezioni', function () {
  [undefined, null, {}, { campi: null }, { leve: 'non-un-array' }, { materiali: 'x' }].forEach(function (grezzo) {
    var bu = schema.normalizzaBU(grezzo);
    assicura(!!bu.id, 'id mancante dopo normalizzazione di input degenere');
    assicuraUguale(bu.leve.length, 0);
  });
});

// ---------------------------------------------------------------------
// Test: store
// ---------------------------------------------------------------------

test('store: salva e carica un elenco di business unit', function () {
  var ctx = creaContesto();
  var bu1 = ctx.BU.schema.nuovaBU('Prima');
  var bu2 = ctx.BU.schema.nuovaBU('Seconda');
  ctx.BU.store.salva([bu1, bu2]);
  var caricate = ctx.BU.store.carica();
  assicuraUguale(caricate.length, 2);
  assicuraUguale(caricate[0].nome, 'Prima');
  assicuraUguale(caricate[1].nome, 'Seconda');
});

test('store: carica restituisce elenco vuoto se non ci sono dati', function () {
  var ctx = creaContesto();
  assicuraUguale(ctx.BU.store.carica().length, 0);
});

test('store: esportaJSON/importaJSON fanno un giro completo senza perdite', function () {
  var ctx = creaContesto();
  var bu = creaBuCompilata(ctx);
  var testo = ctx.BU.store.esportaJSON([bu]);
  var importate = ctx.BU.store.importaJSON(testo);
  assicuraUguale(importate.length, 1);
  assicuraUguale(importate[0].id, bu.id);
  assicuraUguale(importate[0].campi.identita.descrizione.valore, bu.campi.identita.descrizione.valore);
});

test('store: importaJSON rifiuta JSON non valido con errore descrittivo', function () {
  var ctx = creaContesto();
  var lanciato = null;
  try {
    ctx.BU.store.importaJSON('{ non è json');
  } catch (e) {
    lanciato = e;
  }
  assicura(!!lanciato, 'doveva lanciare un errore');
});

// ---------------------------------------------------------------------
// Test: generatori
// ---------------------------------------------------------------------

test('generatori: sono registrati tutti e 16', function () {
  var ctx = creaContesto();
  assicuraUguale(ctx.BU.gen.elencaGeneratori().length, 16);
});

test('generatori: ogni id registrato è unico', function () {
  var ctx = creaContesto();
  var elenco = ctx.BU.gen.elencaGeneratori();
  assicura(elenco.length >= 1, 'nessun generatore registrato');
  var visti = {};
  elenco.forEach(function (g) {
    assicura(!visti[g.id], 'id generatore duplicato: ' + g.id);
    visti[g.id] = true;
    assicura(typeof g.genera === 'function', 'generatore senza funzione genera: ' + g.id);
  });
});

test('generatori: ogni campo in "richiede" esiste nello schema', function () {
  var ctx = creaContesto();
  ctx.BU.gen.elencaGeneratori().forEach(function (g) {
    g.richiede.forEach(function (rif) {
      var parti = rif.split('.');
      var def = ctx.BU.schema.trovaCampoDef(parti[0], parti[1]);
      assicura(!!def, 'generatore "' + g.id + '" richiede un campo inesistente: ' + rif);
    });
  });
});

test('generatori: con una BU compilata producono markdown senza "undefined" né "[MANCA:" residui', function () {
  var ctx = creaContesto();
  var bu = creaBuCompilata(ctx);
  ctx.BU.gen.elencaGeneratori().forEach(function (g) {
    var md = g.genera(bu);
    assicura(typeof md === 'string' && md.length > 0, 'generatore "' + g.id + '" non produce testo');
    assicura(md.indexOf('undefined') === -1, 'generatore "' + g.id + '" produce "undefined" con una BU compilata');
    assicura(md.indexOf('[MANCA:') === -1, 'generatore "' + g.id + '" lascia "[MANCA:" con una BU compilata');
  });
});

test('generatori: con una BU vuota non lanciano eccezioni e segnalano i buchi', function () {
  var ctx = creaContesto();
  var bu = ctx.BU.schema.nuovaBU('Vuota');
  ctx.BU.gen.elencaGeneratori().forEach(function (g) {
    var md;
    try {
      md = g.genera(bu);
    } catch (e) {
      throw new Error('generatore "' + g.id + '" lancia un\'eccezione con BU vuota: ' + e.message);
    }
    assicura(typeof md === 'string' && md.length > 0, 'generatore "' + g.id + '" non produce testo con BU vuota');
    assicura(md.indexOf('[MANCA:') !== -1 || md.indexOf('[DA SCRIVERE:') !== -1,
      'generatore "' + g.id + '" non segnala alcun buco con BU vuota');
  });
});

// ---------------------------------------------------------------------
// Contenuto generato
// I test sopra verificano la struttura. Questi verificano che le regole del
// modello restino visibili nell'output: se qualcuno rompe il ciclo sulle leve
// o riformula la CTA, la suite deve diventare rossa.
// ---------------------------------------------------------------------

function generaPerBuCompilata(idGeneratore) {
  var ctx = creaContesto();
  var bu = creaBuCompilata(ctx);
  var g = ctx.BU.gen.trovaGeneratore(idGeneratore);
  assicura(g, 'generatore "' + idGeneratore + '" non registrato');
  return { bu: bu, md: g.genera(bu) };
}

// Estrae il testo di una sezione markdown di secondo livello, fino alla successiva.
function sezione(md, intestazione) {
  var parti = md.split(intestazione);
  assicura(parti.length > 1, 'sezione "' + intestazione + '" assente dall\'output');
  return parti[1].split('\n## ')[0];
}

test('landing: un blocco della sezione problema per ogni leva', function () {
  var r = generaPerBuCompilata('landing');
  var blocchi = sezione(r.md, '## 2. Problema').match(/^### /gm) || [];
  assicuraUguale(blocchi.length, r.bu.leve.length,
    'blocchi problema (' + blocchi.length + ') diversi dal numero di leve (' + r.bu.leve.length + ')');
});

test('landing: una riga di tabella di contrasto per ogni leva', function () {
  var r = generaPerBuCompilata('landing');
  var testo = sezione(r.md, '## 3. Contrasto');
  // Righe della tabella meno intestazione e separatore.
  var righe = (testo.match(/^\|.*\|$/gm) || []).length - 2;
  assicuraUguale(righe, r.bu.leve.length,
    'righe di contrasto (' + righe + ') diverse dal numero di leve (' + r.bu.leve.length + ')');
});

test('landing: ogni leva compare nella tabella di contrasto con la propria soluzione', function () {
  var r = generaPerBuCompilata('landing');
  var testo = sezione(r.md, '## 3. Contrasto');
  r.bu.leve.forEach(function (leva, i) {
    assicura(testo.indexOf(leva.come_lo_elimini) !== -1,
      'la leva ' + (i + 1) + ' non porta il suo "come lo elimini" nella tabella di contrasto');
  });
});

test('landing: la CTA coincide con il campo azione_richiesta', function () {
  var r = generaPerBuCompilata('landing');
  var cta = r.bu.campi.test.azione_richiesta.valore;
  assicura(sezione(r.md, '## 1. Hero').indexOf(cta) !== -1,
    'la CTA nell\'hero non e\' il valore del campo azione_richiesta');
});

test('landing: la sezione prove resta sempre da scrivere a mano (mai dedotta dai campi)', function () {
  var r = generaPerBuCompilata('landing');
  var testo = sezione(r.md, '## 5. Prove');
  assicura(testo.indexOf('[DA SCRIVERE:') !== -1, 'la sezione prove dovrebbe restare esplicitamente da scrivere');
});

test('presentazione commerciale: la slide problema cambia in base alle leve', function () {
  var r = generaPerBuCompilata('presentazione-commerciale');
  var slide = sezione(r.md, '## Slide 2 — Il problema');
  r.bu.leve.forEach(function (leva, i) {
    assicura(slide.indexOf(leva.fatto_osservabile) !== -1,
      'la leva ' + (i + 1) + ' non compare nella slide problema');
  });
});

test('criteri di continuazione o chiusura: nomina entrambe le soglie e distingue quella che autorizza a costruire', function () {
  var r = generaPerBuCompilata('criteri-decisione');
  assicura(/segnale di messaggio/i.test(r.md), 'manca il segnale di messaggio');
  assicura(/segnale di mercato/i.test(r.md), 'manca il segnale di mercato');
  assicura(/autorizza a costruire/i.test(r.md),
    'il documento non dice quale soglia autorizza a costruire');
});

test('bu one-page: una BU vuota elenca tutti i campi critici tra le condizioni di stop', function () {
  var ctx = creaContesto();
  var bu = ctx.BU.schema.nuovaBU('Vuota');
  var md = ctx.BU.gen.trovaGeneratore('bu-one-page').genera(bu);
  var stop = md.split(/## Cosa fermerebbe[^\n]*/)[1];
  assicura(stop, 'la scheda non contiene la sezione "cosa fermerebbe"');
  var critici = ctx.BU.schema.CAMPI.filter(function (d) { return d.critico; });
  critici.forEach(function (d) {
    assicura(stop.indexOf(d.etichetta) !== -1,
      'campo critico "' + d.etichetta + '" assente dalle condizioni di stop');
  });
});

test('offerta pilota: mette a confronto servizio e prezzo standard con quelli del pilota', function () {
  var r = generaPerBuCompilata('offerta-pilota');
  assicura(r.md.indexOf(r.bu.campi.offerta.servizio.valore) !== -1, 'manca il servizio standard');
  assicura(r.md.indexOf(r.bu.campi.pilota.servizio_pilota.valore) !== -1, 'manca il servizio del pilota');
  assicura(r.md.indexOf(r.bu.campi.offerta.prezzo.valore) !== -1, 'manca il prezzo standard');
  assicura(r.md.indexOf(r.bu.campi.pilota.prezzo_pilota.valore) !== -1, 'manca il prezzo del pilota');
});

test('criteri di ricerca prospect: non genera nomi di aziende o persone, solo criteri', function () {
  var r = generaPerBuCompilata('criteri-prospect');
  assicura(/non deve mai inventare aziende o persone/i.test(r.md),
    'manca l\'avviso esplicito contro l\'invenzione di dati');
  assicura(/50 nominativi/i.test(r.md), 'non menziona l\'obiettivo dei 50 nominativi');
});

test('dashboard KPI: riflette i valori inseriti in risultati, non solo la struttura', function () {
  var ctx = creaContesto();
  var bu = creaBuCompilata(ctx);
  bu.risultati.vendite = '3';
  bu.risultati.conversazioni_al_prezzo = '7';
  var md = ctx.BU.gen.trovaGeneratore('dashboard-kpi').genera(bu);
  assicura(md.indexOf('3') !== -1 && md.indexOf('7') !== -1,
    'la dashboard non riporta i valori attuali di risultati');
});

test('pipeline commerciale: la soglia di mercato compare come fase della pipeline', function () {
  var r = generaPerBuCompilata('pipeline-commerciale');
  assicura(r.md.indexOf(r.bu.campi.test.soglia_mercato.valore) !== -1,
    'la soglia di mercato non compare nella pipeline');
});

test('apertura: cambiare "da dove apriamo" cambia davvero landing e presentazione', function () {
  var ctx = creaContesto();
  var bu = creaBuCompilata(ctx);
  var land = ctx.BU.gen.trovaGeneratore('landing');
  var pres = ctx.BU.gen.trovaGeneratore('presentazione-commerciale');

  bu.campi.identita.apertura.valore = 'perdita';
  var landA = land.genera(bu), presA = pres.genera(bu);
  bu.campi.identita.apertura.valore = 'risultato';
  var landB = land.genera(bu), presB = pres.genera(bu);

  assicura(landA !== landB, 'la landing non cambia al variare dell\'apertura: il campo sarebbe decorativo');
  assicura(presA !== presB, 'la presentazione commerciale non cambia al variare dell\'apertura');
});

test('apertura: dal risultato i blocchi problema aprono con la soluzione', function () {
  var ctx = creaContesto();
  var bu = creaBuCompilata(ctx);
  bu.campi.identita.apertura.valore = 'risultato';
  var md = ctx.BU.gen.trovaGeneratore('landing').genera(bu);
  var problema = sezione(md, '## 2. Problema');
  bu.leve.forEach(function (leva, i) {
    assicura(problema.indexOf('### ' + leva.come_lo_elimini) !== -1,
      'il blocco ' + (i + 1) + ' non apre con "come lo elimini" pur avendo apertura dal risultato');
  });
});

test('apertura: non decisa, il materiale lo dichiara invece di nasconderlo', function () {
  var ctx = creaContesto();
  var bu = creaBuCompilata(ctx);
  bu.campi.identita.apertura.valore = '';
  var md = ctx.BU.gen.trovaGeneratore('landing').genera(bu);
  assicura(/non . stato compilato/i.test(md) || md.indexOf('non è stato compilato') !== -1,
    'con apertura vuota la landing non segnala di aver assunto un default');
});

test('swot: forze e debolezze vengono dai dati, non sono inventate', function () {
  var r = generaPerBuCompilata('swot');
  var forze = sezione(r.md, '## Forze');
  var debolezze = sezione(r.md, '## Debolezze');
  r.bu.campi.risorse.competenze_presenti.valore.forEach(function (c) {
    assicura(forze.indexOf(c) !== -1, 'competenza presente "' + c + '" assente dalle Forze');
  });
  r.bu.campi.risorse.competenze_mancanti.valore.forEach(function (c) {
    assicura(debolezze.indexOf(c) !== -1, 'competenza mancante "' + c + '" assente dalle Debolezze');
  });
});

test('swot: minacce include la differenziazione competitiva, non solo l\'alternativa attuale', function () {
  var r = generaPerBuCompilata('swot');
  var minacce = sezione(r.md, '## Minacce');
  assicura(minacce.indexOf(r.bu.campi.mercato.alternativa_attuale.valore) !== -1, 'manca alternativa attuale nelle minacce');
  assicura(minacce.indexOf(r.bu.campi.mercato.differenziazione_competitiva.valore) !== -1,
    'manca differenziazione competitiva nelle minacce');
});

test('swot: opportunità e minacce segnalano esplicitamente cosa resta da scrivere', function () {
  var r = generaPerBuCompilata('swot');
  var opportunita = sezione(r.md, '## Opportunità');
  var minacce = sezione(r.md, '## Minacce');
  assicura(opportunita.indexOf('[DA SCRIVERE:') !== -1, 'le opportunità non segnalano la parte che richiede giudizio');
  assicura(minacce.indexOf('[DA SCRIVERE:') !== -1, 'le minacce non segnalano la parte che richiede giudizio');
});

test('stato campo nel markdown: un materiale interno annota ipotesi/generato da IA/mandatorio con icona', function () {
  var r = generaPerBuCompilata('bu-one-page');
  // descrizione è mandatorio, alternativa_attuale è generato_da_ia nella fixture.
  assicura(r.md.indexOf('`🔒 Mandatorio`') !== -1, 'nessuna annotazione "🔒 Mandatorio" nel materiale');
  var sezionePerChi = sezione(r.md, '## Per chi');
  assicura(sezionePerChi.indexOf('`🤖 Generato da IA`') !== -1, 'l\'alternativa attuale (generato_da_ia) non è annotata nel materiale');
  assicura(r.md.indexOf('Stato dei dati: 💭 Ipotesi · 🤖 Generato da IA · 🔒 Mandatorio') !== -1,
    'manca la legenda delle icone di stato in testa al materiale');
});

test('stato campo nel markdown: i materiali esterni (landing) non annotano lo stato interno', function () {
  var r = generaPerBuCompilata('landing');
  assicura(r.md.indexOf('🔒 Mandatorio') === -1, 'la landing non dovrebbe esporre annotazioni di stato interno');
  assicura(r.md.indexOf('🤖 Generato da IA') === -1, 'la landing non dovrebbe esporre annotazioni di stato interno');
});

test('problem statement: "cosa è già mandatorio" elenca solo i campi mandatori, col loro valore', function () {
  var r = generaPerBuCompilata('problem-statement');
  var sezioneMandatori = sezione(r.md, '## Cosa è già mandatorio');
  assicura(sezioneMandatori.indexOf(r.bu.campi.identita.descrizione.valore) !== -1,
    'la descrizione (mandatoria nella fixture) non compare tra i dati consolidati');
  assicura(sezioneMandatori.indexOf(r.bu.campi.offerta.servizio.valore) === -1,
    'il servizio (ipotesi nella fixture, non mandatorio) non dovrebbe comparire tra i dati consolidati');
});

test('dimensionamento: mette insieme prezzo/costo/capacità/mercato senza inventare un ricavo', function () {
  var r = generaPerBuCompilata('dimensionamento');
  assicura(r.md.indexOf(r.bu.campi.offerta.prezzo.valore) !== -1, 'manca il prezzo');
  assicura(r.md.indexOf(r.bu.campi.economia.costo_erogazione.valore) !== -1, 'manca il costo di erogazione');
  assicura(r.md.indexOf(r.bu.campi.economia.capacita_erogazione.valore) !== -1, 'manca la capacità di erogazione');
  assicura(r.md.indexOf(r.bu.campi.economia.dimensione_mercato.valore) !== -1, 'manca la dimensione del mercato');
  assicura(r.md.indexOf('[DA SCRIVERE:') !== -1, 'il ricavo potenziale dovrebbe restare da scrivere a mano, non inventato');
});

test('swot: forze includono la sinergia con altre BU, minacce i concorrenti diretti, opportunità la dimensione del mercato', function () {
  var r = generaPerBuCompilata('swot');
  var forzeSez = sezione(r.md, '## Forze');
  assicura(forzeSez.indexOf(r.bu.campi.mercato.sinergia_altre_bu.valore) !== -1, 'manca la sinergia con altre BU tra le forze');
  var minacceSez = sezione(r.md, '## Minacce');
  assicura(minacceSez.indexOf(r.bu.campi.mercato.concorrenti_diretti.valore[0]) !== -1, 'mancano i concorrenti diretti tra le minacce');
  var opportunitaSez = sezione(r.md, '## Opportunità');
  assicura(opportunitaSez.indexOf(r.bu.campi.economia.dimensione_mercato.valore) !== -1, 'manca la dimensione del mercato tra le opportunità');
});

test('bu one-page: include responsabile, dimensione del mercato, costo e capacità di erogazione', function () {
  var r = generaPerBuCompilata('bu-one-page');
  assicura(r.md.indexOf(r.bu.campi.identita.responsabile.valore) !== -1, 'manca il responsabile della BU');
  assicura(r.md.indexOf(r.bu.campi.economia.dimensione_mercato.valore) !== -1, 'manca la dimensione del mercato');
  var economia = sezione(r.md, '## Economia');
  assicura(economia.indexOf(r.bu.campi.economia.costo_erogazione.valore) !== -1, 'manca il costo di erogazione nella sezione Economia');
  assicura(economia.indexOf(r.bu.campi.economia.capacita_erogazione.valore) !== -1, 'manca la capacità di erogazione nella sezione Economia');
});

test('leve: il campo tipo dello schema v1 non sopravvive alla normalizzazione', function () {
  var ctx = creaContesto();
  var bu = ctx.BU.schema.normalizzaBU({
    nome: 'Vecchia', leve: [{ tipo: 'obiettivo', fatto_osservabile: 'x' }]
  });
  assicura(bu.leve[0].tipo === undefined, 'il campo tipo è ancora presente sulle leve');
  assicuraUguale(bu.leve[0].fatto_osservabile, 'x', 'la normalizzazione ha perso il contenuto della leva');
});

// ---------------------------------------------------------------------
// Test: renderer Markdown → HTML (src/markdown.js) e documento completo
// (BU.render.documentoCompleto, usato dalla vista DOCUMENTO)
// ---------------------------------------------------------------------

test('markdown: titoli, grassetto, corsivo, codice inline', function () {
  var ctx = creaContesto();
  var html = ctx.BU.markdown.renderizza('# Titolo\n\n## Sotto\n\nTesto **grosso** e _corsivo_ e `codice`.');
  assicura(html.indexOf('<h1>Titolo</h1>') !== -1, 'manca il titolo h1');
  assicura(html.indexOf('<h2>Sotto</h2>') !== -1, 'manca il sottotitolo h2');
  assicura(html.indexOf('<strong>grosso</strong>') !== -1, 'il grassetto non è stato interpretato');
  assicura(html.indexOf('<em>corsivo</em>') !== -1, 'il corsivo non è stato interpretato');
  assicura(html.indexOf('<code>codice</code>') !== -1, 'il codice inline non è stato interpretato');
});

test('markdown: elenco puntato ed elenco numerato con continuazione rientrata', function () {
  var ctx = creaContesto();
  var html = ctx.BU.markdown.renderizza('- uno\n- due');
  assicura(html.indexOf('<ul><li>uno</li><li>due</li></ul>') !== -1, 'elenco puntato non renderizzato correttamente: ' + html);

  var htmlOrdinato = ctx.BU.markdown.renderizza('1. primo\n   dettaglio del primo\n2. secondo');
  assicura(htmlOrdinato.indexOf('<ol>') !== -1, 'elenco numerato non aperto');
  assicura(htmlOrdinato.indexOf('primo<br>dettaglio del primo') !== -1,
    'la riga rientrata non è stata unita alla voce precedente come continuazione: ' + htmlOrdinato);
});

test('markdown: tabella con celle contenenti pipe escapati', function () {
  var ctx = creaContesto();
  var md = ctx.BU.render.tabella(['A', 'B'], [['x', 'y'], ['1 | 2', 'z']]);
  var html = ctx.BU.markdown.renderizza(md);
  assicura(html.indexOf('<table>') !== -1, 'la tabella non è stata renderizzata');
  assicura(html.indexOf('<th>A</th>') !== -1, 'intestazione di tabella mancante');
  assicura(html.indexOf('<td>1 | 2</td>') !== -1, 'il pipe escapato nella cella non è stato ripristinato: ' + html);
});

test('markdown: blocco di codice (```) non interpreta la formattazione al suo interno', function () {
  var ctx = creaContesto();
  var html = ctx.BU.markdown.renderizza('```\nRiga con **non grassetto** e `non codice`.\n```');
  assicura(html.indexOf('<pre><code>') !== -1, 'il blocco di codice non è stato aperto');
  assicura(html.indexOf('**non grassetto**') !== -1, 'il blocco di codice ha interpretato il markdown al suo interno: ' + html);
});

test('markdown: caratteri HTML nei valori dei campi vengono escapati, mai eseguiti', function () {
  var ctx = creaContesto();
  var html = ctx.BU.markdown.renderizza('Prezzo < 100€ & altre condizioni.');
  assicura(html.indexOf('&lt;') !== -1 && html.indexOf('&amp;') !== -1, 'HTML non escapato: rischio di markup non voluto nel testo: ' + html);
});

test('documento completo: BU.render.documentoCompleto concatena tutti i generatori con un titolo per BU', function () {
  var ctx = creaContesto();
  var bu = creaBuCompilata(ctx);
  var md = ctx.BU.render.documentoCompleto(bu);
  assicura(md.indexOf('# ' + bu.nome + ' — Materiali') !== -1, 'manca il titolo del documento');
  ctx.BU.gen.elencaGeneratori().forEach(function (g) {
    assicura(md.indexOf('<!-- Generatore: ' + g.nome) !== -1, 'manca il separatore per il generatore "' + g.nome + '"');
  });
  var html = ctx.BU.markdown.renderizza(md);
  assicura(html.indexOf('<!-- Generatore:') !== -1, 'i commenti HTML dei separatori dovrebbero passare invariati nell\'output renderizzato');
});

// ---------------------------------------------------------------------
// Test: cartella condivisa su GitHub (src/cartella.js), con un mock
// minimale di fetch — nessuna rete vera: simula le risposte dell'API
// contenuti di GitHub (elenco cartella, lettura raw, PUT, DELETE) contro
// un repository finto in memoria.
// ---------------------------------------------------------------------

function rispostaJson(status, corpo) {
  return {
    ok: status >= 200 && status < 300,
    status: status,
    statusText: String(status),
    json: function () { return Promise.resolve(corpo); },
    text: function () { return Promise.resolve(JSON.stringify(corpo)); }
  };
}

function rispostaTesto(status, testo) {
  return {
    ok: status >= 200 && status < 300,
    status: status,
    statusText: String(status),
    json: function () { return Promise.resolve({}); },
    text: function () { return Promise.resolve(testo); }
  };
}

// repoFinto: { 'BU/nome.json': 'testo del file', ... }. Simula solo le
// forme di richiesta usate da cartella.js, non l'intera API di GitHub —
// incluso il conflitto 409 quando lo sha inviato in scrittura non è più
// quello corrente (qualcun altro ha scritto lo stesso file nel frattempo).
function creaFetchFinto(repoFinto) {
  var contatoreSha = 0;
  var shaCorrente = {}; // percorso -> sha attuale del file nel repo finto

  function shaPer(percorso, nomeFile) {
    if (!(percorso in shaCorrente)) shaCorrente[percorso] = 'sha-' + nomeFile;
    return shaCorrente[percorso];
  }

  return function (url, opzioni) {
    opzioni = opzioni || {};
    var metodo = opzioni.method || 'GET';

    if (metodo === 'GET' && /\/contents\/BU$/.test(url)) {
      var percorsi = Object.keys(repoFinto).filter(function (p) { return p.indexOf('BU/') === 0; });
      if (!percorsi.length) return Promise.resolve(rispostaJson(404, { message: 'Not Found' }));
      var voci = percorsi.map(function (percorso) {
        var nomeFile = percorso.slice(3);
        return { type: 'file', name: nomeFile, path: percorso, sha: shaPer(percorso, nomeFile), download_url: 'https://raw.test/' + percorso };
      });
      return Promise.resolve(rispostaJson(200, voci));
    }

    if (metodo === 'GET' && url.indexOf('https://raw.test/') === 0) {
      var percorsoLettura = url.slice('https://raw.test/'.length);
      if (!(percorsoLettura in repoFinto)) return Promise.resolve(rispostaTesto(404, ''));
      return Promise.resolve(rispostaTesto(200, repoFinto[percorsoLettura]));
    }

    if (metodo === 'PUT') {
      var corpoPut = JSON.parse(opzioni.body);
      var percorsoPut = url.split('/contents/')[1];
      var nomeFilePut = percorsoPut.slice(3);
      if (percorsoPut in repoFinto && corpoPut.sha !== shaPer(percorsoPut, nomeFilePut)) {
        return Promise.resolve(rispostaJson(409, { message: percorsoPut + ' does not match ' + shaCorrente[percorsoPut] }));
      }
      var binarioPut = Buffer.from(corpoPut.content, 'base64');
      repoFinto[percorsoPut] = binarioPut.toString('utf8');
      contatoreSha += 1;
      var nuovoSha = 'sha-' + nomeFilePut + '-v' + contatoreSha;
      shaCorrente[percorsoPut] = nuovoSha;
      return Promise.resolve(rispostaJson(200, {
        content: { path: percorsoPut, sha: nuovoSha, download_url: 'https://raw.test/' + percorsoPut }
      }));
    }

    if (metodo === 'DELETE') {
      var corpoDel = JSON.parse(opzioni.body);
      var percorsoDel = url.split('/contents/')[1];
      if (!corpoDel.sha) return Promise.resolve(rispostaJson(422, { message: 'sha mancante' }));
      delete repoFinto[percorsoDel];
      delete shaCorrente[percorsoDel];
      return Promise.resolve(rispostaJson(200, {}));
    }

    return Promise.reject(new Error('URL non gestito dal fetch finto: ' + metodo + ' ' + url));
  };
}

function creaContestoConFetch(repoFinto) {
  var ctx = creaContesto();
  ctx.fetch = creaFetchFinto(repoFinto || {});
  return ctx;
}

test('cartella: supportata() segue la presenza di fetch', function () {
  var ctx = creaContesto();
  assicuraUguale(ctx.BU.cartella.supportata(), false, 'senza fetch dovrebbe essere false');
  ctx.fetch = function () {};
  assicuraUguale(ctx.BU.cartella.supportata(), true, 'con fetch dovrebbe essere true');
});

test('cartella: nomeFileDa produce uno slug sicuro con suffisso dall\'id', function () {
  var ctx = creaContesto();
  var bu = ctx.BU.schema.nuovaBU('Prova! Con Spazi & Simboli');
  var nome = ctx.BU.cartella.nomeFileDa(bu);
  assicura(/^[a-z0-9-]+\.json$/.test(nome), 'nome file non sicuro: ' + nome);
  var suffissoAtteso = String(bu.id).toLowerCase().replace(/[^a-z0-9]/g, '').slice(-8);
  assicura(nome.indexOf(suffissoAtteso) !== -1, 'il nome file non include il suffisso dell\'id');
});

test('cartella: token — assente di default, salvato/rimosso tramite localStorage', function () {
  var ctx = creaContesto();
  assicuraUguale(ctx.BU.cartella.haToken(), false);
  ctx.BU.cartella.salvaToken('ghp_finto123');
  assicuraUguale(ctx.BU.cartella.haToken(), true);
  assicuraUguale(ctx.BU.cartella.leggiToken(), 'ghp_finto123');
  ctx.BU.cartella.rimuoviToken();
  assicuraUguale(ctx.BU.cartella.haToken(), false);
});

test('cartella: elencaFile trova solo i .json dentro BU/ e ignora il resto', function () {
  var ctx = creaContestoConFetch({ 'BU/a.json': '{}', 'BU/b.json': '{}', 'altro/c.json': '{}' });
  return ctx.BU.cartella.elencaFile().then(function (voci) {
    var nomi = voci.map(function (v) { return v.nomeFile; }).sort();
    assicuraUguale(nomi.length, 2, 'dovrebbe trovare solo i due dentro BU/');
    assicuraUguale(nomi[0], 'a.json');
    assicuraUguale(nomi[1], 'b.json');
  });
});

test('cartella: elencaFile su cartella inesistente (404) restituisce un elenco vuoto, non un errore', function () {
  var ctx = creaContestoConFetch({});
  return ctx.BU.cartella.elencaFile().then(function (voci) {
    assicuraUguale(voci.length, 0);
  });
});

test('cartella: scrivi poi leggi la stessa BU, andata e ritorno senza perdite (incluso UTF-8)', function () {
  var ctx = creaContestoConFetch({});
  var bu = creaBuCompilata(ctx);
  bu.campi.identita.descrizione.valore = 'Città più efficienti, però più costose: è così.';
  return ctx.BU.cartella.creaFileBU(bu).then(function (voce) {
    return ctx.BU.cartella.leggiBU(voce);
  }).then(function (riletta) {
    assicuraUguale(riletta.id, bu.id);
    assicuraUguale(riletta.campi.identita.descrizione.valore, bu.campi.identita.descrizione.valore,
      'i caratteri accentati non sono sopravvissuti al giro base64');
    assicuraUguale(riletta.leve.length, bu.leve.length);
  });
});

test('cartella: creaFileBU usa nomeFileDa e il file è subito rileggibile', function () {
  var ctx = creaContestoConFetch({});
  var bu = ctx.BU.schema.nuovaBU('Nuova dalla cartella');
  return ctx.BU.cartella.creaFileBU(bu).then(function (voce) {
    assicuraUguale(voce.nomeFile, ctx.BU.cartella.nomeFileDa(bu));
    assicura(!!voce.sha, 'la voce restituita non ha lo sha');
    return ctx.BU.cartella.leggiBU(voce);
  }).then(function (riletta) {
    assicuraUguale(riletta.nome, 'Nuova dalla cartella');
  });
});

test('cartella: scriviBU su un file esistente aggiorna lo sha (necessario per il salvataggio successivo)', function () {
  var ctx = creaContestoConFetch({});
  var bu = ctx.BU.schema.nuovaBU('Da aggiornare');
  return ctx.BU.cartella.creaFileBU(bu).then(function (voce1) {
    bu.nome = 'Nome aggiornato';
    return ctx.BU.cartella.scriviBU(voce1, bu).then(function (voce2) {
      assicura(voce2.sha !== voce1.sha, 'lo sha dovrebbe cambiare dopo una scrittura');
      return ctx.BU.cartella.leggiBU(voce2);
    });
  }).then(function (riletta) {
    assicuraUguale(riletta.nome, 'Nome aggiornato');
  });
});

test('cartella: scrivere con uno sha ormai superato dà un errore di conflitto comprensibile (409)', function () {
  var ctx = creaContestoConFetch({});
  var bu = ctx.BU.schema.nuovaBU('Conteso');
  return ctx.BU.cartella.creaFileBU(bu).then(function (voceIniziale) {
    // Un'altra scrittura (un altro utente, un'altra scheda) aggiorna il file nel frattempo...
    return ctx.BU.cartella.scriviBU(voceIniziale, bu).then(function () {
      // ...e chi ha ancora la voce con lo sha vecchio prova a scrivere: conflitto.
      return ctx.BU.cartella.scriviBU(voceIniziale, bu).then(function () {
        assicura(false, 'la scrittura con sha superato avrebbe dovuto fallire con un conflitto');
      }, function (e) {
        assicura(e.message.indexOf('nel frattempo') !== -1 && e.message.indexOf('Aggiorna da GitHub') !== -1,
          'il messaggio di conflitto non spiega cosa fare: ' + e.message);
      });
    });
  });
});

test('cartella: eliminaFile rimuove il file dal repository finto', function () {
  var ctx = creaContestoConFetch({});
  var bu = ctx.BU.schema.nuovaBU('Da eliminare');
  return ctx.BU.cartella.creaFileBU(bu).then(function (voce) {
    return ctx.BU.cartella.eliminaFile(voce);
  }).then(function () {
    return ctx.BU.cartella.elencaFile();
  }).then(function (voci) {
    assicuraUguale(voci.length, 0, 'il file avrebbe dovuto essere rimosso');
  });
});

// ---------------------------------------------------------------------
// Riepilogo — aspetta che tutti i test asincroni si siano risolti prima
// di stampare (i test sincroni hanno già l'esito pronto).
// ---------------------------------------------------------------------

Promise.all(promesseInSospeso).then(function () {
  var falliti = esiti.filter(function (e) { return !e.ok; });

  esiti.forEach(function (e) {
    console.log((e.ok ? 'OK   ' : 'FAIL ') + e.nome);
    if (!e.ok) console.log('     ' + e.errore.split('\n').join('\n     '));
  });

  console.log('');
  console.log(esiti.length + ' test, ' + falliti.length + ' falliti');

  if (falliti.length > 0) {
    process.exitCode = 1;
  }
});
