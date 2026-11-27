import {state} from './state.js';
const collator=new Intl.Collator('pt-BR',{numeric:true,sensitivity:'base'});
export function compareValues(a,b){
  if(a==null&&b==null)return 0;
  if(a==null)return 1;if(b==null)return -1;
  if(typeof a==='number'&&typeof b==='number')return a-b;
  return collator.compare(String(a),String(b));
}
export function orderRows(rows,scope,columns,defaultSort={key:Object.keys(columns)[0],direction:'asc'}){
  const sort=state.ui.sorts?.[scope]??defaultSort,get=columns[sort.key];
  if(!get)return rows.slice();
  return rows.slice().sort((a,b)=>(sort.direction==='desc'?-1:1)*compareValues(get(a),get(b))||compareValues(a.nome??a.titulo??a.id,b.nome??b.titulo??b.id));
}
export function toggleSort(scope,key){
  state.ui.sorts??={};const current=state.ui.sorts[scope];
  state.ui.sorts[scope]={key,direction:current?.key===key&&current.direction==='asc'?'desc':'asc'};
}
