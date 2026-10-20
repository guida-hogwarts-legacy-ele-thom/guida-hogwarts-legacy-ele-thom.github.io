// Enigmi del castello. ID permanenti; ricerca e divergenze in docs/research/hogwarts-puzzles.md.
const verified = '2026-10-20';
const base = { section: 'pratiche', category: 'enigmi', location: 'Hogwarts', verified, tracking: true };
const source = (url, title) => ({ url, title });
const photo = (src, alt, credit, source) => ({ src, alt, credit, source });
const doorsUrl = 'https://www.gamepur.com/guides/all-arithmancy-door-puzzle-locations-and-solutions-in-hogwarts-legacy';
const doorAnswers = source('https://guides4gamers.com/hogwarts-legacy/pois/arithmancy-doors/', 'Guides4Gamers · 12 porte e combinazioni');
const doorItalian = source('https://www.everyeye.it/notizie/hogwarts-legacy-soluzione-come-aprire-porte-simboli-numeri-634754.html', 'Everyeye · porte e nomi italiani');
const doorLocations = source(doorsUrl, 'Gamepur · posizioni e fotografie delle 12 porte');
const room1Url = 'https://www.gameclubz.com/hogwarts-legacy-depulso-puzzle-room-1-solution/';
const room2Url = 'https://www.gameclubz.com/hogwarts-legacy-depulso-puzzle-room-2-solution/';
const clubPhoto = (name, alt, room) => photo(
  `https://www.gameclubz.com/wp-content/uploads/2023/03/hogwarts-legacy-depulso-puzzle-room-${name}-1024x576.jpg`,
  alt, 'GameClubz', room === 1 ? room1Url : room2Url
);
const bridgeUrl = 'https://www.uagna.it/videogiochi/guida-hogwarts-legacy-come-risolvere-lenigma-del-ponte-segreti-di-hogwarts-174368';
const clockUrl = 'https://www.uagna.it/videogiochi/guida-hogwarts-legacy-come-aprire-le-porte-nella-torre-dellorologio-segreti-di-hogwarts-174427';
const secretsUrl = 'https://gameranx.com/features/id/438243/article/hogwarts-legacy-how-to-solve-all-3-secrets-of-hogwarts-solutions-guide/';
const keyUrl = 'https://www.gamepur.com/guides/how-to-get-and-use-the-key-of-admittance-in-hogwarts-legacy';

export const HOGWARTS_METHODS = [{
  ...base, id: 'aritmanzia-metodo', title: 'Porte di Aritmanzia', tracking: false,
  summary: 'Ogni simbolo vale un numero: si parte da 0, non da 1.',
  aliases: ['porte con animali', 'porte con numeri', 'punti interrogativi'], order: 2000,
  requirements: [],
  steps: [
    'Conta i dieci simboli sull’arco da sinistra a destra: quello in basso a sinistra vale 0, l’ultimo in basso a destra vale 9.',
    'Rivela i due triangoli sulla porta. In ciascuno, la somma dei tre valori esterni deve essere uguale al numero centrale.',
    'Per ogni triangolo, sottrai dal totale i due valori già noti. Imposta la rotella ? sul simbolo del risultato del triangolo superiore; usa ?? per quello inferiore.',
    'Torna alla porta e aprila. Per risolvere l’enigma non servono incantesimi né il foglio con la legenda: puoi contare i simboli sull’arco.'
  ],
  sources: [doorItalian, source('https://www.gamesradar.com/hogwarts-legacy-puzzle-doors-how-to-open/', 'GamesRadar · metodo e legenda')]
}];

