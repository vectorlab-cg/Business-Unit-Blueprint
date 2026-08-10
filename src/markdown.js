/*
 * markdown.js
 * Renderer da Markdown a HTML per il documento composto (vista DOCUMENTO):
 * non è un parser Markdown generico, copre solo il sottoinsieme che
 * render.js e i generatori producono davvero — titoli, grassetto, corsivo,
 * codice inline, blocchi di codice, elenchi puntati/numerati, tabelle,
 * linea orizzontale, commenti HTML. Riga per riga: ogni riga pushata da un
 * generatore è un blocco a sé, non viene unita alle righe vicine in un
 * unico paragrafo (i generatori già decidono dove va un a-capo).
 *
 * Namespace globale: window.BU.markdown
 */
(function (global) {
  'use strict';

  var BU = global.BU = global.BU || {};

  function escapeHtml(testo) {
    return String(testo)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // render.escapeCella inserisce <br> letterali per gli a-capo interni alle
  // celle di tabella: dopo l'escaping generale li riportiamo a tag veri.
  function ripristinaBr(testoEscapato) {
    return testoEscapato.replace(/&lt;br&gt;/g, '<br>');
  }

  // Formattazione inline (codice, grassetto, corsivo), in quest'ordine, sul
  // testo già escapato — gli inserimenti successivi sono tag HTML veri.
  function inline(testo) {
    var html = ripristinaBr(escapeHtml(testo));
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
    return html;
  }

  // Divide una riga "| a | b |" nelle sue celle, rispettando i "\|" escapati
  // da render.escapeCella (altrimenti spezzerebbero la cella a metà).
  function celleTabella(riga) {
    var senzaBordi = riga.trim().replace(/^\|/, '').replace(/\|$/, '');
    var celle = [];
    var corrente = '';
    for (var i = 0; i < senzaBordi.length; i++) {
      var ch = senzaBordi[i];
      if (ch === '\\' && senzaBordi[i + 1] === '|') { corrente += '|'; i++; continue; }
      if (ch === '|') { celle.push(corrente); corrente = ''; continue; }
      corrente += ch;
    }
    celle.push(corrente);
    return celle.map(function (c) { return c.trim(); });
  }

  function eSeparatoreTabella(riga) {
    return /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?$/.test(riga.trim());
  }

  function renderizza(testo) {
    var righe = String(testo || '').split('\n');
    var html = [];

    var lista = null; // { tag: 'ul'|'ol', voci: [ [riga, riga, ...], ... ] }
    var tabella = null; // { intestazioni: [...], righe: [[...], ...] }
    var inCodice = false;
    var bufferCodice = [];

    function chiudiLista() {
      if (!lista) return;
      html.push('<' + lista.tag + '>' + lista.voci.map(function (righeVoce) {
        return '<li>' + righeVoce.map(inline).join('<br>') + '</li>';
      }).join('') + '</' + lista.tag + '>');
      lista = null;
    }

    function chiudiTabella() {
      if (!tabella) return;
      html.push('<table><thead><tr>' +
        tabella.intestazioni.map(function (c) { return '<th>' + inline(c) + '</th>'; }).join('') +
        '</tr></thead><tbody>' +
        tabella.righe.map(function (r) {
          return '<tr>' + r.map(function (c) { return '<td>' + inline(c) + '</td>'; }).join('') + '</tr>';
        }).join('') +
        '</tbody></table>');
      tabella = null;
    }

    righe.forEach(function (riga) {
      if (riga.trim() === '```') {
        if (inCodice) {
          html.push('<pre><code>' + bufferCodice.map(escapeHtml).join('\n') + '</code></pre>');
          bufferCodice = [];
          inCodice = false;
        } else {
          chiudiLista(); chiudiTabella();
          inCodice = true;
        }
        return;
      }
      if (inCodice) { bufferCodice.push(riga); return; }

      if (!riga.trim()) { chiudiLista(); chiudiTabella(); return; }

      var mHeading = riga.match(/^(#{1,6})\s+(.*)$/);
      if (mHeading) {
        chiudiLista(); chiudiTabella();
        var livello = mHeading[1].length;
        html.push('<h' + livello + '>' + inline(mHeading[2]) + '</h' + livello + '>');
        return;
      }

      if (/^-{3,}$/.test(riga.trim())) {
        chiudiLista(); chiudiTabella();
        html.push('<hr>');
        return;
      }

      var mCommento = riga.match(/^<!--(.*)-->$/);
      if (mCommento) {
        chiudiLista(); chiudiTabella();
        html.push('<!--' + mCommento[1] + '-->');
        return;
      }

      if (riga.trim().charAt(0) === '|') {
        chiudiLista();
        var celle = celleTabella(riga);
        if (!tabella) tabella = { intestazioni: celle, righe: [] };
        else if (!eSeparatoreTabella(riga)) tabella.righe.push(celle);
        return;
      }
      chiudiTabella();

      var mOrdinata = riga.match(/^\d+\.\s+(.*)$/);
      var mPuntata = riga.match(/^-\s+(.*)$/);
      if (mOrdinata || mPuntata) {
        var tag = mOrdinata ? 'ol' : 'ul';
        if (!lista || lista.tag !== tag) { chiudiLista(); lista = { tag: tag, voci: [] }; }
        lista.voci.push([(mOrdinata || mPuntata)[1]]);
        return;
      }

      // Riga rientrata (2+ spazi): continuazione della voce di lista
      // precedente (usato da "Problem Statement" per i dettagli di ogni
      // punto numerato), non un nuovo paragrafo.
      var mContinuazione = riga.match(/^\s{2,}(.*)$/);
      if (mContinuazione && lista && lista.voci.length) {
        lista.voci[lista.voci.length - 1].push(mContinuazione[1]);
        return;
      }
      chiudiLista();

      html.push('<p>' + inline(riga) + '</p>');
    });

    chiudiLista();
    chiudiTabella();
    if (inCodice) html.push('<pre><code>' + bufferCodice.map(escapeHtml).join('\n') + '</code></pre>');

    return html.join('\n');
  }

  BU.markdown = {
    renderizza: renderizza
  };

}(typeof window !== 'undefined' ? window : this));
