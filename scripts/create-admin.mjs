import { createDatabase } from '../server/db.mjs';
import { hashPassword } from '../server/auth.mjs';
const login=process.env.ADMIN_LOGIN?.trim().toLowerCase();
const password=process.env.ADMIN_PASSWORD;
const name=process.env.ADMIN_NAME?.trim();
const region=process.env.ADMIN_REGION;
const zone=process.env.ADMIN_ZONE;
if (!login || !name || !password || password.length<12 || !['capital','interior'].includes(region) || !/^(cap|int)-[0-9]{2}$/.test(zone??'') || !zone.startsWith(region==='capital'?'cap':'int')) {
  throw new Error('Configure ADMIN_LOGIN, ADMIN_NAME, ADMIN_PASSWORD (12+ caracteres), ADMIN_REGION (capital/interior) e ADMIN_ZONE (cap-04/int-01) no ambiente.');
}
const db=await createDatabase({demo:false});
try{
  await db.transaction(async tx=>{
    await tx.query('INSERT INTO zonas (id,regiao,nome,local) VALUES ($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING',[zone,region,'Zona '+zone.slice(-2),process.env.ADMIN_ZONE_NAME??zone]);
    const row=(await tx.query('SELECT regiao FROM zonas WHERE id=$1',[zone])).rows[0];
    if(row.regiao!==region)throw new Error('Zona existente pertence a outra região.');
    await tx.query("INSERT INTO pessoas (matricula,nome,role,cargo,regiao,zona_id,login,senha_hash) VALUES ($1,$2,'supervisor','Supervisor de Operações',$3,$4,$5,$6)",[process.env.ADMIN_REGISTRATION??'ADMIN-001',name,region,zone,login,await hashPassword(password)]);
  });
  console.log('Supervisor criado. Remova ADMIN_PASSWORD do ambiente após a configuração.');
}finally{await db.close();}
