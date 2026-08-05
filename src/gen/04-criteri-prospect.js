/*
 * gen/04-criteri-prospect.js
 * Generatore "Criteri di ricerca prospect": produce i CRITERI per cercare
 * 50 prospect (su LinkedIn o strumento equivalente con dati reali), mai
 * una lista di nominativi — lo strumento non ha accesso a dati esterni e
 * non deve mai inventare aziende o persone.
 */
(function (global) {
  'use strict';

  var BU = global.BU = global.BU || {};
  var schema = BU.schema;
  var render = BU.render;

  function paroleChiaveDalleLeve(bu) {
    if (!bu.leve || !bu.leve.length) return null;
    var voci = [];
    bu.leve.forEach(function (leva) {
      if (leva.come_lo_chiama_lui && leva.come_lo_chiama_lui.trim()) voci.push(leva.come_lo_chiama_lui.trim());
      if (leva.come_lo_chiami_tu && leva.come_lo_chiami_tu.trim()) voci.push(leva.come_lo_chiami_tu.trim());
    });
    return voci.length ? voci : null;
  }

  function segnaliDaCercare(bu) {
    var parole = paroleChiaveDalleLeve(bu);
    if (!parole) return render.manca('almeno una leva');
    return render.elencoPuntato(parole);
  }

  function promptRicerca(bu) {
    var parole = paroleChiaveDalleLeve(bu);
    var righe = [];
    righe.push('Costruisci una strategia di ricerca su LinkedIn Sales Navigator (o strumento equivalente)');
    righe.push('per trovare prospect per "' + bu.nome + '".');
    righe.push('');
    righe.push('Ruolo/titolo da cercare: ' + render.testoCampo(bu, 'mercato', 'decisore'));
    righe.push('Tipo di azienda: ' + render.testoCampo(bu, 'mercato', 'cliente_ideale'));
    righe.push('Segnali/parole chiave associate al problema: ' +
      (parole ? parole.map(render.senzaPuntoFinale).join(' / ') : render.manca('parole chiave dalle leve')));
    righe.push('Cosa fanno oggi (da escludere se già coperti diversamente): ' + render.testoCampo(bu, 'mercato', 'alternativa_attuale'));
    righe.push('');
    righe.push('Restituisci: varianti esatte del titolo da usare come filtro, settori LinkedIn standard');
    righe.push('pertinenti, una query booleana per le parole chiave nel profilo/nei post, e una stima');
    righe.push('di quanti filtri combinare per arrivare a un elenco gestibile (non troppo ampio, non');
    righe.push('troppo stretto) da cui selezionare a mano i 50 nominativi.');
    return '```\n' + righe.join('\n') + '\n```';
  }

  function genera(bu) {
    var righe = [];
    righe.push('# Criteri di ricerca prospect — ' + bu.nome);
    righe.push('');
    righe.push('_Questo documento produce i **criteri** di ricerca, non un elenco di nominativi: lo' );
    righe.push('strumento non ha accesso a dati esterni e non deve mai inventare aziende o persone.' );
    righe.push('I 50 nominativi vanno raccolti da LinkedIn (o altro strumento con dati reali) usando' );
    righe.push('questi criteri, non generati qui._');
    righe.push('');
    righe.push('## Chi cercare');
    righe.push('- Titolo/ruolo: ' + render.testoCampoConStato(bu, 'mercato', 'decisore'));
    righe.push('- Tipo di azienda: ' + render.testoCampoConStato(bu, 'mercato', 'cliente_ideale'));
    righe.push('');
    righe.push('## Segnali da cercare (parole chiave)');
    righe.push(segnaliDaCercare(bu));
    righe.push('');
    righe.push('## Filtri su LinkedIn');
    righe.push('- Titolo: ' + render.daScrivere('varianti esatte del titolo'));
    righe.push('- Settore: ' + render.daScrivere('settori LinkedIn standard pertinenti'));
    righe.push('- Dimensione azienda: ' + render.daScrivere('range dipendenti coerente con "' + render.testoCampo(bu, 'mercato', 'cliente_ideale') + '"'));
    var parole = paroleChiaveDalleLeve(bu);
    righe.push('- Parole chiave nel profilo/nei post: ' +
      (parole ? parole.map(render.senzaPuntoFinale).join('; ') : render.manca('parole chiave dalle leve')));
    righe.push('');
    righe.push('## Prompt per impostare la ricerca');
    righe.push(promptRicerca(bu));
    righe.push('');
    righe.push('## Obiettivo');
    righe.push('50 nominativi qualificati secondo questi criteri, raccolti a mano da LinkedIn.');
    righe.push('');
    return righe.join('\n');
  }

  BU.registraGeneratore({
    id: 'criteri-prospect',
    nome: 'Criteri di ricerca prospect',
    descrizione: 'Titolo, settore, dimensione e parole chiave per cercare 50 prospect su LinkedIn — mai una lista inventata.',
    richiede: ['mercato.cliente_ideale', 'mercato.decisore'],
    genera: genera
  });

}(typeof window !== 'undefined' ? window : this));
