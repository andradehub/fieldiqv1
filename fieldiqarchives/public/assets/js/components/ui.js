import {esc,initials,remaining,fmtDate,dueAt} from '../core/format.js';
import {PRIORITIES,priorityCode} from '../core/priorities.js';
export const STATUS={aberto:'Aberto',em_andamento:'Em andamento',resolvido:'Resolvido',cancelado:'Cancelado'};
export {PRIORITIES} from '../core/priorities.js';
export const WORKS={obra_nova:'Obra nova',mod_integral:'Modificação integral',mod_parcial:'Modificação parcial'};
export function icon(name,size=20){
  const node=window.lucide?.icons[name]??window.lucide?.icons.Circle;
  if(!node)return '';
  const paths=node.map(([tag,attrs])=>'<'+tag+' '+Object.entries(attrs).map(([key,value])=>key+'="'+esc(value)+'"').join(' ')+'/>').join('');
  return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+paths+'</svg>';
}
export const brandMark=()=>'<span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><rect x="7" y="6" width="18" height="21" rx="2" stroke="currentColor" stroke-width="2"/><path d="M16 7v19M11 13l2-2 2 2M17 20l2 2 2-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
export function avatar(person,size='medium'){
  const content=person?.foto?'<img src="'+esc(person.foto)+'" alt="">':esc(initials(person?.nome));
  return '<span class="avatar avatar--'+size+'">'+content+'</span>';
}
export function badge(label,tone='neutral',name=''){
  return '<span class="badge badge--'+tone+'">'+(name?icon(name,14):'')+esc(label)+'</span>';
}
export const statusBadge=status=>badge(STATUS[status]??status,({aberto:'blue',em_andamento:'amber',resolvido:'green',cancelado:'neutral'})[status],({aberto:'CircleDashed',em_andamento:'Clock3',resolvido:'CircleCheck',cancelado:'CircleOff'})[status]);
export function priorityBadge(value){const code=priorityCode(value);return badge(PRIORITIES[code]??'Não informada',({A:'red',B:'amber',C:'neutral'})[code],code==='A'?'TriangleAlert':'');}
export const workBadge=value=>badge(WORKS[value]??value,'purple');
export function slaBadge(ticket){
  if(ticket.status==='cancelado')return badge('Cancelado','neutral');
  if(ticket.sla_cumprido===true)return badge('SLA cumprido','green','Check');
  if(ticket.sla_cumprido===false||ticket.sla_vencido)return badge('Fora do prazo','red','ClockAlert');
  return badge('Dentro do prazo','neutral','Clock3');
}
export function slaCell(ticket){
  return '<div class="cell-stack">'+slaBadge(ticket)+'<span class="text-muted text-small" title="'+esc(fmtDate(dueAt(ticket)))+'">'+esc(remaining(ticket))+'</span></div>';
}
export function button(label,{action='',route='',name='',tone='secondary',attrs='',className=''}={}){
  return '<button type="button" class="button button--'+tone+' '+className+'" '+(action?'data-action="'+action+'" ':'')+(route?'data-route="'+route+'" ':'')+attrs+'>'+(name?icon(name,18):'')+'<span>'+esc(label)+'</span></button>';
}
export const iconButton=(name,label,action,attrs='')=>'<button type="button" class="icon-button" aria-label="'+esc(label)+'" title="'+esc(label)+'" data-action="'+action+'" '+attrs+'>'+icon(name)+'</button>';
export function emptyState(title,description,{name='Inbox',action=''}={}){
  return '<div class="empty-state"><span class="empty-state__icon">'+icon(name,28)+'</span><h3>'+esc(title)+'</h3><p>'+esc(description)+'</p>'+action+'</div>';
}
export function heading(eyebrow,title,description,actions=''){
  return '<header class="page-heading"><div><p class="eyebrow">'+esc(eyebrow)+'</p><h1 id="page-title" tabindex="-1">'+esc(title)+'</h1><p class="page-description">'+esc(description)+'</p></div><div class="page-actions">'+actions+'</div></header>';
}
export const options=(labels,value)=>Object.entries(labels).map(([id,label])=>'<option value="'+esc(id)+'"'+(String(id)===String(value)?' selected':'')+'>'+esc(label)+'</option>').join('');
export function selectField(id,label,labels,value,attrs=''){
  return '<label class="field" for="'+id+'"><span class="field__label">'+esc(label)+'</span><span class="select-wrap"><select id="'+id+'" name="'+id+'" '+attrs+'>'+options(labels,value)+'</select>'+icon('ChevronDown',16)+'</span></label>';
}
export const panelHeader=(title,subtitle='',action='')=>'<div class="panel-header"><div><h2>'+esc(title)+'</h2>'+(subtitle?'<p>'+esc(subtitle)+'</p>':'')+'</div>'+action+'</div>';
export function metricCard(label,value,detail,{name='Activity',tone='purple',action='',attrs=''}={}){
  return '<'+(action?'button':'article')+' class="metric-card" '+(action?'type="button" data-action="'+action+'" ':'')+attrs+'><div class="metric-card__top"><span>'+esc(label)+'</span><span class="metric-icon metric-icon--'+tone+'">'+icon(name,19)+'</span></div><strong class="metric-value">'+esc(value)+'</strong><p>'+esc(detail)+'</p></'+(action?'button':'article')+'>';
}
export const notice=(text,name='Info',tone='info')=>'<div class="notice notice--'+tone+'">'+icon(name,19)+'<p>'+esc(text)+'</p></div>';
