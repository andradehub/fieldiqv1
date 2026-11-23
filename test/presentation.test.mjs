import {test} from 'node:test';
import assert from 'node:assert/strict';
import {state} from '../fieldiqarchives/public/assets/js/core/state.js';
import {dashboardData} from '../fieldiqarchives/public/assets/js/views/dashboard.js';
import {filteredTickets} from '../fieldiqarchives/public/assets/js/views/tickets.js';
import {weekKey,fmtTime,average} from '../fieldiqarchives/public/assets/js/core/format.js';
import {parseCSV,normalizeRow} from '../fieldiqarchives/public/assets/js/core/import.js';

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
    {id:1,titulo:'Ruído na cabine',descricao:'',elevador_codigo:'BAR-001',local_nome:'Barra',elevador_id:1,status:'aberto',prioridade:'alta',tipo_obra:'mod_parcial',tecnico:'A'},
    {id:2,titulo:'Ruído na cabine',descricao:'',elevador_codigo:'BOT-001',local_nome:'Botafogo',elevador_id:2,status:'resolvido',prioridade:'alta',tipo_obra:'mod_parcial',tecnico:'B'}
  ];
  state.ui.filters={search:'ruido',status:'pending',equipment:'1'};
  assert.deepEqual(filteredTickets().map(c=>c.id),[1]);
  state.ui.filters={search:'BOT-001'};
  assert.deepEqual(filteredTickets().map(c=>c.id),[2]);
});
test('CSV da prévia preserva aspas, quebras de linha e datas de planilha',()=>{
  const rows=parseCSV('titulo;elevador_codigo;descricao\n"Porta; térreo";BAR-001;"Falha\nintermitente"\n');
  assert.equal(rows[0].titulo,'Porta; térreo');
  assert.equal(rows[0].descricao,'Falha\nintermitente');
  assert.equal(normalizeRow({abertura:new Date('2026-01-01T12:00:00Z')}).aberto_em,'2026-01-01T12:00:00.000Z');
  assert.notEqual(weekKey('2025-01-10T12:00:00Z'),weekKey('2026-01-10T12:00:00Z'));
  assert.equal(fmtTime(average([0,0])),'0 min');
});
