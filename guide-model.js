// Pure catalogue rules. Reading a guide never mutates the save store.
export const STATUS_LABELS = {todo:'Da iniziare',doing:'In corso',done:'Completata'};
export function guideRoute(guide) {
  return guide.id === 'demiguise' ? '#/sblocchi/demiguise' : `#/${guide.section}/${guide.category}/${guide.id}`;
}
export function parseRoute(hash, guides) {
  const legacy={'#bonusTitle':'b1','#hogsmeadeSection':'h1','#upperSection':'u1'};
  if (legacy[hash]) return {kind:'demiguise',section:'sblocchi',category:'demiguise',target:legacy[hash]};
  const [section,category,id] = String(hash||'#/').replace(/^#\/?/,'').split('/');
  if (!['missioni','sblocchi','pratiche'].includes(section)) return {kind:'home',scope:''};
  const scope=[section,category].filter(Boolean).join('/');
  if (section==='sblocchi' && category==='demiguise') return {kind:'demiguise',section,category,scope,target:id||null};
  const guide=guides.find(g=>g.id===id&&g.section===section&&g.category===category);
  return {kind:guide?'guide':category?'category':'section',section,category,scope,guide};
}
export function forHouse(guides,profile,all=false) {
  const house=profile==='ele'?'gryffindor':'slytherin';
  return guides.filter(g=>all||!g.house||g.house===house);
}
export function orderedCatalogue(guides,section,category,profile,allHouses=false) {
  const ordered=forHouse(guides,profile,allHouses).filter(g=>g.section===section&&g.category===category)
    .sort((a,b)=>(a.order||0)-(b.order||0));
  if(category==='principali')return ordered;
  const groups=new Map();for(const guide of ordered){const key=guide.group||guide.location||'Guide';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(guide);}
  return [...groups.values()].flat();
}
export function guideNeighbours(guides,guide,profile) {
  const catalogue=orderedCatalogue(guides,guide.section,guide.category,profile);
  const index=catalogue.findIndex(g=>g.id===guide.id);
  return {previous:index>0?catalogue[index-1]:null,next:index>=0?catalogue[index+1]||null:null};
}
export function guideStatus(id,state) {
  const key='status:'+id, values=state.values||new Map();
  if (values.has(key)) return Object.hasOwn(STATUS_LABELS,values.get(key))?values.get(key):'todo';
  return id==='demiguise' && state.completed.has('activity:demiguise:in-progress')?'doing':'todo';
}
export function makeGuideEntries(guides) {
  // Deliberate allowlist: hidden titles, paragraphs and images must not leak in results.
  return guides.map(g=>({id:g.id,title:g.title,summary:g.summary||'',aliases:[...(g.aliases||[]),g.location,g.group].filter(Boolean),
    scope:g.section+'/'+g.category,route:guideRoute(g),kind:g.section==='missioni'?'Missione':'Guida',house:g.house}));
}
const normalize = s => String(s).normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function knownTitleResults(guides,query) {
  const key=normalize(query);
  if(key.length<6)return [];
  return makeGuideEntries(guides.filter(g=>g.officialTitle&&normalize(g.officialTitle)===key));
}
export function filterMoons(moons,{level=2,completed=new Set(),todo=false,matched=null}={}) {
  return moons.filter(m=>m.lock<=level&&(!todo||!completed.has(m.id))&&(!matched||matched.has(m.id)));
}
export function countMoons(moons,completed) { return moons.filter(m=>completed.has(m.id)).length; }
