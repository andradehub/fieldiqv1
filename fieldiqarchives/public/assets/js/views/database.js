import {state} from '../core/state.js';
import {esc} from '../core/format.js';
import {icon,heading,button,badge,panelHeader,emptyState,notice} from '../components/ui.js';
function cell(value){
  if(value==null)return '<span class="db-null">NULL</span>';
  if(typeof value==='object')return `<details class="json-cell"><summary>Ver conteúdo</summary><pre>${esc(JSON.stringify(value,null,2))}</pre></details>`;
  if(typeof value==='boolean')return badge(value?'true':'false',value?'green':'neutral');
  if(String(value).length>180)return `<details class="db-long-text"><summary>${esc(String(value).slice(0,70))}…</summary><p class="db-cell-text">${esc(value)}</p></details>`;
  return `<span class="db-cell-text">${esc(value)}</span>`;
}
export function renderDatabase(){
  const db=state.ui.database;
  const header=heading('DADOS E ESTRUTURA','Banco de dados','Explore os registros e os relacionamentos da aplicação.',`<a class="button button--secondary" href="/api/banco/export" download>${icon('Download',18)}Exportar SQL</a>`);
  if(db.error)return header+notice(db.error,'TriangleAlert','warning')+button('Tentar novamente',{action:'reload-database',name:'RefreshCw'});
  if(!db.info)return header+`<div class="panel loading-state"><span class="spinner"></span>Consultando a estrutura do banco…</div>`;
  const data=db.data;
  const rows=(data?.linhas??[]).filter(row=>!db.search||JSON.stringify(row).toLowerCase().includes(db.search.toLowerCase()));
  const columns=data?.linhas.length?Object.keys(data.linhas[0]):data?.colunas.map(c=>c.column_name)??[];
  return header+`
    <div class="database-status"><span class="database-status__icon">${icon('Database',25)}</span><div><strong>${esc(db.info.engine)}</strong><span>Registros da área autorizada · consulta somente leitura</span></div>${badge('Somente leitura','purple','ShieldCheck')}</div>
    <div class="database-layout">
      <aside class="panel database-catalog"><div class="database-catalog__heading"><strong>Tabelas do sistema</strong><span>${db.info.tabelas.length}</span></div><nav aria-label="Selecionar tabela">${db.info.tabelas.map(t=>`<button type="button" data-action="db-table" data-table="${t.nome}" class="database-table ${db.table===t.nome?'is-active':''}" aria-pressed="${db.table===t.nome}">${icon('Table2',17)}<span>${esc(t.nome)}</span><small>${t.total}</small></button>`).join('')}</nav></aside>
      <section class="panel database-records">${panelHeader(db.table,'Até 100 registros por consulta',badge('Dados persistidos','green','HardDrive'))}
        <div class="database-toolbar"><label class="search-input"><span class="sr-only">Buscar nos registros exibidos</span>${icon('Search',18)}<input class="filter-input" id="db-search" data-input="db-search" value="${esc(db.search)}" placeholder="Buscar nos registros exibidos"></label></div>
        ${!data?`<div class="loading-state"><span class="spinner"></span>Carregando registros…</div>`:rows.length?`<p class="db-scroll-hint">${icon('MoveHorizontal',15)}Deslize a tabela para consultar todas as colunas.</p><div class="table-wrap db-scroll" tabindex="0" role="region" aria-label="Registros da tabela ${esc(db.table)}"><table class="data-table database-data"><thead><tr>${columns.map(key=>`<th>${esc(key)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${columns.map(key=>`<td>${cell(row[key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="table-footer">${rows.length} registro(s) exibido(s). Senhas e sessões não são disponibilizadas nesta consulta.</div>`:emptyState('Nenhum registro para exibir','Esta tabela está vazia ou nenhum registro corresponde à busca.',{name:'Table2'})}
        ${data?`<details class="database-details"><summary>Estrutura das colunas</summary><div class="column-list">${data.colunas.map(c=>`<div><code>${esc(c.column_name)}</code><span>${esc(c.data_type)}</span>${c.is_nullable==='NO'?badge('Obrigatório'):''}</div>`).join('')}</div></details>`:''}
      </section>
    </div>
    <section class="panel database-schema"><details><summary>Esquema SQL e relacionamentos</summary><pre>${esc(db.info.schema)}</pre></details><details><summary>Informações do banco</summary><pre>${esc(db.info.version)}</pre></details></section>`;
}
