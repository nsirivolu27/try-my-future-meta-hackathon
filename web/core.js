/** @typedef {import('./data.js').Campus} Campus */
/** @typedef {import('./data.js').Stop} Stop */
/** @typedef {{interest:string,lifestyle:string,minutes:number}} Profile */
/** @typedef {{id:string,campusId:string,stopId:string,text:string,kind:string,createdAt:string}} Memory */

/** Suggested discovery order; deliberately not a walking-route optimizer.
 * @param {Campus} campus @param {Profile} profile */
export function planVisit(campus, profile) {
  const count = profile.minutes <= 20 ? 2 : profile.minutes <= 40 ? 3 : 4;
  const ranked = campus.stops.map((stop,index) => ({stop,index,score:
    (stop.tags.includes(profile.interest) ? 3 : 0) +
    (profile.lifestyle === 'commuter' && stop.tags.includes('commuter') ? 2 : 0)
  })).sort((a,b) => b.score - a.score || a.index - b.index);
  return ranked.slice(0,count).map(item => item.stop);
}

/** @param {string} text */
export function parseCommand(text) {
  const value = text.trim();
  if (/^(next|next stop)[.!]?$/i.test(value)) return {type:'next',text:''};
  if (/^(read|read this|tell me about this|narrate)[.!]?$/i.test(value)) return {type:'read',text:''};
  if (/^(stop|stop speaking)[.!]?$/i.test(value)) return {type:'stop',text:''};
  const memory = value.match(/^(remember(?: that| this)?|save(?: that| this)?)[,: ]+(.+)/i);
  if (memory) return {type:'memory',text:memory[2].trim()};
  return {type:'question',text:value};
}

/** Curated retrieval only. Never invent a fact or infer an image identity.
 * @param {Campus} campus @param {Stop} stop @param {string} question */
export function answerQuestion(campus,stop,question) {
  const q=question.toLowerCase().trim();
  const fallback={text:'I don’t have a verified answer to that in this pilot. Save it as a question for your campus visit, or check the official admissions page.',source:campus.visit,label:'Official visit information',known:false};
  if (!q) return {...fallback,text:'Ask about this stop, study spaces, student life, engineering, or visiting.'};
  if (/tuition|cost|scholarship|safe|crime|admission chance|acceptance|ranking|best college|open now|hours|wheelchair|step.free|accessible route|deadline|housing|dorm|parking|bus|commut|food|dining|meal|class schedule/.test(q)) return fallback;
  if (/what (is|am)|this (place|building|stop)|tell me|about here/.test(q)) return {text:`For your selected stop, ${stop.name}: ${stop.fact} This is the stop you selected, not an automatic identification of your view.`,source:stop.source,label:stop.sourceName,known:true};
  const tag=/engineering|computer science|research/.test(q)?'engineering':/library|study|studying/.test(q)?'study':/club|student life|community|friends/.test(q)?'community':null;
  const match=tag?campus.stops.find(s=>s.tags.includes(tag)):campus.stops.find(s=>q.includes(s.name.toLowerCase()));
  if(match) return {text:match.fact,source:match.source,label:match.sourceName,known:true};
  if(/visit|tour/.test(q)) return {text:'Use the official admissions visit page to check tour options and current arrangements. Our discovery stops are suggestions; walking times, entry and step-free access have not been field-verified.',source:campus.visit,label:'Official visit information',known:true};
  return fallback;
}

/** @param {unknown} value @param {Campus[]} campuses @returns {Memory[]} */
export function validateMemories(value,campuses) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.filter(m=> {
    if(!m || typeof m.id!=='string' || seen.has(m.id) || typeof m.text!=='string' || !m.text.trim() || m.text.length>1000 || typeof m.createdAt!=='string' || !Number.isFinite(Date.parse(m.createdAt)) || !['thought','question','good','concern'].includes(m.kind)) return false;
    if(!campuses.some(c=>c.id===m.campusId && c.stops.some(s=>s.id===m.stopId))) return false;
    seen.add(m.id); return true;
  }).slice(-200);
}

/** @param {Memory[]} memories @param {Campus[]} campuses */
export function compareVisits(memories,campuses) {
  return campuses.map(campus=>({campus,
    thoughts:memories.filter(m=>m.campusId===campus.id && m.kind==='thought'),
    questions:memories.filter(m=>m.campusId===campus.id && m.kind==='question'),
    goodSigns:memories.filter(m=>m.campusId===campus.id && m.kind==='good'),
    concerns:memories.filter(m=>m.campusId===campus.id && m.kind==='concern')
  }));
}
