import {once} from 'node:events';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createDatabase,projectRoot} from '../server/db.mjs';
import {createApp} from '../server/app.mjs';
import AxeBuilder from '@axe-core/playwright';
process.env.PLAYWRIGHT_BROWSERS_PATH=path.join(projectRoot,'.fieldiq','browsers');
const {chromium,webkit}=await import('playwright');
const db=await createDatabase({dataDir:'memory://',demo:true,expandedDemo:false}),server=createApp(db).listen(0,'127.0.0.1');await once(server,'listening');
const base='http://127.0.0.1:'+server.address().port,output=path.join(projectRoot,'test-results','operations');await mkdir(output,{recursive:true});
const errors=[],scans=[];
async function check(page,label){
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+' page overflow');
  if(await page.locator('#utility-dialog').isVisible())assert.ok(await page.locator('#utility-dialog').evaluate(n=>n.scrollWidth<=n.clientWidth+1),label+' dialog overflow');
  if(await page.locator('#ticket-dialog').isVisible())assert.ok(await page.locator('#ticket-dialog').evaluate(n=>n.scrollWidth<=n.clientWidth+1),label+' ticket overflow');
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  scans.push({label,violations:result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))});
}
async function nav(page,route){if(await page.locator('#sidebar').evaluate(n=>n.inert))await page.locator('#menu-toggle').click();await page.locator('#sidebar [data-route="'+route+'"]').click();}
try{
  for(const [engine,width] of [['edge',320],['edge',390],['edge',834],['webkit',390]]){
    const browser=engine==='edge'?await chromium.launch({channel:'msedge',headless:true}):await webkit.launch({headless:true});
    try{
      const context=await browser.newContext({viewport:{width,height:844},hasTouch:true,isMobile:width<768,reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
      await page.goto(base);await page.locator('[data-login="administrativo"]').click();await page.locator('#page-title').waitFor();
      await nav(page,'chamados');
      for(const status of ['','aberto','em_andamento','resolvido','cancelado']){
        const tab=page.locator('.tickets-tabs [data-status="'+status+'"]');
        const box=await tab.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1,engine+' '+width+' status '+status+' clipped');
      }
      assert.ok(await page.locator('.tickets-tabs').evaluate(n=>n.scrollWidth<=n.clientWidth+1));
      await page.locator('.tickets-tabs [data-status="cancelado"]').click();await page.locator('.tickets-tabs [data-status="cancelado"][aria-pressed="true"]').waitFor();
      await check(page,engine+' '+width+' all ticket filters');await page.screenshot({path:path.join(output,engine+'-'+width+'-filtros.png')});
      await page.locator('.tickets-tabs [data-status=""]').click();
      await nav(page,'usuarios');await page.locator('[data-action="user-open"]').first().click();
      await check(page,engine+' '+width+' user form');await page.screenshot({path:path.join(output,engine+'-'+width+'-usuario.png')});await page.keyboard.press('Escape');
      const created=await page.request.post(base+'/api/chamados',{data:{titulo:'Teste móvel '+engine+' '+width,elevador_id:1,tecnico:'TK-CAP-001'}});assert.equal(created.status(),201);const id=(await created.json()).id;
      await nav(page,'chamados');await page.locator('#ticket-search').fill('Teste móvel '+engine+' '+width);await page.locator('[data-action="open-ticket"][data-id="'+id+'"]').click();
      await page.locator('[data-action="attendance-start"]').click();await page.locator('[data-action="attendance-pause"]').waitFor();
      await check(page,engine+' '+width+' live attendance');await page.screenshot({path:path.join(output,engine+'-'+width+'-atendimento.png')});
      await page.locator('[data-action="ticket-tab"][data-tab="files"]').click();
      await page.locator('#ticket-files').setInputFiles({name:'documento.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\nDocumento fictício\n%%EOF')});await page.locator('.attachment-card').waitFor();
      await check(page,engine+' '+width+' attachments');await page.screenshot({path:path.join(output,engine+'-'+width+'-anexos.png')});
      await page.locator('[data-action="attendance-finish"]').click();await page.locator('#ed-solucao').fill('Solução fictícia pelo dispositivo móvel.');await page.locator('#ticket-save').click();await page.locator('#ticket-dialog').waitFor({state:'hidden'});
      assert.equal((await db.query('SELECT status FROM chamados WHERE id=$1',[id])).rows[0].status,'resolvido');
      await context.close();
    }finally{await browser.close();}
  }
  assert.deepEqual(errors,[]);assert.ok(scans.every(s=>s.violations.length===0),JSON.stringify(scans.filter(s=>s.violations.length)));
  console.log(JSON.stringify({status:'passed',scans:scans.length,widths:[320,390,834],engines:['Edge','WebKit'],output}));
}finally{await writeFile(path.join(output,'accessibility.json'),JSON.stringify(scans,null,2));await new Promise(r=>server.close(r));await db.close();}
