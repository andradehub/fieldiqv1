import {createECDH,ECDH} from 'node:crypto';
import {insist} from './permissions.mjs';
export function pushConfiguration(env=process.env){
  const publicKey=env.VAPID_PUBLIC_KEY,privateKey=env.VAPID_PRIVATE_KEY,subject=env.VAPID_SUBJECT;
  let enabled=Boolean(publicKey&&privateKey&&subject&&/^[A-Za-z0-9_-]+$/.test(publicKey)&&/^[A-Za-z0-9_-]+$/.test(privateKey)&&Buffer.from(publicKey,'base64url').length===65&&Buffer.from(privateKey,'base64url').length===32&&(/^[mM]ailto:[^\s@]+@[^\s@]+\.[^\s@]+$/.test(subject)||/^https:\/\//.test(subject)));
  if(enabled)try{const key=createECDH('prime256v1');key.setPrivateKey(Buffer.from(privateKey,'base64url'));enabled=key.getPublicKey().equals(Buffer.from(publicKey,'base64url'));}catch{enabled=false;}
  return {enabled,publicKey:enabled?publicKey:null,privateKey:enabled?privateKey:null,subject:enabled?subject:null};
}
export function validSubscription(body){
  insist(typeof body.endpoint==='string'&&body.endpoint.length<=4096,400,'Inscrição push inválida.');
  let endpoint;try{endpoint=new URL(body.endpoint);}catch{insist(false,400,'Endereço de inscrição inválido.');}
  const host=endpoint.hostname;
  insist(endpoint.protocol==='https:'&&!endpoint.username&&!endpoint.password&&!endpoint.hash&&(!endpoint.port||endpoint.port==='443')&&(host==='fcm.googleapis.com'||host==='web.push.apple.com'||host==='push.services.mozilla.com'||host.endsWith('.push.services.mozilla.com')||host.endsWith('.notify.windows.com')),400,'O endereço precisa pertencer a um serviço de push suportado.');
  const p256dh=body.keys?.p256dh,auth=body.keys?.auth;
  insist(typeof p256dh==='string'&&typeof auth==='string'&&/^[A-Za-z0-9_-]+$/.test(p256dh)&&/^[A-Za-z0-9_-]+$/.test(auth)&&Buffer.from(p256dh,'base64url').length===65&&Buffer.from(auth,'base64url').length===16,400,'Chaves da inscrição inválidas.');
  try{ECDH.convertKey(Buffer.from(p256dh,'base64url'),'prime256v1');}catch{insist(false,400,'Chave pública da inscrição inválida.');}
  return {endpoint:body.endpoint,p256dh,auth};
}
export async function enqueuePush(db,ids){
  if(!ids.length)return;
  await db.query(`INSERT INTO entregas_push(notificacao_id,inscricao_id)
    SELECT n.id,s.id FROM notificacoes n JOIN inscricoes_push s ON s.usuario_matricula=n.usuario_matricula
    WHERE n.id=ANY($1::integer[]) AND (n.ator_matricula IS DISTINCT FROM n.usuario_matricula OR n.tipo='push_teste')
    ON CONFLICT(notificacao_id,inscricao_id) DO NOTHING`,[ids]);
}
