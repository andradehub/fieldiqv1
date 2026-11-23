import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createDatabase, projectRoot } from '../server/db.mjs';
import { exportDomainSQL } from '../server/app.mjs';
const action = process.argv[2] ?? 'init';
const db = await createDatabase();
try {
  if (action === 'init') {
    const result = await db.query('SELECT count(*)::int AS chamados FROM chamados');
    console.log(db.kind + ' inicializado. Chamados: ' + result.rows[0].chamados);
  } else if (action === 'export') {
    const directory = path.join(projectRoot,'.fieldiq','exports');
    await mkdir(directory,{recursive:true});
    const file=path.join(directory,'fieldiq-dominio.sql');
    await writeFile(file,await exportDomainSQL(db,{role:'administrativo'}),'utf8');
    console.log('SQL exportado: '+file);
  } else throw new Error('Use npm run db:init ou npm run db:export.');
} finally { await db.close(); }
