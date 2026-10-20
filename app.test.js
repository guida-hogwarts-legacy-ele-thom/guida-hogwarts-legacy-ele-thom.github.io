// Controller integration against an intentionally small DOM adapter.
// Rendering, layout and actual focus are checked separately in the browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as model from './guide-model.js';
import {searchGuide} from './search.js';
import {safeDestination,OLD_ORIGIN,NEW_ORIGIN} from './migration.js';
const source=readFileSync(new URL('./app.js',import.meta.url),'utf8').replace(/^import[^\n]*\n/gm,'');
const SECTIONS=[{id:'missioni',title:'Missioni',summary:'Missioni',categories:[{id:'secondarie',title:'Secondarie',summary:'Per luogo'}]},
{id:'sblocchi',title:'Sblocchi',summary:'Abilità',categories:[{id:'demiguise',title:'Demiguise',summary:'Lune'}]},
{id:'pratiche',title:'Pratiche',summary:'Risorse',categories:[{id:'oggetti',title:'Oggetti',summary:'Risorse'}]}];
const GUIDES=[{id:'demiguise',title:'Demiguise e Alohomora',summary:'Tutte le lune',section:'sblocchi',category:'demiguise',tracking:true,steps:['Raccogli di notte'],aliases:['demigais']},
{id:'quest',title:'Una richiesta',officialTitle:'Un segreto futuro',summary:'Una ricerca nel villaggio',section:'missioni',category:'secondarie',location:'Hogsmeade',tracking:true,steps:['Trova l’Astrolabio.'],photos:[{src:'assets/test.jpg',source:'https://example.org',credit:'Fonte',alt:'Stanza'}]},
{id:'astrolabio',title:'Astrolabio',summary:'Oggetto di missione',section:'pratiche',category:'oggetti',steps:['Oggetto da restituire']}];
const MOONS=[{id:'h1',title:'Tomi e Pergamene',location:'Hogsmeade',group:'Hogsmeade',lock:0,steps:['Nel retro']},
{id:'h2',title:'Testa di Porco',location:'Hogsmeade',group:'Hogsmeade',lock:1,steps:['Dietro il bancone']},
{id:'b1',title:'Aula di Divinazione',location:'Hogwarts',group:'Biblioteca',lock:0,steps:['Sulla scrivania']},
{id:'dm-new',title:'Serratura II',location:'Hogwarts',group:'Biblioteca',lock:2,steps:['Apri la porta']}];
const INTRO_MOONS=[{id:'dm-intro',title:'Luna introduttiva',steps:['Segui Moon']}];
function openApp({remembered=null,hash='#/',search='',origin=NEW_ORIGIN}={}) {
  const roots=[],events={},docEvents={},calls=[],scrolls=[];let win;
  const key=s=>s.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
  class Element {
    constructor(tag='div',text=''){this.tagName=tag.toUpperCase();this.children=[];this.parentElement=null;this.dataset={};this.attributes={};this.events={};this.style={};this.className='';this._text=text;this.value='';this.checked=false;this.disabled=false;this.hidden=false;this.open=false;this.id='';
      this.classList={add:c=>{this.className+=' '+c;},remove:c=>{this.className=this.className.split(' ').filter(x=>x!==c).join(' ');},contains:c=>this.className.split(' ').includes(c),toggle:(c,b)=>b?this.classList.add(c):this.classList.remove(c)};
    }
    get textContent(){return this._text+this.children.map(c=>c.textContent).join('');}
    set textContent(v){this.textWrites=(this.textWrites||0)+1;this._text=String(v);this.children=[];}
    setAttribute(k,v){this.attributes[k]=String(v);if(k==='id')this.id=String(v);if(k.startsWith('data-'))this.dataset[key(k.slice(5))]=String(v);}
    removeAttribute(k){delete this.attributes[k];}
    append(...cs){for(let c of cs){if(typeof c==='string')c=new Element('#text',c);c.parentElement=this;this.children.push(c);}}
    insertBefore(c,b){c.parentElement=this;const i=this.children.indexOf(b);this.children.splice(i<0?this.children.length:i,0,c);}
    replaceChildren(...cs){this.children=[];this._text='';this.append(...cs);}
    addEventListener(t,f){(this.events[t]??=[]).push(f);}
    async fire(t,extra={}){const event={target:this,currentTarget:this,button:0,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},...extra};for(const f of this.events[t]||[])await f(event);return event;}
    matches(s){
      const attr=s.match(/\[([^=\]]+)(?:="([^"]+)")?\]/);const base=s.replace(/\[[^\]]+\]/g,'');
      if(base.startsWith('.')&&!this.classList.contains(base.slice(1)))return false;
      if(base.startsWith('#')&&this.id!==base.slice(1))return false;
      if(base&&!base.startsWith('.')&&!base.startsWith('#')&&this.tagName.toLowerCase()!==base)return false;
      if(attr){const value=attr[1].startsWith('data-')?this.dataset[key(attr[1].slice(5))]:this.attributes[attr[1]];if(value===undefined)return false;if(attr[2]!==undefined&&String(value)!==attr[2])return false;}
      return true;
    }
    querySelectorAll(s){return this.children.flatMap(c=>[...(c.matches(s)?[c]:[]),...c.querySelectorAll(s)]);}
    querySelector(s){return this.querySelectorAll(s)[0]||null;}
    closest(s){let n=this;while(n){if(n.matches(s))return n;n=n.parentElement;}return null;}
    contains(n){return n===this||this.children.some(c=>c.contains(n));}
    focus(options){document.activeElement=this;this.focusOptions=options;} scrollIntoView(options){this.scrolled=true;scrolls.push({element:this.id,options});}
    showModal(){this.open=true;}close(){this.open=false;}
  }
  const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
  for(const m of html.matchAll(/id="([^"]+)"/g)){const n=new Element();n.id=m[1];roots.push(n);}
  for(const id of ['syncIndicator','syncToggle','syncIcon','syncAlert','syncAlertRetry'])if(!roots.some(n=>n.id===id)){const n=new Element();n.id=id;roots.push(n);}
  const all=()=>roots.flatMap(n=>[n,...n.querySelectorAll('')]);
  const document={body:new Element('body'),visibilityState:'visible',activeElement:null,
    getElementById:id=>all().find(n=>n.id===id),querySelectorAll:s=>all().filter(n=>n.matches(s)),createElement:t=>new Element(t),createTextNode:t=>new Element('#text',t),addEventListener:(t,f)=>docEvents[t]=f};
  const $=document.getElementById;
  const profiles=['ele','thom'].map(p=>{const n=new Element('button');n.className='profile-choice';n.dataset.profile=p;$('profileChoices').append(n);return n;});
  for(const s of ['','missioni','sblocchi','pratiche']){const n=new Element('a');n.className='nav-link';n.dataset.section=s;n.href='#/'+s;roots.push(n);}
  const completed={ele:new Set(['h1','b1','future:id']),thom:new Set(['h2'])};
  const values={ele:new Map(),thom:new Map()};let selected=remembered,status=remembered?'saved':'choose',notify=()=>{},pending=0;
  const snap=()=>({profile:selected,status,pending,completed:new Set(completed[selected]||[]),values:new Map(values[selected]||[])});
  const controller={getState:snap,async select(p){calls.push(['select',p]);if(state.failSelect){status='storage-error';notify(snap());return snap();}selected=p;status='saved';notify(snap());return snap();},async set(id,checked){calls.push(['set',selected,id,checked]);if(state.failSet===true||state.failSet===id){status='storage-error';notify(snap());return snap();}checked?completed[selected].add(id):completed[selected].delete(id);notify(snap());return snap();},async setValue(id,value){calls.push(['setValue',selected,id,value]);values[selected].set(id,value);notify(snap());return snap();},async refresh(){calls.push(['refresh']);notify(snap());},async retry(){status='saved';pending=0;notify(snap());},isRelevantStorageKey:k=>!k||k.startsWith('demiguise-profile-sync-v1:')};
  const brand=new Element('a');brand.className='brand';brand.href='#/';roots.push(brand);
  let options;const location={hash,search,origin,assign:href=>calls.push(['assign',href])},state={confirm:false,migration:{status:'ready',canContinue:true,pending:{ele:0,thom:0},legacyPending:0}};
  const createHostMigration=options=>({inspect(){return options.enabled&&options.currentOrigin===OLD_ORIGIN?state.migration:{status:'inactive',canContinue:false};},async synchronize(profile){calls.push(['migration-sync',profile]);if(state.migrationWait)await state.migrationWait;state.migration=state.migrationResult||{status:'ready',canContinue:true,pending:{ele:0,thom:0},legacyPending:0};return state.migration;},destination(hash){if(state.blockDeparture){state.migration={status:'needs-sync',canContinue:false,pending:{ele:0,thom:1},legacyPending:0};return null;}return this.inspect().canContinue?safeDestination(hash,options.search):null;}});
  const historyEntries=[{hash,state:null}];let historyIndex=0;
  const history={scrollRestoration:'auto',get state(){return historyEntries[historyIndex].state;},
    pushState(value,unused,href){historyEntries.splice(++historyIndex);historyEntries.push({hash:href,state:value});location.hash=href;},
    replaceState(value,unused,href){historyEntries[historyIndex]={hash:href,state:value};location.hash=href;},
    back(){if(!historyIndex)return;const old=location.hash;historyIndex--;location.hash=historyEntries[historyIndex].hash;events.popstate?.({state:this.state});events.hashchange?.({oldURL:'https://example.org/'+old,newURL:'https://example.org/'+location.hash});},
    forward(){if(historyIndex>=historyEntries.length-1)return;const old=location.hash;historyIndex++;location.hash=historyEntries[historyIndex].hash;events.popstate?.({state:this.state});events.hashchange?.({oldURL:'https://example.org/'+old,newURL:'https://example.org/'+location.hash});}};
  win={location,history,scrollY:0,addEventListener:(t,f)=>events[t]=f,scrollTo(options){this.scrollY=options.top;scrolls.push({top:options.top,options});state.onScroll?.();}};
  vm.runInNewContext(source,{document,window:win,URLSearchParams,Set,Map,Promise,URL,...model,searchGuide,createHostMigration,SECTIONS,GUIDES,MOONS,INTRO_MOONS,PUZZLE_METHODS:[],createProfileSync:c=>{options=c;notify=c.onChange;return controller;},confirm:()=>state.confirm,setTimeout:()=>1,clearTimeout(){},requestAnimationFrame:f=>f()});
  return {document,$,calls,state,completed,values,options:()=>options,events,scrolls,win,history,
    choose:async p=>profiles[p==='ele'?0:1].fire('click'),click:async id=>$(id).fire('click'),
    navigate:h=>{const old=location.hash;history.pushState(null,'',h);events.hashchange({oldURL:'https://example.org/'+old,newURL:'https://example.org/'+h});},
    async follow(node){const e=await node.fire('click');if(!e.defaultPrevented&&node.href!==location.hash){const old=location.hash;history.pushState(null,'',node.href);events.hashchange({oldURL:'https://example.org/'+old,newURL:'https://example.org/'+node.href});}},
    query:q=>{$('guideSearch').value=q;return $('guideSearch').fire('input');},
    setStatus:(s,p=0)=>{status=s;pending=p;notify(snap());},
    async set(selector,value){const n=document.querySelectorAll(selector)[0];assert.ok(n,selector);if(n.tagName==='INPUT')n.checked=value;else n.value=value;await n.fire('change');}
  };
}

