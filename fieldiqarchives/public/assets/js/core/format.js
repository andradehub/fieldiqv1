import {priorityCode} from './priorities.js';
export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const initials=value=>String(value??'').split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();
export const fmtNumber=value=>Number(value??0).toLocaleString('pt-BR');
export const average=list=>list.length?Math.round(list.reduce((a,b)=>a+b,0)/list.length):null;
export const percent=(part,total)=>total?Math.round(part/total*100):null;
export function fmtDate(value,{dateOnly=false}={}){
  if(!value)return '—';
  return new Date(value).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric',...(!dateOnly?{hour:'2-digit',minute:'2-digit'}:{})});
}
export function fmtTime(minutes){
  if(minutes==null)return '—';
  const n=Math.round(Number(minutes));
  return n<60?n+' min':Math.floor(n/60)+'h'+(n%60?' '+n%60+'min':'');
}
export const fmtBytes=n=>n<1024?n+' B':n<1048576?Math.round(n/1024)+' KB':(n/1048576).toFixed(1)+' MB';
export function dueAt(ticket){return new Date(new Date(ticket.aberto_em).getTime()+ticket.sla_horas*3600000);}
export function remaining(ticket){
  if(ticket.status==='resolvido')return fmtDate(ticket.resolvido_em,{dateOnly:true});
  if(ticket.status==='cancelado')return 'Atendimento cancelado';
  const minutes=Math.round((dueAt(ticket)-Date.now())/60000);
  return minutes<0?fmtTime(-minutes)+' em atraso':fmtTime(minutes)+' restantes';
}
export function weekKey(iso){
  const d=new Date(iso);
  d.setUTCHours(0,0,0,0);d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));
  return d.toISOString().slice(0,10);
}
export function currentPeriod(tickets,period){
  const days={week:7,month:30,quarter:90}[period];
  return days?tickets.filter(c=>new Date(c.aberto_em)>=Date.now()-days*86400000):tickets;
}
export function attentionScore(c){
  return Number(c.sla_vencido)*100+({A:40,B:20,C:10}[priorityCode(c.prioridade)]??0)+Number(!c.tecnico)*5;
}
