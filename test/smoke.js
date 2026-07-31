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

var FILE_SORGENTE = ['src/schema.js', 'src/store.js', 'src/render.js'].concat(elencaFileGeneratori());

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

function test(nome, fn) {
  try {
    fn();
    esiti.push({ nome: nome, ok: true });
  } catch (e) {
    esiti.push({ nome: nome, ok: false, errore: e && e.stack ? e.stack : String(e) });
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

  function imposta(sezione, chiave, valore, stato, prova) {
    var campo = bu.campi[sezione][chiave];
    campo.valore = valore;
    campo.stato = stato || 'ipotesi';
    campo.prova = prova || '';
  }

  imposta('identita', 'descrizione', 'Produciamo ricambi meccanici su misura per linee di imballaggio ferme.', 'verificata', 'Interviste con 5 responsabili manutenzione.');
  imposta('identita', 'meccanismo', 'Inseriamo un tecnico in stabilimento che rileva la quota e consegna il pezzo entro 48 ore.', 'ipotesi');

  imposta('mercato', 'cliente_ideale', 'PMI manifatturiere 50-200 dipendenti con linee automatizzate.', 'verificata', 'Elenco 40 aziende contattate.');
  imposta('mercato', 'decisore', 'Responsabile di manutenzione.', 'ipotesi');
  imposta('mercato', 'contesto_decisore', 'Ha una linea ferma e un fornitore che risponde in due settimane.', 'ipotesi');
  imposta('mercato', 'alternativa_attuale', 'Aspettano il ricambio originale dal produttore della macchina.', 'da_verificare');

  imposta('offerta', 'servizio', 'Rilievo, disegno CAD e produzione del pezzo di ricambio.', 'ipotesi');
  imposta('offerta', 'unita_vendita', 'Un pezzo di ricambio urgente.', 'ipotesi');
  imposta('offerta', 'risultato_promesso', 'Linea riavviata entro 48 ore invece di due settimane.', 'verificata', 'Tre casi cronometrati.');
  imposta('offerta', 'escluso', 'Manutenzione ordinaria e assistenza da remoto.', 'ipotesi');
  imposta('offerta', 'prezzo', '800-1500 euro a pezzo.', 'da_revisionare');
  imposta('offerta', 'modalita_vendita', 'Preventivo telefonico, conferma via email.', 'ipotesi');
  imposta('offerta', 'tempi', '48 ore dalla conferma.', 'ipotesi');

  imposta('risorse', 'competenze_presenti', ['Disegno CAD', 'Tornitura CNC'], 'ipotesi');
  imposta('risorse', 'competenze_mancanti', ['Logistica urgente su tutto il territorio'], 'ipotesi');
  imposta('risorse', 'persone', ['Marco — tecnico rilievo — visite in stabilimento'], 'ipotesi');

  imposta('test', 'canale_test', 'LinkedIn Ads', 'ipotesi');
  imposta('test', 'budget_test', '600 euro', 'ipotesi');
  bu.campi.test.durata_test.valore = { testo: '4 settimane', dataFine: '2026-09-01' };
  imposta('test', 'azione_richiesta', 'Prenota una diagnosi gratuita della linea.', 'ipotesi');
  imposta('test', 'soglia_messaggio', '20 contatti, 30% di compilazione modulo.', 'ipotesi');
  imposta('test', 'soglia_mercato', 'Almeno 5 conversazioni arrivate al prezzo.', 'ipotesi');

  bu.leve = [
    Object.assign(schema.nuovaLeva(), {
      tipo: 'dolore',
      fatto_osservabile: 'La linea si ferma e resta ferma per giorni.',
      come_lo_chiama_lui: 'Non troviamo il pezzo in tempo.',
      come_lo_chiami_tu: 'Assenza di un fornitore di ricambi a risposta rapida.',
      come_lo_elimini: 'Rileviamo e produciamo il pezzo entro 48 ore.'
    }),
    Object.assign(schema.nuovaLeva(), {
      tipo: 'dolore',
      fatto_osservabile: 'Il fornitore originale ha tempi di due settimane.',
      come_lo_chiama_lui: 'Ci tengono in ostaggio.',
      come_lo_chiami_tu: 'Dipendenza da un unico fornitore con lead time lungo.',
      come_lo_elimini: 'Offriamo un canale alternativo qualificato in 48 ore.'
    }),
    Object.assign(schema.nuovaLeva(), {
      tipo: 'obiettivo',
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
});

test('regola: verificata senza prova ricade in da_verificare', function () {
  var campo = { valore: 'x', stato: 'verificata', prova: '' };
  assicuraUguale(schema.statoEffettivoCampo(campo), 'da_verificare');
  campo.prova = '   ';
  assicuraUguale(schema.statoEffettivoCampo(campo), 'da_verificare');
  campo.prova = 'fonte solida';
  assicuraUguale(schema.statoEffettivoCampo(campo), 'verificata');
});

test('regola: stati diversi da verificata restano invariati', function () {
  ['ipotesi', 'da_verificare', 'da_revisionare'].forEach(function (s) {
    var campo = { valore: 'x', stato: s, prova: '' };
    assicuraUguale(schema.statoEffettivoCampo(campo), s);
  });
});

test('migrazione: una BU con schema precedente viene normalizzata senza perdite', function () {
  var vecchia = {
    id: 'bu-vecchia-1',
    nome: 'BU storica',
    stato: 'test_attivo',
    campi: {
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
  assicuraUguale(bu.campi.identita.descrizione.valore, 'Vecchia descrizione');
  assicuraUguale(bu.campi.identita.descrizione.stato, 'verificata');
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
  assicuraUguale(bu.leve[0].tipo, 'dolore');
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

test('generatori: sono registrati tutti e 5', function () {
  var ctx = creaContesto();
  assicuraUguale(ctx.BU.gen.elencaGeneratori().length, 5);
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
// Riepilogo
// ---------------------------------------------------------------------

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
