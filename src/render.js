/*
 * render.js
 * Helper condivisi dai generatori: escaping, tabelle markdown, segnaposto
 * per dati mancanti o da scrivere a mano.
 *
 * Namespace globale: window.BU.render
 */
(function (global) {
  'use strict';

  var BU = global.BU = global.BU || {};

  // ---------------------------------------------------------------------
  // Segnaposto (regola 2: mai saltare un buco in silenzio)
  // ---------------------------------------------------------------------

  function manca(etichetta) {
    return '[MANCA: ' + etichetta + ']';
  }

  function daScrivere(cosa) {
    return '[DA SCRIVERE: ' + cosa + ']';
  }

  // ---------------------------------------------------------------------
  // Escaping e tabelle markdown
  // ---------------------------------------------------------------------

  function escapeCella(testo) {
    testo = (testo === null || testo === undefined) ? '' : String(testo);
    return testo.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
  }

  function tabella(intestazioni, righe) {
    var out = [];
    out.push('| ' + intestazioni.join(' | ') + ' |');
    out.push('| ' + intestazioni.map(function () { return '---'; }).join(' | ') + ' |');
    righe.forEach(function (riga) {
      out.push('| ' + riga.map(escapeCella).join(' | ') + ' |');
    });
    return out.join('\n');
  }

  function elencoPuntato(righe) {
    var pulite = righe.filter(function (r) { return r !== null && r !== undefined && String(r).trim(); });
    if (!pulite.length) return null;
    return pulite.map(function (r) { return '- ' + String(r).trim(); }).join('\n');
  }

  // ---------------------------------------------------------------------
  // Lettura campi con segnaposto automatico
  // ---------------------------------------------------------------------

  // Restituisce il testo del campo, o [MANCA: ...] se vuoto.
  function testoCampo(bu, sezione, chiave) {
    var def = BU.schema.trovaCampoDef(sezione, chiave);
    if (!def) return manca(sezione + '.' + chiave);
    var campo = BU.schema.ottieniCampo(bu, sezione, chiave);
    if (!BU.schema.campoHaValore(campo, def.tipo)) return manca(def.etichetta);

    if (def.tipo === 'lista') {
      return campo.valore.filter(function (r) { return r && r.trim(); }).join('; ');
    }
    if (def.tipo === 'durata') {
      var parti = [];
      if (campo.valore.testo && campo.valore.testo.trim()) parti.push(campo.valore.testo.trim());
      if (campo.valore.dataFine && campo.valore.dataFine.trim()) parti.push('fine: ' + campo.valore.dataFine.trim());
      return parti.join(', ');
    }
    return campo.valore;
  }

  // Restituisce le righe non vuote di un campo lista, o null se vuoto.
  function righeLista(bu, sezione, chiave) {
    var campo = BU.schema.ottieniCampo(bu, sezione, chiave);
    if (!campo || !Array.isArray(campo.valore)) return null;
    var righe = campo.valore.filter(function (r) { return r && r.trim(); });
    return righe.length ? righe : null;
  }

  // Restituisce un campo lista come elenco puntato markdown, o [MANCA: ...].
  function listaMarkdown(bu, sezione, chiave) {
    var def = BU.schema.trovaCampoDef(sezione, chiave);
    var righe = righeLista(bu, sezione, chiave);
    if (!righe) return manca(def ? def.etichetta : sezione + '.' + chiave);
    return elencoPuntato(righe);
  }

  function etichettaStatoCampo(campo) {
    var stato = BU.schema.statoEffettivoCampo(campo);
    return BU.schema.STATI_CAMPO_ETICHETTE[stato] || stato;
  }

  // Testo del campo con lo stato annotato in coda — "valore _(Ipotesi)_" —
  // per i materiali a uso interno, dove sapere se una riga è ipotesi,
  // generata da IA o mandatoria conta quanto il valore stesso. Non va usato
  // nei materiali pensati per uscire così come sono verso un cliente (es.
  // landing, presentazione commerciale, template proposta economica): lì lo
  // stato interno del dato non è cosa da mostrare.
  function testoCampoConStato(bu, sezione, chiave) {
    var def = BU.schema.trovaCampoDef(sezione, chiave);
    var campo = BU.schema.ottieniCampo(bu, sezione, chiave);
    var testo = testoCampo(bu, sezione, chiave);
    if (!def || !BU.schema.campoHaValore(campo, def.tipo)) return testo;
    return testo + ' _(' + etichettaStatoCampo(campo) + ')_';
  }

  // Toglie un punto/esclamativo/interrogativo finale. Serve per incollare il
  // testo di un campo (che l'utente scrive spesso come frase compiuta, punto
  // incluso) dentro un'altra frase composta da un generatore, senza
  // ritrovarsi con punteggiatura doppia ("...ore., così che...").
  // Non tocca i segnaposto [MANCA: ...] / [DA SCRIVERE: ...], che finiscono
  // con "]".
  function senzaPuntoFinale(testo) {
    testo = (testo === null || testo === undefined) ? '' : String(testo);
    return testo.replace(/[.!?]+\s*$/, '');
  }

  BU.render = {
    manca: manca,
    daScrivere: daScrivere,
    escapeCella: escapeCella,
    tabella: tabella,
    elencoPuntato: elencoPuntato,
    testoCampo: testoCampo,
    righeLista: righeLista,
    listaMarkdown: listaMarkdown,
    etichettaStatoCampo: etichettaStatoCampo,
    testoCampoConStato: testoCampoConStato,
    senzaPuntoFinale: senzaPuntoFinale
  };

}(typeof window !== 'undefined' ? window : this));