test('profile gate survives every opening and viewing/search never writes progress',async()=>{
 const a=openApp({remembered:'ele'});assert.ok(a.$('guideApp').hidden);assert.equal(a.calls.length,0);
 await a.click('continueBtn');assert.ok(!a.$('guideApp').hidden);a.navigate('#/missioni/secondarie');await a.query('ricerca');a.navigate('#/missioni/secondarie/quest');
 assert.equal(a.calls.filter(x=>x[0].startsWith('set')).length,0);assert.match(a.$('profileName').textContent,/Ele/);assert.ok(!a.$('profileName').textContent.includes('Thom'));
});
test('three manual states are reversible and separate across profiles',async()=>{
 const a=openApp();await a.choose('ele');a.navigate('#/missioni/secondarie/quest');
 for(const status of ['doing','done','todo']){await a.set('[data-guide-status="quest"]',status);assert.equal(a.values.ele.get('status:quest'),status);}
 await a.set('[data-guide-status="quest"]','doing');a.navigate('#/');assert.match(a.$('resumeContent').textContent,/Una richiesta/);
 await a.click('changeProfileBtn');assert.ok(a.$('guideApp').hidden);await a.choose('thom');assert.ok(!a.$('resumeContent').textContent.includes('Una richiesta'));
 assert.equal(a.values.ele.get('status:quest'),'doing');assert.equal(a.values.thom.size,0);
});
test('moon counts include old bonus and new moons but not unrelated or tutorial IDs',async()=>{
 const a=openApp();await a.choose('ele');a.navigate('#/sblocchi/demiguise');assert.equal(a.$('totalDone').textContent,'2 / 4');
 await a.set('[data-moon-check="dm-intro"]',true);assert.equal(a.$('totalDone').textContent,'2 / 4');
 await a.set('[data-scalar-id="demiguise:handed-in"]','9');assert.equal(a.values.ele.get('demiguise:handed-in'),9);assert.equal(a.$('totalDone').textContent,'2 / 4');
 a.navigate('#/sblocchi/demiguise/dm-new');assert.equal(a.$('moon-dm-new').hidden,false);assert.ok(a.$('moon-dm-new').scrolled);
});
test('reset moons is confirmed scoped and preserves scalar quest future and other profile',async()=>{
 const a=openApp();await a.choose('ele');a.values.ele.set('status:quest','doing');a.values.ele.set('demiguise:handed-in',9);a.navigate('#/sblocchi/demiguise');
 const reset=a.document.querySelectorAll('.reset-btn')[0];await reset.fire('click');assert.ok(a.completed.ele.has('h1'));a.state.confirm=true;await reset.fire('click');
 assert.ok(!a.completed.ele.has('h1'));assert.ok(!a.completed.ele.has('b1'));assert.ok(a.completed.ele.has('future:id'));assert.ok(a.completed.thom.has('h2'));
 assert.equal(a.values.ele.get('status:quest'),'doing');assert.equal(a.values.ele.get('demiguise:handed-in'),9);
});
test('known spoiler title returns a safe result and photo is requested only when opened',async()=>{
 const a=openApp();await a.choose('ele');await a.query('Un segreto futuro');assert.match(a.$('resultList').textContent,/Una richiesta/);assert.ok(!a.$('resultList').textContent.includes('Un segreto futuro'));
 a.navigate('#/missioni/secondarie/quest');const d=a.document.querySelectorAll('.photo-disclosure')[0];assert.equal(d.querySelectorAll('img').length,0);d.open=true;await d.fire('toggle');assert.equal(d.querySelector('img').src,'assets/test.jpg');
});
test('quick object card opens in place and closes without modifying progress',async()=>{
 const a=openApp();await a.choose('ele');a.navigate('#/missioni/secondarie/quest');const b=a.document.querySelectorAll('.object-link')[0];await b.fire('click');assert.equal(a.$('objectDialog').open,true);assert.match(a.$('objectDialogContent').textContent,/Astrolabio/);await a.click('closeObjectDialog');assert.equal(a.$('objectDialog').open,false);assert.equal(a.calls.filter(x=>x[0].startsWith('set')).length,0);
});
test('storage failure disables actual controls and offline feedback stays at the top',async()=>{
 const a=openApp();await a.choose('ele');a.navigate('#/sblocchi/demiguise');a.setStatus('offline',2);assert.match(a.$('syncStatus').textContent,/telefono.*sincronizzare/i);a.setStatus('storage-error');assert.ok(a.document.querySelectorAll('[data-moon-check]').every(n=>n.disabled));assert.ok(a.document.querySelectorAll('[data-scalar-id]').every(n=>n.disabled));
 const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');assert.ok(html.indexOf('id="syncStatus"')<html.indexOf('id="homeView"'));
});
test('verification dataset remains isolated and network refresh starts only after entry',async()=>{
 const a=openApp({remembered:'ele',search:'?verifica=134e4a77-ad41-4f8f-8e45-32c99aa20adf'});assert.equal(a.options().dataset,'verify-134e4a77-ad41-4f8f-8e45-32c99aa20adf');await a.events.focus();assert.equal(a.calls.length,0);await a.click('continueBtn');await a.events.focus();assert.ok(a.calls.some(x=>x[0]==='refresh'));
});

