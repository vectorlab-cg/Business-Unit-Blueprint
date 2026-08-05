/*
 * gen/14-criteri-decisione.js
 * Generatore "Criteri di continuazione o chiusura": ipotesi da testare,
 * scheda del test, le due soglie separate, costo di scoprire di aver
 * sbagliato, criteri CONTINUA / MODIFICA / FERMA. Per i valori attuali
 * delle metriche vedi il generatore "Dashboard KPI".
 */
(function (global) {
  'use strict';

  var BU = global.BU = global.BU || {};
  var schema = BU.schema;
  var render = BU.render;

  function ipotesiDaTestare(bu) {
    var righe = [];

    schema.CAMPI.forEach(function (def) {
      var campo = schema.ottieniCampo(bu, def.sezione, def.chiave);
      if (!schema.campoHaValore(campo, def.tipo)) return;
      var statoEff = schema.statoEffettivoCampo(campo);
      if (statoEff === 'mandatorio') return;
      righe.push(def.etichetta + ': ' + render.testoCampoConStato(bu, def.sezione, def.chiave));
    });

    (bu.leve || []).forEach(function (leva) {
      var chiama = leva.come_lo_chiama_lui && leva.come_lo_chiama_lui.trim();
      var elimini = leva.come_lo_elimini && leva.come_lo_elimini.trim();
      righe.push('Leva: "' + (chiama || render.manca('come lo chiama lui')) + '" è un problema reale per ' +
        render.senzaPuntoFinale(render.testoCampo(bu, 'mercato', 'cliente_ideale')) + ', e "' +
        (elimini || render.manca('come lo elimini')) + '" lo risolve davvero.');
    });

    if (!righe.length) return 'Nessuna: tutti i campi compilati sono già segnati come mandatori.';
    return render.elencoPuntato(righe);
  }

  function schedaDelTest(bu) {
    return [
      '- Canale: ' + render.testoCampo(bu, 'test', 'canale_test'),
      '- Budget: ' + render.testoCampo(bu, 'test', 'budget_test'),
      '- Durata: ' + render.testoCampo(bu, 'test', 'durata_test'),
      '- Azione richiesta (CTA): ' + render.testoCampo(bu, 'test', 'azione_richiesta')
    ].join('\n');
  }

  function dueSoglie(bu) {
    var righe = [];
    righe.push('**Segnale di messaggio** (autorizza a telefonare): ' + render.testoCampo(bu, 'test', 'soglia_messaggio'));
    righe.push('**Segnale di mercato** (unica soglia che autorizza a costruire): ' + render.testoCampo(bu, 'test', 'soglia_mercato'));
    righe.push('');
    righe.push('Le due soglie restano separate: il segnale di messaggio dice solo che il messaggio arriva, ' +
      'non che qualcuno è disposto a pagare. Solo il segnale di mercato autorizza a costruire.');
    return righe.join('\n');
  }

  function costoDiScoprireDiAverSbagliato(bu) {
    return [
      '- Denaro: ' + render.testoCampo(bu, 'test', 'budget_test'),
      '- Tempo: ' + render.testoCampo(bu, 'test', 'durata_test'),
      '- Ore-persona: ' + render.daScrivere('stima delle ore-persona necessarie per condurre il test')
    ].join('\n');
  }

  function criteriDecisione(bu) {
    var sogliaMercato = render.senzaPuntoFinale(render.testoCampo(bu, 'test', 'soglia_mercato'));
    var sogliaMessaggio = render.senzaPuntoFinale(render.testoCampo(bu, 'test', 'soglia_messaggio'));
    var durata = render.senzaPuntoFinale(render.testoCampo(bu, 'test', 'durata_test'));

    return [
      '**CONTINUA** — si raggiunge il segnale di mercato (' + sogliaMercato + '): si passa a costruire.',
      '**MODIFICA** — si raggiunge il segnale di messaggio (' + sogliaMessaggio +
        ') ma non quello di mercato: si rivede offerta o angolo e si ritesta.',
      '**FERMA** — non si raggiunge nemmeno il segnale di messaggio (' + sogliaMessaggio +
        ') entro la durata del test (' + durata + '): si archivia l\'ipotesi.'
    ].join('\n\n');
  }

  function genera(bu) {
    var righe = [];
    righe.push('# Criteri di continuazione o chiusura — ' + bu.nome);
    righe.push(render.legendaStatiCampo());
    righe.push('');
    righe.push('## Ipotesi da testare');
    righe.push(ipotesiDaTestare(bu));
    righe.push('');
    righe.push('## Scheda del test');
    righe.push(schedaDelTest(bu));
    righe.push('');
    righe.push('## Le due soglie');
    righe.push(dueSoglie(bu));
    righe.push('');
    righe.push('## Costo di scoprire di aver sbagliato');
    righe.push(costoDiScoprireDiAverSbagliato(bu));
    righe.push('');
    righe.push('## Criteri di decisione');
    righe.push(criteriDecisione(bu));
    righe.push('');
    righe.push('_Per i valori attuali delle metriche rispetto a queste soglie, vedi il generatore "Dashboard KPI"._');
    righe.push('');
    return righe.join('\n');
  }

  BU.registraGeneratore({
    id: 'criteri-decisione',
    nome: 'Criteri di continuazione o chiusura',
    descrizione: 'Ipotesi da testare, scheda del test, le due soglie separate, costo dell\'errore, criteri CONTINUA/MODIFICA/FERMA.',
    richiede: ['test.canale_test', 'test.azione_richiesta', 'test.soglia_mercato'],
    genera: genera
  });

}(typeof window !== 'undefined' ? window : this));
