import {readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
let count=0;
async function check(directory){
  for(const entry of await readdir(directory,{withFileTypes:true})){
    const file=path.join(directory,entry.name);
    if(entry.isDirectory())await check(file);
    else if(/\.(mjs|js)$/.test(entry.name)){
      const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
      if(result.status!==0){console.error(result.stderr);process.exit(1);}
      count++;
    }
  }
}
for(const folder of ['server','api','scripts','fieldiqarchives/public/assets/js'])await check(path.join(root,folder));
const worker=spawnSync(process.execPath,['--check',path.join(root,'fieldiqarchives/public/sw.js')],{encoding:'utf8'});if(worker.status!==0){console.error(worker.stderr);process.exit(1);}count++;
console.log(count+' arquivos JavaScript verificados.');
