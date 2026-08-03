/*
 * gen/09-presentazione-commerciale.js
 * Generatore "Presentazione commerciale": struttura slide-per-slide di un
 * deck di vendita, dagli stessi campi della landing ma nel formato
 * presentazione.
 */
(function (global) {
  'use strict';

  var BU = global.BU = global.BU || {};
  var schema = BU.schema;
  var render = BU.render;

  function slideProblema(bu) {
    if (!bu.leve || !bu.leve.length) return render.manca('almeno una leva');
    var dalRisultato = schema.apertura(bu) === 'risultato';
    var righe = bu.leve.map(function (leva) {
      return dalRisultato
        ? '- ' + (leva.come_lo_elimini || render.manca('come lo elimini')) + ' _(oggi: ' + (leva.fatto_osservabile || render.manca('fatto osservabile')) + ')_'
        : '- ' + (leva.fatto_osservabile || render.manca('fatto osservabile'));
    });
    return righe.join('\n');
  }

  function slideProve() {
    return [
      render.daScrivere('caso reale o riferimento, se disponibile'),
      render.daScrivere('numero che dia peso (progetti, tempo risparmiato, ecc.)')
    ].join('\n');
  }

  function slideOfferta(bu) {
    return [
      '- Servizio: ' + render.testoCampo(bu, 'offerta', 'servizio'),
      '- Prezzo: ' + render.testoCampo(bu, 'offerta', 'prezzo'),
      '- Escluso: ' + render.testoCampo(bu, 'offerta', 'escluso'),
      '- Tempi: ' + render.testoCampo(bu, 'offerta', 'tempi')
    ].join('\n');
  }

  function slideChiSiamo(bu) {
    return render.listaMarkdown(bu, 'risorse', 'persone');
  }

  function genera(bu) {
    var righe = [];
    righe.push('# Presentazione commerciale — ' + bu.nome);
    righe.push('');
    righe.push('## Slide 1 — Titolo');
    righe.push(bu.nome + ': ' + render.testoCampo(bu, 'identita', 'descrizione'));
    righe.push('');
    righe.push('## Slide 2 — Il problema');
    righe.push(slideProblema(bu));
    righe.push('');
    righe.push('## Slide 3 — La soluzione');
    righe.push(render.testoCampo(bu, 'identita', 'meccanismo'));
    righe.push('');
    righe.push('## Slide 4 — Prove');
    righe.push(slideProve());
    righe.push('');
    righe.push('## Slide 5 — Offerta');
    righe.push(slideOfferta(bu));
    righe.push('');
    righe.push('## Slide 6 — Chi siamo');
    righe.push(slideChiSiamo(bu));
    righe.push('');
    righe.push('## Slide 7 — Prossimi passi');
    righe.push(render.testoCampo(bu, 'test', 'azione_richiesta'));
    righe.push('');
    return righe.join('\n');
  }

  BU.registraGeneratore({
    id: 'presentazione-commerciale',
    nome: 'Presentazione commerciale',
    descrizione: 'Struttura slide-per-slide di un deck di vendita: problema, soluzione, prove, offerta, prossimi passi.',
    richiede: ['identita.descrizione', 'identita.meccanismo', 'offerta.servizio', 'offerta.prezzo'],
    genera: genera
  });

}(typeof window !== 'undefined' ? window : this));
