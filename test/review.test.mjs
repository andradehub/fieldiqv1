import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createDatabase} from '../server/db.mjs';
import {createApp} from '../server/app.mjs';
let db,server,base,admin,supervisor,tech,other;
async function request(route,{cookie=supervisor,method='GET',body,headers={}}={}){
  const response=await fetch(base+'/api'+route,{method,headers:{cookie,...(body?{'Content-Type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined});
  return {status:response.status,data:response.headers.get('content-type')?.includes('application/json')?await response.json():await response.text(),headers:response.headers};
}
async function login(login){const r=await request('/auth/login',{method:'POST',body:{login,senha:'tk2026'}});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];}
const current=async id=>(await db.query('SELECT * FROM vw_chamados_metricas WHERE id=$1',[id])).rows[0];
before(async()=>{
  db=await createDatabase({dataDir:'memory://',demo:true});server=createApp(db).listen(0,'127.0.0.1');await once(server,'listening');base='http://127.0.0.1:'+server.address().port;
  admin=await login('administrativo');supervisor=await login('supervisor.capital');tech=await login('tecnico.capital');other=await login('supervisor.interior');
});
after(async()=>{await new Promise(r=>server.close(r));await db.close();});
test('supervisor inclui o primeiro técnico sem responsável e depois amplia a equipe em andamento, com autoria e SLA preservados',async()=>{
  const created=await request('/chamados',{method:'POST',body:{titulo:'Inclusão pela supervisão',elevador_id:1,sla_horas:12,prioridade:'A'}});assert.equal(created.status,201);const id=created.data.id;
  const before=await current(id);assert.equal(before.tecnico_matricula,null);
  const add=(matricula,cookie=supervisor,revisao)=>request('/chamados/'+id+'/equipe',{cookie,method:'POST',body:{matricula,...(revisao===undefined?{}:{revisao})}});
  assert.equal((await add('TK-CAP-002',other)).status,404);
  assert.equal((await add('TK-CAP-002',tech)).status,403);
  assert.equal((await add('TK-INT-001')).status,400);
  const first=await add('TK-CAP-002',supervisor,before.revisao);assert.equal(first.status,200);assert.equal(first.data.responsavel,true);
  let c=await current(id);assert.equal(c.tecnico_matricula,'TK-CAP-002');assert.equal(c.status,'aberto');assert.equal(c.iniciado_em,null);assert.deepEqual(c.aberto_em,before.aberto_em);assert.equal(c.sla_horas,12);
  assert.equal((await add('TK-CAP-001',supervisor,before.revisao)).status,409);
  assert.equal((await request('/chamados/'+id+'/atendimento',{method:'POST',body:{acao:'iniciar',revisao:c.revisao}})).status,200);
  c=await current(id);assert.equal(c.status,'em_andamento');
  assert.equal((await add('TK-CAP-001',supervisor,c.revisao)).status,200);
  c=await current(id);assert.equal(c.status,'em_andamento');assert.equal(c.tecnico_matricula,'TK-CAP-002');assert.ok(c.equipe_matriculas.includes('TK-CAP-001'));assert.deepEqual(c.aberto_em,before.aberto_em);
  const count=async()=>(await db.query('SELECT count(*)::int AS n FROM historico_chamados WHERE chamado_id=$1',[id])).rows[0].n;
  const priorCount=await count();assert.equal((await add('TK-CAP-001')).status,200);assert.equal(await count(),priorCount);
  const history=(await db.query("SELECT h.alteracao,p.login,h.data FROM historico_chamados h JOIN pessoas p ON p.matricula=h.usuario_matricula WHERE h.chamado_id=$1 AND (h.alteracao LIKE 'Responsável principal definido%' OR h.alteracao LIKE 'Participante adicionado%')",[id])).rows;
  assert.equal(history.length,2);assert.ok(history.every(h=>h.login==='supervisor.capital'&&h.data));
  assert.equal((await request('/chamados/'+id+'/equipe/TK-CAP-001',{method:'DELETE'})).status,200);
  assert.ok(!(await current(id)).equipe_matriculas.includes('TK-CAP-001'));
});
test('gestão recupera chamado em andamento sem responsável e mantém encerrados sem novas inclusões',async()=>{
  const id=(await request('/chamados',{method:'POST',body:{titulo:'Órfão legado',elevador_id:1}})).data.id;
  await db.query("UPDATE chamados SET status='em_andamento' WHERE id=$1",[id]);
  const result=await request('/chamados/'+id+'/equipe',{method:'POST',body:{matricula:'TK-CAP-001'}});assert.equal(result.status,200);assert.equal((await current(id)).status,'aberto');
  assert.equal((await request('/chamados/1/equipe',{method:'POST',body:{matricula:'TK-CAP-002'}})).status,409);
});
test('perfil detalhado respeita zona e conta própria; mantém períodos de quem já saiu da equipe',async()=>{
  const id=(await request('/chamados',{method:'POST',body:{titulo:'Histórico individual preservado',elevador_id:1,tecnico:'TK-CAP-002'}})).data.id;
  await request('/chamados/'+id+'/equipe',{method:'POST',body:{matricula:'TK-CAP-001'}});
  const c=await current(id);await request('/chamados/'+id+'/atendimento',{cookie:tech,method:'POST',body:{acao:'iniciar',revisao:c.revisao}});
  await db.query("UPDATE atendimentos SET iniciado_em=now()-interval '5 minutes' WHERE chamado_id=$1",[id]);
  await request('/chamados/'+id+'/equipe/TK-CAP-001',{cookie:tech,method:'DELETE'});
  const profile=await request('/tecnicos/TK-CAP-001');assert.equal(profile.status,200);assert.ok(profile.data.chamados.find(c=>c.id===id).segundos_do_tecnico>=300);
  assert.ok(!('cpf' in profile.data.pessoa)&&!('login' in profile.data.pessoa));assert.ok(profile.data.chamados.every(c=>c.zona_id==='cap-04'));
  assert.equal((await request('/tecnicos/TK-CAP-001',{cookie:tech})).status,200);
  assert.equal((await request('/tecnicos/TK-CAP-002',{cookie:tech})).status,404);
  assert.equal((await request('/tecnicos/TK-CAP-001',{cookie:other})).status,404);
  assert.equal((await request('/tecnicos/TK-INT-001',{cookie:admin})).status,200);
});
test('campos privados não chegam ao supervisor nem via sessão, consulta de banco ou exportação',async()=>{
  await db.query("UPDATE pessoas SET cpf='52998224725',email='privacidade@example.com' WHERE matricula='TK-CAP-001'");
  const forbidden=['cpf','cpf_mascarado','login','senha_hash','token_hash'];
  const bootstrap=(await request('/bootstrap')).data;
  for(const row of [bootstrap.user,...bootstrap.pessoas,...(await request('/usuarios')).data.usuarios,...(await request('/banco/pessoas')).data.linhas])assert.ok(forbidden.every(key=>!(key in row)));
  const contacts=(await request('/usuarios')).data.usuarios.find(p=>p.matricula==='TK-CAP-001');assert.equal(contacts.email,'privacidade@example.com');
  assert.ok((await request('/banco/pessoas')).data.colunas.every(c=>!forbidden.includes(c.column_name)));
  const exported=(await request('/banco/export')).data;assert.ok(!exported.includes('52998224725')&&!exported.includes('tecnico.capital')&&!exported.includes('scrypt:'));
  assert.equal((await request('/usuarios/TK-CAP-001',{method:'PATCH',body:{ativo:false}})).status,403);
});
test('SQL injection no login, acesso sem sessão, origem externa e nome de tabela arbitrário são recusados',async()=>{
  const injection=await request('/auth/login',{method:'POST',body:{login:"' OR 1=1 --",senha:'qualquer'}});assert.equal(injection.status,401);assert.equal(injection.headers.get('set-cookie'),null);
  assert.equal((await request('/bootstrap',{cookie:''})).status,401);
  assert.equal((await request('/chamados',{method:'POST',body:{titulo:'Não criar',elevador_id:1},headers:{Origin:'https://origem-externa.example'}})).status,403);
  assert.equal((await request('/banco/'+encodeURIComponent('pessoas;DROP TABLE chamados'))).status,404);
  const response=await fetch(base);assert.match(response.headers.get('content-security-policy'),/script-src 'self'/);assert.match(response.headers.get('content-security-policy'),/object-src 'none'/);
  assert.equal(response.headers.get('x-content-type-options'),'nosniff');
});
