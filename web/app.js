import {visitChallenge,checkKey,validateChecks} from './fieldwork.js';
import {planVisit,answerQuestion,parseCommand,validateMemories,compareVisits} from './core.js';
import {campuses as curatedCampuses,reviewedAt} from './data.js';
import {directory,directoryMeta} from './directory-data.js';
import {searchCampuses,selfGuidedCampus} from './directory.js';
import {deviceCapabilities} from './devices.js';
const campuses=directory.map(entry=>curatedCampuses.find(c=>c.id===entry.id)??selfGuidedCampus(entry));
const curatedIds=new Set(curatedCampuses.map(c=>c.id));
/** @param {string} id */
const campusArt=id=>curatedIds.has(id)?id:'campus';
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
let campusId='ucsd';
let stopIndex=0;
let started=false;
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
const saved=read('tmf.visit.v1');
if(saved && typeof saved==='object' && 'campusId' in saved && typeof saved.campusId==='string' && campuses.some(c=>c.id===saved.campusId)) {
  campusId=saved.campusId;
  if('profile' in saved && saved.profile && typeof saved.profile==='object'){
    const p=saved.profile;
    if('interest' in p && typeof p.interest==='string' && ['engineering','science','arts','community','study'].includes(p.interest)) profile.interest=p.interest;
    if('lifestyle' in p && typeof p.lifestyle==='string' && ['exploring','commuter','resident'].includes(p.lifestyle)) profile.lifestyle=p.lifestyle;
    if('minutes' in p && typeof p.minutes==='number' && [20,40,60].includes(p.minutes)) profile.minutes=p.minutes;
  }
  if('started' in saved) started=saved.started===true;
  if('stopIndex' in saved && typeof saved.stopIndex==='number' && Number.isInteger(saved.stopIndex)) stopIndex=Math.max(0,Math.min(saved.stopIndex,planVisit(currentCampus(),profile).length-1));
}
function currentCampus(){return campuses.find(c=>c.id===campusId)??campuses[0];}
function currentStops(){return planVisit(currentCampus(),profile);}
function currentStop(){return currentStops()[stopIndex]??currentStops()[0];}
function persistVisit(){store('tmf.visit.v1',{campusId,profile,stopIndex,started});}
/** @param {string} url @param {string} label */
const sourceLink=(url,label)=>`<a class="source" href="${esc(url)}" target="_blank" rel="noopener noreferrer">↗ ${esc(label)}</a>`;
/** @param {string} value @param {string} selected @param {string} label */
const option=(value,selected,label)=>`<option value="${value}" ${value===selected?'selected':''}>${label}</option>`;