test('moon aliases filter the same locations as their search suggestions',async()=>{
 const a=openApp();await a.choose('ele');a.navigate('#/sblocchi/demiguise');
 for(const q of ['alohomora','demigais','dimigais']){await a.query(q);assert.equal(a.$('moon-h1').hidden,false,q);assert.equal(a.$('itemSearchEmpty').hidden,true,q);}
});
test('catalogue filtering keeps every match beyond the 30 search suggestions',async()=>{
 const extra=Array.from({length:40},(_,i)=>({id:'trial-'+i,title:'Prova Merlino '+i,summary:'Risolvi qui',section:'pratiche',category:'oggetti',location:i<30?'Nord':'Sud',steps:['Passo specifico']}));
 GUIDES.push(...extra);
 try {const a=openApp();await a.choose('ele');a.navigate('#/pratiche/oggetti');await a.query('Merlino');assert.equal(a.document.querySelectorAll('[data-guide-id]').filter(n=>!n.hidden).length,40);assert.equal(a.$('resultList').children.length,30);}
 finally{GUIDES.splice(GUIDES.length-40,40);}
});
test('main mission sequence stays narrative when consecutive missions change location',async()=>{
 const category={id:'principali',title:'Principali',summary:'Storia'};SECTIONS[0].categories.push(category);
 GUIDES.push(...['Hogwarts','Hogsmeade','Hogwarts'].map((location,i)=>({id:'main-test-'+i,title:'Tappa '+i,summary:'Procedi',section:'missioni',category:'principali',location,order:i+1,steps:['Passo specifico']})));
 try {const a=openApp();await a.choose('ele');a.navigate('#/missioni/principali');assert.deepEqual(a.document.querySelectorAll('[data-guide-id]').map(n=>n.dataset.guideId),['main-test-0','main-test-1','main-test-2']);}
 finally{GUIDES.splice(GUIDES.length-3,3);SECTIONS[0].categories.pop();}
});

