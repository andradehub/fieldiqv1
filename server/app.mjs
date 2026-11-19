import express from 'express';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { publicPerson, verifyPassword, readToken, hashToken, newToken } from './auth.mjs';
import { projectRoot, schemaSQL } from './db.mjs';
import { suggestForTicket } from './ai.mjs';

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function insist(condition, status, message) { if (!condition) throw new ApiError(status, message); }
function text(value, label, max = 10000) {
  insist(typeof value === 'string' && value.trim().length > 0 && value.length <= max, 400, label + ' inválido.');
  return value.trim();
}
function optionalText(value, max = 10000) {
  insist(value == null || (typeof value === 'string' && value.length <= max), 400, 'Texto inválido.');
  return (value ?? '').trim();
}
function oneOf(value, options, label) { insist(options.includes(value), 400, label + ' inválido.'); return value; }
function integer(value, label, min = 1, max = 2147483647) {
  const n = Number(value);
  insist(Number.isInteger(n) && n >= min && n <= max, 400, label + ' inválido.');
  return n;
}
function supervisor(user) { insist(user.role === 'supervisor', 403, 'Ação exclusiva do supervisor.'); }
function canEdit(user, ticket) {
  return user.role === 'supervisor' ? ticket.zona_id === user.zona_id : ticket.tecnico_matricula === user.matricula;
}
async function getTicket(db, id, user, lock = false) {
  const n = integer(id, 'Chamado');
  const result = await db.query('SELECT * FROM vw_chamados_metricas WHERE id=$1 AND regiao=$2', [n,user.regiao]);
  insist(result.rows.length, 404, 'Chamado não encontrado.');
  if (lock) await db.query('SELECT id FROM chamados WHERE id=$1 FOR UPDATE', [n]);
  // Read again after acquiring the lock so concurrent revisions cannot overwrite one another.
  return lock ? (await db.query('SELECT * FROM vw_chamados_metricas WHERE id=$1', [n])).rows[0] : result.rows[0];
}
async function equipment(db, id, user) {
  const result = await db.query('SELECT e.*, l.zona_id, z.regiao FROM elevadores e JOIN locais l ON l.id=e.local_id JOIN zonas z ON z.id=l.zona_id WHERE e.id=$1', [integer(id,'Elevador')]);
  const e = result.rows[0];
  insist(e && e.regiao === user.regiao, 404, 'Elevador não encontrado.');
  insist(e.zona_id === user.zona_id && e.ativo, 403, 'Escolha um elevador ativo da sua zona.');
  return e;
}
async function technician(db, matricula, zone) {
  if (!matricula) return null;
  const result = await db.query("SELECT matricula FROM pessoas WHERE matricula=$1 AND role='tecnico' AND ativo AND zona_id=$2", [text(matricula,'Matrícula',40),zone]);
  insist(result.rows.length, 400, 'O técnico precisa pertencer à equipe da zona do elevador.');
  return matricula;
}
const works = ['obra_nova','mod_integral','mod_parcial'];
const priorities = ['baixa','media','alta','critica'];
const statuses = ['aberto','em_andamento','resolvido','cancelado'];

