/*
 * gen/11-template-proposta-economica.js
 * Generatore "Template proposta economica": documento inviabile al
 * cliente, con i campi da personalizzare marcati esplicitamente.
 */
(function (global) {
  'use strict';

  var BU = global.BU = global.BU || {};
  var schema = BU.schema;
  var render = BU.render;

  function genera(bu) {
    var righe = [];
    righe.push('# Proposta economica — ' + bu.nome);
    righe.push('');
    righe.push('A: ' + render.daScrivere('nome del cliente e referente'));
    righe.push('Data: ' + render.daScrivere('data di invio'));
    righe.push('');
    righe.push('## Il problema che affrontiamo insieme');
    righe.push(render.testoCampo(bu, 'identita', 'descrizione'));
    righe.push('');
    righe.push('## Cosa proponiamo');
    righe.push(render.testoCampo(bu, 'offerta', 'servizio'));
    righe.push('');
    righe.push('## Risultato atteso');
    righe.push(render.testoCampo(bu, 'offerta', 'risultato_promesso'));
    righe.push('');
    righe.push('## Cosa non include');
    righe.push(render.testoCampo(bu, 'offerta', 'escluso'));
    righe.push('');
    righe.push('## Investimento');
    righe.push(render.testoCampo(bu, 'offerta', 'prezzo'));
    righe.push('');
    righe.push('## Tempi');
    righe.push(render.testoCampo(bu, 'offerta', 'tempi'));
    righe.push('');
    righe.push('## Validità dell\'offerta');
    righe.push(render.daScrivere('per quanti giorni resta valida questa proposta'));
    righe.push('');
    righe.push('## Prossimo passo');
    righe.push(render.testoCampo(bu, 'test', 'azione_richiesta'));
    righe.push('');
    return righe.join('\n');
  }

  BU.registraGeneratore({
    id: 'template-proposta-economica',
    nome: 'Template proposta economica',
    descrizione: 'Documento inviabile al cliente: problema, proposta, cosa non include, investimento, tempi, validità.',
    richiede: ['identita.descrizione', 'offerta.servizio', 'offerta.prezzo'],
    genera: genera
  });

}(typeof window !== 'undefined' ? window : this));
