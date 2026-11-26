import express from 'express';
import path from 'node:path';
import { publicPerson, verifyPassword, readToken, hashToken, newToken } from './auth.mjs';
import { projectRoot, schemaSQL } from './db.mjs';
import { suggestForTicket } from './ai.mjs';
import {ApiError,insist,text,optionalText,oneOf,integer,supervisor,canEdit,canClose,getTicket,isAdmin,manages,canReadZone,scopeParams} from './permissions.mjs';
import {registerUserRoutes} from './users.mjs';
import {registerAttachmentRoutes} from './attachments.mjs';
import {registerAttendanceRoutes,closeIntervals,beginInterval} from './attendance.mjs';
import {registerPortalRoutes,internalRequests} from './portal.mjs';

export {ApiError};
async function equipment(db, id, user) {
  const result = await db.query('SELECT e.*, l.zona_id, z.regiao FROM elevadores e JOIN locais l ON l.id=e.local_id JOIN zonas z ON z.id=l.zona_id WHERE e.id=$1', [integer(id,'Elevador')]);
  const e = result.rows[0];
  insist(e, 404, 'Elevador não encontrado.');
  insist(canReadZone(user,e.zona_id) && e.ativo, 403, 'Escolha um elevador ativo da sua zona.');
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

export async function insertTicket(db, body, user, {openedAt} = {}) {
  const e = await equipment(db, body.elevador_id, user);
  const tech = await technician(db, body.tecnico || null, e.zona_id);
  const status = 'aberto';
  const title = text(body.titulo,'Título',200);
  const desc = optionalText(body.descricao);
  const solution = optionalText(body.solucao);
  const open = openedAt ? new Date(openedAt) : new Date();
  const close = status === 'resolvido' && body.resolvido_em ? new Date(body.resolvido_em) : null;
  insist(Number.isFinite(open.getTime()) && open.getTime() <= Date.now() + 60000, 400, 'Data de abertura inválida ou futura.');
  insist(status !== 'resolvido' || (solution && close && Number.isFinite(close.getTime()) && close >= open && close.getTime() <= Date.now() + 60000), 400, 'Chamado resolvido exige solução e data de resolução válidas.');
  const type = oneOf(body.tipo_obra ?? 'mod_parcial',works,'Classificação');
  const priority = oneOf(body.prioridade ?? 'media',priorities,'Prioridade');
  const sla = integer(body.sla_horas ?? 24,'SLA',1,8760);
  const row = await db.query(
    'INSERT INTO chamados (elevador_id,titulo,descricao,tipo_obra,prioridade,status,sla_horas,tecnico_matricula,aberto_em,resolvido_em,solucao,criado_por,chave_importacao) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id',
    [e.id,title,desc,type,priority,status,sla,tech,open.toISOString(),close?.toISOString() ?? null,solution || null,user.matricula,null]
  );
  const id = row.rows[0].id;
  await db.query('INSERT INTO historico_chamados (chamado_id,usuario_matricula,alteracao) VALUES ($1,$2,$3)', [id,user.matricula,'Chamado criado.']);
  return id;
}

// Only domain data is exposed. Password hashes and sessions never enter this catalogue.
const tableQueries = {
  zonas: 'SELECT * FROM zonas WHERE ($1::boolean OR id=$2)',
  pessoas: 'SELECT matricula,nome,role,cargo,regiao,zona_id,login,ativo FROM pessoas WHERE ($1::boolean OR zona_id=$2)',
  locais: 'SELECT l.* FROM locais l WHERE ($1::boolean OR l.zona_id=$2)',
  elevadores: 'SELECT e.* FROM elevadores e JOIN locais l ON l.id=e.local_id WHERE ($1::boolean OR l.zona_id=$2)',
  chamados: 'SELECT c.* FROM chamados c JOIN vw_chamados_metricas v ON v.id=c.id WHERE ($1::boolean OR v.zona_id=$2)',
  historico_chamados: 'SELECT h.* FROM historico_chamados h JOIN vw_chamados_metricas c ON c.id=h.chamado_id WHERE ($1::boolean OR c.zona_id=$2)',
  sugestoes_ia: 'SELECT s.* FROM sugestoes_ia s JOIN vw_chamados_metricas c ON c.id=s.chamado_id WHERE ($1::boolean OR c.zona_id=$2)',
  avaliacoes_ia: 'SELECT a.* FROM avaliacoes_ia a JOIN sugestoes_ia s ON s.id=a.sugestao_id JOIN vw_chamados_metricas c ON c.id=s.chamado_id WHERE ($1::boolean OR c.zona_id=$2)',
  atendimentos: 'SELECT a.* FROM atendimentos a JOIN vw_chamados_metricas c ON c.id=a.chamado_id WHERE ($1::boolean OR c.zona_id=$2)',
  equipe_chamado: 'SELECT e.* FROM equipe_chamado e JOIN vw_chamados_metricas c ON c.id=e.chamado_id WHERE ($1::boolean OR c.zona_id=$2)',
  anexos_chamados: 'SELECT a.id,a.chamado_id,a.usuario_matricula,a.nome,a.tipo,a.tamanho,a.sha256,a.criado_em FROM anexos_chamados a JOIN vw_chamados_metricas c ON c.id=a.chamado_id WHERE ($1::boolean OR c.zona_id=$2)'
};
function sqlValue(value) {
  if (value == null) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return String(value);
  const str = value instanceof Date ? value.toISOString() : typeof value === 'object' ? JSON.stringify(value) : String(value);
  return "'" + str.replaceAll("'", "''") + "'";
}
export async function exportDomainSQL(db, user={role:'administrativo'}) {
  const params=scopeParams(typeof user==='object'?user:{role:'administrativo'});
  let sql = '-- FieldIQ: exportacao de dados de dominio.\n-- Nao inclui senhas, CPF, contatos, sessoes ou arquivos anexados; nao substitui backup completo.\nBEGIN;\n' + schemaSQL + '\n';
  for (const [table,query] of Object.entries(tableQueries)) {
    if(table==='anexos_chamados')continue;
    const result = table==='pessoas' ? await db.query("SELECT matricula,nome,role,cargo,CASE WHEN ($1::boolean OR zona_id=$2) THEN regiao ELSE NULL END AS regiao,CASE WHEN ($1::boolean OR zona_id=$2) THEN zona_id ELSE NULL END AS zona_id,CASE WHEN ($1::boolean OR zona_id=$2) THEN login ELSE NULL END AS login,ativo FROM pessoas WHERE ($1::boolean OR zona_id=$2) OR matricula IN (SELECT criado_por FROM vw_chamados_metricas WHERE zona_id=$2 UNION SELECT tecnico_matricula FROM vw_chamados_metricas WHERE zona_id=$2 UNION SELECT h.usuario_matricula FROM historico_chamados h JOIN vw_chamados_metricas c ON c.id=h.chamado_id WHERE c.zona_id=$2 UNION SELECT a.usuario_matricula FROM avaliacoes_ia a JOIN sugestoes_ia s ON s.id=a.sugestao_id JOIN vw_chamados_metricas c ON c.id=s.chamado_id WHERE c.zona_id=$2 UNION SELECT a.tecnico_matricula FROM atendimentos a JOIN vw_chamados_metricas c ON c.id=a.chamado_id WHERE c.zona_id=$2)",params) : await db.query(query,params);
    for (const row of result.rows) {
      const keys = Object.keys(row);
      sql += 'INSERT INTO ' + table + ' (' + keys.join(',') + ') VALUES (' + keys.map(k => sqlValue(row[k])).join(',') + ') ON CONFLICT DO NOTHING;\n';
    }
    if (!['zonas','pessoas','equipe_chamado'].includes(table)) sql += "SELECT setval(pg_get_serial_sequence('" + table + "','id'), COALESCE((SELECT max(id) FROM " + table + "),1), EXISTS(SELECT 1 FROM " + table + "));\n";
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
  api.use((req,_res,next)=>{
    insist(req.user.role!=='cliente'||req.path==='/bootstrap'||req.path.startsWith('/portal/'),403,'Use o portal do cliente para acessar seus imóveis e solicitações.');next();
  });
  api.get('/bootstrap',async (req,res) => {
    if(req.user.role==='cliente'){res.json({user:req.user,portal:true});return;}
    const params = scopeParams(req.user);
    const [zones,people,places,lifts,tickets,history] = await Promise.all([
      db.query(tableQueries.zonas+' ORDER BY id',params),
      db.query('SELECT matricula,nome,role,cargo,regiao,zona_id,foto,ativo FROM pessoas WHERE ($1::boolean OR zona_id=$2) ORDER BY nome',params),
      db.query(tableQueries.locais + ' ORDER BY l.nome',params),
      db.query('SELECT e.*,l.nome AS local_nome,l.zona_id FROM elevadores e JOIN locais l ON l.id=e.local_id WHERE ($1::boolean OR l.zona_id=$2) ORDER BY e.codigo',params),
      db.query('SELECT *,tecnico_matricula AS tecnico FROM vw_chamados_metricas WHERE ($1::boolean OR zona_id=$2) ORDER BY aberto_em DESC,id DESC',params),
      db.query('SELECT h.*,p.nome AS usuario,p.matricula FROM historico_chamados h JOIN pessoas p ON p.matricula=h.usuario_matricula JOIN vw_chamados_metricas c ON c.id=h.chamado_id WHERE ($1::boolean OR c.zona_id=$2) ORDER BY h.data,h.id',params)
    ]);
    res.json({user:req.user,zonas:zones.rows,pessoas:people.rows,locais:places.rows,elevadores:lifts.rows,chamados:tickets.rows.map(c => ({...c,historico:history.rows.filter(h => h.chamado_id === c.id)})),solicitacoes:manages(req.user)?await internalRequests(db,req.user):[]});
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
      const supervisorRole = manages(req.user);
      const allowed = supervisorRole ? ['descricao','solucao','status','tipo_obra','prioridade','sla_horas','tecnico','revisao'] : ['descricao','solucao','status','revisao'];
      insist(Object.keys(req.body).every(k => allowed.includes(k)),403,'Alteração não permitida para seu perfil.');
      let status = oneOf(req.body.status ?? c.status,statuses,'Status');
      insist(canClose(req.user,c)||status===c.status,403,'Apenas o responsável principal ou a gestão altera o status global. Use Iniciar/Pausar para registrar seu período.');
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
      insist(!(tech!==c.tecnico_matricula&&['resolvido','cancelado'].includes(c.status)&&status===c.status),409,'Reabra o chamado antes de alterar seu responsável.');
      if(!tech&&['aberto','em_andamento'].includes(status))status='aberto';
      if(tech!==c.tecnico_matricula&&c.tecnico_matricula)await tx.query('DELETE FROM equipe_chamado WHERE chamado_id=$1 AND tecnico_matricula=$2',[c.id,c.tecnico_matricula]);
      if(c.atendimento_ativo_desde&&(status!=='em_andamento'||tech!==c.tecnico_matricula))await closeIntervals(tx,c.id);
      if(status==='em_andamento'&&c.status!=='em_andamento'&&tech){await beginInterval(tx,{...c,tecnico_matricula:tech},req.user);}
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
    const zone=isAdmin(req.user)?text(req.body.zona_id,'Zona',80):req.user.zona_id;
    insist(zone,400,'Selecione uma zona.');
    if(!isAdmin(req.user))insist(!req.body.zona_id||req.body.zona_id===zone,403,'Cadastre apenas na sua zona.');
    const {rows} = await db.query('INSERT INTO locais (nome,endereco,bairro,zona_id) VALUES ($1,$2,$3,$4) RETURNING id',[text(req.body.nome,'Nome',150),text(req.body.endereco,'Endereço',300),text(req.body.bairro,'Bairro',100),zone]);
    res.status(201).json(rows[0]);
  });
  api.post('/elevadores',async (req,res) => {
    supervisor(req.user);
    const {rows} = await db.query('SELECT id FROM locais WHERE id=$1 AND ($2::boolean OR zona_id=$3)',[integer(req.body.local_id,'Local'),...scopeParams(req.user)]);
    insist(rows.length,403,'Selecione um local da sua zona.');
    const code = text(req.body.codigo,'Código',40).toUpperCase();
    insist(/^[A-Z0-9_-]+$/.test(code),400,'Código: use letras, números, hífen ou sublinhado.');
    const result = await db.query('INSERT INTO elevadores (codigo,local_id,fabricante,modelo,numero_serie,capacidade_kg) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',[code,Number(req.body.local_id),text(req.body.fabricante,'Fabricante',100),text(req.body.modelo,'Modelo',100),text(req.body.numero_serie,'Número de série',100),integer(req.body.capacidade_kg,'Capacidade',100,5000)]);
    res.status(201).json(result.rows[0]);
  });
  api.post('/equipe',async (req,res) => {
    supervisor(req.user);
    insist(isAdmin(req.user),403,'Transferências de zona são exclusivas do Administrativo. Use o cadastro de usuários.');
    throw new ApiError(410,'Gerencie os vínculos pela Gestão de usuários.');
  });
  api.patch('/perfil',async (req,res) => {
    const foto = text(req.body.foto,'Foto',2*1024*1024);
    insist(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(foto),400,'Use uma imagem PNG, JPEG ou WebP.');
    await db.query('UPDATE pessoas SET foto=$1 WHERE matricula=$2',[foto,req.user.matricula]);
    res.json({ok:true});
  });
  api.post('/chamados/:id/sugestao',async (req,res) => {
    const ticket = await getTicket(db,req.params.id,req.user);
    const {rows} = await db.query('SELECT * FROM vw_chamados_metricas WHERE zona_id=$1 AND id<>$2 AND aberto_em<$3',[ticket.zona_id,ticket.id,ticket.aberto_em]);
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
      const {rows} = await db.query('SELECT count(*)::int AS total FROM (' + query + ') scoped',scopeParams(req.user));
      tables.push({nome:name,total:rows[0].total});
    }
    const version = await db.query('SELECT version() AS version');
    res.json({engine:db.kind,version:version.rows[0].version,tabelas:tables,schema:schemaSQL});
  });
  api.get('/banco/export',async (req,res) => {
    supervisor(req.user);
    res.attachment('fieldiq-' + (req.user.zona_id??'geral') + '.sql').type('text/plain').send(await exportDomainSQL(db,req.user));
  });
  api.get('/banco/:table',async (req,res) => {
    supervisor(req.user);
    const query = Object.hasOwn(tableQueries,req.params.table) ? tableQueries[req.params.table] : null;
    insist(query,404,'Tabela não disponível.');
    const {rows} = await db.query('SELECT * FROM (' + query + ') scoped ORDER BY 1 LIMIT 100',scopeParams(req.user));
    const columns = await db.query('SELECT column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 ORDER BY ordinal_position',['fieldiq',req.params.table]);
    res.json({tabela:req.params.table,linhas:rows,colunas:columns.rows.filter(c => c.column_name !== 'senha_hash' && c.column_name !== 'foto')});
  });
  registerUserRoutes(api,db);
  registerAttachmentRoutes(api,db);
  registerAttendanceRoutes(api,db);
  registerPortalRoutes(api,db,insertTicket);
  api.use((_req,res) => res.status(404).json({error:'Rota não encontrada.'}));
  app.get('/vendor/chart.umd.js',(_req,res) => res.sendFile(path.join(projectRoot,'node_modules/chart.js/dist/chart.umd.js')));
  app.get('/vendor/lucide.js',(_req,res) => res.sendFile(path.join(projectRoot,'node_modules/lucide/dist/umd/lucide.min.js')));
  app.use('/assets/fonts',express.static(path.join(projectRoot,'node_modules/@fontsource-variable/inter/files')));
  app.use(express.static(path.join(projectRoot,'fieldiqarchives/public')));
  app.use((error,_req,res,_next) => {
    const status = error.status ?? (error.code === '23505' ? 409 : error.code?.startsWith('23') ? 400 : 500);
    if (status === 500) console.error('Erro interno FieldIQ:',error.code ?? error.name);
    res.status(status).json({error:status===413?'Arquivo ou dados acima do limite permitido.':status === 500 ? 'Não foi possível concluir a operação.' : error.code === '23505' ? 'Já existe um registro com este código, CPF, e-mail, usuário ou arquivo.' : error.code?.startsWith('23') ? 'Dados incompatíveis com as regras do banco.' : error.message});
  });
  return app;
}
