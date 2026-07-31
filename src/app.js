/*
 * app.js
 * Avvio, routing (hash: #<idBU>/<vista>), sidebar, salvataggio differito,
 * backup/ripristino JSON, export Markdown della singola business unit.
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
    vista: 'compila'
  };

  var VISTE = ['compila', 'materiali', 'validazione'];
  var VISTE_ETICHETTE = { compila: 'Compila', materiali: 'Materiali', validazione: 'Validazione' };

  var timerSalvataggio = null;
  var sidebarRefs = {};
  var headerRefs = null; // { buId, selStato, badgeCompletezza }

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

  function esportaMarkdownBU(bu) {
    var righe = [];
    righe.push('# ' + bu.nome + ' — Materiali');
    righe.push('');
    righe.push('Stato: ' + (schema.STATI_BU_ETICHETTE[bu.stato] || bu.stato));
    righe.push('');
    BU.gen.elencaGeneratori().forEach(function (generatore) {
      var materiale = bu.materiali[generatore.id];
      var testo = materiale ? materiale.testo : generatore.genera(bu);
      righe.push('---');
      righe.push('');
      righe.push('<!-- Generatore: ' + generatore.nome +
        (materiale ? ' — stato revisione: ' + schema.STATI_MATERIALE_ETICHETTE[materiale.stato] : ' — non ancora salvato, generato al momento dell\'export') +
        ' -->');
      righe.push('');
      righe.push(testo);
      righe.push('');
    });
    scaricaFile(
      'bu-blueprint-' + bu.nome.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + dataPerNomeFile() + '.md',
      righe.join('\n'),
      'text/markdown'
    );
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

    var bottoneEsporta = BU.ui.el('button', {
      type: 'button', class: 'pulsante pulsante--secondario',
      onclick: function () { esportaMarkdownBU(bu); }
    }, ['Esporta Markdown']);

    header.appendChild(BU.ui.el('div', { class: 'bu-header-riga1' }, [inputNome, selStato]));
    header.appendChild(BU.ui.el('div', { class: 'bu-header-riga2' }, [badgeCompletezza, bottoneEsporta]));

    headerRefs = { buId: bu.id, selStato: selStato, badgeCompletezza: badgeCompletezza };
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
  }

  function init() {
    stato.elenco = BU.store.carica();
    leggiHash();
    scriviHash();
    collegaAzioniSidebar();
    renderSidebar();
    renderMain();

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
