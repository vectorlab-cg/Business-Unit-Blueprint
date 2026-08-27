/*
 * cartella.js
 * Condivisione tramite il repository GitHub che ospita l'app: un file JSON
 * per business unit dentro la cartella BU/ del repo, letto e scritto con
 * le API REST di GitHub (fetch diretto dal browser, CORS incluso).
 *
 * La lettura non richiede autenticazione (il repo è pubblico). Scrivere
 * (salvare, creare, eliminare) richiede il token GitHub personale di chi
 * usa l'app — mai un token condiviso nel codice: su un sito pubblico
 * chiunque potrebbe leggerlo. Il token resta solo nel localStorage di chi
 * lo inserisce e viaggia solo verso api.github.com. Chi salva deve avere
 * comunque accesso in scrittura al repo: è GitHub stesso, non l'app, a
 * decidere chi può.
 *
 * Namespace globale: window.BU.cartella
 */
(function (global) {
  'use strict';

  var BU = global.BU = global.BU || {};

  var OWNER = 'vectorlab-cg';
  var REPO = 'Business-Unit-Blueprint';
  var CARTELLA = 'BU';
  var BRANCH = 'main';
  var CHIAVE_TOKEN = 'bu-blueprint:github-token';

  function supportata() {
    return typeof global.fetch === 'function';
  }

  // -----------------------------------------------------------------
  // Token — solo localStorage locale, mai nel codice o altrove.
  // -----------------------------------------------------------------

  function leggiToken() {
    try {
      return global.localStorage.getItem(CHIAVE_TOKEN) || '';
    } catch (e) {
      return '';
    }
  }

  function salvaToken(token) {
    try {
      global.localStorage.setItem(CHIAVE_TOKEN, token || '');
    } catch (e) { /* localStorage non disponibile: il token resta solo in memoria per questa pagina */ }
  }

  function rimuoviToken() {
    try {
      global.localStorage.removeItem(CHIAVE_TOKEN);
    } catch (e) { /* niente da fare */ }
  }

  function haToken() {
    return !!leggiToken();
  }

  // -----------------------------------------------------------------
  // UTF-8 <-> base64. L'API di GitHub vuole il contenuto in base64;
  // btoa/atob da soli lavorano solo su Latin-1 e romperebbero à, è, ecc.
  // -----------------------------------------------------------------

  function utf8InBase64(testo) {
    var bytes = new global.TextEncoder().encode(testo);
    var binario = '';
    for (var i = 0; i < bytes.length; i++) binario += String.fromCharCode(bytes[i]);
    return global.btoa(binario);
  }

  // -----------------------------------------------------------------
  // Chiamate all'API
  // -----------------------------------------------------------------

  // Solo per scrivere/eliminare: richiede il token. Usarla anche per le
  // letture allegherebbe il token a richieste che non ne hanno bisogno (il
  // repo è pubblico) — e un token invalido o scaduto romperebbe anche le
  // letture, che devono invece continuare a funzionare per chiunque.
  function intestazioniScrittura() {
    var h = { 'Accept': 'application/vnd.github+json' };
    var token = leggiToken();
    if (token) h.Authorization = 'token ' + token;
    return h;
  }

  // Per leggere: mai il token. La lettura è sempre attiva e non richiede
  // nulla, a prescindere da cosa c'è (o non c'è più di valido) salvato in
  // localStorage.
  function intestazioniLettura() {
    return { 'Accept': 'application/vnd.github+json' };
  }

  function urlContenuti(percorso) {
    return 'https://api.github.com/repos/' + OWNER + '/' + REPO + '/contents/' + percorso;
  }

  function verificaRisposta(risposta) {
    if (risposta.ok) return risposta;
    // 409: lo sha inviato non è più quello corrente — qualcun altro ha
    // scritto lo stesso file nel frattempo. Messaggio azionabile invece del
    // testo grezzo dell'API, che parla di sha e non dice cosa fare.
    if (risposta.status === 409) {
      throw new Error('Qualcun altro ha salvato questa business unit nel frattempo. ' +
        'Aggiorna da GitHub e riapplica le tue modifiche prima di salvare di nuovo.');
    }
    return risposta.json().catch(function () { return {}; }).then(function (corpo) {
      var messaggio = corpo && corpo.message ? corpo.message : risposta.statusText;
      throw new Error('GitHub (' + risposta.status + '): ' + messaggio);
    });
  }

  // -----------------------------------------------------------------
  // File dentro BU/: un file JSON per business unit. Ogni voce porta lo
  // sha corrente del file, richiesto da GitHub per aggiornarlo o
  // eliminarlo senza sovrascrivere alla cieca una modifica altrui.
  // -----------------------------------------------------------------

  function elencaFile() {
    return global.fetch(urlContenuti(CARTELLA), { headers: intestazioniLettura() }).then(function (risposta) {
      if (risposta.status === 404) return []; // la cartella non esiste ancora nel repo
      // verificaRisposta può restituire la risposta direttamente (non è
      // un thenable) oppure una Promise che rigetta: Promise.resolve
      // normalizza i due casi prima di incatenare .then.
      return Promise.resolve(verificaRisposta(risposta)).then(function (r) { return r.json(); });
    }).then(function (voci) {
      return (Array.isArray(voci) ? voci : [])
        .filter(function (v) { return v.type === 'file' && /\.json$/i.test(v.name); })
        .map(function (v) { return { nomeFile: v.name, percorso: v.path, sha: v.sha, downloadUrl: v.download_url }; });
    });
  }

  // Un file ha la stessa forma di un export JSON (un array con una sola
  // business unit dentro): si riusano store.esportaJSON/importaJSON
  // invece di inventare un secondo formato.
  function leggiBU(voce) {
    return global.fetch(voce.downloadUrl, { headers: intestazioniLettura() })
      .then(function (r) { return verificaRisposta(r); })
      .then(function (r) { return r.text(); })
      .then(function (testo) {
        var elenco = BU.store.importaJSON(testo);
        if (!elenco.length) throw new Error('Il file "' + voce.nomeFile + '" non contiene una business unit.');
        return elenco[0];
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

  // Crea o aggiorna il file di una BU. Se `voce` è null crea un file nuovo
  // (nome derivato da nomeFileDa); se è la voce di un file esistente lo
  // aggiorna (serve il suo sha corrente). Restituisce la voce aggiornata,
  // col nuovo sha — indispensabile per il prossimo salvataggio.
  function scriviBU(voce, bu) {
    var nomeFile = voce ? voce.nomeFile : nomeFileDa(bu);
    var corpo = {
      message: 'BU Blueprint: salva "' + bu.nome + '"',
      content: utf8InBase64(BU.store.esportaJSON([bu])),
      branch: BRANCH
    };
    if (voce && voce.sha) corpo.sha = voce.sha;

    var intestazioniPut = intestazioniScrittura();
    intestazioniPut['Content-Type'] = 'application/json';

    return global.fetch(urlContenuti(CARTELLA + '/' + nomeFile), {
      method: 'PUT',
      headers: intestazioniPut,
      body: JSON.stringify(corpo)
    }).then(function (r) { return verificaRisposta(r); })
      .then(function (r) { return r.json(); })
      .then(function (risposta) {
        return {
          nomeFile: nomeFile,
          percorso: risposta.content.path,
          sha: risposta.content.sha,
          downloadUrl: risposta.content.download_url
        };
      });
  }

  function creaFileBU(bu) {
    return scriviBU(null, bu);
  }

  function eliminaFile(voce) {
    var intestazioniDelete = intestazioniScrittura();
    intestazioniDelete['Content-Type'] = 'application/json';

    return global.fetch(urlContenuti(voce.percorso), {
      method: 'DELETE',
      headers: intestazioniDelete,
      body: JSON.stringify({
        message: 'BU Blueprint: elimina "' + voce.nomeFile + '"',
        sha: voce.sha,
        branch: BRANCH
      })
    }).then(function (r) { return verificaRisposta(r); });
  }

  BU.cartella = {
    OWNER: OWNER,
    REPO: REPO,
    CARTELLA: CARTELLA,
    supportata: supportata,
    leggiToken: leggiToken,
    salvaToken: salvaToken,
    rimuoviToken: rimuoviToken,
    haToken: haToken,
    elencaFile: elencaFile,
    leggiBU: leggiBU,
    scriviBU: scriviBU,
    nomeFileDa: nomeFileDa,
    creaFileBU: creaFileBU,
    eliminaFile: eliminaFile
  };

}(typeof window !== 'undefined' ? window : this));
