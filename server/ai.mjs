import { createHash } from 'node:crypto';

const stopwords = new Set('a o as os um uma uns umas de da do das dos em no na nos nas para por com sem que e ao aos se esse essa este esta elevador equipamento chamado registro ficticio'.split(' '));
export function tokens(value) {
  return String(value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w => w.length > 2 && !stopwords.has(w));
}
const componentTerms = {
  porta:['porta','portas','fechamento','fechar'],
  sensor:['sensor','sensores','deteccao'],
  cabine:['cabine','ruido','barulho'],
  painel:['painel','quadro','botoeira','botao'],
  motor:['motor','tracao','maquina'],
  hidraulico:['hidraulico','oleo','pistao','vazamento'],
  iluminacao:['iluminacao','luzes','lampada']
};
function components(words) {
  return Object.entries(componentTerms).filter(([,terms]) => terms.some(t => words.includes(t))).map(([key]) => key);
}
function cosine(a,b) {
  let product=0, normA=0, normB=0;
  for (const [key,value] of a) { product += value * (b.get(key) ?? 0); normA += value*value; }
  for (const value of b.values()) normB += value*value;
  return normA && normB ? product/Math.sqrt(normA*normB) : 0;
}

// TF-IDF + cosine similarity ranks the text; equipment identity has precedence.
// It is a retrieval score, not a probability that a diagnosis is correct.
export function retrieveEvidence(ticket, history) {
  const base = history.filter(c => c.id !== ticket.id && c.regiao === ticket.regiao && new Date(c.aberto_em) < new Date(ticket.aberto_em));
  const documents = [ticket,...base].map(c => tokens(c.titulo + ' ' + c.descricao));
  const frequency = new Map();
  for (const words of documents) for (const word of new Set(words)) frequency.set(word,(frequency.get(word) ?? 0)+1);
  function vector(words) {
    const counts = new Map();
    for (const word of words) counts.set(word,(counts.get(word) ?? 0)+1);
    return new Map([...counts].map(([word,count]) => [word,(count/Math.max(words.length,1))*(Math.log((documents.length+1)/(frequency.get(word)+1))+1)]));
  }
  const target = vector(documents[0]);
  const targetComponents = components(documents[0]);
  const related = base.map((c,index) => {
    const similarity = cosine(target,vector(documents[index+1]));
    const matching = components(documents[index+1]).some(x => targetComponents.includes(x));
    return {...c,similaridade:similarity,mesmo_elevador:c.elevador_id === ticket.elevador_id,matching};
  }).filter(c => c.similaridade >= .18 || (c.matching && c.similaridade >= .06));
  related.sort((a,b) => Number(b.mesmo_elevador)-Number(a.mesmo_elevador) || b.similaridade-a.similaridade || new Date(b.aberto_em)-new Date(a.aberto_em));
  const same = related.filter(c => c.mesmo_elevador);
  const times = same.map(c => new Date(c.aberto_em).getTime()).sort((a,b) => a-b);
  const meanDays = times.length >= 2 ? Math.round((times.at(-1)-times[0])/(times.length-1)/86400000*10)/10 : null;
  return {
    componentes:targetComponents,
    ocorrencias_mesmo_elevador:same.length,
    intervalo_medio_dias:meanDays,
    evidencias:related.filter(c => c.status === 'resolvido' && c.solucao?.trim()).slice(0,6).map(c => ({
      id:c.id,elevador_id:c.elevador_id,elevador_codigo:c.elevador_codigo,
      mesmo_elevador:c.mesmo_elevador,titulo:c.titulo,descricao:c.descricao,
      solucao:c.solucao,aberto_em:c.aberto_em,resolvido_em:c.resolvido_em
    }))
  };
}
function localSynthesis(ticket, result) {
  const same = result.evidencias.filter(e => e.mesmo_elevador);
  const selected = same.length ? same : result.evidencias;
  const grouped = new Map();
  for (const e of selected) {
    const key = e.solucao.trim().toLowerCase();
    const entry = grouped.get(key) ?? {texto:e.solucao,ids:[]};
    entry.ids.push(e.id);
    grouped.set(key,entry);
  }
  const patterns = [...grouped.values()].sort((a,b) => b.ids.length-a.ids.length);
  return {
    resumo:result.ocorrencias_mesmo_elevador
      ? result.ocorrencias_mesmo_elevador + ' ocorrência(s) anterior(es) com sintomas semelhantes no elevador ' + ticket.elevador_codigo + '.'
      : 'Nenhuma recorrência anterior identificada neste elevador pelo histórico disponível.',
    hipotese:result.componentes.length ? 'Os sintomas têm similaridade com registros relacionados a: ' + result.componentes.join(', ') + '.' : 'O texto não permite identificar um componente com evidência suficiente.',
    sugestao:patterns.length ? 'Consultar os registros relacionados e comparar a solução documentada com as condições do atendimento atual. O histórico registra: ' + patterns[0].texto : 'Não há soluções anteriores suficientes para propor uma hipótese fundamentada. Registre o diagnóstico e a solução deste atendimento.',
    evidencias_ids:selected.slice(0,6).map(e => e.id),
    limites:'Este é apenas um direcionamento baseado no histórico. Similaridade e recorrência não confirmam a causa nem substituem a avaliação completa do técnico. Considere as condições atuais e outras causas possíveis.'
  };
}
export async function suggestForTicket(db,ticket,history) {
  const result = retrieveEvidence(ticket,history);
  const fingerprint = createHash('sha256').update(JSON.stringify({version:2,model:'local_tfidf',ticket:[ticket.id,ticket.revisao,ticket.titulo,ticket.descricao],history:history.map(c => [c.id,c.revisao,c.solucao,c.status,c.elevador_id]).sort((a,b) => a[0]-b[0])})).digest('hex');
  const cached = await db.query('SELECT id,resposta FROM sugestoes_ia WHERE chamado_id=$1 AND fingerprint=$2',[ticket.id,fingerprint]);
  if (cached.rows[0] && !cached.rows[0].resposta.aviso) return {...cached.rows[0].resposta,id:cached.rows[0].id};
  const analysis = localSynthesis(ticket,result);
  const provider = 'local_tfidf';
  const payload = {...result,...analysis,provedor:provider,aviso:null};
  const {rows} = await db.query('INSERT INTO sugestoes_ia (chamado_id,fingerprint,provedor,resposta) VALUES ($1,$2,$3,$4) ON CONFLICT(chamado_id,fingerprint) DO UPDATE SET resposta=EXCLUDED.resposta,provedor=EXCLUDED.provedor RETURNING id',[ticket.id,fingerprint,provider,JSON.stringify(payload)]);
  return {...payload,id:rows[0].id};
}
