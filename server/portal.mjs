import {insist,text,integer,supervisor,scopeParams,isAdmin} from './permissions.mjs';
import {notify,managers} from './notifications.mjs';
const details=`SELECT s.*,e.codigo AS elevador_codigo,l.id AS local_id,l.nome AS local_nome,l.zona_id,p.nome AS cliente_nome,c.status AS chamado_status,c.resolvido_em,c.sla_horas,c.sla_cumprido,c.sla_vencido,c.tempo_resolucao_min,
  (SELECT count(*)::integer FROM lembretes_solicitacoes r WHERE r.solicitacao_id=s.id) AS total_lembretes,
  (SELECT max(r.data) FROM lembretes_solicitacoes r WHERE r.solicitacao_id=s.id) AS ultimo_lembrete
  FROM solicitacoes_clientes s JOIN elevadores e ON e.id=s.elevador_id JOIN locais l ON l.id=e.local_id JOIN pessoas p ON p.matricula=s.cliente_matricula LEFT JOIN vw_chamados_metricas c ON c.id=s.chamado_id`;
function client(user){insist(user.role==='cliente',403,'Esta área é exclusiva do cliente.');}
async function ownRequest(db,id,user,lock=false){
  client(user);
  if(lock)await db.query('SELECT id FROM solicitacoes_clientes WHERE id=$1 FOR UPDATE',[integer(id,'Solicitação')]);
  const r=(await db.query(details+' WHERE s.id=$1 AND s.cliente_matricula=$2 AND EXISTS(SELECT 1 FROM cliente_locais cl WHERE cl.cliente_matricula=$2 AND cl.local_id=l.id)',[integer(id,'Solicitação'),user.matricula])).rows[0];
  insist(r,404,'Solicitação não encontrada.');return r;
}
export async function internalRequests(db,user){return (await db.query(details+' WHERE ($1::boolean OR l.zona_id=$2) ORDER BY s.aberto_em DESC,s.id DESC',scopeParams(user))).rows;}
export function registerPortalRoutes(api,db,insertTicket){
  api.get('/portal/bootstrap',async(req,res)=>{
    client(req.user);
    const locals=(await db.query('SELECT l.* FROM locais l JOIN cliente_locais cl ON cl.local_id=l.id WHERE cl.cliente_matricula=$1 ORDER BY l.nome',[req.user.matricula])).rows;
    const lifts=(await db.query('SELECT e.id,e.codigo,e.modelo,e.fabricante,e.local_id,e.ativo,l.nome AS local_nome FROM elevadores e JOIN locais l ON l.id=e.local_id JOIN cliente_locais cl ON cl.local_id=l.id WHERE cl.cliente_matricula=$1 ORDER BY e.codigo',[req.user.matricula])).rows;
    const requests=(await db.query(details+' WHERE s.cliente_matricula=$1 AND EXISTS(SELECT 1 FROM cliente_locais cl WHERE cl.cliente_matricula=$1 AND cl.local_id=l.id) ORDER BY s.aberto_em DESC,s.id DESC',[req.user.matricula])).rows;
    // No technician directory, internal notes, credentials, diagnosis or workforce metrics.
    const safe=requests.map(({id,elevador_id,elevador_codigo,local_nome,titulo,descricao,status,aberto_em,triado_em,retorno,chamado_id,chamado_status,resolvido_em,total_lembretes,ultimo_lembrete})=>({id,elevador_id,elevador_codigo,local_nome,titulo,descricao,status,aberto_em,triado_em,retorno,chamado_id,chamado_status,resolvido_em,total_lembretes,ultimo_lembrete}));
    res.json({user:req.user,locais:locals,elevadores:lifts,solicitacoes:safe});
  });
  api.post('/portal/solicitacoes',async(req,res)=>{
    client(req.user);
    insist(Object.keys(req.body).every(k=>['elevador_id','titulo','descricao'].includes(k)),400,'Preencha apenas os dados da solicitação.');
    const lift=integer(req.body.elevador_id,'Elevador');
    const row=await db.transaction(async tx=>{
      const allowed=(await tx.query('SELECT e.id,l.zona_id FROM elevadores e JOIN locais l ON l.id=e.local_id JOIN cliente_locais cl ON cl.local_id=e.local_id WHERE e.id=$1 AND e.ativo AND cl.cliente_matricula=$2',[lift,req.user.matricula])).rows;
      insist(allowed.length,404,'Elevador não encontrado nos seus locais.');
      const row=(await tx.query('INSERT INTO solicitacoes_clientes(cliente_matricula,elevador_id,titulo,descricao) VALUES ($1,$2,$3,$4) RETURNING id',[req.user.matricula,lift,text(req.body.titulo,'Título',200),text(req.body.descricao,'Descrição',10000)])).rows[0];
      const zona=allowed[0].zona_id;
      await notify(tx,{usuarios:await managers(tx,zona),zona,solicitacao:row.id,ator:req.user.matricula,tipo:'nova_solicitacao',titulo:'Nova solicitação de cliente #'+row.id,mensagem:'Uma solicitação da sua área aguarda triagem. Defina prioridade, prazo e equipe.',gravidade:'atencao',chave:'solicitacao:'+row.id});
      return row;
    });res.status(201).json(row);
  });
  api.post('/portal/solicitacoes/:id/lembrete',async(req,res)=>{
    const row=await db.transaction(async tx=>{
      const s=await ownRequest(tx,req.params.id,req.user,true);insist(s.status==='aguardando_triagem',409,'A solicitação já recebeu um retorno da empresa.');
      insist(!s.ultimo_lembrete||Date.now()-new Date(s.ultimo_lembrete).getTime()>=3600000,429,'Aguarde uma hora entre lembretes desta solicitação.');
      const reminder=(await tx.query('INSERT INTO lembretes_solicitacoes(solicitacao_id,cliente_matricula) VALUES ($1,$2) RETURNING id,data',[s.id,req.user.matricula])).rows[0];
      await notify(tx,{usuarios:await managers(tx,s.zona_id),zona:s.zona_id,solicitacao:s.id,ator:req.user.matricula,tipo:'lembrete_cliente',titulo:'Cliente solicita retorno da solicitação #'+s.id,mensagem:'Há um novo lembrete do cliente. A solicitação ainda aguarda triagem.',gravidade:'atencao',chave:'lembrete:'+reminder.id});
      return reminder;
    });res.status(201).json(row);
  });
  api.get('/solicitacoes',async(req,res)=>{supervisor(req.user);res.json({solicitacoes:await internalRequests(db,req.user)});});
  api.post('/solicitacoes/:id/triagem',async(req,res)=>{
    supervisor(req.user);
    const result=await db.transaction(async tx=>{
      const id=integer(req.params.id,'Solicitação');await tx.query('SELECT id FROM solicitacoes_clientes WHERE id=$1 FOR UPDATE',[id]);
      const s=(await tx.query(details+' WHERE s.id=$1 AND ($2::boolean OR l.zona_id=$3)',[id,...scopeParams(req.user)])).rows[0];
      insist(s,404,'Solicitação não encontrada.');insist(s.status==='aguardando_triagem',409,'Esta solicitação já passou pela triagem.');
      if(req.body.acao==='recusar'){
        await tx.query("UPDATE solicitacoes_clientes SET status='recusada',triado_em=now(),triado_por=$1,retorno=$2 WHERE id=$3",[req.user.matricula,text(req.body.retorno,'Motivo do retorno',3000),id]);return {id};
      }
      insist(req.body.acao==='aceitar',400,'Ação de triagem inválida.');
      if(req.body.tecnico){
        const worker=(await tx.query("SELECT matricula FROM pessoas WHERE matricula=$1 AND role='tecnico' AND ativo AND zona_id=$2",[req.body.tecnico,s.zona_id])).rows[0];
        insist(worker,400,'Escolha um técnico ativo da zona da solicitação.');
      }
      const call=await insertTicket(tx,{elevador_id:s.elevador_id,titulo:s.titulo,descricao:s.descricao,tecnico:req.body.tecnico,prioridade:req.body.prioridade,sla_horas:req.body.sla_horas,tipo_obra:req.body.tipo_obra},req.user,{openedAt:s.aberto_em});
      await tx.query("UPDATE solicitacoes_clientes SET status='aceita',triado_em=now(),triado_por=$1,chamado_id=$2,retorno='Solicitação aceita pela equipe de atendimento.' WHERE id=$3",[req.user.matricula,call,id]);
      await tx.query('INSERT INTO historico_chamados(chamado_id,usuario_matricula,alteracao) VALUES ($1,$2,$3)',[call,req.user.matricula,'Solicitação de cliente #'+id+' aceita. A abertura original foi preservada no SLA.']);return {id,chamado_id:call};
    });res.json(result);
  });
}
