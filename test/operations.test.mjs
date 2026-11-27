import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {readFile,mkdtemp,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createDatabase,projectRoot} from '../server/db.mjs';
import {createApp,exportDomainSQL} from '../server/app.mjs';
import {dashboardData} from '../fieldiqarchives/public/assets/js/views/dashboard.js';
import {state} from '../fieldiqarchives/public/assets/js/core/state.js';
import {validCPF} from '../server/users.mjs';
let db,server,base,admin,supervisor,tech,ana,interior;
async function call(route,{cookie=admin,body,method='GET',bytes,name}={}){
  const r=await fetch(base+'/api'+route,{method,headers:{cookie,...(body?{'Content-Type':'application/json'}:{}),...(bytes?{'Content-Type':'application/octet-stream','X-File-Name':encodeURIComponent(name)}:{})},body:bytes??(body?JSON.stringify(body):undefined)});
  return {status:r.status,data:r.headers.get('content-type')?.includes('application/json')?await r.json():await r.arrayBuffer(),cookie:r.headers.get('set-cookie')?.split(';')[0],headers:r.headers};
}
async function login(who,password='tk2026'){const r=await call('/auth/login',{method:'POST',body:{login:who,senha:password}});assert.equal(r.status,200);return r.cookie;}
before(async()=>{
  db=await createDatabase({dataDir:'memory://',demo:true});server=createApp(db).listen(0,'127.0.0.1');await once(server,'listening');base='http://127.0.0.1:'+server.address().port;
  admin=await login('administrativo');supervisor=await login('supervisor.capital');tech=await login('tecnico.capital');ana=await login('ana.capital');interior=await login('supervisor.interior');
});
after(async()=>{if(server)await new Promise(r=>server.close(r));if(db)await db.close();});