// Soluzioni numeriche: indicano il valore del simbolo, non il numero di tocchi della rotella.
const doorRows = [
  {
    id: 'aritmanzia-incantesimi', title: 'Porta vicino all’Aula di Incantesimi', group: 'Ala di Astronomia',
    route: 'Dalla Metropolvere Aula di Incantesimi segui il corridoio e gira l’angolo: la porta è accanto all’aula.',
    answer: [2, 7], totals: [5, 12], image: 'Charms-Classroom-puzzle-door-in-Hogwarts-Legacy.jpg'
  },
  {
    id: 'aritmanzia-sala-centrale', title: 'Porta della Sala Centrale', group: 'Biblioteca',
    route: 'Dalla fontana della Sala Centrale scendi verso l’uscita per il Cortile di Trasfigurazione. La porta è sulla destra, accanto a un dipinto.',
    answer: [8, 3], totals: [21, 17], image: 'Hogwarts_Legacy_Central_Hall_puzzle_solved.jpg'
  },
  {
    id: 'aritmanzia-divinazione', title: 'Porta sotto l’Aula di Divinazione', group: 'Biblioteca',
    route: 'Dalla Metropolvere Aula di Divinazione imbocca la passerella di legno e prendi la prima svolta a destra. Cerca la porta vicino alla lavagna e alla scatola con la legenda.',
    answer: [4, 3], totals: [9, 4], image: 'Hogwarts_Legacy_Divination_Classroom_puzzle_open.jpg',
    related: ['aritmanzia-aula-sinistra', 'aritmanzia-aula-destra']
  },
  {
    id: 'aritmanzia-aula-sinistra', title: 'Aula di Aritmanzia · porta sinistra', group: 'Biblioteca',
    route: 'Apri la porta sotto l’Aula di Divinazione e segui il corridoio fino all’Aula di Aritmanzia. Entrando nell’aula, scegli la porta sulla sinistra.',
    answer: [4, 5], totals: [15, 18], image: 'Hogwarts_Legacy_Arithmancy_Classroom_puzzle_doors_left.jpg',
    requirements: ['Porta sotto l’Aula di Divinazione aperta.'], related: ['aritmanzia-divinazione', 'aritmanzia-aula-destra']
  },
  {
    id: 'aritmanzia-aula-destra', title: 'Aula di Aritmanzia · porta destra', group: 'Biblioteca',
    route: 'Oltre la porta sotto l’Aula di Divinazione raggiungi l’Aula di Aritmanzia. Entrando nell’aula, scegli la porta sulla destra.',
    answer: [6, 1], totals: [17, 8], image: 'Hogwarts_Legacy_Arithmancy_Classroom_puzzle_doors_right.jpg',
    requirements: ['Porta sotto l’Aula di Divinazione aperta.'], related: ['aritmanzia-divinazione', 'aritmanzia-aula-sinistra']
  },
  {
    id: 'aritmanzia-galleria', title: 'Porta nella galleria sotto l’Aula di Pozioni', group: 'Biblioteca',
    route: 'Dalla Metropolvere Aula di Pozioni oltrepassa la porta e scendi la scala a chiocciola a sinistra. Apri la serratura I e percorri la galleria fino alle teche con i troll: la porta è in fondo, sulla sinistra.',
    answer: [2, 1], image: 'Hogwarts_Legacy_Bell_Tower_door_puzzle_open.jpg',
    requirements: ['Alohomora I per il percorso dall’Aula di Pozioni.'], related: ['depulso-1'],
    extra: source('https://progameguides.com/hogwarts-legacy/all-library-annex-revelio-field-guide-pages-in-hogwarts-legacy/', 'Pro Game Guides · galleria e teche dei troll')
  },
  {
    id: 'aritmanzia-corvonero', title: 'Porta vicino alla Torre di Corvonero', group: 'Scalinata Principale',
    route: 'Dalla Metropolvere Torre di Corvonero percorri il corridoio. Guarda a destra, sotto la scala a chiocciola e accanto all’armatura.',
    answer: [4, 5], totals: [13, 21], image: 'Hogwarts_Legacy_Ravenclaw_Tower_door_puzzle_open.jpg',
    note: 'Puoi raggiungerla con qualsiasi casata: è fuori dalla sala comune.'
  },
  {
    id: 'aritmanzia-scalinata', title: 'Porta della Scalinata Principale', group: 'Scalinata Principale',
    route: 'Dalla Metropolvere Scalinata Principale sali, gira a destra e sali la rampa successiva. La porta è a sinistra.',
    answer: [0, 5], totals: [6, 11], image: 'Hogwarts_Legacy_Grand_Staircase_puzzle_open.jpg',
    note: 'La rotella ?? è un piano più in basso, sulla parete vicino alla Metropolvere.'
  },
  {
    id: 'aritmanzia-torre-scalinata', title: 'Porta nella Torre della Scalinata Principale', group: 'Scalinata Principale',
    route: 'Dalla Metropolvere Torre della Scalinata Principale scendi lungo la scala. Cerca la porta sulla parete esterna, prima di proseguire ai piani inferiori.',
    answer: [6, 7], totals: [23, 19], image: 'Hogwarts_Legacy_Grand_Staircase_Tower_puzzle_open.jpg'
  },
  {
    id: 'aritmanzia-sala-grande', title: 'Porta della Sala Grande', group: 'Sala Grande',
    route: 'Dalla Metropolvere Sala Grande vai a sinistra e aggira la colonna. La porta è nel breve corridoio laterale.',
    answer: [8, 3], totals: [24, 14], image: 'Hogwarts_Legacy_Great_Hall_door_puzzle_open.jpg'
  },
  {
    id: 'aritmanzia-docenti', title: 'Porta della Torre del Corpo Docente', group: 'Ala Sud',
    route: 'Dalla Metropolvere Torre del Corpo Docente vai a sud. Entra dalla porta a destra, aperta durante la prima missione di Moon, e sali una rampa. Trovi l’enigma in fondo al pianerottolo.',
    answer: [0, 9], totals: [13, 14], image: 'Hogwarts_Legacy_Faculty_Tower_puzzle_open.jpg',
    requirements: ['Accesso alla Torre del Corpo Docente e Alohomora I.'],
    extra: source('https://www.gamepur.com/guides/how-to-solve-the-faculty-tower-door-puzzle-in-hogwarts-legacy', 'Gamepur · percorso nella Torre del Corpo Docente')
  },
  {
    id: 'aritmanzia-sala-nord', title: 'Porta ai piani alti oltre l’Aula di Trasfigurazione', group: 'Ala di Astronomia',
    route: 'Dalla Metropolvere Aula di Trasfigurazione attraversa le porte alle tue spalle. Sali fino all’ultimo piano, apri la porta con serratura I e segui il corridoio: l’enigma è in fondo, sulla sinistra.',
    answer: [6, 3], totals: [10, 7], image: 'Hogwarts_Legacy_North_Hall_door_puzzle_open.jpg',
    requirements: ['Alohomora I.'],
    extra: source('https://www.gamepur.com/guides/how-to-solve-the-north-hall-door-puzzle-in-the-astronomy-wing-in-hogwarts-legacy', 'Gamepur · porta ai piani alti dell’Ala di Astronomia')
  }
];

