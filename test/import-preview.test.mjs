import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readImport,readMigration} from '../fieldiqarchives/public/assets/js/core/import.js';

const jsonFile=value=>new File([JSON.stringify(value)],'dados.json',{type:'application/json'});

test('base fictícia completa é reconhecida sem virar uma linha vazia de chamado',async()=>{
  const file=new File([await readFile(new URL('../fieldiqarchives/public/demonstracao-fieldiq.json',import.meta.url))],'demonstracao-fieldiq.json');
  const result=await readImport(file);
  assert.equal(result.kind,'migration');
  assert.equal(result.rows,undefined);
  assert.equal(result.pack.pessoas.length,40);
  assert.equal(result.pack.chamados.length,160);
  assert.ok(result.pack.pessoas.every(person=>person.foto.startsWith('data:image/png;base64,')));
  assert.deepEqual(await readMigration(file),result.pack);
});

test('JSON com lista ou chamado único e CSV preservam a importação de chamados',async()=>{
  const row={title:'Porta travada',equipamento:'BAR-001',situacao:'Em andamento'};
  for(const value of [[row],row]){
    const result=await readImport(jsonFile(value));
    assert.equal(result.kind,'tickets');
    assert.deepEqual(result.rows,[{titulo:'Porta travada',elevador_codigo:'BAR-001',status:'em_andamento'}]);
  }
  const csv=await readImport(new File(['titulo;elevador_codigo\nPorta travada;BAR-001'],'dados.csv'));
  assert.equal(csv.kind,'tickets');
  assert.equal(csv.rows[0].elevador_codigo,'BAR-001');
});

test('objetos incompatíveis e pacotes desconhecidos não geram prévia enganosa',async()=>{
  for(const value of [{},{chamados:[{titulo:'Porta'}]},{formato:'outro-v2'},null]){
    await assert.rejects(readImport(jsonFile(value)));
  }
  await assert.rejects(readMigration(jsonFile([{titulo:'Porta'}])),/fieldiq-legado-v1/);
  await assert.rejects(readImport(new File(['{invalido'],'dados.json')),SyntaxError);
});

test('arquivos JSON com BOM são reconhecidos e limites de tamanho continuam válidos',async()=>{
  const file=new File(['\uFEFF'+JSON.stringify({formato:'fieldiq-legado-v1',origem:'Exemplo',chamados:[]})],'base.json');
  assert.equal((await readImport(file)).kind,'migration');
  assert.equal((await readMigration(file)).origem,'Exemplo');
  const large=new File([' '.repeat(2000001)],'base.json');
  await assert.rejects(readImport(large),/2 MB/);
  await assert.rejects(readMigration(large),/2 MB/);
});
