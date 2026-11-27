import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import { once } from 'node:events';
import { createDatabase, projectRoot } from '../server/db.mjs';
import { createApp } from '../server/app.mjs';

let db, server, base, technician, supervisor, otherTechnician;
async function request(route,{cookie,method='GET',body,origin}={}) {
  const response=await fetch(base+'/api'+route,{method,headers:{...(cookie?{cookie}:{}),...(body?{'Content-Type':'application/json'}:{}),...(origin?{origin}:{})},body:body?JSON.stringify(body):undefined});
  const content=response.headers.get('content-type')??'';
  return {status:response.status,data:content.includes('application/json')?await response.json():await response.text(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
async function login(login){const result=await request('/auth/login',{method:'POST',body:{login,senha:'tk2026'}});assert.equal(result.status,200);return result.cookie;}
before(async()=>{
  db=await createDatabase({dataDir:'memory://',demo:true,expandedDemo:false});
  server=createApp(db).listen(0,'127.0.0.1');
  await once(server,'listening');
  base='http://127.0.0.1:'+server.address().port;
  technician=await login('tecnico.capital');supervisor=await login('supervisor.capital');otherTechnician=await login('ana.capital');
});
after(async()=>{if(server)await new Promise(r=>server.close(r));if(db)await db.close();});

test('sessão autenticada e dados da região; sem senhas no navegador',async()=>{
  assert.equal((await request('/bootstrap')).status,401);
  assert.equal((await request('/auth/login',{method:'POST',body:{login:'tecnico.capital',senha:'errada'}})).status,401);
  const result=await request('/bootstrap',{cookie:technician});
  assert.equal(result.status,200);
  assert.ok(result.data.chamados.length);
  assert.ok(result.data.chamados.every(c=>c.zona_id==='cap-04'));
  assert.ok(result.data.pessoas.every(p=>p.zona_id==='cap-04'&&!('cpf' in p)));
  assert.ok(result.data.zonas.every(z=>z.id==='cap-04'));
  assert.ok(result.data.pessoas.every(p=>!('senha_hash' in p)));
  assert.ok(!('senha_hash' in result.data.user));
  const rejected=await request('/chamados',{cookie:supervisor,method:'POST',origin:'https://origem-invalida.example',body:{}});
  assert.equal(rejected.status,403);
});
test('técnico não administra banco, cria chamados ou altera outros responsáveis',async()=>{
  assert.equal((await request('/banco',{cookie:technician})).status,403);
  assert.equal((await request('/chamados',{cookie:technician,method:'POST',body:{}})).status,403);
  assert.equal((await request('/chamados/7',{cookie:technician,method:'PATCH',body:{revisao:1,descricao:'Não permitido'}})).status,403);
  assert.equal((await request('/chamados/14',{cookie:technician,method:'PATCH',body:{revisao:1,descricao:'Outra região'}})).status,404);
  assert.equal((await request('/equipe',{cookie:technician,method:'POST',body:{matricula:'TK-CAP-002'}})).status,403);
});
test('técnico encerra o próprio chamado com solução; SLA e histórico são calculados',async()=>{
  const created=await request('/chamados',{cookie:supervisor,method:'POST',body:{titulo:'Teste de SLA',elevador_id:1,tipo_obra:'mod_parcial',prioridade:'A',sla_horas:1,tecnico:'TK-CAP-001'}});
  assert.equal(created.status,201);
  const id=created.data.id;
  await db.query("UPDATE chamados SET aberto_em=now()-interval '2 days' WHERE id=$1",[id]);
  assert.equal((await request('/chamados/'+id,{cookie:technician,method:'PATCH',body:{revisao:1,status:'resolvido'}})).status,400);
  const closed=await request('/chamados/'+id,{cookie:technician,method:'PATCH',body:{revisao:1,status:'resolvido',solucao:'Solução fictícia registrada no teste.'}});
  assert.equal(closed.status,200);
  const row=(await db.query('SELECT * FROM vw_chamados_metricas WHERE id=$1',[id])).rows[0];
  assert.equal(row.sla_cumprido,false);
  assert.equal(row.status,'resolvido');
  assert.ok(row.resolvido_em);
  const audit=await db.query('SELECT * FROM historico_chamados WHERE chamado_id=$1 ORDER BY id',[id]);
  assert.equal(audit.rows.at(-1).usuario_matricula,'TK-CAP-001');
  assert.match(audit.rows.at(-1).alteracao,/resolvido/);
  assert.equal((await request('/chamados/'+id,{cookie:technician,method:'PATCH',body:{revisao:1,solucao:'Obsoleta'}})).status,409);
  assert.equal((await request('/chamados/'+id,{cookie:technician,method:'PATCH',body:{revisao:2,status:'aberto'}})).status,403);
  assert.equal((await request('/chamados/'+id,{cookie:supervisor,method:'PATCH',body:{revisao:2,status:'aberto'}})).status,200);
  const reopened=(await db.query('SELECT * FROM vw_chamados_metricas WHERE id=$1',[id])).rows[0];
  assert.equal(reopened.resolvido_em,null);assert.equal(reopened.sla_cumprido,null);
});
test('supervisor altera a própria zona e o banco impõe solução no encerramento',async()=>{
  assert.equal((await request('/chamados/9',{cookie:supervisor,method:'PATCH',body:{revisao:1,status:'aberto'}})).status,404);
  assert.equal((await request('/chamados/5',{cookie:technician,method:'PATCH',body:{revisao:1,tecnico:'TK-CAP-002'}})).status,403);
  await assert.rejects(db.query("UPDATE chamados SET status='resolvido',resolvido_em=now(),solucao=NULL WHERE id=5"),error=>error.code==='23514');
  const rejected=await request('/chamados',{cookie:supervisor,method:'POST',body:{titulo:'Outro local',elevador_id:3}});
  assert.equal(rejected.status,403);
});
test('recorrência usa evidências anteriores e prioriza o mesmo elevador na região',async()=>{
  const result=await request('/chamados/5/sugestao',{cookie:technician,method:'POST'});
  assert.equal(result.status,200);
  assert.equal(result.data.provedor,'local_tfidf');
  assert.equal(result.data.ocorrencias_mesmo_elevador,4);
  assert.ok(result.data.evidencias_ids.length>=4);
  assert.deepEqual(result.data.evidencias_ids.slice().sort((a,b)=>a-b),[1,2,3,4]);
  assert.ok(result.data.evidencias.every(e=>e.elevador_id!==5));
  assert.equal((await request('/chamados/5/sugestao',{cookie:technician,method:'POST'})).data.id,result.data.id);
  assert.equal((await request('/sugestoes/'+result.data.id+'/avaliacao',{cookie:otherTechnician,method:'POST',body:{util:true}})).status,403);
  assert.equal((await request('/sugestoes/'+result.data.id+'/avaliacao',{cookie:technician,method:'POST',body:{util:true}})).status,200);
  assert.equal((await db.query('SELECT util FROM avaliacoes_ia WHERE sugestao_id=$1',[result.data.id])).rows[0].util,true);
});
test('importação retirada: rotas e exemplos indisponíveis sem alterar dados existentes',async()=>{
  const counts=async()=>Promise.all(['pessoas','locais','elevadores','chamados','historico_chamados','importacoes','migracoes_legado','referencias_legado'].map(async table=>(await db.query('SELECT count(*) AS total FROM '+table)).rows[0].total));
  const before=await counts();
  for(const route of ['/importacoes','/importacoes/validar','/migracoes']){
    const result=await request(route,{cookie:supervisor,method:'POST',body:{nome:'retirado.json',formato:'json',linhas:[{elevador_codigo:'BAR-001',titulo:'Não deve ser criado'}],pacote:{formato:'fieldiq-legado-v1'},confirmar:true}});
    assert.equal(result.status,404,route);
  }
  assert.equal((await request('/migracoes',{cookie:supervisor})).status,404);
  for(const file of ['/exemplo-importacao.csv','/exemplo-migracao.json','/demonstracao-fieldiq.json'])assert.equal((await fetch(base+file)).status,404,file);
  const bootstrap=(await request('/bootstrap',{cookie:supervisor})).data;
  assert.ok(!Object.hasOwn(bootstrap,'importacoes'));
  const catalogue=(await request('/banco',{cookie:supervisor})).data;
  assert.ok(!catalogue.tabelas.some(table=>table.nome==='importacoes'));
  assert.deepEqual(await counts(),before);
});

test('consulta e exportação mostram dados reais sem sessões ou hashes',async()=>{
  const info=await request('/banco',{cookie:supervisor});
  assert.equal(info.status,200);assert.match(info.data.version,/PostgreSQL/);
  assert.equal(info.data.tabelas.find(t=>t.nome==='elevadores').total,2);
  const people=await request('/banco/pessoas',{cookie:supervisor});
  assert.ok(people.data.linhas.every(p=>!('senha_hash' in p)));
  assert.equal((await request('/banco/sessoes',{cookie:supervisor})).status,404);
  assert.equal((await request('/banco/constructor',{cookie:supervisor})).status,404);
  const dump=await request('/banco/export',{cookie:supervisor});
  assert.equal(dump.status,200);assert.match(dump.data,/INSERT INTO elevadores/);assert.ok(!dump.data.includes('scrypt:'));assert.ok(!dump.data.includes('INSERT INTO sessoes'));
});
test('dados persistem depois de fechar e reabrir o PostgreSQL local',async()=>{
  await mkdir(path.join(projectRoot,'test-results'),{recursive:true});
  const dir=await mkdtemp(path.join(projectRoot,'test-results','persist-'));
  let disk=await createDatabase({dataDir:dir,demo:true,expandedDemo:false});
  const ticket=(await disk.query('SELECT id,revisao FROM chamados WHERE id=5')).rows[0];
  await disk.query('UPDATE chamados SET descricao=$1 WHERE id=$2',['Persistência confirmada após reiniciar.',ticket.id]);
  await assert.rejects(createDatabase({dataDir:dir,demo:false}),/Banco local em uso/);
  await disk.close();
  disk=await createDatabase({dataDir:dir,demo:false});
  try { assert.equal((await disk.query('SELECT descricao FROM chamados WHERE id=5')).rows[0].descricao,'Persistência confirmada após reiniciar.'); }
  finally { await disk.close(); }
});
