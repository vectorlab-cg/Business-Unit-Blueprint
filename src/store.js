/*
 * store.js
 * Persistenza in localStorage ed export/import JSON per backup.
 *
 * Namespace globale: window.BU.store
 */
(function (global) {
  'use strict';

  var BU = global.BU = global.BU || {};

  var CHIAVE_STORAGE = 'bu-blueprint:dati';

  function contenitoreVuoto() {
    return { versione: BU.schema.VERSIONE_SCHEMA, businessUnit: [] };
  }

  function normalizzaContenitore(grezzo) {
    var out = contenitoreVuoto();
    if (grezzo && typeof grezzo === 'object' && Array.isArray(grezzo.businessUnit)) {
      out.businessUnit = grezzo.businessUnit.map(BU.schema.normalizzaBU);
    }
    return out;
  }

  function haLocalStorage() {
    try {
      return typeof global.localStorage !== 'undefined' && global.localStorage !== null;
    } catch (e) {
      return false;
    }
  }

  // Carica l'elenco delle business unit da localStorage, normalizzandole
  // (migrazione automatica da schemi precedenti). Non lancia mai eccezioni:
  // in caso di dati assenti o corrotti restituisce un elenco vuoto.
  function carica() {
    if (!haLocalStorage()) return [];
    var grezzo;
    try {
      var testo = global.localStorage.getItem(CHIAVE_STORAGE);
      if (!testo) return [];
      grezzo = JSON.parse(testo);
    } catch (e) {
      return [];
    }
    return normalizzaContenitore(grezzo).businessUnit;
  }

  // Salva l'intero elenco delle business unit in localStorage.
  function salva(elenco) {
    if (!haLocalStorage()) return false;
    var contenitore = {
      versione: BU.schema.VERSIONE_SCHEMA,
      businessUnit: Array.isArray(elenco) ? elenco : []
    };
    try {
      global.localStorage.setItem(CHIAVE_STORAGE, JSON.stringify(contenitore));
      return true;
    } catch (e) {
      return false;
    }
  }

  // Restituisce il JSON (formattato) dell'intero backup, pronto per il download.
  function esportaJSON(elenco) {
    var contenitore = {
      versione: BU.schema.VERSIONE_SCHEMA,
      esportatoIl: new Date().toISOString(),
      businessUnit: Array.isArray(elenco) ? elenco : []
    };
    return JSON.stringify(contenitore, null, 2);
  }

  // Interpreta un JSON di backup e restituisce l'elenco di business unit
  // normalizzate (migrate se necessario). Lancia un errore descrittivo se il
  // testo non è JSON valido o non ha la forma attesa.
  function importaJSON(testo) {
    var grezzo;
    try {
      grezzo = JSON.parse(testo);
    } catch (e) {
      throw new Error('Il file non contiene JSON valido.');
    }
    if (!grezzo || typeof grezzo !== 'object' || !Array.isArray(grezzo.businessUnit)) {
      throw new Error('Il file non ha la struttura attesa (manca "businessUnit").');
    }
    return grezzo.businessUnit.map(BU.schema.normalizzaBU);
  }

  BU.store = {
    CHIAVE_STORAGE: CHIAVE_STORAGE,
    carica: carica,
    salva: salva,
    esportaJSON: esportaJSON,
    importaJSON: importaJSON
  };

}(typeof window !== 'undefined' ? window : this));
