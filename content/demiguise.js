// Canonical locations. Existing h1..h7, u1 and b1 IDs are intentionally immutable.
// Sources and image provenance are audited in docs/research/demiguise.md.
const source = (url,title) => ({url,title});
const MULTI = source('https://multiplayer.it/soluzioni/hogwarts-legacy-dove-trovare-statuette-demiguise-potenziare-alohomora.html','Multiplayer.it · Demiguise');
const PLAYER = source('https://www.player.it/guide/504605-hogwarts-legacy-guida-alle-statuette-di-demiguise.html','Player.it · Demiguise');
const POWER = source('https://www.powerpyx.com/hogwarts-legacy-all-demiguise-statue-locations/','PowerPyx · 33 statuette');
const QUEST = source('https://www.powerpyx.com/hogwarts-legacy-the-caretakers-lunar-lament-walkthrough/','PowerPyx · missione introduttiva');
const PUSH = source('https://www.pushsquare.com/guides/hogwarts-legacy-all-demiguise-statues-locations','Push Square · posizioni');
const PGG = source('https://progameguides.com/hogwarts-legacy/all-11-demiguise-statue-locations-on-the-world-map-in-hogwarts-legacy/','Pro Game Guides · villaggi');
const PGGH = source('https://progameguides.com/hogwarts-legacy/all-9-demiguise-statues-locations-in-hogsmeade-in-hogwarts-legacy/','Pro Game Guides · Hogsmeade');
const PANDA = source('https://www.pandallax.com/guides/hogwarts-legacy-all-demiguise-locations','Pandallax · itinerari Demiguise');
const PCG = source('https://www.pcgamer.com/hogwarts-legacy-demiguise-statues-moons-locations/','PC Gamer · posizioni e immagini');
const GG = source('https://www.gamerguides.com/hogwarts-legacy/guide/demiguise-statues/the-highlands/all-demiguise-statues-in-the-highlands-in-hogwarts-legacy/','Gamer Guides · Highlands');
const G4 = source('https://guides4gamers.com/hogwarts-legacy/pois/demiguise-moons-world/','Guides4Gamers · mappa dei villaggi');
const WC = source('https://www.windowscentral.com/gaming/all-30-hogwarts-legacy-demiguise-statue-locations-list','Windows Central · mappa e posizioni');
const EVERY = source('https://www.everyeye.it/notizie/hogwarts-legacy-guida-come-trovare-statue-demiguise-638924.html','Everyeye · itinerari');
const GAMEWITH = source('https://gamewith.net/hogwarts-legacy/article/show/37998','GameWith · mappa Demiguise');
const ARAN = source('https://www.aranzulla.it/come-aprire-le-serrature-hogwarts-legacy-1509509.html','Aranzulla · Alohomora e missione italiana');
const pad = n => String(n).padStart(2,'0');
const entrancePhotos = new Set([12,14,16,18,19,20,21,22,23,24,25,26,27,28,29,30]);
const powerRoomPhotos = new Set([12,14,16,19,28,29,30]);
const photo = (n,alt,room=false) => ({
  src:`assets/demiguise/${pad(n)}${room?'-room':''}.jpg`, alt,
  kind:room||!entrancePhotos.has(n)?'room':'entrance',
  credit:room?(powerRoomPhotos.has(n)?'Foto di riferimento: PowerPyx.':'Foto di riferimento: PC Gamer / Portkey Games.'):'Foto di riferimento: Multiplayer.it.',
  source:room?(powerRoomPhotos.has(n)?POWER.url:PCG.url):MULTI.url
});
const moon = (id,title,location,group,lock,steps,n,sources,room=false) => ({
  id,title,location,group,lock,steps,photos:powerRoomPhotos.has(n)?[
    photo(n,`${title}: interno della stanza con la statuetta evidenziata`,true),
    photo(n,`${title}: edificio da raggiungere e riferimento esterno`)
  ]:[photo(n,`${title}: ${room||!entrancePhotos.has(n)?'interno e posizione della statuetta':'edificio da raggiungere e riferimento esterno'}`,room)],
  sources,verified:'2026-10-20'
});