async function insertTicket(db, body, user, imported = false) {
  const e = await equipment(db, body.elevador_id, user);
  const tech = await technician(db, body.tecnico || null, e.zona_id);
  const status = imported ? oneOf(body.status ?? 'aberto',statuses,'Status') : 'aberto';
  const title = text(body.titulo,'Título',200);
  const desc = optionalText(body.descricao);
  const solution = optionalText(body.solucao);
  const open = imported && body.aberto_em ? new Date(body.aberto_em) : new Date();
  const close = status === 'resolvido' && body.resolvido_em ? new Date(body.resolvido_em) : null;
  insist(Number.isFinite(open.getTime()) && open.getTime() <= Date.now() + 60000, 400, 'Data de abertura inválida ou futura.');
  insist(status !== 'resolvido' || (solution && close && Number.isFinite(close.getTime()) && close >= open && close.getTime() <= Date.now() + 60000), 400, 'Chamado resolvido exige solução e data de resolução válidas.');
  const type = oneOf(body.tipo_obra ?? 'mod_parcial',works,'Classificação');
  const priority = oneOf(body.prioridade ?? 'media',priorities,'Prioridade');
  const sla = integer(body.sla_horas ?? 24,'SLA',1,8760);
  const key = imported ? createHash('sha256').update(JSON.stringify([e.id,title,desc,status,body.aberto_em ?? '',body.resolvido_em ?? '',solution])).digest('hex') : null;
  const row = await db.query(
    'INSERT INTO chamados (elevador_id,titulo,descricao,tipo_obra,prioridade,status,sla_horas,tecnico_matricula,aberto_em,resolvido_em,solucao,criado_por,chave_importacao) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id',
    [e.id,title,desc,type,priority,status,sla,tech,open.toISOString(),close?.toISOString() ?? null,solution || null,user.matricula,key]
  );
  const id = row.rows[0].id;
  await db.query('INSERT INTO historico_chamados (chamado_id,usuario_matricula,alteracao) VALUES ($1,$2,$3)', [id,user.matricula,imported ? 'Chamado importado com identificação do elevador.' : 'Chamado criado.']);
  return id;
}

// Only domain data is exposed. Password hashes and sessions never enter this catalogue.
const tableQueries = {
  zonas: 'SELECT * FROM zonas WHERE regiao=$1',
  pessoas: 'SELECT matricula,nome,role,cargo,regiao,zona_id,login,ativo FROM pessoas WHERE regiao=$1',
  locais: 'SELECT l.* FROM locais l JOIN zonas z ON z.id=l.zona_id WHERE z.regiao=$1',
  elevadores: 'SELECT e.* FROM elevadores e JOIN locais l ON l.id=e.local_id JOIN zonas z ON z.id=l.zona_id WHERE z.regiao=$1',
  chamados: 'SELECT c.* FROM chamados c JOIN vw_chamados_metricas v ON v.id=c.id WHERE v.regiao=$1',
  historico_chamados: 'SELECT h.* FROM historico_chamados h JOIN vw_chamados_metricas c ON c.id=h.chamado_id WHERE c.regiao=$1',
  importacoes: 'SELECT i.* FROM importacoes i JOIN pessoas p ON p.matricula=i.usuario_matricula WHERE p.regiao=$1',
  sugestoes_ia: 'SELECT s.* FROM sugestoes_ia s JOIN vw_chamados_metricas c ON c.id=s.chamado_id WHERE c.regiao=$1',
  avaliacoes_ia: 'SELECT a.* FROM avaliacoes_ia a JOIN sugestoes_ia s ON s.id=a.sugestao_id JOIN vw_chamados_metricas c ON c.id=s.chamado_id WHERE c.regiao=$1'
};
function sqlValue(value) {
  if (value == null) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return String(value);
  const str = value instanceof Date ? value.toISOString() : typeof value === 'object' ? JSON.stringify(value) : String(value);
  return "'" + str.replaceAll("'", "''") + "'";
}
export async function exportDomainSQL(db, region) {
  let sql = '-- FieldIQ: exportacao dos dados de dominio da regiao ' + region + '.\n-- Nao inclui senhas ou sessoes; nao substitui backup completo.\nBEGIN;\n' + schemaSQL + '\n';
  for (const [table,query] of Object.entries(tableQueries)) {
    const result = await db.query(query,[region]);
    for (const row of result.rows) {
      const keys = Object.keys(row);
      sql += 'INSERT INTO ' + table + ' (' + keys.join(',') + ') VALUES (' + keys.map(k => sqlValue(row[k])).join(',') + ') ON CONFLICT DO NOTHING;\n';
    }
    if (!['zonas','pessoas'].includes(table)) sql += "SELECT setval(pg_get_serial_sequence('" + table + "','id'), COALESCE((SELECT max(id) FROM " + table + "),1), EXISTS(SELECT 1 FROM " + table + "));\n";
  }
  return sql + 'COMMIT;\n';
}

