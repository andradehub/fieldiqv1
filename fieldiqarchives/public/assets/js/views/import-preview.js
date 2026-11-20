import {esc,initials} from '../core/format.js';
import {previewPage,previewGroups} from '../core/import-preview.js';
import {button,badge,icon} from '../components/ui.js';
export function renderPreviewCategory(group,controls={}){
  const result=previewPage(group.rows,controls);
  return `<label class="field preview-search"><span class="field__label">Buscar em ${esc(group.label.toLowerCase())}</span><input id="preview-search-${group.key}" type="search" value="${esc(controls.search??'')}" data-preview-search="${group.key}" placeholder="Nome, identificação ou outro detalhe"></label>
    <p class="text-small text-muted" role="status">${result.total} registro(s) encontrado(s) · página ${result.page} de ${result.pages}</p>
    <div class="preview-records">${result.rows.map(row=>`<article class="preview-record"><h4>${group.key==='pessoas'?`<span class="avatar">${row.photo?`<img src="${esc(row.photo)}" alt="Foto de ${esc(row.title)}">`:esc(initials(row.title))}</span>`:''}<span>${esc(row.title)}</span></h4><dl>${row.fields.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl></article>`).join('')||'<p class="body-copy">Nenhum registro corresponde à busca.</p>'}</div>
    ${result.pages>1?`<nav class="preview-pagination" aria-label="Páginas de ${esc(group.label.toLowerCase())}">${button('Anterior',{action:'preview-page',name:'ChevronLeft',attrs:`data-group="${group.key}" data-page="${result.page-1}" ${result.page===1?'disabled':''}`})}<span>${result.page} / ${result.pages}</span>${button('Próxima',{action:'preview-page',name:'ChevronRight',attrs:`data-group="${group.key}" data-page="${result.page+1}" ${result.page===result.pages?'disabled':''}`})}</nav>`:''}`;
}
export function renderFilePreview(upload){
  const groups=previewGroups(upload);
  const total=groups.reduce((sum,group)=>sum+group.rows.length,0);
  const photos=upload.kind==='migration'&&Array.isArray(upload.pack.pessoas)?upload.pack.pessoas.filter(p=>p?.foto).length:0;
  return `<div class="import-preview-heading"><h3>O que está incluído no arquivo</h3>${badge(total+' registros','purple')}</div>
    <div class="import-summary">${groups.map(group=>`<div><span>${esc(group.label)}</span><strong>${group.rows.length}</strong></div>`).join('')}${photos?`<div><span>Fotos de perfil</span><strong>${photos}</strong></div>`:''}</div>
    <p class="import-preview-note">Expanda cada categoria para conferir todos os registros. A busca e a paginação ajudam a revisar o arquivo antes de confirmar.</p>
    <div class="preview-groups">${groups.map(group=>`<details class="preview-group" data-preview-group="${group.key}" ${upload.preview?.[group.key]?.open?'open':''}><summary>${icon(group.key==='pessoas'?'UsersRound':'ListChecks',18)}<span>${esc(group.label)}</span>${badge(group.rows.length)}</summary><div class="preview-group-body" id="preview-body-${group.key}">${renderPreviewCategory(group,upload.preview?.[group.key])}</div></details>`).join('')}</div>`;
}
