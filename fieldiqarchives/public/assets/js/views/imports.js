import {state} from '../core/state.js';
import {esc,fmtBytes,fmtDate} from '../core/format.js';
import {icon,heading,button,badge,panelHeader,emptyState,statusBadge,notice} from '../components/ui.js';
export function renderImports(){
  const upload=state.ui.upload;
  return heading('ENTRADA DE DADOS','Importar chamados','Traga o histórico da sua operação com identificação por equipamento.',`<a class="button button--secondary" href="/exemplo-importacao.csv" download>${icon('Download',18)}Baixar exemplo CSV</a>`)+`
    <div class="import-layout">
      <section class="panel">${panelHeader('Importar um arquivo','Revise uma prévia antes de enviar os registros.')}
        <div class="panel-body">
          ${!upload?`<label class="upload-zone" id="drop-zone" for="import-file"><span class="upload-zone__icon">${icon('CloudUpload',32)}</span><strong>Arraste seu arquivo até aqui</strong><span>ou <b>selecione no dispositivo</b></span><div>${badge('CSV / TXT')}${badge('Excel')}${badge('JSON')}</div><small>Até 2 MB · até 500 linhas por arquivo</small><input class="sr-only" type="file" id="import-file" data-change="import-file" accept=".csv,.txt,.json,.xlsx,.xls"></label>`:`
          <div class="uploaded-file"><span class="file-type-icon">${icon('FileSpreadsheet',25)}</span><div><strong>${esc(upload.file.name)}</strong><span>${fmtBytes(upload.file.size)}${upload.rows?' · '+upload.rows.length+' registros':''}</span></div>${button('Remover',{action:'clear-upload',name:'X',className:'button--small'})}</div>
          ${upload.reading?`<div class="loading-state"><span class="spinner"></span>Lendo e preparando a prévia…</div>`:upload.error?`<p class="field-error" role="alert">${esc(upload.error)}</p>`:`
          <div class="import-preview-heading"><strong>Prévia dos registros</strong><span>Primeiras ${Math.min(upload.rows.length,5)} linhas</span></div>
          <div class="table-wrap"><table class="data-table responsive-table import-preview"><thead><tr><th>Título</th><th>Elevador</th><th>Status</th></tr></thead><tbody>${upload.rows.slice(0,5).map(row=>`<tr><td class="card-title"><span class="cell-title">${esc(row.titulo||'Título não informado')}</span></td><td data-label="Equipamento">${row.elevador_codigo?esc(row.elevador_codigo):badge('Não informado','red')}</td><td data-label="Status">${statusBadge(row.status||'aberto')}</td></tr>`).join('')}</tbody></table></div>
          ${upload.result?`<div id="import-result" class="import-result">${notice(upload.result.importadas+' registro(s) importado(s). '+upload.result.erros+' linha(s) ignorada(s).',upload.result.importadas?'CircleCheck':'Info',upload.result.importadas?'success':'warning')}${upload.result.detalhes.length?`<details><summary>Conferir linhas ignoradas</summary><ul class="import-errors">${upload.result.detalhes.map(d=>`<li><strong>Linha ${d.linha}</strong><span>${esc(d.erro)}</span></li>`).join('')}</ul></details>`:''}</div><div class="import-actions">${button('Importar outro arquivo',{action:'clear-upload',name:'Upload'})}</div>`:`<p class="import-preview-note">As datas e o equipamento de cada linha serão validados no envio.</p><div class="import-actions"><span>${upload.rows.length} linhas para processar</span>${button('Importar registros',{action:'submit-import',tone:'primary',name:'Upload',attrs:'id="import-submit"'})}</div>`}
          `}
          `}
        </div>
      </section>
      <aside class="panel import-guide">${panelHeader('Prepare seu arquivo','Um histórico completo melhora as próximas análises.')}<div class="panel-body">
        <div class="guide-item"><span>${icon('ListChecks',18)}</span><div><strong>Identifique o chamado</strong><p>Inclua as colunas <code>titulo</code> e <code>elevador_codigo</code>.</p></div></div>
        <div class="guide-item"><span>${icon('Building2',18)}</span><div><strong>Use um equipamento cadastrado</strong><p>O código precisa existir na zona da sua equipe.</p></div></div>
        <div class="guide-item"><span>${icon('CircleCheck',18)}</span><div><strong>Preserve a solução e as datas</strong><p>Para resolvidos, informe <code>solucao</code> e <code>resolvido_em</code>. Use datas ISO com fuso.</p></div></div>
        <div class="guide-item"><span>${icon('CopyCheck',18)}</span><div><strong>Confira o resultado</strong><p>Linhas inválidas e registros duplicados serão apresentados ao final.</p></div></div>
        <a class="button button--secondary button--full" href="/exemplo-importacao.csv" download>${icon('Download',17)}Usar arquivo de exemplo</a>
      </div></aside>
    </div>
    <section class="panel">${panelHeader('Histórico de importações','Arquivos enviados por você e seus resultados')}
    ${state.importacoes.length?`<div class="table-wrap"><table class="data-table responsive-table"><thead><tr><th>Arquivo</th><th>Formato</th><th>Importados</th><th>Ignorados</th><th>Data</th><th><span class="sr-only">Detalhes</span></th></tr></thead><tbody>${state.importacoes.map(row=>`<tr><td class="card-title"><div class="cell-person">${icon('FileSpreadsheet',21)}<strong class="cell-title">${esc(row.nome)}</strong></div></td><td data-label="Formato">${badge(row.formato.toUpperCase())}</td><td data-label="Importados">${badge(row.importadas+' registros','green')}</td><td data-label="Ignorados">${badge(row.erros+' linhas',row.erros?'amber':'neutral')}</td><td data-label="Data">${fmtDate(row.data)}</td><td class="card-action">${row.detalhes.length?button('Ver detalhes',{action:'import-details',attrs:'data-id="'+row.id+'"',tone:'quiet',className:'button--small'}):badge('Concluído','green','Check')}</td></tr>`).join('')}</tbody></table></div>`:emptyState('Seu histórico começa aqui','Depois do primeiro envio, acompanhe os arquivos e resultados nesta área.',{name:'FileClock'})}</section>`;
}