export const DEMIGUISE_GUIDE = {
  id:'demiguise',title:'Demiguise e Alohomora',section:'sblocchi',category:'demiguise',
  summary:'Dalle prime lune a tutte le 30 statuette del mondo, con percorsi divisi per luogo e serratura.',
  location:'Hogwarts, Hogsmeade e Highlands',aliases:['lune','luna','statuette','demigais','dimigais','alomora','alohomora'],
  order:1,tracking:true,verified:'2026-10-20',
  requirements:['Completa la missione principale «Il custode dalla luna storta».','Raccogli le lune di notte: nella mappa usa «Attendi» se è giorno.'],
  steps:[
    'Inizia dalla missione di Gladwin Moon: insegna Alohomora I e comprende tre statuette introduttive.',
    'Dopo la missione iniziale cerca le 30 lune qui sotto: 10 a Hogwarts, 9 a Hogsmeade e 11 nei villaggi.',
    'Porta 9 nuove lune a Moon per imparare Alohomora II; poi consegnane altre 13 per Alohomora III.',
    'Raccoglierle non basta: torna da Moon, presso la Torre del Corpo Docente, e completa il dialogo di consegna.'
  ],
  panels:[
    {title:'Come funzionano i livelli',paragraphs:['Con Alohomora I puoi visitare le posizioni senza serratura o con serratura I. Con II puoi raggiungerle tutte: nessuna luna richiede III.','Le tre lune della missione iniziale non rientrano nelle 30 del mondo né nelle consegne da 9 e 13. Per ottenere tutti i livelli di Alohomora bastano 22 lune del mondo; le altre 8 sono facoltative.']},
    {title:'Se non riesci a raccoglierla',paragraphs:['Controlla che sia notte e che la missione introduttiva sia conclusa. Avvicinati alla statuetta: Revelio aiuta a individuarla al buio.','Se è giorno, la statuetta può essere visibile ma non raccoglibile. Le fotografie servono a riconoscere la stanza; aspetto e comandi possono differire da Nintendo Switch 2.']},
    {title:'Raccolta, consegna e missione sono cose diverse',paragraphs:['Spunta una luna quando l’hai presa nel gioco. Il livello di Alohomora va aggiornato solo quando Moon te lo insegna.','La guida non legge il salvataggio della Switch: conferma tu le lune raccolte, quelle consegnate e il livello appreso.']},
    {title:'Come raggiungere i villaggi a sud',paragraphs:['Per arrivare a Marunweem, Bainburgh e Cragcroft, attraversa a piedi il passaggio della Caverna Costiera: non puoi sorvolare la montagna con la scopa. Segna una destinazione oltre la montagna e segui il percorso sulla mappa.']}
  ],
  photos:[],related:['main-gdw-01','q-dms-01'],sources:[POWER,PLAYER,ARAN]
};

export const INTRO_MOONS = [
  {id:'dm-intro-moon',title:'La prima luna con Gladwin Moon',location:'Hogwarts',group:'Missione introduttiva',lock:0,
    steps:['Raggiungi il segnalino della missione «Il custode dalla luna storta» e parla con Moon. Raccogli la luna che ti indica, poi seguilo alla torre.'],photos:[],sources:[QUEST,ARAN],verified:'2026-10-20'},
  {id:'dm-intro-prefects',title:'Bagno dei prefetti',location:'Hogwarts',group:'Missione introduttiva',lock:1,
    steps:['Dopo aver imparato Alohomora, entra nella Torre del Corpo Docente. Usa Disillusione e sali seguendo l’obiettivo.','Nel bagno resta sul lato sinistro per evitare i prefetti; la luna è in fondo alla stanza.'],photos:[],sources:[QUEST],verified:'2026-10-20'},
  {id:'dm-intro-hospital',title:'Infermeria',location:'Hogwarts',group:'Missione introduttiva',lock:0,
    steps:['Esci dal bagno e continua a salire. Distrai il prefetto con un colpo base sulla statua del cavallo, poi passa senza farti vedere.','Raccogli la luna nell’infermeria e torna da Moon con le due lune della torre.'],photos:[],sources:[QUEST],verified:'2026-10-20'}
];

