/*
 * gen/13-dashboard-kpi.js
 * Generatore "Dashboard KPI": documento STATICO, una fotografia dei
 * risultati inseriti in VALIDAZIONE al momento della generazione — non un
 * cruscotto vivo dentro l'app.
 */
(function (global) {
  'use strict';

  var BU = global.BU = global.BU || {};
  var schema = BU.schema;
  var render = BU.render;

  function tabellaMetriche(bu) {
    var righe = schema.RISULTATI.map(function (def) {
      var valore = bu.risultati && bu.risultati[def.chiave] && String(bu.risultati[def.chiave]).trim();
      return [
        def.etichetta,
        valore || render.manca('valore (vedi vista Validazione)'),
        def.decide ? 'Sì — decide' : 'No'
      ];
    });
    return render.tabella(['Metrica', 'Valore attuale', 'Decide davvero?'], righe);
  }

  function genera(bu) {
    var righe = [];
    righe.push('# Dashboard KPI — ' + bu.nome);
    righe.push('');
    righe.push('_Fotografia dei risultati inseriti nella vista Validazione al momento della' );
    righe.push('generazione. Non si aggiorna da sola: rigenera dopo aver aggiornato i risultati._');
    righe.push('');
    righe.push('## Metriche');
    righe.push('_I numeri del test, così come inseriti in Validazione._');
    righe.push(tabellaMetriche(bu));
    righe.push('');
    righe.push('## Soglie di riferimento');
    righe.push('_I due valori che, se raggiunti, autorizzano il passo successivo._');
    righe.push('- Segnale di messaggio (autorizza a telefonare): ' + render.testoCampo(bu, 'test', 'soglia_messaggio'));
    righe.push('- Segnale di mercato (autorizza a costruire): ' + render.testoCampo(bu, 'test', 'soglia_mercato'));
    righe.push('');
    return righe.join('\n');
  }

  BU.registraGeneratore({
    id: 'dashboard-kpi',
    nome: 'Dashboard KPI',
    descrizione: 'Fotografia statica dei risultati del test rispetto alle metriche che decidono davvero.',
    richiede: ['test.soglia_messaggio', 'test.soglia_mercato'],
    genera: genera
  });

}(typeof window !== 'undefined' ? window : this));