// These regressions exercise user navigation and visible state, not helper internals.
test('entry and profile changes always open Home; cancelling restores the reading position',async()=>{
 const a=openApp({remembered:'ele',hash:'#/missioni/secondarie/quest'});await a.click('continueBtn');
 assert.equal(a.win.location.hash,'#/');assert.equal(a.$('homeView').hidden,false);
 a.navigate('#/missioni/secondarie/quest');a.win.scrollY=730;await a.click('changeProfileBtn');await a.click('cancelProfileChange');
 assert.equal(a.win.location.hash,'#/missioni/secondarie/quest');assert.equal(a.win.scrollY,730);
 await a.click('changeProfileBtn');await a.choose('thom');assert.equal(a.win.location.hash,'#/');assert.equal(a.$('guideSearch').value,'');
});
test('new routes focus their title; current-route links and local controls never scroll',async()=>{
 const a=openApp();await a.choose('ele');a.scrolls.length=0;
 await a.follow(a.document.querySelectorAll('.nav-link').find(n=>n.dataset.section==='missioni'));
 assert.equal(a.scrolls.at(-1).element,'viewTitle');assert.ok(!a.scrolls.some(x=>x.top===0));
 a.win.scrollY=650;a.scrolls.length=0;await a.follow(a.document.querySelectorAll('.nav-link').find(n=>n.dataset.section==='missioni'));
 assert.equal(a.scrolls.length,0);assert.equal(a.win.scrollY,650);
 a.navigate('#/missioni/secondarie/quest');a.win.scrollY=900;a.scrolls.length=0;await a.set('[data-guide-status="quest"]','doing');
 await a.document.querySelectorAll('.object-link')[0].fire('click');await a.click('closeObjectDialog');assert.equal(a.scrolls.length,0);
});
test('return to the catalogue restores query scope filters and position',async()=>{
 const a=openApp();await a.choose('ele');a.navigate('#/missioni/secondarie');await a.query('ricerca');await a.click('searchAll');
 const status=a.$('categoryFilters').querySelectorAll('select').at(-1);status.value='todo';await status.fire('change');a.win.scrollY=840;
 await a.follow(a.document.querySelectorAll('[data-guide-id="quest"]')[0]);assert.equal(a.$('guideSearch').value,'');
 const back=a.$('guideView').querySelectorAll('.pagination-return')[0];assert.ok(back);await a.follow(back);
 assert.equal(a.$('guideSearch').value,'ricerca');assert.equal(a.$('searchLabel').textContent,'Cerca nella guida');assert.equal(a.win.scrollY,840);
 assert.equal(a.$('categoryFilters').querySelectorAll('select').at(-1).value,'todo');
});
test('browser history and static menu preserve state without leaking another profile UI',async()=>{
 const a=openApp();await a.choose('ele');a.navigate('#/missioni/secondarie');await a.query('ricerca');a.win.scrollY=540;
 await a.follow(a.document.querySelectorAll('.nav-link').find(n=>n.dataset.section==='pratiche'));a.history.back();
 assert.equal(a.$('guideSearch').value,'ricerca');assert.equal(a.win.scrollY,540);
 await a.follow(a.document.querySelectorAll('[data-guide-id="quest"]')[0]);await a.click('changeProfileBtn');await a.choose('thom');a.history.back();
 assert.equal(a.win.location.hash,'#/');assert.equal(a.$('guideSearch').value,'');assert.match(a.$('profileName').textContent,/Thom/);
});
test('previous and next are duplicated top and bottom, use safe titles and the active house',async()=>{
 const added=[{id:'before',title:'Prima',order:0},{id:'other-house',title:'Altra casata',order:1,house:'slytherin'},{id:'after',title:'Una tappa successiva',officialTitle:'Segreto da non mostrare',order:3}].map(g=>({...g,summary:'Guida',section:'missioni',category:'secondarie',location:'Hogsmeade',steps:['Procedi']}));
 GUIDES[1].order=2;GUIDES.push(...added);
 try{const a=openApp();await a.choose('ele');a.navigate('#/missioni/secondarie/quest');const bars=a.$('guideView').querySelectorAll('.guide-pagination');assert.equal(bars.length,2);
 for(const bar of bars){const anchors=bar.querySelectorAll('a');assert.ok(anchors.some(n=>n.href.endsWith('/before')));assert.ok(anchors.some(n=>n.href.endsWith('/after')));assert.ok(!bar.textContent.includes('Altra casata'));assert.ok(!bar.textContent.includes('Segreto da non mostrare'));}}
 finally{GUIDES.splice(-added.length);delete GUIDES[1].order;}
});
test('spell quick cards respect word boundaries and chapters keep nearby photos lazy',async()=>{
 const oldSteps=GUIDES[1].steps;GUIDES[1].steps=['Muovi il braccio e usa Accio. <img src=x onerror=bad()>'];GUIDES[1].chapters=[{title:'Stanza uno',paragraphs:['Osserva la porta.'],steps:['Usa Accio sul cubo.'],photos:[{src:'assets/chapter.jpg',source:'https://example.org',credit:'Fonte',alt:'Cubo'}]}];
 GUIDES.push({id:'spell-accio',title:'Accio',section:'sblocchi',category:'incantesimi',steps:['Attira il bersaglio.']});
 try{const a=openApp();await a.choose('ele');a.navigate('#/missioni/secondarie/quest');const links=a.$('guideView').querySelectorAll('.object-link');assert.equal(links.length,2);assert.ok(links.every(n=>n.textContent==='Accio'));await links[0].fire('click');assert.match(a.$('objectDialogContent').textContent,/Attira il bersaglio/);
 const chapter=a.$('guideView').querySelectorAll('.guide-chapter')[0];assert.ok(chapter);assert.match(chapter.textContent,/Stanza uno.*Osserva la porta.*Usa Accio/s);assert.equal(chapter.querySelectorAll('img').length,0);
 const photo=chapter.querySelectorAll('.photo-disclosure')[0];photo.open=true;await photo.fire('toggle');assert.equal(chapter.querySelector('img').src,'assets/chapter.jpg');assert.ok(a.$('guideView').textContent.includes('<img src=x onerror=bad()>'));}
 finally{GUIDES.pop();GUIDES[1].steps=oldSteps;delete GUIDES[1].chapters;}
});
test('compact sync indicator cannot show saved with pending writes and alerts remain visible',async()=>{
 const a=openApp();await a.choose('ele');a.setStatus('saved',2);assert.notEqual(a.$('syncIndicator').dataset.status,'saved');assert.ok(!a.$('syncStatus').textContent.includes('Salvato online'));
 a.setStatus('offline',2);assert.equal(a.$('syncAlert').hidden,false);assert.match(a.$('syncAlert').textContent,/telefono.*sincronizzare/);assert.equal(a.$('syncAlertRetry').hidden,false);
 const writes=a.$('syncAlert').textWrites;a.setStatus('offline',2);assert.equal(a.$('syncAlert').textWrites,writes);
 await a.click('syncAlertRetry');assert.equal(a.$('syncIndicator').dataset.status,'saved');assert.equal(a.$('syncAlert').hidden,true);assert.match(a.$('syncToggle').attributes['aria-label'],/Salvato online/);
 a.setStatus('storage-error');assert.equal(a.$('syncAlert').hidden,false);assert.match(a.$('syncAlert').textContent,/non disponibile/);
});

