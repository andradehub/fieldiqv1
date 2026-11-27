import {insist,integer,oneOf} from './permissions.mjs';
import {enqueuePush} from './push-store.mjs';

// The recipient's role and zone are checked again on every read. A transfer or
// change of role must not expose notifications from the previous permission set.
const scope="n.usuario_matricula=$1 AND n.perfil_destinatario=$2 AND (n.zona_id IS NULL OR $2='administrativo' OR n.zona_id=$3)";
const params=user=>[user.matricula,user.role,user.zona_id];
export async function notify(db,{usuarios,ator=null,zona=null,chamado=null,solicitacao=null,tipo,titulo,mensagem,gravidade='info',chave}){
  if(!usuarios?.length)return [];
  const {rows}=await db.query(`INSERT INTO notificacoes(usuario_matricula,perfil_destinatario,zona_id,chamado_id,solicitacao_id,ator_matricula,tipo,titulo,mensagem,gravidade,chave)
    SELECT p.matricula,p.role,$2,$3,$4,$5,$6,$7,$8,$9,$10 FROM pessoas p
    WHERE p.matricula=ANY($1::text[]) AND p.ativo AND p.role IN ('tecnico','supervisor','administrativo')
      AND ($2::text IS NULL OR p.role='administrativo' OR p.zona_id=$2)
    ON CONFLICT(usuario_matricula,chave) DO NOTHING RETURNING id`,[[...new Set(usuarios)],zona,chamado,solicitacao,ator,tipo,titulo,mensagem,gravidade,chave]);
  const ids=rows.map(row=>row.id);await enqueuePush(db,ids);return ids;
}
export async function managers(db,zona,except=null){
  return (await db.query("SELECT matricula FROM pessoas WHERE ativo AND (role='administrativo' OR (role='supervisor' AND zona_id=$1)) AND ($2::text IS NULL OR matricula<>$2)",[zona,except])).rows.map(p=>p.matricula);
}
export async function notifyAssignment(db,ticket,actor,{anterior=null,atual=null,chave,assumido=false}){
  const context={zona:ticket.zona_id,chamado:ticket.id,ator:actor.matricula,chave};
  if(atual)await notify(db,{...context,usuarios:[atual],tipo:assumido?'assumido':'atribuicao',titulo:assumido?'Você assumiu o chamado #'+ticket.id:'Chamado #'+ticket.id+' atribuído a você',mensagem:'Você é o responsável principal. Confira o prazo e inicie o atendimento quando começar o trabalho.'});
  if(anterior&&anterior!==atual)await notify(db,{...context,usuarios:[anterior],tipo:'responsabilidade_removida',titulo:'Responsabilidade atualizada no chamado #'+ticket.id,mensagem:'Você deixou de ser o responsável principal. Seus períodos de trabalho e os registros anteriores foram preservados.'});
  await notify(db,{...context,usuarios:await managers(db,ticket.zona_id,atual?actor.matricula:null),tipo:atual?'responsavel_alterado':'sem_responsavel',titulo:atual?'Responsável definido no chamado #'+ticket.id:'Chamado #'+ticket.id+' sem responsável',mensagem:atual?'A responsabilidade foi atualizada. Consulte a equipe e acompanhe o atendimento.':'O chamado está aberto e aguarda um responsável da zona. O SLA continua contando.',gravidade:atual?'info':'atencao'});
}
export async function notifyTeam(db,ticket,actor,matricula,incluido,chave){
  const context={zona:ticket.zona_id,chamado:ticket.id,ator:actor.matricula,chave};
  await notify(db,{...context,usuarios:[matricula],tipo:incluido?'equipe_inclusao':'equipe_saida',titulo:incluido?'Você foi incluído no chamado #'+ticket.id:'Participação encerrada no chamado #'+ticket.id,mensagem:incluido?'Você participa da equipe deste atendimento. Confira o chamado e registre seu próprio período de trabalho.':'Sua participação foi encerrada. O histórico e os períodos anteriores permanecem registrados.'});
  await notify(db,{...context,usuarios:await managers(db,ticket.zona_id,actor.matricula),tipo:'equipe_alterada',titulo:'Equipe atualizada no chamado #'+ticket.id,mensagem:incluido?'Um técnico foi incluído na equipe. A inclusão e sua autoria estão no histórico.':'Um participante saiu ou foi removido da equipe. Consulte os registros do chamado.'});
}
export function registerNotificationRoutes(api,db){
  api.get('/notificacoes/:id',async(req,res)=>{
    const {rows}=await db.query(`SELECT n.id,n.tipo,n.titulo,n.mensagem,n.gravidade,n.chamado_id,n.solicitacao_id,n.criado_em,n.lido_em FROM notificacoes n WHERE ${scope} AND n.id=$4`,[...params(req.user),integer(req.params.id,'Notificação')]);
    insist(rows.length,404,'Notificação indisponível para sua conta.');res.json(rows[0]);
  });
  api.get('/notificacoes',async(req,res)=>{
    const status=oneOf(req.query.status??'todas',['todas','nao_lidas'],'Filtro'),page=integer(req.query.pagina??1,'Página',1,100000),limit=integer(req.query.limite??15,'Limite',1,50);
    const p=params(req.user),filter=scope+(status==='nao_lidas'?' AND n.lido_em IS NULL':'');
    const summary=(await db.query(`SELECT count(*)::int AS total,count(*) FILTER (WHERE n.lido_em IS NULL)::int AS nao_lidas,COALESCE(max(n.id),0)::int AS ultima_id FROM notificacoes n WHERE ${scope}`,p)).rows[0];
    const total=status==='nao_lidas'?summary.nao_lidas:summary.total;
    const {rows}=await db.query(`SELECT n.id,n.tipo,n.titulo,n.mensagem,n.gravidade,n.chamado_id,n.solicitacao_id,n.criado_em,n.lido_em,(n.ator_matricula=$1) AS propria_acao FROM notificacoes n WHERE ${filter} ORDER BY n.id DESC LIMIT $4 OFFSET $5`,[...p,limit,(page-1)*limit]);
    res.json({...summary,notificacoes:rows,pagina:page,paginas:Math.max(1,Math.ceil(total/limit)),total_filtrado:total});
  });
  api.patch('/notificacoes/lidas',async(req,res)=>{
    const until=integer(req.body.ate_id,'Última notificação',0);
    await db.query(`UPDATE notificacoes n SET lido_em=now() WHERE ${scope} AND n.lido_em IS NULL AND n.id<=$4`,[...params(req.user),until]);res.json({ok:true});
  });
  api.patch('/notificacoes/:id',async(req,res)=>{
    insist(typeof req.body.lida==='boolean',400,'Informe a situação de leitura.');
    const {rows}=await db.query(`UPDATE notificacoes n SET lido_em=CASE WHEN $5 THEN COALESCE(n.lido_em,now()) ELSE NULL END WHERE ${scope} AND n.id=$4 RETURNING n.id`,[...params(req.user),integer(req.params.id,'Notificação'),req.body.lida]);
    insist(rows.length,404,'Notificação não encontrada.');res.json({ok:true});
  });
}
