import {state} from '../core/state.js';
import {compareValues} from '../core/sorting.js';
import {icon} from './ui.js';
import {sortControls} from './table-sort.js';
function value(cell){
  const text=cell?.textContent.trim()??'';
  const date=text.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:,?\s+(\d{2}):(\d{2}))?$/);
  if(date)return Date.UTC(+date[3],+date[2]-1,+date[1],+(date[4]??0),+(date[5]??0));
  return /^-?\d+(?:[.,]\d+)?%?$/.test(text)?Number(text.replace('%','').replace(',','.')):text;
}
export function enhanceTables(root=document.getElementById('app-view')){
  root?.querySelectorAll('table.data-table').forEach((table,index)=>{
    if(table.querySelector('.table-sort')||!table.tHead||!table.tBodies[0])return;
    const scope='static:'+state.ui.route+':'+index;
    let controls;
    const apply=(column,direction)=>{
      [...table.tBodies[0].rows].sort((a,b)=>(direction==='desc'?-1:1)*compareValues(value(a.cells[column]),value(b.cells[column]))).forEach(row=>table.tBodies[0].append(row));
      [...table.tHead.rows[0].cells].forEach((cell,i)=>cell.setAttribute('aria-sort',i===column?(direction==='asc'?'ascending':'descending'):'none'));
      [...table.tHead.rows[0].cells].forEach((cell,i)=>{const button=cell.querySelector('.table-sort');if(button){button.querySelector('svg')?.remove();button.insertAdjacentHTML('beforeend',icon(i===column?(direction==='asc'?'ArrowUp':'ArrowDown'):'ArrowUpDown',14));}});
      if(controls){controls.querySelector('[name="sort-key"]').value=String(column);controls.querySelector('[name="sort-direction"]').value=direction;}
    };
    [...table.tHead.rows[0].cells].forEach((cell,column)=>{
      if(cell.querySelector('.sr-only')||!cell.textContent.trim())return;
      const button=document.createElement('button');button.type='button';button.className='table-sort';button.textContent=cell.textContent.trim();button.insertAdjacentHTML('beforeend',icon('ArrowUpDown',14));button.setAttribute('aria-label','Ordenar por '+cell.textContent.trim());
      button.addEventListener('click',()=>{state.ui.sorts??={};const previous=state.ui.sorts[scope];const direction=previous?.column===column&&previous.direction==='asc'?'desc':'asc';state.ui.sorts[scope]={column,direction};apply(column,direction);});cell.replaceChildren(button);
    });
    const previous=state.ui.sorts?.[scope];
    if(table.classList.contains('responsive-table')){
      const columns=Object.fromEntries([...table.tHead.rows[0].cells].map((cell,i)=>[String(i),cell.querySelector('.table-sort')?.textContent.trim()]).filter(([,label])=>label));
      const first=Object.keys(columns)[0];
      const container=document.createElement('div');container.innerHTML=sortControls(scope,columns,{key:previous?String(previous.column):first,direction:previous?.direction??'asc'});controls=container.firstElementChild;
      controls.querySelectorAll('select').forEach(select=>{delete select.dataset.change;select.addEventListener('change',()=>{const column=Number(controls.querySelector('[name="sort-key"]').value),direction=controls.querySelector('[name="sort-direction"]').value;state.ui.sorts[scope]={column,direction};apply(column,direction);});});
      table.closest('.table-wrap').before(controls);
    }
    if(previous&&table.tHead.rows[0].cells[previous.column]?.querySelector('.table-sort'))apply(previous.column,previous.direction);
  });
}
