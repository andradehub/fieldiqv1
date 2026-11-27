import {once} from 'node:events';import {mkdir,writeFile} from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createDatabase,projectRoot} from '../server/db.mjs';import {createApp} from '../server/app.mjs';import {notify} from '../server/notifications.mjs';import AxeBuilder from '@axe-core/playwright';
process.env.PLAYWRIGHT_BROWSERS_PATH=path.join(projectRoot,'.fieldiq','browsers');const {chromium,webkit}=await import('playwright');
const db=await createDatabase({dataDir:'memory://',demo:true,expandedDemo:false}),server=createApp(db).listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port,output=path.join(projectRoot,'test-results','notifications');await mkdir(output,{recursive:true});
for(let i=0;i<21;i++)await notify(db,{usuarios:['TK-CAP-SUP-01'],zona:'cap-04',chamado:5,tipo:i?'atribuicao':'sla_vencido',titulo:i?'Você foi incluído no chamado #5':'Prazo de resolução excedido',mensagem:i?'Confira o chamado e organize seu atendimento.':'O prazo precisa de atenção. Verifique a equipe e as próximas ações.',gravidade:i?'info':'critica',chave:'visual-'+i});
const errors=[],scans=[];
try{
 for(const [engine,width]of [['edge',320],['edge',390],['edge',834],['edge',1440],['webkit',390]]){
  const browser=engine==='edge'?await chromium.launch({channel:'msedge',headless:true}):await webkit.launch({headless:true});
  try{
   const context=await browser.newContext({viewport:{width,height:900},isMobile:width<768,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base);await page.locator('[data-login="supervisor.capital"]').click();await page.locator('#page-title').waitFor();
   await page.locator('#topbar .notification-bell .notification-count').filter({hasText:/\d/}).waitFor();await page.locator('#topbar .notification-bell').click();await page.locator('.notification-item').first().waitFor();assert.equal(await page.locator('.notification-dialog').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);
   await page.screenshot({path:path.join(output,engine+'-'+width+'-central.png')});let result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();scans.push({engine,width,violations:result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))});
   const current=(await (await page.request.get(base+'/api/notificacoes')).json()).nao_lidas;
   await page.locator('[data-notification="read"]').first().click();await page.locator('#topbar .notification-bell .notification-count').filter({hasText:String(current-1)}).waitFor();
   await page.locator('[data-notification="filter"][data-value="nao_lidas"]').click();await page.locator('.notification-item').first().waitFor();
   await page.locator('[data-notification="follow"]').first().click();await page.locator('#ticket-dialog').waitFor({state:'visible'});assert.match(await page.locator('#ticket-title').innerText(),/Porta volta a abrir/);await page.locator('[data-action="ticket-tab"][data-tab="edit"]').click();await page.locator('#ed-desc').fill('Rascunho preservado ao consultar avisos');await page.locator('#ticket-dialog .notification-bell').click();await page.locator('[data-notification="follow"]').first().click();await page.locator('#notification-dialog').waitFor({state:'hidden'});assert.equal(await page.locator('#ed-desc').inputValue(),'Rascunho preservado ao consultar avisos');await page.keyboard.press('Escape');
   await page.locator('#topbar .notification-bell').click();await page.locator('[data-notification="read-all"]').click();await page.locator('.notification-body').filter({hasText:'Você está em dia'}).waitFor();await page.keyboard.press('Escape');
   // Reload confirms persistence; another account must start with its own empty history.
   await page.reload();await page.locator('#page-title').waitFor();await page.locator('#topbar .notification-bell').click();await page.locator('.notification-header').filter({hasText:'0 não lidas'}).waitFor();await page.keyboard.press('Escape');
   await page.request.post(base+'/api/auth/logout');await page.reload();await page.locator('[data-login="tecnico.capital"]').click();await page.locator('#page-title').waitFor();await page.locator('#topbar .notification-bell').click();await page.locator('.notification-body').filter({hasText:'Nenhuma notificação por enquanto'}).waitFor();await context.close();
   // Restore unread state only in this isolated test database for the next viewport.
   await db.query('UPDATE notificacoes SET lido_em=NULL');
  }finally{await browser.close();}
 }
 assert.deepEqual(errors,[]);assert.ok(scans.every(s=>!s.violations.length),JSON.stringify(scans));console.log(JSON.stringify({status:'passed',scans:scans.length,output}));
}finally{await writeFile(path.join(output,'report.json'),JSON.stringify({errors,scans},null,2));await new Promise(r=>server.close(r));await db.close();}
