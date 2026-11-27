import {test,before,after,beforeEach} from 'node:test';import assert from 'node:assert/strict';import {once} from 'node:events';import {randomBytes} from 'node:crypto';import * as webpush from 'web-push';
import {createDatabase} from '../server/db.mjs';import {createApp} from '../server/app.mjs';import {notify} from '../server/notifications.mjs';import {deliverPush} from '../server/push-delivery.mjs';
let db,server,base,tech,other,env;
const keys=webpush.generateVAPIDKeys(),receiver=webpush.generateVAPIDKeys(),sub={endpoint:'https://fcm.googleapis.com/fcm/send/exemplo-ficticio',keys:{p256dh:receiver.publicKey,auth:randomBytes(16).toString('base64url')},chave_publica:keys.publicKey};
async function request(route,{cookie=tech,method='GET',body}={}){const r=await fetch(base+'/api'+route,{method,headers:{cookie,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
before(async()=>{
 env=Object.fromEntries(['VAPID_PUBLIC_KEY','VAPID_PRIVATE_KEY','VAPID_SUBJECT'].map(k=>[k,process.env[k]]));Object.assign(process.env,{VAPID_PUBLIC_KEY:keys.publicKey,VAPID_PRIVATE_KEY:keys.privateKey,VAPID_SUBJECT:'mailto:demonstracao@example.com'});
 db=await createDatabase({dataDir:'memory://',demo:true,expandedDemo:false});server=createApp(db).listen(0,'127.0.0.1');await once(server,'listening');base='http://127.0.0.1:'+server.address().port;
 tech=(await request('/auth/login',{method:'POST',body:{login:'tecnico.capital',senha:'tk2026'}})).cookie;other=(await request('/auth/login',{method:'POST',body:{login:'ana.capital',senha:'tk2026'}})).cookie;
});
after(async()=>{await new Promise(r=>server.close(r));await db.close();for(const [k,v]of Object.entries(env)){if(v===undefined)delete process.env[k];else process.env[k]=v;}});
beforeEach(async()=>{await db.query('DELETE FROM entregas_push');await db.query('DELETE FROM notificacoes');await db.query('DELETE FROM inscricoes_push');await db.query("UPDATE pessoas SET zona_id='cap-04' WHERE matricula='TK-CAP-001'");});
const register=()=>request('/push/inscricoes',{method:'POST',body:sub});
async function event(key,extra={}){return (await notify(db,{usuarios:['TK-CAP-001'],zona:'cap-04',chamado:5,tipo:'atribuicao',titulo:'Cliente fictício, CPF 52998224725',mensagem:'Descrição privada que não pode aparecer no push.',chave:key,...extra}))[0];}
test('inscrição exige serviço HTTPS conhecido, chaves válidas e usuário autenticado, sem expor chave privada',async()=>{
 const config=(await request('/push/config')).data;assert.equal(config.disponivel,true);assert.equal(config.chave_publica,keys.publicKey);assert.ok(!JSON.stringify(config).includes(keys.privateKey));
 for(const endpoint of ['http://fcm.googleapis.com/x','https://127.0.0.1/x','https://fcm.googleapis.com.evil.example/x','https://usuario:senha@fcm.googleapis.com/x','https://fcm.googleapis.com:8080/x'])assert.equal((await request('/push/inscricoes',{method:'POST',body:{...sub,endpoint}})).status,400);
 assert.equal((await request('/push/inscricoes',{method:'POST',body:{...sub,keys:{...sub.keys,auth:'invalida'}}})).status,400);
 assert.equal((await request('/push/inscricoes',{cookie:'',method:'POST',body:sub})).status,401);assert.equal((await register()).status,201);
 assert.equal((await request('/push/inscricoes',{cookie:other,method:'POST',body:sub})).status,409);
 await request('/push/inscricoes',{cookie:other,method:'DELETE',body:{endpoint:sub.endpoint}});assert.equal((await request('/push/config')).data.dispositivos,1);
 assert.equal((await request('/push/estado',{cookie:other,method:'POST',body:{endpoint:sub.endpoint}})).data.vinculo,null);
});
test('fila só inclui eventos posteriores à ativação e envia payload genérico, sem duplicar o evento',async()=>{
 await event('anterior');assert.equal((await db.query('SELECT * FROM entregas_push')).rows.length,0);await register();const id=await event('novo');await event('novo');
 const calls=[];const result=await deliverPush(db,{send:async(...args)=>{calls.push(args);return {statusCode:201};}});assert.equal(result.enviadas,1);assert.equal(calls.length,1);
 const payload=JSON.parse(calls[0][1]);assert.equal(payload.id,id);assert.match(payload.vinculo,/^[a-f0-9]{48}$/);assert.ok(!calls[0][1].includes('52998224725')&&!calls[0][1].includes('Descrição privada')&&!calls[0][1].includes('Cliente fictício'));
 await deliverPush(db,{send:async()=>{throw Error('Não deve repetir');}});assert.equal((await db.query('SELECT estado FROM entregas_push')).rows[0].estado,'enviado');
});
test('notificação lida ou mudança de zona cancela envio pendente',async()=>{
 await register();const id=await event('lida');await request('/notificacoes/'+id,{method:'PATCH',body:{lida:true}});
 await deliverPush(db,{send:async()=>{throw Error('Aviso lido não deve sair');}});assert.equal((await db.query('SELECT estado FROM entregas_push')).rows[0].estado,'cancelado');
 await event('transferencia');await db.query("UPDATE pessoas SET zona_id='int-01' WHERE matricula='TK-CAP-001'");let sent=0;await deliverPush(db,{send:async()=>{sent++;}});assert.equal(sent,0);
});
test('falha transitória aguarda nova tentativa; inscrição expirada é retirada',async()=>{
 await register();await event('retry');const now=new Date();await deliverPush(db,{now,send:async()=>{throw {statusCode:503};}});
 const row=(await db.query('SELECT estado,tentativas,proxima_em FROM entregas_push')).rows[0];assert.equal(row.estado,'pendente');assert.equal(row.tentativas,1);assert.ok(new Date(row.proxima_em)>now);
 await deliverPush(db,{now:new Date(now.getTime()+120000),send:async()=>{throw {statusCode:410};}});assert.equal((await request('/push/config')).data.dispositivos,0);
});
test('aviso próprio não gera push redundante; teste é individual e tem intervalo mínimo',async()=>{
 await register();await event('propria',{ator:'TK-CAP-001'});assert.equal((await db.query('SELECT * FROM entregas_push')).rows.length,0);
 assert.equal((await request('/push/teste',{method:'POST'})).status,200);assert.equal((await request('/push/teste',{method:'POST'})).status,429);assert.equal((await db.query('SELECT * FROM entregas_push')).rows.length,1);
 await request('/push/inscricoes',{method:'DELETE',body:{endpoint:sub.endpoint}});assert.equal((await db.query('SELECT * FROM entregas_push')).rows.length,0);
});
test('transporte padrão cifra o conteúdo e usa prazo total e bloqueio de redirecionamento',async()=>{
  await register();await event('cifrada');const previous=globalThis.fetch;let captured;
  try{globalThis.fetch=async(url,options)=>{captured={url,options};return new Response('',{status:201});};assert.equal((await deliverPush(db)).enviadas,1);}
  finally{globalThis.fetch=previous;}
  assert.equal(captured.url,sub.endpoint);assert.equal(captured.options.redirect,'error');assert.equal(captured.options.headers['Content-Encoding']??captured.options.headers['content-encoding'],'aes128gcm');assert.ok(Buffer.isBuffer(captured.options.body));assert.ok(!captured.options.body.toString().includes('Abra o FieldIQ'));assert.ok(captured.options.signal instanceof AbortSignal);
});
test('troca de senha revoga sessões e inscrições de todos os dispositivos da conta',async()=>{
  const admin=(await request('/auth/login',{method:'POST',body:{login:'administrativo',senha:'tk2026'}})).cookie;
  assert.equal((await request('/usuarios',{cookie:admin,method:'POST',body:{matricula:'PUSH-RESET',nome:'Pessoa fictícia do teste',role:'tecnico',cpf:'52998224725',zona_id:'cap-04',login:'push.reset',senha:'senha-ficticia-push',ativo:true}})).status,201);
  const cookie=(await request('/auth/login',{method:'POST',body:{login:'push.reset',senha:'senha-ficticia-push'}})).cookie;
  assert.equal((await request('/push/inscricoes',{cookie,method:'POST',body:sub})).status,201);
  assert.equal((await request('/usuarios/PUSH-RESET',{cookie:admin,method:'PATCH',body:{senha:'outra-senha-ficticia-push'}})).status,200);
  assert.equal((await db.query("SELECT id FROM inscricoes_push WHERE usuario_matricula='PUSH-RESET'")).rows.length,0);assert.equal((await request('/push/config',{cookie})).status,401);
});
test('alterar o prazo cancela um alerta de SLA que ainda não saiu da fila',async()=>{
  await register();const c=(await db.query('SELECT aberto_em,sla_horas FROM chamados WHERE id=5')).rows[0],deadline=new Date(c.aberto_em).getTime()+c.sla_horas*3600000;
  await event('sla:5:75:'+deadline,{tipo:'sla_proximo'});
  try{await db.query('UPDATE chamados SET sla_horas=48 WHERE id=5');let sent=0;await deliverPush(db,{send:async()=>{sent++;}});assert.equal(sent,0);assert.equal((await db.query('SELECT estado FROM entregas_push')).rows[0].estado,'cancelado');}
  finally{await db.query('UPDATE chamados SET sla_horas=$1 WHERE id=5',[c.sla_horas]);}
});
