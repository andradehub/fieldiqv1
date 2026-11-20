import {insist,getTicket,canEdit,canClose,manages,integer,oneOf,optionalText} from './permissions.mjs';

export async function closeIntervals(db,id){await db.query('UPDATE atendimentos SET encerrado_em=now() WHERE chamado_id=$1 AND encerrado_em IS NULL',[id]);}
export async function beginInterval(db,ticket,user){
  insist(ticket.tecnico_matricula,400,'Atribua o chamado a um técnico antes de iniciar.');
  const person=user.role==='tecnico'?user.matricula:ticket.tecnico_matricula;
  await db.query('INSERT INTO atendimentos(chamado_id,tecnico_matricula) VALUES ($1,$2)',[ticket.id,person]);
  await db.query('UPDATE chamados SET iniciado_em=COALESCE(iniciado_em,now()) WHERE id=$1',[ticket.id]);
}
export function registerAttendanceRoutes(api,db){
  api.post('/chamados/:id/responsabilidade',async(req,res)=>{
    const result=await db.transaction(async tx=>{
      const c=await getTicket(tx,req.params.id,req.user,true);
      insist(integer(req.body.revisao,'Revisão')===c.revisao,409,'O chamado mudou. Confira os dados atualizados.');
      insist(['aberto','em_andamento'].includes(c.status),409,'Reabra o chamado antes de alterar a responsabilidade.');
      const action=oneOf(req.body.acao,['assumir','liberar'],'Ação');
      if(action==='assumir'){
        insist(req.user.role==='tecnico',403,'Apenas técnicos podem assumir um chamado para si.');
        insist(!c.tecnico_matricula,409,'O chamado já tem um responsável. Você pode participar da equipe.');
        await closeIntervals(tx,c.id);
        await tx.query("UPDATE chamados SET tecnico_matricula=$1,status='aberto',revisao=revisao+1 WHERE id=$2",[req.user.matricula,c.id]);
        await tx.query('DELETE FROM equipe_chamado WHERE chamado_id=$1 AND tecnico_matricula=$2',[c.id,req.user.matricula]);
      }else{
        insist(canClose(req.user,c)&&c.tecnico_matricula,403,'Apenas o responsável principal ou a gestão pode liberar o chamado.');
        await closeIntervals(tx,c.id);
        await tx.query('DELETE FROM equipe_chamado WHERE chamado_id=$1 AND tecnico_matricula=$2',[c.id,c.tecnico_matricula]);
        await tx.query("UPDATE chamados SET tecnico_matricula=NULL,status='aberto',revisao=revisao+1 WHERE id=$1",[c.id]);
      }
      await tx.query('INSERT INTO historico_chamados(chamado_id,usuario_matricula,alteracao) VALUES ($1,$2,$3)',[c.id,req.user.matricula,action==='assumir'?'Responsabilidade assumida pelo técnico. O atendimento ainda não foi iniciado.':'Responsabilidade liberada. Chamado aberto e disponível; períodos pausados, sem alterar o SLA.']);
      return {id:c.id,revisao:c.revisao+1};
    });res.json(result);
  });
  api.delete('/chamados/:id/equipe/:matricula',async(req,res)=>{
    await db.transaction(async tx=>{
      const c=await getTicket(tx,req.params.id,req.user,true),mat=req.params.matricula;
      insist(manages(req.user)||mat===req.user.matricula,403,'Você pode sair apenas da própria participação.');
      insist(['aberto','em_andamento'].includes(c.status),409,'A equipe de um chamado encerrado fica preservada no histórico.');
      insist(mat!==c.tecnico_matricula,400,'Reatribua o responsável principal antes de removê-lo.');
      const removed=await tx.query('DELETE FROM equipe_chamado WHERE chamado_id=$1 AND tecnico_matricula=$2 RETURNING tecnico_matricula',[c.id,mat]);
      insist(removed.rows.length,404,'Participante não encontrado.');
      await tx.query('UPDATE atendimentos SET encerrado_em=now() WHERE chamado_id=$1 AND tecnico_matricula=$2 AND encerrado_em IS NULL',[c.id,mat]);
      await tx.query('UPDATE chamados SET revisao=revisao+1 WHERE id=$1',[c.id]);
      await tx.query('INSERT INTO historico_chamados(chamado_id,usuario_matricula,alteracao) VALUES ($1,$2,$3)',[c.id,req.user.matricula,'Participação encerrada na equipe: '+mat+'. Períodos de trabalho preservados.']);
    });res.json({ok:true});
  });
  api.post('/chamados/:id/equipe',async(req,res)=>{
    const result=await db.transaction(async tx=>{
      const c=await getTicket(tx,req.params.id,req.user,true);
      insist(['aberto','em_andamento'].includes(c.status)&&c.tecnico_matricula,409,'O chamado precisa estar aberto e ter um responsável.');
      const matricula=req.body.matricula??req.user.matricula;
      insist(req.user.role==='tecnico'||manages(req.user),403,'Perfil sem permissão para participar.');
      insist(manages(req.user)||matricula===req.user.matricula,403,'Você pode ingressar apenas com sua própria conta.');
      const person=(await tx.query("SELECT matricula FROM pessoas WHERE matricula=$1 AND role='tecnico' AND ativo AND zona_id=$2",[matricula,c.zona_id])).rows[0];
      insist(person,400,'Selecione um técnico ativo da zona do chamado.');
      if(matricula===c.tecnico_matricula)return {id:c.id,revisao:c.revisao};
      const added=await tx.query('INSERT INTO equipe_chamado(chamado_id,tecnico_matricula,adicionado_por) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING RETURNING tecnico_matricula',[c.id,matricula,req.user.matricula]);
      if(added.rows.length){
        await tx.query('UPDATE chamados SET revisao=revisao+1 WHERE id=$1',[c.id]);
        await tx.query('INSERT INTO historico_chamados(chamado_id,usuario_matricula,alteracao) VALUES ($1,$2,$3)',[c.id,req.user.matricula,'Participante adicionado à equipe: '+matricula]);
      }
      return {id:c.id,revisao:c.revisao+Number(added.rows.length>0)};
    });res.json(result);
  });
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
      const worker=req.user.role==='tecnico'?req.user.matricula:c.tecnico_matricula;
      const active=(await tx.query('SELECT id FROM atendimentos WHERE chamado_id=$1 AND tecnico_matricula=$2 AND encerrado_em IS NULL',[c.id,worker])).rows[0];
      let status=c.status,solution=c.solucao;
      if(action==='iniciar'){
        insist(!active,409,'Seu período de atendimento já foi iniciado.');
        await beginInterval(tx,c,req.user);status='em_andamento';
      }else if(action==='pausar'){
        insist(active,409,'Você não tem um período ativo para pausar.');await tx.query('UPDATE atendimentos SET encerrado_em=now() WHERE id=$1',[active.id]);
      }else{
        insist(canClose(req.user,c),403,'A conclusão é feita pelo responsável principal ou pela gestão.');
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
