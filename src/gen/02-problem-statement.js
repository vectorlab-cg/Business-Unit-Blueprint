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
      '- Cliente: ' + render.testoCampoConStato(bu, 'mercato', 'cliente_ideale'),
      '- Decisore: ' + render.testoCampoConStato(bu, 'mercato', 'decisore')
    ].join('\n');
  }

  function ilProblema(bu) {
    if (!bu.leve || !bu.leve.length) return render.manca('almeno una leva');
    return bu.leve.map(function (leva, i) {
      var righe = [];
      righe.push((i + 1) + '. ' + (leva.fatto_osservabile || render.manca('fatto osservabile')) + ' ' + render.badgeStatoLeva(leva));
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

  // Campi mandatori: quelli su cui questo problem statement può appoggiarsi
  // senza doverli rimettere in discussione la prossima volta che si legge.
  function cosaEGiaMandatorio(bu) {
    var righe = [];
    schema.CAMPI.forEach(function (def) {
      var campo = schema.ottieniCampo(bu, def.sezione, def.chiave);
      if (schema.statoEffettivoCampo(campo) === 'mandatorio' && schema.campoHaValore(campo, def.tipo)) {
        righe.push(def.etichetta + ': ' + render.testoCampo(bu, def.sezione, def.chiave));
      }
    });
    if (!righe.length) return render.manca('almeno un campo segnato come confermato');
    return render.elencoPuntato(righe);
  }

  function genera(bu) {
    var righe = [];
    righe.push('# Problem Statement — ' + bu.nome);
    righe.push(render.legendaStatiCampo());
    righe.push('');
    righe.push('## Chi ha il problema');
    righe.push('_Chi lo subisce (cliente) e chi decide di risolverlo (decisore) — spesso non la stessa persona._');
    righe.push(chiHaIlProblema(bu));
    righe.push('');
    righe.push('## Il problema');
    righe.push('_Le leve, una per una: il sintomo, come lo chiama il cliente, il nome tecnico._');
    righe.push(ilProblema(bu));
    righe.push('');
    righe.push('## Perché adesso');
    righe.push('_Cosa rende urgente risolverlo proprio ora, non fra sei mesi._');
    righe.push(render.testoCampoConStato(bu, 'mercato', 'contesto_decisore'));
    righe.push('');
    righe.push('## Perché le soluzioni attuali non bastano');
    righe.push('_Cosa fa oggi il cliente per questo problema, e perché non basta._');
    righe.push(perNonBastano(bu));
    righe.push('');
    righe.push('## Costo di non risolverlo');
    righe.push('_Quanto costa al cliente lasciare il problema com\'è — tempo, denaro, rischio._');
    righe.push(render.daScrivere('quantificare il costo per il cliente di lasciare il problema irrisolto — tempo, denaro, rischio'));
    righe.push('');
    righe.push('## Cosa è già confermato');
    righe.push('_I campi già decisi (non ipotesi), su cui questo problem statement può appoggiarsi._');
    righe.push(cosaEGiaMandatorio(bu));
    righe.push('');
    return righe.join('\n');
  }

  BU.registraGeneratore({
    id: 'problem-statement',
    categoria: 'fondamenta',
    nome: 'Problem Statement',
    descrizione: 'Chi ha il problema, il problema dalle leve, perché adesso, perché le soluzioni attuali non bastano.',
    richiede: ['mercato.cliente_ideale', 'mercato.decisore', 'mercato.alternativa_attuale'],
    genera: genera
  });

}(typeof window !== 'undefined' ? window : this));
