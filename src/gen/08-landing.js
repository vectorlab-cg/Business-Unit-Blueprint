/*
 * gen/08-landing.js
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

  // Il taglio dipende da identita.apertura: dalla perdita si apre sul sintomo
  // che il cliente subisce oggi, dal risultato sullo stato che otterrebbe.
  // Il contenuto della leva è lo stesso, cambia da quale lato lo si racconta.
  function sezioneProblema(bu) {
    if (!bu.leve || !bu.leve.length) return render.manca('almeno una leva per popolare la sezione problema');
    var dalRisultato = schema.apertura(bu) === 'risultato';

    var blocchi = bu.leve.map(function (leva) {
      var righe = [];
      if (dalRisultato) {
        righe.push('### ' + (leva.come_lo_elimini || render.manca('come lo elimini')));
        righe.push('Oggi invece: ' + (leva.fatto_osservabile || render.manca('fatto osservabile')));
        righe.push('_Nome tecnico del problema: ' + (leva.come_lo_chiami_tu || render.manca('come lo chiami tu')) + '_');
        righe.push('Testo del blocco: ' + render.daScrivere('2 righe sullo stato desiderato, seconda persona'));
      } else {
        righe.push('### ' + (leva.come_lo_chiama_lui || leva.fatto_osservabile || render.manca('leva senza testo')));
        righe.push(leva.fatto_osservabile || render.manca('fatto osservabile'));
        righe.push('_Nome tecnico del problema: ' + (leva.come_lo_chiami_tu || render.manca('come lo chiami tu')) + '_');
        righe.push('Testo del blocco: ' + render.daScrivere('2 righe sulla perdita, seconda persona'));
      }
      return righe.join('\n');
    }).join('\n\n');

    var intro = dalRisultato
      ? '_Apertura dal risultato: ogni blocco parte dallo stato che il cliente otterrebbe e nomina la perdita subito dopo._'
      : '_Apertura dalla perdita: ogni blocco parte dal sintomo che il cliente subisce oggi._';
    if (!schema.aperturaDecisa(bu)) {
      intro += '\n_Il campo «Da dove apriamo» non è stato compilato: si assume l\'apertura dalla perdita._';
    }
    return intro + '\n\n' + blocchi;
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

  // Le prove della landing sono materiale PUBBLICO: casi reali, loghi, numeri.
  // Non vanno confuse con il campo `prova` delle voci dello schema, che è una
  // nota interna di verifica ("confermato in 5 interviste, luglio 2026") e non
  // è pubblicabile. Il modello oggi non raccoglie prove pubbliche: finché non
  // lo farà, questa sezione resta esplicitamente da scrivere.
  function sezioneProve() {
    var righe = [
      render.daScrivere('casi reali: contesto, problema, intervento, esito'),
      render.daScrivere('loghi clienti, se utilizzabili'),
      render.daScrivere('numeri: quanti progetti, in quanto tempo, con che esito'),
      '',
      '_Tagliare la sezione se non ci sono prove vere: una sezione prove debole fa',
      'più danno della sua assenza. Le note nel campo "prova" di ciascuna voce sono',
      'verifiche interne, non materiale da pubblicare._'
    ];
    return righe.join('\n');
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
    righe.push('_La prima cosa che si legge: headline, sottotitolo, CTA principale._');
    righe.push(sezioneHero(bu));
    righe.push('');
    righe.push('## 2. Problema');
    righe.push('_Un blocco per leva, nelle parole del cliente, per farsi riconoscere._');
    righe.push(sezioneProblema(bu));
    righe.push('');
    righe.push('## 3. Contrasto');
    righe.push('_Prima/dopo per ogni leva: cosa cambia scegliendo voi._');
    righe.push(sezioneContrasto(bu));
    righe.push('');
    righe.push('## 4. Offerta');
    righe.push('_Cosa si compra esattamente: servizio, prezzo, tempi, cosa non include._');
    righe.push(sezioneOfferta(bu));
    righe.push('');
    righe.push('## 5. Prove');
    righe.push('_Casi reali, numeri, loghi — solo se esistono davvero, mai inventati._');
    righe.push(sezioneProve());
    righe.push('');
    righe.push('## 6. Chi lo fa');
    righe.push('_Le persone dietro il servizio: dà credibilità a chi valuta se fidarsi._');
    righe.push(sezioneChiLoFa(bu));
    righe.push('');
    righe.push('## 7. FAQ');
    righe.push('_Le obiezioni più prevedibili, con la differenziazione già dentro le risposte._');
    righe.push(sezioneFaq(bu));
    righe.push('');
    righe.push('## 8. Chiusura');
    righe.push('_Ultimo richiamo al risultato e alla CTA, prima che il visitatore se ne vada._');
    righe.push(sezioneChiusura(bu));
    righe.push('');
    righe.push('## Prompt per scrivere i testi mancanti');
    righe.push('_Da incollare in uno strumento esterno per riempire i [DA SCRIVERE] qui sopra._');
    righe.push(promptTestiMancanti(bu));
    righe.push('');
    return righe.join('\n');
  }

  BU.registraGeneratore({
    id: 'landing',
    categoria: 'marketing',
    nome: 'Landing page',
    descrizione: 'Otto sezioni fisse (hero, problema, contrasto, offerta, prove, chi lo fa, FAQ, chiusura) e un prompt per i testi mancanti.',
    richiede: [
      'offerta.risultato_promesso', 'test.azione_richiesta', 'offerta.servizio',
      'offerta.prezzo', 'mercato.alternativa_attuale'
    ],
    haPrompt: true,
    genera: genera
  });

}(typeof window !== 'undefined' ? window : this));
