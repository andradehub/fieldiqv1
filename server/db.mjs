import {seedDemoExtra} from './demo-extra.mjs';
import { readFile, mkdir, open, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { seedDatabase } from './seed.mjs';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const migrations = await Promise.all(['001-schema.sql','002-operacao.sql','003-equipes.sql','004-clientes.sql','005-responsabilidade.sql','006-prioridades-abc.sql','007-notificacoes.sql','008-push.sql','009-demonstracao.sql'].map(async name => ({name,sql:await readFile(new URL('../database/'+name,import.meta.url),'utf8')})));
export const schemaSQL = migrations.map(m=>m.sql).join('\n');

export async function createDatabase(options = {}) {
  const url = options.url ?? process.env.DATABASE_URL;
  const demo = options.demo ?? (!url || process.env.DEMO_MODE === '1');
  if (process.env.VERCEL && !url) throw new Error('Configure DATABASE_URL para PostgreSQL persistente na nuvem.');
  if (url && demo && !options.password && !process.env.DEMO_PASSWORD) {
    throw new Error('Defina DEMO_PASSWORD para criar contas ficticias no banco remoto.');
  }
  let adapter;
  if (url) {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: url, max: 3, options: '-c search_path=fieldiq,public' });
    adapter = {
      kind: 'PostgreSQL remoto',
      query: (text, params = []) => pool.query(text, params),
      transaction: async callback => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const result = await callback({ query: (text, params = []) => client.query(text, params) });
          await client.query('COMMIT');
          return result;
        } catch (error) { await client.query('ROLLBACK'); throw error; }
        finally { client.release(); }
      },
      close: () => pool.end()
    };
  } else {
    const { PGlite } = await import('@electric-sql/pglite');
    const dataDir = options.dataDir ?? process.env.FIELDIQ_DATA_DIR ?? path.join(projectRoot, '.fieldiq', 'data');
    let lockFile, lock;
    if (dataDir !== 'memory://') {
      await mkdir(dataDir, { recursive: true });
      lockFile = path.resolve(dataDir) + '.lock';
      try { lock = await open(lockFile,'wx'); }
      catch (error) {
        if (error.code !== 'EEXIST') throw error;
        let previous;
        try { previous = JSON.parse(await readFile(lockFile,'utf8')); } catch { throw new Error('Arquivo de trava do banco invalido. Verifique se outro FieldIQ esta aberto.'); }
        let running = true;
        try { process.kill(previous.pid,0); } catch (e) { if (e.code === 'ESRCH') running = false; }
        if (running) throw new Error('Banco local em uso. Use a exportacao SQL pela interface ou encerre o servidor antes de executar scripts do banco.');
        await unlink(lockFile);
        lock = await open(lockFile,'wx');
      }
      await lock.writeFile(JSON.stringify({pid:process.pid}));
    }
    let engine;
    try { engine = await PGlite.create(dataDir); }
    catch (error) { if (lock) { await lock.close(); await unlink(lockFile); } throw error; }
    adapter = {
      kind: 'PostgreSQL local (PGlite)',
      query: (text, params = []) => engine.query(text, params),
      transaction: callback => engine.transaction(tx => callback({ query: (text, params = []) => tx.query(text, params) })),
      close: async () => { try { await engine.close(); } finally { if (lock) { await lock.close(); await unlink(lockFile); } } }
    };
  }
  try {
    await adapter.transaction(async tx => {
      if (url) await tx.query('SELECT pg_advisory_xact_lock(1729001)');
      await tx.query('CREATE SCHEMA IF NOT EXISTS fieldiq');
      await tx.query('SET search_path TO fieldiq, public');
      await tx.query('CREATE TABLE IF NOT EXISTS schema_migrations (nome text PRIMARY KEY, aplicada_em timestamptz NOT NULL DEFAULT now())');
      for (const migration of migrations) {
        if ((await tx.query('SELECT nome FROM schema_migrations WHERE nome=$1',[migration.name])).rows.length) continue;
        for (const statement of migration.sql.replace(/--[^\n]*/g,'').split(';').map(s=>s.trim()).filter(Boolean)) await tx.query(statement);
        await tx.query('INSERT INTO schema_migrations(nome) VALUES ($1)',[migration.name]);
      }
      const count = await tx.query('SELECT count(*)::int AS n FROM pessoas');
      if (demo && count.rows[0].n === 0) await seedDatabase(tx, options.password ?? process.env.DEMO_PASSWORD ?? 'tk2026');
      if (demo && !(await tx.query("SELECT matricula FROM pessoas WHERE role='administrativo'")).rows.length) {
        const {hashPassword}=await import('./auth.mjs');
        await tx.query("INSERT INTO pessoas(matricula,nome,role,cargo,regiao,zona_id,login,senha_hash) VALUES ('ADM-DEMO-001','Alex Ribeiro','administrativo','Administrativo / RH',NULL,NULL,'administrativo', $1)",[await hashPassword(options.password ?? process.env.DEMO_PASSWORD ?? 'tk2026')]);
      }
      if(demo&&!(await tx.query("SELECT matricula FROM pessoas WHERE login='cliente.barra'")).rows.length){
        const local=(await tx.query("SELECT l.id FROM locais l WHERE l.zona_id='cap-04' ORDER BY l.id LIMIT 1")).rows[0];
        if(local){
          const {hashPassword}=await import('./auth.mjs');
          await tx.query("INSERT INTO pessoas(matricula,nome,role,cargo,regiao,zona_id,login,senha_hash,email) VALUES ('CLI-DEMO-001','Cliente demonstração Barra','cliente','Representante de condomínio',NULL,NULL,'cliente.barra',$1,'cliente.barra@example.com')",[await hashPassword(options.password??process.env.DEMO_PASSWORD??'tk2026')]);
          await tx.query("INSERT INTO cliente_locais(cliente_matricula,local_id) VALUES ('CLI-DEMO-001',$1)",[local.id]);
        }
      }
      if(demo&&count.rows[0].n===0&&options.expandedDemo!==false)await seedDemoExtra(tx,options.password??process.env.DEMO_PASSWORD??'tk2026',{fresh:true});
    });
    if (!url) await adapter.query('SET search_path TO fieldiq, public');
    return { ...adapter, demo };
  } catch (error) { await adapter.close(); throw error; }
}
