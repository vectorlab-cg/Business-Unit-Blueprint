/*
 * gen/07-demo-brief.js
 * Generatore "Brief demo/mockup": non è un testo pubblicabile, è un brief
 * per chi costruisce la demo — cosa mostrare, quale leva dimostra, per chi.
 */
(function (global) {
  'use strict';

  var BU = global.BU = global.BU || {};
  var schema = BU.schema;
  var render = BU.render;

  function cosaDimostraOgniLeva(bu) {
    if (!bu.leve || !bu.leve.length) return render.manca('almeno una leva');
    var righe = bu.leve.map(function (leva) {
      return (leva.fatto_osservabile || render.manca('fatto osservabile')) +
        ' → nella demo si vede: ' + (leva.come_lo_elimini || render.manca('come lo elimini'));
    });
    return render.elencoPuntato(righe);
  }

  function genera(bu) {
    var righe = [];
    righe.push('# Brief demo/mockup — ' + bu.nome);
    righe.push(render.legendaStatiCampo());
    righe.push('');
    righe.push('_Questo non è il materiale finale: è il brief per chi costruisce la demo o il mockup._');
    righe.push('');
    righe.push('## Obiettivo');
    righe.push('Dimostrare a ' + render.senzaPuntoFinale(render.testoCampo(bu, 'mercato', 'decisore')) + ' che ' +
      render.senzaPuntoFinale(render.testoCampo(bu, 'offerta', 'risultato_promesso')) + '.');
    righe.push('');
    righe.push('## Pubblico');
    righe.push(render.senzaPuntoFinale(render.testoCampo(bu, 'mercato', 'decisore')) + ' di ' +
      render.senzaPuntoFinale(render.testoCampo(bu, 'mercato', 'cliente_ideale')) + '.');
    righe.push('');
    righe.push('## Cosa dimostrare, leva per leva');
    righe.push(cosaDimostraOgniLeva(bu));
    righe.push('');
    righe.push('## Percorso della demo');
    righe.push(render.daScrivere('schermate o passaggi della demo/mockup, in ordine'));
    righe.push('');
    righe.push('## Cosa non deve includere');
    righe.push(render.testoCampoConStato(bu, 'offerta', 'escluso'));
    righe.push('');
    return righe.join('\n');
  }

  BU.registraGeneratore({
    id: 'demo-brief',
    nome: 'Brief demo/mockup',
    descrizione: 'Obiettivo, pubblico, cosa dimostrare leva per leva: il brief per chi costruisce la demo.',
    richiede: ['mercato.decisore', 'mercato.cliente_ideale', 'offerta.risultato_promesso'],
    genera: genera
  });

}(typeof window !== 'undefined' ? window : this));
