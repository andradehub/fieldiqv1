import {createHash} from 'node:crypto';
import {ApiError,insist,text,integer,oneOf,isAdmin} from './permissions.mjs';
import {saveUser} from './users.mjs';
const entities=['zonas','pessoas','locais','elevadores','chamados','historicos'];
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const rollback=Symbol('preview');
export function registerMigrationRoutes(api,db,insertTicket){
  api.get('/migracoes',async(req,res)=>{
    insist(isAdmin(req.user),403,'Migração completa é exclusiva do Administrativo.');
    res.json({migracoes:(await db.query('SELECT id,origem,resumo,data FROM migracoes_legado ORDER BY data DESC LIMIT 30')).rows});
  });
  api.post('/migracoes',async(req,res)=>{
    insist(isAdmin(req.user),403,'Migração completa é exclusiva do Administrativo.');
    const pack=req.body.pacote;
    insist(pack&&typeof pack==='object'&&!Array.isArray(pack)&&pack.formato==='fieldiq-legado-v1',400,'Utilize o modelo de migração fieldiq-legado-v1.');
    insist(Object.keys(pack).every(k=>['formato','origem',...entities].includes(k)),400,'O pacote contém campos não reconhecidos.');
    const source=text(pack.origem,'Identificação da origem',100);
    let total=0;
    for(const entity of entities){insist(pack[entity]===undefined||Array.isArray(pack[entity]),400,entity+': informe uma lista.');total+=(pack[entity]??[]).length;}
    insist(total>0&&total<=1000,400,'O pacote deve conter de 1 a 1000 registros no total.');
    insist(typeof req.body.confirmar==='boolean',400,'Informe se é validação ou importação.');
    const fingerprint=digest(pack),summary={criados:{},reutilizados:{},avisos:['Contas migradas começam inativas. Ative-as em Gestão de usuários, com uma nova senha.','Dados existentes não serão sobrescritos.']};
    const imported=(await db.query('SELECT resumo FROM migracoes_legado WHERE fingerprint=$1',[fingerprint])).rows[0];
    if(imported){res.json({ja_importado:true,resumo:imported.resumo,validado:true});return;}
    try{
      await db.transaction(async tx=>{
        await tx.query('SELECT id FROM zonas ORDER BY id FOR UPDATE');
        const maps=Object.fromEntries(entities.map(k=>[k,new Map()])),seen=new Set();
        async function ref(entity,id){
          const key=String(id??'');if(maps[entity].has(key))return maps[entity].get(key);
          const r=(await tx.query('SELECT id_destino FROM referencias_legado WHERE origem=$1 AND entidade=$2 AND id_legado=$3',[source,entity,key])).rows[0];
          insist(r,400,'Referência não encontrada em '+entity+': '+key);return r.id_destino;
        }
        for(const entity of entities){
          summary.criados[entity]=0;summary.reutilizados[entity]=0;
          for(const [index,row] of (pack[entity]??[]).entries()){
            try{
              insist(row&&typeof row==='object'&&!Array.isArray(row),400,'Registro inválido.');
              const legacy=text(String(row.id??''),'ID de origem',100),key=entity+':'+legacy;
              insist(!seen.has(key),400,'ID repetido no pacote: '+legacy);seen.add(key);
              const known=(await tx.query('SELECT id_destino,dados_hash FROM referencias_legado WHERE origem=$1 AND entidade=$2 AND id_legado=$3',[source,entity,legacy])).rows[0];
              if(known){insist(known.dados_hash===digest(row),409,'ID já importado com outros dados. Use a edição do cadastro.');maps[entity].set(legacy,known.id_destino);summary.reutilizados[entity]++;continue;}
              let id,reused=false;
              if(entity==='zonas'){
                const f=[text(row.codigo,'Código da zona',80),oneOf(row.regiao,['capital','interior'],'Região'),text(row.nome,'Nome da zona',100),text(row.local,'Local da zona',150)];
                const z=(await tx.query('SELECT * FROM zonas WHERE id=$1',[f[0]])).rows[0];
                if(z){insist(z.regiao===f[1]&&z.nome===f[2]&&z.local===f[3],409,'Zona existente com outros dados.');reused=true;}else await tx.query('INSERT INTO zonas(id,regiao,nome,local) VALUES ($1,$2,$3,$4)',f);id=f[0];
              }else if(entity==='pessoas'){
                insist(['tecnico','supervisor'].includes(row.role),400,'Migre apenas técnicos ou supervisores.');
                const zone=await ref('zonas',row.zona_id),mat=text(row.matricula,'Matrícula',40).toUpperCase();
                const p=(await tx.query('SELECT * FROM pessoas WHERE matricula=$1',[mat])).rows[0];
                if(p){insist(p.nome===row.nome&&p.role===row.role&&p.zona_id===zone,409,'Matrícula existente com outros dados.');id=mat;reused=true;}
                else id=await saveUser(tx,req.user,{matricula:mat,nome:row.nome,role:row.role,cargo:row.cargo,zona_id:zone,cpf:row.cpf,email:row.email,telefone:row.telefone,admissao:row.admissao,ativo:false},null,{migration:true});
              }else if(entity==='locais'){
                id=(await tx.query('INSERT INTO locais(nome,endereco,bairro,zona_id) VALUES ($1,$2,$3,$4) RETURNING id',[text(row.nome,'Local',150),text(row.endereco,'Endereço',300),text(row.bairro,'Bairro',100),await ref('zonas',row.zona_id)])).rows[0].id;
              }else if(entity==='elevadores'){
                const code=text(row.codigo,'Código do elevador',40).toUpperCase();insist(/^[A-Z0-9_-]+$/.test(code),400,'Código de elevador inválido.');
                id=(await tx.query('INSERT INTO elevadores(codigo,local_id,fabricante,modelo,numero_serie,capacidade_kg) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',[code,await ref('locais',row.local_id),text(row.fabricante,'Fabricante',100),text(row.modelo,'Modelo',100),text(row.numero_serie,'Número de série',100),integer(row.capacidade_kg,'Capacidade',100,5000)])).rows[0].id;
              }else if(entity==='chamados'){
                insist(row.aberto_em,400,'Informe a data de abertura original.');
                id=await insertTicket(tx,{...row,elevador_id:Number(await ref('elevadores',row.elevador_id)),tecnico:row.tecnico_id?await ref('pessoas',row.tecnico_id):null},req.user,true);
                if(row.iniciado_em){
                  const start=new Date(row.iniciado_em),end=row.resolvido_em?new Date(row.resolvido_em):new Date();
                  insist(Number.isFinite(start.getTime())&&start>=new Date(row.aberto_em)&&start<=end,400,'Data de início fora do intervalo do chamado.');
                  await tx.query('UPDATE chamados SET iniciado_em=$1 WHERE id=$2',[start.toISOString(),id]);
                }
              }else{
                const ticket=Number(await ref('chamados',row.chamado_id)),author=row.usuario_id?await ref('pessoas',row.usuario_id):req.user.matricula;
                const date=new Date(row.data),c=(await tx.query('SELECT aberto_em FROM chamados WHERE id=$1',[ticket])).rows[0];
                insist(Number.isFinite(date.getTime())&&date>=new Date(c.aberto_em)&&date.getTime()<=Date.now()+60000,400,'Data de histórico inválida.');
                id=(await tx.query('INSERT INTO historico_chamados(chamado_id,usuario_matricula,alteracao,data) VALUES ($1,$2,$3,$4) RETURNING id',[ticket,author,text(row.alteracao,'Alteração',10000),date.toISOString()])).rows[0].id;
              }
              maps[entity].set(legacy,String(id));summary[reused?'reutilizados':'criados'][entity]++;
              await tx.query('INSERT INTO referencias_legado(origem,entidade,id_legado,id_destino,dados_hash) VALUES ($1,$2,$3,$4,$5)',[source,entity,legacy,String(id),digest(row)]);
            }catch(error){throw new ApiError(error.status??400,entity+', registro '+(index+1)+': '+(error.code==='23505'?'Identificador, CPF, e-mail, matrícula ou série já existente.':error.status?error.message:'Dados incompatíveis com o cadastro.'));}
          }
        }
        if(!req.body.confirmar)throw rollback;
        await tx.query('INSERT INTO migracoes_legado(origem,fingerprint,usuario_matricula,resumo) VALUES ($1,$2,$3,$4)',[source,fingerprint,req.user.matricula,JSON.stringify(summary)]);
      });
    }catch(error){if(error!==rollback)throw error;}
    res.json({validado:true,importado:req.body.confirmar,resumo:summary});
  });
}
