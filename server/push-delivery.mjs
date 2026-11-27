import {randomBytes} from 'node:crypto';
import * as webpush from 'web-push';
import {pushConfiguration} from './push-store.mjs';

export async function sendWebPush(subscription,payload,options){
  const request=webpush.generateRequestDetails(subscription,payload,options);
  const response=await fetch(request.endpoint,{method:request.method,headers:request.headers,body:request.body,signal:AbortSignal.timeout(8000),redirect:'error'});
  await response.body?.cancel();
  if(!response.ok)throw Object.assign(new Error('Serviço push recusou a entrega.'),{statusCode:response.status});
  return {statusCode:response.status};
}
export async function deliverPush(db,{send=sendWebPush,limit=25,now=new Date()}={}){
  const config=pushConfiguration();if(!config.enabled)return {habilitado:false,enviadas:0};
  const token=randomBytes(16).toString('hex'),at=new Date(now);
  const jobs=await db.transaction(async tx=>{
    const {rows}=await tx.query(`SELECT q.id FROM entregas_push q JOIN notificacoes n ON n.id=q.notificacao_id
      WHERE (q.estado='pendente' AND q.proxima_em<=$1) OR (q.estado='enviando' AND q.reserva_ate<$1)
      ORDER BY CASE WHEN n.gravidade='critica' THEN 0 ELSE 1 END,q.id LIMIT $2 FOR UPDATE OF q SKIP LOCKED`,[at.toISOString(),limit]);
    const ids=rows.map(row=>row.id);if(!ids.length)return [];
    await tx.query("UPDATE entregas_push SET estado='enviando',reserva=$1,reserva_ate=$2,tentativas=tentativas+1 WHERE id=ANY($3::integer[])",[token,new Date(at.getTime()+120000).toISOString(),ids]);
    return (await tx.query(`SELECT q.id,q.tentativas,n.id AS notificacao_id,n.usuario_matricula,n.perfil_destinatario,n.zona_id,n.chamado_id,n.tipo,n.gravidade,n.lido_em,n.criado_em,n.chave,
      s.id AS inscricao_id,s.usuario_matricula AS inscricao_usuario,s.endpoint,s.p256dh,s.auth,s.chave_publica,s.vinculo,
      p.role,p.zona_id AS zona_atual,p.ativo,c.status AS chamado_status,c.tecnico_matricula,c.equipe_matriculas,c.aberto_em,c.sla_horas
      FROM entregas_push q JOIN notificacoes n ON n.id=q.notificacao_id JOIN inscricoes_push s ON s.id=q.inscricao_id
      JOIN pessoas p ON p.matricula=n.usuario_matricula LEFT JOIN vw_chamados_metricas c ON c.id=n.chamado_id WHERE q.id=ANY($1::integer[])`,[ids])).rows;
  });
  let sent=0;
  async function handle(job){
    const sla=job.tipo.startsWith('sla_'),allowed=job.ativo&&job.role===job.perfil_destinatario&&job.inscricao_usuario===job.usuario_matricula&&job.chave_publica===config.publicKey&&(!job.zona_id||job.role==='administrativo'||job.zona_atual===job.zona_id);
    const worker=job.role!=='tecnico'||job.tecnico_matricula===job.usuario_matricula||job.equipe_matriculas?.includes(job.usuario_matricula);
    const deadline=new Date(job.aberto_em).getTime()+job.sla_horas*3600000;
    const staleSla=sla&&(!job.chave.endsWith(':'+deadline)||(job.tipo==='sla_proximo'&&at.getTime()>=deadline)||(job.tipo==='sla_vencido'&&at.getTime()<deadline));
    const obsolete=job.lido_em||at-new Date(job.criado_em)>24*3600000||(sla&&(!['aberto','em_andamento'].includes(job.chamado_status)||!worker||staleSla))||(job.tipo==='sem_responsavel'&&job.tecnico_matricula)||(job.tipo==='atribuicao'&&job.tecnico_matricula!==job.usuario_matricula)||(job.tipo==='equipe_inclusao'&&!worker);
    if(!allowed||obsolete){await db.query("UPDATE entregas_push SET estado='cancelado',reserva=NULL,reserva_ate=NULL WHERE id=$1 AND reserva=$2",[job.id,token]);return;}
    // Only an opaque binding and notification id leave the server. Never send
    // the user's name, CPF, customer, location, description or resolution.
    const payload=JSON.stringify({id:job.notificacao_id,vinculo:job.vinculo,titulo:'FieldIQ',mensagem:'Há uma atualização na sua área. Abra o FieldIQ para consultar.'});
    try{
      await send({endpoint:job.endpoint,keys:{p256dh:job.p256dh,auth:job.auth}},payload,{vapidDetails:{subject:config.subject,publicKey:config.publicKey,privateKey:config.privateKey},TTL:3600,urgency:job.gravidade==='critica'?'high':'normal',timeout:5000});
      await db.query("UPDATE entregas_push SET estado='enviado',enviado_em=$1,reserva=NULL,reserva_ate=NULL,erro_codigo=NULL WHERE id=$2 AND reserva=$3",[at.toISOString(),job.id,token]);sent++;
    }catch(error){
      const code=Number(error.statusCode)||0;
      if([404,410].includes(code)){await db.query('DELETE FROM inscricoes_push WHERE id=$1',[job.inscricao_id]);return;}
      const retry=job.tentativas<5&&(!code||code===429||code>=500),next=new Date(at.getTime()+Math.min(3600000,60000*2**(job.tentativas-1)));
      await db.query('UPDATE entregas_push SET estado=$1,proxima_em=$2,reserva=NULL,reserva_ate=NULL,erro_codigo=$3 WHERE id=$4 AND reserva=$5',[retry?'pendente':'falha',next.toISOString(),code?String(code):'rede',job.id,token]);
    }
  }
  for(let i=0;i<jobs.length;i+=5){const results=await Promise.allSettled(jobs.slice(i,i+5).map(handle));const error=results.find(r=>r.status==='rejected');if(error)throw error.reason;}
  return {habilitado:true,processadas:jobs.length,enviadas:sent};
}
