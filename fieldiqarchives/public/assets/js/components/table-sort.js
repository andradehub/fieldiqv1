import {state} from '../core/state.js';
import {esc} from '../core/format.js';
import {icon} from './ui.js';
export function sortHeader(scope,key,label){
  const sort=state.ui.sorts?.[scope],active=sort?.key===key;
  return `<th aria-sort="${active?(sort.direction==='asc'?'ascending':'descending'):'none'}"><button type="button" class="table-sort" data-action="sort-table" data-scope="${esc(scope)}" data-key="${esc(key)}" aria-label="Ordenar por ${esc(label)}">${esc(label)}${icon(active?(sort.direction==='asc'?'ArrowUp':'ArrowDown'):'ArrowUpDown',14)}</button></th>`;
}
export function sortControls(scope,columns,defaultSort){
  const sort=state.ui.sorts?.[scope]??defaultSort;
  return `<div class="compact-sort" data-sort-controls="${esc(scope)}"><label class="field"><span class="field__label">Ordenar por</span><span class="select-wrap"><select name="sort-key" data-change="table-order" aria-label="Coluna para ordenação">${Object.entries(columns).map(([key,label])=>`<option value="${esc(key)}" ${sort.key===key?'selected':''}>${esc(label)}</option>`).join('')}</select>${icon('ChevronDown',16)}</span></label><label class="field"><span class="field__label">Ordem</span><span class="select-wrap"><select name="sort-direction" data-change="table-order" aria-label="Direção da ordenação"><option value="asc" ${sort.direction==='asc'?'selected':''}>Crescente</option><option value="desc" ${sort.direction==='desc'?'selected':''}>Decrescente</option></select>${icon('ChevronDown',16)}</span></label></div>`;
}
