/*
 * gen/03-icp.js
 * Generatore "Ideal Customer Profile": profilo, chi decide, segnali da
 * cercare (dalle leve), cosa fa oggi, criteri di esclusione.
 */
(function (global) {
  'use strict';

  var BU = global.BU = global.BU || {};
  var schema = BU.schema;
  var render = BU.render;

  function segnaliDaCercare(bu) {
    if (!bu.leve || !bu.leve.length) return render.manca('almeno una leva');
    var righe = bu.leve.map(function (leva) {
      return leva.fatto_osservabile || render.manca('fatto osservabile');
    });
    return render.elencoPuntato(righe);
  }

  function genera(bu) {
    var righe = [];
    righe.push('# Ideal Customer Profile — ' + bu.nome);
    righe.push(render.legendaStatiCampo());
    righe.push('');
    righe.push('## Profilo');
    righe.push(render.testoCampoConStato(bu, 'mercato', 'cliente_ideale'));
    righe.push('');
    righe.push('## Chi decide');
    righe.push('- Ruolo: ' + render.testoCampoConStato(bu, 'mercato', 'decisore'));
    righe.push('- Cosa ha sul tavolo quando arrivate: ' + render.testoCampoConStato(bu, 'mercato', 'contesto_decisore'));
    righe.push('');
    righe.push('## Segnali da cercare');
    righe.push('_Cosa succede, osservabile dall\'esterno, in un\'azienda che rientra in questo profilo._');
    righe.push(segnaliDaCercare(bu));
    righe.push('');
    righe.push('## Cosa fa oggi (la concorrenza reale)');
    righe.push(render.testoCampoConStato(bu, 'mercato', 'alternativa_attuale'));
    righe.push('');
    righe.push('## Criteri di esclusione');
    righe.push(render.daScrivere('chi assomiglia al cliente ideale ma non lo è, e perché — per non sprecare tempo di prospecting'));
    righe.push('');
    return righe.join('\n');
  }

  BU.registraGeneratore({
    id: 'icp',
    nome: 'Ideal Customer Profile',
    descrizione: 'Profilo del cliente, chi decide, segnali osservabili da cercare, cosa fa oggi, criteri di esclusione.',
    richiede: ['mercato.cliente_ideale', 'mercato.decisore', 'mercato.alternativa_attuale'],
    genera: genera
  });

}(typeof window !== 'undefined' ? window : this));
