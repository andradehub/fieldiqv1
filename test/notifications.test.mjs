import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createDatabase} from '../server/db.mjs';
import {createApp} from '../server/app.mjs';
import {notify} from '../server/notifications.mjs';
import {evaluateSla} from '../server/notification-jobs.mjs';
let db,server,base,tech,supervisor,other;
async function request(route,{cookie=tech,method='GET',body}={}){const r=await fetch(base+'/api'+route,{method,headers:{cookie,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
async function login(login){return (await request('/auth/login',{method:'POST',body:{login,senha:'tk2026'}})).cookie;}
const event=(key,extra={})=>({usuarios:['TK-CAP-001'],zona:'cap-04',tipo:'atribuicao',titulo:'Você recebeu um chamado',mensagem:'Confira o atendimento na sua área.',chave:key,...extra});
before(async()=>{db=await createDatabase({dataDir:'memory://',demo:true,expandedDemo:false});server=createApp(db).listen(0,'127.0.0.1');await once(server,'listening');base='http://127.0.0.1:'+server.address().port;tech=await login('tecnico.capital');supervisor=await login('supervisor.capital');other=await login('ana.capital');});
after(async()=>{await new Promise(r=>server.close(r));await db.close();});
test('central isola destinatário, zona e conta ativa; uma chave não duplica o mesmo evento',async()=>{
  const ids=await notify(db,event('unico',{usuarios:['TK-CAP-001','TK-CAP-SUP-01','TK-INT-001','TK-CAP-001']}));assert.equal(ids.length,2);assert.deepEqual(await notify(db,event('unico')),[]);
  const own=await request('/notificacoes');assert.equal(own.status,200);assert.equal(own.data.nao_lidas,1);assert.equal(own.data.notificacoes[0].titulo,'Você recebeu um chamado');assert.ok(!('usuario_matricula' in own.data.notificacoes[0]));
  assert.equal((await request('/notificacoes',{cookie:other})).data.total,0);
  assert.equal((await request('/notificacoes/'+own.data.notificacoes[0].id,{cookie:other,method:'PATCH',body:{lida:true}})).status,404);
  assert.equal((await request('/notificacoes',{cookie:''})).status,401);
  const client=await login('cliente.barra');assert.equal((await request('/notificacoes',{cookie:client})).status,403);
});
test('histórico pagina e alterna lida/não lida; marcar todas respeita a última notificação já vista',async()=>{
  for(let i=0;i<24;i++)await notify(db,event('pagina-'+i));
  const first=(await request('/notificacoes?limite=15')).data;assert.equal(first.notificacoes.length,15);assert.equal(first.paginas,2);
  const last=(await request('/notificacoes?pagina=2&limite=15')).data;assert.equal(last.notificacoes.length,10);
  assert.equal(new Set([...first.notificacoes,...last.notificacoes].map(n=>n.id)).size,25);
  const id=first.notificacoes[0].id;assert.equal((await request('/notificacoes/'+id,{method:'PATCH',body:{lida:true}})).status,200);
  assert.equal((await request('/notificacoes?status=nao_lidas')).data.nao_lidas,24);
  await request('/notificacoes/'+id,{method:'PATCH',body:{lida:false}});assert.equal((await request('/notificacoes')).data.nao_lidas,25);
  const [newId]=await notify(db,event('recebida-depois'));await request('/notificacoes/lidas',{method:'PATCH',body:{ate_id:first.ultima_id}});
  const unread=(await request('/notificacoes?status=nao_lidas')).data;assert.equal(unread.nao_lidas,1);assert.equal(unread.notificacoes[0].id,newId);
  assert.equal((await request('/notificacoes?limite=500')).status,400);
});
test('mudança de zona retira o acesso às notificações anteriores, mesmo conhecendo o id',async()=>{
  const data=(await request('/notificacoes',{cookie:supervisor})).data;const id=data.notificacoes[0].id;
  await db.query("UPDATE pessoas SET zona_id='int-01' WHERE matricula='TK-CAP-SUP-01'");
  assert.equal((await request('/notificacoes',{cookie:supervisor})).data.total,0);
  assert.equal((await request('/notificacoes/'+id,{cookie:supervisor,method:'PATCH',body:{lida:true}})).status,404);
  await db.query("UPDATE pessoas SET zona_id='cap-04' WHERE matricula='TK-CAP-SUP-01'");
});
test('atribuição, equipe e solicitação geram avisos para as pessoas corretas na mesma transação',async()=>{
  const client=await login('cliente.barra');
  const id=(await request('/chamados',{cookie:supervisor,method:'POST',body:{titulo:'Evento de atribuição',elevador_id:1}})).data.id;
  assert.ok((await request('/notificacoes',{cookie:supervisor})).data.notificacoes.some(n=>n.chamado_id===id&&n.tipo==='sem_responsavel'));
  await request('/chamados/'+id+'/equipe',{cookie:supervisor,method:'POST',body:{matricula:'TK-CAP-002'}});
  assert.ok((await request('/notificacoes',{cookie:other})).data.notificacoes.some(n=>n.chamado_id===id&&n.tipo==='atribuicao'&&!n.propria_acao));
  await request('/chamados/'+id+'/equipe',{cookie:supervisor,method:'POST',body:{matricula:'TK-CAP-001'}});
  const count=async()=>(await db.query("SELECT count(*)::int AS n FROM notificacoes WHERE chamado_id=$1 AND usuario_matricula='TK-CAP-001' AND tipo='equipe_inclusao'",[id])).rows[0].n;
  assert.equal(await count(),1);await request('/chamados/'+id+'/equipe',{cookie:supervisor,method:'POST',body:{matricula:'TK-CAP-001'}});assert.equal(await count(),1);
  const invalid=await request('/chamados/'+id+'/equipe',{cookie:supervisor,method:'POST',body:{matricula:'TK-INT-001'}});assert.equal(invalid.status,400);assert.equal(await count(),1);
  const pending=(await request('/portal/solicitacoes',{cookie:client,method:'POST',body:{titulo:'Aviso ao supervisor',descricao:'Exemplo fictício',elevador_id:1}})).data.id;
  await request('/portal/solicitacoes/'+pending+'/lembrete',{cookie:client,method:'POST'});
  const notices=(await request('/notificacoes',{cookie:supervisor})).data.notificacoes.filter(n=>n.solicitacao_id===pending);assert.deepEqual(notices.map(n=>n.tipo).sort(),['lembrete_cliente','nova_solicitacao']);
  const interior=await login('supervisor.interior');assert.ok(!(await request('/notificacoes',{cookie:interior})).data.notificacoes.some(n=>n.solicitacao_id===pending||n.chamado_id===id));
});
test('SLA dispara em 75% e vencimento uma vez por destinatário/prazo, sem alterar o chamado',async()=>{
  const id=(await request('/chamados',{cookie:supervisor,method:'POST',body:{titulo:'SLA determinístico',elevador_id:1,tecnico:'TK-CAP-001',sla_horas:4}})).data.id;
  const before=(await db.query('SELECT * FROM chamados WHERE id=$1',[id])).rows[0],opened=new Date(before.aberto_em).getTime();
  const notices=async()=>(await db.query("SELECT * FROM notificacoes WHERE chamado_id=$1 AND tipo IN ('sla_proximo','sla_vencido')",[id])).rows;
  await evaluateSla(db,{now:new Date(opened+3*3600000-1)});assert.equal((await notices()).length,0);
  await evaluateSla(db,{now:new Date(opened+3*3600000)});assert.equal((await notices()).length,3);
  await evaluateSla(db,{now:new Date(opened+3.5*3600000)});assert.equal((await notices()).length,3);
  await evaluateSla(db,{now:new Date(opened+4*3600000)});assert.equal((await notices()).filter(n=>n.tipo==='sla_vencido').length,3);
  await evaluateSla(db,{now:new Date(opened+4.1*3600000)});assert.equal((await notices()).length,6);
  assert.deepEqual((await db.query('SELECT * FROM chamados WHERE id=$1',[id])).rows[0],before);
  await db.query("UPDATE chamados SET status='resolvido',solucao='Solução fictícia',resolvido_em=now() WHERE id=$1",[id]);await evaluateSla(db,{now:new Date(opened+5*3600000)});assert.equal((await notices()).length,6);
});
test('rotina de servidor exige segredo próprio e não aceita uma sessão comum como autorização',async()=>{
  assert.equal((await request('/tarefas/notificacoes',{cookie:supervisor})).status,401);
  const previous=process.env.CRON_SECRET;process.env.CRON_SECRET='segredo-ficticio-com-mais-de-trinta-e-dois-caracteres';
  try{const r=await fetch(base+'/api/tarefas/notificacoes',{headers:{Authorization:'Bearer '+process.env.CRON_SECRET}});assert.equal(r.status,200);assert.ok('notificacoes_criadas' in await r.json());}finally{if(previous===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=previous;}
});
