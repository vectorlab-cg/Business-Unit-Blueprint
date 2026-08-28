/*
 * gen/12-pipeline-commerciale.js
 * Generatore "Pipeline commerciale": documento STATICO che definisce le
 * fasi e dove si inseriscono le due soglie del test. Non traccia i
 * contatti (niente CRM dentro lo strumento): quello resta fuori.
 */
(function (global) {
  'use strict';

  var BU = global.BU = global.BU || {};
  var schema = BU.schema;
  var render = BU.render;

  function fasi(bu) {
    return render.tabella(['#', 'Fase', 'Cosa la definisce'], [
      ['1', 'Lead', 'Contatto raggiunto tramite ' + render.testoCampo(bu, 'test', 'canale_test')],
      ['2', 'Qualificato', 'Corrisponde ai criteri dell\'Ideal Customer Profile'],
      ['3', 'Discovery fatta', 'Script discovery call completato'],
      ['4', 'Proposta inviata', 'Template proposta economica inviato'],
      ['5', 'Conversazione al prezzo', 'Segnale di mercato: ' + render.testoCampo(bu, 'test', 'soglia_mercato')],
      ['6', 'Chiuso vinto / perso', 'Contratto firmato, oppure lead qualificato come perso']
    ]);
  }

  function genera(bu) {
    var righe = [];
    righe.push('# Pipeline commerciale — ' + bu.nome);
    righe.push('');
    righe.push('_Documento statico: definisce le fasi, non le traccia. Per lo stato dei singoli' );
    righe.push('contatti serve uno strumento esterno (foglio di calcolo o CRM) — non è compito di' );
    righe.push('BU Blueprint tenere quel dato aggiornato._');
    righe.push('');
    righe.push('## Fasi');
    righe.push('_I passaggi da un primo contatto alla vendita, in ordine._');
    righe.push(fasi(bu));
    righe.push('');
    righe.push('## Dove si inseriscono le soglie del test');
    righe.push('_In quale fase esatta contano i due segnali che autorizzano a procedere._');
    righe.push('- Segnale di messaggio (' + render.testoCampo(bu, 'test', 'soglia_messaggio') + ') — tra Lead e Qualificato: autorizza a telefonare.');
    righe.push('- Segnale di mercato (' + render.testoCampo(bu, 'test', 'soglia_mercato') + ') — fase "Conversazione al prezzo": autorizza a costruire.');
    righe.push('');
    righe.push('## Come tracciarla');
    righe.push('_Con quale strumento si tiene traccia di ogni contatto, fase per fase._');
    righe.push(render.daScrivere('lo strumento scelto per tracciare i contatti fase per fase — foglio di calcolo, CRM leggero, ecc.'));
    righe.push('');
    return righe.join('\n');
  }

  BU.registraGeneratore({
    id: 'pipeline-commerciale',
    categoria: 'commerciale',
    nome: 'Pipeline commerciale',
    descrizione: 'Documento statico: le fasi della pipeline e dove si inseriscono le due soglie del test.',
    richiede: ['test.canale_test', 'test.soglia_mercato'],
    genera: genera
  });

}(typeof window !== 'undefined' ? window : this));