test('zona isola consultas, exportação, IA, banco e acessos diretos; Administrativo vê todas',async()=>{
  for(const cookie of [tech,supervisor]){
    const data=(await call('/bootstrap',{cookie})).data;
    assert.ok(data.chamados.every(c=>c.zona_id==='cap-04'));assert.equal(data.zonas.length,1);
    assert.ok(data.pessoas.every(p=>p.zona_id==='cap-04'&&!('cpf' in p)&&!('email' in p)));
    assert.equal((await call('/chamados/9/anexos',{cookie})).status,404);
    assert.equal((await call('/chamados/9/atendimentos',{cookie})).status,404);
    assert.equal((await call('/chamados/9/sugestao',{cookie,method:'POST'})).status,404);
  }
  assert.equal((await call('/bootstrap')).data.zonas.length,10);
  assert.equal((await call('/usuarios',{cookie:tech})).status,403);
  assert.ok((await call('/banco/elevadores',{cookie:supervisor})).data.linhas.every(e=>e.codigo.startsWith('BAR-')));
});
const person={matricula:'NOVO-001',nome:'Pessoa de teste fictícia',role:'tecnico',cargo:'Técnico de manutenção',cpf:'529.982.247-25',email:'pessoa@example.com',telefone:'(21) 00000-0000',zona_id:'cap-04',login:'pessoa.teste',senha:'senha-ficticia-123',ativo:true,admissao:'2026-01-02'};
test('apenas Administrativo cadastra e edita; supervisor consulta contatos sem CPF ou login',async()=>{
  assert.ok(validCPF(person.cpf));assert.ok(!validCPF('11111111111'));
  assert.equal((await call('/usuarios',{cookie:supervisor,method:'POST',body:{...person,zona_id:'int-01'}})).status,403);
  assert.equal((await call('/usuarios',{cookie:supervisor,method:'POST',body:{...person,role:'supervisor'}})).status,403);
  assert.equal((await call('/usuarios',{cookie:supervisor,method:'POST',body:{...person,cpf:'00000000000'}})).status,403);
  assert.equal((await call('/usuarios',{cookie:supervisor,method:'POST',body:person})).status,403);
  assert.equal((await call('/usuarios',{method:'POST',body:{...person,cpf:'00000000000'}})).status,400);
  assert.equal((await call('/usuarios',{method:'POST',body:person})).status,201);
  const p=(await db.query('SELECT * FROM pessoas WHERE matricula=$1',[person.matricula])).rows[0];
  assert.match(p.senha_hash,/^scrypt:/);assert.notEqual(p.senha_hash,person.senha);assert.equal(p.cpf,'52998224725');
  const users=(await call('/usuarios',{cookie:supervisor})).data.usuarios;
  assert.ok(users.every(u=>u.role==='tecnico'&&u.zona_id==='cap-04'&&!('cpf' in u)&&!('cpf_mascarado' in u)&&!('login' in u)&&!('senha_hash' in u)));
  assert.equal(users.find(u=>u.matricula===person.matricula).email,'pessoa@example.com');
  assert.equal((await call('/usuarios')).data.usuarios.find(u=>u.matricula===person.matricula).cpf_mascarado,'***.***.***-25');
  const cookie=await login(person.login,person.senha);assert.ok(!('cpf' in (await call('/bootstrap',{cookie})).data.user));
  assert.equal((await call('/usuarios/'+person.matricula,{cookie:supervisor,method:'PATCH',body:{zona_id:'cap-02'}})).status,403);
  assert.equal((await call('/equipe',{cookie:supervisor,method:'POST',body:{matricula:person.matricula}})).status,403);
  assert.equal((await call('/usuarios/'+person.matricula,{cookie:supervisor,method:'PATCH',body:{email:'atualizado@example.com'}})).status,403);
  assert.equal((await call('/usuarios/'+person.matricula,{method:'PATCH',body:{email:'atualizado@example.com'}})).status,200);
  assert.equal((await call('/usuarios/'+person.matricula,{cookie:interior,method:'PATCH',body:{nome:'Tentativa'}})).status,403);
  assert.equal((await call('/usuarios',{method:'POST',body:{...person,matricula:'INVALID-ADM',role:'administrativo'}})).status,403);
});
test('Administrativo cadastra supervisor em outra região; transferência preserva pendências e revoga sessões',async()=>{
  assert.equal((await call('/usuarios',{method:'POST',body:{...person,cpf:'11144477735',matricula:'SUP-TEST',login:'supervisor.teste',role:'supervisor',cargo:'Supervisor de operações',zona_id:'int-02',email:'sup@example.com'}})).status,201);
  assert.equal((await call('/usuarios/TK-CAP-001',{method:'PATCH',body:{zona_id:'cap-02'}})).status,409);
  assert.equal((await call('/usuarios/'+person.matricula,{method:'PATCH',body:{zona_id:'int-01'}})).status,200);
  assert.equal((await call('/bootstrap',{cookie:await login(person.login,person.senha)})).data.user.zona_id,'int-01');
  assert.equal((await call('/usuarios/TK-CAP-SUP-01',{cookie:supervisor,method:'PATCH',body:{role:'administrativo'}})).status,403);
  assert.equal((await call('/usuarios/ADM-DEMO-001',{method:'PATCH',body:{ativo:false}})).status,409);
  assert.equal((await call('/usuarios/ADM-DEMO-001',{method:'PATCH',body:{role:'tecnico',zona_id:'cap-04'}})).status,409);
});
test('anexos são autenticados, validados por conteúdo e limitados ao responsável; exclusão tem autoria',async()=>{
  const bytes=Buffer.from('%PDF-1.4\nArquivo fictício de teste\n%%EOF');
  assert.equal((await call('/chamados/5/anexos',{cookie:ana,method:'POST',bytes,name:'relatorio.pdf'})).status,403);
  assert.equal((await call('/chamados/5/anexos',{cookie:tech,method:'POST',bytes:Buffer.from('<html>script</html>'),name:'falso.png'})).status,400);
  const r=await call('/chamados/5/anexos',{cookie:tech,method:'POST',bytes,name:'relatório.pdf'});assert.equal(r.status,201);const id=r.data.id;
  assert.equal((await call('/chamados/5/anexos',{cookie:tech,method:'POST',bytes,name:'duplicado.pdf'})).status,409);
  assert.equal((await call('/chamados/5/anexos',{cookie:tech,method:'POST',bytes:Buffer.alloc(2097153),name:'grande.pdf'})).status,413);
  const list=(await call('/chamados/5/anexos',{cookie:tech})).data.anexos;assert.equal(list.length,1);assert.ok(!('conteudo' in list[0]));
  const file=await call('/anexos/'+id+'/arquivo',{cookie:tech});assert.equal(file.status,200);assert.deepEqual(Buffer.from(file.data),bytes);assert.match(file.headers.get('content-disposition'),/^attachment/);
  assert.equal((await call('/anexos/'+id+'/arquivo',{cookie:interior})).status,404);
  assert.equal((await call('/anexos/'+id,{cookie:ana,method:'DELETE'})).status,403);
  assert.equal((await call('/anexos/'+id,{cookie:tech,method:'DELETE'})).status,200);
  assert.ok((await db.query('SELECT alteracao FROM historico_chamados WHERE chamado_id=5')).rows.some(r=>r.alteracao==='Anexo excluído: relatório.pdf'));
});
test('início, pausa, retomada, conclusão e reabertura mantêm SLA, tempos e taxa de resolução coerentes',async()=>{
  const id=(await call('/chamados',{cookie:supervisor,method:'POST',body:{titulo:'Ciclo cronometrado',elevador_id:1,tecnico:'TK-CAP-001',sla_horas:1}})).data.id;
  await db.query("UPDATE chamados SET aberto_em=now()-interval '3 hours' WHERE id=$1",[id]);
  const act=(acao,revisao,solucao)=>call('/chamados/'+id+'/atendimento',{cookie:tech,method:'POST',body:{acao,revisao,solucao}});
  assert.equal((await act('iniciar',1)).status,200);assert.equal((await act('iniciar',2)).status,409);
  let row=(await db.query('SELECT * FROM vw_chamados_metricas WHERE id=$1',[id])).rows[0];assert.ok(row.iniciado_em&&row.atendimento_ativo_desde&&row.sla_vencido);
  await db.query("UPDATE atendimentos SET iniciado_em=now()-interval '10 minutes' WHERE chamado_id=$1 AND encerrado_em IS NULL",[id]);
  assert.equal((await act('pausar',2)).status,200);
  row=(await db.query('SELECT * FROM vw_chamados_metricas WHERE id=$1',[id])).rows[0];assert.equal(row.atendimento_ativo_desde,null);assert.ok(row.sla_vencido);assert.ok(Number(row.tempo_atendimento_seg)>=600);
  assert.equal((await act('iniciar',3)).status,200);
  assert.equal((await act('concluir',4,'')).status,400);
  assert.equal((await act('concluir',4,'Solução fictícia documentada.')).status,200);
  row=(await db.query('SELECT * FROM vw_chamados_metricas WHERE id=$1',[id])).rows[0];assert.equal(row.status,'resolvido');assert.ok(row.resolvido_em);assert.equal(row.sla_cumprido,false);assert.equal(row.sla_vencido,false);assert.ok(row.tempo_resolucao_min>=180);assert.equal(row.atendimento_ativo_desde,null);
  assert.equal((await db.query('SELECT * FROM atendimentos WHERE chamado_id=$1 AND encerrado_em IS NULL',[id])).rows.length,0);
  const beforeTime=Number(row.tempo_atendimento_seg);
  state.chamados=(await call('/bootstrap',{cookie:supervisor})).data.chamados;state.ui.period='all';let metrics=dashboardData();assert.ok(metrics.resolved.some(c=>c.id===id));
  assert.equal((await call('/chamados/'+id,{cookie:supervisor,method:'PATCH',body:{revisao:5,status:'aberto'}})).status,200);
  state.chamados=(await call('/bootstrap',{cookie:supervisor})).data.chamados;metrics=dashboardData();assert.ok(!metrics.resolved.some(c=>c.id===id));assert.ok(metrics.pending.some(c=>c.id===id));
  row=(await db.query('SELECT * FROM vw_chamados_metricas WHERE id=$1',[id])).rows[0];assert.equal(row.resolvido_em,null);assert.equal(row.sla_cumprido,null);assert.ok(row.sla_vencido);assert.equal(Number(row.tempo_atendimento_seg),beforeTime);
});
test('exportação de domínio restaura estrutura e vínculos sem divulgar CPF ou credenciais',async()=>{
  const sql=await exportDomainSQL(db,{role:'supervisor',zona_id:'cap-04'});
  assert.ok(!sql.includes('52998224725'));assert.ok(!sql.includes(person.senha));assert.ok(!sql.includes('scrypt:'));assert.ok(!sql.includes('pessoa@example.com'));
  const {PGlite}=await import('@electric-sql/pglite');const target=await PGlite.create('memory://');
  try{await target.exec(sql);assert.ok((await target.query('SELECT id FROM fieldiq.chamados')).rows.length);}finally{await target.close();}
});
test('migração de esquema preserva banco da versão anterior e não reaplica alterações',async()=>{
  await mkdir(path.join(projectRoot,'test-results'),{recursive:true});const folder=await mkdtemp(path.join(projectRoot,'test-results','upgrade-'));
  const {PGlite}=await import('@electric-sql/pglite');let old=await PGlite.create(folder);
  await old.exec(await readFile(path.join(projectRoot,'database/001-schema.sql'),'utf8'));
  await old.query("INSERT INTO pessoas(matricula,nome,role,cargo,regiao) VALUES ('OLD-001','Usuário existente','tecnico','Técnico','capital')");
  await old.query("INSERT INTO zonas VALUES ('old','capital','Zona existente','Local existente')");
  await old.query("INSERT INTO locais(nome,endereco,bairro,zona_id) VALUES ('Local preservado','Endereço fictício','Bairro','old')");
  await old.query("INSERT INTO elevadores(codigo,local_id,fabricante,modelo,numero_serie,capacidade_kg) VALUES ('OLD-001',1,'Fictício','Modelo','OLD-SERIE',600)");
  for(const prioridade of ['critica','alta','media','baixa'])await old.query("INSERT INTO chamados(elevador_id,titulo,descricao,tipo_obra,prioridade,status,sla_horas,criado_por,tecnico_matricula) VALUES (1,$1,'Descrição preservada','mod_parcial',$2,'aberto',12,'OLD-001','OLD-001')",['Chamado '+prioridade,prioridade]);
  const before=(await old.query('SELECT * FROM chamados ORDER BY id')).rows;await old.close();
  let upgraded=await createDatabase({dataDir:folder,demo:false});assert.equal((await upgraded.query("SELECT nome FROM pessoas WHERE matricula='OLD-001'")).rows[0].nome,'Usuário existente');
  const migrated=(await upgraded.query('SELECT * FROM chamados ORDER BY id')).rows;
  assert.deepEqual(migrated.map(c=>c.prioridade),['A','A','B','C']);
  for(let i=0;i<before.length;i++)for(const key of Object.keys(before[i]).filter(k=>k!=='prioridade'))assert.deepEqual(migrated[i][key],before[i][key],'Migração alterou '+key);
  await upgraded.close();
  upgraded=await createDatabase({dataDir:folder,demo:false});try{assert.equal((await upgraded.query('SELECT * FROM schema_migrations')).rows.length,7);}finally{await upgraded.close();}
});
