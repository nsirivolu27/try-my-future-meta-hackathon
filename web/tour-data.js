/** Official map building points, reviewed 2026-10-27. These are not entrance pins.
 * @typedef {{latitude:number,longitude:number,label:string,source:string}} TourPoint */
const ucsd='https://admin-enterprise-gis.ucsd.edu/server/rest/services/BaseData/Campus_Map_Vector/MapServer/26';
const uva='https://fm-atlas.eservices.virginia.edu/server/rest/services/Public/PublicFacilitiesSearch/MapServer/0';
const ut='https://utdirect.utexas.edu/apps/campus/buildings/information/nlogon/maps/UTM/';
/** @type {Record<string,Record<string,TourPoint>>} */
export const tourPoints={
 ucsd:{
  geisel:{latitude:32.881178,longitude:-117.237592,label:'Geisel Library',source:ucsd},
  price:{latitude:32.879415,longitude:-117.236847,label:'Price Center West',source:ucsd},
  jacobs:{latitude:32.881662,longitude:-117.235288,label:'Jacobs Hall',source:ucsd},
  'student-center':{latitude:32.877242,longitude:-117.238819,label:'Student Center B',source:ucsd}
 },
 ut:{
  pcl:{latitude:30.282773,longitude:-97.738194,label:'Perry-Castañeda Library',source:ut+'PCL/'},
  gates:{latitude:30.28627118,longitude:-97.73650518,label:'Gates Dell Complex',source:ut+'GDC/'},
  wcp:{latitude:30.28488256,longitude:-97.73627810,label:'Powers Student Activity Center',source:ut+'WCP/'},
  union:{latitude:30.286660,longitude:-97.741220,label:'Texas Union',source:ut+'UNB/'}
 },
 uva:{
  rotunda:{latitude:38.035635,longitude:-78.503400,label:'The Rotunda',source:uva},
  shannon:{latitude:38.036622,longitude:-78.505238,label:'Shannon Library',source:uva},
  newcomb:{latitude:38.035808,longitude:-78.506673,label:'Newcomb Hall',source:uva},
  peabody:{latitude:38.035608,longitude:-78.506113,label:'Peabody Hall',source:uva}
 }
};
