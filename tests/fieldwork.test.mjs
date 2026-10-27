import test from 'node:test';
import assert from 'node:assert/strict';
import {visitChallenge,checkKey,validateChecks} from '../web/fieldwork.js';
import {validateMemories,compareVisits} from '../web/core.js';
import {campuses} from '../web/data.js';

const profile={interest:'engineering',lifestyle:'exploring',minutes:40};
test('activities respond to the selected place and commuter needs',()=>{
 const [library,studentUnion,engineering]=campuses[0].stops;
 assert.equal(visitChallenge(library,profile).id,'study');
 assert.equal(visitChallenge(engineering,profile).id,'project');
 assert.equal(visitChallenge(studentUnion,profile).id,'community');
 assert.equal(visitChallenge(studentUnion,{...profile,lifestyle:'commuter'}).id,'arrival');
 assert.match(visitChallenge(library,profile).task,/open to visitors/);
});
test('completion is scoped to the campus, stop and activity, including changed plans',()=>{
 const key=checkKey('ucsd','price','community');
 const keys=validateChecks([key,key,checkKey('uva','price','community'),'ucsd/price/fake',null,44],campuses);
 assert.deepEqual(keys,[key]);
 assert.ok(!keys.includes(checkKey('ucsd','price','arrival')));
 assert.deepEqual(validateChecks({done:true},campuses),[]);
});
test('good signs and concerns survive restart and remain separate from neutral old notes',()=>{
 const base={id:'one',campusId:'ucsd',stopId:'geisel',text:'I noticed the seating.',kind:'thought',createdAt:'2026-10-27T00:00:00Z'};
 const notes=validateMemories([base,{...base,id:'two',kind:'good',text:'I could focus here.'},{...base,id:'three',kind:'concern',text:'Need to check crowding.'},{...base,id:'four',kind:'question',text:'Are weekend hours different?'}],campuses);
 assert.equal(notes.length,4);
 const result=compareVisits(notes,campuses)[0];
 assert.equal(result.thoughts[0].id,'one');
 assert.equal(result.goodSigns[0].id,'two');
 assert.equal(result.concerns[0].id,'three');
 assert.equal(result.questions[0].id,'four');
 assert.equal('score' in result,false);
});
