import {state,canEdit,isSupervisor} from '../core/state.js';
import {esc,fmtBytes,fmtDate,fmtTime} from '../core/format.js';
import {icon,button,notice,emptyState} from '../components/ui.js';
export function duration(seconds){const n=Math.max(0,Math.floor(Number(seconds)||0));return (Math.floor(n/3600)+'h '+String(Math.floor(n/60)%60).padStart(2,'0')+'m '+String(n%60).padStart(2,'0')+'s');}
export function renderTiming(c){
  const current=state.ui.ticket;
  return `<section class="ticket-section timing-section"><h3>${icon('Clock',18)}Tempos do chamado</h3><dl class="timing-grid">
    <div><dt>Abertura</dt><dd>${fmtDate(c.aberto_em)}</dd></div><div><dt>Primeiro início registrado</dt><dd>${c.iniciado_em?fmtDate(c.iniciado_em):'Ainda não registrado'}</dd></div>
    <div><dt>Encerramento</dt><dd>${c.resolvido_em?fmtDate(c.resolvido_em):'Em aberto'}</dd></div><div><dt>${c.status==='resolvido'?'Tempo de resolução':'Tempo desde a abertura'}</dt><dd data-ticket-elapsed>${c.status==='resolvido'?duration((new Date(c.resolvido_em)-new Date(c.aberto_em))/1000):duration((Date.now()-new Date(c.aberto_em))/1000)}</dd></div>
    <div><dt>Trabalho registrado${c.atendimento_ativo_desde?' · em atendimento':''}</dt><dd data-attendance-duration>${duration(c.tempo_atendimento_seg)}</dd></div><div><dt>SLA contratado</dt><dd>${c.sla_horas} horas corridas</dd></div></dl>
    <p class="text-small text-muted">O SLA conta da abertura ao encerramento. Pausas não suspendem o prazo. O trabalho registrado soma os períodos iniciados, sem as pausas.</p>
    ${current?.intervals?.length?`<details class="attendance-details"><summary>Ver períodos de atendimento (${current.intervals.length})</summary><ol class="attendance-list">${current.intervals.map(a=>`<li><strong>${esc(a.tecnico_nome)}</strong><span>${fmtDate(a.iniciado_em)} → ${a.encerrado_em?fmtDate(a.encerrado_em):'Em atendimento'}</span></li>`).join('')}</ol></details>`:''}</section>`;
}
export function renderAttachments(c){
  const current=state.ui.ticket,list=current?.attachments;
  return `<section class="ticket-section"><h3>Fotos e documentos</h3><p class="text-muted body-copy">Registre evidências e detalhes deste atendimento.</p>
    ${canEdit(c)?`<label class="attachment-upload" for="ticket-files">${icon('Paperclip',20)}<strong>Anexar arquivos</strong><span>JPG, PNG, WebP, PDF, TXT, CSV, DOCX ou XLSX · até 2 MB por arquivo</span><input id="ticket-files" data-change="ticket-files" type="file" multiple accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,.csv,.docx,.xlsx"></label><p class="text-small text-muted">Até 20 arquivos e 20 MB por chamado.</p>`:notice('Você pode consultar os anexos. Inclusões ficam disponíveis ao responsável e à gestão.','LockKeyhole')}
    ${current?.filesError?notice(current.filesError,'TriangleAlert','warning'):''}
    ${!list?'<div class="loading-state">Carregando anexos…</div>':list.length?`<div class="attachment-grid">${list.map(a=>`<article class="attachment-card">${a.tipo.startsWith('image/')?`<a class="attachment-preview" href="/api/anexos/${a.id}/arquivo" aria-label="Baixar ${esc(a.nome)}"><img src="/api/anexos/${a.id}/arquivo?preview=1" alt="${esc(a.nome)}" loading="lazy"></a>`:`<div class="attachment-document">${icon(a.tipo==='application/pdf'?'FileText':'File',34)}</div>`}<div class="attachment-info"><strong>${esc(a.nome)}</strong><span>${fmtBytes(a.tamanho)} · ${esc(a.autor)}</span><small>${fmtDate(a.criado_em)}</small><div class="row-actions"><a class="button button--quiet button--small" href="/api/anexos/${a.id}/arquivo">${icon('Download',15)}Baixar</a>${canEdit(c)&&(isSupervisor()||a.usuario_matricula===state.user.matricula)?button('Excluir',{action:'attachment-delete',attrs:'data-id="'+a.id+'"',name:'Trash2',tone:'quiet',className:'button--small'}):''}</div></div></article>`).join('')}</div>`:emptyState('Nenhum anexo neste chamado','Fotos e documentos ajudam a registrar o atendimento.',{name:'Paperclip'})}</section>`;
}
