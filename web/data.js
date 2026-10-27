/** @typedef {{id:string,name:string,category:string,tags:string[],fact:string,prompt:string,source:string,sourceName:string}} Stop */
/** @typedef {{id:string,name:string,short:string,city:string,state:string,theme:string,description:string,visit:string,stops:Stop[]}} Campus */

export const reviewedAt = '2026-10-27';
/** @type {Campus[]} */
export const campuses = [
  {
    id:'ucsd',name:'UC San Diego',short:'UCSD',city:'La Jolla',state:'California',theme:'coast',
    description:'A little curiosity. A whole new coast.',visit:'https://admissions.ucsd.edu/visit/',
    stops:[
      {id:'geisel',name:'Geisel Library',category:'Study',tags:['study','arts'],fact:'The university library was renamed Geisel Library in 1995 in recognition of Audrey and Theodor Geisel. Its distinctive original building was later expanded with underground space.',prompt:'Imagine an afternoon between classes. Would you choose a quiet library or a lively shared space?',source:'https://geisel50.ucsd.edu/about/construction.html',sourceName:'UC San Diego · Geisel Library'},
      {id:'price',name:'Price Center',category:'Student life',tags:['community','commuter'],fact:'Price Center is one of UC San Diego’s two student-union facilities. Its directory lists a commuter lounge, kitchenette, group study rooms and student organization offices.',prompt:'Picture a gap between classes. What would you need here to feel settled?',source:'https://universitycenters.ucsd.edu/visit/directory.html',sourceName:'UC San Diego · Price Center directory'},
      {id:'jacobs',name:'Jacobs Hall',category:'Academics',tags:['engineering','science'],fact:'The Jacobs School of Engineering lists Jacobs Hall on its official directions page. Use the school’s visit information to arrange program-specific questions; a stop here does not guarantee lab or classroom access.',prompt:'Ask an engineering adviser: how do undergraduates join projects, and when can they start?',source:'https://jacobsschool.ucsd.edu/about/directions',sourceName:'UC San Diego · Jacobs School of Engineering'},
      {id:'student-center',name:'Student Center',category:'Community',tags:['community','arts'],fact:'University Centers identifies Student Center as UC San Diego’s original student union, founded in the 1960s. Price Center and Student Center together form its student-union facilities.',prompt:'What kind of community would you want to find in your first month?',source:'https://universitycenters.ucsd.edu/about-us/index.html',sourceName:'UC San Diego · University Centers'}
    ]
  },
  {
    id:'ut',name:'UT Austin',short:'UT Austin',city:'Austin',state:'Texas',theme:'austin',
    description:'Find your rhythm on the Forty Acres.',visit:'https://admissions.utexas.edu/explore/visit-campus/',
    stops:[
      {id:'pcl',name:'Perry-Castañeda Library',category:'Study',tags:['study','arts','science'],fact:'Perry-Castañeda Library is UT Austin’s flagship research library. It serves campus communities and the public, with resources across subject fields.',prompt:'What would help you focus here: a study group, a quiet corner, or a clear routine?',source:'https://www.lib.utexas.edu/visit-us/locations/pcl',sourceName:'UT Austin · University Libraries'},
      {id:'gates',name:'Gates Dell Complex',category:'Academics',tags:['engineering','science'],fact:'UT Austin’s official building directory lists the Gates Dell Complex on the main campus. For computer science program details and visits, confirm arrangements with the department.',prompt:'Ask a department adviser how students find collaborators and undergraduate research opportunities.',source:'https://utdirect.utexas.edu/apps/campus/buildings/information/nlogon/maps/UTM/GDC/',sourceName:'UT Austin · Building directory'},
      {id:'wcp',name:'Powers Student Activity Center',category:'Student life',tags:['community','commuter'],fact:'The William C. Powers, Jr. Student Activity Center is a University Unions facility. Its official page describes spaces and services supporting student activities.',prompt:'Imagine coming here after class. Which club or activity would you look for first?',source:'https://universityunions.utexas.edu/visit/wcp',sourceName:'UT Austin · University Unions'},
      {id:'union',name:'Texas Union',category:'Community',tags:['community','arts'],fact:'The Texas Union’s Hospitality Center provides information about the Unions, the university and Austin. Its official visit page is a starting point for checking available services.',prompt:'What would make a big university feel like your own neighborhood?',source:'https://universityunions.utexas.edu/visit/texas-union',sourceName:'UT Austin · Texas Union'}
    ]
  },
  {
    id:'uva',name:'University of Virginia',short:'UVA',city:'Charlottesville',state:'Virginia',theme:'grounds',
    description:'Picture your next chapter on Grounds.',visit:'https://admission.virginia.edu/visit',
    stops:[
      {id:'rotunda',name:'The Rotunda',category:'Campus story',tags:['arts','community'],fact:'The Rotunda was designed by Thomas Jefferson as an architectural and academic center for the university. Its official website provides information for visitors.',prompt:'Look around and imagine an ordinary weekday here. What stands out to you?',source:'https://rotunda.virginia.edu/',sourceName:'UVA · The Rotunda'},
      {id:'shannon',name:'Shannon Library',category:'Study',tags:['study','arts','science'],fact:'Shannon Library includes study spaces and is home to UVA’s Digital Humanities Center, including the Scholars’ Lab and the Institute for Advanced Technology in the Humanities.',prompt:'Would you want your study space to be quiet, collaborative, or a mix of both?',source:'https://library.virginia.edu/locations/shannon',sourceName:'UVA · Shannon Library'},
      {id:'newcomb',name:'Newcomb Hall',category:'Arrival',tags:['commuter','community'],fact:'UVA’s admissions visit page provides directions to Newcomb Hall from the Central Grounds Parking Garage, including an elevator option from the garage to the bookstore level.',prompt:'Rehearse arriving for a visit. What would you want to check before leaving home?',source:'https://admission.virginia.edu/visit',sourceName:'UVA · Undergraduate Admission'},
      {id:'peabody',name:'Peabody Hall',category:'Ask an adviser',tags:['engineering','science','community'],fact:'UVA’s Office of Undergraduate Admission is located in Peabody Hall. The official visit page also links to individual schools for program-specific tours and information sessions.',prompt:'Ask how your intended subject fits your first year, and which school can explain research opportunities.',source:'https://admission.virginia.edu/visit',sourceName:'UVA · Undergraduate Admission'}
    ]
  }
];
