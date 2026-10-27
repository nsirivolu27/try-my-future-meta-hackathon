/** @typedef {import('./data.js').Campus} Campus */
/** @typedef {import('./data.js').Stop} Stop */
/** @typedef {import('./core.js').Profile} Profile */
/** @typedef {import('./tour-data.js').TourPoint} TourPoint */
/** @typedef {{latitude:number,longitude:number,accuracy:number,timestamp:number}} Position */

/** Deliberately broad subject matches, not claims that a program lives in a building.
 * @param {string} text */
export function interestTags(text){
 const value=text.toLowerCase();
 return [
  ['engineering',/\b(engineer\w*|computer\w*|coding|software|robot\w*|technology|data science|ai|cs)\b/],
  ['science',/\b(science\w*|research|biology|chemistry|physics|math\w*|medicine|nursing|health|psychology|environment\w*)\b/],
  ['arts',/\b(art|arts|artistic|artist\w*|music|design|film|theat\w*|writing|english|history|philosophy|humanities|architecture|creative)\b/],
  ['community',/\b(club\w*|friend\w*|social|community|sport\w*|student life|belong\w*|business|economics|volunteer\w*)\b/],
  ['study',/\b(study|studying|quiet|library|libraries|reading)\b/]
 ].filter(([,pattern])=>/** @type {RegExp} */(pattern).test(value)).map(([tag])=>String(tag));
}

/** @param {Profile} profile */
export function profileTags(profile){return [...new Set([...interestTags(profile.major??''),...interestTags(profile.interests??''),profile.interest])];}
/** @param {{latitude:number,longitude:number}} a @param {{latitude:number,longitude:number}} b */
export function metersBetween(a,b){
 const rad=Math.PI/180,lat=(b.latitude-a.latitude)*rad,lon=(b.longitude-a.longitude)*rad;
 const h=Math.sin(lat/2)**2+Math.cos(a.latitude*rad)*Math.cos(b.latitude*rad)*Math.sin(lon/2)**2;
 return 6371000*2*Math.asin(Math.sqrt(Math.min(1,Math.max(0,h))));
}
/** @param {Position|null} point @param {TourPoint[]} places @param {number} now */
export function locationStatus(point,places,now){
 if(!places.length)return 'unmapped';
 if(!point)return 'no-location';
 if(!Number.isFinite(point.latitude)||Math.abs(point.latitude)>90||!Number.isFinite(point.longitude)||Math.abs(point.longitude)>180||!Number.isFinite(point.accuracy)||point.accuracy<0||point.accuracy>100)return 'inaccurate';
 if(!Number.isFinite(point.timestamp)||now-point.timestamp>120000||point.timestamp>now+10000)return 'stale';
 if(Math.min(...places.map(p=>metersBetween(point,p)))>3000)return 'away';
 return 'ready';
}
/** @param {Stop} stop @param {Profile} profile */
function relevance(stop,profile){
 const major=interestTags(profile.major??''),interests=interestTags(profile.interests??'');
 return 2+stop.tags.filter(t=>major.includes(t)).length*4+stop.tags.filter(t=>interests.includes(t)).length*3+(stop.tags.includes(profile.interest)?2:0)+(profile.lifestyle==='commuter'&&stop.tags.includes('commuter')?2:0);
}
/** @param {Stop} stop @param {Profile} profile */
export function stopReason(stop,profile){
 const labels=/** @type {Record<string,string>} */({engineering:'engineering and technology',science:'science and research',arts:'arts and humanities',community:'student life and community',study:'study spaces'});
 const matches=stop.tags.filter(t=>profileTags(profile).includes(t)).map(t=>labels[t]).filter(Boolean);
 if(stop.category==='Ask an adviser'&&profile.major?.trim())return `A place to ask an admission adviser about studying ${profile.major.trim()}.`;
 return matches.length?`Explore ${matches.join(', ')}.`:'Adds another view of everyday campus life.';
}

/** Exhaustive selection/order for this small sourced candidate set. Objective: interest
 * match earlier in the visit, variety, and less travel. Distances are straight-line;
 * time uses an explicit planning allowance, never a pedestrian-route guarantee.
 * @param {Campus} campus @param {Profile} profile @param {Record<string,TourPoint>} points
 * @param {Position|null} position @param {number} [now] */
export function recommendTour(campus,profile,points,position,now=Date.now()){
 const mapped=campus.stops.filter(s=>points[s.id]);
 const status=locationStatus(position,mapped.map(s=>points[s.id]),now);
 const origin=status==='ready'?position:null;
 const budget=[20,40,60].includes(profile.minutes)?profile.minutes:40;
 const limit=budget<=20?2:budget<=40?3:4;
 const ranked=[...campus.stops].sort((a,b)=>relevance(b,profile)-relevance(a,profile));
 if(!mapped.length)return {status,stops:ranked.slice(0,limit),minutes:null,meters:null,startMeters:null};
 // Bounded at eight candidates so adding future map data cannot create unbounded work.
 const candidates=[...mapped].sort((a,b)=>relevance(b,profile)-relevance(a,profile)).slice(0,8);
 /** @type {{stops:Stop[],score:number,minutes:number,meters:number}} */
 let best={stops:[],score:-Infinity,minutes:0,meters:0};
 /** @param {Stop[]} route @param {number} distance @param {number} utility */
 function explore(route,distance,utility){
  const minutes=route.length*8+distance*1.4/70;
  if(minutes>budget)return;
  const score=utility-distance/250;
  if(route.length&&(score>best.score+0.0001||(Math.abs(score-best.score)<0.0001&&distance<best.meters)))best={stops:[...route],score,minutes,meters:distance};
  if(route.length>=limit)return;
  for(const stop of candidates){
   if(route.includes(stop))continue;
   const previous=route.length?points[route[route.length-1].id]:origin;
   const leg=previous?metersBetween(previous,points[stop.id]):0;
   const variety=route.some(s=>s.category===stop.category)?0:1;
   explore([...route,stop],distance+leg,utility+(relevance(stop,profile)+variety)/(1+route.length*0.2));
  }
 }
 explore([],0,0);
 if(!best.stops.length)return {status:'too-far',stops:[],minutes:null,meters:null,startMeters:null};
 return {status,stops:best.stops,minutes:Math.ceil(best.minutes),meters:Math.round(best.meters),startMeters:origin?Math.round(metersBetween(origin,points[best.stops[0].id])):null};
}
/** No user's origin is embedded in the outgoing URL. Maps obtains it separately.
 * @param {TourPoint} point */
export function walkingMapUrl(point){return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${point.latitude},${point.longitude}`)}&travelmode=walking`;}