export const MOONS = [
  moon('dm-hw-fig','Studio del professor Fig','Hogwarts','Ala di Astronomia',0,[
    'Dalla Metropolvere «Aula del professor Fig», entra nell’aula e sali le scale fino alla porta del suo studio.',
    'La statuetta è sul tavolino a sinistra del camino, in fondo alla stanza.'
  ],1,[PLAYER,PCG]),
  moon('dm-hw-muggle','Aula di Babbanologia','Hogwarts','Ala di Astronomia',1,[
    'Dall’Aula di Trasfigurazione, voltati, attraversa la porta a sinistra e scendi le scale a destra fino al drago addormentato.',
    'Prendi il corridoio davanti al drago e apri la prima porta a sinistra. La luna è sul mobile a destra, vicino al filatoio.'
  ],2,[PANDA,MULTI]),
  moon('dm-hw-dada','Stanza dei gargoyle','Hogwarts','Ala di Astronomia',2,[
    'Dal Cortile di Trasfigurazione, entra nella Torre di Difesa contro le Arti Oscure.',
    'Apri la porta a destra, tra due gargoyle parlanti. La statuetta è sul mobile a sinistra.'
  ],3,[PUSH,PLAYER]),
  moon('b1','Aula di Divinazione','Hogwarts','Biblioteca',0,[
    'Dalla Metropolvere «Aula di Divinazione», sali la scala a chiocciola e poi quella a pioli che scende dall’alto.',
    'Nell’aula cerca la scrivania della professoressa Onai: la luna è appoggiata sopra.'
  ],7,[PUSH,PLAYER]),
  moon('dm-hw-library','Reparto Proibito','Hogwarts','Biblioteca',0,[
    'Dalla Biblioteca entra nel Reparto Proibito attraverso il cancello e scendi entrambi i piani.',
    'Segui il passaggio fino al mobile con la lampada, vicino al forziere con l’occhio: la luna è accanto alla lampada.'
  ],8,[WC,POWER]),
  moon('dm-hw-potions','Ripostiglio sotto l’Aula di Pozioni','Hogwarts','Biblioteca',2,[
    'Dalla Metropolvere «Aula di Pozioni», attraversa le doppie porte e scendi la scala a sinistra.',
    'Apri la porta con serratura I in fondo alle scale. Nel corridoio dei ritratti apri la porta con serratura II sulla sinistra: la statuetta è nel ripostiglio.'
  ],9,[PANDA,PLAYER]),
  moon('dm-hw-north','Stanza sotto le mura','Hogwarts','Ala della Torre Campanaria',1,[
    'Dall’Uscita Nord di Hogwarts, voltati verso il castello e costeggia le mura a sinistra.',
    'Apri la porta sotto la scala, senza salire: la luna è sulla cassa a destra.'
  ],4,[POWER,PCG]),
  moon('dm-hw-howin','Ufficio della professoressa Howin','Hogwarts','Ala della Torre Campanaria',2,[
    'Dal Cortile degli Animali, voltati verso l’edificio e apri la porta con serratura II.',
    'Entra nella camera da letto: la statuetta è sul tavolo, vicino alla finestra.'
  ],5,[MULTI,PANDA]),
  moon('dm-hw-hall','Salottino della Sala Grande','Hogwarts','Sala Grande',1,[
    'Dalla Metropolvere «Sala Grande», attraversa la sala restando sul lato destro e apri la piccola porta con serratura I.',
    'La luna è sul tavolino tra le poltrone, davanti al camino.'
  ],6,[PCG,MULTI]),
  moon('dm-hw-bathroom','Bagno fuori servizio','Hogwarts','Ala Sud',1,[
    'Dalla Torre del Corpo Docente scendi fino al corridoio dei quadri musicisti; prendi le scale a destra e gira a sinistra.',
    'Apri il bagno chiuso sulla sinistra. Attraversa la cabina centrale «fuori servizio»: la luna è nella stanza nascosta.'
  ],10,[PLAYER,PANDA]),
  moon('h1','Tomi e Pergamene','Hogsmeade','Zona sud',0,[
    'Entra nel negozio, supera il bancone e passa nella camera sulla sinistra.',
    'La luna è sul cassettone sotto la finestra; letto e stufa sono sulla destra.'
  ],11,[PANDA,PLAYER]),
  moon('dm-hm-tomes-house','Casa vicino a Tomi e Pergamene','Hogsmeade','Zona sud',2,[
    'Guardando l’ingresso di Tomi e Pergamene, vai a destra e imbocca il vicolo a sinistra.',
    'Apri la porta della casa sul lato sinistro, con serratura II. Sali le scale: la luna è sul cassettone vicino alla sfera di cristallo.'
  ],12,[PLAYER,PGGH]),
  moon('h2','Testa di Porco','Hogsmeade','Zona ovest',0,[
    'Entra nella locanda e raggiungi il retro passando oltre il bancone, sulla destra.',
    'La statuetta è sulle casse nel piccolo locale di servizio.'
  ],13,[PGGH,PANDA]),
  moon('dm-hm-pippin-house','Casa accanto a Pozioni di J. Pippin','Hogsmeade','Zona ovest',2,[
    'Mettiti di fronte al negozio di pozioni. Entra nella casa subito a destra, aprendo la porta con serratura II.',
    'Sali le scale: la statuetta è sul cassettone al piano superiore.'
  ],14,[PANDA,PGGH]),
  moon('h3','Tre Manici di Scopa','Hogsmeade','Zona centrale',1,[
    'Entra nella locanda e sali tutte le rampe fino all’ultimo piano. Apri la porta con serratura I.',
    'Nella stanza privata la luna è sul tavolino davanti al camino.'
  ],15,[PGGH,POWER]),
  moon('h4','Casa a est dei Tre Manici di Scopa','Hogsmeade','Zona centrale',1,[
    'Guardando l’ingresso della locanda, prendi la strada a destra ed entra nella prima casa sulla sinistra, con serratura I.',
    'Sali le scale: cerca la luna sul piccolo mobile vicino alla candela.'
  ],16,[PGGH,POWER]),
  moon('h5','Stratchy & Sons · locale comunicante','Hogsmeade','Zona centrale',0,[
    'Entra da Abbigliamento per maghi Stratchy & Sons e passa nel locale comunicante a destra.',
    'La luna è sul bancone, vicino al martello che lavora da solo.'
  ],17,[MULTI,PGGH]),
  moon('h7','Casa di fronte a Fiera delle Fiere','Hogsmeade','Zona nord',1,[
    'Lascia l’ingresso di Fiera delle Fiere alle spalle e attraversa la strada.',
    'Apri la porta con serratura I: la statuetta è sulla mensola del camino.'
  ],18,[PGGH,PCG],true),
  moon('h6','Casa dietro Mielandia','Hogsmeade','Zona nord-est',1,[
    'Guardando Mielandia, prendi i gradini a sinistra; poi gira a destra sulla strada in salita.',
    'Entra nella casetta più a destra, aprendo la porta con serratura I. La luna è sul tavolino sotto un quadro, al piano terra.'
  ],19,[PLAYER,PGGH]),
  moon('dm-world-pitt','Pitt-Upon-Ford · casa con carrozza','Pitt-Upon-Ford','Palude del Guado',0,[
    'Dalla Metropolvere scendi verso sud fino alla casa con la carrozza, prima del ponte.',
    'Sali all’ultimo piano: la luna è a terra, vicino allo specchio.'
  ],20,[PUSH,WC],true),
  moon('u1','Upper Hogsfield · casa vicino al pozzo','Upper Hogsfield','Valle di Hogsmeade',1,[
    'Dalla Metropolvere segui la strada fino al pozzo. Entra nella casa a ovest, riconoscibile dalla ruota accanto alla porta.',
    'La luna è sullo sgabello subito all’interno.'
  ],21,[GG,PGG],true),
  moon('dm-world-aranshire','Aranshire · casa accanto alla Metropolvere','Aranshire','Regione Sud di Hogwarts',1,[
    'Dalla Metropolvere entra nella casa subito a sinistra, aprendo la porta con serratura I. Sali le scale.',
    'Cerca la statuetta a terra, ai piedi del letto.'
  ],22,[PUSH,G4],true),
  moon('dm-world-lower','Lower Hogsfield · casa all’ingresso','Lower Hogsfield','Regione Sud di Hogwarts',0,[
    'Dalla Metropolvere entra nel villaggio e raggiungi la prima casa sulla destra, con il tetto arrotondato.',
    'La luna è a terra, dietro la porta d’ingresso.'
  ],23,[PUSH,WC],true),
  moon('dm-world-brocburrow','Brocburrow · casa vicino al pozzo','Brocburrow','Valle di Hogwarts',1,[
    'Raggiungi il pozzo e la piattaforma della Prova di Merlino. Entra nella casa subito a nord-ovest.',
    'La luna è sulla mensola più bassa, a sinistra dell’ingresso, vicino al paravento.'
  ],24,[PGG,G4],true),
  moon('dm-world-keenbridge','Keenbridge · casa con le zucche','Keenbridge','Valle di Hogwarts',1,[
    'Dal centro del villaggio sali verso la casa più a ovest, con zucche e bucato all’esterno.',
    'Apri la serratura I: la statuetta è sul tavolino vicino alla scala.'
  ],25,[GG,PUSH],true),
  moon('dm-world-irondale','Irondale · casa di Althea Twiddle','Irondale','Regione di Feldcroft',0,[
    'Dalla Metropolvere raggiungi la casa vicina con Althea Twiddle all’esterno e il tetto di paglia a punta.',
    'Entra e passa dietro il bancone della cucina: la luna è a terra, accanto alla stufa.'
  ],27,[PCG,EVERY],true),
  moon('dm-world-feldcroft','Feldcroft · casa a est del pozzo','Feldcroft','Regione di Feldcroft',2,[
    'Dal pozzo centrale raggiungi la casa a est, con il bucato steso. Apri la porta con serratura II.',
    'La luna è sul davanzale a sinistra, al piano terra.'
  ],26,[GG,PGG],true),
  moon('dm-world-marunweem','Marunweem · casa vicino alla bacheca','Marunweem','Lago di Marunweem',1,[
    'Dalla Metropolvere vai a nord, poi prendi la prima strada a destra. Entra nella casa a sinistra, vicino alla bacheca e ai calderoni impilati.',
    'La luna è a terra, dietro il bancone della cucina sulla sinistra.'
  ],28,[PGG,WC]),
  moon('dm-world-bainburgh','Bainburgh · casa a nord del villaggio','Bainburgh','Capo del Maniero',2,[
    'Dalla Metropolvere vai verso il mercante. Prima della bancarella gira a sinistra verso la casa oltre la bacheca.',
    'Entra e guarda la seduta della poltrona sulla sinistra: la statuetta è appoggiata lì.'
  ],29,[GG,MULTI,GAMEWITH]),
  moon('dm-world-cragcroft','Cragcroft · casa del mercante','Cragcroft','Cragcroftshire',0,[
    'Dalla Metropolvere esci dal rudere e raggiungi il grande albero nel centro del villaggio.',
    'Entra nella casa accanto alla bancarella di Bella Navarro e sali le scale: la statuetta è sul comodino vicino al letto.'
  ],30,[PUSH,WC])
];
