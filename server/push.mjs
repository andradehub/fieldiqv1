import {randomBytes} from 'node:crypto';
import {insist} from './permissions.mjs';
import {pushConfiguration,validSubscription} from './push-store.mjs';
import {notify} from './notifications.mjs';
export function registerPushRoutes(api,db){
  api.get('/push/config',async(req,res)=>{
    const config=pushConfiguration(),total=(await db.query('SELECT count(*)::int AS n FROM inscricoes_push WHERE usuario_matricula=$1 AND chave_publica=$2',[req.user.matricula,config.publicKey])).rows[0].n;
    res.json({disponivel:config.enabled,chave_publica:config.publicKey,dispositivos:total});
  });
  api.post('/push/estado',async(req,res)=>{
    insist(typeof req.body.endpoint==='string'&&req.body.endpoint.length<=4096,400,'Inscrição inválida.');
    const config=pushConfiguration(),row=(await db.query('SELECT vinculo FROM inscricoes_push WHERE endpoint=$1 AND usuario_matricula=$2 AND chave_publica=$3',[req.body.endpoint,req.user.matricula,config.publicKey])).rows[0];
    res.json({ativo:Boolean(row),vinculo:row?.vinculo??null});
  });
  api.post('/push/inscricoes',async(req,res)=>{
    const config=pushConfiguration();insist(config.enabled,503,'Os avisos no celular ainda precisam de configuração pela empresa.');
    insist(req.body.chave_publica===config.publicKey,409,'A configuração mudou. Desative e ative os avisos novamente.');
    const sub=validSubscription(req.body);
    const result=await db.transaction(async tx=>{
      await tx.query('SELECT matricula FROM pessoas WHERE matricula=$1 FOR UPDATE',[req.user.matricula]);
      const previous=(await tx.query('SELECT id,usuario_matricula,vinculo FROM inscricoes_push WHERE endpoint=$1',[sub.endpoint])).rows[0];
      insist(!previous||previous.usuario_matricula===req.user.matricula,409,'Reative os avisos neste navegador para vincular sua conta.');
      await tx.query('DELETE FROM inscricoes_push WHERE usuario_matricula=$1 AND chave_publica<>$2',[req.user.matricula,config.publicKey]);
      const count=(await tx.query('SELECT count(*)::int AS n FROM inscricoes_push WHERE usuario_matricula=$1',[req.user.matricula])).rows[0].n;
      insist(previous||count<10,409,'Limite de dez dispositivos atingido. Desative avisos em um dispositivo antigo.');
      return (await tx.query(`INSERT INTO inscricoes_push(usuario_matricula,endpoint,p256dh,auth,chave_publica,vinculo) VALUES ($1,$2,$3,$4,$5,$6)
        ON CONFLICT(endpoint) DO UPDATE SET p256dh=EXCLUDED.p256dh,auth=EXCLUDED.auth RETURNING id,vinculo`,[req.user.matricula,sub.endpoint,sub.p256dh,sub.auth,config.publicKey,previous?.vinculo??randomBytes(24).toString('hex')])).rows[0];
    });res.status(201).json(result);
  });
  api.delete('/push/inscricoes',async(req,res)=>{
    insist(typeof req.body.endpoint==='string'&&req.body.endpoint.length<=4096,400,'Inscrição inválida.');
    await db.query('DELETE FROM inscricoes_push WHERE endpoint=$1 AND usuario_matricula=$2',[req.body.endpoint,req.user.matricula]);res.json({ok:true});
  });
  api.post('/push/teste',async(req,res)=>{
    insist(pushConfiguration().enabled,503,'Os avisos no celular ainda precisam de configuração.');
    await db.transaction(async tx=>{
      await tx.query('SELECT matricula FROM pessoas WHERE matricula=$1 FOR UPDATE',[req.user.matricula]);
      insist((await tx.query('SELECT id FROM inscricoes_push WHERE usuario_matricula=$1',[req.user.matricula])).rows.length,409,'Ative os avisos em um dispositivo primeiro.');
      insist(!(await tx.query("SELECT id FROM notificacoes WHERE usuario_matricula=$1 AND tipo='push_teste' AND criado_em>now()-interval '1 minute'",[req.user.matricula])).rows.length,429,'Aguarde um minuto entre testes.');
      await notify(tx,{usuarios:[req.user.matricula],ator:req.user.matricula,zona:req.user.zona_id,tipo:'push_teste',titulo:'Teste de notificação do FieldIQ',mensagem:'Um aviso de teste foi solicitado para seus dispositivos cadastrados.',chave:'push-teste:'+req.user.matricula+':'+Math.floor(Date.now()/60000)});
    });res.json({ok:true,mensagem:'Teste colocado na fila de envio. Aguarde a rotina do servidor.'});
  });
}
