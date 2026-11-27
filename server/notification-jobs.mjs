import {timingSafeEqual} from 'node:crypto';
import {notify} from './notifications.mjs';
import {getTicket,insist} from './permissions.mjs';

export async function evaluateSla(db,{now=new Date(),limit=500}={}){
  const at=new Date(now);if(!Number.isFinite(at.getTime()))throw Error('Horário de avaliação inválido.');
  // Already-delivered recipients are excluded so older overdue calls cannot
  // monopolize every batch. Deduplication is persisted, not held in memory.
  const {rows}=await db.query(`WITH candidatos AS (
    SELECT c.*,aberto_em+sla_horas*interval '1 hour' AS prazo,
      'sla:'||c.id||':'||CASE WHEN aberto_em+sla_horas*interval '1 hour'<=$1 THEN 'vencido' ELSE '75' END||':'||floor(extract(epoch FROM aberto_em+sla_horas*interval '1 hour')*1000)::bigint::text AS chave
    FROM vw_chamados_metricas c WHERE status IN ('aberto','em_andamento') AND aberto_em+sla_horas*interval '45 minutes'<=$1
  ) SELECT c.id FROM candidatos c WHERE EXISTS (
    SELECT 1 FROM pessoas p WHERE p.ativo AND (p.role='administrativo' OR (p.zona_id=c.zona_id AND (p.role='supervisor' OR (p.role='tecnico' AND (p.matricula=c.tecnico_matricula OR p.matricula=ANY(c.equipe_matriculas))))))
    AND NOT EXISTS(SELECT 1 FROM notificacoes n WHERE n.usuario_matricula=p.matricula AND n.chave=c.chave)
  ) ORDER BY c.prazo,c.id LIMIT $2`,[at.toISOString(),limit]);
  let created=0;
  for(const row of rows)created+=await db.transaction(async tx=>{
    const c=await getTicket(tx,row.id,{role:'administrativo'},true);
    if(!['aberto','em_andamento'].includes(c.status))return 0;
    const deadline=new Date(c.aberto_em).getTime()+c.sla_horas*3600000,elapsed=at-new Date(c.aberto_em);
    if(elapsed<c.sla_horas*3600000*.75)return 0;
    const expired=at.getTime()>=deadline,stage=expired?'vencido':'75';
    const people=(await tx.query("SELECT matricula FROM pessoas WHERE ativo AND (role='administrativo' OR (zona_id=$1 AND (role='supervisor' OR (role='tecnico' AND (matricula=$2 OR matricula=ANY($3::text[]))))))",[c.zona_id,c.tecnico_matricula,c.equipe_matriculas??[]])).rows.map(p=>p.matricula);
    const ids=await notify(tx,{usuarios:people,zona:c.zona_id,chamado:c.id,tipo:expired?'sla_vencido':'sla_proximo',titulo:expired?'SLA vencido no chamado #'+c.id:'75% do SLA atingido no chamado #'+c.id,mensagem:expired?'O prazo de resolução foi excedido. Confira a situação atual e organize as próximas ações.':'O chamado atingiu 75% do prazo de resolução. Confira o andamento e a equipe responsável.',gravidade:expired?'critica':'atencao',chave:'sla:'+c.id+':'+stage+':'+deadline});return ids.length;
  });
  return {chamados_avaliados:rows.length,notificacoes_criadas:created};
}
function validCron(header){
  const secret=process.env.CRON_SECRET;if(!secret||secret.length<32)return false;
  const provided=Buffer.from(header??''),expected=Buffer.from('Bearer '+secret);
  return provided.length===expected.length&&timingSafeEqual(provided,expected);
}
export function registerNotificationJobRoute(app,db,{run=()=>evaluateSla(db)}={}){
  app.get('/api/tarefas/notificacoes',async(req,res)=>{insist(validCron(req.headers.authorization),401,'Rotina não autorizada.');res.json(await run());});
}
export function startNotificationJobs(db,{intervalMs=60000,run=()=>evaluateSla(db)}={}){
  let pending=null,stopping=false;
  const tick=()=>{if(stopping||pending)return pending;pending=Promise.resolve().then(run).catch(error=>console.error('Falha na rotina de notificações:',error.code??error.name)).finally(()=>{pending=null;});return pending;};
  const timer=setInterval(tick,intervalMs);timer.unref();void tick();
  return async()=>{stopping=true;clearInterval(timer);if(pending)await pending;};
}
