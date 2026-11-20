import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suggestForTicket, retrieveEvidence } from '../server/ai.mjs';

const current={id:10,revisao:1,regiao:'capital',elevador_id:1,elevador_codigo:'BAR-001',titulo:'Porta com falha no sensor',descricao:'Porta interrompe fechamento.',aberto_em:'2026-11-10T12:00:00Z'};
const earlier={id:1,revisao:1,regiao:'capital',elevador_id:1,elevador_codigo:'BAR-001',titulo:'Porta com falha no sensor',descricao:'Porta interrompe fechamento.',aberto_em:'2026-11-01T12:00:00Z',resolvido_em:'2026-11-01T14:00:00Z',status:'resolvido',solucao:'Solução fictícia documentada.'};
function fakeDatabase(){return {async query(sql){return {rows:sql.startsWith('SELECT')?[]:[{id:20}]};}};}
test('sem evidência: não inventa solução e não chama provedor',async()=>{
  const result=retrieveEvidence(current,[{...earlier,regiao:'interior'}, {...earlier,id:2,aberto_em:'2026-11-11T12:00:00Z'}]);
  assert.deepEqual(result.evidencias,[]);
  const answer=await suggestForTicket(fakeDatabase(),current,[]);
  assert.deepEqual(answer.evidencias_ids,[]);
  assert.match(answer.sugestao,/Não há soluções anteriores suficientes/);
});
test('provedor generativo só é aceito com referências válidas; falha retorna análise local explícita',async()=>{
  const previousFetch=globalThis.fetch;
  const previousKey=process.env.OPENAI_API_KEY;
  const previousModel=process.env.OPENAI_MODEL;
  process.env.OPENAI_API_KEY='chave-ficticia-do-teste';
  process.env.OPENAI_MODEL='modelo-ficticio-do-teste';
  let lastRequest;
  const response=ids=>({output:[{content:[{type:'output_text',text:JSON.stringify({resumo:'Recorrência documentada.',hipotese:'Sintomas semelhantes no conjunto de detecção.',sugestao:'Consultar a solução registrada e validar o atendimento atual.',evidencias_ids:ids,limites:'Hipótese baseada apenas nos registros fornecidos.'})}]}]});
  try{
    globalThis.fetch=async (_url,options)=>{lastRequest=JSON.parse(options.body);return new Response(JSON.stringify(response([1])),{status:200});};
    const valid=await suggestForTicket(fakeDatabase(),current,[earlier]);
    assert.equal(valid.provedor,'openai');
    assert.equal(lastRequest.store,false);
    assert.deepEqual(valid.evidencias_ids,[1]);
    globalThis.fetch=async()=>new Response(JSON.stringify(response([999])),{status:200});
    const invalid=await suggestForTicket(fakeDatabase(),current,[earlier]);
    assert.equal(invalid.provedor,'local_tfidf');
    assert.ok(invalid.aviso);
    assert.deepEqual(invalid.evidencias_ids,[1]);
    globalThis.fetch=async()=>{throw new Error('Falha de rede simulada');};
    const unavailable=await suggestForTicket(fakeDatabase(),current,[earlier]);
    assert.equal(unavailable.provedor,'local_tfidf');
    assert.match(unavailable.aviso,/indisponível/);
  }finally{
    globalThis.fetch=previousFetch;
    if(previousKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previousKey;
    if(previousModel===undefined)delete process.env.OPENAI_MODEL;else process.env.OPENAI_MODEL=previousModel;
  }
});
