/*
 * gen/10-script-discovery-call.js
 * Generatore "Script discovery call": apertura, domande di scoperta
 * (dalle leve), domande di qualificazione, transizione all'offerta,
 * chiusura.
 */
(function (global) {
  'use strict';

  var BU = global.BU = global.BU || {};
  var schema = BU.schema;
  var render = BU.render;

  function domandeDiScoperta(bu) {
    if (!bu.leve || !bu.leve.length) return render.manca('almeno una leva');
    var righe = bu.leve.map(function (leva) {
      var righeLeva = [];
      righeLeva.push('- Chiedi: "Vi capita che ' + (leva.fatto_osservabile || render.manca('fatto osservabile')) + '"?');
      righeLeva.push('  Ascolta se lo chiamano: "' + (leva.come_lo_chiama_lui || render.manca('come lo chiama lui')) + '"');
      return righeLeva.join('\n');
    });
    return righe.join('\n');
  }

  function domandeDiQualificazione(bu) {
    return [
      '- Chi altro è coinvolto nella decisione, oltre a ' + render.senzaPuntoFinale(render.testoCampo(bu, 'mercato', 'decisore')) + '?',
      '- Cosa fate oggi al posto nostro? _(atteso: ' + render.testoCampo(bu, 'mercato', 'alternativa_attuale') + ')_',
      '- Cosa avete sul tavolo in questo momento? _(atteso: ' + render.testoCampo(bu, 'mercato', 'contesto_decisore') + ')_'
    ].join('\n');
  }

  function genera(bu) {
    var righe = [];
    righe.push('# Script discovery call — ' + bu.nome);
    righe.push('');
    righe.push('## Apertura');
    righe.push('_Come iniziare la call: contesto breve, prima di entrare nelle domande._');
    righe.push(render.daScrivere('rapport e contesto della call, breve'));
    righe.push('');
    righe.push('## Domande di scoperta');
    righe.push('_Per far emergere il problema con le parole del cliente, non le vostre._');
    righe.push(domandeDiScoperta(bu));
    righe.push('');
    righe.push('## Domande di qualificazione');
    righe.push('_Per capire se questo cliente è davvero adatto, prima di proporre l\'offerta._');
    righe.push(domandeDiQualificazione(bu));
    righe.push('');
    righe.push('## Gestione obiezioni');
    righe.push('_Le obiezioni più prevedibili e come rispondere, specialmente sull\'alternativa attuale._');
    righe.push(render.daScrivere('obiezioni comuni e come rispondere, in particolare sul confronto con: ' +
      render.testoCampo(bu, 'mercato', 'alternativa_attuale')));
    righe.push('');
    righe.push('## Transizione all\'offerta');
    righe.push('_Come si passa dalla scoperta alla proposta, senza sembrare un salto._');
    righe.push(render.testoCampo(bu, 'offerta', 'servizio') + ' — ' + render.testoCampo(bu, 'offerta', 'risultato_promesso'));
    righe.push('');
    righe.push('## Chiusura / prossimo passo');
    righe.push('_Cosa deve succedere subito dopo la call, in concreto._');
    righe.push(render.testoCampo(bu, 'test', 'azione_richiesta'));
    righe.push('');
    return righe.join('\n');
  }

  BU.registraGeneratore({
    id: 'script-discovery-call',
    nome: 'Script discovery call',
    descrizione: 'Domande di scoperta dalle leve, qualificazione, transizione all\'offerta, chiusura.',
    richiede: ['mercato.decisore', 'mercato.alternativa_attuale', 'offerta.servizio'],
    genera: genera
  });

}(typeof window !== 'undefined' ? window : this));
