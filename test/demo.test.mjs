import {test} from 'node:test';import assert from 'node:assert/strict';import {createDatabase} from '../server/db.mjs';import {seedDemoExtra} from '../server/demo-extra.mjs';import {validCPF} from '../server/users.mjs';import {access} from 'node:fs/promises';import path from 'node:path';import {projectRoot} from '../server/db.mjs';
test('instalação nova reproduz a demonstração ampliada, com avatares, contatos e equipes por zona, sem importação',async()=>{
 const db=await createDatabase({dataDir:'memory://',demo:true,expandedDemo:true});
 try{
  const count=async table=>(await db.query('SELECT count(*)::int AS n FROM '+table)).rows[0].n;
  assert.equal(await count('pessoas'),51);assert.equal(await count('chamados'),177);assert.equal(await count('locais'),25);assert.equal(await count('elevadores'),46);assert.equal(await count('zonas'),10);
  const people=(await db.query('SELECT * FROM pessoas')).rows;assert.ok(people.every(p=>p.foto&&p.email&&p.telefone&&p.admissao&&validCPF(p.cpf)));
  assert.equal(new Set(people.map(p=>p.cpf)).size,51);assert.equal(new Set(people.filter(p=>p.matricula.startsWith('DEMO2-')).map(p=>p.senha_hash)).size,40);
  for(const person of people)await access(path.join(projectRoot,'fieldiqarchives/public',person.foto));
  const cross=(await db.query("SELECT c.id FROM vw_chamados_metricas c JOIN pessoas p ON p.matricula=c.criado_por WHERE p.role<>'administrativo' AND p.zona_id<>c.zona_id")).rows;assert.equal(cross.length,0);
  assert.equal((await db.query("SELECT * FROM equipe_chamado e JOIN pessoas p ON p.matricula=e.tecnico_matricula WHERE p.cargo='Estagiário de campo'")).rows.length,40);
  await db.query("UPDATE pessoas SET telefone='(21) 00000-9999' WHERE matricula='DEMO2-002'");const before=await count('chamados');const result=await db.transaction(tx=>seedDemoExtra(tx,'tk2026'));assert.equal(result.adicionada,false);assert.equal(await count('chamados'),before);assert.equal((await db.query("SELECT telefone FROM pessoas WHERE matricula='DEMO2-002'")).rows[0].telefone,'(21) 00000-9999');
 }finally{await db.close();}
});
