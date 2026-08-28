/*
 * gen/_registry.js
 * Registro dei generatori di materiali. Ogni file in src/gen/NN-*.js si
 * registra da solo chiamando BU.registraGeneratore({id, nome, descrizione,
 * richiede, genera, haPrompt, categoria}). haPrompt è facoltativo: solo per
 * i generatori che finiscono il proprio testo con un prompt da usare in uno
 * strumento esterno (vedi DOCUMENTO: un campo per incollarne il risultato
 * compare solo per questi). categoria è obbligatoria: raggruppa i
 * generatori in "capitoli" nelle viste MATERIALI/DOCUMENTO (vedi CATEGORIE
 * sotto) — l'ordine dei file gen/NN-*.js resta solo un id interno, non
 * decide più l'ordine di presentazione.
 *
 * Namespace globale: window.BU.registraGeneratore, window.BU.gen
 */
(function (global) {
  'use strict';

  var BU = global.BU = global.BU || {};

  var elenco = [];
  var indiceId = {};

  // Ordine dei capitoli nelle viste MATERIALI/DOCUMENTO e nell'export .md.
  // "sintesi" (BU One-Page) non ha un titolo di capitolo: è una fotografia
  // di tutto il resto, resta da sola in apertura invece di aprire un gruppo.
  var CATEGORIE = [
    { chiave: 'sintesi', titolo: null },
    { chiave: 'fondamenta', titolo: 'Fondamenta strategiche' },
    { chiave: 'marketing', titolo: 'Materiali di marketing' },
    { chiave: 'commerciale', titolo: 'Processo commerciale' },
    { chiave: 'pilota_test', titolo: 'Pilota, test e decisione' }
  ];
  var CHIAVI_CATEGORIA = CATEGORIE.map(function (c) { return c.chiave; });

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
    if (CHIAVI_CATEGORIA.indexOf(def.categoria) === -1) {
      throw new Error('Generatore "' + def.id + '" con categoria non valida: ' + def.categoria);
    }
    var voce = {
      id: def.id,
      nome: def.nome || def.id,
      descrizione: def.descrizione || '',
      richiede: Array.isArray(def.richiede) ? def.richiede.slice() : [],
      // true per i generatori che finiscono il proprio testo con un prompt
      // da usare in uno strumento esterno (vedi DOCUMENTO: un campo per
      // incollarne il risultato compare solo per questi).
      haPrompt: !!def.haPrompt,
      categoria: def.categoria,
      genera: def.genera
    };
    indiceId[def.id] = voce;
    elenco.push(voce);
    return voce;
  }

  function elencaGeneratori() {
    return elenco.slice();
  }

  // Stessi generatori di elencaGeneratori(), raggruppati per categoria
  // nell'ordine fisso di CATEGORIE — non nell'ordine di registrazione
  // (che segue solo la numerazione dei file gen/NN-*.js). Dentro ogni
  // categoria l'ordine di registrazione è invece preservato. Le categorie
  // senza nessun generatore non compaiono.
  function elencaGeneratoriRaggruppati() {
    return CATEGORIE.map(function (cat) {
      return {
        categoria: cat.chiave,
        titolo: cat.titolo,
        generatori: elenco.filter(function (g) { return g.categoria === cat.chiave; })
      };
    }).filter(function (gruppo) { return gruppo.generatori.length > 0; });
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
    elencaGeneratoriRaggruppati: elencaGeneratoriRaggruppati,
    trovaGeneratore: trovaGeneratore,
    campiRichiestiMancanti: campiRichiestiMancanti
  };

}(typeof window !== 'undefined' ? window : this));
