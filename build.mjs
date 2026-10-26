import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const root=fileURLToPath(new URL('.',import.meta.url));
for(const [folder,args] of [['galleries',['node_modules/typescript/bin/tsc','--noEmit']],['galleries',['scripts/run-framework.mjs','build']],['galleries',['scripts/build-client.mjs']],['galleries',['scripts/build-portfolio.mjs']],['website',['build.mjs']]]){
 console.log('Building '+folder+': '+args.join(' '));
 const result=spawnSync(process.execPath,args,{cwd:resolve(root,folder),stdio:'inherit'});
 if(result.error)throw result.error;if(result.status!==0)process.exit(result.status||1);
}
console.log('Both applications and browser renderers built. Hosting and access checks are still required.');