test('returning to Demiguise restores access, todo and open groups, including a former direct target',async()=>{
 const a=openApp();await a.choose('ele');a.navigate('#/sblocchi/demiguise/h1');
 const view=a.$('demiguiseView'),access=view.querySelectorAll('select').at(-1);access.value='1';await access.fire('change');
 const todo=view.querySelectorAll('.check-field')[0].querySelector('input');todo.checked=true;await todo.fire('change');
 const group=view.querySelectorAll('.moon-group')[0];group.open=true;a.win.scrollY=1250;
 await a.follow(a.document.querySelectorAll('.nav-link').find(n=>n.dataset.section==='missioni'));a.history.back();
 assert.equal(a.$('demiguiseView').querySelectorAll('select').at(-1).value,'1');assert.equal(a.$('demiguiseView').querySelectorAll('.check-field')[0].querySelector('input').checked,true);
 assert.equal(a.$('moon-h1').hidden,true);assert.equal(a.$('demiguiseView').querySelectorAll('.moon-group')[0].open,true);assert.equal(a.win.scrollY,1250);
});
test('following the current generated route is a no-op before browser Back',async()=>{
 const a=openApp();await a.choose('ele');a.navigate('#/missioni/secondarie');await a.query('ricerca');a.win.scrollY=680;
 await a.follow(a.document.querySelectorAll('[data-guide-id="quest"]')[0]);await a.query('Un segreto futuro');
 const same=a.$('resultList').querySelector('a');const heading=a.$('viewTitle');a.scrolls.length=0;await a.follow(same);
 assert.equal(a.scrolls.length,0);assert.equal(a.$('viewTitle'),heading);assert.equal(a.$('guideSearch').value,'Un segreto futuro');
 a.history.back();assert.equal(a.$('guideSearch').value,'ricerca');assert.equal(a.win.scrollY,680);
});

