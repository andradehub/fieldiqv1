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
test('identificação de recorrências usa somente histórico local, mesmo com configurações antigas de LLM',async()=>{
  const previousFetch=globalThis.fetch,previousKey=process.env.OPENAI_API_KEY,previousModel=process.env.OPENAI_MODEL;
  process.env.OPENAI_API_KEY='valor-ficticio-antigo';process.env.OPENAI_MODEL='modelo-antigo';
  try{
    globalThis.fetch=()=>{throw new Error('Não deve haver chamada externa');};
    const result=await suggestForTicket(fakeDatabase(),current,[earlier]);
    assert.equal(result.provedor,'local_tfidf');assert.equal(result.aviso,null);assert.deepEqual(result.evidencias_ids,[1]);
    assert.match(result.limites,/avaliação completa do técnico/);assert.match(result.sugestao,/Solução fictícia documentada/);
  }finally{
    globalThis.fetch=previousFetch;
    if(previousKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previousKey;
    if(previousModel===undefined)delete process.env.OPENAI_MODEL;else process.env.OPENAI_MODEL=previousModel;
  }
});
