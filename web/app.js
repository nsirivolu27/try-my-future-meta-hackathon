import {visitChallenge,checkKey,validateChecks} from './fieldwork.js';
import {planVisit,answerQuestion,parseCommand,validateMemories,compareVisits} from './core.js';
import {campuses as curatedCampuses,reviewedAt} from './data.js';
import {directory,directoryMeta} from './directory-data.js';
import {searchCampuses,selfGuidedCampus} from './directory.js';
import {deviceCapabilities} from './devices.js';
import {askGuide,receiveGuide} from './guide.js';
import {tourPoints} from './tour-data.js';
import {recommendTour,stopReason,walkingMapUrl,interestTags} from './tour.js';
const campuses=directory.map(entry=>curatedCampuses.find(c=>c.id===entry.id)??selfGuidedCampus(entry));
const curatedIds=new Set(curatedCampuses.map(c=>c.id));
let searchQuery='';
let searchState='';
let deviceMode='audio';

/** @typedef {import('./core.js').Memory} Memory */
/** @typedef {import('./core.js').Profile} Profile */
/** @param {string} selector @returns {HTMLElement} */
function el(selector){ const node=document.querySelector(selector); if(!(node instanceof HTMLElement)) throw new Error(`Missing element ${selector}`); return node; }
/** @param {unknown} text */
const esc=text=>String(text).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]??char));
/** @param {string} key @returns {unknown} */
function read(key){try{return JSON.parse(localStorage.getItem(key)??'null');}catch{return null;}}
/** @param {string} key @param {unknown} value */
function store(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{toast('Storage unavailable. Changes last only until you close this screen.');return false;}}
/** @param {string} text */
function toast(text){el('#toast').textContent=text;el('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el('#toast').classList.remove('show'),4500);}
/** @type {ReturnType<typeof setTimeout>|undefined} */
let toastTimer;
/** @type {Profile} */
let profile={interest:'engineering',lifestyle:'exploring',minutes:40};
let campusId='';
let stopIndex=0;
let started=false;
/** @type {string[]} */
let activeStopIds=[];
/** @type {import('./tour.js').Position|null} */
let visitorPosition=null;
/** @type {ReturnType<typeof recommendTour>|null} */
let draftTour=null;
let originLabel='';
let locationNotice='Use your location once, or choose a nearby landmark. Your coordinates stay on this device and are not saved.';
let locating=false;
let positionRequest=0;
let deviceReady=false;
let deviceStatus='Pair audio glasses in Android Bluetooth settings, then select them as your media output. No camera connection is needed.';
let photo='';
/** @type {{campusId:string,stopId:string}|null} */
let captureContext=null;
let voiceContext='question';
/** @type {{campusId:string,stopId:string}|null} */
let voiceStop=null;
let memories=validateMemories(read('tmf.memories.v1'),campuses);
let completedChecks=validateChecks(read('tmf.checks.v1'),campuses);
let voiceMemoryKind='thought';
/** @type {Map<string,{memory:string,question:string,kind:string}>} */
const drafts=new Map();
let renderedStopKey='';
/** @type {AbortController|null} */
let answerRequest=null;
let guideStatus='Checking Muse connection…';
let voiceRequestId='';
/** @type {Map<string,{question:string,answer:string}[]>} */
const conversations=new Map();
/** @type {Map<string,string>} */
const answerViews=new Map();
const saved=read('tmf.visit.v1');
if(saved && typeof saved==='object' && 'campusId' in saved && typeof saved.campusId==='string' && campuses.some(c=>c.id===saved.campusId)) {
  campusId=saved.campusId;
  if('profile' in saved && saved.profile && typeof saved.profile==='object'){
    const p=saved.profile;
    if('interest' in p && typeof p.interest==='string' && ['engineering','science','arts','community','study'].includes(p.interest)) profile.interest=p.interest;
    if('lifestyle' in p && typeof p.lifestyle==='string' && ['exploring','commuter','resident'].includes(p.lifestyle)) profile.lifestyle=p.lifestyle;
    if('minutes' in p && typeof p.minutes==='number' && [20,40,60].includes(p.minutes)) profile.minutes=p.minutes;
    if('major' in p && typeof p.major==='string')profile.major=p.major.slice(0,120);
    if('interests' in p && typeof p.interests==='string')profile.interests=p.interests.slice(0,240);
  }
  if('activeStopIds' in saved && Array.isArray(saved.activeStopIds))activeStopIds=[...new Set(saved.activeStopIds.filter((id)=>typeof id==='string'&&currentCampus().stops.some(s=>s.id===id)))].slice(0,4);
  if('started' in saved) started=saved.started===true;
  if('stopIndex' in saved && typeof saved.stopIndex==='number' && Number.isInteger(saved.stopIndex)) stopIndex=Math.max(0,Math.min(saved.stopIndex,currentStops().length-1));
}
function currentCampus(){const campus=campuses.find(c=>c.id===campusId);if(!campus)throw new Error('Choose a college first.');return campus;}
function currentStops(){const stops=activeStopIds.map(id=>currentCampus().stops.find(s=>s.id===id)).filter(s=>s!==undefined);return stops.length?stops:planVisit(currentCampus(),profile);}
function currentStop(){return currentStops()[stopIndex]??currentStops()[0];}
function persistVisit(){store('tmf.visit.v1',{campusId,profile,stopIndex,started,activeStopIds});}
/** @param {string} url @param {string} label */
const sourceLink=(url,label)=>`<a class="source" href="${esc(url)}" target="_blank" rel="noopener noreferrer">↗ ${esc(label)}</a>`;
/** @param {string} value @param {string} selected @param {string} label */
const option=(value,selected,label)=>`<option value="${value}" ${value===selected?'selected':''}>${label}</option>`;

function explore(){
 const selected=campuses.find(c=>c.id===campusId);
 return `<section class="welcome"><div class="companion-avatar"><img src="falling-block.svg" alt=""></div><h1>Every campus.<br>Your kind of future.</h1><p>A guide for the college you want to explore.</p></section>
 <button class="directory-launch" data-action="directory"><span class="search-symbol" aria-hidden="true">⌕</span><span>Find any college or city</span><span class="search-arrow" aria-hidden="true">↑</span></button><p class="directory-caption">${directoryMeta.count.toLocaleString()} colleges, universities and technical schools across the U.S.</p>
 <section class="explore-intro"><p class="eyebrow">Make the visit yours</p><h2>What would a day here feel like?</h2><p>Find somewhere you could study. Ask how to get involved. Keep the little things that help you picture yourself here.</p><p class="fine">For first visits, transfers and fresh starts. On your phone or through your glasses.</p></section>
 ${selected?`<a class="resume-visit" href="${started?'#visit':'#plan'}"><span><small>${started?'Continue your visit':'Your selected college'}</small><strong>${esc(selected.name)}</strong></span><span aria-hidden="true">→</span></a>`:''}
 <button class="app-device-shortcut" data-action="device"><span class="glasses-symbol" aria-hidden="true">◯—◯</span><span><strong>Take your guide with you</strong><small>Listen through your phone or audio glasses</small></span><span aria-hidden="true">›</span></button>`;
}

function plan(){
 if(!campusId)return `<section class="empty"><h1>Which college are you visiting?</h1><p>Search for any college to make a plan.</p><a class="primary" href="#directory">Find a college</a></section>`;
 const selected=currentCampus(),curated=curatedIds.has(campusId);
 return `<section class="future-heading"><p class="eyebrow">Try My Future @</p><h1>${esc(selected.name)}</h1><p>A campus day shaped around you.</p></section>
 <button class="directory-launch" data-action="directory"><span class="search-symbol" aria-hidden="true">⌕</span><span>Find a college or city</span><span class="search-arrow" aria-hidden="true">↑</span></button><p class="directory-caption">${directoryMeta.count.toLocaleString()} schools to explore across the U.S.</p>

 <form id="plan-form" class="app-plan personal-plan"><label>What might you study?<input name="major" maxlength="120" value="${esc(profile.major??'')}" placeholder="Your major, or still exploring" autocomplete="off"></label><label>What else feels like you?<textarea name="interests" maxlength="240" rows="2" placeholder="Robotics, live music, quiet study spots…">${esc(profile.interests??'')}</textarea></label><div class="form-grid"><label class="interest-field">Make time for<select name="interest">${option('engineering',profile.interest,'Engineering & technology')}${option('science',profile.interest,'Science & research')}${option('arts',profile.interest,'Arts & humanities')}${option('community',profile.interest,'Student life & community')}${option('study',profile.interest,'Places to study')}</select></label><label>Your routine<select name="lifestyle">${option('exploring',profile.lifestyle,'Still exploring')}${option('commuter',profile.lifestyle,'Commuting')}${option('resident',profile.lifestyle,'Living on campus')}</select></label><label>Time available<select name="minutes">${option('20',String(profile.minutes),'20 minutes')}${option('40',String(profile.minutes),'40 minutes')}${option('60',String(profile.minutes),'60 minutes')}</select></label></div>
 <section class="tour-location"><h2>Where are you starting?</h2>${Object.keys(tourPoints[campusId]??{}).length?`<button class="secondary" type="button" data-action="locate" ${locating?'disabled':''}>${locating?'Finding your location…':'Use my current location'}</button><label>Or, I’m near<select id="tour-origin"><option value="">Choose a campus landmark</option>${Object.entries(tourPoints[campusId]).map(([id,p])=>option(id,originLabel===p.label?id:'',esc(p.label))).join('')}</select></label>${visitorPosition?'<button type="button" class="text-button" data-action="clear-location">Forget my location</button>':''}`:'<p>We don’t have mapped tour stops for this college yet. You can still personalize visit activities and check the school’s official visit information.</p>'}<p id="location-notice" class="fine" role="status">${esc(Object.keys(tourPoints[campusId]??{}).length?locationNotice:'Location access is not requested for this college.')}</p></section>
 <button class="primary start-visit" type="submit"><span>${curated?'Find my starting point':'Plan my visit activities'}</span><span aria-hidden="true">→</span></button><p class="fine">Your preferences are saved on this device. They are shared with Meta only when you ask the campus guide a question.</p></form><div id="tour-preview" aria-live="polite">${tourPreview()}</div>
 <button class="app-device-shortcut" data-action="device"><span class="glasses-symbol" aria-hidden="true">◯—◯</span><span><strong>Take your guide with you</strong><small>Listen through your phone or audio glasses</small></span><span aria-hidden="true">›</span></button>`;
}

function captureProfile(){
 const form=document.querySelector('#plan-form');if(!(form instanceof HTMLFormElement))return;
 const data=new FormData(form);
 profile={major:String(data.get('major')??'').trim().slice(0,120),interests:String(data.get('interests')??'').trim().slice(0,240),interest:String(data.get('interest')),lifestyle:String(data.get('lifestyle')),minutes:Number(data.get('minutes'))};
}
function computeTour(){draftTour=recommendTour(currentCampus(),profile,tourPoints[campusId]??{},visitorPosition);}
function tourPreview(){
 if(!draftTour)return '';
 const tour=draftTour,first=tour.stops[0],point=first?tourPoints[campusId]?.[first.id]:null;
 const notices=/** @type {Record<string,string>} */({'no-location':'This order uses your interests. Add your location to choose a start near you.',inaccurate:'The location is too approximate to choose a nearby start. Try again outdoors or choose a landmark.',stale:'That location is out of date. Refresh it or choose a landmark.',away:'You appear to be away from our mapped stops. This is a preview for when you arrive; it does not confirm campus boundaries.',unmapped:'These are visit activities, not a mapped walking tour.','too-far':'No mapped stop fits the current time estimate from that location. Allow more time or choose a nearby landmark.'});
 if(!first)return `<section class="tour-result"><h2>Let’s adjust the plan</h2><p>${esc(notices[tour.status]??'Choose a starting point to continue.')}</p></section>`;
 const unmatched=(profile.major&&!interestTags(profile.major).length)||(profile.interests&&!interestTags(profile.interests).length);
 return `<section class="tour-result"><p class="eyebrow">${point?'Your suggested starting point':'Your visit plan'}</p><h2>${esc(first.name)}</h2><p>${esc(stopReason(first,profile))}</p>${tour.startMeters!==null?`<p class="tour-distance">${tour.startMeters<50?'Near your starting location':`About ${Math.round(tour.startMeters/10)*10} m from your starting location`} · straight-line distance</p>`:''}${notices[tour.status]?`<p class="fine">${esc(notices[tour.status])}</p>`:''}${unmatched?'<p class="fine">Some of your wording has no match in our current stop tags. This plan also uses your “Make time for” choice; it is not a program-specific tour.</p>':''}
 <ol class="tour-order">${tour.stops.map(s=>`<li><strong>${esc(s.name)}</strong><p>${esc(stopReason(s,profile))}</p></li>`).join('')}</ol>${tour.minutes!==null?`<p class="fine">About ${tour.minutes} minutes as a planning estimate${tour.status==='ready'?'':' from the first stop'}. Allows 8 minutes per stop and extra travel time based on straight-line distance. Actual paths, entrances, hours and step-free access need checking.</p>`:''}
 ${point?`${sourceLink(point.source,'Official map location')}<p class="fine">Map pin: ${esc(point.label)}. Building location, not a verified visitor entrance.</p><a class="secondary map-link" href="${esc(walkingMapUrl(point))}" target="_blank" rel="noopener noreferrer">Walking directions in Google Maps ↗</a><p class="fine">Google Maps handles your walking route and may request your location separately.</p>`:sourceLink(currentCampus().visit,'Official visit information')}
 <button class="primary start-visit" data-action="start-tour">${point?'Start this tour':'Start these activities'} →</button><details class="tour-method"><summary>How this plan was chosen</summary><p class="fine">${point?`Balances your interests and estimated travel across ${currentCampus().stops.length} mapped stops. Other campus places may suit you too. This is a suggested order, not a verified walking route.`:'These general visit activities match your interests. We have not verified physical stops for this college.'}</p></details></section>`;
}
function locateVisitor(){
 captureProfile();const request=++positionRequest,requestedCampus=campusId,hadPlan=!!draftTour;
 if(!navigator.geolocation){locationNotice='Location is unavailable here. Choose a nearby landmark.';render();return;}
 locating=true;visitorPosition=null;originLabel='';draftTour=null;locationNotice='Waiting for location permission and a fresh fix…';render();
 navigator.geolocation.getCurrentPosition(position=>{
  if(request!==positionRequest||requestedCampus!==campusId||location.hash!=='#plan')return;
  captureProfile();locating=false;visitorPosition={latitude:position.coords.latitude,longitude:position.coords.longitude,accuracy:position.coords.accuracy,timestamp:position.timestamp};
  locationNotice=`Location checked once (reported accuracy ±${Math.round(position.coords.accuracy)} m). Not saved or sent to Meta. Refresh if you move.`;
  if(hadPlan)computeTour();render();
 },error=>{
  if(request!==positionRequest||requestedCampus!==campusId||location.hash!=='#plan')return;
  captureProfile();locating=false;locationNotice=error.code===1?'Location permission was not granted. Choose a nearby landmark, or continue with your interests.':'Could not get a fresh location. Try again outdoors or choose a landmark.';
  if(hadPlan)computeTour();render();
 },{enableHighAccuracy:true,timeout:15000,maximumAge:0});
}


function directoryResults(){
 if(!searchQuery.trim()&&!searchState)return '<p class="directory-prompt">Start with a college name or city, or choose a state to explore.</p>';
 const result=searchCampuses(directory,searchQuery,searchState);
 return `<p class="fine" role="status">${result.total.toLocaleString()} matches${result.total>25?' · First 25 shown. Refine your search.':''}</p>${result.records.map(entry=>`<button class="directory-result" data-campus="${entry.id}"><span><strong>${esc(entry.name)}</strong><small>${esc(entry.city)}, ${entry.state} · ${entry.coverage==='curated'?'Sourced guide':'Self-guided visit'}</small></span><span>↗</span></button>`).join('')||'<p>No campuses matched. Try a shorter name or another state.</p>'}`;
}
function directoryPage(){
 return `<section class="app-heading"><div><p class="eyebrow">Find your next chapter</p><h1>Campus directory</h1></div></section><form id="directory-form" class="directory-search"><label for="campus-query">School name, city or abbreviation<input id="campus-query" value="${esc(searchQuery)}" placeholder="College name, city or abbreviation" type="search"></label><label for="campus-state">State / territory<select id="campus-state"><option value="">All states & territories</option>${[...new Set(directory.map(c=>c.state))].sort().map(state=>option(state,searchState,state)).join('')}</select></label></form><div id="directory-results">${directoryResults()}</div><p class="fine">NCES IPEDS 2025 · ${directoryMeta.count.toLocaleString()} institutions. Covers reporting schools, not every physical campus. Directory links and addresses are snapshots; verify visits with the school.</p>${sourceLink(directoryMeta.sourceUrl,'Directory source')}`;
}
el('#main').addEventListener('input',event=>{
 const target=event.target;
 if(target instanceof HTMLElement&&target.closest('#plan-form')){captureProfile();draftTour=null;const preview=document.querySelector('#tour-preview');if(preview)preview.innerHTML='';return;}
 if(target instanceof HTMLInputElement && target.id==='campus-query')searchQuery=target.value;
 else if(target instanceof HTMLSelectElement && target.id==='campus-state')searchState=target.value;
 else return;
 el('#directory-results').innerHTML=directoryResults();
});
el('#main').addEventListener('change',event=>{
 const target=event.target;if(!(target instanceof HTMLSelectElement)||target.id!=='tour-origin')return;
 captureProfile();positionRequest++;locating=false;draftTour=null;
 const point=tourPoints[campusId]?.[target.value];
 visitorPosition=point?{latitude:point.latitude,longitude:point.longitude,accuracy:0,timestamp:Date.now()}:null;
 originLabel=point?.label??'';
 locationNotice=point?`Using ${point.label} as your approximate starting location. No GPS access needed.`:'No starting location selected. You can still plan around your interests.';
 render();
});

function visit(){
 if(!started||!campusId)return `<section class="empty"><p class="eyebrow">YOUR NEXT CAMPUS DAY</p><h1>Try life here.</h1><p>Choose a school. Find something to try, someone to ask, and a few things to remember.</p><a href="#explore" class="primary">Choose a campus</a></section>`;
 const c=currentCampus(),stops=currentStops(),s=currentStop(),curated=curatedIds.has(campusId);
 const task=visitChallenge(s,profile),key=checkKey(campusId,s.id,task.id);
 const done=completedChecks.includes(key);
 const totalDone=stops.filter(stop=>completedChecks.includes(checkKey(campusId,stop.id,visitChallenge(stop,profile).id))).length;
 return `<section class="visit-heading active-visit-heading"><p class="eyebrow">Try My Future @</p><h1>${esc(c.short)}</h1>${profile.major?`<p>${esc(profile.major)} · Your campus day</p>`:''}<div class="visit-progress"><span>${totalDone} of ${stops.length} activities tried</span><a href="#plan">Edit plan</a></div><div class="progress-track" aria-label="${totalDone} of ${stops.length} activities tried">${stops.map(stop=>`<span class="${completedChecks.includes(checkKey(campusId,stop.id,visitChallenge(stop,profile).id))?'complete':''}"></span>`).join('')}</div></section>
 ${tourPoints[campusId]?.[s.id]?`<section class="tour-next"><p class="eyebrow">${stopIndex===0?'Start here':'Next place to explore'}</p><h2>${esc(s.name)}</h2><p>${esc(stopReason(s,profile))}</p><a class="secondary map-link" href="${esc(walkingMapUrl(tourPoints[campusId][s.id]))}" target="_blank" rel="noopener noreferrer">Walking directions in Google Maps ↗</a><p class="fine">Building pin: ${esc(tourPoints[campusId][s.id].label)}. Check visitor access and the walking route in Maps.</p></section>`:''}
 <details class="visit-stops"><summary>Your stops <span>${stopIndex+1} / ${stops.length}</span></summary>${stops.map((stop,i)=>`<button data-stop="${i}" class="stop-button ${i===stopIndex?'active':''}" aria-current="${i===stopIndex?'step':'false'}"><span>${String(i+1).padStart(2,'0')}</span><div><strong>${esc(stop.name)}</strong><small>${esc(visitChallenge(stop,profile).title)}</small></div></button>`).join('')}<p class="fine">${curated?'Suggested places, not walking directions. Check entry and visitor access.':'Reflection activities, not verified campus locations. Check visit arrangements first.'}</p>${sourceLink(c.visit,curated?'University visit information':'Institution information')}</details>
 <article class="field-stop"><div class="companion-byline"><img src="falling-block.svg" alt=""><span>Your campus companion<small>${curated?'At':'Activity:'} ${esc(s.name)}</small></span></div><section class="field-task ${done?'is-done':''}"><div class="task-meta"><span>Something to try</span><span>${task.duration}</span></div><h2>${esc(task.title)}</h2><p>${esc(task.task)}</p><button class="task-complete" data-action="complete-task" aria-pressed="${done}"><span>${done?'✓':'○'}</span>${done?'Tried it · tap to undo':'I tried this'}</button><button class="text-button" data-action="read-task">Listen to the activity</button></section>
 <section class="guide-chat"><form id="question-form"><label class="sr-only" for="question">Ask your campus guide</label><div class="question-input"><input id="question" name="question" maxlength="1000" placeholder="Ask about this campus…" required><button type="button" class="voice-button" data-action="dictate-question" aria-label="Ask by voice"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4m4-8v12m4-15v18m4-15v12m4-8v4"/></svg></button><button type="submit" aria-label="Send question">↑</button></div></form><p class="fine" data-guide-status></p><p class="fine">Questions, major, interests, selected campus and recent follow-ups go to Meta Model API. GPS coordinates are not sent. Your journal and photos stay on this device.</p><div id="voice-status" aria-live="polite"></div><div id="answer" aria-live="polite"></div></section>
 <section class="student-question"><p class="eyebrow">A good question to ask someone here</p><p class="real-question">“${esc(task.question)}”</p><button class="text-button" data-save-question="${esc(task.question)}">Save to ask later +</button></section>
 <details class="note-drawer"><summary>Keep a thought from this stop <span>+</span></summary><form id="memory-form" class="field-note-form"><h3>What did you find?</h3><p class="fine">${esc(task.evidence)}</p><fieldset class="note-types"><legend class="sr-only">Type of field note</legend><label><input type="radio" name="kind" value="thought" checked><span>Noticed</span></label><label><input type="radio" name="kind" value="good"><span>Good sign</span></label><label><input type="radio" name="kind" value="concern"><span>Concern</span></label><label><input type="radio" name="kind" value="question"><span>To ask</span></label></fieldset><label class="sr-only" for="memory">Your observation</label><textarea id="memory" name="memory" maxlength="1000" rows="3" placeholder="Be specific. What would matter on a normal day here?" required></textarea><div class="button-row"><button class="primary" type="submit">Keep this note</button><button class="secondary" type="button" data-action="dictate-memory">Say it out loud</button></div></form></details>
 <details class="campus-context"><summary>${curated?'About this place & campus facts':'Campus information & questions'}</summary><p class="fact">${esc(s.fact)}</p>${sourceLink(s.source,s.sourceName)}<p class="fine">${curated?`Reviewed ${reviewedAt}. You selected this stop; the camera is not identifying it.`:'General visitor activity. Campus-specific buildings and facts have not been verified.'}</p><div class="button-row"><button class="secondary" data-action="read">Listen to the context</button><button class="secondary" data-action="stop-audio">Stop audio</button>${deviceCapabilities(deviceMode).camera?'<button class="secondary" data-action="capture">Capture with glasses</button>':''}</div><div id="capture-preview">${photo?`<img class="capture-image" src="${photo}" alt="Your latest glasses capture"><p class="fine">Temporary preview. Not used to identify a place.</p><button class="text-button" data-action="clear-photo">Discard photo</button>`:''}</div><p class="fine">${curated?'Ask about study spaces, student life or this stop. Answers use the sourced guide.':'No sourced guide for this campus yet. You can save questions to ask an adviser.'}</p></details>
 <div class="stop-footer"><span>No need to tick every box.</span><button class="primary" data-action="next">${stopIndex===stops.length-1?'Review my visit':'Next activity'} →</button></div></article>`;
}

function journal(){return `<section class="visit-heading"><div><p class="eyebrow">Your visits, remembered</p><h1>Your notes</h1><p>Your thoughts and questions, remembered across every visit.</p></div><button class="secondary" data-action="export" ${memories.length?'':'disabled'}>Export journal ↗</button></section>${memories.length?`<div class="journal-grid">${[...memories].reverse().map(m=>{const c=campuses.find(c=>c.id===m.campusId);const s=c?.stops.find(s=>s.id===m.stopId);return `<article class="memory-card"><p class="eyebrow">${esc(c?.short)} / ${esc(s?.name)}</p><span class="memory-kind">${m.kind==='question'?'To ask':m.kind==='good'?'Good sign':m.kind==='concern'?'Concern':'Noticed'}</span><p class="memory-text">${esc(m.text)}</p><footer><time>${esc(new Date(m.createdAt).toLocaleDateString())}</time><button class="text-button" data-delete="${esc(m.id)}">Delete</button></footer></article>`;}).join('')}</div>`:`<section class="empty compact"><span class="empty-icon">✧</span><h2>Make room for a first impression.</h2><p>Save a thought at any stop. Your journal will grow with you.</p><a href="#visit" class="primary">Go to my visit →</a></section>`}<p class="fine">Stored on this device. Export before clearing app or browser data. Captured photos are not included.</p>`;}

function compare(){
 const comparisons=compareVisits(memories,campuses.filter(c=>memories.some(m=>m.campusId===c.id)||c.id===campusId));
 return `<section class="visit-heading"><p class="eyebrow">Your next chapter</p><h1>What feels like you?</h1><p>Keep the good signs, the concerns and the unanswered questions together. No fit score can decide this for you.</p></section><div class="comparison-grid">${comparisons.map(({campus:c,thoughts,questions,goodSigns,concerns})=>`<article class="compare-card"><div class="compare-content"><p class="eyebrow">${esc(c.city)}, ${esc(c.state)}</p><h2>${esc(c.short)}</h2><div class="evidence-grid"><section><h3>Good signs <span>${goodSigns.length}</span></h3>${goodSigns.length?goodSigns.map(m=>`<blockquote>${esc(m.text)}</blockquote>`).join(''):'<p class="muted">What made you want to stay?</p>'}</section><section><h3>Concerns <span>${concerns.length}</span></h3>${concerns.length?concerns.map(m=>`<blockquote>${esc(m.text)}</blockquote>`).join(''):'<p class="muted">What would you need to check?</p>'}</section></div>${thoughts.length?`<details class="observation-list"><summary>Other things you noticed · ${thoughts.length}</summary>${thoughts.map(m=>`<p>${esc(m.text)}</p>`).join('')}</details>`:''}<h3>Ask before you decide <span>${questions.length}</span></h3>${questions.length?questions.map(m=>`<p class="open-question">${esc(m.text)}</p>`).join(''):'<p class="muted">Save a question during your visit.</p>'}${sourceLink(c.visit,'Check visit arrangements')}<button class="secondary" data-start-campus="${c.id}">Take another look →</button></div></article>`).join('')}</div><p class="fine">These are your observations. They are not university claims or an admissions prediction.</p>`;
}

function render(){
 cancelQuestion();
 const previousMemory=document.querySelector('#memory');
 const previousQuestion=document.querySelector('#question');
 if(renderedStopKey && previousMemory instanceof HTMLTextAreaElement && previousQuestion instanceof HTMLInputElement) drafts.set(renderedStopKey,{memory:previousMemory.value,question:previousQuestion.value,kind:document.querySelector('input[name=kind]:checked')?.getAttribute('value')??'thought'});
 const page=location.hash.slice(1)||'explore';
 if(page!=='plan'){positionRequest++;locating=false;visitorPosition=null;originLabel='';draftTour=null;locationNotice='Use your location once, or choose a nearby landmark. Your coordinates stay on this device and are not saved.';}
 el('#main').innerHTML=page==='visit'?visit():page==='plan'?plan():page==='journal'?journal():page==='compare'?compare():page==='directory'?directoryPage():explore();
 renderedStopKey=page==='visit' && started?`${campusId}/${currentStop().id}`:'';
 const answer=document.querySelector('#answer');if(answer)answer.innerHTML=answerViews.get(renderedStopKey)??'';
 updateGuideStatus();
 const draft=drafts.get(renderedStopKey);
 if(draft){const memory=document.querySelector('#memory');const question=document.querySelector('#question');if(memory instanceof HTMLTextAreaElement)memory.value=draft.memory;if(question instanceof HTMLInputElement)question.value=draft.question;const kind=document.querySelector(`input[name=kind][value="${draft.kind}"]`);if(kind instanceof HTMLInputElement)kind.checked=true;}
 document.querySelectorAll('[data-nav]').forEach(node=>{node.classList.toggle('active',node.getAttribute('data-nav')===(['directory','plan'].includes(page)?'explore':page));if(node.getAttribute('data-nav')===(['directory','plan'].includes(page)?'explore':page))node.setAttribute('aria-current','page');else node.removeAttribute('aria-current');});
 el('#note-count').textContent=String(memories.length);
}
function stopAudio(){window.FutureNative?.stopSpeaking();window.speechSynthesis?.cancel();}
/** @param {string} text */
function speak(text){if(window.FutureNative){window.FutureNative.speak(text);return;}if(!window.speechSynthesis){toast('Audio is unavailable in this browser. You can read the text here.');return;}stopAudio();const utterance=new SpeechSynthesisUtterance(text);utterance.rate=0.95;utterance.onerror=()=>toast('Audio could not play. The text is still available.');window.speechSynthesis.speak(utterance);}
/** @param {string} text @param {string} kind @param {{campusId:string,stopId:string}} [context] */
function saveMemory(text,kind='thought',context){
 const trimmed=text.trim();if(!trimmed){toast('Add a thought first.');return;}
 if(trimmed.length>1000){toast('Keep this memory under 1,000 characters.');return;}
 const m={id:crypto.randomUUID(),campusId:context?.campusId??campusId,stopId:context?.stopId??currentStop().id,text:trimmed,kind,createdAt:new Date().toISOString()};
 memories=validateMemories([...memories,m],campuses);
 const saved=store('tmf.memories.v1',memories);el('#note-count').textContent=String(memories.length);if(saved)toast(kind==='question'?'Question saved for your visit.':'Saved to your field notes.');
}
function cancelQuestion(){answerRequest?.abort();answerRequest=null;}
function updateGuideStatus(){document.querySelectorAll('[data-guide-status]').forEach(node=>{node.textContent=guideStatus;});}
async function checkGuide(){
 if(window.FutureNative){window.FutureNative.guideStatus();return;}
 try{const response=await fetch('/api/status');const state=await response.json();guideStatus=state.configured?'Muse Spark · ready to ask':'Muse Spark · setup needed';}catch{guideStatus='Muse Spark · server unavailable';}
 updateGuideStatus();
}
/** @param {string} question @param {boolean} [spoken] */
async function ask(question,spoken=false){
 const cmd=parseCommand(question);
 if(cmd.type==='next'){next();return;}if(cmd.type==='read'){speak(currentStop().fact);return;}if(cmd.type==='stop'){stopAudio();return;}if(cmd.type==='memory'){saveMemory(cmd.text);return;}
 if(!question.trim())return;
 cancelQuestion();stopAudio();
 const controller=new AbortController();answerRequest=controller;
 const key=`${campusId}/${currentStop().id}`,askedCampus=campusId;
 const questionInput=document.querySelector('#question');if(questionInput instanceof HTMLInputElement)questionInput.value=question;
 const box=el('#answer');box.setAttribute('aria-busy','true');
 box.innerHTML='<p class="guide-thinking">Checking campus sources…</p><button class="text-button" data-action="cancel-answer">Cancel</button>';
 try{
  const answer=await askGuide({campusId,stopId:currentStop().id,question,interest:profile.interest,major:profile.major??'',interests:profile.interests??'',history:conversations.get(campusId)??[]},controller.signal);
  if(controller.signal.aborted||renderedStopKey!==key)return;
  guideStatus='Muse Spark · connected';updateGuideStatus();
  const html=`<div class="answer-card"><p class="answer-question">${esc(question)}</p><p>${esc(answer.text)}</p><div class="answer-sources">${answer.sources.map(s=>sourceLink(s.url,s.title)).join('')}</div><p class="fine">${answer.grounded?'Muse Spark · check the linked sources before making plans.':'Could not verify this answer.'}</p><div class="button-row"><button class="text-button" data-read-answer="${esc(answer.text)}">▷ Listen</button><button class="text-button" data-action="stop-audio">Stop audio</button><button class="text-button" data-save-question="${esc(question)}">Save my question +</button></div></div>`;
  answerViews.set(key,html);box.innerHTML=html;
  conversations.set(askedCampus,[...(conversations.get(askedCampus)??[]),{question,answer:answer.text}].slice(-4));
  if(spoken&&!document.hidden)speak(answer.text);
 }catch(error){
  if(controller.signal.aborted)return;
  const message=error instanceof Error?error.message:'The guide is unavailable. Please try again.';
  const fallback=answerQuestion(currentCampus(),currentStop(),question);
  box.innerHTML=`<div class="answer-card"><p>${esc(message)}</p><button class="text-button" data-action="retry-question">Try again</button>${fallback.known?`<p class="fine">Saved guide excerpt · not a live AI answer</p><p>${esc(fallback.text)}</p>${sourceLink(fallback.source,fallback.label)}`:''}</div>`;
  answerViews.set(key,box.innerHTML);if(spoken)toast(message);
 }finally{box.removeAttribute('aria-busy');if(answerRequest===controller)answerRequest=null;}
}
function next(){stopAudio();photo='';if(stopIndex>=currentStops().length-1){location.hash='journal';return;}stopIndex++;persistVisit();render();window.scrollTo(0,0);}
/** @param {string} mode */
function dictate(mode){if(!window.FutureNative){toast('Voice input is available in the Android app. You can type here.');return;}cancelQuestion();voiceContext=mode;voiceMemoryKind=document.querySelector('input[name=kind]:checked')?.getAttribute('value')??'thought';voiceStop={campusId,stopId:currentStop().id};voiceRequestId=crypto.randomUUID();stopAudio();window.FutureNative.listen(voiceRequestId);}
function exportJournal(){
 const text=JSON.stringify({app:'Try My Future',version:2,exportedAt:new Date().toISOString(),memories,completedChecks},null,2);
 if(window.FutureNative){window.FutureNative.exportJournal(text);return;}
 const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='try-my-future-journal.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

el('#main').addEventListener('click',event=>{
 const target=event.target instanceof Element?event.target.closest('button'):null;if(!(target instanceof HTMLButtonElement))return;
 const d=target.dataset;
 if(d.campus){campusId=d.campus;activeStopIds=[];visitorPosition=null;draftTour=null;originLabel='';positionRequest++;stopIndex=0;started=false;photo='';stopAudio();persistVisit();location.hash='plan';}
 if(d.startCampus){campusId=d.startCampus;activeStopIds=[];stopIndex=0;started=false;photo='';persistVisit();location.hash='plan';}
 if(d.stop!==undefined){stopAudio();stopIndex=Number(d.stop);photo='';persistVisit();render();}
 if(d.delete){memories=memories.filter(m=>m.id!==d.delete);store('tmf.memories.v1',memories);render();}
 if(d.question)ask(d.question);
 if(d.readAnswer)speak(d.readAnswer);
 if(d.saveQuestion)saveMemory(d.saveQuestion,'question');
 switch(d.action){
  case 'locate':locateVisitor();break;
  case 'clear-location':captureProfile();positionRequest++;locating=false;visitorPosition=null;originLabel='';locationNotice='Location forgotten. Choose a landmark or continue with your interests.';draftTour=null;render();break;
  case 'start-tour':{
   if(!draftTour?.stops.length)return;
   // Recheck freshness before freezing the selected order; never silently use an old fix.
   const latest=recommendTour(currentCampus(),profile,tourPoints[campusId]??{},visitorPosition);
   if(latest.status!==draftTour.status){draftTour=latest;render();return;}
   activeStopIds=draftTour.stops.map(s=>s.id);started=true;stopIndex=0;photo='';persistVisit();location.hash='visit';break;
  }
  case 'cancel-answer':cancelQuestion();el('#answer').innerHTML='<p class="fine">Question cancelled.</p>';el('#answer').removeAttribute('aria-busy');break;
  case 'cancel-listening':voiceRequestId='';window.FutureNative?.stopListening();el('#voice-status').innerHTML='';break;
  case 'retry-question':{const input=document.querySelector('#question');if(input instanceof HTMLInputElement)ask(input.value);break;}
  case 'complete-task':{
   const key=checkKey(campusId,currentStop().id,visitChallenge(currentStop(),profile).id);
   completedChecks=completedChecks.includes(key)?completedChecks.filter(item=>item!==key):[...completedChecks,key];
   completedChecks=validateChecks(completedChecks,campuses);store('tmf.checks.v1',completedChecks);render();break;
  }
  case 'read-task':{const task=visitChallenge(currentStop(),profile);speak(`${task.title}. ${task.task} Ask a student or guide: ${task.question}`);break;}
  case 'device':openDevice();break;
  case 'directory':location.hash='directory';break;
  case 'read':speak(`${currentStop().name}. ${currentStop().fact} Picture your day: ${currentStop().prompt}`);break;
  case 'stop-audio':stopAudio();break;
  case 'next':next();break;
  case 'capture':if(!window.FutureNative||!deviceReady){openDevice();break;}photo='';captureContext={campusId,stopId:currentStop().id};window.FutureNative.capture();toast('Capturing one photo from your glasses…');break;
  case 'clear-photo':photo='';render();break;
  case 'dictate-memory':dictate('memory');break;
  case 'dictate-question':dictate('question');break;
  case 'export':exportJournal();break;
 }
});
el('#main').addEventListener('submit',event=>{
 event.preventDefault();const form=event.target;if(!(form instanceof HTMLFormElement))return;const data=new FormData(form);
 if(form.id==='plan-form'){captureProfile();positionRequest++;locating=false;computeTour();render();document.querySelector('#tour-preview')?.scrollIntoView({behavior:'smooth',block:'start'});}
 if(form.id==='memory-form'){saveMemory(String(data.get('memory')),String(data.get('kind')??'thought'));form.reset();}
 if(form.id==='question-form')ask(String(data.get('question')));
});
const dialog=/** @type {HTMLDialogElement} */(el('#device-dialog'));
function updateDevice(){
 el('#device-status').textContent=deviceMode==='audio'?'Pair audio glasses through your phone’s Bluetooth settings and select them as media output. Use Test audio to check the route.':window.FutureNative?deviceStatus:'Browser preview. Install the Android app to connect a Meta camera.';
 /** @type {HTMLButtonElement} */(el('#connect')).disabled=!window.FutureNative||deviceMode!=='meta';
 /** @type {HTMLButtonElement} */(el('#disconnect')).disabled=!window.FutureNative||deviceMode!=='meta';
 el('#meta-instructions').hidden=deviceMode!=='meta';
 el('#camera-buttons').hidden=deviceMode!=='meta';
}
function openDevice(){updateDevice();checkGuide();dialog.showModal();}
el('#device-mode').addEventListener('change',event=>{
 if(!(event.target instanceof HTMLSelectElement))return;
 deviceMode=event.target.value==='meta'?'meta':'audio';
 deviceReady=false;photo='';captureContext=null;
 window.FutureNative?.selectProvider(deviceMode);
 deviceStatus=deviceMode==='meta'?'Connect Meta glasses to enable photo capture.':'Bluetooth audio mode';
 updateDevice();render();
});
el('#test-audio').onclick=()=>speak('Welcome to Try My Future. This is your campus guide audio test.');
el('#audio-settings').onclick=()=>{if(window.FutureNative)window.FutureNative.openAudioSettings();else toast('Open Bluetooth settings on your paired Android phone.');};
el('#device-open').onclick=openDevice;
el('#device-close').onclick=()=>dialog.close();
el('#connect').onclick=()=>{window.FutureNative?.selectProvider('meta');window.FutureNative?.connect();};
el('#disconnect').onclick=()=>window.FutureNative?.disconnect();
window.onFutureNative=event=>{
 if(receiveGuide(event))return;
 if(event.type==='guide-status'){guideStatus=event.text??'Guide unavailable';updateGuideStatus();return;}
 if(event.type==='speech-status'){toast(event.text??'Listening…');const status=document.querySelector('#voice-status');if(status&&voiceRequestId)status.innerHTML=`<p>${esc(event.text??'Listening…')}</p><button class="text-button" data-action="cancel-listening">Cancel listening</button>`;return;}
 if(event.type==='speech-partial'&&event.id===voiceRequestId&&voiceContext==='question'&&voiceStop?.campusId===campusId&&voiceStop?.stopId===currentStop().id){const input=document.querySelector('#question');if(input instanceof HTMLInputElement)input.value=event.text??'';return;}
 if(event.type==='status'){deviceReady=event.ready===true;deviceStatus=event.text??'Not connected';updateDevice();el('#device-label').textContent=deviceReady?'Glasses connected':'Glasses';el('#device-open').classList.toggle('connected',deviceReady);}
 if(event.type==='error'){toast(event.text??'Something went wrong. Please try again.');const status=document.querySelector('#voice-status');if(status)status.innerHTML='';}
 if(event.type==='photo' && event.data && deviceMode==='meta'){if(captureContext?.campusId!==campusId||captureContext?.stopId!==currentStop().id){toast('Capture discarded because the selected stop changed.');return;}photo=`data:image/jpeg;base64,${event.data}`;if(location.hash==='#visit'){render();toast('Captured. Photo is temporary; your selected stop is unchanged.');}}
 if(event.type==='transcript' && event.text&&event.id===voiceRequestId){voiceRequestId='';const status=document.querySelector('#voice-status');if(status)status.innerHTML='';if(voiceContext==='memory'){saveMemory(event.text,voiceMemoryKind,voiceStop??undefined);}else if(voiceStop?.campusId===campusId && voiceStop?.stopId===currentStop().id && location.hash==='#visit'){ask(event.text,true);}else toast('Your stop changed. Please ask again at the selected stop.');}
};
el('#pair-guide').onclick=()=>{const input=/** @type {HTMLInputElement} */(el('#guide-code'));if(!window.FutureNative){toast('Pairing is only needed in the Android app.');return;}window.FutureNative.pairGuide(input.value.trim());input.value='';};
el('#check-guide').onclick=checkGuide;
window.addEventListener('hashchange',()=>{voiceRequestId='';window.FutureNative?.stopListening();stopAudio();photo='';render();window.scrollTo(0,0);});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(answerRequest){const box=document.querySelector('#answer');if(box){box.innerHTML='<p class="fine">Question paused. Ask again when you return.</p>';box.removeAttribute('aria-busy');}}cancelQuestion();stopAudio();}});
window.FutureNative?.selectProvider('audio');
render();
checkGuide();