test('offline alert also reveals its wrapper and opening one profile tool closes the other',async()=>{
 const a=openApp();await a.choose('ele');a.setStatus('error');assert.equal(a.$('syncWarning').hidden,false);
 a.setStatus('saved');assert.equal(a.$('syncWarning').hidden,true);
 a.$('profileMenu').open=true;a.$('syncIndicator').open=true;await a.$('syncIndicator').fire('toggle');assert.equal(a.$('profileMenu').open,false);
 a.$('profileMenu').open=true;await a.$('profileMenu').fire('toggle');assert.equal(a.$('syncIndicator').open,false);
});

test('changing the house catalogue filter retains keyboard focus without a scroll request',async()=>{
 const extra={id:'house-side',title:'Richiesta di casata',section:'missioni',category:'secondarie',location:'Hogwarts',house:'slytherin',steps:['Vai al luogo']};GUIDES.push(extra);
 try{const a=openApp();await a.choose('ele');a.navigate('#/missioni/secondarie');const toggle=a.$('categoryFilters').querySelector('.check-field').querySelector('input');toggle.focus();toggle.checked=true;a.scrolls.length=0;await toggle.fire('change');
 const replacement=a.$('categoryFilters').querySelector('.check-field').querySelector('input');assert.equal(a.document.activeElement,replacement);assert.equal(a.scrolls.length,0);assert.equal(replacement.checked,true);}
 finally{GUIDES.pop();}
});


