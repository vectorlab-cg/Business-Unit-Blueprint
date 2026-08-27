/*
 * gen/16-dimensionamento.js
 * Generatore "Dimensionamento": mette fianco a fianco prezzo, costo di
 * erogazione, capacità e dimensione del mercato — i quattro dati che
 * insieme dicono se una BU vale l'investimento, non solo se il mercato la
 * vuole. Non calcola un ricavo potenziale da solo: i campi sono testo
 * libero (spesso una fascia, non un numero singolo), quindi la stima
 * finale resta un conto da fare a mano — coerente con "lo strumento non
 * inventa mai un dato che non può verificare".
 */
(function (global) {
  'use strict';

  var BU = global.BU = global.BU || {};
  var schema = BU.schema;
  var render = BU.render;

  function datiEconomici(bu) {
    return [
      '- Prezzo: ' + render.testoCampoConStato(bu, 'offerta', 'prezzo'),
      '- Costo di erogazione: ' + render.testoCampoConStato(bu, 'economia', 'costo_erogazione'),
      '- Capacità di erogazione: ' + render.testoCampoConStato(bu, 'economia', 'capacita_erogazione'),
      '- Dimensione del mercato: ' + render.testoCampoConStato(bu, 'economia', 'dimensione_mercato')
    ].join('\n');
  }

  function contestoCompetitivo(bu) {
    var righe = [];
    var sinergia = schema.ottieniCampo(bu, 'mercato', 'sinergia_altre_bu');
    if (schema.campoHaValore(sinergia, 'testo')) {
      righe.push('Sinergia con altre business unit: ' + render.testoCampoConStato(bu, 'mercato', 'sinergia_altre_bu'));
    }
    var concorrenti = render.righeLista(bu, 'mercato', 'concorrenti_diretti');
    if (concorrenti) righe.push('Concorrenti diretti: ' + concorrenti.join('; '));
    if (!righe.length) return render.manca('sinergia con altre BU o concorrenti diretti (facoltativi, ma aiutano la stima)');
    return render.elencoPuntato(righe);
  }

  function promptRicavoPotenziale(bu) {
    var righe = [];
    righe.push('Con questi dati su "' + bu.nome + '", stima un ricavo potenziale annuo a regime e un margine');
    righe.push('lordo indicativo — un ordine di grandezza, non un numero preciso:');
    righe.push('');
    righe.push('Prezzo: ' + render.testoCampo(bu, 'offerta', 'prezzo'));
    righe.push('Costo di erogazione: ' + render.testoCampo(bu, 'economia', 'costo_erogazione'));
    righe.push('Capacità di erogazione: ' + render.testoCampo(bu, 'economia', 'capacita_erogazione'));
    righe.push('Dimensione del mercato: ' + render.testoCampo(bu, 'economia', 'dimensione_mercato'));
    righe.push('');
    righe.push('Nota il vincolo che stringe di più: se la capacità è più bassa della domanda potenziale del');
    righe.push('mercato, è quella a fissare il tetto del ricavo, non il prezzo o il mercato da soli.');
    return '```\n' + righe.join('\n') + '\n```';
  }

  function genera(bu) {
    var righe = [];
    righe.push('# Dimensionamento — ' + bu.nome);
    righe.push(render.legendaStatiCampo());
    righe.push('');
    righe.push('_Non è un calcolo automatico: i campi sono spesso una fascia, non un numero singolo. Mette' );
    righe.push('fianco a fianco i dati perché il conto lo faccia una persona, invece di indovinarlo._');
    righe.push('');
    righe.push('## Prezzo, costo e capacità');
    righe.push(datiEconomici(bu));
    righe.push('');
    righe.push('## Contesto competitivo');
    righe.push(contestoCompetitivo(bu));
    righe.push('');
    righe.push('## Ricavo potenziale stimato a regime');
    righe.push(render.daScrivere('ricavo potenziale annuo e margine indicativo, a partire dai dati sopra'));
    righe.push(promptRicavoPotenziale(bu));
    righe.push('');
    return righe.join('\n');
  }

  BU.registraGeneratore({
    id: 'dimensionamento',
    nome: 'Dimensionamento',
    descrizione: 'Prezzo, costo di erogazione, capacità e dimensione del mercato fianco a fianco: la base per stimare se la BU vale l\'investimento.',
    richiede: ['offerta.prezzo', 'economia.costo_erogazione', 'economia.capacita_erogazione', 'economia.dimensione_mercato'],
    haPrompt: true,
    genera: genera
  });

}(typeof window !== 'undefined' ? window : this));
