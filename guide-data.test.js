import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {SECTIONS,GUIDES,MOONS,INTRO_MOONS,PUZZLE_METHODS} from './guide-data.js';
import {makeGuideEntries} from './guide-model.js';
import {searchGuide} from './search.js';
test('complete agreed coverage: 140 quest variants, 95 Merlin trials, 30+3 moons',()=>{
 assert.deepEqual(SECTIONS.map(s=>s.id),['missioni','sblocchi','pratiche']);
 assert.equal(GUIDES.filter(g=>g.section==='missioni').length,140);
 assert.equal(GUIDES.filter(g=>g.id.startsWith('merlin-')&&g.tracking).length,95);
 assert.equal(MOONS.length,30);assert.equal(INTRO_MOONS.length,3);
 assert.equal(MOONS.filter(m=>m.location==='Hogwarts').length,10);
 assert.equal(MOONS.filter(m=>m.location==='Hogsmeade').length,9);
});
test('catalogue has unique canonical identities valid categories and actionable sourced content',()=>{
 assert.equal(new Set(GUIDES.map(g=>g.id)).size,GUIDES.length);
 for(const g of GUIDES){
  assert.match(g.id,/^[a-z0-9][a-z0-9:_-]{0,112}$/);assert.ok(g.title&&g.summary,g.id);
  assert.ok(SECTIONS.find(s=>s.id===g.section)?.categories.some(c=>c.id===g.category),g.id);
  assert.ok(g.steps?.length,g.id);assert.ok(g.steps.every(s=>typeof s==='string'&&s.length>15),g.id);
  assert.ok(g.sources?.length,g.id);assert.ok(g.sources.every(s=>s.url.startsWith('https://')),g.id);
  assert.ok(!JSON.stringify(g).includes('TODO'),g.id);
 }
});
test('all related guides and reusable puzzle methods resolve without duplicates',()=>{
 const ids=new Set(GUIDES.map(g=>g.id)),methods=new Set(PUZZLE_METHODS.map(m=>m.id));
 for(const g of GUIDES){for(const id of g.related||[])assert.ok(ids.has(id),g.id+' -> '+id);if(g.methodId)assert.ok(methods.has(g.methodId),g.id+' -> '+g.methodId);}
});
test('old moon identities still mean the same places and all existing asset paths resolve',()=>{
 const names={h1:'Tomi',h2:'Testa',h3:'Tre Manici',h4:'est dei Tre',h5:'Stratchy',h6:'Mielandia',h7:'Fiera',u1:'Upper Hogsfield',b1:'Divinazione'};
 const moons=[...MOONS,...INTRO_MOONS];assert.equal(new Set(moons.map(m=>m.id)).size,33);
 for(const [id,word]of Object.entries(names))assert.ok(MOONS.find(m=>m.id===id)?.title.includes(word),id);
 assert.ok(MOONS.every(m=>[0,1,2].includes(m.lock)&&m.steps.length&&m.photos.length));
 for(const g of [...GUIDES,...moons])for(const photo of [...(g.photos||[]),...(g.panels||[]).flatMap(p=>p.photos||[])]){
  assert.ok(photo.alt&&photo.credit&&photo.source,g.id);
  if(!photo.src.startsWith('https://'))assert.ok(existsSync(new URL(photo.src,import.meta.url)),g.id+' '+photo.src);
 }
});
test('safe search fields exclude plot disclosures and find verified spellings',()=>{
 const entries=makeGuideEntries(GUIDES);
 for(const g of GUIDES.filter(g=>g.officialTitle)){
  const entry=entries.find(e=>e.id===g.id);assert.ok(!JSON.stringify(entry).includes(g.officialTitle),g.id);
 }
 for(const q of ['demigais','dimigais','alomora'])assert.equal(searchGuide(entries,q)[0]?.id,'demiguise');
});
