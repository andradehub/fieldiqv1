import {hashPassword} from './auth.mjs';
import {insist,text,optionalText,oneOf,isAdmin,supervisor,scopeParams} from './permissions.mjs';
import {JOB_TITLES} from '../fieldiqarchives/public/assets/js/core/jobs.js';
import {validateProfileImage} from './profile-images.mjs';

export function validCPF(value){
  const s=String(value).replace(/\D/g,'');
  if(!/^\d{11}$/.test(s)||/^(\d)\1{10}$/.test(s))return false;
  for(let n=9;n<11;n++){let sum=0;for(let i=0;i<n;i++)sum+=Number(s[i])*(n+1-i);if(Number(s[n])!==(sum*10%11)%10)return false;}
  return true;
}
export const userColumns='matricula,nome,role,cargo,regiao,zona_id,login,ativo,email,telefone,admissao,criado_em';
export async function saveUser(db,actor,body,existing=null,{migration=false}={}){
  supervisor(actor);
  const allowed=['matricula','nome','role','cargo','zona_id','login','senha','cpf','email','telefone','admissao','ativo','locais_ids',...(migration?['foto']:[])];
  insist(Object.keys(body).every(k=>allowed.includes(k)),400,'Campo de usuário não reconhecido.');
  if(existing)insist(isAdmin(actor)||(existing.role==='tecnico'&&existing.zona_id===actor.zona_id),403,'Você administra apenas técnicos da própria zona.');
  const role=oneOf(body.role??existing?.role??'tecnico',['tecnico','supervisor','administrativo','cliente'],'Perfil');
  insist(isAdmin(actor)||role==='tecnico',403,'O supervisor pode cadastrar apenas técnicos.');
  // Administrative accounts are provisioned locally, never escalated through imports or the UI.
  insist(role!=='administrativo'||existing?.role==='administrativo',403,'O perfil Administrativo é criado pelo comando de configuração inicial.');
  const zone=['administrativo','cliente'].includes(role)?null:(body.zona_id??existing?.zona_id??actor.zona_id);
  insist(isAdmin(actor)||zone===actor.zona_id,403,'O supervisor não pode transferir técnicos entre zonas.');
  const z=zone?(await db.query('SELECT * FROM zonas WHERE id=$1',[text(zone,'Zona',80)])).rows[0]:null;
  insist(['administrativo','cliente'].includes(role)||z,400,'Selecione uma zona cadastrada.');
  let clientLocals=[];
  if(role==='cliente'){
    insist(isAdmin(actor),403,'Clientes são cadastrados pelo Administrativo.');
    clientLocals=body.locais_ids??(existing?(await db.query('SELECT local_id FROM cliente_locais WHERE cliente_matricula=$1',[existing.matricula])).rows.map(r=>r.local_id):[]);
    insist(Array.isArray(clientLocals)&&clientLocals.length>0&&clientLocals.length<=100&&clientLocals.every(id=>Number.isInteger(Number(id))&&Number(id)>0),400,'Vincule pelo menos um local válido ao cliente.');
    clientLocals=[...new Set(clientLocals.map(Number))];
    const found=(await db.query('SELECT id FROM locais WHERE id=ANY($1::integer[])',[clientLocals])).rows;insist(found.length===clientLocals.length,400,'Local do cliente não encontrado.');
  }else insist(!body.locais_ids?.length,400,'Vínculos de imóveis são exclusivos do perfil Cliente.');
  const mat=text(body.matricula??existing?.matricula,'Matrícula',40).toUpperCase();
  insist(/^[A-Z0-9_-]+$/.test(mat),400,'Matrícula: use letras, números, hífen ou sublinhado.');
  insist(!existing||mat===existing.matricula,400,'A matrícula não pode ser alterada.');
  const name=text(body.nome??existing?.nome,'Nome completo',150);
  const cargo=text(body.cargo??(role===existing?.role?existing?.cargo:null)??JOB_TITLES[role][0],'Cargo',150);
  insist(migration||JOB_TITLES[role].includes(cargo)||(existing?.role===role&&existing?.cargo===cargo),400,'Selecione um cargo compatível com o perfil.');
  const photo=migration&&body.foto?validateProfileImage(body.foto):null;
  const cpf=body.cpf===undefined?(existing?.cpf??null):String(body.cpf).replace(/\D/g,'')||null;
  insist(migration||existing||role==='cliente'||cpf,400,'Informe o CPF.');
  insist(!cpf||validCPF(cpf),400,'CPF inválido. Confira os dígitos.');
  const email=optionalText(body.email??existing?.email,200).toLowerCase()||null;
  insist(!email||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),400,'E-mail inválido.');
  const phone=optionalText(body.telefone??existing?.telefone,30)||null;
  insist(!phone||/^[+()\d\s.-]{8,30}$/.test(phone),400,'Telefone inválido.');
  const admission=body.admissao===undefined?(existing?.admissao?new Date(existing.admissao).toISOString().slice(0,10):null):body.admissao||null;
  const admissionDate=admission?new Date(admission+'T00:00:00Z'):null;
  insist(!admission||(/^\d{4}-\d{2}-\d{2}$/.test(admission)&&Number.isFinite(admissionDate.getTime())&&admissionDate.toISOString().slice(0,10)===admission&&admission<=new Date().toISOString().slice(0,10)),400,'Data de admissão inválida ou futura.');
  const active=body.ativo??existing?.ativo??!migration;
  insist(typeof active==='boolean',400,'Situação de usuário inválida.');
  insist(!migration||!active,400,'Usuários migrados começam inativos, sem senha importada.');
  const login=optionalText(body.login??existing?.login,100).toLowerCase()||null;
  insist(!login||/^[a-z0-9_.@-]{3,100}$/.test(login),400,'Usuário de acesso inválido.');
  insist(!active||login,400,'Informe o usuário de acesso.');
  let hash=existing?.senha_hash??null;
  if(body.senha){insist(typeof body.senha==='string'&&body.senha.length>=12&&body.senha.length<=200,400,'A senha precisa ter de 12 a 200 caracteres.');hash=await hashPassword(body.senha);}
  insist(!active||hash,400,'Defina uma senha para ativar a conta.');
  if(existing){
    const moving=zone!==existing.zona_id||role!==existing.role;
    if(moving||!active){
      const open=(await db.query("SELECT id FROM chamados c WHERE status IN ('aberto','em_andamento') AND (tecnico_matricula=$1 OR EXISTS(SELECT 1 FROM equipe_chamado e WHERE e.chamado_id=c.id AND e.tecnico_matricula=$1)) LIMIT 1",[mat])).rows;
      insist(!open.length,409,'Reatribua os chamados pendentes antes de transferir, alterar o perfil ou desativar este técnico.');
    }
    if(existing.role==='administrativo'&&(!active||role!=='administrativo')){
      const others=(await db.query("SELECT count(*)::int AS n FROM pessoas WHERE role='administrativo' AND ativo AND matricula<>$1",[mat])).rows[0].n;
      insist(others>0,409,'Não é possível desativar ou remover o perfil do último Administrativo.');
    }
    insist(mat!==actor.matricula||active,409,'Você não pode desativar a própria conta.');
  }
  const values=[name,role,cargo,z?.regiao??null,zone,login,hash,cpf,email,phone,admission,active,mat];
  if(existing){
    await db.query('UPDATE pessoas SET nome=$1,role=$2,cargo=$3,regiao=$4,zona_id=$5,login=$6,senha_hash=$7,cpf=$8,email=$9,telefone=$10,admissao=$11,ativo=$12 WHERE matricula=$13',values);
    if(body.senha||!active||existing.role!==role||existing.zona_id!==zone)await db.query('DELETE FROM sessoes WHERE usuario_matricula=$1',[mat]);
  }else{
    await db.query('INSERT INTO pessoas(nome,role,cargo,regiao,zona_id,login,senha_hash,cpf,email,telefone,admissao,ativo,matricula) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',values);
  }
  const changes=existing?'Atualização: '+Object.keys(body).filter(k=>k!=='matricula').join(', '):migration?'Cadastro migrado, sem acesso ativo.':'Usuário cadastrado.';
  if(photo)await db.query('UPDATE pessoas SET foto=$1 WHERE matricula=$2',[photo,mat]);
  if(isAdmin(actor)){
    await db.query('DELETE FROM cliente_locais WHERE cliente_matricula=$1',[mat]);
    for(const local of clientLocals)await db.query('INSERT INTO cliente_locais(cliente_matricula,local_id) VALUES ($1,$2)',[mat,local]);
  }
  await db.query('INSERT INTO auditoria_usuarios(usuario_matricula,alvo_matricula,acao) VALUES ($1,$2,$3)',[actor.matricula,mat,changes]);
  return mat;
}

