/*
 * gen/06-offerta-pilota.js
 * Generatore "Offerta pilota": confronto con l'offerta standard, prezzo,
 * durata, criteri di successo, cosa succede dopo.
 */
(function (global) {
  'use strict';

  var BU = global.BU = global.BU || {};
  var schema = BU.schema;
  var render = BU.render;

  function confronto(bu, sezioneStandard, chiaveStandard, sezionePilota, chiavePilota) {
    return [
      '- Standard: ' + render.testoCampoConStato(bu, sezioneStandard, chiaveStandard),
      '- Pilota: ' + render.testoCampoConStato(bu, sezionePilota, chiavePilota)
    ].join('\n');
  }

  function criteriSuccesso(bu) {
    return render.listaMarkdown(bu, 'pilota', 'criteri_successo_pilota');
  }

  function genera(bu) {
    var righe = [];
    righe.push('# Offerta pilota — ' + bu.nome);
    righe.push(render.legendaStatiCampo());
    righe.push('');
    righe.push('_Versione ridotta dell\'offerta standard, pensata per abbassare la soglia d\'ingresso' );
    righe.push('del primo cliente (o dei primi clienti)._');
    righe.push('');
    righe.push('## Servizio');
    righe.push(confronto(bu, 'offerta', 'servizio', 'pilota', 'servizio_pilota'));
    righe.push('');
    righe.push('## Prezzo');
    righe.push(confronto(bu, 'offerta', 'prezzo', 'pilota', 'prezzo_pilota'));
    righe.push('');
    righe.push('## Durata del pilota');
    righe.push(render.testoCampo(bu, 'pilota', 'durata_pilota'));
    righe.push('');
    righe.push('## Criteri di successo');
    righe.push('_Cosa deve succedere perché il pilota sia considerato riuscito._');
    righe.push(criteriSuccesso(bu));
    righe.push('');
    righe.push('## Dopo il pilota');
    righe.push(render.daScrivere('condizioni di passaggio dal pilota all\'offerta standard, se il pilota ha successo'));
    righe.push('');
    return righe.join('\n');
  }

  BU.registraGeneratore({
    id: 'offerta-pilota',
    nome: 'Offerta pilota',
    descrizione: 'Confronto con l\'offerta standard, prezzo, durata, criteri di successo del pilota.',
    richiede: ['pilota.servizio_pilota', 'pilota.prezzo_pilota', 'offerta.servizio', 'offerta.prezzo'],
    genera: genera
  });

}(typeof window !== 'undefined' ? window : this));
