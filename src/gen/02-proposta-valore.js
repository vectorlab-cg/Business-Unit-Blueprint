/*
 * gen/02-proposta-valore.js
 * Generatore "Proposta di valore": formula compilata dai campi, tre
 * varianti di taglio, tabella di contrasto dalle leve, prompt per 8 headline.
 */
(function (global) {
  'use strict';

  var BU = global.BU = global.BU || {};
  var schema = BU.schema;
  var render = BU.render;

  function differenzaPrimaLeva(bu) {
    if (!bu.leve || !bu.leve.length) return render.manca('almeno una leva per esprimere la differenza');
    var prima = bu.leve[0];
    return (prima.come_lo_elimini && prima.come_lo_elimini.trim()) || render.manca('come lo elimini (prima leva)');
  }

  // I campi vengono spesso scritti come frasi compiute (punto finale
  // incluso). Qui vengono incollati dentro un'altra frase: si toglie il
  // punto per non ritrovarsi con punteggiatura doppia ("...ore., così che").
  function formulaPrincipale(bu) {
    var decisore = render.senzaPuntoFinale(render.testoCampo(bu, 'mercato', 'decisore'));
    var cliente = render.senzaPuntoFinale(render.testoCampo(bu, 'mercato', 'cliente_ideale'));
    var contesto = render.senzaPuntoFinale(render.testoCampo(bu, 'mercato', 'contesto_decisore'));
    var meccanismo = render.senzaPuntoFinale(render.testoCampo(bu, 'identita', 'meccanismo'));
    var risultato = render.senzaPuntoFinale(render.testoCampo(bu, 'offerta', 'risultato_promesso'));
    var alternativa = render.senzaPuntoFinale(render.testoCampo(bu, 'mercato', 'alternativa_attuale'));
    var differenza = render.senzaPuntoFinale(differenzaPrimaLeva(bu));

    return 'Per ' + decisore +
      ' di ' + cliente +
      ' che ' + contesto +
      ', ' + bu.nome + ' ' + meccanismo +
      ', così che ' + risultato +
      '. A differenza di ' + alternativa +
      ', ' + differenza + '.';
  }

  function variantiDiTaglio(bu) {
    var cliente = render.senzaPuntoFinale(render.testoCampo(bu, 'mercato', 'cliente_ideale'));
    var meccanismo = render.senzaPuntoFinale(render.testoCampo(bu, 'identita', 'meccanismo'));
    var risultato = render.senzaPuntoFinale(render.testoCampo(bu, 'offerta', 'risultato_promesso'));
    var alternativa = render.senzaPuntoFinale(render.testoCampo(bu, 'mercato', 'alternativa_attuale'));

    var righe = [];
    righe.push('**Taglio risultato**');
    righe.push(risultato + '. Lo facciamo per ' + cliente + ' attraverso ' + meccanismo + '.');
    righe.push('');
    righe.push('**Taglio meccanismo**');
    righe.push(bu.nome + ' ' + meccanismo + ': è così che ' + cliente + ' ottiene ' + risultato + '.');
    righe.push('');
    righe.push('**Taglio contrasto**');
    righe.push('Oggi ' + cliente + ' ' + alternativa + '. Con ' + bu.nome + ', invece, ' + meccanismo + ', e il risultato è ' + risultato + '.');
    return righe.join('\n');
  }

  function tabellaContrasto(bu) {
    if (!bu.leve || !bu.leve.length) return render.manca('almeno una leva per costruire la tabella di contrasto');
    var righe = bu.leve.map(function (leva) {
      return [
        leva.fatto_osservabile || render.manca('fatto osservabile'),
        leva.come_lo_elimini || render.manca('come lo elimini')
      ];
    });
    return render.tabella(['Prima (oggi)', 'Dopo (con ' + bu.nome + ')'], righe);
  }

  function promptHeadline(bu) {
    var paroleLeve = (bu.leve || [])
      .map(function (l) { return l.come_lo_chiama_lui && l.come_lo_chiama_lui.trim(); })
      .filter(Boolean);

    var righe = [];
    righe.push('Scrivi 8 headline per la landing page di "' + bu.nome + '".');
    righe.push('');
    righe.push('Cliente ideale: ' + render.testoCampo(bu, 'mercato', 'cliente_ideale'));
    righe.push('Decisore: ' + render.testoCampo(bu, 'mercato', 'decisore'));
    righe.push('Meccanismo (cosa facciamo davvero): ' + render.testoCampo(bu, 'identita', 'meccanismo'));
    righe.push('Risultato promesso: ' + render.testoCampo(bu, 'offerta', 'risultato_promesso'));
    righe.push('Alternativa attuale del cliente: ' + render.testoCampo(bu, 'mercato', 'alternativa_attuale'));
    righe.push('Parole usate dal cliente per descrivere il problema: ' +
      (paroleLeve.length ? paroleLeve.join(' / ') : render.manca('parole del cliente (dalle leve)')));
    righe.push('');
    righe.push('Regole:');
    righe.push('- Usa le parole del cliente, non gergo interno.');
    righe.push('- Ogni headline deve essere falsificabile: deve poter essere letta come vera o falsa, non come slogan vago.');
    righe.push('- Niente aggettivi generici (innovativo, efficiente, smart) senza un fatto a supporto.');
    righe.push('- Varia l\'angolo: almeno una headline per risultato, una per meccanismo, una per contrasto con l\'alternativa attuale.');
    righe.push('- Massimo 12 parole per headline.');
    return '```\n' + righe.join('\n') + '\n```';
  }

  function genera(bu) {
    var righe = [];
    righe.push('# Proposta di valore — ' + bu.nome);
    righe.push('');
    righe.push('## Formula');
    righe.push(formulaPrincipale(bu));
    righe.push('');
    righe.push('## Varianti di taglio');
    righe.push(variantiDiTaglio(bu));
    righe.push('');
    righe.push('## Tabella di contrasto');
    righe.push(tabellaContrasto(bu));
    righe.push('');
    righe.push('## Prompt per 8 headline');
    righe.push(promptHeadline(bu));
    righe.push('');
    righe.push(render.daScrivere('8 headline, usando il prompt sopra in uno strumento di scrittura esterno'));
    righe.push('');
    return righe.join('\n');
  }

  BU.registraGeneratore({
    id: 'proposta-valore',
    nome: 'Proposta di valore',
    descrizione: 'Formula, tre varianti di taglio, tabella di contrasto dalle leve, prompt per le headline.',
    richiede: [
      'mercato.decisore', 'mercato.cliente_ideale', 'mercato.contesto_decisore',
      'identita.meccanismo', 'offerta.risultato_promesso', 'mercato.alternativa_attuale'
    ],
    genera: genera
  });

}(typeof window !== 'undefined' ? window : this));
