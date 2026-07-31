/*
 * gen/01-scheda.js
 * Generatore "Scheda business unit" — interamente deterministico.
 * Sintesi, meccanismo, cliente, tabella delle leve, offerta, risorse,
 * stato della conoscenza, domande aperte, cosa fermerebbe questa BU.
 */
(function (global) {
  'use strict';

  var BU = global.BU = global.BU || {};
  var schema = BU.schema;
  var render = BU.render;

  function campoConNota(bu, sezione, chiave) {
    var def = schema.trovaCampoDef(sezione, chiave);
    var campo = schema.ottieniCampo(bu, sezione, chiave);
    var testo = render.testoCampo(bu, sezione, chiave);
    if (!schema.campoHaValore(campo, def.tipo)) return testo;
    var stato = render.etichettaStatoCampo(campo);
    return testo + ' _(' + stato + ')_';
  }

  function sezioneCliente(bu) {
    return [
      '- Cliente ideale: ' + campoConNota(bu, 'mercato', 'cliente_ideale'),
      '- Decisore: ' + campoConNota(bu, 'mercato', 'decisore'),
      '- Contesto del decisore: ' + campoConNota(bu, 'mercato', 'contesto_decisore'),
      '- Alternativa attuale: ' + campoConNota(bu, 'mercato', 'alternativa_attuale')
    ].join('\n');
  }

  function sezioneOfferta(bu) {
    return [
      '- Servizio: ' + campoConNota(bu, 'offerta', 'servizio'),
      '- Unità di vendita: ' + campoConNota(bu, 'offerta', 'unita_vendita'),
      '- Risultato promesso: ' + campoConNota(bu, 'offerta', 'risultato_promesso'),
      '- Escluso: ' + campoConNota(bu, 'offerta', 'escluso'),
      '- Prezzo: ' + campoConNota(bu, 'offerta', 'prezzo'),
      '- Modalità di vendita: ' + campoConNota(bu, 'offerta', 'modalita_vendita'),
      '- Tempi: ' + campoConNota(bu, 'offerta', 'tempi')
    ].join('\n');
  }

  function sezioneRisorse(bu) {
    return [
      '**Competenze presenti**',
      render.listaMarkdown(bu, 'risorse', 'competenze_presenti'),
      '',
      '**Competenze mancanti**',
      render.listaMarkdown(bu, 'risorse', 'competenze_mancanti'),
      '',
      '**Persone**',
      render.listaMarkdown(bu, 'risorse', 'persone')
    ].join('\n');
  }

  function tabellaLeve(bu) {
    if (!bu.leve || !bu.leve.length) {
      return render.manca('almeno una leva');
    }
    var righe = bu.leve.map(function (leva) {
      return [
        schema.TIPI_LEVA_ETICHETTE[leva.tipo] || leva.tipo,
        leva.fatto_osservabile || render.manca('fatto osservabile'),
        leva.come_lo_chiama_lui || render.manca('come lo chiama lui'),
        leva.come_lo_chiami_tu || render.manca('come lo chiami tu'),
        leva.come_lo_elimini || render.manca('come lo elimini')
      ];
    });
    return render.tabella(
      ['Tipo', 'Fatto osservabile', 'Come lo chiama lui', 'Come lo chiami tu', 'Come lo elimini'],
      righe
    );
  }

  function statoDellaConoscenza(bu) {
    var conteggi = {};
    schema.STATI_CAMPO.forEach(function (s) { conteggi[s] = 0; });
    schema.CAMPI.forEach(function (def) {
      var campo = schema.ottieniCampo(bu, def.sezione, def.chiave);
      var statoEff = schema.statoEffettivoCampo(campo);
      conteggi[statoEff] = (conteggi[statoEff] || 0) + 1;
    });
    var righe = schema.STATI_CAMPO.map(function (s) {
      return [schema.STATI_CAMPO_ETICHETTE[s], String(conteggi[s])];
    });
    return render.tabella(['Stato', 'Numero campi'], righe);
  }

  function campiAperti(bu) {
    var aperti = [];
    schema.CAMPI.forEach(function (def) {
      var campo = schema.ottieniCampo(bu, def.sezione, def.chiave);
      var haValore = schema.campoHaValore(campo, def.tipo);
      var statoEff = schema.statoEffettivoCampo(campo);
      if (!haValore || statoEff === 'da_verificare') {
        aperti.push({ def: def, vuoto: !haValore, stato: statoEff });
      }
    });
    return aperti;
  }

  function domandeAperte(bu) {
    var aperti = campiAperti(bu);
    if (!aperti.length) return 'Nessuna: tutti i campi sono compilati e non "da verificare".';
    var righe = aperti.map(function (a) {
      var sezioneEtichetta = (schema.SEZIONI.filter(function (s) { return s.chiave === a.def.sezione; })[0] || {}).etichetta || a.def.sezione;
      var stato = a.vuoto ? 'vuoto' : 'da verificare';
      return sezioneEtichetta + ' > ' + a.def.etichetta + ' — ' + stato;
    });
    return render.elencoPuntato(righe);
  }

  function cosaFermerebbe(bu) {
    var righe = [];

    // Campi critici mancanti
    var criticiMancanti = campiAperti(bu).filter(function (a) { return a.vuoto && a.def.critico; });
    if (criticiMancanti.length) {
      criticiMancanti.forEach(function (a) {
        var sezioneEtichetta = (schema.SEZIONI.filter(function (s) { return s.chiave === a.def.sezione; })[0] || {}).etichetta || a.def.sezione;
        righe.push('Campo critico mancante: ' + sezioneEtichetta + ' > ' + a.def.etichetta);
      });
    }

    // Leve senza soluzione
    (bu.leve || []).forEach(function (leva, i) {
      if (!leva.come_lo_elimini || !leva.come_lo_elimini.trim()) {
        var nome = (leva.fatto_osservabile && leva.fatto_osservabile.trim()) || ('leva #' + (i + 1));
        righe.push('Leva senza soluzione: "' + nome + '" non ha ancora un modo per eliminarla.');
      }
    });

    // Prezzo non verificato
    var campoPrezzo = schema.ottieniCampo(bu, 'offerta', 'prezzo');
    if (schema.campoHaValore(campoPrezzo, 'testo') && schema.statoEffettivoCampo(campoPrezzo) !== 'verificata') {
      righe.push('Prezzo non verificato (stato: ' + render.etichettaStatoCampo(campoPrezzo) + ').');
    }

    // Troppe competenze mancanti
    var presenti = render.righeLista(bu, 'risorse', 'competenze_presenti') || [];
    var mancanti = render.righeLista(bu, 'risorse', 'competenze_mancanti') || [];
    if (mancanti.length >= 2 && mancanti.length > presenti.length) {
      righe.push('Competenze mancanti (' + mancanti.length + ') superano quelle presenti (' + presenti.length + ').');
    }

    // Soglia di mercato non definita
    var campoSogliaMercato = schema.ottieniCampo(bu, 'test', 'soglia_mercato');
    if (!schema.campoHaValore(campoSogliaMercato, 'testo')) {
      righe.push('Soglia di mercato non definita: senza questa soglia nessun risultato del test può autorizzare a costruire.');
    }

    if (!righe.length) return 'Nessun elemento bloccante rilevato al momento.';
    return render.elencoPuntato(righe);
  }

  function genera(bu) {
    var righe = [];
    righe.push('# Scheda business unit — ' + bu.nome);
    righe.push('');
    righe.push('Stato: ' + (schema.STATI_BU_ETICHETTE[bu.stato] || bu.stato));
    righe.push('');
    righe.push('## Sintesi');
    righe.push(render.testoCampo(bu, 'identita', 'descrizione'));
    righe.push('');
    righe.push('## Meccanismo');
    righe.push(render.testoCampo(bu, 'identita', 'meccanismo'));
    righe.push('');
    righe.push('## Cliente');
    righe.push(sezioneCliente(bu));
    righe.push('');
    righe.push('## Leve');
    righe.push(tabellaLeve(bu));
    righe.push('');
    righe.push('## Offerta');
    righe.push(sezioneOfferta(bu));
    righe.push('');
    righe.push('## Risorse');
    righe.push(sezioneRisorse(bu));
    righe.push('');
    righe.push('## Stato della conoscenza');
    righe.push(statoDellaConoscenza(bu));
    righe.push('');
    righe.push('## Domande aperte');
    righe.push(domandeAperte(bu));
    righe.push('');
    righe.push('## Cosa fermerebbe questa business unit');
    righe.push(cosaFermerebbe(bu));
    righe.push('');
    return righe.join('\n');
  }

  BU.registraGeneratore({
    id: 'scheda',
    nome: 'Scheda business unit',
    descrizione: 'Sintesi deterministica di identità, mercato, leve, offerta, risorse e stato della conoscenza.',
    richiede: schema.CAMPI.filter(function (c) { return c.critico; }).map(function (c) { return c.sezione + '.' + c.chiave; }),
    genera: genera
  });

}(typeof window !== 'undefined' ? window : this));
