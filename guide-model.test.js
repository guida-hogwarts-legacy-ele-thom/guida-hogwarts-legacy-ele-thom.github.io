import test from 'node:test';
import assert from 'node:assert/strict';
const model = await import('./guide-model.js').catch(() => ({}));
const guides = [
 {id:'astrolabio',title:'Astrolabio',section:'pratiche',category:'oggetti',house:null},
 {id:'quest-late',title:'Una richiesta successiva',officialTitle:'Un segreto di trama',section:'missioni',category:'secondarie',tracking:true},
 {id:'house-ele',title:'Grifondoro',section:'missioni',category:'principali',house:'gryffindor'},
 {id:'house-thom',title:'Serpeverde',section:'missioni',category:'principali',house:'slytherin'},
 {id:'demiguise',title:'Demiguise',section:'sblocchi',category:'demiguise'}
];
test('canonical links resolve without duplicating content and legacy moon anchors survive',()=>{
 assert.equal(model.guideRoute(guides[0]),'#/pratiche/oggetti/astrolabio');
 assert.equal(model.guideRoute(guides[4]),'#/sblocchi/demiguise');
 assert.equal(model.parseRoute('#/pratiche/oggetti/astrolabio',guides).guide.id,'astrolabio');
 assert.equal(model.parseRoute('#bonusTitle',guides).target,'b1');
 assert.equal(model.parseRoute('#/sblocchi/demiguise/h2',guides).target,'h2');
});
test('house filtering respects chosen profile without dropping common quests',()=>{
 assert.deepEqual(model.forHouse(guides,'ele').map(x=>x.id),['astrolabio','quest-late','house-ele','demiguise']);
 assert.ok(model.forHouse(guides,'thom').some(x=>x.id==='house-thom'));
 assert.equal(model.forHouse(guides,'ele',true).length,5);
});
test('manual status preserves explicit todo over legacy Demiguise activity and unknown values',()=>{
 const state={completed:new Set(['activity:demiguise:in-progress','h2','future']),values:new Map()};
 assert.equal(model.guideStatus('demiguise',state),'doing');
 state.values.set('status:demiguise','todo');
 assert.equal(model.guideStatus('demiguise',state),'todo');
 state.values.set('status:quest-late','done');
 assert.equal(model.guideStatus('quest-late',state),'done');
 assert.equal(model.guideStatus('other',state),'todo');
 assert.equal(state.completed.size,3);
});
test('search exposes safe labels; a full known spoiler title locates a neutral result only',()=>{
 const entries=model.makeGuideEntries(guides);
 const late=entries.find(x=>x.id==='quest-late');
 assert.ok(!JSON.stringify(late).includes('Un segreto di trama'));
 assert.equal(model.knownTitleResults(guides,'un segreto di trama')[0].title,'Una richiesta successiva');
 assert.equal(model.knownTitleResults(guides,'segreto').length,0);
});
test('moon access includes open locks, filters collected and keeps all counts independent',()=>{
 const moons=[{id:'h1',lock:0},{id:'h2',lock:1},{id:'x',lock:2}];
 const done=new Set(['h1','future','intro']);
 assert.deepEqual(model.filterMoons(moons,{level:1,completed:done,todo:true}).map(x=>x.id),['h2']);
 assert.equal(model.filterMoons(moons,{level:2}).length,3);
 assert.equal(model.countMoons(moons,done),1);
});

 test('place and geographic group are safe search terms',()=>{
 const entry=model.makeGuideEntries([{id:'x',title:'Una missione',location:'Hogwarts',group:'Biblioteca',section:'missioni',category:'principali'}])[0];
 assert.ok(entry.aliases.includes('Hogwarts'));assert.ok(entry.aliases.includes('Biblioteca'));
 });

test('guide neighbours stay in the category, use narrative order and exclude other houses',()=>{
 assert.equal(typeof model.guideNeighbours,'function');
 const list=[
  {id:'last',section:'missioni',category:'principali',order:9},
  {id:'foreign',section:'missioni',category:'principali',order:2,house:'slytherin'},
  {id:'middle',title:'Etichetta sicura',officialTitle:'Trama nascosta',section:'missioni',category:'principali',order:3},
  {id:'other',section:'missioni',category:'secondarie',order:4},
  {id:'first',section:'missioni',category:'principali',order:1}];
 const next=model.guideNeighbours(list,list[2],'ele');assert.equal(next.previous.id,'first');assert.equal(next.next.id,'last');
 assert.equal(model.guideNeighbours(list,list[4],'ele').previous,null);assert.equal(model.guideNeighbours(list,list[0],'ele').next,null);
 const excluded=model.guideNeighbours(list,list[1],'ele');assert.equal(excluded.previous,null);assert.equal(excluded.next,null);
 assert.deepEqual(list.map(g=>g.id),['last','foreign','middle','other','first']);
});

test('next guide follows the visible geographic catalogue while main missions remain chronological',()=>{
 const list=[{id:'a',order:1,location:'Hogwarts'},{id:'b',order:2,location:'Hogsmeade'},{id:'c',order:3,location:'Hogwarts'}].map(g=>({...g,section:'missioni',category:'secondarie'}));
 assert.equal(model.guideNeighbours(list,list[0],'ele').next.id,'c');
 assert.equal(model.guideNeighbours(list,list[1],'ele').previous.id,'c');
 const main=list.map(g=>({...g,category:'principali'}));assert.equal(model.guideNeighbours(main,main[0],'ele').next.id,'b');
});
