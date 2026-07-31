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

  function angoliCampagna(bu) {
    if (!bu.leve || !bu.leve.length) return render.manca('almeno una leva per definire gli angoli');
    return bu.leve.map(function (leva, i) {
      var righe = [];
      righe.push('### Angolo ' + (i + 1) + ': ' + (leva.come_lo_chiama_lui || render.manca('come lo chiama lui')));
      righe.push('- Nome tecnico del problema: ' + (leva.come_lo_chiami_tu || render.manca('come lo chiami tu')));
      righe.push('- Fatto osservabile: ' + (leva.fatto_osservabile || render.manca('fatto osservabile')));
      righe.push('- Soluzione: ' + (leva.come_lo_elimini || render.manca('come lo elimini')));
      righe.push('- Annuncio: ' + render.daScrivere('breve annuncio pubblicitario basato su questo angolo'));
      return righe.join('\n');
    }).join('\n\n');
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
    righe.push(apertura + '.');
    righe.push('');
    righe.push(render.testoCampo(bu, 'identita', 'meccanismo') + ', così che ' + render.testoCampo(bu, 'offerta', 'risultato_promesso') + '.');
    righe.push('');
    righe.push(render.testoCampo(bu, 'test', 'azione_richiesta') + '?');
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
    righe.push('Ciao, vedo che vi occupate di ' + render.testoCampo(bu, 'mercato', 'cliente_ideale') + '.');
    righe.push('"' + apertura + '" — vi suona familiare?');
    righe.push(render.testoCampo(bu, 'identita', 'meccanismo') + '.');
    righe.push(render.testoCampo(bu, 'test', 'azione_richiesta') + '?');
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
    righe.push('- La promessa dell\'annuncio non deve superare "risultato promesso": ' + render.testoCampo(bu, 'offerta', 'risultato_promesso') + '.');
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
