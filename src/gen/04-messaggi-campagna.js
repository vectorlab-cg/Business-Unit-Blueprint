/*
 * gen/04-messaggi-campagna.js
 * Generatore "Messaggi campagna": un angolo per leva, email di primo
 * contatto e messaggio LinkedIn compilati dai campi, parole chiave dalle
 * leve, prompt compilato per scrivere gli annunci.
 */
(function (global) {
  'use strict';

  var BU = global.BU = global.BU || {};
  var schema = BU.schema;
  var render = BU.render;

  // Come per la landing, il taglio dipende da identita.apertura. Il contenuto
  // dell'angolo non cambia: cambia da quale lato l'annuncio attacca.
  function angoliCampagna(bu) {
    if (!bu.leve || !bu.leve.length) return render.manca('almeno una leva per definire gli angoli');
    var dalRisultato = schema.apertura(bu) === 'risultato';

    var blocchi = bu.leve.map(function (leva, i) {
      var titolo = dalRisultato
        ? (leva.come_lo_elimini || render.manca('come lo elimini'))
        : (leva.come_lo_chiama_lui || render.manca('come lo chiama lui'));
      var righe = [];
      righe.push('### Angolo ' + (i + 1) + ': ' + titolo);
      righe.push('- Nome tecnico del problema: ' + (leva.come_lo_chiami_tu || render.manca('come lo chiami tu')));
      righe.push('- Fatto osservabile: ' + (leva.fatto_osservabile || render.manca('fatto osservabile')));
      righe.push('- Soluzione: ' + (leva.come_lo_elimini || render.manca('come lo elimini')));
      righe.push('- Attacca da: ' + (dalRisultato ? 'lo stato desiderato' : 'la perdita subita oggi'));
      righe.push('- Annuncio: ' + render.daScrivere(dalRisultato
        ? 'annuncio che apre sul risultato ottenibile'
        : 'annuncio che apre sulla perdita in corso'));
      return righe.join('\n');
    }).join('\n\n');

    var intro = dalRisultato
      ? '_Tutti gli angoli aprono dal risultato. Vale la pena mettere in gara almeno un angolo dal lato opposto: è la domanda a cui una campagna risponde meglio e più in fretta._'
      : '_Tutti gli angoli aprono dalla perdita. Vale la pena mettere in gara almeno un angolo dal lato opposto: è la domanda a cui una campagna risponde meglio e più in fretta._';
    if (!schema.aperturaDecisa(bu)) {
      intro += '\n_Il campo «Da dove apriamo» non è stato compilato: si assume l\'apertura dalla perdita._';
    }
    return intro + '\n\n' + blocchi;
  }

  function emailPrimoContatto(bu) {
    var leva0 = (bu.leve || [])[0] || null;
    var apertura = leva0 && leva0.fatto_osservabile && leva0.fatto_osservabile.trim()
      ? leva0.fatto_osservabile.trim()
      : render.manca('fatto osservabile (prima leva)');

    var righe = [];
    righe.push('Oggetto: ' + render.testoCampo(bu, 'offerta', 'risultato_promesso'));
    righe.push('');
    righe.push('Ciao,');
    righe.push('');
    righe.push(render.senzaPuntoFinale(apertura) + '.');
    righe.push('');
    righe.push(render.senzaPuntoFinale(render.testoCampo(bu, 'identita', 'meccanismo')) + ', così che ' +
      render.senzaPuntoFinale(render.testoCampo(bu, 'offerta', 'risultato_promesso')) + '.');
    righe.push('');
    righe.push(render.senzaPuntoFinale(render.testoCampo(bu, 'test', 'azione_richiesta')) + '?');
    righe.push('');
    righe.push(render.daScrivere('firma'));
    return righe.join('\n');
  }

  function messaggioLinkedIn(bu) {
    var leva0 = (bu.leve || [])[0] || null;
    var apertura = leva0 && leva0.come_lo_chiama_lui && leva0.come_lo_chiama_lui.trim()
      ? leva0.come_lo_chiama_lui.trim()
      : render.manca('come lo chiama lui (prima leva)');

    var righe = [];
    righe.push('Ciao, vedo che vi occupate di ' + render.senzaPuntoFinale(render.testoCampo(bu, 'mercato', 'cliente_ideale')) + '.');
    righe.push('"' + render.senzaPuntoFinale(apertura) + '" — vi suona familiare?');
    righe.push(render.senzaPuntoFinale(render.testoCampo(bu, 'identita', 'meccanismo')) + '.');
    righe.push(render.senzaPuntoFinale(render.testoCampo(bu, 'test', 'azione_richiesta')) + '?');
    return righe.join('\n');
  }

  function spuntiParoleChiave(bu) {
    if (!bu.leve || !bu.leve.length) return render.manca('almeno una leva');
    var voci = [];
    bu.leve.forEach(function (leva) {
      if (leva.come_lo_chiama_lui && leva.come_lo_chiama_lui.trim()) voci.push(leva.come_lo_chiama_lui.trim());
      if (leva.come_lo_chiami_tu && leva.come_lo_chiami_tu.trim()) voci.push(leva.come_lo_chiami_tu.trim());
    });
    if (!voci.length) return render.manca('parole chiave dalle leve');
    return render.elencoPuntato(voci);
  }

  function promptAnnunci(bu) {
    var righe = [];
    righe.push('Scrivi gli annunci per la campagna di test di "' + bu.nome + '".');
    righe.push('');
    righe.push('Canale: ' + render.testoCampo(bu, 'test', 'canale_test'));
    righe.push('Budget: ' + render.testoCampo(bu, 'test', 'budget_test'));
    righe.push('Cliente ideale: ' + render.testoCampo(bu, 'mercato', 'cliente_ideale'));
    righe.push('Azione richiesta (CTA): ' + render.testoCampo(bu, 'test', 'azione_richiesta'));
    righe.push('');
    righe.push('Scrivi un annuncio per ciascuno di questi angoli, uno per leva. Si testano uno contro');
    righe.push('l\'altro: l\'angolo vincente dice quale problema il mercato sente davvero, non quale');
    righe.push('problema pensavamo fosse più importante.');
    righe.push('');
    (bu.leve || []).forEach(function (leva, i) {
      righe.push((i + 1) + '. "' + (leva.come_lo_chiama_lui || render.manca('come lo chiama lui')) +
        '" → risolto con: ' + (leva.come_lo_elimini || render.manca('come lo elimini')));
    });
    righe.push('');
    righe.push('Regole:');
    righe.push('- Un annuncio per angolo, stesso formato, stessa lunghezza: solo l\'angolo cambia.');
    righe.push('- Usa le parole del cliente, non gergo interno.');
    righe.push('- La promessa dell\'annuncio non deve superare "risultato promesso": ' +
      render.senzaPuntoFinale(render.testoCampo(bu, 'offerta', 'risultato_promesso')) + '.');
    return '```\n' + righe.join('\n') + '\n```';
  }

  function genera(bu) {
    var righe = [];
    righe.push('# Messaggi campagna — ' + bu.nome);
    righe.push('');
    righe.push('## Angoli di campagna (uno per leva)');
    righe.push(angoliCampagna(bu));
    righe.push('');
    righe.push('## Email di primo contatto');
    righe.push(emailPrimoContatto(bu));
    righe.push('');
    righe.push('## Messaggio LinkedIn');
    righe.push(messaggioLinkedIn(bu));
    righe.push('');
    righe.push('## Spunti di parole chiave (dalle leve)');
    righe.push(spuntiParoleChiave(bu));
    righe.push('');
    righe.push('## Prompt per scrivere gli annunci');
    righe.push(promptAnnunci(bu));
    righe.push('');
    return righe.join('\n');
  }

  BU.registraGeneratore({
    id: 'messaggi-campagna',
    nome: 'Messaggi campagna',
    descrizione: 'Angoli per leva, email di primo contatto, messaggio LinkedIn, parole chiave e prompt per gli annunci.',
    richiede: [
      'identita.meccanismo', 'offerta.risultato_promesso', 'mercato.cliente_ideale',
      'test.azione_richiesta', 'test.canale_test'
    ],
    genera: genera
  });

}(typeof window !== 'undefined' ? window : this));
