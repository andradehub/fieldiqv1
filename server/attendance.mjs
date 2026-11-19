import {insist,getTicket,canEdit,manages,integer,oneOf,optionalText} from './permissions.mjs';

export async function closeIntervals(db,id){await db.query('UPDATE atendimentos SET encerrado_em=now() WHERE chamado_id=$1 AND encerrado_em IS NULL',[id]);}
export async function beginInterval(db,ticket,user){
  insist(ticket.tecnico_matricula,400,'Atribua o chamado a um técnico antes de iniciar.');
  await db.query('INSERT INTO atendimentos(chamado_id,tecnico_matricula) VALUES ($1,$2)',[ticket.id,ticket.tecnico_matricula]);
  await db.query('UPDATE chamados SET iniciado_em=COALESCE(iniciado_em,now()) WHERE id=$1',[ticket.id]);
}
export function registerAttendanceRoutes(api,db){
  api.get('/chamados/:id/atendimentos',async(req,res)=>{
    const c=await getTicket(db,req.params.id,req.user);
    const {rows}=await db.query('SELECT a.*,p.nome AS tecnico_nome FROM atendimentos a JOIN pessoas p ON p.matricula=a.tecnico_matricula WHERE chamado_id=$1 ORDER BY iniciado_em,id',[c.id]);res.json({atendimentos:rows});
  });
  api.post('/chamados/:id/atendimento',async(req,res)=>{
    const result=await db.transaction(async tx=>{
      const c=await getTicket(tx,req.params.id,req.user,true);
      insist(canEdit(req.user,c),403,'Você só pode atender chamados sob sua responsabilidade.');
      insist(integer(req.body.revisao,'Revisão')===c.revisao,409,'O chamado mudou. Atualize antes de continuar.');
      insist(!['resolvido','cancelado'].includes(c.status),409,'Este chamado já foi encerrado.');
      const action=oneOf(req.body.acao,['iniciar','pausar','concluir'],'Ação');
      let status=c.status,solution=c.solucao;
      if(action==='iniciar'){
        insist(!c.atendimento_ativo_desde,409,'O atendimento já foi iniciado.');
        insist(c.tecnico_matricula===req.user.matricula||manages(req.user),403,'Apenas o responsável pode iniciar.');
        await beginInterval(tx,c,req.user);status='em_andamento';
      }else if(action==='pausar'){
        insist(c.atendimento_ativo_desde,409,'Não há atendimento ativo para pausar.');await closeIntervals(tx,c.id);
      }else{
        solution=optionalText(req.body.solucao);
        insist(solution,400,'Registre a solução aplicada antes de concluir.');await closeIntervals(tx,c.id);status='resolvido';
      }
      await tx.query("UPDATE chamados SET status=$1,solucao=$2,resolvido_em=CASE WHEN $1='resolvido' THEN now() ELSE NULL END,revisao=revisao+1 WHERE id=$3",[status,solution,c.id]);
      const label={iniciar:'Atendimento iniciado/retomado.',pausar:'Atendimento pausado. O prazo de SLA continua contando.',concluir:'Atendimento concluído com solução registrada.'}[action];
      await tx.query('INSERT INTO historico_chamados(chamado_id,usuario_matricula,alteracao) VALUES ($1,$2,$3)',[c.id,req.user.matricula,label]);
      return {id:c.id,revisao:c.revisao+1};
    });res.json(result);
  });
}
