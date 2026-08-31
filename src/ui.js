/*
 * ui.js
 * Le sette viste di una business unit: COMPILA, MATERIALI, DOCUMENTO,
 * LANCIO, VALIDAZIONE, OUTPUT, PROMPT DESIGN.
 * Le funzioni qui dentro mutano direttamente l'oggetto `bu` passato (è un
 * riferimento vivo nello stato di app.js) e chiamano `segnalaModifica()`
 * per notificare che qualcosa è cambiato (salvataggio differito, sidebar).
 *
 * Namespace globale: window.BU.ui
 */
(function (global) {
  'use strict';

  var BU = global.BU = global.BU || {};
  var schema = BU.schema;

  // ---------------------------------------------------------------------
  // Helper di costruzione DOM
  // ---------------------------------------------------------------------

  function el(tag, props, figli) {
    var nodo = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        if (props[k] === undefined) return; // niente setAttribute(x, undefined): creerebbe l'attributo comunque
        if (k === 'class') nodo.className = props[k];
        else if (k === 'value') nodo.value = props[k];
        else if (k === 'checked') nodo.checked = props[k];
        else if (k === 'disabled') nodo.disabled = props[k];
        else if (k === 'text') nodo.textContent = props[k];
        else if (k === 'title') nodo.title = props[k];
        else if (k.indexOf('on') === 0 && typeof props[k] === 'function') {
          nodo.addEventListener(k.slice(2).toLowerCase(), props[k]);
        } else {
          nodo.setAttribute(k, props[k]);
        }
      });
    }
    (figli || []).forEach(function (f) {
      if (f === null || f === undefined) return;
      if (typeof f === 'string') nodo.appendChild(document.createTextNode(f));
      else nodo.appendChild(f);
    });
    return nodo;
  }

  function selettoreStato(statoCorrente, onChange) {
    return el('select', { class: 'campo-stato', onchange: function (e) { onChange(e.target.value); } },
      schema.STATI_CAMPO.map(function (s) {
        return el('option', { value: s, selected: s === statoCorrente ? 'selected' : undefined }, [schema.STATI_CAMPO_ETICHETTE[s]]);
      })
    );
  }

  function formattaData(iso) {
    if (!iso) return '';
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleString('it-IT');
    } catch (e) {
      return iso;
    }
  }

  // ---------------------------------------------------------------------
  // VISTA: COMPILA
  // ---------------------------------------------------------------------

  // Quali sezioni sono chiuse — stato di sola interfaccia (non salvato con
  // la BU): resta per la durata della pagina, si azzera al ricaricamento.
  // Chiave 'leve' per la sezione delle leve, altrimenti sezione.chiave.
  // Si parte con tutto chiuso: chi compila apre solo le sezioni su cui
  // lavora, invece di scorrere l'intera form ogni volta.
  var sezioniChiuse = (function () {
    var iniziale = { leve: true };
    schema.SEZIONI.forEach(function (s) { iniziale[s.chiave] = true; });
    return iniziale;
  }());

  function titoloSezioneCollassabile(chiave, testo, descrizione, ridisegna) {
    var chiusa = !!sezioniChiuse[chiave];
    var figli = [
      el('span', { class: 'sezione-titolo-freccia', text: chiusa ? '▸' : '▾' }),
      ' ' + testo
    ];
    if (descrizione) {
      figli.push(el('span', { class: 'sezione-titolo-descrizione', text: ' — ' + descrizione }));
    }
    return el('h2', {
      class: 'sezione-titolo sezione-titolo--interattivo',
      onclick: function () {
        sezioniChiuse[chiave] = !chiusa;
        ridisegna();
      }
    }, figli);
  }

  function renderCompila(container, bu, segnalaModifica) {
    container.innerHTML = '';

    function ridisegna() {
      renderCompila(container, bu, segnalaModifica);
    }

    schema.SEZIONI.forEach(function (sezione) {
      var corpo = el('div', { class: 'sezione-corpo' + (sezioniChiuse[sezione.chiave] ? ' sezione-corpo--chiusa' : '') });

      schema.elencaCampiSezione(sezione.chiave).forEach(function (def) {
        corpo.appendChild(renderCampo(bu, def, segnalaModifica));
      });

      container.appendChild(el('section', { class: 'sezione' }, [
        titoloSezioneCollassabile(sezione.chiave, sezione.etichetta, sezione.descrizione, ridisegna),
        corpo
      ]));

      // Leve subito dopo Risorse: chiude le sezioni sempre da compilare
      // (Identità, Mercato, Offerta, Risorse, Leve) prima di quelle di
      // supporto che seguono nell'ordine di schema.SEZIONI (Economia,
      // Pilota, Test).
      if (sezione.chiave === 'risorse') {
        container.appendChild(renderLeve(bu, segnalaModifica, ridisegna));
      }
    });
  }

  function classeStatoCampo(campo) {
    return 'campo--' + schema.statoEffettivoCampo(campo);
  }

  function renderCampo(bu, def, segnalaModifica) {
    var campo = schema.ottieniCampo(bu, def.sezione, def.chiave);

    var divCampo = el('div', { class: 'campo ' + classeStatoCampo(campo) + (def.critico ? ' campo--critico' : '') });

    function aggiornaVisivo() {
      divCampo.className = 'campo ' + classeStatoCampo(campo) + (def.critico ? ' campo--critico' : '');
    }

    var intestazione = el('div', { class: 'campo-intestazione' }, [
      el('label', { class: 'campo-etichetta', text: def.etichetta + (def.critico ? ' *' : '') }),
      selettoreStato(campo.stato, function (v) {
        campo.stato = v;
        aggiornaVisivo();
        segnalaModifica();
      })
    ]);

    divCampo.appendChild(intestazione);
    if (def.aiuto) divCampo.appendChild(el('div', { class: 'campo-aiuto', text: def.aiuto }));

    var inputValore;
    if (def.tipo === 'lista') {
      inputValore = el('textarea', {
        class: 'campo-valore', rows: '3', placeholder: 'Una voce per riga',
        value: schema.testoDaLista(campo.valore),
        oninput: function (e) {
          campo.valore = schema.listaDaTesto(e.target.value);
          aggiornaVisivo();
          segnalaModifica();
        }
      });
      divCampo.appendChild(inputValore);
    } else if (def.tipo === 'scelta') {
      inputValore = el('select', {
        class: 'campo-valore campo-valore--scelta',
        onchange: function (e) {
          campo.valore = e.target.value;
          aggiornaVisivo();
          segnalaModifica();
        }
      }, [el('option', { value: '', selected: campo.valore ? undefined : 'selected' }, ['— non deciso —'])]
        .concat((def.opzioni || []).map(function (o) {
          return el('option', { value: o, selected: o === campo.valore ? 'selected' : undefined },
            [(def.etichetteOpzioni && def.etichetteOpzioni[o]) || o]);
        })));
      divCampo.appendChild(inputValore);
    } else if (def.tipo === 'durata') {
      var inputTesto = el('input', {
        type: 'text', class: 'campo-valore campo-valore--durata-testo', placeholder: 'es. 4 settimane',
        value: campo.valore.testo,
        oninput: function (e) {
          campo.valore.testo = e.target.value;
          aggiornaVisivo();
          segnalaModifica();
        }
      });
      var inputData = el('input', {
        type: 'date', class: 'campo-valore campo-valore--durata-data',
        value: campo.valore.dataFine,
        onchange: function (e) {
          campo.valore.dataFine = e.target.value;
          aggiornaVisivo();
          segnalaModifica();
        }
      });
      divCampo.appendChild(el('div', { class: 'campo-durata' }, [inputTesto, inputData]));
    } else {
      inputValore = el('textarea', {
        class: 'campo-valore', rows: '2',
        value: campo.valore,
        oninput: function (e) {
          campo.valore = e.target.value;
          aggiornaVisivo();
          segnalaModifica();
        }
      });
      divCampo.appendChild(inputValore);
    }

    return divCampo;
  }

  function renderLeve(bu, segnalaModifica, ridisegna) {
    var corpo = el('div', { class: 'sezione-corpo' + (sezioniChiuse.leve ? ' sezione-corpo--chiusa' : '') });
    var wrapper = el('section', { class: 'sezione sezione--leve' }, [
      titoloSezioneCollassabile('leve', 'Leve (' + bu.leve.length + '/5)',
        'I problemi reali che l\'offerta risolve, nelle parole del cliente e nelle vostre.', ridisegna),
      corpo
    ]);

    if (bu.leve.length < 3) {
      corpo.appendChild(el('div', { class: 'campo-avviso campo-avviso--visibile' },
        ['Servono da 3 a 5 leve. Ne mancano almeno ' + (3 - bu.leve.length) + '.']));
    }

    var elenco = el('div', { class: 'leve-elenco' });
    bu.leve.forEach(function (leva, indice) {
      elenco.appendChild(renderLevaCard(bu, leva, indice, segnalaModifica, ridisegna));
    });
    corpo.appendChild(elenco);

    corpo.appendChild(el('button', {
      type: 'button', class: 'pulsante pulsante--secondario',
      disabled: bu.leve.length >= 5 ? 'disabled' : undefined,
      onclick: function () {
        bu.leve.push(schema.nuovaLeva());
        segnalaModifica();
        ridisegna();
      }
    }, ['+ Aggiungi leva']));

    return wrapper;
  }

  function renderLevaCard(bu, leva, indice, segnalaModifica, ridisegna) {
    var card = el('div', { class: 'leva-card campo--' + schema.statoEffettivoLeva(leva) });

    var bottoneRimuovi = el('button', {
      type: 'button', class: 'pulsante pulsante--pericolo pulsante--piccolo', title: 'Rimuovi leva',
      onclick: function () {
        if (!global.confirm('Rimuovere questa leva? L\'operazione non è reversibile.')) return;
        bu.leve.splice(indice, 1);
        segnalaModifica();
        ridisegna();
      }
    }, ['Rimuovi']);

    card.appendChild(el('div', { class: 'leva-intestazione' }, [
      el('span', { class: 'leva-titolo', text: 'Leva ' + (indice + 1) }),
      selettoreStato(leva.stato, function (v) {
        leva.stato = v;
        card.className = 'leva-card campo--' + schema.statoEffettivoLeva(leva);
        segnalaModifica();
      }),
      bottoneRimuovi
    ]));

    [
      ['fatto_osservabile', 'Fatto osservabile', 'Cosa succede al cliente, concretamente'],
      ['come_lo_chiama_lui', 'Come lo chiama lui', 'Le sue parole, anche se sbagliate'],
      ['come_lo_chiami_tu', 'Come lo chiami tu', 'Il nome tecnico del problema'],
      ['come_lo_elimini', 'Come lo elimini', 'Il vostro intervento specifico']
    ].forEach(function (voce) {
      var chiave = voce[0];
      card.appendChild(el('label', { class: 'leva-campo-etichetta', text: voce[1] }));
      card.appendChild(el('textarea', {
        class: 'leva-campo-valore', rows: '2', placeholder: voce[2],
        value: leva[chiave],
        oninput: function (e) { leva[chiave] = e.target.value; segnalaModifica(); }
      }));
    });

    return card;
  }

  // ---------------------------------------------------------------------
  // VISTA: MATERIALI
  // ---------------------------------------------------------------------

  // Rigenera ogni materiale registrato in un colpo solo. Zero interruzioni
  // nel caso comune (nessun materiale toccato a mano): un solo confirm,
  // solo se almeno uno lo è stato — non un confirm per materiale, non un
  // meccanismo che salta/elenca in silenzio i modificati a mano: se conferma,
  // sovrascrive tutto, altrimenti non tocca niente.
  function rigeneraTutto(bu, segnalaModifica, ridisegna) {
    var generatori = BU.gen.elencaGeneratori();
    var modificatiAMano = generatori
      .filter(function (g) { var m = bu.materiali[g.id]; return m && m.modificatoAMano; })
      .map(function (g) { return g.nome; });
    if (modificatiAMano.length) {
      var ok = global.confirm(
        'Rigenerare tutti i materiali sovrascrive anche quelli modificati a mano: ' +
        modificatiAMano.join(', ') + '. Continuare?'
      );
      if (!ok) return;
    }
    generatori.forEach(function (generatore) {
      var esistente = bu.materiali[generatore.id];
      bu.materiali[generatore.id] = {
        stato: esistente ? esistente.stato : 'bozza',
        testo: generatore.genera(bu),
        generatoIl: new Date().toISOString(),
        modificatoAMano: false,
        risultatoPrompt: esistente ? esistente.risultatoPrompt : ''
      };
    });
    segnalaModifica();
    ridisegna();
  }

  // Quanti materiali sono da generare (mai fatto) o da aggiornare (dati
  // modificati dopo l'ultima generazione) — stesso conteggio mostrato in
  // Materiali e in Documento.
  function contaMaterialiDaAggiornare(bu) {
    return BU.gen.elencaGeneratori().filter(function (g) {
      var m = bu.materiali[g.id];
      return !m || schema.materialeObsoleto(bu, m);
    }).length;
  }

  function renderMateriali(container, bu, segnalaModifica) {
    container.innerHTML = '';

    function ridisegna() {
      renderMateriali(container, bu, segnalaModifica);
    }

    var daAggiornare = contaMaterialiDaAggiornare(bu);
    container.appendChild(el('div', { class: 'materiali-azioni-globali' }, [
      el('button', {
        type: 'button', class: 'pulsante pulsante--primario',
        onclick: function () { rigeneraTutto(bu, segnalaModifica, ridisegna); }
      }, ['Rigenera tutto']),
      daAggiornare
        ? el('span', { class: 'materiali-avviso-globale' },
          [daAggiornare + ' material' + (daAggiornare === 1 ? 'e' : 'i') + ' da generare o aggiornare'])
        : el('span', { class: 'materiali-avviso-globale materiali-avviso-globale--ok' }, ['Tutti aggiornati'])
    ]));

    var numeroCapitolo = 0;
    BU.gen.elencaGeneratoriRaggruppati().forEach(function (gruppo) {
      if (gruppo.titolo) {
        numeroCapitolo += 1;
        container.appendChild(el('div', { class: 'materiali-capitolo' }, [
          el('span', { class: 'materiali-capitolo-numero', text: 'Parte ' + numeroCapitolo }),
          el('h2', { class: 'materiali-capitolo-titolo', text: gruppo.titolo })
        ]));
      }
      gruppo.generatori.forEach(function (generatore) {
        container.appendChild(renderBloccoMateriale(bu, generatore, segnalaModifica, ridisegna));
      });
    });
  }

  function renderBloccoMateriale(bu, generatore, segnalaModifica, ridisegna) {
    var materiale = bu.materiali[generatore.id];
    var blocco = el('div', { class: 'materiale-blocco' });

    var intestazione = el('div', { class: 'materiale-intestazione' }, [
      el('div', { class: 'materiale-titolo-wrap' }, [
        el('h2', { class: 'materiale-titolo', text: generatore.nome }),
        el('div', { class: 'materiale-descrizione', text: generatore.descrizione })
      ])
    ]);

    var controlli = el('div', { class: 'materiale-controlli' });

    if (materiale) {
      controlli.appendChild(el('select', {
        class: 'materiale-stato materiale-stato--' + materiale.stato,
        onchange: function (e) {
          materiale.stato = e.target.value;
          e.target.className = 'materiale-stato materiale-stato--' + materiale.stato;
          segnalaModifica();
        }
      }, schema.STATI_MATERIALE.map(function (s) {
        return el('option', { value: s, selected: s === materiale.stato ? 'selected' : undefined }, [schema.STATI_MATERIALE_ETICHETTE[s]]);
      })));
    }

    var mancanti = BU.gen.campiRichiestiMancanti(bu, generatore);
    var obsoleto = !!materiale && schema.materialeObsoleto(bu, materiale);

    var bottoneGenera = el('button', {
      type: 'button', class: 'pulsante ' + (obsoleto ? 'pulsante--attenzione' : 'pulsante--primario'),
      onclick: function () {
        if (materiale && materiale.modificatoAMano) {
          var ok = global.confirm('Questo materiale è stato modificato a mano. Rigenerarlo sovrascrive le modifiche. Continuare?');
          if (!ok) return;
        }
        var testo = generatore.genera(bu);
        bu.materiali[generatore.id] = {
          stato: materiale ? materiale.stato : 'bozza',
          testo: testo,
          generatoIl: new Date().toISOString(),
          modificatoAMano: false,
          risultatoPrompt: materiale ? materiale.risultatoPrompt : ''
        };
        segnalaModifica();
        ridisegna();
      }
    }, [materiale ? (obsoleto ? 'Rigenera ⚠' : 'Rigenera') : 'Genera']);

    controlli.appendChild(bottoneGenera);
    intestazione.appendChild(controlli);
    blocco.appendChild(intestazione);

    if (mancanti.length) {
      blocco.appendChild(el('div', { class: 'materiale-avviso' }, [
        'Campi richiesti non ancora compilati: ' + mancanti.map(function (d) { return d.etichetta; }).join(', ') + '.'
      ]));
    }

    if (materiale) {
      var metaTesto = 'Generato il ' + formattaData(materiale.generatoIl) +
        (materiale.modificatoAMano ? ' — modificato a mano' : '') +
        (obsoleto ? ' — dati modificati dopo la generazione' : '');
      var meta = el('div', { class: 'materiale-meta' + (obsoleto ? ' materiale-meta--obsoleto' : ''), text: metaTesto });
      blocco.appendChild(meta);

      blocco.appendChild(el('textarea', {
        class: 'materiale-testo', rows: '16', spellcheck: 'false',
        value: materiale.testo,
        oninput: function (e) {
          materiale.testo = e.target.value;
          materiale.modificatoAMano = true;
          meta.textContent = 'Generato il ' + formattaData(materiale.generatoIl) + ' — modificato a mano';
          segnalaModifica();
        }
      }));
    } else {
      blocco.appendChild(el('div', { class: 'materiale-vuoto', text: 'Non ancora generato.' }));
    }

    return blocco;
  }

  // ---------------------------------------------------------------------
  // VISTA: DOCUMENTO — tutti i materiali renderizzati come un unico
  // documento (BU.render.documentoCompleto + BU.markdown), con il download
  // del file .md grezzo. Sola lettura sul contenuto (nessun campo qui è
  // modificabile) — segnalaModifica serve solo per il bottone "Rigenera
  // tutto" del banner qui sotto, che scrive su bu.materiali.
  // ---------------------------------------------------------------------

  function renderDocumento(container, bu, scarica, segnalaModifica) {
    container.innerHTML = '';

    function ridisegna() {
      renderDocumento(container, bu, scarica, segnalaModifica);
    }

    var daAggiornare = contaMaterialiDaAggiornare(bu);
    if (daAggiornare) {
      container.appendChild(el('div', { class: 'documento-avviso-obsoleto' }, [
        el('span', {}, [daAggiornare === 1
          ? '1 materiale qui sotto non è aggiornato rispetto ai dati compilati.'
          : daAggiornare + ' materiali qui sotto non sono aggiornati rispetto ai dati compilati.']),
        el('button', {
          type: 'button', class: 'pulsante pulsante--attenzione pulsante--piccolo',
          onclick: function () { rigeneraTutto(bu, segnalaModifica, ridisegna); }
        }, ['Rigenera tutto'])
      ]));
    }

    var intestazione = el('div', { class: 'documento-intestazione' }, [
      el('div', { class: 'documento-nota' },
        ['Anteprima renderizzata di tutti i materiali generati. Il testo grezzo, modificabile a mano, resta nella vista Materiali.']),
      el('button', { type: 'button', class: 'pulsante pulsante--primario', onclick: scarica }, ['Scarica il file .md'])
    ]);
    container.appendChild(intestazione);

    var corpo = el('div', { class: 'md-render' });
    var intro = el('div');
    intro.innerHTML = BU.markdown.renderizza(BU.render.introDocumento(bu));
    corpo.appendChild(intro);

    var numeroCapitolo = 0;
    BU.render.blocchiDocumento(bu).forEach(function (gruppo) {
      if (gruppo.titolo) {
        numeroCapitolo += 1;
        corpo.appendChild(el('div', { class: 'documento-capitolo' }, [
          el('span', { class: 'documento-capitolo-numero', text: 'Parte ' + numeroCapitolo }),
          el('h1', { class: 'documento-capitolo-titolo', text: gruppo.titolo })
        ]));
      }
      gruppo.blocchi.forEach(function (blocco) {
        var blocchettoDom = el('div');
        blocchettoDom.innerHTML = BU.markdown.renderizza(blocco.markdown);
        corpo.appendChild(blocchettoDom);

        // Il prompt, quando c'è, è sempre l'ultima cosa nel blocco (vedi
        // gen/_registry.js): il campo per il risultato va subito dopo, come
        // vero elemento interattivo — non può stare dentro il markdown
        // renderizzato sopra, che è testo statico.
        if (blocco.generatore.haPrompt && blocco.materiale) {
          corpo.appendChild(renderRisultatoPrompt(bu, blocco.generatore, blocco.materiale, segnalaModifica));
        }
      });
    });
    container.appendChild(corpo);
  }

  function renderRisultatoPrompt(bu, generatore, materiale, segnalaModifica) {
    return el('div', { class: 'risultato-prompt' }, [
      el('label', { class: 'risultato-prompt-etichetta', text: 'Risultato del prompt (' + generatore.nome + ')' }),
      el('textarea', {
        class: 'risultato-prompt-valore', rows: '6',
        placeholder: 'Incolla qui cosa ha risposto lo strumento esterno al prompt sopra.',
        value: materiale.risultatoPrompt,
        oninput: function (e) {
          materiale.risultatoPrompt = e.target.value;
          segnalaModifica();
        }
      })
    ]);
  }

  // ---------------------------------------------------------------------
  // VISTA: VALIDAZIONE
  // ---------------------------------------------------------------------

  var MAPPA_DECISIONE_STATO = {
    continua: 'validata',
    modifica: 'da_modificare',
    ferma: 'archiviata'
  };

  function renderValidazione(container, bu, segnalaModifica) {
    container.innerHTML = '';

    function ridisegna() {
      renderValidazione(container, bu, segnalaModifica);
    }

    var sezioneRisultati = el('section', { class: 'sezione' }, [
      el('h2', { class: 'sezione-titolo', text: 'Risultati del test' })
    ]);

    schema.RISULTATI.forEach(function (def) {
      var riga = el('div', { class: 'risultato-riga' + (def.decide ? ' risultato-riga--decide' : '') });
      riga.appendChild(el('label', {
        class: 'risultato-etichetta',
        text: def.etichetta + (def.decide ? ' — decide davvero' : '')
      }));
      riga.appendChild(el('input', {
        type: 'text', class: 'risultato-valore',
        value: bu.risultati[def.chiave],
        oninput: function (e) {
          bu.risultati[def.chiave] = e.target.value;
          segnalaModifica();
        }
      }));
      sezioneRisultati.appendChild(riga);
    });

    container.appendChild(sezioneRisultati);

    var sezioneDecisione = el('section', { class: 'sezione' }, [
      el('h2', { class: 'sezione-titolo', text: 'Decisione' }),
      el('div', { class: 'campo-aiuto' }, ['Il segnale di messaggio autorizza a telefonare. Solo il segnale di mercato autorizza a costruire.'])
    ]);

    var inputMotivazione = el('textarea', {
      class: 'decisione-motivazione', rows: '3', placeholder: 'Motivazione della decisione',
      value: bu.noteDecisione.motivazione,
      oninput: function (e) { bu.noteDecisione.motivazione = e.target.value; segnalaModifica(); }
    });
    var inputData = el('input', {
      type: 'date', class: 'decisione-data',
      value: bu.noteDecisione.data,
      onchange: function (e) { bu.noteDecisione.data = e.target.value; segnalaModifica(); }
    });

    sezioneDecisione.appendChild(el('label', { class: 'campo-etichetta', text: 'Motivazione' }));
    sezioneDecisione.appendChild(inputMotivazione);
    sezioneDecisione.appendChild(el('label', { class: 'campo-etichetta', text: 'Data' }));
    sezioneDecisione.appendChild(inputData);

    var bottoni = el('div', { class: 'decisione-pulsanti' });
    schema.DECISIONI.forEach(function (d) {
      bottoni.appendChild(el('button', {
        type: 'button',
        class: 'pulsante pulsante-decisione pulsante-decisione--' + d + (bu.decisione === d ? ' attivo' : ''),
        onclick: function () {
          bu.decisione = d;
          bu.stato = MAPPA_DECISIONE_STATO[d];
          if (!bu.noteDecisione.data) {
            bu.noteDecisione.data = new Date().toISOString().slice(0, 10);
          }
          segnalaModifica();
          ridisegna();
        }
      }, [schema.DECISIONI_ETICHETTE[d]]));
    });
    sezioneDecisione.appendChild(bottoni);

    if (bu.decisione) {
      sezioneDecisione.appendChild(el('div', { class: 'decisione-corrente' },
        ['Decisione corrente: ' + schema.DECISIONI_ETICHETTE[bu.decisione] + ' → stato BU: ' + (schema.STATI_BU_ETICHETTE[bu.stato] || bu.stato)]));
    }

    container.appendChild(sezioneDecisione);
  }

  // ---------------------------------------------------------------------
  // VISTE checklist (OUTPUT, LANCIO) — stesso motore: un catalogo fisso di
  // voci { chiave, etichetta, categoria }, spuntabili per questa BU con una
  // nota opzionale. Contenuto e pubblico diversi (OUTPUT: cosa produce il
  // team creativo; LANCIO: cosa è stato verificato operativamente), ma
  // nessuna delle due influisce su completezza o campi critici — sono
  // strumenti di consegna/verifica, non parte della validazione della BU.
  // ---------------------------------------------------------------------

  function rigaChecklist(voce, etichetta, segnalaModifica) {
    var checkbox = el('input', {
      type: 'checkbox', class: 'consegna-checkbox',
      checked: voce.selezionato,
      onchange: function (e) {
        voce.selezionato = e.target.checked;
        segnalaModifica();
      }
    });

    var nota = el('input', {
      type: 'text', class: 'consegna-nota', placeholder: 'Note (opzionale)',
      value: voce.nota,
      oninput: function (e) {
        voce.nota = e.target.value;
        segnalaModifica();
      }
    });

    return el('div', { class: 'consegna-riga' + (voce.selezionato ? ' consegna-riga--selezionata' : '') }, [
      el('label', { class: 'consegna-etichetta' }, [checkbox, ' ' + etichetta]),
      nota
    ]);
  }

  // introTesto: spiegazione in cima. statoOggetto: bu.consegna o bu.lancio.
  // elencoDef: schema.OUTPUT_CREATIVI o schema.CHECKLIST_LANCIO. categorie:
  // [{ chiave, etichetta }, ...], nell'ordine in cui vanno mostrate.
  function renderChecklist(container, introTesto, statoOggetto, elencoDef, categorie, segnalaModifica) {
    container.innerHTML = '';
    container.appendChild(el('div', { class: 'campo-aiuto' }, [introTesto]));

    categorie.forEach(function (cat) {
      var sezioneEl = el('section', { class: 'sezione' }, [
        el('h2', { class: 'sezione-titolo', text: cat.etichetta })
      ]);
      elencoDef.filter(function (def) { return def.categoria === cat.chiave; }).forEach(function (def) {
        sezioneEl.appendChild(rigaChecklist(statoOggetto[def.chiave], def.etichetta, segnalaModifica));
      });
      container.appendChild(sezioneEl);
    });
  }

  function renderConsegna(container, bu, segnalaModifica) {
    renderChecklist(container,
      'Cosa può servire chiedere al team creativo (art director, copywriter) per questa BU. Spunta quello che serve davvero: il resto resta come promemoria di cosa esiste.',
      bu.consegna, schema.OUTPUT_CREATIVI,
      [{ chiave: 'testi', etichetta: 'Testi' }, { chiave: 'design', etichetta: 'Design' }],
      segnalaModifica);
  }

  // Sola lettura: ogni prompt è calcolato al volo dai dati correnti della
  // BU (BU.promptDesign), nessuno stato salvato — niente da rigenerare,
  // riflette sempre l'ultima BU aperta.
  function renderPromptDesign(container, bu) {
    container.innerHTML = '';

    container.appendChild(el('div', { class: 'documento-nota' }, [
      'Un prompt pronto da incollare in uno strumento esterno di generazione immagini (Midjourney, DALL-E, ' +
      'Ideogram, ecc.) per ciascuna voce "design" del catalogo Output. Nessuna immagine viene generata qui: ' +
      'l\'app non chiama API esterne. Consiglio: genera prima Logo e Palette, poi usa i colori e lo stile ' +
      'ottenuti per gli altri prompt, così i materiali restano coerenti tra loro.'
    ]));

    BU.promptDesign.elencoPromptDesign(bu).forEach(function (voce) {
      if (!voce.prompt) return;
      container.appendChild(el('div', { class: 'prompt-design-blocco' }, [
        el('div', { class: 'prompt-design-intestazione' }, [
          el('h3', { class: 'prompt-design-titolo', text: voce.etichetta }),
          el('button', {
            type: 'button', class: 'pulsante pulsante--secondario pulsante--piccolo',
            onclick: function (e) {
              var bottone = e.target;
              var testoOriginale = bottone.textContent;
              global.navigator.clipboard.writeText(voce.prompt).then(function () {
                bottone.textContent = 'Copiato ✓';
                global.setTimeout(function () { bottone.textContent = testoOriginale; }, 1500);
              }).catch(function () {
                bottone.textContent = 'Copia non riuscita';
                global.setTimeout(function () { bottone.textContent = testoOriginale; }, 1500);
              });
            }
          }, ['Copia'])
        ]),
        el('pre', { class: 'prompt-design-testo', text: voce.prompt })
      ]));
    });
  }

  function renderLancio(container, bu, segnalaModifica) {
    renderChecklist(container,
      'Checklist operativa per il lancio di questa BU — setup, sito, tracking/Meta, software di qualificazione. ' +
        'Dettaglio di ogni voce nel Vademecum operativo (link in sidebar). Spunta cosa è stato verificato per questa BU.',
      bu.lancio, schema.CHECKLIST_LANCIO,
      [
        { chiave: 'apertura', etichetta: 'Apertura' },
        { chiave: 'sito', etichetta: 'Sito' },
        { chiave: 'tracking_meta', etichetta: 'Tracking e Meta' }
      ],
      segnalaModifica);
  }

  // ---------------------------------------------------------------------
  // Esportazione
  // ---------------------------------------------------------------------

  BU.ui = {
    el: el,
    formattaData: formattaData,
    renderCompila: renderCompila,
    renderMateriali: renderMateriali,
    renderDocumento: renderDocumento,
    renderValidazione: renderValidazione,
    renderConsegna: renderConsegna,
    renderPromptDesign: renderPromptDesign,
    renderLancio: renderLancio,
    MAPPA_DECISIONE_STATO: MAPPA_DECISIONE_STATO
  };

}(typeof window !== 'undefined' ? window : this));
