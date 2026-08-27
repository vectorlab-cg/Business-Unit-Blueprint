/*
 * test/browser.js
 * Test end-to-end in un browser reale (Puppeteer + Chromium, scaricato da
 * `npm install` come devDependency — l'app in sé resta a dipendenza zero,
 * questo tocca solo la cartella test/). Copre esattamente ciò che
 * test/smoke.js non può: il codice DOM/stato di src/app.js e src/ui.js, che
 * gira solo dentro un browser vero.
 *
 * Le API di GitHub sono finte (window.fetch sostituito prima che l'app
 * carichi, via evaluateOnNewDocument): nessuna rete vera, nessuna
 * dipendenza dal repository reale, test deterministico.
 *
 * Esecuzione: node test/browser.js (o npm run test:browser)
 */
'use strict';

var path = require('path');
var puppeteer = require('puppeteer');

var INDEX = 'file://' + path.join(__dirname, '..', 'index.html').replace(/\\/g, '/');

var esiti = [];

function assicura(condizione, messaggio) {
  if (!condizione) throw new Error(messaggio);
}

// Installata nella pagina PRIMA che index.html carichi i suoi script:
// sostituisce window.fetch con un repository GitHub finto, in memoria.
// Si reinstalla automaticamente ad ogni page.reload() (nuovo documento),
// ripartendo da un repository vuoto — simula "la cartella condivisa
// resta vuota", condizione sufficiente per il test di regressione sotto.
function installaCartellaFinta() {
  window.__repoFinto = {};
  window.__prossimoConflitto = false;
  window.__prossimoErroreLettura = null; // percorso il cui prossimo GET raw fallisce, senza sparire dall'elenco

  window.fetch = function (url, opzioni) {
    opzioni = opzioni || {};
    var metodo = opzioni.method || 'GET';

    if (metodo === 'GET' && /\/contents\/BU$/.test(url)) {
      var percorsi = Object.keys(window.__repoFinto);
      if (!percorsi.length) {
        return Promise.resolve({ ok: false, status: 404, json: function () { return Promise.resolve({ message: 'Not Found' }); } });
      }
      var voci = percorsi.map(function (p) {
        var f = window.__repoFinto[p];
        return { type: 'file', name: p.slice(3), path: p, sha: f.sha, download_url: 'https://raw.test/' + p };
      });
      return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve(voci); } });
    }

    if (metodo === 'GET' && url.indexOf('https://raw.test/') === 0) {
      var percorsoLettura = url.slice('https://raw.test/'.length);
      if (window.__prossimoErroreLettura === percorsoLettura) {
        window.__prossimoErroreLettura = null;
        // Il file resta nell'elenco della cartella (GET /contents/BU lo
        // mostra ancora): solo la lettura del contenuto grezzo fallisce
        // questa volta, come un errore di rete/propagazione transitorio.
        return Promise.resolve({
          ok: false, status: 503,
          json: function () { return Promise.resolve({ message: 'errore transitorio simulato' }); },
          text: function () { return Promise.resolve('errore transitorio simulato'); }
        });
      }
      var voceLettura = window.__repoFinto[percorsoLettura];
      return Promise.resolve({
        ok: !!voceLettura, status: voceLettura ? 200 : 404,
        text: function () { return Promise.resolve(voceLettura ? voceLettura.testo : ''); }
      });
    }

    if (metodo === 'PUT') {
      if (window.__prossimoConflitto) {
        window.__prossimoConflitto = false;
        return Promise.resolve({ ok: false, status: 409, json: function () { return Promise.resolve({ message: 'conflitto simulato' }); } });
      }
      var corpo = JSON.parse(opzioni.body);
      var percorsoPut = url.split('/contents/')[1];
      var binario = atob(corpo.content);
      var testo = decodeURIComponent(Array.prototype.map.call(binario, function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      var nuovoSha = 'sha-finta-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      window.__repoFinto[percorsoPut] = { testo: testo, sha: nuovoSha };
      return Promise.resolve({
        ok: true, status: 200,
        json: function () { return Promise.resolve({ content: { path: percorsoPut, sha: nuovoSha, download_url: 'https://raw.test/' + percorsoPut } }); }
      });
    }

    if (metodo === 'DELETE') {
      var percorsoDel = url.split('/contents/')[1];
      delete window.__repoFinto[percorsoDel];
      return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve({}); } });
    }

    return Promise.reject(new Error('URL non gestito dal fetch finto: ' + metodo + ' ' + url));
  };
}

