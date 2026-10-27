import {mkdir,cp,readdir,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const web=resolve(root,'web');
for(const file of await readdir(web)) if(file.endsWith('.js')) {
  const {spawnSync}=await import('node:child_process');
  const result=spawnSync(process.execPath,['--check',resolve(web,file)],{stdio:'inherit'});
  if(result.status!==0) process.exit(result.status??1);
}
for(const destination of ['dist','android/app/src/main/assets/site']) {
  await mkdir(resolve(root,destination),{recursive:true});
  await cp(web,resolve(root,destination),{recursive:true,filter:source=>!source.endsWith('.d.ts')});
}
console.log('Built browser preview and bundled Android assets. No web dependencies.');
