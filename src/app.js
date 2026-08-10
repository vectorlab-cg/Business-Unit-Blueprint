/*
 * app.js
 * Avvio, routing (hash: #<idBU>/<vista>), sidebar, salvataggio differito,
 * backup/ripristino JSON, download del documento Markdown completo (vista
 * DOCUMENTO, resa in HTML da BU.render.documentoCompleto + BU.markdown —
 * vedi ui.js), cartella condivisa su GitHub (un file per BU, vedi
 * cartella.js): lettura sempre attiva, scrittura con token personale.
 *
 * Namespace globale: window.BU.app
 */
(function (global) {
  'use strict';

  var BU = global.BU = global.BU || {};
  var schema = BU.schema;
  var el = null; // impostato all'avvio da BU.ui.el

  var stato = {
    elenco: [],
    buAttivaId: null,
    vista: 'compila',
    usaCartella: false, // true quando l'elenco viene dalla cartella BU/ su GitHub
    fileHandleDiBU: {} // buId -> { nomeFile, percorso, sha, downloadUrl }
  };

  var VISTE = ['compila', 'materiali', 'documento', 'validazione'];
  var VISTE_ETICHETTE = { compila: 'Compila', materiali: 'Materiali', documento: 'Documento', validazione: 'Validazione' };

  var timerSalvataggio = null;
  var sidebarRefs = {};
  var headerRefs = null; // { buId, selStato, badgeCompletezza, bottoneSalva }

  // ---------------------------------------------------------------------
  // Persistenza
  // ---------------------------------------------------------------------

  function ottieniBUAttiva() {
    for (var i = 0; i < stato.elenco.length; i++) {
      if (stato.elenco[i].id === stato.buAttivaId) return stato.elenco[i];
    }
    return null;
  }

  function pianificaSalvataggio() {
    if (timerSalvataggio) global.clearTimeout(timerSalvataggio);
    aggiornaIndicatoreSalvataggio('Salvataggio…');
    timerSalvataggio = global.setTimeout(function () {
      BU.store.salva(stato.elenco);
      timerSalvataggio = null;
      aggiornaIndicatoreSalvataggio('Salvato alle ' + new Date().toLocaleTimeString('it-IT'));
    }, 500);
  }

  function salvaSubito() {
    if (timerSalvataggio) { global.clearTimeout(timerSalvataggio); timerSalvataggio = null; }
    BU.store.salva(stato.elenco);
    aggiornaIndicatoreSalvataggio('Salvato alle ' + new Date().toLocaleTimeString('it-IT'));
  }

  function aggiornaIndicatoreSalvataggio(testo) {
    var nodo = document.getElementById('indicatore-salvataggio');
    if (nodo) nodo.textContent = testo;
  }

  function segnalaModifica(bu) {
    bu.modificata = new Date().toISOString();
    aggiornaVoceSidebar(bu);
    aggiornaHeaderIndicatori(bu);
    pianificaSalvataggio();
  }

  // ---------------------------------------------------------------------
  // Routing (hash: #idBU/vista) — non usa hashchange per gli spostamenti
  // avviati dall'app, per evitare doppi render.
  // ---------------------------------------------------------------------

  function leggiHash() {
    var pezzi = (global.location.hash || '').replace(/^#/, '').split('/');
    var id = pezzi[0] || null;
    var vista = pezzi[1] || 'compila';
    if (VISTE.indexOf(vista) === -1) vista = 'compila';
    if (id && stato.elenco.some(function (b) { return b.id === id; })) {
      stato.buAttivaId = id;
    } else {
      stato.buAttivaId = stato.elenco.length ? stato.elenco[0].id : null;
    }
    stato.vista = vista;
  }

  function scriviHash() {
    var nuovo = '#' + (stato.buAttivaId || '') + '/' + stato.vista;
    if (global.location.hash !== nuovo) {
      global.history.replaceState(null, '', nuovo);
    }
  }

  function selezionaBU(id) {
    stato.buAttivaId = id;
    scriviHash();
    renderSidebar();
    renderMain();
  }

  function selezionaVista(v) {
    stato.vista = v;
    scriviHash();
    var bu = ottieniBUAttiva();
    renderTabs(bu);
    renderVistaAttuale(bu);
  }

  // ---------------------------------------------------------------------
  // Azioni su business unit
  // ---------------------------------------------------------------------

  function nuovaBU() {
    var nome = global.prompt('Nome della nuova business unit:', '');
    if (nome === null) return;
    var bu = schema.nuovaBU(nome);
    stato.elenco.push(bu);
    stato.buAttivaId = bu.id;
    stato.vista = 'compila';
    salvaSubito();
    scriviHash();
    renderSidebar();
    renderMain();

    if (stato.usaCartella && BU.cartella.haToken()) {
      BU.cartella.creaFileBU(bu).then(function (voce) {
        stato.fileHandleDiBU[bu.id] = voce;
        if (headerRefs && headerRefs.buId === bu.id) renderHeader(bu); // fa comparire "Salva su GitHub"
      }).catch(function (e) {
        global.alert('La business unit è stata creata solo in locale: ' + e.message);
      });
    } else if (stato.usaCartella) {
      global.alert('La business unit è stata creata solo in locale: serve un token GitHub per salvarla nella cartella condivisa (vedi la barra laterale).');
    }
  }

  function eliminaBU(id) {
    var bu = stato.elenco.filter(function (b) { return b.id === id; })[0];
    if (!bu) return;
    if (!global.confirm('Eliminare "' + bu.nome + '"? L\'operazione non è reversibile (puoi fare un backup prima).')) return;
    stato.elenco = stato.elenco.filter(function (b) { return b.id !== id; });
    if (stato.buAttivaId === id) {
      stato.buAttivaId = stato.elenco.length ? stato.elenco[0].id : null;
    }
    salvaSubito();
    scriviHash();
    renderSidebar();
    renderMain();

    var voce = stato.fileHandleDiBU[id];
    if (voce) {
      delete stato.fileHandleDiBU[id];
      if (!BU.cartella.haToken()) {
        global.alert('La business unit è stata rimossa solo dall\'elenco locale: serve un token GitHub per eliminarla anche dalla cartella condivisa.');
      } else {
        BU.cartella.eliminaFile(voce).catch(function (e) {
          global.alert('La business unit è stata rimossa dall\'elenco ma il file su GitHub non è stato eliminato: ' + e.message);
        });
      }
    }
  }

  // ---------------------------------------------------------------------
  // Backup / ripristino / export
  // ---------------------------------------------------------------------

  function scaricaFile(nome, contenuto, tipo) {
    var blob = new global.Blob([contenuto], { type: tipo });
    var url = global.URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    global.setTimeout(function () { global.URL.revokeObjectURL(url); }, 1000);
  }

  function dataPerNomeFile() {
    return new Date().toISOString().slice(0, 10);
  }

  function esportaBackup() {
    var testo = BU.store.esportaJSON(stato.elenco);
    scaricaFile('bu-blueprint-backup-' + dataPerNomeFile() + '.json', testo, 'application/json');
  }

  function ripristinaBackupDaFile(file) {
    var reader = new global.FileReader();
    reader.onload = function () {
      var nuovoElenco;
      try {
        nuovoElenco = BU.store.importaJSON(String(reader.result));
      } catch (e) {
        global.alert('Impossibile leggere il backup: ' + e.message);
        return;
      }
      var conferma = global.confirm(
        'Il ripristino sostituisce tutte le ' + stato.elenco.length +
        ' business unit locali con le ' + nuovoElenco.length + ' del backup. Continuare?'
      );
      if (!conferma) return;
      stato.elenco = nuovoElenco;
      stato.buAttivaId = stato.elenco.length ? stato.elenco[0].id : null;
      stato.vista = 'compila';
      salvaSubito();
      scriviHash();
      renderSidebar();
      renderMain();
    };
    reader.onerror = function () {
      global.alert('Errore nella lettura del file.');
    };
    reader.readAsText(file);
  }

  // ---------------------------------------------------------------------
  // Cartella condivisa — un file per BU dentro BU/ nel repository GitHub
  // che ospita l'app (vedi cartella.js). La lettura è sempre attiva e non
  // richiede nulla (il repo è pubblico); salvare/creare/eliminare richiede
  // un token GitHub personale con accesso in scrittura al repo.
  // ---------------------------------------------------------------------

  // Carica tutte le BU dalla cartella condivisa e sostituisce l'elenco in
  // memoria. I file che non si riescono a leggere vengono saltati (non
  // bloccano il caricamento delle altre BU), con un avviso in console.
  function caricaDaCartella() {
    return BU.cartella.elencaFile().then(function (voci) {
      var nuovoElenco = [];
      var nuoveMappe = {};
      var letture = voci.map(function (voce) {
        return BU.cartella.leggiBU(voce).then(function (bu) {
          nuovoElenco.push(bu);
          nuoveMappe[bu.id] = voce;
        }).catch(function (e) {
          console.warn('BU Blueprint: impossibile leggere "' + voce.nomeFile + '": ' + e.message);
        });
      });
      return Promise.all(letture).then(function () {
        stato.elenco = nuovoElenco;
        stato.fileHandleDiBU = nuoveMappe;
        stato.usaCartella = true;
        leggiHash();
        scriviHash();
        aggiornaControlliCartella();
        renderSidebar();
        renderMain();
      });
    }).catch(function (e) {
      aggiornaControlliCartella();
      throw e;
    });
  }

  function salvaSuFile(bu) {
    var voce = stato.fileHandleDiBU[bu.id];
    if (!voce || !BU.cartella.haToken()) return;
    BU.cartella.scriviBU(voce, bu).then(function (nuovaVoce) {
      stato.fileHandleDiBU[bu.id] = nuovaVoce; // sha aggiornato: serve al prossimo salvataggio
      aggiornaIndicatoreSalvataggio('Salvato su GitHub alle ' + new Date().toLocaleTimeString('it-IT'));
    }).catch(function (e) {
      global.alert('Impossibile salvare su GitHub: ' + e.message);
    });
  }

  // Aggiorna testo e comportamento dei controlli della cartella condivisa
  // nella sidebar (stato lettura + gestione token) senza ricostruire tutta
  // la sidebar.
  function aggiornaControlliCartella() {
    var contenitore = document.getElementById('cartella-sezione');
    if (!contenitore) return;

    if (!BU.cartella.supportata()) {
      contenitore.style.display = 'none';
      return;
    }
    contenitore.style.display = '';

    var statoEl = document.getElementById('cartella-stato');
    statoEl.textContent = stato.usaCartella
      ? 'Condiviso via GitHub (' + stato.elenco.length + ' business unit)'
      : 'Dati locali in questo browser (GitHub non ancora letto)';

    var inputToken = document.getElementById('input-token-github');
    var bottoneToken = document.getElementById('bottone-token');

    if (BU.cartella.haToken()) {
      inputToken.style.display = 'none';
      bottoneToken.textContent = 'Rimuovi token';
      bottoneToken.onclick = function () {
        if (!global.confirm('Rimuovere il token salvato? Non potrai più salvare su GitHub da questo browser finché non ne inserisci uno nuovo.')) return;
        BU.cartella.rimuoviToken();
        aggiornaControlliCartella();
        renderMain(); // il pulsante "Salva su GitHub" nell'header dipende dal token
      };
    } else {
      inputToken.style.display = '';
      bottoneToken.textContent = 'Salva token';
      bottoneToken.onclick = function () {
        var valore = inputToken.value.trim();
        if (!valore) return;
        BU.cartella.salvaToken(valore);
        inputToken.value = '';
        aggiornaControlliCartella();
        renderMain();
      };
    }
  }

  function nomeFileMarkdown(bu) {
    return 'bu-blueprint-' + bu.nome.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + dataPerNomeFile() + '.md';
  }

  function scaricaDocumento(bu) {
    scaricaFile(nomeFileMarkdown(bu), BU.render.documentoCompleto(bu), 'text/markdown');
  }

  // ---------------------------------------------------------------------
  // Render: sidebar
  // ---------------------------------------------------------------------

  function renderSidebar() {
    var elenco = document.getElementById('sidebar-elenco');
    elenco.innerHTML = '';
    sidebarRefs = {};

    if (!stato.elenco.length) {
      elenco.appendChild(BU.ui.el('li', { class: 'sidebar-vuoto', text: 'Nessuna business unit. Creane una.' }));
      return;
    }

    stato.elenco.forEach(function (bu) {
      var completezza = schema.completezza(bu);
      var statoEl = BU.ui.el('span', { class: 'sidebar-voce-stato', text: schema.STATI_BU_ETICHETTE[bu.stato] || bu.stato });
      var completezzaEl = BU.ui.el('span', { class: 'sidebar-voce-completezza', text: completezza.percentuale + '%' });
      var nomeEl = BU.ui.el('div', { class: 'sidebar-voce-nome', text: bu.nome });

      var bottoneElimina = BU.ui.el('button', {
        type: 'button', class: 'sidebar-voce-elimina', title: 'Elimina',
        onclick: function (e) { e.stopPropagation(); eliminaBU(bu.id); }
      }, ['×']);

      var li = BU.ui.el('li', {
        class: 'sidebar-voce' + (bu.id === stato.buAttivaId ? ' attiva' : ''),
        onclick: function () { selezionaBU(bu.id); }
      }, [
        nomeEl,
        BU.ui.el('div', { class: 'sidebar-voce-meta' }, [statoEl, completezzaEl]),
        bottoneElimina
      ]);

      elenco.appendChild(li);
      sidebarRefs[bu.id] = { li: li, nomeEl: nomeEl, statoEl: statoEl, completezzaEl: completezzaEl };
    });
  }

  function aggiornaVoceSidebar(bu) {
    var rif = sidebarRefs[bu.id];
    if (!rif) { renderSidebar(); return; }
    var completezza = schema.completezza(bu);
    rif.nomeEl.textContent = bu.nome;
    rif.statoEl.textContent = schema.STATI_BU_ETICHETTE[bu.stato] || bu.stato;
    rif.completezzaEl.textContent = completezza.percentuale + '%';
  }

  // ---------------------------------------------------------------------
  // Render: area principale (header, tabs, vista)
  // ---------------------------------------------------------------------

  function renderMain() {
    var bu = ottieniBUAttiva();
    renderHeader(bu);
    renderTabs(bu);
    renderVistaAttuale(bu);
  }

  function renderHeader(bu) {
    var header = document.getElementById('bu-header');
    header.innerHTML = '';

    if (!bu) {
      header.appendChild(BU.ui.el('div', { class: 'bu-header-vuoto', text: 'Seleziona una business unit dalla barra laterale, o creane una nuova.' }));
      return;
    }

    var inputNome = BU.ui.el('input', {
      type: 'text', class: 'bu-header-nome', value: bu.nome,
      oninput: function (e) {
        bu.nome = e.target.value;
        segnalaModifica(bu);
      }
    });

    var selStato = BU.ui.el('select', {
      class: 'bu-header-stato',
      onchange: function (e) { bu.stato = e.target.value; segnalaModifica(bu); }
    }, schema.STATI_BU.map(function (s) {
      return BU.ui.el('option', { value: s, selected: s === bu.stato ? 'selected' : undefined }, [schema.STATI_BU_ETICHETTE[s]]);
    }));

    var completezza = schema.completezza(bu);
    var badgeCompletezza = BU.ui.el('span', { class: 'bu-header-completezza', text: completezza.compilati + '/' + completezza.totali + ' campi (' + completezza.percentuale + '%)' });

    var rigaAzioni = [badgeCompletezza];
    var bottoneSalva = null;
    if (stato.fileHandleDiBU[bu.id] && BU.cartella.haToken()) {
      bottoneSalva = BU.ui.el('button', {
        type: 'button', class: 'pulsante pulsante--primario',
        onclick: function () { salvaSuFile(bu); }
      }, ['Salva su GitHub']);
      rigaAzioni.push(bottoneSalva);
    }

    header.appendChild(BU.ui.el('div', { class: 'bu-header-riga1' }, [inputNome, selStato]));
    header.appendChild(BU.ui.el('div', { class: 'bu-header-riga2' }, rigaAzioni));

    headerRefs = { buId: bu.id, selStato: selStato, badgeCompletezza: badgeCompletezza, bottoneSalva: bottoneSalva };
  }

  // Aggiorna gli indicatori dell'header senza ricostruirlo (evita di perdere
  // il focus sull'input nome mentre si digita). Usata quando bu.stato o la
  // completezza cambiano da un'altra vista (es. una decisione in VALIDAZIONE).
  function aggiornaHeaderIndicatori(bu) {
    if (!headerRefs || headerRefs.buId !== bu.id) return;
    if (headerRefs.selStato.value !== bu.stato) headerRefs.selStato.value = bu.stato;
    var completezza = schema.completezza(bu);
    headerRefs.badgeCompletezza.textContent = completezza.compilati + '/' + completezza.totali + ' campi (' + completezza.percentuale + '%)';
  }

  function renderTabs(bu) {
    var tabs = document.getElementById('tabs');
    tabs.innerHTML = '';
    if (!bu) return;
    VISTE.forEach(function (v) {
      tabs.appendChild(BU.ui.el('button', {
        type: 'button',
        class: 'scheda-tab' + (stato.vista === v ? ' attiva' : ''),
        onclick: function () { selezionaVista(v); }
      }, [VISTE_ETICHETTE[v]]));
    });
  }

  function renderVistaAttuale(bu) {
    var container = document.getElementById('vista-container');
    container.innerHTML = '';
    if (!bu) return;

    var callback = function () { segnalaModifica(bu); };

    if (stato.vista === 'materiali') {
      BU.ui.renderMateriali(container, bu, callback);
    } else if (stato.vista === 'documento') {
      BU.ui.renderDocumento(container, bu, function () { scaricaDocumento(bu); });
    } else if (stato.vista === 'validazione') {
      BU.ui.renderValidazione(container, bu, callback);
    } else {
      BU.ui.renderCompila(container, bu, callback);
    }
  }

  // ---------------------------------------------------------------------
  // Avvio
  // ---------------------------------------------------------------------

  function collegaAzioniSidebar() {
    document.getElementById('bottone-nuova-bu').addEventListener('click', nuovaBU);
    document.getElementById('bottone-esporta-backup').addEventListener('click', esportaBackup);

    var inputFile = document.getElementById('input-ripristina-backup');
    document.getElementById('bottone-ripristina-backup').addEventListener('click', function () {
      inputFile.value = '';
      inputFile.click();
    });
    inputFile.addEventListener('change', function (e) {
      if (e.target.files && e.target.files[0]) ripristinaBackupDaFile(e.target.files[0]);
    });

    var bottoneAggiorna = document.getElementById('bottone-aggiorna-cartella');
    if (bottoneAggiorna) {
      bottoneAggiorna.addEventListener('click', function () {
        caricaDaCartella().catch(function (e) {
          global.alert('Impossibile aggiornare da GitHub: ' + e.message);
        });
      });
    }
  }

  function init() {
    stato.elenco = BU.store.carica();
    leggiHash();
    scriviHash();
    collegaAzioniSidebar();
    renderSidebar();
    renderMain();
    aggiornaControlliCartella();

    if (BU.cartella.supportata()) {
      caricaDaCartella().catch(function (e) {
        console.warn('BU Blueprint: impossibile leggere da GitHub, resto sui dati locali: ' + e.message);
      });
    }

    global.addEventListener('beforeunload', function () {
      if (timerSalvataggio) {
        global.clearTimeout(timerSalvataggio);
        BU.store.salva(stato.elenco);
      }
    });
  }

  BU.app = {
    init: init,
    stato: stato
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', init);
  }

}(typeof window !== 'undefined' ? window : this));