test('Back reserves dimensions of previously loaded photos before restoring the reading position',async()=>{
 const a=openApp();await a.choose('ele');a.navigate('#/missioni/secondarie/quest');
 const disclosure=a.$('guideView').querySelector('.photo-disclosure');disclosure.open=true;await disclosure.fire('toggle');
 const image=disclosure.querySelector('img');image.naturalWidth=1200;image.naturalHeight=675;await image.fire('load');a.win.scrollY=1460;
 await a.follow(a.document.querySelectorAll('.nav-link').find(n=>n.dataset.section==='pratiche'));
 let restored=false;a.state.onScroll=()=>{const photo=a.$('guideView').querySelector('.photo-disclosure');assert.equal(photo.open,true);const next=photo.querySelector('img');assert.ok(next,'the open photo is materialized before scroll restoration');assert.equal(next.width,1200);assert.equal(next.height,675);restored=true;};
 a.history.back();assert.equal(restored,true);assert.equal(a.win.scrollY,1460);
 const next=a.$('guideView').querySelector('img');assert.notEqual(next,image);a.scrolls.length=0;next.naturalWidth=1200;next.naturalHeight=675;await next.fire('load');assert.equal(a.scrolls.length,0);
});
test('a failed profile selection preserves Cancel and the previous view state',async()=>{
 const a=openApp();await a.choose('ele');a.navigate('#/missioni/secondarie');await a.query('ricerca');a.win.scrollY=810;
 await a.click('changeProfileBtn');a.state.failSelect=true;await a.choose('thom');
 assert.equal(a.$('guideApp').hidden,true);assert.equal(a.$('cancelProfileChange').hidden,false);assert.equal(a.$('gateError').hidden,false);
 await a.click('cancelProfileChange');assert.equal(a.$('guideApp').hidden,false);assert.match(a.$('profileName').textContent,/Ele/);assert.equal(a.win.location.hash,'#/missioni/secondarie');assert.equal(a.$('guideSearch').value,'ricerca');assert.equal(a.win.scrollY,810);
});
test('reset reports failed or partial writes instead of claiming all moons were cleared',async()=>{
 for(const failure of [true,'b1']){
  const a=openApp();await a.choose('ele');a.navigate('#/sblocchi/demiguise');a.state.confirm=true;a.state.failSet=failure;
  await a.document.querySelectorAll('.reset-btn')[0].fire('click');assert.ok(a.completed.ele.has('b1'));
  assert.ok(!a.$('toast').textContent.includes('Spunte delle lune azzerate'));
  assert.match(a.$('toast').textContent,failure===true?/non riuscito/:/parziale/);
 }
});

