/*
 * gen/03-landing.js
 * Generatore "Struttura landing page": otto sezioni fisse (hero, problema,
 * contrasto, offerta, prove, chi lo fa, FAQ, chiusura) più un prompt
 * compilato per scrivere i testi mancanti.
 */
(function (global) {
  'use strict';

  var BU = global.BU = global.BU || {};
  var schema = BU.schema;
  var render = BU.render;

  function sezioneHero(bu) {
    var righe = [];
    righe.push('Headline: ' + render.daScrivere('headline principale (vedi anche il generatore Proposta di valore)'));
    righe.push('Sottotitolo: ' + render.testoCampo(bu, 'offerta', 'risultato_promesso'));
    righe.push('CTA: ' + render.testoCampo(bu, 'test', 'azione_richiesta'));
    return righe.join('\n');
  }

  function sezioneProblema(bu) {
    if (!bu.leve || !bu.leve.length) return render.manca('almeno una leva per popolare la sezione problema');
    return bu.leve.map(function (leva) {
      var titolo = (leva.come_lo_chiama_lui && leva.come_lo_chiama_lui.trim()) ||
        (leva.fatto_osservabile && leva.fatto_osservabile.trim()) ||
        render.manca('leva senza testo');
      var righe = [];
      righe.push('### ' + titolo);
      righe.push(leva.fatto_osservabile || render.manca('fatto osservabile'));
      righe.push('_Nome tecnico del problema: ' + (leva.come_lo_chiami_tu || render.manca('come lo chiami tu')) + '_');
      return righe.join('\n');
    }).join('\n\n');
  }

  function sezioneContrasto(bu) {
    if (!bu.leve || !bu.leve.length) return render.manca('almeno una leva per la tabella di contrasto');
    var righe = bu.leve.map(function (leva) {
      return [
        leva.fatto_osservabile || render.manca('fatto osservabile'),
        leva.come_lo_elimini || render.manca('come lo elimini')
      ];
    });
    return render.tabella(['Prima (oggi)', 'Dopo (con ' + bu.nome + ')'], righe);
  }

  function sezioneOfferta(bu) {
    return [
      '- Servizio: ' + render.testoCampo(bu, 'offerta', 'servizio'),
      '- Unità di vendita: ' + render.testoCampo(bu, 'offerta', 'unita_vendita'),
      '- Risultato promesso: ' + render.testoCampo(bu, 'offerta', 'risultato_promesso'),
      '- Escluso: ' + render.testoCampo(bu, 'offerta', 'escluso'),
      '- Prezzo: ' + render.testoCampo(bu, 'offerta', 'prezzo'),
      '- Tempi: ' + render.testoCampo(bu, 'offerta', 'tempi')
    ].join('\n');
  }

  function sezioneProve(bu) {
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

  function sezioneChiLoFa(bu) {
    return render.listaMarkdown(bu, 'risorse', 'persone');
  }

  function faqAlternativa(bu) {
    return {
      domanda: 'In cosa siete diversi da: ' + render.senzaPuntoFinale(render.testoCampo(bu, 'mercato', 'alternativa_attuale')) + '?',
      risposta: render.senzaPuntoFinale(render.testoCampo(bu, 'identita', 'meccanismo')) + ', così che ' +
        render.senzaPuntoFinale(render.testoCampo(bu, 'offerta', 'risultato_promesso')) + '.'
    };
  }

  function faqPrezzo(bu) {
    return { domanda: 'Quanto costa?', risposta: render.testoCampo(bu, 'offerta', 'prezzo') };
  }

  function faqTempi(bu) {
    return { domanda: 'Quanto tempo richiede?', risposta: render.testoCampo(bu, 'offerta', 'tempi') };
  }

  function faqLeve(bu) {
    return (bu.leve || []).map(function (leva) {
      var domanda = (leva.come_lo_chiama_lui && leva.come_lo_chiama_lui.trim()) || render.manca('come lo chiama lui');
      var risposta = leva.come_lo_elimini || render.manca('come lo elimini');
      return { domanda: render.senzaPuntoFinale(domanda) + '?', risposta: risposta };
    });
  }

  function faqCompetenzeMancanti(bu) {
    var mancanti = render.righeLista(bu, 'risorse', 'competenze_mancanti');
    return {
      domanda: 'Serve qualcosa di specifico da parte nostra prima di iniziare?',
      risposta: mancanti
        ? render.daScrivere('risposta che tenga conto che mancano ancora: ' + mancanti.join('; '))
        : render.manca('competenze mancanti')
    };
  }

  function sezioneFaq(bu) {
    var voci = [faqAlternativa(bu), faqPrezzo(bu), faqTempi(bu)]
      .concat(faqLeve(bu))
      .concat([faqCompetenzeMancanti(bu)]);
    return voci.map(function (v) {
      return '**' + v.domanda + '**\n' + v.risposta;
    }).join('\n\n');
  }

  function sezioneChiusura(bu) {
    var righe = [];
    righe.push(render.senzaPuntoFinale(render.testoCampo(bu, 'offerta', 'risultato_promesso')) + '.');
    righe.push('**' + render.testoCampo(bu, 'test', 'azione_richiesta') + '**');
    righe.push(render.daScrivere('testo di chiusura e rassicurazione finale'));
    return righe.join('\n');
  }

  function promptTestiMancanti(bu) {
    var righe = [];
    righe.push('Scrivi i testi mancanti della landing page di "' + bu.nome + '" (segnati [DA SCRIVERE] nel documento).');
    righe.push('');
    righe.push('Cliente ideale: ' + render.testoCampo(bu, 'mercato', 'cliente_ideale'));
    righe.push('Decisore: ' + render.testoCampo(bu, 'mercato', 'decisore'));
    righe.push('Meccanismo: ' + render.testoCampo(bu, 'identita', 'meccanismo'));
    righe.push('Risultato promesso: ' + render.testoCampo(bu, 'offerta', 'risultato_promesso'));
    righe.push('Alternativa attuale: ' + render.testoCampo(bu, 'mercato', 'alternativa_attuale'));
    righe.push('Azione richiesta (CTA): ' + render.testoCampo(bu, 'test', 'azione_richiesta'));
    righe.push('');
    righe.push('Regole di scrittura:');
    righe.push('- Usa le parole del cliente (vedi "come lo chiama lui" nelle leve), non gergo interno.');
    righe.push('- Ogni frase deve essere verificabile o concreta, non uno slogan vago.');
    righe.push('- Non promettere risultati diversi da quello dichiarato in "risultato promesso".');
    righe.push('- Non nascondere "escluso": se serve, va reso esplicito nel testo.');
    righe.push('- Coerenza con la CTA: tutta la pagina deve portare a "' + render.testoCampo(bu, 'test', 'azione_richiesta') + '".');
    return '```\n' + righe.join('\n') + '\n```';
  }

  function genera(bu) {
    var righe = [];
    righe.push('# Struttura landing page — ' + bu.nome);
    righe.push('');
    righe.push('## 1. Hero');
    righe.push(sezioneHero(bu));
    righe.push('');
    righe.push('## 2. Problema');
    righe.push(sezioneProblema(bu));
    righe.push('');
    righe.push('## 3. Contrasto');
    righe.push(sezioneContrasto(bu));
    righe.push('');
    righe.push('## 4. Offerta');
    righe.push(sezioneOfferta(bu));
    righe.push('');
    righe.push('## 5. Prove');
    righe.push(sezioneProve(bu));
    righe.push('');
    righe.push('## 6. Chi lo fa');
    righe.push(sezioneChiLoFa(bu));
    righe.push('');
    righe.push('## 7. FAQ');
    righe.push(sezioneFaq(bu));
    righe.push('');
    righe.push('## 8. Chiusura');
    righe.push(sezioneChiusura(bu));
    righe.push('');
    righe.push('## Prompt per scrivere i testi mancanti');
    righe.push(promptTestiMancanti(bu));
    righe.push('');
    return righe.join('\n');
  }

  BU.registraGeneratore({
    id: 'landing',
    nome: 'Struttura landing page',
    descrizione: 'Otto sezioni fisse (hero, problema, contrasto, offerta, prove, chi lo fa, FAQ, chiusura) e un prompt per i testi mancanti.',
    richiede: [
      'offerta.risultato_promesso', 'test.azione_richiesta', 'offerta.servizio',
      'offerta.prezzo', 'mercato.alternativa_attuale'
    ],
    genera: genera
  });

}(typeof window !== 'undefined' ? window : this));
