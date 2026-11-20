import {once} from 'node:events';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createDatabase,projectRoot} from '../server/db.mjs';
import {createApp} from '../server/app.mjs';
import AxeBuilder from '@axe-core/playwright';
process.env.PLAYWRIGHT_BROWSERS_PATH=path.join(projectRoot,'.fieldiq','browsers');
const {chromium,webkit}=await import('playwright');
const db=await createDatabase({dataDir:'memory://',demo:true}),server=createApp(db).listen(0,'127.0.0.1');await once(server,'listening');
const base='http://127.0.0.1:'+server.address().port,output=path.join(projectRoot,'test-results','followups');await mkdir(output,{recursive:true});
const errors=[],scans=[];
async function check(page,label){
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+' overflow');
 const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();scans.push({label,violations:result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))});
}
async function nav(page,route){if(await page.locator('#sidebar').evaluate(n=>n.inert))await page.locator('#menu-toggle').click();await page.locator('#sidebar [data-route="'+route+'"]').click();}
async function enter(page,login){await page.goto(base);await page.locator('[data-login="'+login+'"]').click();await page.locator('#page-title').waitFor();}
try{
 for(const [engine,width]of [['edge',1440],['edge',320],['webkit',390]]){
  const browser=engine==='edge'?await chromium.launch({channel:'msedge',headless:true}):await webkit.launch({headless:true});
  try{
   const context=await browser.newContext({viewport:{width,height:width===1440?1000:844},isMobile:width<768,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await enter(page,'administrativo');
   await nav(page,'usuarios');await page.locator('[data-action="user-open"]').first().click();await page.locator('#user-name').fill('Rascunho preservado');await page.locator('#user-email').fill('rascunho@example.com');await page.locator('#user-role').selectOption('supervisor');
   assert.equal(await page.locator('#user-name').inputValue(),'Rascunho preservado');assert.equal(await page.locator('#user-position').evaluate(n=>n.tagName),'SELECT');assert.equal(await page.locator('#user-position option').filter({hasText:'Estagiário de campo'}).count(),0);
   const dialogBox=await page.locator('#utility-dialog').boundingBox();
   if(width===1440){await page.mouse.click(10,10);assert.equal(await page.locator('#utility-dialog').evaluate(n=>n.open),true);await page.locator('#user-name').focus();await page.mouse.move(dialogBox.x+100,dialogBox.y+125);await page.mouse.down();await page.mouse.move(5,5);await page.mouse.up();assert.equal(await page.locator('#utility-dialog').evaluate(n=>n.open),true);}
   await page.keyboard.press('Escape');await page.locator('[data-action="user-open"]').first().click();assert.equal(await page.locator('#user-name').inputValue(),'Rascunho preservado');assert.equal(await page.locator('#user-email').inputValue(),'rascunho@example.com');assert.equal(await page.locator('#user-role').inputValue(),'supervisor');
   await page.locator('#user-role').selectOption('tecnico');await page.locator('#user-position').selectOption('Estagiário de campo');await check(page,engine+' '+width+' draft/jobs');await page.screenshot({path:path.join(output,engine+'-'+width+'-cadastro.png')});
   await page.locator('[data-action="close-utility"]').first().click();await page.locator('[data-action="user-open"]').first().click();assert.equal(await page.locator('#user-position').inputValue(),'Estagiário de campo');await page.locator('[data-action="user-discard"]').click();await page.locator('[data-action="user-open"]').first().click();assert.equal(await page.locator('#user-name').inputValue(),'');await page.locator('#user-role').selectOption('cliente');await page.locator('[name="locais_ids"][value="1"]').check();assert.equal(await page.locator('#user-zone').isVisible(),false);await check(page,engine+' '+width+' client provisioning');await page.keyboard.press('Escape');
   const created=await page.request.post(base+'/api/chamados',{data:{titulo:'Visualização da imagem '+engine+' '+width,elevador_id:1,tecnico:'TK-CAP-001'}});const id=(await created.json()).id;
   await nav(page,'chamados');await page.locator('#ticket-search').fill('Visualização da imagem '+engine+' '+width);await page.locator('[data-action="open-ticket"][data-id="'+id+'"]').click();await page.locator('[data-action="ticket-tab"][data-tab="files"]').click();
   const encoded=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=1600;c.height=300;const x=c.getContext('2d');x.fillStyle='#eadcf5';x.fillRect(0,0,1600,300);x.fillStyle='#5b0a8a';x.font='50px sans-serif';x.fillText('Evidência fictícia — imagem panorâmica',30,150);return c.toDataURL('image/png').split(',')[1];});
   await page.locator('#ticket-files').setInputFiles({name:'panorama.png',mimeType:'image/png',buffer:Buffer.from(encoded,'base64')});await page.locator('.attachment-preview').waitFor();assert.equal(await page.locator('.attachment-preview img').evaluate(n=>getComputedStyle(n).objectFit),'contain');
   await page.locator('.attachment-preview').click();await page.locator('#image-viewer-img').evaluate(n=>n.decode());let size=await page.locator('#image-viewer-img').boundingBox();assert.ok(Math.abs(size.width/size.height-1600/300)<.1);await check(page,engine+' '+width+' image viewer');await page.screenshot({path:path.join(output,engine+'-'+width+'-imagem.png')});
   await page.locator('[data-action="image-zoom"][data-step="0.5"]').click();assert.equal(await page.locator('#image-zoom-value').innerText(),'150%');await page.locator('[data-action="image-close"]').click();assert.ok(await page.locator('#ticket-dialog').evaluate(n=>n.open));await page.keyboard.press('Escape');
   await nav(page,'importacao');await page.locator('#import-file').setInputFiles(path.join(projectRoot,'fieldiqarchives/public/demonstracao-fieldiq.json'));await page.locator('#import-validate').click();await page.locator('#import-submit').waitFor({timeout:60000});await check(page,engine+' '+width+' complete import preview');await page.keyboard.press('Escape');
   // Separate client context, with a different cookie and completely different interface.
   const clientContext=await browser.newContext({viewport:{width,height:width===1440?1000:844},isMobile:width<768,hasTouch:true,reducedMotion:'reduce'}),client=await clientContext.newPage();client.on('pageerror',e=>errors.push(e.message));await client.goto(base+'/cliente.html');await client.locator('[data-action="client-demo"]').click();await client.locator('.client-welcome').waitFor();await check(client,engine+' '+width+' client portal');
   await client.locator('#client-new>summary').click();await client.locator('#client-elevator').selectOption('1');await client.locator('#client-title').fill('Cliente '+engine+' '+width);await client.locator('#client-description').fill('Problema fictício comunicado pelo cliente.');await client.locator('[data-client-form="request"] button[type="submit"]').click();await client.locator('.client-request').filter({hasText:'Cliente '+engine+' '+width}).waitFor();
   const card=client.locator('.client-request').filter({hasText:'Cliente '+engine+' '+width});await card.locator('[data-action="client-reminder"]').click();await card.locator('[data-action="client-reminder"][disabled]').waitFor();await check(client,engine+' '+width+' client request/reminder');await client.screenshot({path:path.join(output,engine+'-'+width+'-cliente.png'),fullPage:true});
   await nav(page,'solicitacoes');await page.locator('[data-action="refresh"]').click();const requestCard=page.locator('.request-card').filter({hasText:'Cliente '+engine+' '+width});await requestCard.locator('[data-action="request-review"]').click();await page.locator('#review-tech').selectOption('TK-CAP-001');await check(page,engine+' '+width+' triage');await page.locator('[data-form="request-review"] button[type="submit"]').click();await page.locator('#utility-dialog').waitFor({state:'hidden'});
   await client.locator('[data-action="client-refresh"]').click();await card.filter({hasText:'Aceito'}).waitFor();await clientContext.close();await context.close();
  }finally{await browser.close();}
 }
 assert.deepEqual(errors,[]);assert.ok(scans.every(s=>s.violations.length===0),JSON.stringify(scans.filter(s=>s.violations.length)));console.log(JSON.stringify({status:'passed',scans:scans.length,widths:[320,390,1440],engines:['Edge','WebKit'],output}));
}finally{await writeFile(path.join(output,'accessibility.json'),JSON.stringify(scans,null,2));await new Promise(r=>server.close(r));await db.close();}
