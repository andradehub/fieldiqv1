import { createDatabase } from '../server/db.mjs';
import { createApp } from '../server/app.mjs';
let application;
export default async function handler(req,res){
  if(!application)application=createDatabase().then(createApp).catch(error=>{application=undefined;throw error;});
  try{return (await application)(req,res);}
  catch{res.statusCode=503;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:'Banco indisponível. Verifique a configuração do PostgreSQL no servidor.'}));}
}
