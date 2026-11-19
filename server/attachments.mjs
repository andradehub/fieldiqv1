import express from 'express';
import {createHash} from 'node:crypto';
import {insist,text,getTicket,canEdit,manages} from './permissions.mjs';

function fileType(bytes,name){
  const extension=name.split('.').at(-1).toLowerCase();
  if(extension==='png'&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';
  if(['jpg','jpeg'].includes(extension)&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
  if(extension==='webp'&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP')return 'image/webp';
  if(extension==='pdf'&&bytes.toString('ascii',0,5)==='%PDF-')return 'application/pdf';
  if(['txt','csv'].includes(extension)){
    try{const value=new TextDecoder('utf-8',{fatal:true}).decode(bytes);if(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))return extension==='csv'?'text/csv':'text/plain';}catch{}
  }
  if(['docx','xlsx'].includes(extension)&&bytes.toString('hex',0,4)==='504b0304'&&bytes.includes(Buffer.from(extension==='docx'?'word/document.xml':'xl/workbook.xml'))){
    return extension==='docx'?'application/vnd.openxmlformats-officedocument.wordprocessingml.document':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
  insist(false,400,'Arquivo incompatível. Use JPG, PNG, WebP, PDF, TXT, CSV, DOCX ou XLSX com o formato correto.');
}
export function registerAttachmentRoutes(api,db){
  api.get('/chamados/:id/anexos',async(req,res)=>{
    const c=await getTicket(db,req.params.id,req.user);
    const {rows}=await db.query('SELECT a.id,a.nome,a.tipo,a.tamanho,a.criado_em,a.usuario_matricula,p.nome AS autor FROM anexos_chamados a JOIN pessoas p ON p.matricula=a.usuario_matricula WHERE chamado_id=$1 ORDER BY a.criado_em,a.id',[c.id]);
    res.json({anexos:rows});
  });
  api.post('/chamados/:id/anexos',express.raw({type:'application/octet-stream',limit:'2mb'}),async(req,res)=>{
    insist(Buffer.isBuffer(req.body)&&req.body.length>0,400,'Selecione um arquivo válido.');
    let name;try{name=decodeURIComponent(req.get('X-File-Name')??'');}catch{insist(false,400,'Nome de arquivo inválido.');}
    name=text(name,'Nome do arquivo',180).replace(/[\x00-\x1f\x7f/\\]/g,'_');
    const type=fileType(req.body,name),hash=createHash('sha256').update(req.body).digest('hex');
    const id=await db.transaction(async tx=>{
      const c=await getTicket(tx,req.params.id,req.user,true);
      insist(canEdit(req.user,c),403,'Anexe arquivos apenas aos chamados sob sua responsabilidade.');
      const total=(await tx.query('SELECT count(*)::int AS n,COALESCE(sum(tamanho),0)::int AS bytes FROM anexos_chamados WHERE chamado_id=$1',[c.id])).rows[0];
      insist(total.n<20&&total.bytes+req.body.length<=20*1024*1024,400,'Limite por chamado: 20 anexos e 20 MB no total.');
      const row=(await tx.query('INSERT INTO anexos_chamados(chamado_id,usuario_matricula,nome,tipo,tamanho,sha256,conteudo) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',[c.id,req.user.matricula,name,type,req.body.length,hash,req.body])).rows[0];
      await tx.query('INSERT INTO historico_chamados(chamado_id,usuario_matricula,alteracao) VALUES ($1,$2,$3)',[c.id,req.user.matricula,'Anexo incluído: '+name]);return row.id;
    });res.status(201).json({id});
  });
  api.get('/anexos/:id/arquivo',async(req,res)=>{
    const a=(await db.query('SELECT * FROM anexos_chamados WHERE id=$1',[Number(req.params.id)||0])).rows[0];
    insist(a,404,'Anexo não encontrado.');await getTicket(db,a.chamado_id,req.user);
    res.set('Content-Security-Policy',"default-src 'none'; sandbox");
    res.type(a.tipo);
    const inline=req.query.preview==='1'&&a.tipo.startsWith('image/');
    res.set('Content-Disposition',(inline?'inline':'attachment')+"; filename*=UTF-8''"+encodeURIComponent(a.nome));
    res.send(Buffer.from(a.conteudo));
  });
  api.delete('/anexos/:id',async(req,res)=>{
    await db.transaction(async tx=>{
      const a=(await tx.query('SELECT id,chamado_id,nome,usuario_matricula FROM anexos_chamados WHERE id=$1',[Number(req.params.id)||0])).rows[0];
      insist(a,404,'Anexo não encontrado.');const c=await getTicket(tx,a.chamado_id,req.user,true);
      insist(canEdit(req.user,c)&&(manages(req.user)||a.usuario_matricula===req.user.matricula),403,'Você não pode excluir este anexo.');
      await tx.query('DELETE FROM anexos_chamados WHERE id=$1',[a.id]);
      await tx.query('INSERT INTO historico_chamados(chamado_id,usuario_matricula,alteracao) VALUES ($1,$2,$3)',[c.id,req.user.matricula,'Anexo excluído: '+a.nome]);
    });res.json({ok:true});
  });
}
