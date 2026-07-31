# Aggiungere un generatore

Costa un file e una riga in `index.html`. Non serve toccare `test/smoke.js`
(scopre da solo i file in `src/gen/`), né `src/ui.js` o `src/app.js` (la
vista MATERIALI itera `BU.gen.elencaGeneratori()`).

## 1. Crea il file

`src/gen/NN-nome-generatore.js`, dove `NN` è il numero d'ordine (usato solo
per l'ordine di caricamento e visualizzazione — non ha altro significato).
Segui lo scheletro dei generatori esistenti:

```js
(function (global) {
  'use strict';

  var BU = global.BU = global.BU || {};
  var schema = BU.schema;
  var render = BU.render;

  function genera(bu) {
    var righe = [];
    righe.push('# Nome del materiale — ' + bu.nome);
    righe.push('');
    righe.push(render.testoCampo(bu, 'identita', 'descrizione'));
    // ...
    return righe.join('\n');
  }

  BU.registraGeneratore({
    id: 'id-univoco-kebab-case',
    nome: 'Nome leggibile',
    descrizione: 'Una riga: cosa produce.',
    richiede: ['identita.descrizione'], // sezione.chiave dei campi che servono per avere senso
    genera: genera
  });

}(typeof window !== 'undefined' ? window : this));
```

`genera(bu)` deve restituire una stringa Markdown, **sempre**, anche con una
BU completamente vuota: mai lanciare un'eccezione, mai lasciare `undefined`
nel testo.

## 2. Aggiungi la riga in `index.html`

Nel blocco degli script, dopo `_registry.js` e prima di `ui.js`:

```html
<script src="src/gen/NN-nome-generatore.js"></script>
```

## 3. Rispetta le regole non negoziabili

- **Mai un buco silenzioso.** Se un campo richiesto per una frase manca, usa
  `render.testoCampo(bu, sezione, chiave)` (restituisce già
  `[MANCA: Etichetta]` quando vuoto) invece di leggere `bu.campi...valore`
  a mano. Per le liste, `render.listaMarkdown(bu, sezione, chiave)`.
- **Mai inventare testo che richiede giudizio umano.** Se una frase deve
  essere scritta da una persona (una headline, un annuncio, una chiusura
  persuasiva), non provare a comporla dai campi: usa
  `render.daScrivere('cosa va scritto')` e, se ha senso, produci in coda un
  prompt compilato con i dati rilevanti (vedi gli altri generatori per lo
  stile — un blocco ` ``` ` con i campi rilevanti e le regole di scrittura).
- **`richiede` è solo un avviso**, non un blocco: la vista MATERIALI mostra
  quali campi elencati in `richiede` sono ancora vuoti, ma il pulsante
  "Genera" resta sempre cliccabile.

## 4. Verifica

```
node test/smoke.js
```

Il file di test verifica automaticamente, per **ogni** generatore
registrato (compreso il tuo): id univoco, che i campi in `richiede`
esistano nello schema, che la generazione con una BU compilata non lasci
`undefined` né `[MANCA:` residui, e che la generazione con una BU vuota non
lanci eccezioni e segnali almeno un buco.
