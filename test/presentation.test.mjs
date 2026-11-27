import {test} from 'node:test';
import assert from 'node:assert/strict';
import {state} from '../fieldiqarchives/public/assets/js/core/state.js';
import {dashboardData} from '../fieldiqarchives/public/assets/js/views/dashboard.js';
import {filteredTickets,sortedTickets} from '../fieldiqarchives/public/assets/js/views/tickets.js';
import {toggleSort} from '../fieldiqarchives/public/assets/js/core/sorting.js';
import {weekKey,fmtTime,average} from '../fieldiqarchives/public/assets/js/core/format.js';

test('indicadores usam o recorte de abertura e excluem cancelados da resolução',()=>{
  const iso=days=>new Date(Date.now()-days*86400000).toISOString();
  state.chamados=[
    {id:1,status:'resolvido',aberto_em:iso(2)},
    {id:2,status:'aberto',aberto_em:iso(1)},
    {id:3,status:'cancelado',aberto_em:iso(1)},
    {id:4,status:'resolvido',aberto_em:iso(40)}
  ];
  state.ui.period='week';
  const result=dashboardData();
  assert.equal(result.selected.length,3);
  assert.equal(result.active.length,2);
  assert.equal(result.resolved.length,1);
  assert.equal(result.pending.length,1);
});
test('busca e filtros combinados preservam a identificação por equipamento',()=>{
  state.chamados=[
    {id:1,titulo:'Ruído na cabine',descricao:'',elevador_codigo:'BAR-001',local_nome:'Barra',elevador_id:1,status:'aberto',prioridade:'A',tipo_obra:'mod_parcial',tecnico:'A'},
    {id:2,titulo:'Ruído na cabine',descricao:'',elevador_codigo:'BOT-001',local_nome:'Botafogo',elevador_id:2,status:'resolvido',prioridade:'A',tipo_obra:'mod_parcial',tecnico:'B'}
  ];
  state.ui.filters={search:'ruido',status:'pending',equipment:'1'};
  assert.deepEqual(filteredTickets().map(c=>c.id),[1]);
  state.ui.filters={search:'BOT-001'};
  assert.deepEqual(filteredTickets().map(c=>c.id),[2]);
});
test('agrupamento semanal distingue anos e tempos iguais a zero são preservados',()=>{
  assert.notEqual(weekKey('2025-01-10T12:00:00Z'),weekKey('2026-01-10T12:00:00Z'));
  assert.equal(fmtTime(average([0,0])),'0 min');
});
test('prioridade ordena os registros nos dois sentidos para supervisor e técnico, inclusive valores anteriores à migração',()=>{
  state.chamados=[{id:1,titulo:'Média anterior',prioridade:'media',tecnico:'T'}, {id:2,titulo:'Leve atual',prioridade:'C',tecnico:'T'}, {id:3,titulo:'Alta anterior',prioridade:'alta',tecnico:'T'}, {id:4,titulo:'Crítica atual',prioridade:'A',tecnico:'OUTRO',equipe_matriculas:['T']}];
  state.ui.filters={};state.ui.route='meuschamados';
  for(const role of ['supervisor','tecnico']){
    state.user={role,matricula:'T'};state.ui.sorts={};toggleSort('meuschamados','prioridade');assert.deepEqual(sortedTickets().map(c=>c.id),[3,4,1,2]);
    toggleSort('meuschamados','prioridade');assert.deepEqual(sortedTickets().map(c=>c.id),[2,1,3,4]);
    state.ui.filters={priority:'A'};assert.deepEqual(sortedTickets().map(c=>c.id),[3,4]);state.ui.filters={};
  }
  state.ui.route='chamados';state.ui.sorts={};state.user=null;
});
