# Guida Completa Hogwarts Legacy · 2.1.1

**Sito:** https://guida-hogwarts-legacy-ele-thom.github.io/

Guida italiana per Nintendo Switch 2, con profili Ele/Grifondoro e
Thom/Serpeverde. Gli aggiornamenti della guida arrivano sullo stesso link.

## Novità 2.1

- Indirizzo dedicato; il vecchio sito conserva l'accesso e permette il passaggio
  dopo aver sincronizzato i progressi presenti sul dispositivo.

- Ingresso dalla Home e cambio profilo nel menu personale.
- Precedente/successiva in alto e in fondo a ogni scheda.
- Ritorno all’elenco con ricerca, filtri e punto di lettura conservati.
- Spunta di salvataggio discreta, con dettagli apribili.
- Stemma di Hogwarts nella scheda del browser.
- Italiano rivisto, ricette più chiare e percorsi lunghi divisi per stanza.
- Schede rapide per oggetti e incantesimi; fotografie aperte su richiesta.

## Contenuti

353 schede: 140 voci missione, comprese le varianti di casata e gli incarichi;
99 guide pratiche e di sblocco; 95 prove di Merlino; 17 enigmi di Hogwarts;
guida introduttiva alle prove e guida Demiguise. Le 30 lune del mondo e
le 3 introduttive hanno checklist separate. Il percorso generale al 100%
e la ricerca tramite fotografie restano rinviati.

## Sviluppo

Frontend HTML, CSS e moduli JavaScript, senza compilazione o librerie runtime.
Per i controlli locali serve Node.js 22 o successivo:

```sh
npm run check
```

Per aprire il sito in locale, servirlo via HTTP: i moduli non vanno avviati
aprendo direttamente il file HTML. I test automatici non sostituiscono il
controllo del sito pubblicato in un browser, a larghezze da smartphone.

| File | Funzione |
| --- | --- |
| `index.html`, `styles.css` | Struttura, accessibilità e temi approvati |
| `app.js` | Navigazione, ricerca, schede, foto e controlli |
| `guide-data.js`, `guide-model.js` | Catalogo e regole comuni |
| `content/` | Testi, requisiti, collegamenti e fonti delle guide |
| `search.js` | Ricerca locale, senza chiamate AI |
| `assets/` | Emblemi e fotografie locali |
| `*.test.js` | Controlli automatici e regressioni |

## Aggiungere o correggere una guida

1. Aggiornare la scheda canonica in `content/`, conservandone l’ID.
2. Verificare online nomi italiani e fatti nuovi. Scrivere istruzioni brevi e
   concrete; indicare le fonti e distinguere indicazioni pratiche e spoiler.
3. Usare `chapters` per un percorso lungo: ogni capitolo ha `title`, `steps`
   ed eventuali `photos`. Foto reali, ampie e pertinenti, con credito e fonte.
4. Mettere le rivelazioni narrative nei pannelli apribili con avviso spoiler.
   Ricerca e titoli delle schede devono rimanere sicuri.
5. Collegare le altre guide tramite i loro ID, senza duplicarle. Non modificare
   la gestione dei progressi per correggere testi, immagini o impaginazione.
6. Eseguire i controlli, provare la navigazione da smartphone e aggiornare
   insieme i riferimenti di versione degli asset modificati.

Lo stile approvato usa antracite, sfumature rosse o verdi e dettagli oro o
argento. Non sostituire gli emblemi con immagini inventate.

Guida indipendente, non affiliata agli autori del gioco. Fonti e crediti
fotografici sono nelle singole schede. Stemma di Hogwarts: MinaLima /
HarryPotter.com; provenienza in `assets/hogwarts-crest-source.json`.
