import * as webpush from 'web-push';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import {projectRoot} from '../server/db.mjs';
const file=path.join(projectRoot,'.fieldiq','push-vapid.json');
try{await readFile(file);console.log('As chaves locais já existem em '+file+'. Nenhum segredo foi exibido ou substituído.');}
catch(error){
  if(error.code!=='ENOENT')throw error;
  const subject=process.env.VAPID_SUBJECT??process.argv.find(a=>a.startsWith('--contato='))?.slice(10);
  if(!subject||!(/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/.test(subject)||/^https:\/\//.test(subject)))throw Error('Informe VAPID_SUBJECT ou --contato=mailto:seu-email. Use o contato responsável pelo serviço.');
  await mkdir(path.dirname(file),{recursive:true});await writeFile(file,JSON.stringify({...webpush.generateVAPIDKeys(),subject},null,2),{flag:'wx',mode:0o600});console.log('Chaves locais criadas em '+file+'. Mantenha o arquivo privado. Em hospedagem, configure as variáveis VAPID no painel do provedor.');
}