const doors = doorRows.map((row, i) => ({
  ...base, id: row.id, title: row.title, group: row.group, order: 2010 + i,
  summary: row.totals ? `Porta con i totali ${row.totals[0]} e ${row.totals[1]}.` : 'Porta accanto alle teche dei troll, in fondo alla galleria.',
  aliases: ['Aritmanzia', 'porta con animali', row.group], requirements: row.requirements || [],
  steps: [row.route, ...(row.note ? [row.note] : []), `Imposta ? sul simbolo che vale ${row.answer[0]} e ?? su quello che vale ${row.answer[1]}. Conta da 0 sull’arco, partendo dal basso a sinistra. Poi apri la porta.`],
  methodId: 'aritmanzia-metodo', related: row.related || [],
  photos: [photo(`https://www.gamepur.com/wp-content/uploads/2023/02/${row.image}?w=1024`, `${row.title}: veduta del corridoio e dell’arco con i simboli. La foto mostra la porta già aperta.`, 'Gamepur', doorsUrl)],
  sources: [doorAnswers, doorItalian, doorLocations, ...(row.extra ? [row.extra] : []), source('https://www.pockettactics.com/hogwarts-legacy/door-puzzle', 'Pocket Tactics · percorsi delle porte'), source('https://www.player.it/guide/505584-hogwarts-legacy-come-aprire-le-porte-con-i-simboli.html', 'Player.it · nomi italiani delle sezioni e della Metropolvere')]
}));

