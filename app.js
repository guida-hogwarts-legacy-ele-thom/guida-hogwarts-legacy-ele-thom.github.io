import { createProfileSync } from './profile-sync.js?v=2.1.0';
import { SECTIONS, GUIDES, MOONS, INTRO_MOONS, PUZZLE_METHODS } from './guide-data.js?v=2.1.0';
import { searchGuide } from './search.js?v=2.1.0';
import { STATUS_LABELS, guideRoute, parseRoute, forHouse, orderedCatalogue, guideNeighbours, guideStatus, makeGuideEntries, knownTitleResults, filterMoons, countMoons } from './guide-model.js?v=2.1.0';
import { createHostMigration } from './migration.js?v=2.1.1';

(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const profiles = {ele:{name:'Ele',house:'Grifondoro',image:'gryffindor'},thom:{name:'Thom',house:'Serpeverde',image:'slytherin'}};
  const verification = new URLSearchParams(window.location.search).get('verifica');
  const isVerification = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(verification||'');
  const dataset = isVerification ? 'verify-'+verification.toLowerCase() : 'guide-v1';
  let entered=false, choosing=true, canReturn=false, desiredProfile=null, rememberedProfile=null;
  const viewStates=new Map(), photoDimensions=new Map(), photoLoaders=new WeakMap();let renderedHash=null, navigationSession='', entryCount=0, cancelledView=null;
  let current, route, allScope=false, showOtherHouses=false, categoryPlace='', categoryStatus='', moonLevel=1, moonTodo=false, toastTimer;
  const searchInput=$('guideSearch');
  // Enabled only after the dedicated GitHub organization has been secured.
  // The coordinator itself permits passage exclusively from the old origin.
  const migration=createHostMigration({enabled:true,currentOrigin:window.location.origin,search:window.location.search});
  let migrationBusy=false,migrationNotice='';
  const sync=createProfileSync({dataset,onChange:render});
  current=sync.getState(); rememberedProfile=current.profile; choosing=!rememberedProfile;
  $('verificationNotice').hidden=!isVerification;
  window.history.scrollRestoration='manual';

  const hashKey=hash=>hash&&hash!=='#'?hash:'#/';
  function viewSnapshot() {
    return {query:searchInput.value,allScope,showOtherHouses,categoryPlace,categoryStatus,moonLevel,moonTodo,
      scrollY:window.scrollY||0,openDetails:[...($(route?.kind+'View')?.querySelectorAll('details')||[])].map(n=>n.open)};
  }
  function historyState(hash,view) {
    return {...window.history.state,guideNavigation:{session:navigationSession,profile:current.profile,hash,view}};
  }
  function rememberView(write=true) {
    if(!entered||!renderedHash)return;
    const view=viewSnapshot();viewStates.set(renderedHash,view);
    if(write)window.history.replaceState(historyState(renderedHash,view),'',renderedHash);
    return view;
  }
  function applyView(view) {
    searchInput.value=view?.query||'';allScope=Boolean(view?.allScope);showOtherHouses=Boolean(view?.showOtherHouses);
    categoryPlace=view?.categoryPlace||'';categoryStatus=view?.categoryStatus||'';
    moonLevel=view?.moonLevel??((current.values?.get('demiguise:alohomora-level')||1)>=2?2:1);moonTodo=Boolean(view?.moonTodo);
  }
  function navigate(hash,{restore=false}={}) {
    hash=hashKey(hash);if(hash===renderedHash)return;
    rememberView();
    const destination=parseRoute(hash,GUIDES);
    const saved=restore||destination.kind==='category'||(destination.kind==='demiguise'&&!destination.target)?viewStates.get(hash):null;
    applyView(saved);window.history.pushState(historyState(hash,saved),'',hash);renderRoute(true,saved);
  }
  function navigationClick(event,hash,options) {
    if(event.button>0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    event.preventDefault();navigate(hash,options);
  }
  function historyChanged() {
    const hash=hashKey(window.location.hash);if(hash===renderedHash)return;
    rememberView(false);
    const entry=window.history.state?.guideNavigation;
    if(entered&&entry&&(entry.session!==navigationSession||entry.profile!==current.profile)) {
      applyView();window.history.replaceState(historyState('#/',null),'','#/');renderRoute(true);return;
    }
    const saved=entry?.hash===hash?entry.view:viewStates.get(hash);
    applyView(saved);renderRoute(true,saved);
  }

  function el(tag,cls,text) { const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n; }
  function link(title,href,cls='',options) {
    const n=el('a',cls,title);n.href=href;
    n.addEventListener('click',event=>navigationClick(event,href,options));return n;
  }
  function external(title,url,cls='') {
    const n=el('a',cls,title);n.href=url;n.target='_blank';n.rel='noopener noreferrer';return n;
  }
  function button(text,action,cls='text-button') {const n=el('button',cls,text);n.type='button';n.addEventListener('click',action);return n;}
  function toast(message) {$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2600);}
  function canEdit() {return entered&&current.profile===desiredProfile&&current.status!=='storage-error';}
  function details(title,cls='guide-disclosure') {const d=el('details',cls);d.append(el('summary','',title));return d;}
  function card(title,summary,href,cls='guide-card',badge='',icon='') {
    const n=link('',href,cls),copy=el('span','card-copy');
    if(icon) {
      const drawing=el('span','card-icon');drawing.setAttribute('aria-hidden','true');
      const paths={
        missioni:'<path d="M12 6C9 3 4 3 2 4v15c3-1 7-1 10 1m0-14c3-3 8-3 10-2v15c-3-1-7-1-10 1V6Z"/>',
        sblocchi:'<path d="m4 20 12-12 3 3L7 23 4 20Zm11-11 3 3M6 2v4M2 6h4M8 8l2 2M18 2v3M21 6h2"/>',
        pratiche:'<path d="M8 2h8M10 2v7l-6 10c-1 2 0 3 2 3h12c2 0 3-1 2-3L14 9V2M7 15h10"/>'
      };
      // Static application-owned SVG only; catalogue/search text stays textContent.
      drawing.innerHTML='<svg viewBox="0 0 24 26" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">'+paths[icon]+'</svg>';
      n.append(drawing);
    }
    copy.append(el('span','card-title',title));if(summary)copy.append(el('span','card-summary',summary));
    if(badge)copy.append(el('span','availability',badge));
    const arrow=el('span','card-arrow','›');arrow.setAttribute('aria-hidden','true');n.append(copy,arrow);return n;
  }
  function selection(label,options,value,onChange,cls='') {
    const wrapper=el('label','select-field '+cls);wrapper.append(el('span','',label));const select=el('select');
    for(const [id,title] of options) {const o=el('option','',title);o.value=String(id);select.append(o);}
    select.value=String(value);select.addEventListener('change',()=>onChange(select.value));wrapper.append(select);return {wrapper,select};
  }
  const objects=GUIDES.filter(g=>((g.section==='pratiche'&&g.category==='oggetti')||(g.section==='sblocchi'&&g.category==='incantesimi'))&&g.title.length>3).sort((a,b)=>b.title.length-a.title.length);
  function richText(parent,text,skipId) {
    // Only catalogue-owned exact names become links; no text is interpreted as HTML.
    let rest=String(text),count=0;
    while(rest&&count<8) {
      const low=rest.toLocaleLowerCase('it');let match=null;
      for(const object of objects) {
        if(object.id===skipId)continue;
        const name=object.title.toLocaleLowerCase('it');let i=low.indexOf(name);
        while(i>=0&&(/[\p{L}\p{N}]/u.test(low[i-1]||'')||/[\p{L}\p{N}]/u.test(low[i+name.length]||'')))i=low.indexOf(name,i+1);
        if(i>=0&&(!match||i<match.i))match={i,object};
      }
      if(!match)break;
      if(match.i)parent.append(document.createTextNode(rest.slice(0,match.i)));
      const label=rest.slice(match.i,match.i+match.object.title.length);
      parent.append(button(label,()=>showObject(match.object),'object-link'));
      rest=rest.slice(match.i+match.object.title.length);count++;
    }
    if(rest)parent.append(document.createTextNode(rest));
  }
  function paragraphs(parent,lines,skipId) {for(const text of (lines||[]).filter(Boolean)){const p=el('p');richText(p,text,skipId);parent.append(p);}}
  function steps(parent,lines,skipId) {
    if(!lines?.length)return;const list=el('ol','guide-steps');
    for(const text of lines){const li=el('li');richText(li,text,skipId);list.append(li);}parent.append(list);
  }
  function addPhotos(parent,photos) {
    if(!photos?.length)return;
    const disclosure=details(photos.length===1?'Mostra immagine':'Mostra immagini','photo-disclosure');
    let loaded=false;
    const load=()=>{
      if(!disclosure.open||loaded)return;loaded=true;
      for(const photo of photos) {
        const figure=el('figure','reference-photo'),img=el('img');img.alt=photo.alt||'Immagine di riferimento';img.loading='lazy';img.decoding='async';
        const dimensions=photoDimensions.get(photo.src);if(dimensions){img.width=dimensions.width;img.height=dimensions.height;}
        img.addEventListener('load',()=>{if(img.naturalWidth>0&&img.naturalHeight>0)photoDimensions.set(photo.src,{width:img.naturalWidth,height:img.naturalHeight});},{once:true});
        const caption=el('figcaption');caption.append(external('Foto di riferimento: '+(photo.credit||'Fonte').replace(/^Foto di riferimento:\s*/i,'').replace(/\.$/,''),photo.source||photo.src));
        img.addEventListener('error',()=>{img.hidden=true;const p=el('p','tiny','Immagine non disponibile qui. Apri la foto nella fonte.');figure.insertBefore(p,caption);},{once:true});
        const full=external('',photo.src);full.setAttribute('aria-label','Apri l’immagine a piena grandezza');full.append(img);
        figure.append(full,caption);disclosure.append(figure);img.src=photo.src;
      }
    };
    photoLoaders.set(disclosure,load);disclosure.addEventListener('toggle',load);parent.append(disclosure);
  }
  function addSources(parent,sources) {
    if(!sources?.length)return;const box=details('Fonti e verifica','source-disclosure'),ul=el('ul');
    for(const source of sources){const li=el('li');li.append(external(source.title||new URL(source.url).hostname,source.url));ul.append(li);}
    box.append(ul,el('p','tiny','Nomi e indicazioni verificati il 20 ottobre 2026. Le immagini possono mostrare un’altra piattaforma.'));parent.append(box);
  }
  function statusControl(guide) {
    const c=selection('Il tuo progresso',Object.entries(STATUS_LABELS),guideStatus(guide.id,current),async value=>{
      if(!canEdit())return render(current);await sync.setValue('status:'+guide.id,value);
    },'status-field');
    c.select.dataset.guideStatus=guide.id;c.select.disabled=!canEdit();return c.wrapper;
  }
  function addChapters(parent,chapters,guideId) {
    for(const chapter of chapters||[]) {
      const section=el('section','guide-chapter');section.append(el('h2','chapter-title',chapter.title));
      paragraphs(section,chapter.paragraphs,guideId);steps(section,chapter.steps,guideId);addPhotos(section,chapter.photos);parent.append(section);
    }
  }
  function pagination(guide) {
    const nav=el('nav','guide-pagination');nav.setAttribute('aria-label','Navigazione fra le schede');
    const neighbours=guideNeighbours(GUIDES,guide,current.profile);
    for(const [direction,label] of [['previous','← Precedente'],['next','Successiva →']]) {
      const sibling=neighbours[direction],control=sibling?link('',guideRoute(sibling),'pagination-link'):el('span','pagination-link');
      control.dataset.direction=direction;if(!sibling)control.setAttribute('aria-disabled','true');
      control.append(el('span','pagination-label',label),el('span','pagination-title',sibling?.title||(direction==='previous'?'Prima scheda':'Ultima scheda')));nav.append(control);
    }
    nav.append(link('Torna all’elenco','#/'+guide.section+'/'+guide.category,'pagination-return',{restore:true}));return nav;
  }
  function renderGuideBody(parent,guide,{compact=false}={}) {
    if(guide.location)parent.append(el('p','guide-location',guide.location));
    paragraphs(parent,[guide.summary],guide.id);
    if(guide.tracking&&!compact)parent.append(statusControl(guide));
    if(guide.requirements?.length){const box=el('div','requirements');box.append(el('strong','','Prima di iniziare'));paragraphs(box,guide.requirements,guide.id);parent.append(box);}
    steps(parent,guide.steps,guide.id);
    addChapters(parent,guide.chapters,guide.id);
    if(guide.officialTitle){const d=details('Mostra il nome nel gioco · spoiler');d.append(el('p','',guide.officialTitle));parent.append(d);}
    for(const panel of guide.panels||[]) {
      const d=details(panel.title+(panel.spoiler?' · spoiler di trama':''));
      paragraphs(d,panel.paragraphs,guide.id);steps(d,panel.steps,guide.id);addChapters(d,panel.chapters,guide.id);addPhotos(d,panel.photos);parent.append(d);
    }
    if(guide.methodId) {
      const method=PUZZLE_METHODS.find(m=>m.id===guide.methodId);
      if(method){const d=details('Come si risolve');paragraphs(d,[method.summary],guide.id);steps(d,method.steps,guide.id);parent.append(d);}
    }
    addPhotos(parent,guide.photos);
    if(!compact) {
      const related=(guide.related||[]).map(id=>GUIDES.find(g=>g.id===id)).filter(Boolean);
      if(related.length){const box=el('section','related-guides');box.append(el('h2','','Ti può servire'));for(const g of related)box.append(card(g.title,g.summary,guideRoute(g)));parent.append(box);}
      addSources(parent,guide.sources);
    }
  }
  function showObject(guide) {
    const contents=$('objectDialogContent');contents.replaceChildren();const title=el('h2','',guide.title);title.id='objectDialogTitle';contents.append(title);
    renderGuideBody(contents,guide,{compact:true});const full=link('Apri scheda completa',guideRoute(guide),'primary-link');full.addEventListener('click',()=>$('objectDialog').close());contents.append(full);
    $('objectDialog').showModal();
  }
  $('closeObjectDialog').addEventListener('click',()=>$('objectDialog').close());
  $('objectDialog').addEventListener('click',event=>{if(event.target===$('objectDialog'))$('objectDialog').close();});

  function activeGuides() {return forHouse(GUIDES,current.profile,showOtherHouses);}
  function searchEntries() {
    return [
      ...SECTIONS.flatMap(section=>[
        {id:'section:'+section.id,title:section.title,summary:section.summary,scope:section.id,route:'#/'+section.id,kind:'Sezione'},
        ...section.categories.filter(c=>c.id!=='demiguise').map(c=>({id:'category:'+section.id+':'+c.id,title:c.title,summary:c.summary,scope:section.id+'/'+c.id,route:'#/'+section.id+'/'+c.id,kind:'Sezione'}))
      ]),...makeGuideEntries(activeGuides()),
      ...MOONS.map(m=>({id:'moon:'+m.id,moonId:m.id,title:m.title,summary:m.location+' · '+(m.group||''),aliases:['luna','lune','demiguise','demigais','dimigais','alohomora'],scope:'sblocchi/demiguise',route:'#/sblocchi/demiguise/'+m.id,kind:'Luna Demiguise'}))
    ];
  }
  function renderSearch() {
    const query=searchInput.value.trim(),scope=allScope?'':route?.scope||'';
    $('clearSearch').hidden=!query;$('searchAll').hidden=!route?.scope;
    $('searchAll').textContent=allScope?'Torna a questa sezione':'Cerca in tutta la guida';
    const section=SECTIONS.find(s=>s.id===route?.section),category=section?.categories.find(c=>c.id===route?.category);
    $('searchLabel').textContent=!scope?'Cerca nella guida':'Cerca in '+(category?.title||section?.title||'Demiguise');
    $('searchResults').hidden=!query;
    if(!query){$('resultList').replaceChildren();$('searchMessage').textContent='';applyFilters();return;}
    const matches=searchGuide(searchEntries(),query,{scope});
    for(const known of knownTitleResults(activeGuides(),query))if((!scope||known.scope===scope||known.scope.startsWith(scope+'/'))&&!matches.some(x=>x.id===known.id))matches.unshift(known);
    $('resultList').replaceChildren(...matches.map(result=>{
      const li=el('li'),a=link('',result.route);a.append(el('span','result-title',result.title),el('span','result-meta',result.kind+(result.approximate?' · Corrispondenza simile':'')),el('span','result-summary',result.summary));li.append(a);return li;
    }));
    $('searchMessage').textContent=matches.length?matches.length+' risultati'+(matches.length>=30?' mostrati · precisa la ricerca':'')+(scope?' in questa sezione.':'.'):'Nessun risultato. Prova un nome più breve'+(scope?' oppure cerca in tutta la guida.':'.');
    applyFilters();
  }
  function clearSearch(){searchInput.value='';allScope=false;renderSearch();}
  function resolve(){
    const result=parseRoute(window.location.hash,GUIDES),section=SECTIONS.find(s=>s.id===result.section);
    if(result.category&&!section?.categories.some(c=>c.id===result.category))return {kind:'section',section:result.section,scope:result.section};
    return result;
  }
  function renderRoute(focus=false,saved=null) {
    renderedHash=hashKey(window.location.hash);const paintedHash=renderedHash;
    route=resolve();const section=SECTIONS.find(s=>s.id===route.section),category=section?.categories.find(c=>c.id===route.category);
    for(const kind of ['home','section','category','guide','demiguise'])$(kind+'View').hidden=route.kind!==kind;
    $('viewTitle').textContent=route.kind==='home'?'Esplora la guida':route.guide?.title||category?.title||section?.title||'Demiguise e Alohomora';
    const crumbs=[];if(route.kind!=='home')crumbs.push(link('Home','#/'));
    if(category)crumbs.push(link(section.title,'#/'+section.id));
    if(route.kind==='guide')crumbs.push(link(category.title,'#/'+section.id+'/'+category.id));
    $('breadcrumbs').replaceChildren(...crumbs);$('breadcrumbs').hidden=!crumbs.length;
    document.querySelectorAll('.nav-link').forEach(n=>{if(n.dataset.section===(route.section||''))n.setAttribute('aria-current','page');else n.removeAttribute('aria-current');});
    if(route.kind==='section') {
      $('sectionIntro').textContent=section.summary;
      $('categoryGrid').replaceChildren(...section.categories.map(c=>{
        const count=activeGuides().filter(g=>g.section===section.id&&g.category===c.id).length;
        return card(c.title,c.summary,'#/'+section.id+'/'+c.id,'category-card',c.id==='demiguise'?'30 lune · percorso completo':count+' schede');
      }));
    }
    if(route.kind==='category')renderCategory(section,category);
    if(route.kind==='guide') {
      const box=$('guideView');box.replaceChildren();
      if(route.guide.house&&route.guide.house!==profiles[current.profile]?.image)box.append(el('p','info-strip','Questa missione appartiene a un’altra casata. Puoi consultarla senza cambiare il tuo profilo.'));
      box.append(pagination(route.guide));renderGuideBody(box,route.guide);box.append(pagination(route.guide));
    }
    if(route.kind==='demiguise') {
      if(route.target&&!saved){moonLevel=2;moonTodo=false;}
      renderDemiguise();
    }
    renderSearch();render(current);
    if(saved?.openDetails)$(route.kind+'View').querySelectorAll('details').forEach((node,index)=>{
      if(saved.openDetails[index]!==undefined)node.open=saved.openDetails[index];
      // Restore known image geometry before scrolling; native toggle/load can run later.
      if(node.open)photoLoaders.get(node)?.();
    });
    if(focus&&entered)requestAnimationFrame(()=>{
      if(!entered||renderedHash!==paintedHash)return;
      if(Number.isFinite(saved?.scrollY)) {
        $('viewTitle').focus({preventScroll:true});window.scrollTo({top:saved.scrollY,behavior:'instant'});
      } else if(route.kind==='home') {
        $('viewTitle').focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});
      } else if(route.target&&$('moon-'+route.target)) {
        const n=$('moon-'+route.target);n.closest('details').open=true;n.scrollIntoView({block:'start',behavior:'instant'});n.focus({preventScroll:true});
      } else {
        $('viewTitle').focus({preventScroll:true});$('viewTitle').scrollIntoView({block:'start',behavior:'instant'});
      }
      rememberView();
    });
  }
  function renderCategory(section,category) {
    const guides=orderedCatalogue(GUIDES,section.id,category.id,current.profile,showOtherHouses);
    $('categoryIntro').textContent=category.summary;
    const controls=[],places=[...new Set(guides.map(g=>g.group||g.location).filter(Boolean))];
    if(places.length>1){if(!places.includes(categoryPlace))categoryPlace='';controls.push(selection('Luogo o percorso',[['','Tutti'],...places.map(x=>[x,x])],categoryPlace,v=>{categoryPlace=v;applyFilters();}).wrapper);}
    if(guides.some(g=>g.tracking))controls.push(selection('Progresso',[['','Tutti'],...Object.entries(STATUS_LABELS)],categoryStatus,v=>{categoryStatus=v;applyFilters();}).wrapper);
    if(GUIDES.some(g=>g.section===section.id&&g.category===category.id&&g.house)) {
      const label=el('label','check-field'),input=el('input');input.type='checkbox';input.checked=showOtherHouses;input.dataset.houseFilter='true';
      input.addEventListener('change',()=>{const focused=document.activeElement===input;showOtherHouses=input.checked;renderRoute();if(focused)$('categoryFilters').querySelector('[data-house-filter]').focus({preventScroll:true});});label.append(input,document.createTextNode('Mostra anche le altre casate'));controls.push(label);
    }
    $('categoryFilters').replaceChildren(...controls);
    const groups=new Map();for(const g of guides){const key=category.id==='principali'?'Percorso della storia':g.group||g.location||'Guide';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(g);}
    const nodes=[];for(const [group,values]of groups) {
      const sectionNode=el('section','catalogue-group');sectionNode.dataset.group=group;
      if(groups.size>1)sectionNode.append(el('h2','group-heading',group));
      for(const g of values){const node=card(g.title,g.summary,guideRoute(g));node.dataset.guideId=g.id;if(g.tracking)node.append(el('span','status-badge',STATUS_LABELS[guideStatus(g.id,current)]));sectionNode.append(node);}
      nodes.push(sectionNode);
    }
    if(!nodes.length)nodes.push(el('p','empty-state','Non ci sono schede per questi filtri.'));
    $('categoryContents').replaceChildren(...nodes);
  }
  function renderDemiguise() {
    const root=$('demiguiseView'),guide=GUIDES.find(g=>g.id==='demiguise');root.replaceChildren();
    const intro=el('div','demiguise-intro');renderGuideBody(intro,{...guide,tracking:true,photos:[],sources:[],related:[]});root.append(intro);
    const progress=el('div','progress-panel');progress.append(el('strong','','Lune nel mondo raccolte'));
    const count=el('span','moon-total');count.id='totalDone';progress.append(count);
    const track=el('div','progress-track');track.id='progressTrack';track.setAttribute('role','progressbar');track.setAttribute('aria-label','Lune nel mondo raccolte');track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax',String(MOONS.length));
    const fill=el('div','progress-fill');fill.id='progressFill';track.append(fill);progress.append(track);
    const note=el('p','progress-note');note.id='progressMessage';progress.append(note);root.append(progress);
    const scalars=el('div','scalar-progress');
    for(const [id,title,options] of [
      ['demiguise:alohomora-level','Alohomora imparato',[[0,'Non ancora'],[1,'Livello I'],[2,'Livello II'],[3,'Livello III']]],
      ['demiguise:handed-in','Lune del mondo già consegnate',Array.from({length:31},(_,i)=>[i,String(i)])]
    ]) {
      const c=selection(title,options,current.values?.get(id)||0,async value=>{if(canEdit())await sync.setValue(id,Number(value));});
      c.select.dataset.scalarId=id;c.select.disabled=!canEdit();scalars.append(c.wrapper);
    }
    root.append(scalars,el('p','tiny','Aggiorna questi due valori solo quando consegni le lune o impari il livello. Le spunte indicano ciò che hai raccolto, anche se lo hai già consegnato.'));
    const tutorial=details('Le 3 lune della missione introduttiva');
    tutorial.append(el('p','','Sono separate dalle 30 del mondo e dalle 9 + 13 da consegnare per i potenziamenti.'));
    for(const moon of INTRO_MOONS)tutorial.append(moonCard(moon,true));root.append(tutorial);
    const controls=el('div','catalogue-filters');controls.append(selection('Quali porte puoi aprire?',[[1,'Alohomora I · libere e livello I'],[2,'Alohomora II o III · tutte']],moonLevel,v=>{moonLevel=Number(v);applyFilters();}).wrapper);
    const todo=el('label','check-field'),check=el('input');check.type='checkbox';check.checked=moonTodo;check.addEventListener('change',()=>{moonTodo=check.checked;applyFilters();});todo.append(check,document.createTextNode('Solo lune da raccogliere'));controls.append(todo);root.append(controls);
    const empty=el('p','empty-state','Nessuna luna corrisponde ai filtri.');empty.id='itemSearchEmpty';empty.hidden=true;root.append(empty);
    const groups=new Map();for(const m of MOONS){const group=m.group||m.location;if(!groups.has(group))groups.set(group,[]);groups.get(group).push(m);}
    for(const [group,moons]of groups){const d=details(group,'moon-group');d.dataset.moonGroup=group;d.open=group.startsWith('Hogwarts');const count=el('span','count');count.dataset.moonGroupCount=group;d.querySelector('summary').append(count);for(const m of moons)d.append(moonCard(m));root.append(d);}
    const related=el('section','related-guides');related.append(el('h2','','Le missioni collegate'));
    for(const id of guide.related||[]){const g=GUIDES.find(x=>x.id===id);if(g)related.append(card(g.title,g.summary,guideRoute(g)));}root.append(related);
    root.append(button('Azzera le spunte delle lune',resetMoons,'reset-btn'));addSources(root,guide.sources);
  }
  function moonCard(moon,intro=false) {
    const node=el('article','moon-card');node.id='moon-'+moon.id;node.tabIndex=-1;node.dataset.moonId=moon.id;node.dataset.intro=String(intro);
    const label=el('label','moon-heading'),input=el('input');input.type='checkbox';input.dataset.moonCheck=moon.id;
    input.addEventListener('change',async()=>{if(!canEdit())return render(current);await sync.set(moon.id,input.checked);});
    label.append(input,el('span','',moon.title));node.append(label);
    node.append(el('p','moon-meta',(moon.location||'')+(intro?'':' · '+(moon.lock?'Alohomora '+(moon.lock===1?'I':'II'):'Nessuna serratura'))));
    steps(node,moon.steps);addPhotos(node,moon.photos);return node;
  }
  async function resetMoons() {
    if(!canEdit())return;const ids=[...MOONS,...INTRO_MOONS].map(m=>m.id),profile=current.profile;
    const before=ids.filter(id=>current.completed.has(id)).length;
    if(!before)return toast('Non ci sono lune da azzerare');
    if(!confirm('Togliere le spunte delle lune di '+profiles[profile].name+'? Consegne, livello di Alohomora, missioni e altro profilo rimangono invariati.'))return;
    await Promise.all(ids.map(id=>sync.set(id,false)));const result=sync.getState();if(result.profile!==profile)return;
    const remaining=ids.filter(id=>result.completed.has(id)).length;
    toast(!remaining?'Spunte delle lune azzerate':remaining<before?'Azzeramento parziale: '+remaining+' lune ancora spuntate. Riprova.':'Azzeramento non riuscito. Le spunte sono rimaste invariate.');
  }
  function applyFilters() {
    if(!route||!current)return;
    const query=!allScope?searchInput.value.trim():'';
    if(route.kind==='category') {
      const matches=query?new Set([...makeGuideEntries(activeGuides()).filter(entry=>searchGuide([entry],query,{scope:route.scope,limit:1}).length),...knownTitleResults(activeGuides(),query)].map(x=>x.id)):null;
      let visible=0;
      document.querySelectorAll('[data-guide-id]').forEach(n=>{
        const g=GUIDES.find(g=>g.id===n.dataset.guideId);if(!g)return;
        n.hidden=Boolean((categoryPlace&&(g.group||g.location)!==categoryPlace)||(categoryStatus&&guideStatus(g.id,current)!==categoryStatus)||(matches&&!matches.has(g.id)));
        if(!n.hidden)visible++;const badge=n.querySelector('.status-badge');if(badge)badge.textContent=STATUS_LABELS[guideStatus(g.id,current)];
      });
      document.querySelectorAll('.catalogue-group').forEach(n=>{n.hidden=![...n.querySelectorAll('[data-guide-id]')].some(x=>!x.hidden);});
      $('categoryCount').textContent=visible+' schede'+(visible?'':' · cambia i filtri o la ricerca');
    }
    if(route.kind==='demiguise') {
      const moonEntries=MOONS.map(m=>({id:m.id,title:m.title,summary:m.location+' '+m.group,aliases:['luna','lune','demiguise','demigais','dimigais','alohomora']}));
      const matched=query?new Set(moonEntries.filter(entry=>searchGuide([entry],query,{limit:1}).length).map(m=>m.id)):null;
      const visible=new Set(filterMoons(MOONS,{level:moonLevel,completed:current.completed,todo:moonTodo,matched}).map(m=>m.id));
      document.querySelectorAll('[data-moon-id]').forEach(n=>{if(n.dataset.intro!=='true')n.hidden=!visible.has(n.dataset.moonId);});
      document.querySelectorAll('[data-moon-group]').forEach(n=>{
        const ms=MOONS.filter(m=>(m.group||m.location)===n.dataset.moonGroup);n.hidden=!ms.some(m=>visible.has(m.id));
        n.querySelector('[data-moon-group-count]').textContent=countMoons(ms,current.completed)+' / '+ms.length;
        if(query&&!n.hidden)n.open=true;
      });
      if($('itemSearchEmpty'))$('itemSearchEmpty').hidden=visible.size>0;
    }
  }
  function statusText(state) {
    if(state.status==='storage-error')return 'Salvataggio sul telefono non disponibile. Le nuove modifiche non vengono applicate.';
    if(!state.profile)return 'Scegli Ele o Thom per usare la guida.';
    if(state.status==='saved'&&!state.pending)return 'Salvato online · disponibile su entrambi i telefoni';
    if(state.status==='syncing')return 'Sincronizzazione in corso…';
    if(state.status==='offline'||state.status==='error'||state.pending)return state.pending?'Salvato sul telefono · modifiche da sincronizzare':'Collegamento non disponibile · visualizzi la copia di questo telefono';
    return 'Caricamento dei progressi…';
  }
  function renderSync(state) {
    const failed=['offline','error','storage-error'].includes(state.status);
    const status=state.pending&&state.status==='saved'?'pending':state.status;
    const text=statusText(state),label='Salvataggio: '+text;
    // Updating identical live-region text repeatedly causes avoidable announcements.
    for(const id of ['syncStatus','syncAlert']){const node=$(id);if(node&&node.textContent!==text)node.textContent=text;}
    for(const id of ['syncIndicator','syncToggle','syncIcon','syncStatus','syncAlert'])if($(id))$(id).dataset.status=status;
    if($('syncToggle')&&$('syncToggle').title!==label){$('syncToggle').setAttribute('aria-label',label);$('syncToggle').title=label;}
    if($('syncIcon'))$('syncIcon').textContent=status==='saved'?'✓':failed?'!':status==='syncing'?'↻':'…';
    $('retrySyncBtn').hidden=!failed;
    if($('syncWarning'))$('syncWarning').hidden=!failed;
    if($('syncAlert'))$('syncAlert').hidden=!failed;
    if($('syncAlertRetry'))$('syncAlertRetry').hidden=!failed;
  }
  function renderMigration() {
    const state=migration.inspect(),banner=$('migrationBanner');
    banner.hidden=!entered||current.profile!==desiredProfile||state.status==='inactive';if(banner.hidden)return;
    banner.dataset.status=migrationBusy?'syncing':state.status;
    const message=migrationBusy?'Salviamo i progressi di Ele e Thom. Resta qui fino al passaggio.':migrationNotice||state.error||
      (state.canContinue?'I progressi sono pronti. Apri il nuovo link e salvalo nei preferiti.':'Ci sono progressi su questo telefono da salvare, anche dell’altro profilo. Puoi continuare a usare questa pagina.');
    if($('migrationMessage').textContent!==message)$('migrationMessage').textContent=message;
    $('migrationButton').disabled=migrationBusy;
    $('migrationButton').textContent=migrationBusy?'Attendi…':state.status==='blocked'?'Ricontrolla':state.canContinue?'Passa al nuovo link':state.error?'Riprova il passaggio':'Sincronizza e passa';
  }
  async function passToNewSite() {
    if(migrationBusy||!entered||current.profile!==desiredProfile)return;
    migrationNotice='';const initial=migration.inspect();
    if(initial.status==='inactive'||initial.status==='blocked'){renderMigration();return;}
    const profile=current.profile,session=navigationSession;
    migrationBusy=true;renderMigration();
    try {
      const outcome=initial.canContinue?initial:await migration.synchronize(profile);
      if(!entered||current.profile!==profile||desiredProfile!==profile||navigationSession!==session){migrationNotice='Il profilo è cambiato. Tocca di nuovo per passare al nuovo link.';return;}
      // destination() rechecks both queues immediately before navigation.
      const destination=outcome.canContinue?migration.destination(window.location.hash):null;
      if(destination)window.location.assign(destination);
    } catch(error) {
      migrationNotice='Passaggio non riuscito. I progressi restano su questa pagina. Riprova.';
    } finally {migrationBusy=false;renderMigration();}
  }
  function render(state) {
    current=state;const showing=entered&&state.profile===desiredProfile&&Boolean(state.profile);
    $('profileGate').hidden=showing;$('guideApp').hidden=!showing;$('welcomeBack').hidden=choosing||!rememberedProfile;
    $('profileChoices').hidden=!choosing&&Boolean(rememberedProfile);$('cancelProfileChange').hidden=!canReturn;
    const remembered=profiles[rememberedProfile];$('gateTitle').textContent=choosing||!remembered?'Chi gioca?':'Riprendiamo?';
    $('continueBtn').textContent=remembered?'Continua come '+remembered.name:'Continua';
    $('gateError').hidden=showing||state.status!=='storage-error';$('gateError').textContent=state.status==='storage-error'?'Il telefono non consente di salvare il profilo. Controlla la memoria del browser e riprova.':'';
    document.body.dataset.profile=showing?state.profile:choosing?'':rememberedProfile||'';
    const profile=profiles[state.profile];if(profile){$('profileName').textContent=profile.name+' · '+profile.house;$('houseEmblem').src='./assets/houses/'+profile.image+'.png';}
    renderSync(state);
    renderMigration();
    const resume=forHouse(GUIDES,state.profile).filter(g=>g.tracking&&guideStatus(g.id,state)==='doing');
    $('resumeContent').replaceChildren(...(resume.length?resume.map(g=>card(g.title,'In corso · '+(g.location||g.summary),guideRoute(g))):[el('p','','Qui trovi le attività che segni «In corso».')]));
    document.querySelectorAll('[data-guide-status]').forEach(n=>{n.value=guideStatus(n.dataset.guideStatus,state);n.disabled=!canEdit();});
    document.querySelectorAll('[data-scalar-id]').forEach(n=>{n.value=String(state.values?.get(n.dataset.scalarId)||0);n.disabled=!canEdit();});
    document.querySelectorAll('[data-moon-check]').forEach(n=>{n.checked=state.completed.has(n.dataset.moonCheck);n.disabled=!canEdit();n.closest('article').classList.toggle('checked',n.checked);});
    if($('totalDone')){$('totalDone').textContent=countMoons(MOONS,state.completed)+' / '+MOONS.length;$('progressTrack').setAttribute('aria-valuenow',String(countMoons(MOONS,state.completed)));$('progressFill').style.width=(countMoons(MOONS,state.completed)/MOONS.length*100)+'%';$('progressMessage').textContent='Le 3 lune introduttive sono conteggiate separatamente. Nessuna luna richiede Alohomora III.';}
    applyFilters();
  }
  async function enterProfile(profile) {
    desiredProfile=profile;entered=false;$('profileMenu').open=false;if($('syncIndicator'))$('syncIndicator').open=false;
    const action=sync.select(profile);current=sync.getState();
    if(current.profile===profile&&current.status!=='storage-error'){
      entered=true;canReturn=false;cancelledView=null;viewStates.clear();navigationSession=Date.now()+':'+(++entryCount);
      rememberedProfile=profile;applyView();window.history.replaceState(historyState('#/',null),'','#/');renderRoute(true);
    }else render(current);
    await action;
  }
  $('homeCards').replaceChildren(...SECTIONS.map(s=>card(s.title,s.summary,'#/'+s.id,'section-card','',s.id)));
  document.querySelectorAll('.profile-choice[data-profile]').forEach(n=>{n.disabled=false;n.addEventListener('click',()=>enterProfile(n.dataset.profile));});
  $('continueBtn').addEventListener('click',()=>rememberedProfile&&enterProfile(rememberedProfile));
  $('chooseInsteadBtn').addEventListener('click',()=>{choosing=true;render(current);$('gateTitle').focus();});
  $('changeProfileBtn').addEventListener('click',()=>{cancelledView={hash:renderedHash,view:rememberView()};entered=false;choosing=true;canReturn=true;$('profileMenu').open=false;render(current);$('gateTitle').focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});});
  $('cancelProfileChange').addEventListener('click',()=>{if(!current.profile)return;entered=true;desiredProfile=current.profile;canReturn=false;
    const saved=cancelledView;cancelledView=null;if(saved){applyView(saved.view);window.history.replaceState(historyState(saved.hash,saved.view),'',saved.hash);renderRoute(true,saved.view);}else render(current);
  });
  document.addEventListener('keydown',e=>{
    if(e.key!=='Escape')return;
    if($('profileMenu').open){$('profileMenu').open=false;$('profileName').focus({preventScroll:true});}
    if($('syncIndicator')?.open){$('syncIndicator').open=false;$('syncToggle').focus({preventScroll:true});}
  });
  document.addEventListener('click',e=>{if(!$('profileMenu').contains(e.target))$('profileMenu').open=false;if($('syncIndicator')&&!$('syncIndicator').contains(e.target))$('syncIndicator').open=false;});
  $('profileMenu').addEventListener('toggle',()=>{if($('profileMenu').open&&$('syncIndicator'))$('syncIndicator').open=false;});
  if($('syncIndicator'))$('syncIndicator').addEventListener('toggle',()=>{if($('syncIndicator').open)$('profileMenu').open=false;});
  searchInput.addEventListener('input',renderSearch);$('clearSearch').addEventListener('click',()=>{clearSearch();searchInput.focus({preventScroll:true});});
  $('searchAll').addEventListener('click',()=>{allScope=!allScope;renderSearch();});$('retrySyncBtn').addEventListener('click',()=>sync.retry());
  if($('syncAlertRetry'))$('syncAlertRetry').addEventListener('click',()=>sync.retry());
  $('migrationButton').addEventListener('click',passToNewSite);
  document.querySelectorAll('.nav-link').forEach(n=>n.addEventListener('click',event=>navigationClick(event,'#/'+n.dataset.section)));
  document.querySelectorAll('.brand').forEach(n=>n.addEventListener('click',event=>navigationClick(event,'#/')));
  window.addEventListener('popstate',historyChanged);window.addEventListener('hashchange',historyChanged);
  window.addEventListener('focus',()=>{if(entered)return sync.refresh();});window.addEventListener('online',()=>{if(entered)return sync.retry();});
  document.addEventListener('visibilitychange',()=>{if(entered&&document.visibilityState==='visible')return sync.refresh();});
  window.addEventListener('storage',e=>{if(entered&&sync.isRelevantStorageKey(e.key))return sync.refresh();});
  renderRoute();
})();
