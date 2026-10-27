/** @typedef {{title:string,url:string,reviewedAt?:string|null}} GuideSource */
/** @typedef {{text:string,sources:GuideSource[],grounded:boolean,model:string,searched:boolean}} GuideAnswer */
/** @typedef {{campusId:string,stopId:string,question:string,interest:string,major?:string,interests?:string,history:{question:string,answer:string}[]}} GuideQuestion */
/** @type {Map<string,{resolve:(value:GuideAnswer)=>void,reject:(error:Error)=>void,cleanup:()=>void}>} */
const pending=new Map();

/** @param {unknown} value @returns {GuideAnswer} */
export function validateAnswer(value){
 if(!value||typeof value!=='object'||!('text' in value)||typeof value.text!=='string'||!value.text||!('sources' in value)||!Array.isArray(value.sources))throw new Error('The guide returned an unreadable answer. Please try again.');
 const sources=value.sources.filter(s=>{try{return typeof s.title==='string'&&new URL(s.url).protocol==='https:';}catch{return false;}});
 return {text:value.text,sources,grounded:'grounded' in value&&value.grounded===true,model:'Muse Spark',searched:'searched' in value&&value.searched===true};
}

/** @param {GuideQuestion} question @param {AbortSignal} signal @returns {Promise<GuideAnswer>} */
export async function askGuide(question,signal){
 if(window.FutureNative){
  const id=crypto.randomUUID();
  return new Promise((resolve,reject)=>{
   const cancel=()=>{window.FutureNative?.cancelGuide(id);pending.delete(id);clearTimeout(timer);reject(new DOMException('Cancelled','AbortError'));};
   const timer=setTimeout(()=>{window.FutureNative?.cancelGuide(id);pending.delete(id);signal.removeEventListener('abort',cancel);reject(new Error('The guide took too long. Check the connection and try again.'));},55000);
   const cleanup=()=>{clearTimeout(timer);signal.removeEventListener('abort',cancel);};
   pending.set(id,{resolve,reject,cleanup});signal.addEventListener('abort',cancel,{once:true});
   if(signal.aborted){cancel();return;}
   window.FutureNative?.askGuide(id,JSON.stringify(question));
  });
 }
 const response=await fetch('/api/ask',{method:'POST',headers:{'Content-Type':'application/json','X-TMF-Client':'browser'},body:JSON.stringify(question),signal:AbortSignal.any([signal,AbortSignal.timeout(55000)])});
 const body=await response.json();
 if(!response.ok)throw new Error(body.message??'Could not reach your campus guide.');
 return validateAnswer(body);
}

/** @param {{type:string,id?:string,data?:string,text?:string}} event */
export function receiveGuide(event){
 if(event.type!=='guide-answer'&&event.type!=='guide-error')return false;
 const request=pending.get(event.id??'');if(!request)return true;
 pending.delete(event.id??'');request.cleanup();
 try{if(event.type==='guide-error')throw new Error(event.text??'The guide is unavailable.');request.resolve(validateAnswer(JSON.parse(event.data??'')));}catch(error){request.reject(error instanceof Error?error:new Error('The answer could not be read.'));}
 return true;
}