export const HOGWARTS_PUZZLES = [
  ...doors,
  {
    ...base, id: 'segreto-ponte-viadotto', title: 'Segreto del Ponte del Viadotto', group: 'Segreti di Hogwarts', order: 2040,
    summary: 'Quattro bracieri aprono il passaggio sotto il ponte.', aliases: ['ponte', 'bracieri', 'numeri romani'],
    requirements: ['Incendio o Confringo.'],
    steps: [
      'Raggiungi il Ponte del Viadotto, vicino alla Metropolvere Cortile del Viadotto. Cerca i quattro bracieri sui parapetti e la piastra circolare a terra.',
      'Accendi tutti i bracieri. Poi interagisci con ciascuno per ruotare il numero sotto il suo simbolo.',
      'Imposta: triangolo senza cerchio = I; cerchi intrecciati = II; triangolo con cerchio = III; quadrato diviso = IV. Puoi confrontarli con la piastra a terra.',
      'Quando la piastra si apre, scendi la scala e apri i forzieri sotto il ponte.'
    ],
    photos: [
      photo('https://www.uagna.it/wp-content/uploads/2023/02/hogwarts-legacy-ponte.jpg', 'Il Ponte del Viadotto con i bracieri sui parapetti.', 'Uagna', bridgeUrl),
      photo('https://www.uagna.it/wp-content/uploads/2023/02/hogwarts-legacy-ponte1.jpg', 'La piastra sul ponte associa ogni simbolo al numero romano corretto.', 'Uagna', bridgeUrl)
    ],
    related: ['segreto-torre-orologio', 'segreto-chiave-ammissione'],
    sources: [source(bridgeUrl, 'Uagna · soluzione del ponte'), source(secretsUrl, 'Gameranx · i tre segreti')]
  },
  {
    ...base, id: 'segreto-torre-orologio', title: 'Segreto della Torre dell’Orologio', group: 'Segreti di Hogwarts', order: 2041,
    summary: 'Ferma il pendolo sui simboli e attraversa le quattro porte.', aliases: ['pendolo', 'porte a tempo', 'orologio'],
    requirements: ['Alohomora I.', 'Arresto Momentum; funziona anche Glacius.'],
    steps: [
      'Parti dal Cortile della Torre dell’Orologio ed entra nella sala dei duelli. Guarda il simbolo sulla porta chiusa al piano terra.',
      'Quando il pendolo passa davanti allo stesso simbolo sulla barra, fermalo con Arresto Momentum o Glacius. Attraversa la porta prima che riparta.',
      'Apri la porta con serratura a sinistra del pendolo e sali. Cerca la seconda porta sulla prima balconata; la terza è al piano successivo, all’estremità opposta, scendendo pochi gradini.',
      'La quarta porta è sul pianerottolo della scala verso la cima della torre. Per ciascuna porta, ferma il pendolo sul simbolo corrispondente mirando dalla balconata vicina.',
      'Entra in tutte e quattro le stanze: fermare il pendolo senza attraversare le porte non basta a completare il segreto.'
    ],
    photos: [
      photo('https://www.uagna.it/wp-content/uploads/2023/02/hogwarts-legacy-torre2.jpg', 'Il pendolo e la barra dei simboli della Torre dell’Orologio, visti dalla balconata.', 'Uagna', clockUrl)
    ],
    related: ['segreto-ponte-viadotto', 'segreto-chiave-ammissione'],
    sources: [source(clockUrl, 'Uagna · pendolo e quattro porte'), source(secretsUrl, 'Gameranx · piani e incantesimi')]
  },
  {
    ...base, id: 'segreto-chiave-ammissione', title: 'Porta con serratura speciale', group: 'Segreti di Hogwarts', order: 2042,
    summary: 'Una chiave nascosta nella torre apre la porta oltre la Sala dei Trofei.', aliases: ['Chiave dell’Ammissione', 'serratura speciale', 'Sala dei Trofei'],
    requirements: ['Alohomora III.', 'Per il percorso interno: accesso all’ufficio del preside, ottenuto avanzando nella storia.'],
    steps: [
      'Dalla Sala dei Trofei apri il cancello e sali fino al corridoio con le statue. Il grifone conduce all’ufficio del preside.',
      'Nell’ufficio prendi la porta laterale verso il balcone. Sali la scala esterna e apri la serratura III dello studio superiore.',
      'Raccogli la Chiave dell’Ammissione sul tavolo. Torna al corridoio delle statue, sotto l’ufficio.',
      'Raggiungi l’estremità opposta al grifone e interagisci con la porta dalla grande serratura. Si apre con la chiave; Alohomora da solo non funziona.',
      'Entra e sali le scale: apri i forzieri e usa Revelio nella stanza superiore.'
    ],
    panels: [{ title: 'Arrivare dall’esterno', paragraphs: ['Con la scopa puoi raggiungere il piccolo balcone della torre più alta. Atterra, sali i gradini e apri la serratura III: conduce allo stesso studio con la chiave. Se non riesci ad atterrare, usa il percorso interno quando disponibile.'] }],
    photos: [
      photo('https://www.gamepur.com/wp-content/uploads/2023/02/Hogwarts-Legacy-Headmaster-Study.jpg?w=1024', 'Lo studio superiore con la Chiave dell’Ammissione sul tavolo.', 'Gamepur', keyUrl),
      photo('https://www.gamepur.com/wp-content/uploads/2023/02/Hogwarts-Legacy-Admittance-Door.jpg?w=1024', 'La porta dalla grande serratura nel corridoio delle statue.', 'Gamepur', keyUrl)
    ],
    related: ['demiguise', 'segreto-ponte-viadotto', 'segreto-torre-orologio'],
    sources: [source(keyUrl, 'Gamepur · chiave e porta'), source(secretsUrl, 'Gameranx · accesso interno'), source('https://www.player.it/guide/504224-hogwarts-legacy-guida-ai-segreti-di-hogwarts.html', 'Player.it · nomi e segreti di Hogwarts')]
  },
  {
    ...base, id: 'depulso-1', title: 'Stanza dell’enigma di Depulso 1', group: 'Stanze Depulso', order: 2050,
    summary: 'Tre forzieri nella sala; il premio finale compare tornando all’ingresso.', aliases: ['blocchi', 'Accio', 'Aula di Pozioni'],
    requirements: ['Sala di Herodiana completata.', 'Alohomora I, Accio e Depulso.'],
    steps: [
      'Dalla Metropolvere Aula di Pozioni attraversa la porta, scendi la scala a chiocciola a sinistra e apri la serratura I in fondo. Usa Depulso sul pulsante della parete destra.',
      'Considera sempre destra e sinistra come le vedi dall’ingresso, guardando la sala. Accio tira i blocchi verso di te; Depulso li spinge lontano da te. Spostati prima di lanciare l’incantesimo e non restare sulla loro traiettoria.',
      'Segui i tre percorsi qui sotto. Dopo ogni forziere, colpisci il cubetto luminoso con un attacco base: i blocchi tornano alla posizione iniziale e il forziere resta aperto.',
      'Dopo aver aperto tutti e tre i forzieri, torna nel corridoio d’ingresso e apri quello della collezione.'
    ],
    chapters: [
      { title: '1 · Forziere a destra', steps: [
        'Tira verso l’ingresso il cubo sospeso sulla parete destra.',
        'Scendi. Spingi verso destra i due cubi centrali: formano la salita sotto il cubo sospeso.',
        'Arrampicati sui blocchi e apri il forziere. Poi colpisci il cubetto luminoso per rimettere i blocchi nella posizione iniziale.'
      ], photos: [clubPhoto('1-first-chest', 'Percorso di blocchi verso il primo forziere, sulla parete destra.', 1)] },
      { title: '2 · Forziere a sinistra', steps: [
        'Tira il cubo sospeso di destra verso sinistra, poi verso l’ingresso. Spingilo contro la parete sinistra e tiralo verso il pilastro del forziere.',
        'Tira verso l’ingresso il cubo centrale superiore: si unisce a quello inferiore, formando una colonna di due cubi.',
        'Spingi la colonna a sinistra, poi tirala verso il forziere. Sali sulla colonna, voltati e salta sul cubo sospeso.',
        'Raggiungi il forziere e aprilo. Poi colpisci il cubetto luminoso per rimettere i blocchi nella posizione iniziale.'
      ], photos: [clubPhoto('1-second-chest-pull-accio', 'Colonna e cubo sospeso per raggiungere il forziere sulla sinistra.', 1)] },
      { title: '3 · Forziere in fondo', steps: [
        'Spingi a sinistra il cubo a terra più vicino all’ingresso. Tiralo contro i due cubi sulla parete sinistra: ottieni una fila di tre.',
        'Tira la fila contro la parete destra e spingila in avanti, sotto il cubo sospeso.',
        'Spingi i due cubi centrali verso il fondo: formano una colonna. Spingila a sinistra, verso il pilastro del forziere.',
        'Tira la fila di tre al centro, spingila verso il fondo e poi a sinistra, accanto alla colonna.',
        'Dal blocco di pietra vicino al vuoto salta sulla fila di tre; sali sulla colonna e raggiungi il forziere.'
      ], photos: [clubPhoto('1-third-chest-location', 'Passaggio finale: blocco di pietra, fila di cubi e colonna verso il forziere in fondo.', 1)] }
    ],
    photos: [clubPhoto('1-location', 'Parete e pulsante che aprono la prima stanza Depulso.', 1)],
    related: ['q-com-24', 'depulso-2', 'aritmanzia-galleria'],
    sources: [
      source('https://hogwarts.th.gl/it/db/dungeons/dungeon_DADA_Forgotten_2_Dungeon', 'TH.GL · nome italiano della stanza'),
      source(room1Url, 'GameClubz · percorsi e fotografie'),
      source('https://www.powerpyx.com/hogwarts-legacy-depulso-puzzle-room-1-solution-location/', 'PowerPyx · soluzione dei tre forzieri'),
      source('https://gamerpillar.com/depulso-puzzle-room-1-hogwarts-legacy/', 'Gamerpillar · sequenze illustrate'),
      source('https://www.destructoid.com/how-to-solve-depulso-puzzle-room-1-in-hogwarts-legacy/', 'Destructoid · controllo dei percorsi')
    ]
  },
  {
    ...base, id: 'depulso-2', title: 'Stanza dell’enigma di Depulso 2', group: 'Stanze Depulso', order: 2051,
    summary: 'Due sale da attraversare, con percorsi distinti per i forzieri e l’uscita.', aliases: ['blocchi', 'Accio', 'Aula di Storia della Magia'],
    requirements: ['Sala di Herodiana completata.', 'Alohomora I, Accio e Depulso.'],
    steps: [
      'Dalla Metropolvere Cortile della Torre Campanaria gira a sinistra, sali la prima rampa ed entra nella porta davanti. Prosegui nell’Aula di Storia della Magia.',
      'Apri la porta con serratura I in fondo all’aula. Nella stanza con decorazioni egizie, usa Depulso sul pulsante nell’angolo della parete destra.',
      'In ogni sala, destra e sinistra sono quelle che vedi dall’ingresso; il fondo è la parete opposta. Questi riferimenti restano fissi anche quando ti giri. Spostati per tirare o spingere i blocchi nella direzione indicata.',
      'Segui i passaggi nell’ordine. Se unisci i blocchi sbagliati, colpisci il cubetto luminoso con un attacco base per ricominciare la sala. Tra una fase e l’altra, lascia i blocchi dove sono, salvo diversa indicazione.'
    ],
    chapters: [
      { title: 'Prima sala · raggiungere il forziere', steps: [
        'Tira il grande gruppo di cubi a forma di T verso l’ingresso. Scendi a sinistra e tira il cubo singolo lungo la parete fino in fondo.',
        'Tira i due cubi di destra al centro; spingili in fondo e poi a sinistra, unendoli al cubo singolo.',
        'Tira il gruppo di tre verso l’ingresso, lungo la parete sinistra.',
        'Sali sul blocco nero centrale, salta sui tre cubi e arrampicati al forziere sinistro. Aprendolo, la sala cambia disposizione.'
      ], photos: [clubPhoto('2-first-room-chest-step-seven', 'I tre cubi permettono di salire sul ripiano del primo forziere.', 2)] },
      { title: 'Prima sala · raggiungere l’uscita', steps: [
        'Torna all’ingresso e tira di nuovo il gruppo a T verso di te. Sotto di esso individua il cubo in alto e il gruppo di due cubi più in basso.',
        'Porta il cubo alto contro la parete sinistra, poi in fondo. Tira anche i due cubi bassi in fondo; spingili nell’angolo sinistro per unirli al cubo alto.',
        'Porta i due cubi sulla destra al centro, poi in fondo e infine a sinistra: uniscili agli altri tre.',
        'Tira il gruppo di cinque verso l’ingresso, poi contro la parete destra.',
        'Sposta la T verso la stessa parete destra, poi verso il fondo: deve unirsi ai cinque cubi.',
        'Passa dal piccolo varco a sinistra della struttura e sali sui suoi gradini fino alla porta della seconda sala.'
      ], photos: [clubPhoto('2-first-room-exit-step-twelve', 'La T unita ai cinque cubi crea la salita verso la seconda sala.', 2)] },
      { title: 'Seconda sala · forziere a destra', steps: [
        'Spingi in fondo la colonna di tre cubi sulla sinistra.',
        'Tira verso l’ingresso la grande piattaforma a forma di U sulla destra e saltaci sopra.',
        'Dalla piattaforma a U tira la colonna contro la parete destra. Salta sulla colonna e arrampicati fino al forziere.',
        'Apri il forziere e torna sulla piattaforma a U. Lascia i blocchi in questa posizione.'
      ], photos: [clubPhoto('2-second-room-first-chest-4', 'Dalla piattaforma a U si salta sulla colonna sotto il forziere destro.', 2)] },
      { title: 'Seconda sala · forziere a sinistra', steps: [
        'Spingi la colonna di tre nell’angolo in fondo a destra.',
        'Tira fuori il grande gruppo nell’angolo in fondo a sinistra, verso l’ingresso; poi tiralo a destra finché si ferma contro il pilastro nero.',
        'Spingi la fila orizzontale di quattro contro la parete sinistra. Portala nell’angolo in fondo appena liberato.',
        'Tira la colonna da destra a sinistra: si unisce alla fila di quattro. Tira questi sette cubi verso l’ingresso.',
        'Sali sulla nuova struttura e raggiungi il forziere sinistro. Aprilo e lascia i blocchi in questa posizione.'
      ], photos: [clubPhoto('2-second-room-second-chest-7', 'I sette cubi uniti formano la salita al forziere sinistro.', 2)] },
      { title: 'Seconda sala · uscita e premio finale', steps: [
        'Spingi i sette cubi nell’angolo in fondo a sinistra. Dalla piattaforma a U tirali a destra: si uniscono al gruppo fermo contro il pilastro nero.',
        'Torna sulla piattaforma a U e mettiti su uno dei suoi bracci. Usa Accio sul tratto centrale: la piattaforma si avvicina al blocco nero e il salto diventa più corto.',
        'Salta sul blocco nero centrale, poi sui cubi uniti e sali fino all’uscita. Apri il forziere della collezione prima di andartene.'
      ], photos: [clubPhoto('2-second-room-third-chest-3', 'La struttura finale collega il blocco nero al ripiano dell’uscita.', 2)] }
    ],
    photos: [clubPhoto('2-location', 'Il pulsante per aprire la seconda stanza Depulso, nella sala con decorazioni egizie.', 2)],
    related: ['q-com-24', 'depulso-1'],
    sources: [
      source('https://hogwarts.th.gl/it/db/dungeons/dungeon_DADA_Forgotten_3_Dungeon', 'TH.GL · nome italiano della stanza'),
      source(room2Url, 'GameClubz · percorsi e fotografie'),
      source('https://www.powerpyx.com/hogwarts-legacy-depulso-puzzle-room-2-solution-location/', 'PowerPyx · soluzione e correzione del salto finale'),
      source('https://gamerpillar.com/depulso-puzzle-room-2-walkthrough-hogwarts-legacy/', 'Gamerpillar · sequenze illustrate'),
      source('https://progameguides.com/hogwarts-legacy/how-to-complete-depuslo-puzzle-room-two-in-hogwarts-legacy/', 'Pro Game Guides · controllo dei passaggi')
    ]
  }
];
