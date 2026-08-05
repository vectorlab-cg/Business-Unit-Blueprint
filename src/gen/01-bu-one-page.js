/*
 * gen/01-bu-one-page.js
 * Generatore "BU One-Page": la sintesi di una pagina. Cosa facciamo, per
 * chi, offerta, pilota, leve principali, cosa fermerebbe questa BU.
 * Interamente deterministico.
 */
(function (global) {
  'use strict';

  var BU = global.BU = global.BU || {};
  var schema = BU.schema;
  var render = BU.render;

  function sezionePerChi(bu) {
    return [
      '- Cliente ideale: ' + render.testoCampoConStato(bu, 'mercato', 'cliente_ideale'),
      '- Decisore: ' + render.testoCampoConStato(bu, 'mercato', 'decisore'),
      '- Oggi fa così: ' + render.testoCampoConStato(bu, 'mercato', 'alternativa_attuale')
    ].join('\n');
  }

  function sezioneOfferta(bu) {
    return [
      '- Servizio: ' + render.testoCampoConStato(bu, 'offerta', 'servizio'),
      '- Risultato promesso: ' + render.testoCampoConStato(bu, 'offerta', 'risultato_promesso'),
      '- Prezzo: ' + render.testoCampoConStato(bu, 'offerta', 'prezzo'),
      '- Tempi: ' + render.testoCampoConStato(bu, 'offerta', 'tempi')
    ].join('\n');
  }

  function sezionePilota(bu) {
    var servizio = schema.ottieniCampo(bu, 'pilota', 'servizio_pilota');
    var prezzo = schema.ottieniCampo(bu, 'pilota', 'prezzo_pilota');
    if (!schema.campoHaValore(servizio, 'testo') && !schema.campoHaValore(prezzo, 'testo')) {
      return render.manca('offerta pilota (vedi il generatore dedicato)');
    }
    return [
      '- Servizio: ' + render.testoCampoConStato(bu, 'pilota', 'servizio_pilota'),
      '- Prezzo: ' + render.testoCampoConStato(bu, 'pilota', 'prezzo_pilota'),
      '- Durata: ' + render.testoCampo(bu, 'pilota', 'durata_pilota')
    ].join('\n');
  }

  function levePrincipali(bu) {
    if (!bu.leve || !bu.leve.length) return render.manca('almeno una leva');
    var righe = bu.leve.map(function (leva) {
      return (leva.fatto_osservabile || render.manca('fatto osservabile')) +
        ' → ' + (leva.come_lo_elimini || render.manca('come lo elimini'));
    });
    return render.elencoPuntato(righe);
  }

  // Stessa logica di controllo usata dagli altri generatori sullo stato
  // della BU: qui condensata, perché il one-pager deve restare una pagina.
  function cosaFermerebbe(bu) {
    var righe = [];

    schema.CAMPI.forEach(function (def) {
      if (!def.critico) return;
      var campo = schema.ottieniCampo(bu, def.sezione, def.chiave);
      if (!schema.campoHaValore(campo, def.tipo)) {
        var sezioneEtichetta = (schema.SEZIONI.filter(function (s) { return s.chiave === def.sezione; })[0] || {}).etichetta || def.sezione;
        righe.push('Campo critico mancante: ' + sezioneEtichetta + ' > ' + def.etichetta);
      }
    });

    (bu.leve || []).forEach(function (leva, i) {
      if (!leva.come_lo_elimini || !leva.come_lo_elimini.trim()) {
        var nome = (leva.fatto_osservabile && leva.fatto_osservabile.trim()) || ('leva #' + (i + 1));
        righe.push('Leva senza soluzione: "' + nome + '".');
      }
    });

    var campoPrezzo = schema.ottieniCampo(bu, 'offerta', 'prezzo');
    if (schema.campoHaValore(campoPrezzo, 'testo') && schema.statoEffettivoCampo(campoPrezzo) !== 'mandatorio') {
      righe.push('Prezzo non mandatorio (stato: ' + render.etichettaStatoCampo(campoPrezzo) + ').');
    }

    var presenti = render.righeLista(bu, 'risorse', 'competenze_presenti') || [];
    var mancanti = render.righeLista(bu, 'risorse', 'competenze_mancanti') || [];
    if (mancanti.length >= 2 && mancanti.length > presenti.length) {
      righe.push('Competenze mancanti (' + mancanti.length + ') superano quelle presenti (' + presenti.length + ').');
    }

    var campoSogliaMercato = schema.ottieniCampo(bu, 'test', 'soglia_mercato');
    if (!schema.campoHaValore(campoSogliaMercato, 'testo')) {
      righe.push('Soglia di mercato non definita: nessun risultato del test può autorizzare a costruire.');
    }

    if (!righe.length) return 'Nessun elemento bloccante rilevato al momento.';
    return render.elencoPuntato(righe);
  }

  function genera(bu) {
    var righe = [];
    righe.push('# BU One-Page — ' + bu.nome);
    righe.push('');
    righe.push('Stato: ' + (schema.STATI_BU_ETICHETTE[bu.stato] || bu.stato) +
      ' · Apertura: ' + schema.APERTURE_ETICHETTE[schema.apertura(bu)] +
      (schema.aperturaDecisa(bu) ? '' : ' _(non ancora decisa)_'));
    righe.push('');
    righe.push('## Cosa facciamo');
    righe.push(render.testoCampoConStato(bu, 'identita', 'descrizione'));
    righe.push('');
    righe.push(render.testoCampoConStato(bu, 'identita', 'meccanismo'));
    righe.push('');
    righe.push('## Per chi');
    righe.push(sezionePerChi(bu));
    righe.push('');
    righe.push('## Offerta');
    righe.push(sezioneOfferta(bu));
    righe.push('');
    righe.push('## Pilota');
    righe.push(sezionePilota(bu));
    righe.push('');
    righe.push('## Leve principali');
    righe.push(levePrincipali(bu));
    righe.push('');
    righe.push('## Cosa fermerebbe questa business unit');
    righe.push(cosaFermerebbe(bu));
    righe.push('');
    return righe.join('\n');
  }

  BU.registraGeneratore({
    id: 'bu-one-page',
    nome: 'BU One-Page',
    descrizione: 'La sintesi di una pagina: cosa facciamo, per chi, offerta, pilota, leve principali, cosa fermerebbe la BU.',
    richiede: schema.CAMPI.filter(function (c) { return c.critico; }).map(function (c) { return c.sezione + '.' + c.chiave; }),
    genera: genera
  });

}(typeof window !== 'undefined' ? window : this));