function attesa(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

async function main() {
  // --no-sandbox: senza, Chromium non parte nei runner CI (GitHub Actions
  // non concede i permessi che il sandbox di default richiede).
  // --disable-dev-shm-usage: /dev/shm è troppo piccolo nei container CI e
  // farebbe crashare Chromium sotto carico.
  var browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  var page = await browser.newPage();

  var promptDaRispondere = [];
  var ultimoAlert = null;
  page.on('dialog', function (dialog) {
    if (dialog.type() === 'prompt') {
      dialog.accept(promptDaRispondere.length ? promptDaRispondere.shift() : 'BU di test');
    } else {
      ultimoAlert = dialog.message();
      dialog.accept();
    }
  });

  await page.evaluateOnNewDocument(installaCartellaFinta);
  await page.goto(INDEX);
  await attesa(400); // lascia risolvere il caricamento iniziale (vuoto) dalla cartella finta

  // -------------------------------------------------------------------
  // Scenario 1 (regressione): una BU creata senza token esiste solo in
  // locale — non deve sparire quando la cartella condivisa si aggiorna.
  // -------------------------------------------------------------------
  promptDaRispondere.push('BU di test E2E');
  await page.click('#bottone-nuova-bu');
  await attesa(300);

  var etichettaSubito = await page.evaluate(function () {
    return document.querySelector('.sidebar-voce-locale') ? document.querySelector('.sidebar-voce-locale').textContent : null;
  });
  assicura(etichettaSubito === 'Solo locale', 'la BU appena creata dovrebbe mostrare l\'etichetta "Solo locale", trovato: ' + etichettaSubito);

  await page.evaluateOnNewDocument(installaCartellaFinta); // stesso mock, repository finto di nuovo vuoto al prossimo documento
  await page.reload();
  await attesa(500);

  var nomiDopoReload = await page.evaluate(function () {
    return Array.from(document.querySelectorAll('.sidebar-voce-nome')).map(function (n) { return n.textContent; });
  });
  assicura(nomiDopoReload.indexOf('BU di test E2E') !== -1,
    'la BU solo-locale è sparita dopo il refresh della cartella condivisa (regressione sul bug di perdita dati): ' + JSON.stringify(nomiDopoReload));
  esiti.push({ nome: 'una BU solo-locale sopravvive al refresh della cartella condivisa', ok: true });

  // -------------------------------------------------------------------
  // Scenario 2: con un token, "Condividi su GitHub" condivide la BU
  // rimasta solo locale e l'etichetta sparisce.
  // -------------------------------------------------------------------
  await page.click('.sidebar-voce'); // riseleziona la BU (il reload riparte dalla prima in elenco, va bene lo stesso: ce n'è una sola)
  await attesa(200);
  await page.type('#input-token-github', 'ghp_finto_e2e');
  await page.click('#bottone-token');
  await attesa(200);

  var haCondividi = await page.evaluate(function () {
    return Array.from(document.querySelectorAll('#bu-header button')).some(function (b) { return b.textContent.trim() === 'Condividi su GitHub'; });
  });
  assicura(haCondividi, 'con un token salvato dovrebbe comparire il pulsante "Condividi su GitHub" per la BU solo locale');

  await page.evaluate(function () {
    Array.from(document.querySelectorAll('#bu-header button')).find(function (b) { return b.textContent.trim() === 'Condividi su GitHub'; }).click();
  });
  await attesa(400);

  var statoDopoCondividi = await page.evaluate(function () {
    return {
      etichettaLocale: !!document.querySelector('.sidebar-voce-locale'),
      haSalvaSuGitHub: Array.from(document.querySelectorAll('#bu-header button')).some(function (b) { return b.textContent.trim() === 'Salva su GitHub'; })
    };
  });
  assicura(!statoDopoCondividi.etichettaLocale, 'dopo "Condividi su GitHub" l\'etichetta "Solo locale" dovrebbe sparire');
  assicura(statoDopoCondividi.haSalvaSuGitHub, 'dopo "Condividi su GitHub" dovrebbe comparire il pulsante "Salva su GitHub"');
  esiti.push({ nome: '"Condividi su GitHub" condivide una BU solo locale', ok: true });

  // -------------------------------------------------------------------
  // Scenario 3: un conflitto di scrittura (409) mostra un messaggio
  // comprensibile, non l'errore grezzo dell'API GitHub.
  // -------------------------------------------------------------------
  await page.evaluate(function () { window.__prossimoConflitto = true; });
  ultimoAlert = null;
  await page.evaluate(function () {
    Array.from(document.querySelectorAll('#bu-header button')).find(function (b) { return b.textContent.trim() === 'Salva su GitHub'; }).click();
  });
  await attesa(400);

  assicura(ultimoAlert && ultimoAlert.indexOf('nel frattempo') !== -1 && ultimoAlert.indexOf('Aggiorna da GitHub') !== -1,
    'il messaggio di conflitto non è comprensibile/azionabile: ' + JSON.stringify(ultimoAlert));
  esiti.push({ nome: 'un conflitto 409 sul salvataggio mostra un messaggio comprensibile', ok: true });

  // -------------------------------------------------------------------
  // Scenario 4 (regressione): una BU già condivisa il cui file è ancora
  // elencato nella cartella ma il cui contenuto fallisce a leggersi in
  // questo giro (errore di rete/propagazione transitorio) non deve
  // sparire né perdere il proprio fileHandle — a differenza di una BU
  // davvero eliminata da qualcun altro (il cui file non è più elencato).
  // -------------------------------------------------------------------
  var percorsoCondiviso = await page.evaluate(function () {
    var stato = window.BU.app.stato;
    var id = stato.buAttivaId;
    return stato.fileHandleDiBU[id] ? stato.fileHandleDiBU[id].percorso : null;
  });
  assicura(percorsoCondiviso, 'la BU attiva dovrebbe avere un fileHandle condiviso prima dello scenario 4');

  await page.evaluate(function (percorso) { window.__prossimoErroreLettura = percorso; }, percorsoCondiviso);
  await page.click('#bottone-aggiorna-cartella');
  await attesa(400);

  var statoDopoErroreLettura = await page.evaluate(function () {
    return {
      nomi: Array.from(document.querySelectorAll('.sidebar-voce-nome')).map(function (n) { return n.textContent; }),
      etichettaLocale: !!document.querySelector('.sidebar-voce-locale'),
      haSalvaSuGitHub: Array.from(document.querySelectorAll('#bu-header button')).some(function (b) { return b.textContent.trim() === 'Salva su GitHub'; })
    };
  });
  assicura(statoDopoErroreLettura.nomi.indexOf('BU di test E2E') !== -1,
    'la BU condivisa è sparita dopo un errore di lettura transitorio (il file era ancora elencato): ' + JSON.stringify(statoDopoErroreLettura));
  assicura(!statoDopoErroreLettura.etichettaLocale,
    'la BU condivisa è stata retrocessa a "Solo locale" dopo un errore di lettura transitorio');
  assicura(statoDopoErroreLettura.haSalvaSuGitHub,
    'la BU condivisa ha perso il pulsante "Salva su GitHub" (fileHandle perso) dopo un errore di lettura transitorio');
  esiti.push({ nome: 'un errore di lettura transitorio non fa sparire una BU già condivisa', ok: true });

  await browser.close();
}

main().then(function () {
  esiti.forEach(function (e) { console.log('OK   ' + e.nome); });
  console.log('');
  console.log(esiti.length + ' test, 0 falliti');
}).catch(function (e) {
  console.log('FAIL ' + (e && e.message ? e.message : e));
  esiti.forEach(function (es) { console.log('OK   ' + es.nome); });
  console.log('');
  console.log((esiti.length + 1) + ' test, 1 falliti');
  process.exitCode = 1;
});
