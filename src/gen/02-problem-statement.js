/*
 * gen/02-problem-statement.js
 * Generatore "Problem Statement": chi ha il problema, il problema (dalle
 * leve), perché adesso, perché le soluzioni attuali non bastano, costo
 * di non risolverlo.
 */
(function (global) {
  'use strict';

  var BU = global.BU = global.BU || {};
  var schema = BU.schema;
  var render = BU.render;

  function chiHaIlProblema(bu) {
    return [
      '- Cliente: ' + render.testoCampo(bu, 'mercato', 'cliente_ideale'),
      '- Decisore: ' + render.testoCampo(bu, 'mercato', 'decisore')
    ].join('\n');
  }

  function ilProblema(bu) {
    if (!bu.leve || !bu.leve.length) return render.manca('almeno una leva');
    return bu.leve.map(function (leva, i) {
      var righe = [];
      righe.push((i + 1) + '. ' + (leva.fatto_osservabile || render.manca('fatto osservabile')));
      righe.push('   Il cliente lo descrive così: "' + (leva.come_lo_chiama_lui || render.manca('come lo chiama lui')) + '"');
      righe.push('   Nome tecnico: ' + (leva.come_lo_chiami_tu || render.manca('come lo chiami tu')));
      return righe.join('\n');
    }).join('\n');
  }

  function perNonBastano(bu) {
    var alternativa = render.senzaPuntoFinale(render.testoCampo(bu, 'mercato', 'alternativa_attuale'));
    var righe = [alternativa + '. Nello specifico:'];
    (bu.leve || []).forEach(function (leva) {
      righe.push('- non risolve: ' + (leva.come_lo_chiami_tu || render.manca('come lo chiami tu')));
    });
    return righe.join('\n');
  }

  function fonti(bu) {
    var righe = [];
    schema.CAMPI.forEach(function (def) {
      var campo = schema.ottieniCampo(bu, def.sezione, def.chiave);
      if (schema.statoEffettivoCampo(campo) === 'verificata' && campo.prova && campo.prova.trim()) {
        righe.push(def.etichetta + ': ' + campo.prova.trim());
      }
    });
    if (!righe.length) return render.manca('almeno un campo verificato con prova compilata');
    return render.elencoPuntato(righe);
  }

  function genera(bu) {
    var righe = [];
    righe.push('# Problem Statement — ' + bu.nome);
    righe.push('');
    righe.push('## Chi ha il problema');
    righe.push(chiHaIlProblema(bu));
    righe.push('');
    righe.push('## Il problema');
    righe.push(ilProblema(bu));
    righe.push('');
    righe.push('## Perché adesso');
    righe.push(render.testoCampo(bu, 'mercato', 'contesto_decisore'));
    righe.push('');
    righe.push('## Perché le soluzioni attuali non bastano');
    righe.push(perNonBastano(bu));
    righe.push('');
    righe.push('## Costo di non risolverlo');
    righe.push(render.daScrivere('quantificare il costo per il cliente di lasciare il problema irrisolto — tempo, denaro, rischio'));
    righe.push('');
    righe.push('## Fonti');
    righe.push(fonti(bu));
    righe.push('');
    return righe.join('\n');
  }

  BU.registraGeneratore({
    id: 'problem-statement',
    nome: 'Problem Statement',
    descrizione: 'Chi ha il problema, il problema dalle leve, perché adesso, perché le soluzioni attuali non bastano.',
    richiede: ['mercato.cliente_ideale', 'mercato.decisore', 'mercato.alternativa_attuale'],
    genera: genera
  });

}(typeof window !== 'undefined' ? window : this));
