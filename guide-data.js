import { MAIN_MISSIONS } from './content/main-missions.js?v=2.1.0';
import { ASSIGNMENTS } from './content/assignments.js?v=2.1.0';
import { SIDE_MISSIONS } from './content/side-missions.js?v=2.1.0';
import { PRACTICAL_GUIDES } from './content/practical.js?v=2.1.0';
import { UNLOCK_GUIDES } from './content/unlocks.js?v=2.1.0';
import { PUZZLES, PUZZLE_METHODS as MERLIN_METHODS } from './content/puzzles.js?v=2.1.0';
import { HOGWARTS_PUZZLES, HOGWARTS_METHODS } from './content/hogwarts-puzzles.js?v=2.1.0';
import { MOONS, INTRO_MOONS, DEMIGUISE_GUIDE } from './content/demiguise.js?v=2.1.0';
import { guideRoute } from './guide-model.js?v=2.1.0';
export { MOONS, INTRO_MOONS };
export const PUZZLE_METHODS = [...MERLIN_METHODS, ...HOGWARTS_METHODS];

// Editorial navigation, separate from the progress store. Keep these IDs and
// canonical routes stable when adding content or changing a visible label.
export const SECTIONS = [
  {
    id: 'missioni', title: 'Missioni', summary: 'Principali, secondarie e incarichi.',
    categories: [
      { id: 'principali', title: 'Missioni principali', summary: 'Il percorso della storia, con gli spoiler protetti.' },
      { id: 'secondarie', title: 'Missioni secondarie', summary: 'Le missioni facoltative, organizzate per luogo.' },
      { id: 'incarichi', title: 'Incarichi dei professori', summary: 'Obiettivi richiesti e ricompense degli incarichi.' },
      { id: 'relazioni', title: 'Missioni dei compagni', summary: 'I percorsi dei personaggi che ti accompagnano.' }
    ]
  },
  {
    id: 'sblocchi', title: 'Sblocchi e potenziamenti', summary: 'Demiguise, incantesimi e abilità.',
    categories: [
      { id: 'demiguise', title: 'Demiguise e Alohomora', summary: 'Le statuette da trovare e le serrature da aprire.' },
      { id: 'incantesimi', title: 'Incantesimi', summary: 'Come ottenere e utilizzare gli incantesimi.' },
      { id: 'talenti', title: 'Talenti e abilità', summary: 'Scelte per sviluppare il tuo personaggio.' },
      { id: 'equipaggiamento', title: 'Equipaggiamento', summary: 'Caratteristiche e miglioramenti del tuo equipaggiamento.' }
    ]
  },
  {
    id: 'pratiche', title: 'Guide pratiche', summary: 'Oggetti, pozioni ed enigmi.',
    categories: [
      { id: 'oggetti', title: 'Oggetti e risorse', summary: 'A cosa servono, dove trovarli e quando conservarli.' },
      { id: 'pozioni', title: 'Pozioni', summary: 'Ingredienti, preparazione e utilizzo.' },
      { id: 'piante', title: 'Piante', summary: 'Coltivazione e utilizzo delle piante.' },
      { id: 'stanza', title: 'Stanza delle necessità', summary: 'Organizzazione e soluzioni pratiche per la tua stanza.' },
      { id: 'combattimento', title: 'Combattimento', summary: 'Preparazione, incantesimi e strategie per i nemici.' },
      { id: 'enigmi', title: 'Enigmi e attività', summary: 'Indicazioni chiare per superare gli ostacoli.' },
      { id: 'collezionabili', title: 'Esplorazione e collezionabili', summary: 'Luoghi da esplorare e oggetti da raccogliere.' }
    ]
  }
];


export const GUIDES = [DEMIGUISE_GUIDE, ...MAIN_MISSIONS, ...ASSIGNMENTS, ...SIDE_MISSIONS,
  ...UNLOCK_GUIDES, ...PRACTICAL_GUIDES, ...PUZZLES, ...HOGWARTS_PUZZLES]
  .map(guide => ({...guide, route:guideRoute(guide)}));
