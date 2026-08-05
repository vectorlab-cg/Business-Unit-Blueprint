/*
 * gen/15-swot.js
 * Generatore "Analisi SWOT": Forze e Debolezze sono meccaniche (da risorse
 * e dallo stato dei campi critici), Opportunità e Minacce sono parziali —
 * quello che richiede un giudizio sul mercato resta [DA SCRIVERE], non
 * viene inventato.
 */
(function (global) {
  'use strict';

  var BU = global.BU = global.BU || {};
  var schema = BU.schema;
  var render = BU.render;

  function forze(bu) {
    var righe = [];
    var presenti = render.righeLista(bu, 'risorse', 'competenze_presenti');
    if (presenti) presenti.forEach(function (r) { righe.push(r); });
    var persone = render.righeLista(bu, 'risorse', 'persone');
    if (persone) righe.push(persone.length + ' persone nel team: ' + persone.join('; '));
    var meccanismo = schema.ottieniCampo(bu, 'identita', 'meccanismo');
    if (schema.campoHaValore(meccanismo, 'testo')) {
      righe.push('Meccanismo distintivo: ' + render.testoCampoConStato(bu, 'identita', 'meccanismo'));
    }
    if (!righe.length) return render.manca('almeno una competenza presente o il meccanismo');
    return render.elencoPuntato(righe);
  }

  // Stessa logica di "cosa fermerebbe questa business unit" (BU One-Page),
  // riletta come debolezze: campi critici mancanti, leve senza soluzione,
  // prezzo non mandatorio, competenze mancanti elencate una per una.
  function debolezze(bu) {
    var righe = [];

    schema.CAMPI.forEach(function (def) {
      if (!def.critico) return;
      var campo = schema.ottieniCampo(bu, def.sezione, def.chiave);
      if (!schema.campoHaValore(campo, def.tipo)) {
        var sezioneEtichetta = (schema.SEZIONI.filter(function (s) { return s.chiave === def.sezione; })[0] || {}).etichetta || def.sezione;
        righe.push('Campo critico mancante: ' + sezioneEtichetta + ' > ' + def.etichetta);
      }
    });

    var mancanti = render.righeLista(bu, 'risorse', 'competenze_mancanti');
    if (mancanti) mancanti.forEach(function (r) { righe.push('Competenza mancante: ' + r); });

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

    if (!righe.length) return 'Nessuna debolezza rilevata dai dati compilati al momento.';
    return render.elencoPuntato(righe);
  }

  function opportunita(bu) {
    var righe = [];
    (bu.leve || []).forEach(function (leva) {
      if (leva.fatto_osservabile && leva.fatto_osservabile.trim()) {
        righe.push('Il mercato soffre di: ' + leva.fatto_osservabile.trim());
      }
    });
    var contesto = schema.ottieniCampo(bu, 'mercato', 'contesto_decisore');
    if (schema.campoHaValore(contesto, 'testo')) {
      righe.push('Momento del decisore: ' + render.testoCampoConStato(bu, 'mercato', 'contesto_decisore'));
    }
    var elenco = righe.length ? render.elencoPuntato(righe) : render.manca('almeno una leva o il contesto del decisore');
    return elenco + '\n\n' + render.daScrivere('trend di mercato più ampi che rendono questo il momento giusto — lo strumento non ha dati esterni, va aggiunto a mano');
  }

  function minacce(bu) {
    var righe = [
      'Alternativa attuale: ' + render.testoCampoConStato(bu, 'mercato', 'alternativa_attuale'),
      'Perché potrebbero non scegliervi: ' + render.testoCampoConStato(bu, 'mercato', 'differenziazione_competitiva')
    ];
    return render.elencoPuntato(righe) + '\n\n' +
      render.daScrivere('rischi macro (nuovi entranti, normative, dipendenze) — lo strumento non ha dati esterni, va aggiunto a mano');
  }

  function genera(bu) {
    var righe = [];
    righe.push('# Analisi SWOT — ' + bu.nome);
    righe.push(render.legendaStatiCampo());
    righe.push('');
    righe.push('_Forze e Debolezze sono ricavate dai dati compilati. Opportunità e Minacce sono' );
    righe.push('parziali: la parte che richiede un giudizio sul mercato resta segnata da scrivere,' );
    righe.push('non viene inventata._');
    righe.push('');
    righe.push('## Forze');
    righe.push(forze(bu));
    righe.push('');
    righe.push('## Debolezze');
    righe.push(debolezze(bu));
    righe.push('');
    righe.push('## Opportunità');
    righe.push(opportunita(bu));
    righe.push('');
    righe.push('## Minacce');
    righe.push(minacce(bu));
    righe.push('');
    return righe.join('\n');
  }

  BU.registraGeneratore({
    id: 'swot',
    nome: 'Analisi SWOT',
    descrizione: 'Forze e debolezze da risorse e dai campi critici, opportunità e minacce parziali: il giudizio di mercato resta da scrivere.',
    richiede: [
      'risorse.competenze_presenti', 'risorse.competenze_mancanti',
      'mercato.alternativa_attuale', 'mercato.differenziazione_competitiva'
    ],
    genera: genera
  });

}(typeof window !== 'undefined' ? window : this));