function explore(){
 const selected=currentCampus(),curated=curatedIds.has(campusId);
 return `<section class="welcome"><div class="companion-avatar"><img src="falling-block.svg" alt=""></div><h1>Where could you<br>see yourself?</h1><p>Let’s find out, one campus at a time.</p></section>
 <button class="directory-launch" data-action="directory"><span class="search-symbol" aria-hidden="true">⌕</span><span>Find a college or city</span><span class="search-arrow" aria-hidden="true">↑</span></button><p class="directory-caption">${directoryMeta.count.toLocaleString()} schools to explore across the U.S.</p>
 <div class="campus-switcher" aria-label="Featured campus guides">${curatedCampuses.map(c=>`<button data-campus="${c.id}" aria-pressed="${c.id===campusId}" class="${c.id===campusId?'selected':''}">${esc(c.short)}</button>`).join('')}</div>
 <section class="campus-overview"><div class="campus-overview-heading"><p class="eyebrow">${esc(selected.city)}, ${esc(selected.state)}</p><h2>${esc(selected.name)}</h2><span class="coverage-tag">${curated?'Sourced campus guide':'Self-guided visit'}</span></div><div class="app-campus-art ${selected.theme}"><img src="${campusArt(selected.id)}.svg" alt="${curated?`Illustration inspired by ${esc(selected.short)}`:'Campus illustration'}"></div></section>
 <form id="plan-form" class="app-plan"><details class="plan-customize"><summary>Make it your day <span>${profile.minutes} minutes · Your interests</span></summary><div class="form-grid"><label class="interest-field">What are you into?<select name="interest">${option('engineering',profile.interest,'Engineering & technology')}${option('science',profile.interest,'Science & discovery')}${option('arts',profile.interest,'Arts & humanities')}${option('community',profile.interest,'Community & student life')}${option('study',profile.interest,'Places to study')}</select></label><label>Your routine<select name="lifestyle">${option('exploring',profile.lifestyle,'Still exploring')}${option('commuter',profile.lifestyle,'Commuting')}${option('resident',profile.lifestyle,'Living on campus')}</select></label><label>Time to explore<select name="minutes">${option('20',String(profile.minutes),'20 min / 2 activities')}${option('40',String(profile.minutes),'40 min / 3 activities')}${option('60',String(profile.minutes),'60 min / 4 activities')}</select></label></div></details><button class="primary start-visit" type="submit"><span>Let’s explore</span><span aria-hidden="true">→</span></button><p class="fine plan-footnote">${curated?'A few places to go. Something real to try at each. Walking time is extra.':'Reflection activities for your visit. Check arrangements with the school.'}</p></form>
 <button class="app-device-shortcut" data-action="device"><span class="glasses-symbol" aria-hidden="true">◯—◯</span><span><strong>Take your guide with you</strong><small>Listen through your phone or audio glasses</small></span><span aria-hidden="true">›</span></button>`;
}


function directoryResults(){
 const result=searchCampuses(directory,searchQuery,searchState);
 return `<p class="fine" role="status">${result.total.toLocaleString()} matches${result.total>25?' · First 25 shown. Refine your search.':''}</p>${result.records.map(entry=>`<button class="directory-result" data-campus="${entry.id}"><span><strong>${esc(entry.name)}</strong><small>${esc(entry.city)}, ${entry.state} · ${entry.coverage==='curated'?'Sourced guide':'Self-guided visit'}</small></span><span>↗</span></button>`).join('')||'<p>No campuses matched. Try a shorter name or another state.</p>'}`;
}
function directoryPage(){
 return `<section class="app-heading"><div><p class="eyebrow">Find your next chapter</p><h1>Campus directory</h1></div></section><form id="directory-form" class="directory-search"><label for="campus-query">School name, city or abbreviation<input id="campus-query" value="${esc(searchQuery)}" placeholder="Try UCLA, Richmond, or a community college" type="search"></label><label for="campus-state">State / territory<select id="campus-state"><option value="">All states & territories</option>${[...new Set(directory.map(c=>c.state))].sort().map(state=>option(state,searchState,state)).join('')}</select></label></form><div id="directory-results">${directoryResults()}</div><p class="fine">NCES IPEDS 2025 · ${directoryMeta.count.toLocaleString()} institutions. Covers reporting schools, not every physical campus. Directory links and addresses are snapshots; verify visits with the school.</p>${sourceLink(directoryMeta.sourceUrl,'Directory source')}`;
}
el('#main').addEventListener('input',event=>{
 const target=event.target;
 if(target instanceof HTMLInputElement && target.id==='campus-query')searchQuery=target.value;
 else if(target instanceof HTMLSelectElement && target.id==='campus-state')searchState=target.value;
 else return;
 el('#directory-results').innerHTML=directoryResults();
});

