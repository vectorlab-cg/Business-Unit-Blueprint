/*
 * gen/_registry.js
 * Registro dei generatori di materiali. Ogni file in src/gen/NN-*.js si
 * registra da solo chiamando BU.registraGeneratore({id, nome, descrizione,
 * richiede, genera}).
 *
 * Namespace globale: window.BU.registraGeneratore, window.BU.gen
 */
(function (global) {
  'use strict';

  var BU = global.BU = global.BU || {};

  var elenco = [];
  var indiceId = {};

  function registraGeneratore(def) {
    if (!def || typeof def.id !== 'string' || !def.id) {
      throw new Error('Generatore senza id valido.');
    }
    if (indiceId[def.id]) {
      throw new Error('Id generatore duplicato: ' + def.id);
    }
    if (typeof def.genera !== 'function') {
      throw new Error('Generatore "' + def.id + '" senza funzione genera().');
    }
    var voce = {
      id: def.id,
      nome: def.nome || def.id,
      descrizione: def.descrizione || '',
      richiede: Array.isArray(def.richiede) ? def.richiede.slice() : [],
      genera: def.genera
    };
    indiceId[def.id] = voce;
    elenco.push(voce);
    return voce;
  }

  function elencaGeneratori() {
    return elenco.slice();
  }

  function trovaGeneratore(id) {
    return indiceId[id] || null;
  }

  // Dati i riferimenti "sezione.chiave" in richiede, restituisce quelli il
  // cui campo è ancora privo di valore in questa BU.
  function campiRichiestiMancanti(bu, generatore) {
    var mancanti = [];
    (generatore.richiede || []).forEach(function (rif) {
      var parti = rif.split('.');
      var sezione = parti[0];
      var chiave = parti[1];
      var def = BU.schema.trovaCampoDef(sezione, chiave);
      if (!def) return;
      var campo = BU.schema.ottieniCampo(bu, sezione, chiave);
      if (!BU.schema.campoHaValore(campo, def.tipo)) {
        mancanti.push(def);
      }
    });
    return mancanti;
  }

  BU.registraGeneratore = registraGeneratore;
  BU.gen = {
    elencaGeneratori: elencaGeneratori,
    trovaGeneratore: trovaGeneratore,
    campiRichiestiMancanti: campiRichiestiMancanti
  };

}(typeof window !== 'undefined' ? window : this));
