import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {projectRoot} from './db.mjs';
export async function loadLocalPushKeys(){
  if(process.env.VERCEL||process.env.VAPID_PUBLIC_KEY||process.env.VAPID_PRIVATE_KEY)return;
  try{const data=JSON.parse(await readFile(path.join(projectRoot,'.fieldiq','push-vapid.json'),'utf8'));process.env.VAPID_PUBLIC_KEY=data.publicKey;process.env.VAPID_PRIVATE_KEY=data.privateKey;process.env.VAPID_SUBJECT??=data.subject;}
  catch(error){if(error.code!=='ENOENT')throw Error('Arquivo local de chaves push inválido.');}
}
