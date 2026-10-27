import {test} from 'node:test';
import assert from 'node:assert/strict';
import {campuses} from '../web/data.js';
import {planVisit,answerQuestion,parseCommand,validateMemories,compareVisits} from '../web/core.js';

test('pilot contains exactly the three requested schools with independent stops',()=>{
  assert.deepEqual(campuses.map(c=>c.id),['ucsd','ut','uva']);
  for(const c of campuses){assert.equal(c.stops.length,4);assert.equal(new Set(c.stops.map(s=>s.id)).size,4);for(const s of c.stops){assert.match(s.source,/^https:\/\//);assert.ok(new URL(s.source).hostname.endsWith('.edu'));}}
});
test('engineering and commuter priorities affect discovery without mutating campus data',()=>{
  const before=JSON.stringify(campuses);
  const stops=planVisit(campuses[0],{interest:'engineering',lifestyle:'commuter',minutes:20});
  assert.deepEqual(stops.map(s=>s.id),['jacobs','price']);assert.equal(JSON.stringify(campuses),before);
});
test('time budget limits stops and longer visits do not duplicate stops',()=>{
  for(const c of campuses)for(const [minutes,count] of [[20,2],[40,3],[60,4]]){
    const stops=planVisit(c,{interest:'study',lifestyle:'resident',minutes});assert.equal(stops.length,count);assert.equal(new Set(stops.map(s=>s.id)).size,count);
  }
});
test('unsupported costs and live access questions cannot be answered by generic study facts',()=>{
  for(const question of ['How much is tuition?','Is the library open now?','Is this wheelchair accessible?','What is my admission chance?','Does this library have safe parking?','What are the housing costs?']){
    const result=answerQuestion(campuses[0],campuses[0].stops[0],question);assert.equal(result.known,false,question);
  }
});
test('selected building answer explicitly avoids pretending to recognize a photo',()=>{
  const result=answerQuestion(campuses[2],campuses[2].stops[0],'What is this building?');
  assert.equal(result.source,campuses[2].stops[0].source);assert.match(result.text,/not an automatic identification/);
});
test('answers stay inside the selected campus',()=>{
  const result=answerQuestion(campuses[1],campuses[1].stops[1],'Where can I study?');assert.match(result.text,/Perry-Castañeda/);assert.doesNotMatch(result.text,/Geisel|Shannon/);
});
test('unsupported and empty questions have an explicit fallback',()=>{
  for(const q of ['','Who is teaching calculus next spring?'])assert.equal(answerQuestion(campuses[0],campuses[0].stops[0],q).known,false);
});
test('commands only trigger on explicit instructions',()=>{
  assert.deepEqual(parseCommand('Remember that I liked the courtyard'),{type:'memory',text:'I liked the courtyard'});
  assert.equal(parseCommand('next stop').type,'next');assert.equal(parseCommand('What is next semester like?').type,'question');assert.equal(parseCommand('stop speaking').type,'stop');
});
const note={id:'one',campusId:'ucsd',stopId:'geisel',text:'I like this space',kind:'thought',createdAt:'2026-10-27T15:00:00Z'};
test('corrupt or cross-campus journal entries cannot crash or contaminate comparisons',()=>{
  const entries=[note,null,{...note,id:'two',campusId:'uva'},{...note,id:'three',createdAt:'invalid'},{...note,id:'four',text:5},{...note,id:'five',kind:'score'},note];
  assert.deepEqual(validateMemories(entries,campuses),[note]);assert.deepEqual(validateMemories({},campuses),[]);
});
test('journal caps persisted data and accepts text without treating it as markup',()=>{
  const entries=Array.from({length:205},(_,i)=>({...note,id:String(i),text:'<img src=x onerror=alert(1)>'}));
  const result=validateMemories(entries,campuses);assert.equal(result.length,200);assert.equal(result[0].id,'5');assert.equal(result[0].text,entries[0].text);
  assert.equal(validateMemories([{...note,text:'x'.repeat(1001)}],campuses).length,0);
});
test('comparison separates open questions from personal impressions without scoring',()=>{
  const result=compareVisits([note,{...note,id:'two',kind:'question',text:'How do I find a research mentor?'}],campuses);
  assert.equal(result[0].thoughts.length,1);assert.equal(result[0].questions.length,1);assert.equal(result[1].thoughts.length,0);assert.equal('score' in result[0],false);
});
