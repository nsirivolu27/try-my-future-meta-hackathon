import test from 'node:test';
import assert from 'node:assert/strict';
import {recommendTour,metersBetween,interestTags,locationStatus,walkingMapUrl} from '../web/tour.js';
import {tourPoints} from '../web/tour-data.js';
import {campuses} from '../web/data.js';
import {selfGuidedCampus} from '../web/directory.js';
import {directory} from '../web/directory-data.js';
import {campusContext} from '../server/guide.mjs';

const now=1793100000000;
const profile={major:'Computer science',interests:'Robotics and live music',interest:'engineering',lifestyle:'exploring',minutes:20};
const position=(p)=>({...p,accuracy:10,timestamp:now});

test('major and interests change the chosen stops rather than just the heading',()=>{
 const engineering=recommendTour(campuses[0],profile,tourPoints.ucsd,null,now);
 const arts=recommendTour(campuses[0],{...profile,major:'History',interests:'Art and reading',interest:'arts'},tourPoints.ucsd,null,now);
 assert.equal(engineering.stops[0].id,'jacobs');
 assert.notEqual(arts.stops[0].id,'jacobs');
 assert.ok(interestTags('computer science, music, quiet study').includes('engineering'));
 assert.ok(!interestTags('artificial sweeteners').includes('arts'));
});

test('the starting location changes the order for the same person',()=>{
 const p={major:'Undecided',interests:'Community',interest:'community',lifestyle:'exploring',minutes:20};
 const nearPrice=recommendTour(campuses[0],p,tourPoints.ucsd,position(tourPoints.ucsd.price),now);
 const nearStudent=recommendTour(campuses[0],p,tourPoints.ucsd,position(tourPoints.ucsd['student-center']),now);
 assert.equal(nearPrice.stops[0].id,'price');
 assert.equal(nearStudent.stops[0].id,'student-center');
 assert.equal(nearPrice.startMeters,0);
});

test('selection balances interest and travel without exceeding the planning budget or repeating stops',()=>{
 const before=JSON.stringify({campuses,tourPoints});
 for(const campus of campuses)for(const minutes of [20,40,60])for(const point of Object.values(tourPoints[campus.id])){
  const plan=recommendTour(campus,{...profile,minutes},tourPoints[campus.id],position(point),now);
  assert.ok(plan.minutes<=minutes);
  assert.equal(new Set(plan.stops.map(s=>s.id)).size,plan.stops.length);
  assert.ok(plan.stops.every(s=>campus.stops.includes(s)));
 }
 assert.equal(JSON.stringify({campuses,tourPoints}),before);
});

test('poor accuracy, stale fixes and distant locations cannot masquerade as an on-campus start',()=>{
 const points=Object.values(tourPoints.ucsd),good=position(points[0]);
 for(const [point,status] of [[{...good,accuracy:800},'inaccurate'],[{...good,timestamp:now-121000},'stale'],[{...good,latitude:38,longitude:-77},'away'],[{...good,latitude:NaN},'inaccurate'],[null,'no-location']]){
  assert.equal(locationStatus(point,points,now),status);
  const plan=recommendTour(campuses[0],profile,tourPoints.ucsd,point,now);
  assert.equal(plan.status,status);assert.equal(plan.startMeters,null);
 }
});

test('directory-only schools never use their institution centroid as a visitor entrance',()=>{
 const entry=directory.find(e=>e.coverage==='self-guided');
 const plan=recommendTour(selfGuidedCampus(entry),profile,{},position(tourPoints.ucsd.price),now);
 assert.equal(plan.status,'unmapped');assert.equal(plan.minutes,null);assert.equal(plan.meters,null);assert.equal(plan.startMeters,null);
 assert.ok(plan.stops.length>0);
});

test('mapped buildings have university provenance and distances use meters',()=>{
 assert.equal(metersBetween({latitude:0,longitude:0},{latitude:0,longitude:0}),0);
 assert.ok(Math.abs(metersBetween({latitude:0,longitude:0},{latitude:0,longitude:1})-111195)<2);
 for(const campus of campuses)for(const stop of campus.stops){
  const point=tourPoints[campus.id][stop.id];assert.ok(point);assert.ok(new URL(point.source).hostname.endsWith('.edu'));
  const url=new URL(walkingMapUrl(point));assert.equal(url.searchParams.get('travelmode'),'walking');assert.equal(url.searchParams.get('origin'),null);
 }
});

test('Meta receives bounded explicit preferences but never supplied GPS coordinates',()=>{
 const context=campusContext({campusId:'ucsd',stopId:'price',question:'What could I try?',major:'x'.repeat(200),interests:'y'.repeat(400),location:{latitude:12.34,longitude:56.78},latitude:12.34});
 assert.equal(context.input.major.length,120);assert.equal(context.input.interests.length,240);
 assert.doesNotMatch(JSON.stringify(context.input),/12\.34|56\.78|latitude|longitude/);
});