export function createApp(db) {
  const app = express();
  if (process.env.NODE_ENV === 'production') app.set('trust proxy',1);
  app.disable('x-powered-by');
  app.use((req,res,next) => {
    res.set('X-Content-Type-Options','nosniff');
    res.set('Referrer-Policy','same-origin');
    res.set('X-Frame-Options','DENY');
    if (req.path.startsWith('/api')) res.set('Cache-Control','no-store');
    if (['POST','PATCH','DELETE','PUT'].includes(req.method)) {
      const origin = req.headers.origin;
      if (origin && origin !== process.env.APP_ORIGIN && origin !== req.protocol + '://' + req.get('host')) return res.status(403).json({error:'Origem da requisição não permitida.'});
    }
    next();
  });
  app.use(express.json({limit:'3mb'}));
  app.use((req,_res,next) => { req.body ??= {}; next(); });
  const api = express.Router();
  app.use('/api',api);
  const cookieOptions = {httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV === 'production',path:'/',maxAge:12*3600000};
  api.get('/health',(_req,res) => res.json({ok:true}));
  api.get('/config',(_req,res) => res.json({demo:db.demo,quickDemo:db.demo && db.kind === 'PostgreSQL local (PGlite)'}));
  const attempts = new Map();
  api.post('/auth/login', async (req,res) => {
    const key = req.ip;
    const previous = attempts.get(key);
    const record = previous?.until > Date.now() ? previous : {count:0,until:Date.now()+15*60000};
    insist(record.count < 10,429,'Muitas tentativas. Aguarde alguns minutos.');
    const login = text(req.body.login,'Usuário',100).toLowerCase();
    const password = text(req.body.senha,'Senha',200);
    const {rows} = await db.query('SELECT * FROM pessoas WHERE login=$1 AND ativo',[login]);
    const person = rows[0];
    if (!person || !await verifyPassword(password,person.senha_hash)) {
      if (attempts.size > 1000) attempts.clear();
      attempts.set(key,{...record,count:record.count+1});
      throw new ApiError(401,'Usuário ou senha inválidos.');
    }
    attempts.delete(key);
    const token = newToken();
    await db.query('DELETE FROM sessoes WHERE expira_em < now()');
    await db.query("INSERT INTO sessoes VALUES ($1,$2,now()+interval '12 hours')",[hashToken(token),person.matricula]);
    res.cookie('fieldiq_session',token,cookieOptions).json({user:publicPerson(person)});
  });
  api.use(async (req,_res,next) => {
    const token = readToken(req);
    insist(/^[a-f0-9]{64}$/.test(token),401,'Entre na sua conta para continuar.');
    const {rows} = await db.query('SELECT p.* FROM sessoes s JOIN pessoas p ON p.matricula=s.usuario_matricula WHERE s.token_hash=$1 AND s.expira_em>now() AND p.ativo',[hashToken(token)]);
    insist(rows.length,401,'Sessão expirada. Entre novamente.');
    req.user = publicPerson(rows[0]);
    next();
  });
  api.post('/auth/logout',async (req,res) => {
    await db.query('DELETE FROM sessoes WHERE token_hash=$1',[hashToken(readToken(req))]);
    res.clearCookie('fieldiq_session',{...cookieOptions,maxAge:undefined}).json({ok:true});
  });
  api.get('/bootstrap',async (req,res) => {
    const region = req.user.regiao;
    const [zones,people,places,lifts,tickets,history,imports] = await Promise.all([
      db.query('SELECT * FROM zonas WHERE regiao=$1 ORDER BY id',[region]),
      db.query('SELECT matricula,nome,role,cargo,regiao,zona_id,foto,ativo FROM pessoas WHERE regiao=$1 ORDER BY nome',[region]),
      db.query(tableQueries.locais + ' ORDER BY l.nome',[region]),
      db.query('SELECT e.*,l.nome AS local_nome,l.zona_id FROM elevadores e JOIN locais l ON l.id=e.local_id JOIN zonas z ON z.id=l.zona_id WHERE z.regiao=$1 ORDER BY e.codigo',[region]),
      db.query('SELECT *,tecnico_matricula AS tecnico FROM vw_chamados_metricas WHERE regiao=$1 ORDER BY aberto_em DESC,id DESC',[region]),
      db.query('SELECT h.*,p.nome AS usuario,p.matricula FROM historico_chamados h JOIN pessoas p ON p.matricula=h.usuario_matricula JOIN vw_chamados_metricas c ON c.id=h.chamado_id WHERE c.regiao=$1 ORDER BY h.data,h.id',[region]),
      req.user.role === 'supervisor' ? db.query('SELECT * FROM importacoes WHERE usuario_matricula=$1 ORDER BY data DESC LIMIT 50',[req.user.matricula]) : {rows:[]}
    ]);
    res.json({user:req.user,zonas:zones.rows,pessoas:people.rows,locais:places.rows,elevadores:lifts.rows,chamados:tickets.rows.map(c => ({...c,historico:history.rows.filter(h => h.chamado_id === c.id)})),importacoes:imports.rows});
  });
  api.post('/chamados',async (req,res) => {
    supervisor(req.user);
    const id = await db.transaction(tx => insertTicket(tx,req.body,req.user));
    res.status(201).json({id});
  });
  api.patch('/chamados/:id',async (req,res) => {
    const result = await db.transaction(async tx => {
      const c = await getTicket(tx,req.params.id,req.user,true);
      insist(canEdit(req.user,c),403,'Você só pode alterar chamados sob sua responsabilidade.');
      insist(integer(req.body.revisao,'Revisão') === c.revisao,409,'O chamado foi alterado por outra pessoa. Atualize a página.');
      const supervisorRole = req.user.role === 'supervisor';
      const allowed = supervisorRole ? ['descricao','solucao','status','tipo_obra','prioridade','sla_horas','tecnico','revisao'] : ['descricao','solucao','status','revisao'];
      insist(Object.keys(req.body).every(k => allowed.includes(k)),403,'Alteração não permitida para seu perfil.');
      const status = oneOf(req.body.status ?? c.status,statuses,'Status');
      if (!supervisorRole) {
        insist(status !== 'cancelado' && !(c.status === 'resolvido' && status !== 'resolvido') && c.status !== 'cancelado',403,'Apenas o supervisor pode reabrir ou cancelar chamados.');
      }
      const solution = 'solucao' in req.body ? optionalText(req.body.solucao) || null : c.solucao;
      insist(status !== 'resolvido' || solution?.trim(),400,'Registre a solução aplicada antes de encerrar.');
      const desc = 'descricao' in req.body ? optionalText(req.body.descricao) : c.descricao;
      const work = oneOf(req.body.tipo_obra ?? c.tipo_obra,works,'Classificação');
      const priority = oneOf(req.body.prioridade ?? c.prioridade,priorities,'Prioridade');
      const sla = integer(req.body.sla_horas ?? c.sla_horas,'SLA',1,8760);
      const tech = 'tecnico' in req.body ? await technician(tx,req.body.tecnico,c.zona_id) : c.tecnico_matricula;
      const closed = status === 'resolvido' ? (c.resolvido_em ?? new Date().toISOString()) : null;
      await tx.query('UPDATE chamados SET descricao=$1,solucao=$2,status=$3,tipo_obra=$4,prioridade=$5,sla_horas=$6,tecnico_matricula=$7,resolvido_em=$8,revisao=revisao+1 WHERE id=$9',[desc,solution,status,work,priority,sla,tech,closed,c.id]);
      const changes = [];
      if (status !== c.status) changes.push('Status: ' + c.status + ' → ' + status);
      if (solution !== c.solucao) changes.push('Solução registrada/atualizada');
      if (desc !== c.descricao) changes.push('Descrição atualizada');
      if (tech !== c.tecnico_matricula) changes.push('Responsável: ' + (tech ?? 'A definir'));
      if (work !== c.tipo_obra) changes.push('Classificação atualizada');
      if (priority !== c.prioridade) changes.push('Prioridade atualizada');
      if (sla !== c.sla_horas) changes.push('SLA atualizado para ' + sla + 'h');
      await tx.query('INSERT INTO historico_chamados (chamado_id,usuario_matricula,alteracao) VALUES ($1,$2,$3)',[c.id,req.user.matricula,changes.join('; ') || 'Registro revisado']);
      return {id:c.id,revisao:c.revisao+1};
    });
    res.json(result);
  });
  api.post('/locais',async (req,res) => {
    supervisor(req.user);
    insist(req.user.zona_id,400,'Supervisor sem zona vinculada.');
    const {rows} = await db.query('INSERT INTO locais (nome,endereco,bairro,zona_id) VALUES ($1,$2,$3,$4) RETURNING id',[text(req.body.nome,'Nome',150),text(req.body.endereco,'Endereço',300),text(req.body.bairro,'Bairro',100),req.user.zona_id]);
    res.status(201).json(rows[0]);
  });
  api.post('/elevadores',async (req,res) => {
    supervisor(req.user);
    const {rows} = await db.query('SELECT id FROM locais WHERE id=$1 AND zona_id=$2',[integer(req.body.local_id,'Local'),req.user.zona_id]);
    insist(rows.length,403,'Selecione um local da sua zona.');
    const code = text(req.body.codigo,'Código',40).toUpperCase();
    insist(/^[A-Z0-9_-]+$/.test(code),400,'Código: use letras, números, hífen ou sublinhado.');
    const result = await db.query('INSERT INTO elevadores (codigo,local_id,fabricante,modelo,numero_serie,capacidade_kg) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',[code,Number(req.body.local_id),text(req.body.fabricante,'Fabricante',100),text(req.body.modelo,'Modelo',100),text(req.body.numero_serie,'Número de série',100),integer(req.body.capacidade_kg,'Capacidade',100,5000)]);
    res.status(201).json(result.rows[0]);
  });
  api.post('/equipe',async (req,res) => {
    supervisor(req.user);
    const mat = text(req.body.matricula,'Matrícula',40).toUpperCase();
    await db.transaction(async tx => {
      const {rows} = await tx.query("SELECT * FROM pessoas WHERE matricula=$1 AND role='tecnico' AND regiao=$2 FOR UPDATE",[mat,req.user.regiao]);
      const p = rows[0];
      insist(p,404,'Técnico não encontrado na sua região.');
      const removing = req.body.remover === true;
      insist(!removing || p.zona_id === req.user.zona_id,403,'O técnico não pertence à sua equipe.');
      insist(removing || req.user.zona_id,400,'Supervisor sem zona.');
      const active = await tx.query("SELECT id FROM chamados WHERE tecnico_matricula=$1 AND status IN ('aberto','em_andamento')",[mat]);
      insist(!active.rows.length || (!removing && p.zona_id === req.user.zona_id),409,'Reatribua os chamados pendentes antes de mover este técnico.');
      await tx.query('UPDATE pessoas SET zona_id=$1 WHERE matricula=$2',[removing ? null : req.user.zona_id,mat]);
    });
    res.json({ok:true});
  });
  api.patch('/perfil',async (req,res) => {
    const foto = text(req.body.foto,'Foto',2*1024*1024);
    insist(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(foto),400,'Use uma imagem PNG, JPEG ou WebP.');
    await db.query('UPDATE pessoas SET foto=$1 WHERE matricula=$2',[foto,req.user.matricula]);
    res.json({ok:true});
  });
  api.post('/importacoes',async (req,res) => {
    supervisor(req.user);
    insist(Array.isArray(req.body.linhas) && req.body.linhas.length > 0 && req.body.linhas.length <= 500,400,'Importe entre 1 e 500 linhas por arquivo.');
    const name = text(req.body.nome,'Arquivo',200);
    const format = oneOf(req.body.formato,['csv','txt','json','xlsx','xls'],'Formato');
    const details = [];
    let imported = 0;
    // Each valid row and its audit entry commit together; invalid rows are reported.
    for (let i=0; i<req.body.linhas.length; i++) {
      try {
        const body = {...req.body.linhas[i]};
        if (body.elevador_codigo) {
          const found = await db.query('SELECT id FROM elevadores WHERE codigo=$1',[String(body.elevador_codigo).toUpperCase()]);
          body.elevador_id = found.rows[0]?.id;
        }
        await db.transaction(tx => insertTicket(tx,body,req.user,true));
        imported++;
      } catch (e) { details.push({linha:i+2,erro:e.code === '23505' ? 'Registro já importado.' : e.status ? e.message : 'Dados inválidos nesta linha.'}); }
    }
    await db.query('INSERT INTO importacoes (usuario_matricula,nome,formato,importadas,erros,detalhes) VALUES ($1,$2,$3,$4,$5,$6)',[req.user.matricula,name,format,imported,details.length,JSON.stringify(details)]);
    res.json({importadas:imported,erros:details.length,detalhes:details});
  });
  api.post('/chamados/:id/sugestao',async (req,res) => {
    const ticket = await getTicket(db,req.params.id,req.user);
    const {rows} = await db.query('SELECT * FROM vw_chamados_metricas WHERE regiao=$1 AND id<>$2 AND aberto_em<$3',[req.user.regiao,ticket.id,ticket.aberto_em]);
    res.json(await suggestForTicket(db,ticket,rows));
  });
  api.post('/sugestoes/:id/avaliacao',async (req,res) => {
    insist(typeof req.body.util === 'boolean',400,'Avaliação inválida.');
    const {rows} = await db.query('SELECT chamado_id FROM sugestoes_ia WHERE id=$1',[integer(req.params.id,'Sugestão')]);
    insist(rows.length,404,'Sugestão não encontrada.');
    const ticket = await getTicket(db,rows[0].chamado_id,req.user);
    insist(canEdit(req.user,ticket),403,'Avalie apenas chamados sob sua responsabilidade.');
    await db.query('INSERT INTO avaliacoes_ia (sugestao_id,usuario_matricula,util) VALUES ($1,$2,$3) ON CONFLICT(sugestao_id,usuario_matricula) DO UPDATE SET util=EXCLUDED.util,criado_em=now()',[Number(req.params.id),req.user.matricula,req.body.util]);
    res.json({ok:true});
  });
  api.get('/banco',async (req,res) => {
    supervisor(req.user);
    const tables = [];
    for (const [name,query] of Object.entries(tableQueries)) {
      const {rows} = await db.query('SELECT count(*)::int AS total FROM (' + query + ') scoped',[req.user.regiao]);
      tables.push({nome:name,total:rows[0].total});
    }
    const version = await db.query('SELECT version() AS version');
    res.json({engine:db.kind,version:version.rows[0].version,tabelas:tables,schema:schemaSQL});
  });
  api.get('/banco/export',async (req,res) => {
    supervisor(req.user);
    res.attachment('fieldiq-' + req.user.regiao + '.sql').type('text/plain').send(await exportDomainSQL(db,req.user.regiao));
  });
  api.get('/banco/:table',async (req,res) => {
    supervisor(req.user);
    const query = Object.hasOwn(tableQueries,req.params.table) ? tableQueries[req.params.table] : null;
    insist(query,404,'Tabela não disponível.');
    const {rows} = await db.query('SELECT * FROM (' + query + ') scoped ORDER BY 1 LIMIT 100',[req.user.regiao]);
    const columns = await db.query('SELECT column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 ORDER BY ordinal_position',['fieldiq',req.params.table]);
    res.json({tabela:req.params.table,linhas:rows,colunas:columns.rows.filter(c => c.column_name !== 'senha_hash' && c.column_name !== 'foto')});
  });
  api.use((_req,res) => res.status(404).json({error:'Rota não encontrada.'}));
  app.get('/vendor/chart.umd.js',(_req,res) => res.sendFile(path.join(projectRoot,'node_modules/chart.js/dist/chart.umd.js')));
  app.get('/vendor/lucide.js',(_req,res) => res.sendFile(path.join(projectRoot,'node_modules/lucide/dist/umd/lucide.min.js')));
  app.use('/assets/fonts',express.static(path.join(projectRoot,'node_modules/@fontsource-variable/inter/files')));
  app.use(express.static(path.join(projectRoot,'fieldiqarchives/public')));
  app.use((error,_req,res,_next) => {
    const status = error.status ?? (error.code === '23505' ? 409 : error.code?.startsWith('23') ? 400 : 500);
    if (status === 500) console.error('Erro interno FieldIQ:',error.code ?? error.name);
    res.status(status).json({error:status === 500 ? 'Não foi possível concluir a operação.' : error.code === '23505' ? 'Já existe um registro com este código ou número de série.' : error.code?.startsWith('23') ? 'Dados incompatíveis com as regras do banco.' : error.message});
  });
  return app;
}
