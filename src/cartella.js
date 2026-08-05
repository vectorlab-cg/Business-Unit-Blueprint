/*
 * cartella.js
 * Condivisione tramite cartella locale (es. dentro OneDrive): un file JSON
 * per business unit, letto e scritto con la File System Access API.
 *
 * Richiede un browser Chromium (Chrome, Edge). Su browser che non la
 * supportano, BU.cartella.supportata() torna false e il resto dell'app
 * ricade sul localStorage classico — questa non è una dipendenza, è una
 * capacità opzionale rilevata a runtime.
 *
 * Namespace globale: window.BU.cartella
 */
(function (global) {
  'use strict';

  var BU = global.BU = global.BU || {};

  var DB_NOME = 'bu-blueprint-cartella';
  var DB_VERSIONE = 1;
  var NOME_OBJECT_STORE = 'handle';
  var CHIAVE_HANDLE = 'cartellaBU';

  function supportata() {
    return typeof global.showDirectoryPicker === 'function' && typeof global.indexedDB !== 'undefined';
  }

  // -----------------------------------------------------------------
  // IndexedDB: persiste l'handle della cartella fra una sessione e l'altra.
  // localStorage non basta perché un FileSystemDirectoryHandle non è una
  // stringa: IndexedDB lo accetta perché usa la structured clone algorithm.
  // -----------------------------------------------------------------

  function apriDB() {
    return new Promise(function (resolve, reject) {
      var richiesta = global.indexedDB.open(DB_NOME, DB_VERSIONE);
      richiesta.onupgradeneeded = function () {
        richiesta.result.createObjectStore(NOME_OBJECT_STORE);
      };
      richiesta.onsuccess = function () { resolve(richiesta.result); };
      richiesta.onerror = function () { reject(richiesta.error); };
    });
  }

  function salvaHandleInDB(handle) {
    return apriDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(NOME_OBJECT_STORE, 'readwrite');
        tx.objectStore(NOME_OBJECT_STORE).put(handle, CHIAVE_HANDLE);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function leggiHandleDaDB() {
    return apriDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(NOME_OBJECT_STORE, 'readonly');
        var richiesta = tx.objectStore(NOME_OBJECT_STORE).get(CHIAVE_HANDLE);
        richiesta.onsuccess = function () { resolve(richiesta.result || null); };
        richiesta.onerror = function () { reject(richiesta.error); };
      });
    });
  }

  function rimuoviHandleDaDB() {
    return apriDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(NOME_OBJECT_STORE, 'readwrite');
        tx.objectStore(NOME_OBJECT_STORE).delete(CHIAVE_HANDLE);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  // -----------------------------------------------------------------
  // Collegamento
  // -----------------------------------------------------------------

  // Apre il selettore di cartelle nativo (richiede un click dell'utente) e
  // ricorda la scelta per le prossime sessioni.
  function collega() {
    return global.showDirectoryPicker({ mode: 'readwrite' }).then(function (handle) {
      return salvaHandleInDB(handle).then(function () { return handle; });
    });
  }

  // Recupera l'ultima cartella collegata, se c'è. Restituisce
  // { handle, permesso } dove permesso è 'granted' | 'prompt' | 'denied',
  // oppure null se non è mai stata collegata una cartella. Non chiede mai
  // il permesso da sola (richiederebbe un gesto dell'utente): quello lo fa
  // richiediPermesso, da chiamare in risposta a un click.
  function ripristina() {
    return leggiHandleDaDB().then(function (handle) {
      if (!handle) return null;
      return handle.queryPermission({ mode: 'readwrite' }).then(function (permesso) {
        return { handle: handle, permesso: permesso };
      });
    });
  }

  function richiediPermesso(handle) {
    return handle.requestPermission({ mode: 'readwrite' }).then(function (permesso) {
      return permesso === 'granted';
    });
  }

  function scollega() {
    return rimuoviHandleDaDB();
  }

  // -----------------------------------------------------------------
  // File dentro la cartella: un file JSON per business unit.
  // -----------------------------------------------------------------

  function elencaFile(dirHandle) {
    var voci = [];
    var iteratore = dirHandle.values();
    function passo(risultato) {
      if (risultato.done) return voci;
      var voce = risultato.value;
      if (voce.kind === 'file' && /\.json$/i.test(voce.name)) {
        voci.push({ nomeFile: voce.name, fileHandle: voce });
      }
      return iteratore.next().then(passo);
    }
    return iteratore.next().then(passo);
  }

  // Un file di cartella ha la stessa forma di un export JSON (un array con
  // una sola business unit dentro): si riusano store.esportaJSON/importaJSON
  // invece di inventare un secondo formato.
  function leggiBU(fileHandle) {
    return fileHandle.getFile().then(function (file) {
      return file.text();
    }).then(function (testo) {
      var elenco = BU.store.importaJSON(testo);
      if (!elenco.length) throw new Error('Il file "' + fileHandle.name + '" non contiene una business unit.');
      return elenco[0];
    });
  }

  function scriviBU(fileHandle, bu) {
    var testo = BU.store.esportaJSON([bu]);
    return fileHandle.createWritable().then(function (scrittore) {
      return scrittore.write(testo).then(function () { return scrittore.close(); });
    });
  }

  function nomeFileDa(bu) {
    var slug = (bu.nome || 'business-unit').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    // Suffisso dall'id (ripulito da underscore/altri separatori) per
    // evitare collisioni fra BU con nomi uguali.
    var suffisso = String(bu.id).toLowerCase().replace(/[^a-z0-9]/g, '').slice(-8);
    return (slug || 'business-unit') + '-' + suffisso + '.json';
  }

  function creaFileBU(dirHandle, bu) {
    var nomeFile = nomeFileDa(bu);
    return dirHandle.getFileHandle(nomeFile, { create: true }).then(function (fileHandle) {
      return scriviBU(fileHandle, bu).then(function () {
        return { nomeFile: nomeFile, fileHandle: fileHandle };
      });
    });
  }

  function eliminaFile(dirHandle, nomeFile) {
    return dirHandle.removeEntry(nomeFile);
  }

  BU.cartella = {
    supportata: supportata,
    collega: collega,
    ripristina: ripristina,
    richiediPermesso: richiediPermesso,
    scollega: scollega,
    elencaFile: elencaFile,
    leggiBU: leggiBU,
    scriviBU: scriviBU,
    nomeFileDa: nomeFileDa,
    creaFileBU: creaFileBU,
    eliminaFile: eliminaFile
  };

}(typeof window !== 'undefined' ? window : this));
