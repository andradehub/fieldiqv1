import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createApp} from '../server/app.mjs';
import {createDatabase,projectRoot} from '../server/db.mjs';
let db,server,base,admin,ana,carlos,supervisor,interior,client;
async function request(route,{cookie=admin,method='GET',body}={}){
 const r=await fetch(base+'/api'+route,{method,headers:{cookie,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
}
async function login(login,senha='tk2026'){const r=await request('/auth/login',{method:'POST',body:{login,senha}});assert.equal(r.status,200);return r.cookie;}
before(async()=>{db=await createDatabase({dataDir:'memory://',demo:true});server=createApp(db).listen(0,'127.0.0.1');await once(server,'listening');base='http://127.0.0.1:'+server.address().port;admin=await login('administrativo');ana=await login('ana.capital');carlos=await login('tecnico.capital');supervisor=await login('supervisor.capital');interior=await login('supervisor.interior');client=await login('cliente.barra');});
after(async()=>{await new Promise(r=>server.close(r));await db.close();});
test('cargos são restritos ao perfil, incluindo estagiário de campo; nomes legados podem permanecer',async()=>{
 const post=body=>request('/usuarios',{method:'POST',body:{matricula:'INTERN-TEST',nome:'Estagiário fictício',role:'tecnico',cargo:'Estagiário de campo',cpf:'11144477735',login:'intern.teste',senha:'senha-estagiario-123',ativo:true,zona_id:'cap-04',...body}});
 assert.equal((await post({cargo:'Supervisor de Serviços'})).status,400);
 assert.equal((await post({cargo:'Cargo arbitrário'})).status,400);
 assert.equal((await post({})).status,201);
 const p=(await request('/usuarios')).data.usuarios.find(p=>p.matricula==='INTERN-TEST');assert.equal(p.cargo,'Estagiário de campo');
 assert.equal((await request('/usuarios/TK-CAP-002',{cookie:supervisor,method:'PATCH',body:{telefone:'(21) 00000-1234'}})).status,200);
});
test('equipe mantém responsável, permite períodos simultâneos e pausa apenas o técnico que acionou',async()=>{
 const created=await request('/chamados',{cookie:supervisor,method:'POST',body:{titulo:'Equipe compartilhada',elevador_id:1,tecnico:'TK-CAP-002',sla_horas:24}});const id=created.data.id;
 const current=async()=>(await db.query('SELECT * FROM vw_chamados_metricas WHERE id=$1',[id])).rows[0];
 const act=async(cookie,acao,solucao)=>request('/chamados/'+id+'/atendimento',{cookie,method:'POST',body:{acao,revisao:(await current()).revisao,solucao}});
 assert.equal((await act(ana,'iniciar')).status,200);
 assert.equal((await request('/chamados/'+id+'/equipe',{cookie:carlos,method:'POST',body:{matricula:'TK-CAP-003'}})).status,403);
 assert.equal((await request('/chamados/'+id+'/equipe',{cookie:interior,method:'POST'})).status,404);
 assert.equal((await request('/chamados/'+id+'/equipe',{cookie:carlos,method:'POST'})).status,200);
 assert.equal((await current()).tecnico_matricula,'TK-CAP-002');
 assert.ok((await current()).equipe_matriculas.includes('TK-CAP-001'));
 assert.equal((await act(carlos,'iniciar')).status,200);
 assert.equal((await db.query('SELECT id FROM atendimentos WHERE chamado_id=$1 AND encerrado_em IS NULL',[id])).rows.length,2);
 assert.equal((await request('/usuarios/TK-CAP-001',{method:'PATCH',body:{zona_id:'cap-03'}})).status,409);
 assert.equal((await act(carlos,'concluir','Tentativa')).status,403);
 assert.equal((await request('/chamados/'+id,{cookie:carlos,method:'PATCH',body:{revisao:(await current()).revisao,status:'resolvido',solucao:'Tentativa'}})).status,403);
 assert.equal((await act(carlos,'pausar')).status,200);
 assert.equal((await db.query('SELECT tecnico_matricula FROM atendimentos WHERE chamado_id=$1 AND encerrado_em IS NULL',[id])).rows[0].tecnico_matricula,'TK-CAP-002');
 assert.equal((await act(carlos,'iniciar')).status,200);
 assert.equal((await request('/chamados/'+id+'/equipe/TK-CAP-001',{cookie:carlos,method:'DELETE'})).status,200);
 assert.equal((await db.query("SELECT id FROM atendimentos WHERE chamado_id=$1 AND tecnico_matricula='TK-CAP-001' AND encerrado_em IS NULL",[id])).rows.length,0);
 assert.ok(!(await current()).equipe_matriculas.includes('TK-CAP-001'));
 assert.equal((await act(carlos,'iniciar')).status,403);
 const intern=await login('intern.teste','senha-estagiario-123');assert.equal((await request('/chamados/'+id+'/equipe',{cookie:intern,method:'POST'})).status,200);assert.equal((await act(intern,'iniciar')).status,200);
 assert.equal((await act(ana,'concluir','Solução fictícia aplicada pela equipe.')).status,200);
 assert.equal((await db.query('SELECT id FROM atendimentos WHERE chamado_id=$1 AND encerrado_em IS NULL',[id])).rows.length,0);
 const row=await current();assert.equal(row.sla_cumprido,true);assert.ok(row.resolvido_em);assert.equal(row.tecnico_matricula,'TK-CAP-002');
});
test('portal permite só elevadores vinculados e não revela o painel ou dados internos',async()=>{
 const own=(await request('/portal/bootstrap',{cookie:client})).data;assert.equal(own.locais.length,1);assert.ok(own.elevadores.every(e=>e.local_id===1));assert.ok(!('pessoas' in own));assert.ok(!('chamados' in own));
 for(const route of ['/usuarios','/banco','/chamados/5/anexos','/solicitacoes'])assert.equal((await request(route,{cookie:client})).status,403);
 assert.equal((await request('/portal/bootstrap',{cookie:carlos})).status,403);
 assert.equal((await request('/portal/solicitacoes',{cookie:client,method:'POST',body:{elevador_id:3,titulo:'Invasão',descricao:'Não permitido'}})).status,404);
 assert.equal((await request('/portal/solicitacoes',{cookie:client,method:'POST',body:{elevador_id:1,titulo:'A',descricao:'B',prioridade:'critica'}})).status,400);
});
test('liberar não conclui: encerra períodos, preserva o SLA e permite outro técnico assumir; supervisor também desatribui',async()=>{
 const created=await request('/chamados',{cookie:supervisor,method:'POST',body:{titulo:'Troca de responsabilidade',elevador_id:1,tecnico:'TK-CAP-002',sla_horas:1}}),id=created.data.id;
 await db.query("UPDATE chamados SET aberto_em=now()-interval '2 hours' WHERE id=$1",[id]);
 const current=async()=>(await db.query('SELECT * FROM vw_chamados_metricas WHERE id=$1',[id])).rows[0];
 const act=async(cookie,acao)=>request('/chamados/'+id+'/atendimento',{cookie,method:'POST',body:{acao,revisao:(await current()).revisao}});
 const responsibility=async(cookie,acao)=>request('/chamados/'+id+'/responsabilidade',{cookie,method:'POST',body:{acao,revisao:(await current()).revisao}});
 assert.equal((await act(ana,'iniciar')).status,200);
 assert.equal((await request('/chamados/'+id+'/equipe',{cookie:carlos,method:'POST'})).status,200);assert.equal((await act(carlos,'iniciar')).status,200);
 const opening=new Date((await current()).aberto_em).toISOString();
 assert.equal((await responsibility(carlos,'liberar')).status,403);
 assert.equal((await responsibility(ana,'liberar')).status,200);
 let row=await current();assert.equal(row.status,'aberto');assert.equal(row.tecnico_matricula,null);assert.equal(row.resolvido_em,null);assert.ok(row.sla_vencido);assert.equal(row.atendimento_ativo_desde,null);assert.equal(new Date(row.aberto_em).toISOString(),opening);
 assert.ok(!row.equipe_matriculas.includes('TK-CAP-002'));assert.ok(row.equipe_matriculas.includes('TK-CAP-001'));
 assert.equal((await responsibility(carlos,'assumir')).status,200);assert.equal((await responsibility(ana,'assumir')).status,409);
 assert.equal((await act(carlos,'iniciar')).status,200);
 row=await current();assert.equal((await request('/chamados/'+id,{cookie:supervisor,method:'PATCH',body:{revisao:row.revisao,tecnico:null,status:'em_andamento'}})).status,200);
 row=await current();assert.equal(row.status,'aberto');assert.equal(row.tecnico_matricula,null);assert.equal(row.atendimento_ativo_desde,null);assert.ok(row.sla_vencido);assert.equal(new Date(row.aberto_em).toISOString(),opening);
 assert.equal((await responsibility(ana,'assumir')).status,200);assert.equal((await current()).tecnico_matricula,'TK-CAP-002');
});
test('Administrativo cadastra cliente com vínculo; supervisor não cadastra nem amplia acesso de cliente',async()=>{
 const body={matricula:'CLI-TEST',nome:'Outro cliente fictício',role:'cliente',cargo:'Síndico',login:'cliente.teste',senha:'senha-cliente-123',ativo:true,locais_ids:[4],email:'cliente.teste@example.com'};
 assert.equal((await request('/usuarios',{cookie:supervisor,method:'POST',body})).status,403);
 assert.equal((await request('/usuarios',{method:'POST',body:{...body,locais_ids:[99999]}})).status,400);
 assert.equal((await request('/usuarios',{method:'POST',body})).status,201);
 const second=await login(body.login,body.senha);const own=(await request('/portal/bootstrap',{cookie:second})).data;assert.equal(own.locais[0].id,4);assert.ok(own.elevadores.every(e=>e.local_id===4));
});
test('solicitação, lembrete, triagem e encerramento preservam a abertura original no SLA',async()=>{
 const created=await request('/portal/solicitacoes',{cookie:client,method:'POST',body:{elevador_id:1,titulo:'Porta relatada pelo cliente',descricao:'Relato fictício do portal.'}});assert.equal(created.status,201);const id=created.data.id;
 assert.equal((await request('/portal/solicitacoes/'+id+'/lembrete',{cookie:await login('cliente.teste','senha-cliente-123'),method:'POST'})).status,404);
 assert.equal((await request('/portal/solicitacoes/'+id+'/lembrete',{cookie:client,method:'POST'})).status,201);
 assert.equal((await request('/portal/solicitacoes/'+id+'/lembrete',{cookie:client,method:'POST'})).status,429);
 assert.equal((await request('/solicitacoes',{cookie:interior})).data.solicitacoes.length,0);
 assert.equal((await request('/solicitacoes',{cookie:supervisor})).data.solicitacoes[0].total_lembretes,1);
 await db.query("UPDATE solicitacoes_clientes SET aberto_em=now()-interval '2 days' WHERE id=$1",[id]);
 const accepted=await request('/solicitacoes/'+id+'/triagem',{cookie:supervisor,method:'POST',body:{acao:'aceitar',tecnico:'TK-CAP-001',prioridade:'alta',sla_horas:24}});assert.equal(accepted.status,200);const call=accepted.data.chamado_id;
 const row=(await db.query('SELECT * FROM vw_chamados_metricas WHERE id=$1',[call])).rows[0];assert.ok(row.sla_vencido);assert.ok(new Date(row.aberto_em)<new Date(Date.now()-86400000));
 assert.equal((await request('/solicitacoes/'+id+'/triagem',{cookie:supervisor,method:'POST',body:{acao:'aceitar'}})).status,409);
 assert.equal((await request('/portal/solicitacoes/'+id+'/lembrete',{cookie:client,method:'POST'})).status,409);
 assert.equal((await request('/chamados/'+call+'/atendimento',{cookie:carlos,method:'POST',body:{acao:'concluir',revisao:row.revisao,solucao:'Solução fictícia registrada.'}})).status,200);
 const own=(await request('/portal/bootstrap',{cookie:client})).data.solicitacoes.find(s=>s.id===id);assert.equal(own.chamado_status,'resolvido');assert.ok(own.resolvido_em);assert.ok(!('solucao' in own));assert.ok(!('tecnico_matricula' in own));
});
