/** The provider defines available features; connectivity is reported separately.
 * @param {string} provider */
export function deviceCapabilities(provider){
 return {audio:true,camera:provider==='meta',label:provider==='meta'?'Meta camera + audio':'Bluetooth audio'};
}
