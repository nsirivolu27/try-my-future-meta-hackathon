/** @typedef {import('./data.js').Campus} Campus */
/** @typedef {import('./data.js').Stop} Stop */
/** @typedef {import('./core.js').Profile} Profile */
const challenges={
 adviser:{id:'adviser',title:'Map a real first semester',duration:'5 minutes',task:'At a visitor information session, ask for an example first-year timetable in a subject you like. Find out how much room there is to explore another interest.',question:'If I change my mind about my major, what would my options look like?',evidence:'What sounds flexible, and what would you want explained before applying?'},
 arrival:{id:'arrival',title:'Rehearse your arrival',duration:'5 minutes',task:'From your visitor arrival point, check the signs for where you need to go next. Note what would make a rushed morning easier or harder.',question:'If you commute, where do you spend a two-hour gap between classes?',evidence:'What would your journey here actually feel like?'},
 study:{id:'study',title:'Find your between-class spot',duration:'2 minutes',task:'In a study area open to visitors, pause for two minutes. Notice the noise, seating and places to plug in. Could you get work done here?',question:'When is it hardest to find a seat, and where do you go instead?',evidence:'Name one thing that helped or distracted you.'},
 project:{id:'project',title:'Find a project you would join',duration:'5 minutes',task:'Look for a public project display or noticeboard. Pick something you would want to help make, then ask how new students get involved.',question:'What can a first-year actually work on here, and how did you get started?',evidence:'What caught your attention, and what would you need to join?'},
 creative:{id:'creative',title:'Find something you would make',duration:'5 minutes',task:'Look for student work or an event notice in a public area. Pick something that makes you curious, and find out who can take part.',question:'Can students outside this major use the studios or join projects?',evidence:'What would you want to try, even if you were new at it?'},
 community:{id:'community',title:'Find a reason to stay after class',duration:'3 minutes',task:'Look at a public event board. Choose one event you would attend on your own. Note when it happens and whether it fits your day.',question:'Where did you meet your people outside your classes?',evidence:'Would you show up? What would help you take that first step?'},
 everyday:{id:'everyday',title:'Picture an ordinary Tuesday',duration:'3 minutes',task:'Pause in a public visitor area and notice the everyday rhythm around you. Pick one part of this routine you would enjoy, and one you would want to understand better.',question:'What surprised you most after your first month here?',evidence:'What felt different from the campus brochure?'}
};

/** These are visitor activities, not factual claims about facilities or access.
 * @param {Stop} stop @param {Profile} profile */
export function visitChallenge(stop,profile){
 if(stop.category==='Ask an adviser')return challenges.adviser;
 if(profile.lifestyle==='commuter' && (stop.tags.includes('commuter')||stop.category==='Arrival'))return challenges.arrival;
 if(stop.tags.includes('study'))return challenges.study;
 if(stop.tags.includes('engineering'))return challenges.project;
 if(profile.interest==='arts'&&stop.tags.includes('arts'))return challenges.creative;
 if(stop.tags.includes('community'))return challenges.community;
 return challenges.everyday;
}
/** @param {string} campusId @param {string} stopId @param {string} challengeId */
export const checkKey=(campusId,stopId,challengeId)=>`${campusId}/${stopId}/${challengeId}`;

/** Retain only valid campus/stop/activity completions from local storage.
 * @param {unknown} value @param {Campus[]} campuses @returns {string[]} */
export function validateChecks(value,campuses){
 if(!Array.isArray(value))return [];
 const campusMap=new Map(campuses.map(c=>[c.id,c]));
 const validIds=new Set(Object.keys(challenges));
 return [...new Set(value.filter(key=>{
  if(typeof key!=='string')return false;
  const parts=key.split('/');
  return parts.length===3 && validIds.has(parts[2]) && !!campusMap.get(parts[0])?.stops.some(s=>s.id===parts[1]);
 }))].slice(-2000);
}