function visit(){
 if(!started)return `<section class="empty"><p class="eyebrow">YOUR NEXT CAMPUS DAY</p><h1>Try life here.</h1><p>Choose a school. Find something to try, someone to ask, and a few things to remember.</p><a href="#explore" class="primary">Choose a campus</a></section>`;
 const c=currentCampus(),stops=currentStops(),s=currentStop(),curated=curatedIds.has(campusId);
 const task=visitChallenge(s,profile),key=checkKey(campusId,s.id,task.id);
 const done=completedChecks.includes(key);
 const totalDone=stops.filter(stop=>completedChecks.includes(checkKey(campusId,stop.id,visitChallenge(stop,profile).id))).length;
 return `<section class="visit-heading active-visit-heading"><p class="eyebrow">Your day in ${esc(c.city)}</p><h1>${esc(c.short)}</h1><div class="visit-progress"><span>${totalDone} of ${stops.length} activities tried</span><a href="#explore">Edit plan</a></div><div class="progress-track" aria-label="${totalDone} of ${stops.length} activities tried">${stops.map(stop=>`<span class="${completedChecks.includes(checkKey(campusId,stop.id,visitChallenge(stop,profile).id))?'complete':''}"></span>`).join('')}</div></section>
 <details class="visit-stops"><summary>Your stops <span>${stopIndex+1} / ${stops.length}</span></summary>${stops.map((stop,i)=>`<button data-stop="${i}" class="stop-button ${i===stopIndex?'active':''}" aria-current="${i===stopIndex?'step':'false'}"><span>${String(i+1).padStart(2,'0')}</span><div><strong>${esc(stop.name)}</strong><small>${esc(visitChallenge(stop,profile).title)}</small></div></button>`).join('')}<p class="fine">${curated?'Suggested places, not walking directions. Check entry and visitor access.':'Reflection activities, not verified campus locations. Check visit arrangements first.'}</p>${sourceLink(c.visit,curated?'University visit information':'Institution information')}</details>
 <article class="field-stop"><div class="companion-byline"><img src="falling-block.svg" alt=""><span>Your campus companion<small>${curated?'At':'Activity:'} ${esc(s.name)}</small></span></div><section class="field-task ${done?'is-done':''}"><div class="task-meta"><span>Something to try</span><span>${task.duration}</span></div><h2>${esc(task.title)}</h2><p>${esc(task.task)}</p><button class="task-complete" data-action="complete-task" aria-pressed="${done}"><span>${done?'✓':'○'}</span>${done?'Tried it · tap to undo':'I tried this'}</button><button class="text-button" data-action="read-task">Listen to the activity</button></section>
 <section class="guide-chat"><form id="question-form"><label class="sr-only" for="question">Ask your campus guide</label><div class="question-input"><input id="question" name="question" maxlength="300" placeholder="Ask about this campus…" required><button type="button" class="voice-button" data-action="dictate-question" aria-label="Ask by voice"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4m4-8v12m4-15v18m4-15v12m4-8v4"/></svg></button><button type="submit" aria-label="Send question">↑</button></div></form><p class="fine">${curated?'Answers from the sourced campus guide.':'A sourced guide is not available here yet. Save questions for your visit.'}</p><div id="answer" aria-live="polite"></div></section>
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
 const previousMemory=document.querySelector('#memory');
 const previousQuestion=document.querySelector('#question');
 if(renderedStopKey && previousMemory instanceof HTMLTextAreaElement && previousQuestion instanceof HTMLInputElement) drafts.set(renderedStopKey,{memory:previousMemory.value,question:previousQuestion.value,kind:document.querySelector('input[name=kind]:checked')?.getAttribute('value')??'thought'});
 const page=location.hash.slice(1)||'explore';
 el('#main').innerHTML=page==='visit'?visit():page==='journal'?journal():page==='compare'?compare():page==='directory'?directoryPage():explore();
 renderedStopKey=page==='visit' && started?`${campusId}/${currentStop().id}`:'';
 const draft=drafts.get(renderedStopKey);
 if(draft){const memory=document.querySelector('#memory');const question=document.querySelector('#question');if(memory instanceof HTMLTextAreaElement)memory.value=draft.memory;if(question instanceof HTMLInputElement)question.value=draft.question;const kind=document.querySelector(`input[name=kind][value="${draft.kind}"]`);if(kind instanceof HTMLInputElement)kind.checked=true;}
 document.querySelectorAll('[data-nav]').forEach(node=>{node.classList.toggle('active',node.getAttribute('data-nav')===(page==='directory'?'explore':page));if(node.getAttribute('data-nav')===(page==='directory'?'explore':page))node.setAttribute('aria-current','page');else node.removeAttribute('aria-current');});
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
/** @param {string} question */
function ask(question){
 const cmd=parseCommand(question);
 if(cmd.type==='next'){next();return;}if(cmd.type==='read'){speak(currentStop().fact);return;}if(cmd.type==='stop'){stopAudio();return;}if(cmd.type==='memory'){saveMemory(cmd.text);return;}
 const response=answerQuestion(currentCampus(),currentStop(),question);
 el('#answer').innerHTML=`<div class="answer-card"><p>${esc(response.text)}</p>${sourceLink(response.source,response.label)}<div class="button-row"><button class="text-button" data-read-answer="${esc(response.text)}">▷ Listen</button><button class="text-button" data-save-question="${esc(question)}">Save my question +</button></div></div>`;
}
function next(){stopAudio();photo='';if(stopIndex>=currentStops().length-1){location.hash='journal';return;}stopIndex++;persistVisit();render();window.scrollTo(0,0);}
/** @param {string} mode */
function dictate(mode){if(!window.FutureNative){toast('Voice input is available in the Android app. You can type here.');return;}voiceContext=mode;voiceMemoryKind=document.querySelector('input[name=kind]:checked')?.getAttribute('value')??'thought';voiceStop={campusId,stopId:currentStop().id};stopAudio();window.FutureNative.listen();}
function exportJournal(){
 const text=JSON.stringify({app:'Try My Future',version:2,exportedAt:new Date().toISOString(),memories,completedChecks},null,2);
 if(window.FutureNative){window.FutureNative.exportJournal(text);return;}
 const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='try-my-future-journal.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

el('#main').addEventListener('click',event=>{
 const target=event.target instanceof Element?event.target.closest('button'):null;if(!(target instanceof HTMLButtonElement))return;
 const d=target.dataset;
 if(d.campus){campusId=d.campus;stopIndex=0;started=false;photo='';stopAudio();persistVisit();if(location.hash==='#directory')location.hash='explore';else render();}
 if(d.startCampus){campusId=d.startCampus;stopIndex=0;started=true;photo='';persistVisit();location.hash='visit';}
 if(d.stop!==undefined){stopAudio();stopIndex=Number(d.stop);photo='';persistVisit();render();}
 if(d.delete){memories=memories.filter(m=>m.id!==d.delete);store('tmf.memories.v1',memories);render();}
 if(d.question)ask(d.question);
 if(d.readAnswer)speak(d.readAnswer);
 if(d.saveQuestion)saveMemory(d.saveQuestion,'question');
 switch(d.action){
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
 if(form.id==='plan-form'){profile={interest:String(data.get('interest')),lifestyle:String(data.get('lifestyle')),minutes:Number(data.get('minutes'))};started=true;stopIndex=0;photo='';persistVisit();location.hash='visit';}
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
function openDevice(){updateDevice();dialog.showModal();}
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
 if(event.type==='status'){deviceReady=event.ready===true;deviceStatus=event.text??'Not connected';updateDevice();el('#device-label').textContent=deviceReady?'Glasses connected':'Glasses';el('#device-open').classList.toggle('connected',deviceReady);}
 if(event.type==='error')toast(event.text??'Something went wrong. Please try again.');
 if(event.type==='photo' && event.data && deviceMode==='meta'){if(captureContext?.campusId!==campusId||captureContext?.stopId!==currentStop().id){toast('Capture discarded because the selected stop changed.');return;}photo=`data:image/jpeg;base64,${event.data}`;if(location.hash==='#visit'){render();toast('Captured. Photo is temporary; your selected stop is unchanged.');}}
 if(event.type==='transcript' && event.text){if(voiceContext==='memory'){saveMemory(event.text,voiceMemoryKind,voiceStop??undefined);}else if(voiceStop?.campusId===campusId && voiceStop?.stopId===currentStop().id && location.hash==='#visit'){ask(event.text);}else toast('Your stop changed. Please ask again at the selected stop.');}
};
window.addEventListener('hashchange',()=>{stopAudio();photo='';render();window.scrollTo(0,0);});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAudio();});
window.FutureNative?.selectProvider('audio');
render();
