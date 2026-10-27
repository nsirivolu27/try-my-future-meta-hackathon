import assert from 'node:assert/strict';
import test from 'node:test';
import {directory,directoryMeta} from '../web/directory-data.js';
import {searchCampuses,selfGuidedCampus} from '../web/directory.js';
import {deviceCapabilities} from '../web/devices.js';
import {planVisit,validateMemories,answerQuestion} from '../web/core.js';
import {campuses} from '../web/data.js';

test('the shipped snapshot has unique stable institution IDs and nationwide coverage',()=>{
 assert.equal(directory.length,directoryMeta.count);
 assert.ok(directory.length>5000);
 assert.equal(new Set(directory.map(c=>c.unitid)).size,directory.length);
 assert.equal(new Set(directory.map(c=>c.id)).size,directory.length);
 const states=new Set(directory.map(c=>c.state));
 for(const state of 'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' '))assert.ok(states.has(state),state);
});
test('original curated IDs remain mapped to the right federal records',()=>{
 assert.deepEqual(directory.filter(c=>c.coverage==='curated').map(c=>[c.id,c.unitid]).sort(),[['ucsd','110680'],['ut','228778'],['uva','234076']]);
 for(const campus of campuses)assert.ok(directory.some(c=>c.id===campus.id));
});
test('aliases, punctuation and state filters find campuses without conflating states',()=>{
 assert.ok(searchCampuses(directory,'UCSD','CA').records.some(c=>c.id==='ucsd'));
 assert.equal(searchCampuses(directory,'Middlesex','NJ').records[0].name,'Middlesex College');
 assert.equal(searchCampuses(directory,'UCSD','VA').total,0);
 assert.equal(searchCampuses(directory,'no-such-school-xyz').total,0);
 assert.equal(searchCampuses(directory,'','').records.length,25);
 assert.equal(searchCampuses(directory,'','').total,directory.length);
});
test('directory retains two-year and technical institutions with safe links',()=>{
 assert.ok(directory.some(c=>c.level===2));
 assert.ok(directory.some(c=>c.level===3));
 for(const campus of directory)for(const link of [campus.website,campus.admissions,campus.accessibility]){
  if(!link)continue;
  const url=new URL(link);assert.equal(url.protocol,'https:');assert.equal(url.username,'');
 }
});
test('new campuses support journal restoration without inventing building facts',()=>{
 const entry=searchCampuses(directory,'Middlesex','NJ').records[0];
 const campus=selfGuidedCampus(entry);
 const stop=planVisit(campus,{interest:'engineering',lifestyle:'commuter',minutes:20})[0];
 assert.match(stop.fact,/not a verified building/);
 const memories=[{id:'new-campus-note',campusId:campus.id,stopId:stop.id,text:'Ask about project opportunities.',kind:'thought',createdAt:'2026-10-27T00:00:00Z'}];
 assert.equal(validateMemories(memories,[selfGuidedCampus(entry)]).length,1);
 assert.equal(answerQuestion(campus,stop,'How much is tuition?').known,false);
});
test('camera availability is limited to the implemented adapter',()=>{
 assert.equal(deviceCapabilities('meta').camera,true);
 for(const mode of ['audio','unknown','snap','frame']){
  assert.equal(deviceCapabilities(mode).camera,false);
  assert.equal(deviceCapabilities(mode).audio,true);
 }
});
