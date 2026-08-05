/*
 * ui.js
 * Le tre viste di una business unit: COMPILA, MATERIALI, VALIDAZIONE.
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

  function renderCompila(container, bu, segnalaModifica) {
    container.innerHTML = '';

    function ridisegna() {
      renderCompila(container, bu, segnalaModifica);
    }

    schema.SEZIONI.forEach(function (sezione) {
      var sezioneEl = el('section', { class: 'sezione' }, [
        el('h2', { class: 'sezione-titolo', text: sezione.etichetta })
      ]);

      schema.elencaCampiSezione(sezione.chiave).forEach(function (def) {
        sezioneEl.appendChild(renderCampo(bu, def, segnalaModifica));
      });

      container.appendChild(sezioneEl);
    });

    container.appendChild(renderLeve(bu, segnalaModifica, ridisegna));
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
    var wrapper = el('section', { class: 'sezione sezione--leve' }, [
      el('h2', { class: 'sezione-titolo', text: 'Leve (' + bu.leve.length + '/5)' })
    ]);

    if (bu.leve.length < 3) {
      wrapper.appendChild(el('div', { class: 'campo-avviso campo-avviso--visibile' },
        ['Servono da 3 a 5 leve. Ne mancano almeno ' + (3 - bu.leve.length) + '.']));
    }

    var elenco = el('div', { class: 'leve-elenco' });
    bu.leve.forEach(function (leva, indice) {
      elenco.appendChild(renderLevaCard(bu, leva, indice, segnalaModifica, ridisegna));
    });
    wrapper.appendChild(elenco);

    wrapper.appendChild(el('button', {
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
    var card = el('div', { class: 'leva-card' });

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

  function renderMateriali(container, bu, segnalaModifica) {
    container.innerHTML = '';

    function ridisegna() {
      renderMateriali(container, bu, segnalaModifica);
    }

    BU.gen.elencaGeneratori().forEach(function (generatore) {
      container.appendChild(renderBloccoMateriale(bu, generatore, segnalaModifica, ridisegna));
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

    var bottoneGenera = el('button', {
      type: 'button', class: 'pulsante pulsante--primario',
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
          modificatoAMano: false
        };
        segnalaModifica();
        ridisegna();
      }
    }, [materiale ? 'Rigenera' : 'Genera']);

    controlli.appendChild(bottoneGenera);
    intestazione.appendChild(controlli);
    blocco.appendChild(intestazione);

    if (mancanti.length) {
      blocco.appendChild(el('div', { class: 'materiale-avviso' }, [
        'Campi richiesti non ancora compilati: ' + mancanti.map(function (d) { return d.etichetta; }).join(', ') + '.'
      ]));
    }

    if (materiale) {
      var metaTesto = 'Generato il ' + formattaData(materiale.generatoIl) + (materiale.modificatoAMano ? ' — modificato a mano' : '');
      var meta = el('div', { class: 'materiale-meta', text: metaTesto });
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
  // Esportazione
  // ---------------------------------------------------------------------

  BU.ui = {
    el: el,
    formattaData: formattaData,
    renderCompila: renderCompila,
    renderMateriali: renderMateriali,
    renderValidazione: renderValidazione,
    MAPPA_DECISIONE_STATO: MAPPA_DECISIONE_STATO
  };

}(typeof window !== 'undefined' ? window : this));