test('fresh Home starts at the header while a saved Home keeps its previous position',async()=>{
 const a=openApp({remembered:'ele',hash:'#/missioni/secondarie/quest'});await a.click('continueBtn');
 assert.equal(a.scrolls.at(-1).top,0);assert.equal(a.document.activeElement,a.$('viewTitle'));assert.equal(a.$('viewTitle').focusOptions.preventScroll,true);
 a.win.scrollY=310;await a.follow(a.document.querySelectorAll('.nav-link').find(n=>n.dataset.section==='missioni'));a.history.back();assert.equal(a.win.scrollY,310);
 await a.click('changeProfileBtn');await a.choose('thom');assert.equal(a.win.scrollY,0);assert.equal(a.scrolls.at(-1).top,0);
});


test('migration banner is old-origin only and never synchronizes or navigates on entry',async()=>{
 for(const origin of [OLD_ORIGIN,NEW_ORIGIN,'https://unrelated.example']){
  const a=openApp({origin});await a.choose('ele');assert.ok(a.$('migrationBanner'));
  assert.equal(a.$('migrationBanner').hidden,origin!==OLD_ORIGIN);
  assert.equal(a.calls.filter(c=>c[0]==='migration-sync'||c[0]==='assign').length,0);
  if(origin===OLD_ORIGIN){await a.click('migrationButton');assert.equal(a.calls.filter(c=>c[0]==='migration-sync').length,0);assert.deepEqual(a.calls.find(c=>c[0]==='assign'),['assign',NEW_ORIGIN+'/#/']);}
 }
});
test('explicit passage synchronizes the active profile and preserves safe route and QA UUID',async()=>{
 const uuid='11111111-1111-4111-8111-111111111111',a=openApp({origin:OLD_ORIGIN,search:'?verifica='+uuid+'&secret=omit'});
 a.state.migration={status:'needs-sync',canContinue:false,pending:{ele:0,thom:2},legacyPending:3};await a.choose('ele');a.navigate('#/sblocchi/demiguise');
 assert.ok(a.$('migrationButton'));assert.match(a.$('migrationButton').textContent,/Sincronizza/);assert.equal(a.calls.filter(c=>c[0]==='migration-sync').length,0);
 await a.click('migrationButton');assert.deepEqual(a.calls.find(c=>c[0]==='migration-sync'),['migration-sync','ele']);
 assert.deepEqual(a.calls.find(c=>c[0]==='assign'),['assign',NEW_ORIGIN+'/?verifica='+uuid+'#/sblocchi/demiguise']);
});
test('migration keeps the old guide available on blocked, offline and newly pending state',async()=>{
 const a=openApp({origin:OLD_ORIGIN});a.state.migration={status:'blocked',canContinue:false,error:'Memoria non leggibile.'};await a.choose('ele');assert.ok(a.$('migrationButton'));await a.click('migrationButton');
 assert.equal(a.calls.filter(c=>c[0]==='migration-sync'||c[0]==='assign').length,0);assert.match(a.$('migrationMessage').textContent,/Memoria non leggibile/);assert.equal(a.$('guideApp').hidden,false);
 a.state.migration={status:'needs-sync',canContinue:false,pending:{ele:1,thom:1},legacyPending:0};a.state.migrationResult={...a.state.migration,error:'Connessione non disponibile.'};await a.click('migrationButton');
 assert.match(a.$('migrationMessage').textContent,/Connessione non disponibile/);assert.equal(a.calls.filter(c=>c[0]==='assign').length,0);assert.equal(a.$('migrationButton').disabled,false);
 a.state.migrationResult={status:'ready',canContinue:true,pending:{ele:0,thom:0},legacyPending:0};a.state.blockDeparture=true;await a.click('migrationButton');assert.equal(a.calls.filter(c=>c[0]==='assign').length,0);assert.match(a.$('migrationMessage').textContent,/progressi.*salvare/i);
});
test('migration ignores repeated taps and does not leave after a profile change',async()=>{
 const a=openApp({origin:OLD_ORIGIN});a.state.migration={status:'needs-sync',canContinue:false,pending:{ele:0,thom:1},legacyPending:0};await a.choose('ele');assert.ok(a.$('migrationButton'));
 let release;a.state.migrationWait=new Promise(resolve=>release=resolve);const pending=a.click('migrationButton');assert.equal(a.$('migrationButton').disabled,true);await a.click('migrationButton');
 await a.click('changeProfileBtn');await a.choose('thom');release();await pending;
 assert.equal(a.calls.filter(c=>c[0]==='migration-sync').length,1);assert.equal(a.calls.filter(c=>c[0]==='assign').length,0);assert.equal(a.$('migrationButton').disabled,false);assert.match(a.$('profileName').textContent,/Thom/);
});
