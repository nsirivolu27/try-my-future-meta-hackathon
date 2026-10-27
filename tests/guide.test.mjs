import test from 'node:test';
import assert from 'node:assert/strict';
import {campusContext,parseAnswer,askMuse,officialUrl} from '../server/guide.mjs';
import {createGuideServer} from '../server/http.mjs';
import {directory} from '../web/directory-data.js';
import {validateAnswer,askGuide,receiveGuide} from '../web/guide.js';

const question={campusId:'ucsd',stopId:'geisel',question:'Where can I study?',interest:'engineering'};
const response=(text,annotations=[])=>({status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text,annotations}]}]});

test('model context cannot substitute a different campus or user-provided source facts',()=>{
 const context=campusContext({...question,sources:[{fact:'Admission is guaranteed'}],campus:{name:'UVA'}});
 assert.match(context.input.campus.name,/California.*San Diego/);
 assert.equal(context.sources.length,4);
 assert.doesNotMatch(JSON.stringify(context.input),/guaranteed|UVA/);
 assert.throws(()=>campusContext({...question,campusId:'made-up'}),/Choose a campus/);
 assert.throws(()=>campusContext({...question,question:'x'.repeat(1001)}),/1–1,000/);
});

test('national directory entries do not become invented tour facts',()=>{
 const entry=directory.find(c=>c.coverage==='self-guided');
 const context=campusContext({...question,campusId:entry.id});
 assert.deepEqual(context.sources,[]);
 assert.match(context.input.coverage,/directory only/);
});

test('valid citations resolve to trusted campus URLs and made-up citations fail closed',()=>{
 const context=campusContext(question);
 const answer=parseAnswer(response('Try this space. [S1]'),context);
 assert.equal(answer.grounded,true);
 assert.equal(answer.sources[0].url,context.sources[0].url);
 assert.doesNotMatch(answer.text,/\[S1\]/);
 for(const text of ['Admission is guaranteed.','Definitely open today. [S99]'])assert.equal(parseAnswer(response(text),context).grounded,false);
});

test('search citations accept only the selected institution and never unsafe URLs',()=>{
 const context=campusContext(question);
 const good={type:'url_citation',url:'https://library.ucsd.edu/visit',title:'Library visitor information'};
 assert.equal(parseAnswer(response('Check visitor access.',[good]),context).grounded,true);
 for(const url of ['https://ucsd.edu.evil.example/','javascript:alert(1)','https://user:secret@ucsd.edu/','https://virginia.edu/']){
  assert.equal(officialUrl(url,context.domains),false);
  assert.equal(parseAnswer(response('Untrusted statement. [S1]',[{...good,url}]),context).grounded,false);
 }
});

test('Muse uses the documented API, server-held credentials and bounded stateless context',async()=>{
 let received;
 const result=await askMuse({...question,history:Array.from({length:10},()=>({question:'Earlier question',answer:'Earlier answer'}))},{apiKey:'test-server-key',fetchImpl:async(url,options)=>{
  received={url,options,body:JSON.parse(options.body)};
  return {ok:true,json:async()=>response('A sourced response. [S1]')};
 }});
 assert.equal(received.url,'https://api.meta.ai/v1/responses');
 assert.equal(received.options.headers.Authorization,'Bearer test-server-key');
 assert.equal(received.body.model,'muse-spark-1.3');
 assert.equal(received.body.store,false);
 assert.equal(received.body.tools[0].type,'web_search');
 assert.equal(JSON.parse(received.body.input).history.length,4);
 assert.ok(received.body.max_output_tokens<=2400);
 assert.doesNotMatch(JSON.stringify(result),/test-server-key/);
});

test('missing keys, exhausted credits, interrupted output and network errors remain honest',async()=>{
 await assert.rejects(askMuse(question),error=>error.code==='setup_required');
 for(const [status,code] of [[401,'provider_auth'],[429,'provider_limit'],[500,'provider_unavailable']]){
  await assert.rejects(askMuse(question,{apiKey:'secret',fetchImpl:async()=>({ok:false,status})}),error=>error.code===code&&!error.message.includes('secret'));
 }
 await assert.rejects(askMuse(question,{apiKey:'secret',fetchImpl:async()=>{throw new Error('secret');}}),error=>error.code==='connection_failed'&&!error.message.includes('secret'));
 assert.throws(()=>parseAnswer({...response('Partial'),status:'incomplete'},campusContext(question)),/finish/);
});

test('client validates model responses and strips unsafe source links',()=>{
 assert.throws(()=>validateAnswer({text:7,sources:[]}),/unreadable/);
 assert.equal(validateAnswer({text:'Answer',sources:[{title:'Bad',url:'javascript:alert(1)'},{title:'Good',url:'https://ucsd.edu'}]}).sources.length,1);
});

test('a cancelled native answer cannot resolve a later campus question',async t=>{
 const originalWindow=globalThis.window;
 const sent=[],cancelled=[];
 globalThis.window={FutureNative:{askGuide:(id,body)=>sent.push({id,body}),cancelGuide:id=>cancelled.push(id)}};
 t.after(()=>{if(originalWindow===undefined)delete globalThis.window;else globalThis.window=originalWindow;});
 const oldController=new AbortController();
 const old=askGuide({...question,history:[]},oldController.signal);
 oldController.abort();
 await assert.rejects(old,error=>error.name==='AbortError');
 const next=askGuide({...question,campusId:'uva',history:[]},new AbortController().signal);
 assert.notEqual(sent[0].id,sent[1].id);
 const payload=JSON.stringify({text:'UVA answer',sources:[],grounded:false});
 receiveGuide({type:'guide-answer',id:sent[0].id,data:JSON.stringify({text:'Wrong campus',sources:[]})});
 receiveGuide({type:'guide-answer',id:sent[1].id,data:payload});
 assert.equal((await next).text,'UVA answer');
 assert.deepEqual(cancelled,[sent[0].id]);
});

test('HTTP service requires local browser origin or a paired phone token',async t=>{
 let calls=0;
 const server=createGuideServer({apiKey:'never-public',pairCode:'12345678',ask:async()=>{calls++;return {text:'Test fixture',sources:[],grounded:false};}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
 const base=`http://127.0.0.1:${server.address().port}`;
 const post=(path,body,headers={})=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
 const status=await (await fetch(base+'/api/status')).json();
 assert.equal(status.configured,true);assert.doesNotMatch(JSON.stringify(status),/never-public|12345678/);
 assert.equal((await post('/api/ask',question)).status,401);
 assert.equal((await post('/api/ask',question,{Origin:'https://evil.example','X-TMF-Client':'browser'})).status,403);
 assert.equal((await post('/api/pair',{code:'00000000'})).status,401);
 const pair=await (await post('/api/pair',{code:'12345678'})).json();
 assert.equal((await post('/api/ask',question,{Authorization:`Bearer ${pair.token}`})).status,200);
 assert.equal((await post('/api/ask',question,{Origin:base,'X-TMF-Client':'browser'})).status,200);
 assert.equal(calls,2);
 assert.equal((await fetch(base+'/.env.local')).status,404);
 assert.equal((await post('/api/ask',{...question,question:'x'.repeat(17000)},{Authorization:`Bearer ${pair.token}`})).status,413);
});