export function registerUserRoutes(api,db){
  api.get('/usuarios',async(req,res)=>{
    supervisor(req.user);
    const {rows}=await db.query('SELECT '+userColumns+",CASE WHEN cpf IS NULL THEN NULL ELSE '***.***.***-'||right(cpf,2) END AS cpf_mascarado FROM pessoas WHERE ($1::boolean OR (zona_id=$2 AND role='tecnico')) ORDER BY nome",scopeParams(req.user));
    const links=isAdmin(req.user)?(await db.query('SELECT cliente_matricula,local_id FROM cliente_locais')).rows:[];
    res.json({usuarios:rows.map(p=>({...p,locais_ids:links.filter(l=>l.cliente_matricula===p.matricula).map(l=>l.local_id)}))});
  });
  api.post('/usuarios',async(req,res)=>{
    const mat=await db.transaction(tx=>saveUser(tx,req.user,req.body));res.status(201).json({matricula:mat});
  });
  api.patch('/usuarios/:matricula',async(req,res)=>{
    supervisor(req.user);
    const mat=await db.transaction(async tx=>{
      // Serialize administrative edits, including the last-admin invariant.
      await tx.query("SELECT matricula FROM pessoas WHERE role='administrativo' ORDER BY matricula FOR UPDATE");
      const p=(await tx.query('SELECT * FROM pessoas WHERE matricula=$1 FOR UPDATE',[req.params.matricula])).rows[0];
      insist(p,404,'Usuário não encontrado.');return saveUser(tx,req.user,req.body,p);
    });res.json({matricula:mat});
  });
}
