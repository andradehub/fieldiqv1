export class ApiError extends Error {
  constructor(status,message){super(message);this.status=status;}
}
export function insist(condition,status,message){if(!condition)throw new ApiError(status,message);}
export function text(value,label,max=10000){insist(typeof value==='string'&&value.trim().length>0&&value.length<=max,400,label+' inválido.');return value.trim();}
export function optionalText(value,max=10000){insist(value==null||(typeof value==='string'&&value.length<=max),400,'Texto inválido.');return (value??'').trim();}
export function integer(value,label,min=1,max=2147483647){const n=Number(value);insist(Number.isInteger(n)&&n>=min&&n<=max,400,label+' inválido.');return n;}
export function oneOf(value,values,label){insist(values.includes(value),400,label+' inválido.');return value;}
export const isAdmin=user=>user.role==='administrativo';
export const manages=user=>['supervisor','administrativo'].includes(user.role);
export const canClose=(user,ticket)=>isAdmin(user)||(user.role==='supervisor'?ticket.zona_id===user.zona_id:ticket.tecnico_matricula===user.matricula);
export const canEdit=(user,ticket)=>canClose(user,ticket)||(user.role==='tecnico'&&['aberto','em_andamento'].includes(ticket.status)&&canReadZone(user,ticket.zona_id)&&ticket.equipe_matriculas?.includes(user.matricula));
export const canReadZone=(user,zone)=>isAdmin(user)||(Boolean(user.zona_id)&&user.zona_id===zone);
export const scopeParams=user=>[isAdmin(user),user.zona_id];
export function supervisor(user){insist(manages(user),403,'Ação exclusiva da gestão.');}
export async function getTicket(db,id,user,lock=false){
  if(lock)await db.query('SELECT id FROM chamados WHERE id=$1 FOR UPDATE',[integer(id,'Chamado')]);
  const c=(await db.query('SELECT * FROM vw_chamados_metricas WHERE id=$1',[integer(id,'Chamado')])).rows[0];
  insist(c&&canReadZone(user,c.zona_id),404,'Chamado não encontrado.');return c;
}
