import {state,isAdmin} from '../core/state.js';
import {esc,fmtBytes,fmtDate} from '../core/format.js';
import {IMPORT_GROUPS} from '../core/import-preview.js';
import {icon,heading,button,badge,panelHeader,emptyState,notice} from '../components/ui.js';
import {renderFilePreview} from './import-preview.js';

function importReport(upload){
  const report=upload.result??upload.validation;
  if(!report)return '';
  if(upload.kind==='migration'){
    const done=report.importado||report.ja_importado;
    return `<section class="import-result" id="import-result" aria-label="Resultado da validação">${notice(report.ja_importado?'Este arquivo já foi importado. Nenhum registro será duplicado.':report.importado?'Importação concluída. Cadastros e vínculos preservados.':'Validação concluída. Confira o que será criado e reutilizado.','CircleCheck','success')}<div class="table-wrap" tabindex="0" role="region" aria-label="Cadastros da importação"><table class="data-table"><thead><tr><th>Categoria</th><th>${done?'Criados':'A criar'}</th><th>Reutilizados</th></tr></thead><tbody>${Object.entries(IMPORT_GROUPS).map(([key,label])=>`<tr><td>${label}</td><td>${report.resumo.criados[key]??0}</td><td>${report.resumo.reutilizados[key]??0}</td></tr>`).join('')}</tbody></table></div></section>`;
  }
  return `<section class="import-result" id="import-result" aria-label="Resultado da validação">${notice(upload.result?report.importadas+' chamado(s) importado(s). '+report.erros+' registro(s) ignorado(s).':report.validas+' chamado(s) a criar. '+report.duplicadas+' duplicado(s) e '+(report.erros-report.duplicadas)+' registro(s) com erro serão ignorados.',report.erros?'Info':'CircleCheck',report.erros?'warning':'success')}${report.detalhes.length?`<details class="import-errors-panel"><summary>Conferir registros ignorados (${report.detalhes.length})</summary><ul class="import-errors">${report.detalhes.map(d=>`<li><strong>Linha ${d.linha}</strong><span>${esc(d.erro)}</span></li>`).join('')}</ul></details>`:''}</section>`;
}
function importReview(upload){
  const done=upload.result||upload.validation?.ja_importado;
  const canConfirm=!done&&upload.validation?.validado&&(upload.kind==='migration'||upload.validation.validas>0);
  return `<div class="import-preview-heading">${badge(upload.kind==='migration'?'Base completa identificada':'Chamados identificados','purple',upload.kind==='migration'?'Database':'Tickets')}<span>${done?'Confira o resultado abaixo.':'Nenhum dado é gravado até sua confirmação.'}</span></div>
    ${upload.kind==='migration'?`<p class="import-preview-note">Origem: ${esc(upload.pack.origem??'Não informada')}. A base completa é importada em uma única operação. Contas novas começam inativas; defina senhas e ative-as na Gestão de usuários.</p>`:''}
    ${renderFilePreview(upload)}
    ${upload.validationError?`<div role="alert">${notice(upload.validationError,'TriangleAlert','warning')}</div>`:''}
    ${importReport(upload)}
    <div class="import-actions">${done?button('Importar outro arquivo',{action:'clear-upload',name:'Upload'}):`${button('Validar arquivo',{action:'validate-import',name:'ListChecks',attrs:'id="import-validate"'})}${canConfirm?button('Confirmar importação',{action:'confirm-import',tone:'primary',name:'DatabaseBackup',attrs:'id="import-submit"'}):''}`}</div>`;
}
export function renderImports(){
  const upload=state.ui.upload;
  return heading('ENTRADA DE DADOS','Importar dados','Selecione um arquivo, confira o conteúdo e confirme a importação.')+`
    <ol class="import-steps" aria-label="Etapas da importação"><li><span>1</span>Selecionar arquivo</li><li><span>2</span>Conferir e validar</li><li><span>3</span>Confirmar importação</li></ol>
    ${!isAdmin()?notice('Você pode importar chamados de equipamentos já cadastrados na sua zona. Bases completas com usuários e várias zonas exigem o perfil Administrativo / RH.','Info'):''}
    <div class="import-layout ${upload?'import-layout--review':''}">
      <section class="panel">${panelHeader(upload?'Confira o arquivo selecionado':'Selecione os dados para importar','O conteúdo é identificado automaticamente. Use o mesmo campo para chamados ou uma base completa.')}
        <div class="panel-body">
          ${!upload?`<label class="upload-zone" id="drop-zone" for="import-file"><span class="upload-zone__icon">${icon('CloudUpload',32)}</span><strong>Arraste seu arquivo até aqui</strong><span>ou <b>selecione no dispositivo</b></span><div>${badge('CSV / TXT')}${badge('Excel')}${badge('JSON')}</div><small>Até 2 MB · 500 chamados ou 1.000 registros em uma base completa</small><input class="sr-only" type="file" id="import-file" data-change="import-file" accept=".csv,.txt,.json,.xlsx,.xls"></label>`:`
            <div class="uploaded-file"><span class="file-type-icon">${icon(upload.kind==='migration'?'Database':'FileSpreadsheet',25)}</span><div><strong>${esc(upload.file.name)}</strong><span>${fmtBytes(upload.file.size)}</span></div>${button('Remover',{action:'clear-upload',name:'X',className:'button--small',attrs:'aria-label="Remover arquivo selecionado"'})}</div>
            ${upload.reading?'<div class="loading-state"><span class="spinner"></span>Lendo e preparando a prévia…</div>':upload.error?`<p class="field-error" role="alert">${esc(upload.error)}</p>`:importReview(upload)}
          `}
        </div>
      </section>
      ${!upload?`<aside class="panel import-guide">${panelHeader('Como funciona','Tudo começa pela seleção do arquivo.')}<div class="panel-body">
        <div class="guide-item"><span>${icon('ScanSearch',18)}</span><div><strong>O sistema identifica o conteúdo</strong><p>Uma planilha de chamados ou um JSON com cadastros e histórico usam a mesma entrada.</p></div></div>
        <div class="guide-item"><span>${icon('ListChecks',18)}</span><div><strong>Confira antes de importar</strong><p>Veja pessoas e fotos, zonas, equipamentos, chamados e históricos. Expanda as categorias e busque os registros.</p></div></div>
        <div class="guide-item"><span>${icon('CircleCheck',18)}</span><div><strong>Valide e confirme</strong><p>Veja os registros a criar, cadastros reutilizados, duplicados e erros. A confirmação revalida os dados antes de gravar.</p></div></div>
        <details class="import-examples"><summary>Baixar arquivos de exemplo</summary><a class="button button--secondary button--full" href="/exemplo-importacao.csv" download>${icon('Download',17)}Chamados em CSV</a>${isAdmin()?`<a class="button button--secondary button--full" href="/demonstracao-fieldiq.json" download>${icon('Download',17)}Base fictícia com fotos</a><a class="button button--secondary button--full" href="/exemplo-migracao.json" download>${icon('Download',17)}Base completa mínima</a>`:''}</details>
      </div></aside>`:''}
    </div>
    <section class="panel">${panelHeader('Histórico de importações de chamados','Arquivos de chamados enviados por você e seus resultados')}
    ${state.importacoes.length?`<div class="table-wrap"><table class="data-table responsive-table"><thead><tr><th>Arquivo</th><th>Formato</th><th>Importados</th><th>Ignorados</th><th>Data</th><th><span class="sr-only">Detalhes</span></th></tr></thead><tbody>${state.importacoes.map(row=>`<tr><td class="card-title"><strong class="cell-title">${esc(row.nome)}</strong></td><td data-label="Formato">${badge(row.formato.toUpperCase())}</td><td data-label="Importados">${badge(row.importadas+' registros','green')}</td><td data-label="Ignorados">${badge(row.erros+' linhas',row.erros?'amber':'neutral')}</td><td data-label="Data">${fmtDate(row.data)}</td><td class="card-action">${row.detalhes.length?button('Ver detalhes',{action:'import-details',attrs:'data-id="'+row.id+'"',tone:'quiet',className:'button--small'}):badge('Concluído','green','Check')}</td></tr>`).join('')}</tbody></table></div>`:emptyState('Seu histórico começa aqui','Depois de importar chamados, acompanhe os arquivos e resultados nesta área.',{name:'FileClock'})}</section>`;
}
