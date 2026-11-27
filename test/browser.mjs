import {existsSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {once} from 'node:events';
import assert from 'node:assert/strict';
import AxeBuilder from '@axe-core/playwright';
import {createDatabase,projectRoot} from '../server/db.mjs';
import {createApp} from '../server/app.mjs';
const localBrowsers=path.join(projectRoot,'.fieldiq','browsers');
if(existsSync(localBrowsers))process.env.PLAYWRIGHT_BROWSERS_PATH=localBrowsers;
const {chromium,webkit}=await import('playwright');
const db=await createDatabase({dataDir:'memory://',demo:true});
const server=createApp(db).listen(0,'127.0.0.1');await once(server,'listening');
const base='http://127.0.0.1:'+server.address().port;
const directory=path.join(projectRoot,'test-results','redesign');
await mkdir(directory,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[],accessibility=[];
const pageNames={meuschamados:'Meus chamados',dashboard:'Visão geral',chamados:'Chamados',novochamado:'Novo chamado',elevadores:'Elevadores e locais',tecnicos:'Equipe de campo',usuarios:'Gestão de usuários',solicitacoes:'Solicitações de clientes',banco:'Banco de dados',perfil:'Meu perfil'};
async function login(page,who){
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.locator('[data-action="demo-login"][data-login="'+who+'"]').click();
  await page.locator('#page-title').filter({hasText:'Visão geral'}).waitFor();
  await page.evaluate(()=>document.fonts.ready);
}
async function navigate(page,route){
  const sidebar=page.locator('#sidebar');
  if(await sidebar.evaluate(node=>node.inert))await page.locator('#menu-toggle').click();
  await page.locator('#sidebar [data-route="'+route+'"]').first().click();
  await page.locator('#page-title').filter({hasText:pageNames[route]}).waitFor();
}
async function screenshot(page,name){
  await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:path.join(directory,name+'.png'),fullPage:true});
}
async function noOverflow(page,label){
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+': a página excedeu a largura do viewport.');
}
async function axe(page,label){
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  const violations=result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));
  accessibility.push({label,violations});
}
try{
  const context=await browser.newContext({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base,{waitUntil:'domcontentloaded'});await page.locator('#login-form').waitFor();
  await screenshot(page,'desktop-login');await axe(page,'login');
  await page.locator('[data-login="tecnico.capital"]').click();await page.locator('#page-title').waitFor();
  await page.goto(base+'/#importacao');await page.locator('#page-title').filter({hasText:'Visão geral'}).waitFor();
  assert.ok(page.url().endsWith('#dashboard'));
  assert.equal(await page.locator('[data-route="importacao"]').count(),0);
  assert.equal(await page.locator('#sidebar [data-route="banco"]').count(),0);
  await page.locator('.metric-card[data-filter="pending"]').click();
  const bootstrap=await (await page.request.get(base+'/api/bootstrap')).json();
  assert.equal(await page.locator('[data-ticket-row]').count(),bootstrap.chamados.filter(c=>['aberto','em_andamento'].includes(c.status)).length);
  await page.locator('[data-action="clear-ticket-filters"]').click();
  await page.locator('#ticket-search').fill('BAR-001');
  assert.ok(await page.locator('[data-ticket-row]').count()>0);
  assert.ok((await page.locator('.ticket-table tbody').innerText()).includes('BAR-001'));
  await page.locator('[data-action="clear-ticket-filters"]').click();
  await page.locator('[data-action="open-ticket"][data-id="5"]').first().click();
  await page.locator('#ai-panel').filter({hasText:'4 ocorrência(s)'}).waitFor();
  await screenshot(page,'desktop-chamado');
  await axe(page,'detalhes do chamado');
  await page.locator('[data-action="ai-feedback"][data-helpful="true"]').click();
  await page.locator('[data-action="ai-feedback"][data-helpful="true"][aria-pressed="true"]').waitFor();
  await page.locator('[data-action="ticket-tab"][data-tab="history"]').click();
  assert.match(await page.locator('.timeline').innerText(),/Fernanda Lopes/);
  await page.locator('.sheet-tabs [data-action="ticket-tab"][data-tab="edit"]').click();
  await page.locator('#ed-solucao').fill('Solução fictícia registrada no teste do novo atendimento.');
  await page.locator('#ed-status').selectOption('resolvido');
  await page.locator('#ticket-save').click();
  await page.locator('#ticket-dialog').waitFor({state:'hidden'});
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('#page-title').waitFor();
  await page.locator('[data-action="open-ticket"][data-id="5"]').first().click();
  await page.locator('#ticket-dialog .sheet-tags').filter({hasText:'Resolvido'}).waitFor();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#ticket-dialog').evaluate(n=>n.open),false);
  await page.locator('[data-action="open-ticket"][data-id="7"]').first().click();
  await page.locator('.sheet-tabs [data-action="ticket-tab"][data-tab="edit"]').click();
  assert.equal(await page.locator('#ticket-edit-form').count(),0);
  await page.keyboard.press('Escape');
  await page.locator('#sidebar [data-action="logout"]').click();
  await page.locator('[data-login="supervisor.capital"]').click();await page.locator('#page-title').waitFor();
  assert.equal(await page.locator('[data-route="importacao"]').count(),0);
  for(const route of ['dashboard','chamados','novochamado','elevadores','tecnicos','banco','perfil']){
    await navigate(page,route);
    if(route==='banco')await page.locator('.database-data tbody tr').first().waitFor();
    await noOverflow(page,'desktop '+route);await screenshot(page,'desktop-'+route);await axe(page,'desktop '+route);
  }
  await navigate(page,'elevadores');
  await page.locator('[data-action="asset-open"]').click();
  await page.locator('[data-action="asset-tab"][data-tab="local"]').click();
  await page.locator('#local-nome').fill('Local fictício do novo design');
  await page.locator('#local-endereco').fill('Endereço fictício');
  await page.locator('#local-bairro').fill('Barra da Tijuca');
  await page.locator('#asset-form button[type="submit"]').click();
  await page.locator('#utility-dialog').waitFor({state:'hidden'});
  await page.locator('[data-action="asset-open"]').click();
  await page.locator('#lift-codigo').fill('BAR-UI');
  await page.locator('#lift-local').selectOption({label:'Local fictício do novo design'});
  await page.locator('#lift-fabricante').fill('Fabricante fictício');await page.locator('#lift-modelo').fill('Modelo UI');
  await page.locator('#lift-serie').fill('DEMO-UI');
  await page.locator('#asset-form button[type="submit"]').click();
  await page.locator('#utility-dialog').waitFor({state:'hidden'});
  await page.locator('#asset-search').fill('BAR-UI');
  assert.match(await page.locator('.data-table tbody').innerText(),/BAR-UI/);
  await navigate(page,'novochamado');
  await page.locator('#nc-elevador').selectOption('1');
  await page.locator('#nc-titulo').fill('<img src=x onerror="window.__xss=1"> Porta travando');
  await page.locator('#new-ticket-next').click();
  await page.locator('#nc-desc').fill('Porta interrompe o fechamento, sensor intermitente.');
  await page.locator('#nc-sla').fill('8');await page.locator('#nc-tec').selectOption('TK-CAP-001');
  await page.locator('#new-ticket-next').click();
  await screenshot(page,'desktop-novochamado-revisao');
  await page.locator('#new-ticket-next').click();
  await page.locator('#ticket-dialog').waitFor({state:'visible'});
  assert.equal(await page.locator('img[src="x"]').count(),0);
  assert.equal(await page.evaluate(()=>window.__xss),undefined);
  await page.keyboard.press('Escape');
  await navigate(page,'banco');await page.locator('.database-data tbody tr').first().waitFor();
  const exported=await page.request.get(base+'/api/banco/export');
  assert.equal(exported.status(),200);assert.match(await exported.text(),/INSERT INTO chamados/);
  await navigate(page,'usuarios');
  assert.equal(await page.locator('[data-action="user-open"]').count(),0);
  const contacts=await (await page.request.get(base+'/api/usuarios')).json();assert.ok(contacts.usuarios.every(p=>!('login' in p)&&!('cpf_mascarado' in p)));
  await page.locator('#sidebar [data-action="logout"]').click();await page.locator('[data-login="administrativo"]').click();await page.locator('#page-title').waitFor();await navigate(page,'usuarios');
  await page.locator('[data-action="user-open"]').first().click();
  await page.locator('#user-name').fill('Colaborador fictício da interface');
  await page.locator('#user-registration').fill('UI-TEST');await page.locator('#user-cpf').fill('52998224725');
  assert.equal(await page.locator('#user-zone').isDisabled(),false);await page.locator('#user-zone').selectOption('cap-04');
  assert.equal(await page.locator('#user-role option').count(),3);
  await page.locator('#user-email').fill('ui@example.com');await page.locator('#user-phone').fill('(21) 00000-0000');
  await page.locator('#user-admission').fill('2026-01-02');await page.locator('#user-login').fill('colaborador.ui');await page.locator('#user-password').fill('senha-ficticia-ui');
  await axe(page,'cadastro de técnico pelo Administrativo');await screenshot(page,'desktop-usuario-cadastro');
  await page.locator('form[data-form="user"] button[type="submit"]').click();await page.locator('#utility-dialog').waitFor({state:'hidden'});
  await page.locator('#user-search').fill('UI-TEST');await page.locator('.users-panel tbody').filter({hasText:'Colaborador fictício'}).waitFor();
  await page.locator('[data-action="user-open"][data-registration="UI-TEST"]').click();await page.locator('#user-phone').fill('(21) 99999-0000');
  await page.locator('form[data-form="user"] button[type="submit"]').click();await page.locator('#utility-dialog').waitFor({state:'hidden'});
  await page.locator('.users-panel tbody').filter({hasText:'99999-0000'}).waitFor();
  const newCall=await page.request.post(base+'/api/chamados',{data:{titulo:'Atendimento com evidências — teste fictício',elevador_id:1,tecnico:'TK-CAP-001',sla_horas:1}});assert.equal(newCall.status(),201);const callId=(await newCall.json()).id;
  await db.query("UPDATE chamados SET aberto_em=now()-interval '2 hours' WHERE id=$1",[callId]);
  await page.locator('#sidebar [data-action="logout"]').click();await page.locator('[data-login="tecnico.capital"]').click();await page.locator('#page-title').waitFor();
  await navigate(page,'chamados');await page.locator('#ticket-search').fill('Atendimento com evidências');await page.locator('[data-action="open-ticket"][data-id="'+callId+'"]').click();
  await page.locator('[data-action="attendance-start"]').click();await page.locator('[data-action="attendance-pause"]').waitFor();
  assert.match(await page.locator('.timing-grid').innerText(),/em atendimento/);
  await page.locator('[data-action="attendance-pause"]').click();await page.locator('[data-action="attendance-start"]').filter({hasText:'Retomar atendimento'}).waitFor();
  await page.locator('[data-action="attendance-start"]').click();await page.locator('[data-action="attendance-pause"]').waitFor();
  await page.locator('[data-action="ticket-tab"][data-tab="files"]').click();
  await page.locator('#ticket-files').setInputFiles([{name:'relatorio-ficticio.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\nEvidência fictícia\n%%EOF')},{name:'foto-ficticia.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ioAAAAASUVORK5CYII=','base64')}]);
  await page.locator('.attachment-card').nth(1).waitFor();assert.equal(await page.locator('.attachment-card').count(),2);
  await page.locator('.attachment-preview img').waitFor();await axe(page,'fotos e documentos');await screenshot(page,'desktop-anexos');
  const downloadPromise=page.waitForEvent('download');await page.locator('.attachment-info a').first().click();const download=await downloadPromise;assert.equal(download.suggestedFilename(),'relatorio-ficticio.pdf');
  await page.locator('[data-action="attendance-finish"]').click();await page.locator('#ed-solucao').fill('Solução fictícia com evidências anexadas.');await page.locator('#ticket-save').click();await page.locator('#ticket-dialog').waitFor({state:'hidden'});
  await page.locator('[data-action="open-ticket"][data-id="'+callId+'"]').click();await page.locator('.sheet-tags').filter({hasText:'Resolvido'}).waitFor();await page.locator('.timing-grid').filter({hasText:'Tempo de resolução'}).waitFor();await screenshot(page,'desktop-tempos-conclusao');await page.keyboard.press('Escape');
  const resolvedCall=(await db.query('SELECT * FROM vw_chamados_metricas WHERE id=$1',[callId])).rows[0];assert.equal(resolvedCall.sla_cumprido,false);assert.ok(resolvedCall.iniciado_em&&resolvedCall.resolvido_em);
  await page.locator('#sidebar [data-action="logout"]').click();await page.locator('[data-login="administrativo"]').click();await page.locator('#page-title').waitFor();
  await navigate(page,'usuarios');await page.locator('[data-action="user-open"]').first().click();assert.equal(await page.locator('#user-zone').isDisabled(),false);assert.equal(await page.locator('#user-role option').count(),3);await axe(page,'cadastro administrativo');await page.keyboard.press('Escape');
  await context.close();

  for(const width of [320,375,390,430,768,834,1024]){
    const context=await browser.newContext({viewport:{width,height:width>=768?1112:844},isMobile:width<768,hasTouch:true,deviceScaleFactor:1,reducedMotion:'reduce'});
    const mobile=await context.newPage();mobile.on('pageerror',error=>errors.push(error.message));
    await login(mobile,'supervisor.capital');
    await noOverflow(mobile,width+' login');
    for(const route of Object.keys(pageNames)){
      await navigate(mobile,route);
      if(route==='banco')await mobile.locator('.database-data tbody tr').first().waitFor();
      await noOverflow(mobile,width+' '+route);
      if((width===390&&['dashboard','chamados','novochamado','banco'].includes(route))||(width===834&&route==='dashboard'))await screenshot(mobile,width+'-'+route);
    }
    if(width===390){
      await navigate(mobile,'chamados');
      await mobile.locator('[data-action="open-ticket"][data-id="5"]').first().click();
      await mobile.locator('#ai-panel .assistant-panel h3').waitFor();
      await noOverflow(mobile,'iPhone drawer');await screenshot(mobile,'390-chamado');
      await axe(mobile,'390 detalhes');
      await mobile.keyboard.press('Escape');
      await navigate(mobile,'novochamado');await axe(mobile,'390 novo chamado');
      await mobile.locator('#nc-elevador').selectOption('1');await mobile.locator('#nc-titulo').fill('Chamado fictício no celular');
      await mobile.locator('#new-ticket-next').click();
      await mobile.locator('#nc-desc').fill('Registro fictício pela interface móvel.');
      await mobile.locator('#new-ticket-next').click();await mobile.locator('#new-ticket-next').click();
      await mobile.locator('#ticket-dialog').waitFor({state:'visible'});await mobile.keyboard.press('Escape');
    }
    await context.close();
  }
  let safari='não executado: engine não instalada';
  if(existsSync(webkit.executablePath())){
    const safariBrowser=await webkit.launch({headless:true});
    try{
      const context=await safariBrowser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,reducedMotion:'reduce'});
      const page=await context.newPage();page.on('pageerror',error=>errors.push('WebKit: '+error.message));
      await login(page,'supervisor.capital');
      for(const route of Object.keys(pageNames)){
        await navigate(page,route);
        if(route==='banco')await page.locator('.database-data tbody tr').first().waitFor();
        await noOverflow(page,'WebKit '+route);
      }
      await navigate(page,'chamados');await page.locator('[data-action="open-ticket"][data-id="5"]').first().click();
      await page.locator('#ticket-dialog').waitFor({state:'visible'});
      await page.locator('.sheet-tabs [data-action="ticket-tab"][data-tab="edit"]').click();
      await screenshot(page,'webkit-iphone-atendimento');
      await page.keyboard.press('Escape');
      safari='WebKit: oito telas e detalhes do chamado verificados em viewport iPhone';
      await context.close();
    }finally{await safariBrowser.close();}
  }
  await writeFile(path.join(directory,'accessibility.json'),JSON.stringify(accessibility,null,2));
  const violations=accessibility.flatMap(result=>result.violations.map(v=>({...v,screen:result.label})));
  assert.deepEqual(errors,[],'Erros JavaScript');
  assert.deepEqual(violations,[],'Violações detectadas pelo axe');
  console.log(JSON.stringify({status:'passed',viewports:[320,375,390,430,768,834,1024,1440],screens:Object.keys(pageNames).length,accessibilityScans:accessibility.length,safari,captures:directory}));
}finally{
  await writeFile(path.join(directory,'accessibility.json'),JSON.stringify(accessibility,null,2));
  await browser.close();await new Promise(r=>server.close(r));await db.close();
}
