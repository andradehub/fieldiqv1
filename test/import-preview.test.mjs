import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readImport,readMigration} from '../fieldiqarchives/public/assets/js/core/import.js';
import {previewGroups,previewPage,safePreviewPhoto} from '../fieldiqarchives/public/assets/js/core/import-preview.js';

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

test('prévia completa inclui todas as categorias e traduz vínculos sem perder os campos',async()=>{
  const pack=JSON.parse(await readFile(new URL('../fieldiqarchives/public/demonstracao-fieldiq.json',import.meta.url)));
  const groups=previewGroups({kind:'migration',pack});
  assert.deepEqual(groups.map(group=>group.rows.length),[10,40,20,40,160,280,40,160]);
  assert.ok(groups.find(group=>group.key==='pessoas').rows.every(row=>row.photo));
  const ticket=groups.find(group=>group.key==='chamados').rows[0];
  assert.ok(ticket.fields.some(([key,value])=>key==='Elevador'&&value.includes(pack.elevadores[0].codigo)));
  assert.ok(ticket.fields.some(([key])=>key==='Solução'));
  assert.ok(ticket.fields.some(([key])=>key==='Abertura'));
  assert.ok(groups.find(group=>group.key==='pessoas').rows[0].fields.some(([key])=>key==='CPF'));
});

test('busca ignora acentos, pagina todos os registros e limita cinco por página',()=>{
  const rows=previewGroups({kind:'tickets',rows:Array.from({length:12},(_,index)=>({titulo:'Inspeção '+index,elevador_codigo:'BAR-001'}))})[0].rows;
  assert.equal(previewPage(rows).rows.length,5);
  assert.equal(previewPage(rows,{page:3}).rows.length,2);
  assert.equal(previewPage(rows,{page:999}).page,3);
  assert.equal(previewPage(rows,{search:'inspecao 11'}).total,1);
  assert.equal(previewPage(rows,{search:'inexistente'}).rows.length,0);
});

test('prévia não carrega fotos externas ou SVG e tolera registros inválidos para validação',()=>{
  for(const source of ['https://example.com/foto.jpg','data:image/svg+xml;base64,PHN2Zz4=','javascript:alert(1)'])assert.equal(safePreviewPhoto(source),null);
  const groups=previewGroups({kind:'migration',pack:{pessoas:[null,{nome:'Teste',foto:'https://example.com/foto.jpg'}],zonas:'invalido'}});
  assert.equal(groups[0].rows.length,2);
  assert.equal(groups[0].rows[1].photo,null);
  assert.ok(groups[0].rows[1].fields.some(([key])=>key==='Foto'));
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
  for(const value of [{},{chamados:[{titulo:'Porta'}]},{formato:'outro-v2'},{formato:'fieldiq-legado-v1',pessoas:'inválido'},{formato:'fieldiq-legado-v1',chamados:Array(1001).fill({titulo:'Porta'})},null]){
    await assert.rejects(readImport(jsonFile(value)));
  }
  await assert.rejects(readMigration(jsonFile([{titulo:'Porta'}])),/fieldiq-legado-v1/);
  await assert.rejects(readImport(new File(['{invalido'],'dados.json')),SyntaxError);
});

test('arquivos JSON com BOM são reconhecidos e limites de tamanho continuam válidos',async()=>{
  const file=new File(['\uFEFF'+JSON.stringify({formato:'fieldiq-legado-v1',origem:'Exemplo',chamados:[{titulo:'Porta'}]})],'base.json');
  assert.equal((await readImport(file)).kind,'migration');
  assert.equal((await readMigration(file)).origem,'Exemplo');
  const large=new File([' '.repeat(2000001)],'base.json');
  await assert.rejects(readImport(large),/2 MB/);
  await assert.rejects(readMigration(large),/2 MB/);
});
