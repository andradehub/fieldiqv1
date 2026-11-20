import {once} from 'node:events';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createDatabase,projectRoot} from '../server/db.mjs';
import {createApp} from '../server/app.mjs';
import AxeBuilder from '@axe-core/playwright';
process.env.PLAYWRIGHT_BROWSERS_PATH=path.join(projectRoot,'.fieldiq','browsers');
const {chromium,webkit}=await import('playwright');
const db=await createDatabase({dataDir:'memory://',demo:true});
const server=createApp(db).listen(0,'127.0.0.1');await once(server,'listening');
const base='http://127.0.0.1:'+server.address().port;
const output=path.join(projectRoot,'test-results','import-routing');await mkdir(output,{recursive:true});
const demo=path.join(projectRoot,'fieldiqarchives/public/demonstracao-fieldiq.json');
const errors=[],scans=[];
async function enter(page,login){
  await page.goto(base);await page.locator('[data-login="'+login+'"]').click();await page.locator('#page-title').waitFor();
  if(await page.locator('#sidebar').evaluate(n=>n.inert))await page.locator('#menu-toggle').click();
  await page.locator('#sidebar [data-route="importacao"]').click();
}
async function check(page,label){
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+' overflow');
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  scans.push({label,violations:result.violations.map(v=>v.id)});
  assert.deepEqual(result.violations.map(v=>v.id),[],label);
}
try{
  for(const [engine,width]of [['edge',1440],['edge',320],['webkit',390]]){
    const browser=engine==='edge'?await chromium.launch({channel:'msedge',headless:true}):await webkit.launch({headless:true});
    try{
      const context=await browser.newContext({viewport:{width,height:900},isMobile:width<768,hasTouch:width<768,reducedMotion:'reduce'});
      const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
      await enter(page,'administrativo');await check(page,engine+' '+width+' import page');
      const before=Number((await db.query('SELECT count(*) AS total FROM chamados')).rows[0].total);
      await page.locator('#import-file').setInputFiles(demo);
      await page.locator('#utility-dialog[open] #migration-content').waitFor();
      assert.match(await page.locator('.migration-counts').innerText(),/Colaboradores\s+40/);
      assert.match(await page.locator('.migration-counts').innerText(),/Chamados\s+160/);
      assert.equal(await page.locator('.import-preview').count(),0);
      assert.equal(Number((await db.query('SELECT count(*) AS total FROM chamados')).rows[0].total),before);
      await page.locator('[data-action="migration-validate"]').click();
      if(engine==='edge'&&width===1440){
        await page.locator('[data-action="migration-confirm"]').waitFor();
        assert.equal(Number((await db.query('SELECT count(*) AS total FROM chamados')).rows[0].total),before);
        await check(page,engine+' '+width+' complete preview');
        await page.locator('[data-action="migration-confirm"]').click();
        await page.locator('#migration-content').filter({hasText:'Migração concluída'}).waitFor();
        assert.equal(Number((await db.query('SELECT count(*) AS total FROM chamados')).rows[0].total),before+160);
      }else{
        await page.locator('#migration-content').filter({hasText:'Este pacote já foi importado'}).waitFor();
        assert.equal(await page.locator('#migration-content th').nth(1).innerText(),'Criados');
        await check(page,engine+' '+width+' duplicate package');
        assert.equal(await page.locator('[data-action="migration-confirm"]').count(),0);
        assert.equal(Number((await db.query('SELECT count(*) AS total FROM chamados')).rows[0].total),before);
      }
      await page.screenshot({path:path.join(output,engine+'-'+width+'-base.png')});
      await context.close();
      const supervisorContext=await browser.newContext({viewport:{width,height:900},isMobile:width<768,hasTouch:width<768});
      const supervisor=await supervisorContext.newPage();supervisor.on('pageerror',error=>errors.push(error.message));
      await enter(supervisor,'supervisor.capital');await supervisor.locator('#import-file').setInputFiles(demo);
      await supervisor.locator('.field-error').filter({hasText:'Administrativo / RH'}).waitFor();
      assert.equal(await supervisor.locator('#utility-dialog').evaluate(n=>n.open),false);
      assert.equal(await supervisor.locator('#import-submit').count(),0);
      await check(supervisor,engine+' '+width+' supervisor guidance');
      await supervisor.locator('[data-action="clear-upload"]').click();
      await supervisor.locator('#import-file').setInputFiles({name:'chamados.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify([{titulo:'Porta fictícia',elevador_codigo:'BAR-001'}]))});
      await supervisor.locator('.import-preview').filter({hasText:'Porta fictícia'}).waitFor();
      assert.equal(await supervisor.locator('#import-submit').count(),1);
      await supervisorContext.close();
    }finally{await browser.close();}
  }
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'passed',scans:scans.length,engines:['Edge','WebKit'],widths:[320,390,1440],database:'isolated memory',output}));
}finally{
  await writeFile(path.join(output,'accessibility.json'),JSON.stringify(scans,null,2));
  await new Promise(resolve=>server.close(resolve));await db.close();
}
