import {state,isSupervisor,canEdit,personName,zoneName,team} from '../core/state.js';
import {esc,fmtDate,fmtTime,currentPeriod,dueAt} from '../core/format.js';
import {icon,heading,button,iconButton,badge,avatar,statusBadge,priorityBadge,workBadge,slaBadge,slaCell,emptyState,panelHeader,options,STATUS,PRIORITIES,WORKS,notice} from '../components/ui.js';
import {renderTiming,renderAttachments} from './attachments.js';
export function filteredTickets(){
  const f=state.ui.filters;
  const normalized=s=>String(s??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const q=normalized(f.search);
  return currentPeriod(state.chamados,f.period??'all').filter(c=>{
    if(q&&![c.titulo,c.descricao,c.elevador_codigo,c.local_nome,'#'+c.id].some(v=>normalized(v).includes(q)))return false;
    if(f.status==='pending'&&!['aberto','em_andamento'].includes(c.status))return false;
    if(f.status&&f.status!=='pending'&&c.status!==f.status)return false;
    if(f.priority&&c.prioridade!==f.priority)return false;
    if(f.work&&c.tipo_obra!==f.work)return false;
    if(f.technician&&c.tecnico!==f.technician)return false;
    if(f.equipment&&String(c.elevador_id)!==String(f.equipment))return false;
    if(f.flag==='sla'&&!c.sla_vencido)return false;
    if(f.flag==='unassigned'&&c.tecnico)return false;
    return true;
  });
}
export function renderTickets(){
  const matched=filteredTickets(),f=state.ui.filters;
  const pageSize=window.matchMedia('(max-width:767px)').matches?5:10;
  const pages=Math.max(1,Math.ceil(matched.length/pageSize));
  state.ui.ticketPage=Math.min(Math.max(state.ui.ticketPage??1,1),pages);
  const start=(state.ui.ticketPage-1)*pageSize;
  const list=matched.slice(start,start+pageSize);
  const filterSelect=(id,label,labels,value)=>`<span class="select-wrap"><label for="${id}" class="sr-only">${label}</label><select id="${id}" data-filter="${id.replace('filter-','')}" aria-label="${label}">${options(labels,value)}</select>${icon('ChevronDown',16)}</span>`;
  const counts=status=>state.chamados.filter(c=>!status||c.status===status).length;
  const activeFilters=Boolean(f.search||f.status||f.priority||f.work||f.technician||f.equipment||f.flag||(f.period&&f.period!=='all'));
  const context=[
    f.technician?'Responsável: '+personName(f.technician):'',
    f.equipment?'Elevador: '+(state.elevadores.find(e=>String(e.id)===String(f.equipment))?.codigo??''):'',
    f.status==='pending'?'Somente pendentes':'',
    f.flag==='sla'?'Prazo excedido':f.flag==='unassigned'?'Sem responsável':'',
    f.period&&f.period!=='all'?'Período selecionado no painel':''
  ].filter(Boolean);
  return heading('OPERAÇÃO','Chamados','Acompanhe cada atendimento, do registro à solução.',isSupervisor()?button('Novo chamado',{route:'novochamado',name:'Plus',tone:'primary'}):button('Meus atendimentos',{action:'quick-filter',attrs:'data-filter="mine"',name:'Wrench'}))+`
    <section class="panel tickets-panel">
      <div class="tickets-tabs tabs" aria-label="Filtrar por situação">${[['','Todos'],['aberto','Abertos'],['em_andamento','Em andamento'],['resolvido','Resolvidos'],['cancelado','Cancelados']].map(([s,label])=>`<button type="button" class="tab ${f.status===s?'is-active':''}" data-action="ticket-status" data-status="${s}" aria-pressed="${f.status===s}">${label}<span class="tab__count">${counts(s)}</span></button>`).join('')}</div>
      <div class="tickets-toolbar toolbar">
        <label class="search-input" for="ticket-search"><span class="sr-only">Buscar chamado, elevador ou local</span>${icon('Search',18)}<input class="filter-input" id="ticket-search" data-input="ticket-search" value="${esc(f.search)}" placeholder="Buscar chamado, elevador ou local"></label>
        ${filterSelect('filter-priority','Prioridade',{'':'Todas as prioridades',...PRIORITIES},f.priority)}
        ${filterSelect('filter-work','Classificação',{'':'Todas as classificações',...WORKS},f.work)}
      </div>
      <div class="results-line"><span><strong>${matched.length}</strong> ${matched.length===1?'chamado encontrado':'chamados encontrados'}</span>${activeFilters?button('Limpar filtros',{action:'clear-ticket-filters',tone:'quiet',name:'X',className:'button--small'}):''}</div>
      ${context.length?`<div class="active-filters">${context.map(label=>badge(label,'purple')).join('')}</div>`:''}
      ${list.length?`<div class="table-wrap"><table class="data-table responsive-table ticket-table"><thead><tr><th>Chamado</th><th>Equipamento / local</th><th>Responsável</th><th>Prioridade</th><th>Status</th><th>Prazo</th><th><span class="sr-only">Ação</span></th></tr></thead><tbody>${list.map(c=>`<tr data-ticket-row="${c.id}">
        <td class="card-title" data-label="Chamado"><div class="cell-stack"><span class="ticket-number">#${c.id} <span>${fmtDate(c.aberto_em,{dateOnly:true})}</span></span><strong class="cell-title">${esc(c.titulo)}</strong></div></td>
        <td data-label="Equipamento / local"><div class="cell-stack"><strong>${esc(c.elevador_codigo)}</strong><span class="text-muted text-small">${esc(c.local_nome)}</span></div></td>
        <td data-label="Responsável"><span class="text-small ${c.tecnico?'':'text-muted'}">${esc(personName(c.tecnico))}</span></td>
        <td data-label="Prioridade">${priorityBadge(c.prioridade)}</td>
        <td data-label="Status">${statusBadge(c.status)}</td>
        <td data-label="Prazo">${slaCell(c)}</td>
        <td class="card-action">${button('Detalhes',{action:'open-ticket',tone:'quiet',name:'ChevronRight',className:'button--small',attrs:'data-id="'+c.id+'" aria-label="Ver chamado #'+c.id+'"'})}</td>
      </tr>`).join('')}</tbody></table></div><div class="table-footer pagination-footer"><span>${start+1}–${Math.min(start+pageSize,matched.length)} de ${matched.length} chamados</span><div>${button('Anterior',{action:'ticket-page',attrs:'data-page="'+(state.ui.ticketPage-1)+'" '+(state.ui.ticketPage===1?'disabled':''),className:'button--small'})}<span>${state.ui.ticketPage} / ${pages}</span>${button('Próxima',{action:'ticket-page',attrs:'data-page="'+(state.ui.ticketPage+1)+'" '+(state.ui.ticketPage===pages?'disabled':''),className:'button--small'})}</div></div>`:emptyState('Nenhum chamado encontrado','Tente outro termo ou ajuste os filtros para encontrar um atendimento.',{name:'SearchX',action:button('Limpar filtros',{action:'clear-ticket-filters'})})}
    </section>`;
}
function fact(label,value){return `<div class="ticket-fact"><span>${label}</span><div>${value}</div></div>`;}
function renderOverview(c){
  return `<div class="ticket-overview">
    <div class="ticket-facts">
      ${fact('Equipamento',`<strong>${esc(c.elevador_codigo)}</strong><small>${esc(c.elevador_modelo)}</small>`)}
      ${fact('Local',`<strong>${esc(c.local_nome)}</strong><small>${esc(c.bairro)}</small>`)}
      ${fact('Responsável',esc(personName(c.tecnico)))}
      ${fact('Zona',esc(zoneName(c.zona_id)))}
      ${fact('Prazo de atendimento',`${c.sla_horas} horas<small>Até ${fmtDate(dueAt(c))}</small>`)}
      ${fact('Classificação',workBadge(c.tipo_obra))}
    </div>
    <section class="ticket-section"><h3>Descrição do problema</h3><p class="body-copy">${esc(c.descricao||'Nenhuma descrição foi registrada para este chamado.')}</p></section>
    ${c.solucao?`<section class="solution-note"><div>${icon('CircleCheck',18)}<h3>Solução registrada</h3></div><p class="body-copy">${esc(c.solucao)}</p><span>Encerrado em ${fmtDate(c.resolvido_em)}</span></section>`:''}
    ${renderTiming(c)}
    <section id="ai-panel">${renderAi(state.ui.ticket.ai,c)}</section>
  </div>`;
}
function renderEdit(c){
  if(!canEdit(c))return notice('Este chamado pode ser alterado apenas pelo responsável ou pelo supervisor da zona.','LockKeyhole');
  const draft=state.ui.ticket.draft;
  const statuses=isSupervisor()?STATUS:c.status==='resolvido'?{resolvido:STATUS.resolvido}:{aberto:STATUS.aberto,em_andamento:STATUS.em_andamento,resolvido:STATUS.resolvido};
  return `<form id="ticket-edit-form" data-form="ticket-edit" class="form-stack">
    ${notice('Registre a solução aplicada antes de marcar o atendimento como resolvido.','ClipboardCheck','purple')}
    <div class="field-grid">
      <label class="field" for="ed-status"><span class="field__label">Status do atendimento</span><span class="select-wrap"><select id="ed-status" name="status" data-draft="status">${options(statuses,draft.status)}</select>${icon('ChevronDown',16)}</span></label>
      ${isSupervisor()?`<label class="field" for="ed-tec"><span class="field__label">Técnico responsável</span><span class="select-wrap"><select id="ed-tec" name="tecnico" data-draft="tecnico">${options({'':'Não atribuído',...Object.fromEntries(team().map(p=>[p.matricula,p.nome]))},draft.tecnico)}</select>${icon('ChevronDown',16)}</span></label>`:''}
    </div>
    ${isSupervisor()?`<div class="field-grid"><label class="field" for="ed-obra"><span class="field__label">Classificação</span><span class="select-wrap"><select id="ed-obra" name="tipo_obra" data-draft="tipo_obra">${options(WORKS,draft.tipo_obra)}</select>${icon('ChevronDown',16)}</span></label><label class="field" for="ed-prio"><span class="field__label">Prioridade</span><span class="select-wrap"><select id="ed-prio" name="prioridade" data-draft="prioridade">${options(PRIORITIES,draft.prioridade)}</select>${icon('ChevronDown',16)}</span></label></div><label class="field field--short" for="ed-sla"><span class="field__label">SLA em horas</span><input id="ed-sla" type="number" name="sla_horas" data-draft="sla_horas" min="1" max="8760" required value="${draft.sla_horas}"></label>`:''}
    <label class="field" for="ed-desc"><span class="field__label">Descrição do problema</span><textarea id="ed-desc" name="descricao" data-draft="descricao" rows="4" maxlength="10000">${esc(draft.descricao)}</textarea></label>
    <label class="field" for="ed-solucao"><span class="field__label">Solução aplicada ${draft.status==='resolvido'?'<em>*</em>':''}</span><textarea id="ed-solucao" name="solucao" data-draft="solucao" rows="5" maxlength="10000" placeholder="Descreva o diagnóstico e a solução efetivamente aplicada." ${draft.status==='resolvido'?'required':''}>${esc(draft.solucao)}</textarea><span class="field__hint">Seu registro compõe o histórico do equipamento e ajuda nos próximos atendimentos.</span></label>
    <p class="field-error" data-form-error role="alert" hidden></p>
  </form>`;
}
function renderHistory(c){
  return `<div class="history-summary">${icon('History',18)}<span>${c.historico.length} registros no histórico deste chamado</span></div><ol class="timeline">${c.historico.slice().reverse().map(h=>`<li><span class="timeline__icon">${icon('ClipboardCheck',17)}</span><div><div class="timeline__by"><strong>${esc(h.usuario)}</strong><time>${fmtDate(h.data)}</time></div><p>${esc(h.alteracao)}</p></div></li>`).join('')}</ol>`;
}
export function renderTicketDialog(){
  const current=state.ui.ticket,c=current?.record;if(!c)return '';
  const tabs={overview:'Visão geral',edit:'Atendimento',files:'Anexos'+(c.total_anexos?' ('+c.total_anexos+')':''),history:'Histórico'};
  return `<div class="sheet-header"><div><div class="sheet-eyebrow">CHAMADO #${c.id} · ${esc(c.elevador_codigo)}</div><h2 id="ticket-title">${esc(c.titulo)}</h2><div class="sheet-tags">${statusBadge(c.status)}${priorityBadge(c.prioridade)}<span id="ticket-sla">${slaBadge(c)}</span></div></div>${iconButton('X','Fechar detalhes do chamado','close-ticket')}</div>
    <div class="sheet-tabs tabs">${Object.entries(tabs).map(([key,label])=>`<button type="button" class="tab ${current.tab===key?'is-active':''}" data-action="ticket-tab" data-tab="${key}" aria-pressed="${current.tab===key}">${label}</button>`).join('')}</div>
    <div class="sheet-body" id="ticket-body">${current.tab==='overview'?renderOverview(c):current.tab==='edit'?renderEdit(c):current.tab==='files'?renderAttachments(c):renderHistory(c)}</div>
    <div class="sheet-footer"><span>${icon('CalendarDays',15)} Aberto em ${fmtDate(c.aberto_em,{dateOnly:true})}</span><div>${button('Fechar',{action:'close-ticket'})}
    ${canEdit(c)&&['aberto','em_andamento'].includes(c.status)?`<div class="attendance-actions">${button(c.atendimento_ativo_desde?'Pausar atendimento':c.iniciado_em?'Retomar atendimento':'Iniciar atendimento',{action:c.atendimento_ativo_desde?'attendance-pause':'attendance-start',name:c.atendimento_ativo_desde?'Pause':'Play',tone:'secondary'})}${button('Concluir atendimento',{action:'attendance-finish',name:'CircleCheck',tone:'primary'})}</div>`:''}
    ${current.tab==='edit'&&canEdit(c)?`<button type="submit" form="ticket-edit-form" class="button button--primary" id="ticket-save">${icon('Check',18)}${current.draft.status==='resolvido'&&c.status!=='resolvido'?'Confirmar conclusão':'Salvar atendimento'}</button>`:canEdit(c)&&c.status==='resolvido'?button('Revisar registro',{action:'ticket-tab',attrs:'data-tab="edit"',tone:'secondary',name:'SquarePen'}):''}</div></div>`;
}
export function renderAi(ai,c){
  if(!ai)return `<div class="assistant-panel"><div class="assistant-panel__heading"><span>${icon('Sparkles',19)}Assistente de diagnóstico</span></div><div class="loading-state"><span class="spinner"></span>Analisando o histórico do elevador…</div></div>`;
  if(ai.error)return `<div class="assistant-panel"><p class="body-copy">${esc(ai.error)}</p>${button('Tentar novamente',{action:'retry-ai',name:'RefreshCw'})}</div>`;
  const refs=new Set(ai.evidencias_ids);
  const evidence=ai.evidencias.filter(e=>refs.has(e.id));
  return `<div class="assistant-panel">
    <div class="assistant-panel__heading"><span>${icon('Sparkles',19)}Assistente de diagnóstico</span>${badge(ai.provedor==='openai'?'Síntese por IA':'Análise do histórico','purple')}</div>
    <h3>${esc(ai.resumo)}</h3><p>${esc(ai.hipotese)}</p>
    ${ai.intervalo_medio_dias!=null?`<div class="recurrence-note">${icon('Repeat2',16)}Intervalo médio anterior: <strong>${Number(ai.intervalo_medio_dias).toLocaleString('pt-BR')} dias</strong></div>`:''}
    <div class="assistant-suggestion"><span>Sugestão para análise</span><p>${esc(ai.sugestao)}</p></div>
    ${evidence.length?`<details class="evidence-details"><summary>${evidence.length} atendimentos que sustentam esta análise</summary><div class="evidence-list">${evidence.map(e=>`<article class="evidence-card"><div>${button('Chamado #'+e.id,{action:'open-ticket',tone:'quiet',className:'button--small',attrs:'data-id="'+e.id+'"'})}${badge(e.mesmo_elevador?'Mesmo elevador':e.elevador_codigo,e.mesmo_elevador?'green':'neutral')}</div><p>${esc(e.solucao)}</p><span>Resolvido em ${fmtDate(e.resolvido_em)}</span></article>`).join('')}</div></details>`:''}
    <p class="assistant-limit">${icon('Info',14)}<span>${esc(ai.limites)}</span></p>
    ${ai.aviso?notice(ai.aviso,'Info','warning'):''}
    ${canEdit(c)?`<div class="assistant-feedback"><span>Esta análise ajudou?</span>${button('Sim',{action:'ai-feedback',name:'ThumbsUp',className:'button--small',attrs:'data-id="'+ai.id+'" data-helpful="true" aria-pressed="'+(state.ui.ticket.feedback===true)+'"'})}${button('Não',{action:'ai-feedback',name:'ThumbsDown',className:'button--small',attrs:'data-id="'+ai.id+'" data-helpful="false" aria-pressed="'+(state.ui.ticket.feedback===false)+'"'})}</div>`:''}
  </div>`;
}
