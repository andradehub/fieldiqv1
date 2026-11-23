import {insist} from './permissions.mjs';
export function validateProfileImage(value){
  insist(typeof value==='string'&&value.length<=131072,400,'Foto de perfil: use uma imagem de até 96 KB no pacote.');
  const match=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  insist(match,400,'Foto de perfil deve ser PNG, JPEG ou WebP em base64.');
  const bytes=Buffer.from(match[2],'base64');
  insist(bytes.length>0&&bytes.length<=98304&&bytes.toString('base64')===match[2],400,'Conteúdo da foto de perfil inválido.');
  const valid=match[1]==='png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):match[1]==='jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
  insist(valid,400,'A foto não corresponde ao formato informado.');return value;
}
