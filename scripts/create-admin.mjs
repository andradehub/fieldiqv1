import {createDatabase} from '../server/db.mjs';
import {hashPassword} from '../server/auth.mjs';
const login=process.env.ADMIN_LOGIN?.trim().toLowerCase(),password=process.env.ADMIN_PASSWORD,name=process.env.ADMIN_NAME?.trim();
if(!/^[a-z0-9_.@-]{3,100}$/.test(login??'')||!name||!password||password.length<12||password.length>200)throw new Error('Configure ADMIN_LOGIN, ADMIN_NAME e ADMIN_PASSWORD (12 a 200 caracteres) no ambiente.');
const db=await createDatabase({demo:false});
try{
  await db.query("INSERT INTO pessoas(matricula,nome,role,cargo,regiao,zona_id,login,senha_hash) VALUES ($1,$2,'administrativo','Administrativo / RH',NULL,NULL,$3,$4)",[process.env.ADMIN_REGISTRATION??'ADM-001',name,login,await hashPassword(password)]);
  console.log('Administrativo criado. Remova ADMIN_PASSWORD do ambiente após a configuração.');
}finally{await db.close();}
