/*
 * prompt-design.js
 * Prompt pronti da incollare in uno strumento esterno di generazione
 * immagini (Midjourney, DALL-E, Ideogram, ecc.) per i 12 deliverable della
 * categoria "design" del catalogo Output (BU.schema.OUTPUT_CREATIVI). Mai
 * un'immagine generata qui dentro: l'app non chiama API esterne — vedi
 * perché in docs/DECISIONI.md. Stesso principio dei prompt testuali dei
 * generatori (haPrompt in gen/_registry.js), applicato al lato grafico.
 *
 * Namespace globale: window.BU.promptDesign
 */
(function (global) {
  'use strict';

  var BU = global.BU = global.BU || {};

  // Righe di contesto comuni a ogni prompt, per non dover ripetere la
  // stessa descrizione del brand in ognuno dei 12 — e per tenerli coerenti
  // fra loro anche se eseguiti in sessioni diverse dello strumento esterno.
  function contestoBrand(bu) {
    var render = BU.render;
    var righe = [];
    righe.push('Brand: "' + bu.nome + '".');
    righe.push('Cosa fa: ' + render.senzaPuntoFinale(render.testoCampo(bu, 'identita', 'descrizione')) + '.');
    righe.push('Per chi: ' + render.senzaPuntoFinale(render.testoCampo(bu, 'mercato', 'cliente_ideale')) + '.');
    righe.push('Cosa promette: ' + render.senzaPuntoFinale(render.testoCampo(bu, 'offerta', 'risultato_promesso')) + '.');
    return righe.join('\n');
  }

  function blocco(bu, istruzioni) {
    return '```\n' + contestoBrand(bu) + '\n\n' + istruzioni + '\n```';
  }

  // Una funzione per voce di OUTPUT_CREATIVI (categoria "design"): riceve
  // la BU, restituisce le istruzioni specifiche di quella voce (il
  // contesto brand comune viene aggiunto da blocco()). Nessuna invenzione
  // di fatti sul brand (colori, tono) non presenti nei campi — solo
  // indicazioni di lavoro per lo strumento esterno.
  var ISTRUZIONI = {
    logo: function (bu) {
      return 'Disegna un logo per questo brand. Stile pulito, leggibile anche in piccolo (favicon, header ' +
        'del sito), senza illustrazioni complesse. Nessun colore è stato ancora deciso: proponi tu una palette ' +
        'coerente col posizionamento sopra, motivando la scelta in una riga. Restituisci: logo su sfondo ' +
        'trasparente, una versione ridotta a sola icona, e i codici colore usati.';
    },
    identita_visiva: function () {
      return 'Proponi una palette di 4-5 colori (primario, secondario, uno o due di accento) e le regole base ' +
        'di utilizzo, coerenti col posizionamento sopra e con la palette del logo, se già scelta. Includi un ' +
        'esempio di applicazione su un elemento semplice (es. un pulsante e un\'intestazione).';
    },
    design_landing: function (bu) {
      var render = BU.render;
      return 'Genera l\'immagine hero per la landing page: una composizione (foto, illustrazione o 3D — a tua ' +
        'scelta) da usare sopra la piega, che comunichi visivamente "' +
        render.senzaPuntoFinale(render.testoCampo(bu, 'offerta', 'risultato_promesso')) + '". Non generare il ' +
        'layout completo della pagina, solo l\'immagine chiave; deve reggere bene accanto a testo sovrapposto.';
    },
    design_presentazione: function (bu) {
      var render = BU.render;
      return 'Genera un template di slide (copertina + una slide tipo per i contenuti) per una presentazione ' +
        'commerciale rivolta a "' + render.senzaPuntoFinale(render.testoCampo(bu, 'mercato', 'decisore')) +
        '". Stile pulito, leggibile a distanza (si presenta anche via videocall o su schermo in sala riunioni), ' +
        'coerente con l\'identità visiva sopra.';
    },
    design_proposta_economica: function () {
      return 'Genera un template visivo per un documento di proposta economica: intestazione con logo, un box ' +
        'per il prezzo ben visibile, footer con contatti. Deve comunicare affidabilità e precisione più che ' +
        'creatività — è un documento che il cliente valuta prima di firmare.';
    },
    creativita_annunci: function (bu) {
      var render = BU.render;
      return 'Genera 3 varianti di creatività per annunci a pagamento (Meta/LinkedIn), formato quadrato 1:1, ' +
        'che comunichino il problema "' + render.senzaPuntoFinale(render.testoCampo(bu, 'mercato', 'alternativa_attuale')) +
        '" o il suo superamento. Testo minimo dentro l\'immagine: le piattaforme penalizzano le creatività con ' +
        'troppo testo sovrapposto.';
    },
    template_social: function () {
      return 'Genera un template grafico riutilizzabile per post social, in due formati (quadrato 1:1 e ' +
        'verticale 4:5), con uno spazio libero per un titolo che cambierà di post in post. Coerente con ' +
        'l\'identità visiva sopra.';
    },
    mockup_demo: function (bu) {
      var render = BU.render;
      return 'Genera un mockup che mostri "' + render.senzaPuntoFinale(render.testoCampo(bu, 'offerta', 'servizio')) +
        '" in un contesto d\'uso realistico. Se il servizio non è un\'interfaccia esistente, non inventare uno ' +
        'schermo falso: mostra invece una scena (persona, ambiente, dispositivo) che comunichi il risultato, non ' +
        'il funzionamento tecnico.';
    },
    brochure: function () {
      return 'Genera il layout di un one-pager/brochure a una facciata: intestazione con logo, una sezione ' +
        'problema/soluzione, un box offerta, una call to action. Stile coerente con l\'identità visiva sopra, ' +
        'pensato per essere stampato o inviato come PDF.';
    },
    materiali_stampa: function () {
      return 'Genera un template per materiali stampa (biglietto da visita o roll-up per fiere/eventi), ' +
        'coerente con l\'identità visiva sopra. Poco testo, alto contrasto: va letto anche da qualche metro di ' +
        'distanza.';
    },
    video_motion: function (bu) {
      var render = BU.render;
      return 'Non è un\'immagine fissa: descrivi uno storyboard di 4-6 scene per un video/motion graphic di ' +
        '30-45 secondi che comunichi "' + render.senzaPuntoFinale(render.testoCampo(bu, 'offerta', 'risultato_promesso')) +
        '" a "' + render.senzaPuntoFinale(render.testoCampo(bu, 'mercato', 'cliente_ideale')) + '". Usalo come ' +
        'prompt per uno strumento di video IA (es. Runway, Pika) o come brief per chi monta il video a mano.';
    },
    template_email: function () {
      return 'Genera un template email (intestazione, corpo, pulsante di call to action, footer), coerente con ' +
        'l\'identità visiva sopra. Deve restare leggibile anche se le immagini non vengono caricate: molti ' +
        'client email le bloccano di default.';
    }
  };

  // Elenca i 12 deliverable "design" del catalogo Output, ognuno con il
  // proprio prompt pronto — sempre calcolato al volo dai dati correnti
  // della BU, nessuno stato persistito (a differenza dei materiali: qui
  // non c'è un "testo generato" da rigenerare, solo un prompt che riflette
  // sempre l'ultima BU).
  function elencoPromptDesign(bu) {
    return BU.schema.OUTPUT_CREATIVI.filter(function (def) {
      return def.categoria === 'design';
    }).map(function (def) {
      var costruisci = ISTRUZIONI[def.chiave];
      return {
        chiave: def.chiave,
        etichetta: def.etichetta,
        prompt: costruisci ? blocco(bu, costruisci(bu)) : null
      };
    });
  }

  BU.promptDesign = {
    elencoPromptDesign: elencoPromptDesign
  };

}(typeof window !== 'undefined' ? window : this));
