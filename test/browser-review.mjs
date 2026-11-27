import {once} from 'node:events';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import AxeBuilder from '@axe-core/playwright';
import {chromium} from 'playwright';
import {createDatabase,projectRoot} from '../server/db.mjs';
import {createApp} from '../server/app.mjs';
const db=await createDatabase({dataDir:'memory://',demo:true}),server=createApp(db).listen(0,'127.0.0.1');await once(server,'listening');
const base='http://127.0.0.1:'+server.address().port,output=path.join(projectRoot,'test-results','review');await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],scans=[],captures=[];
async function nav(page,route){if(await page.locator('#sidebar').evaluate(n=>n.inert))await page.locator('#menu-toggle').click();await page.locator('#sidebar [data-route="'+route+'"]').first().click();}
async function enter(page,who){await page.goto(base);await page.locator('[data-login="'+who+'"]').click();await page.locator('#page-title').waitFor();}
async function check(page,label,{axe=false}={}){
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+': página excede a tela');
  const unstyled=await page.locator('button:visible').evaluateAll(buttons=>buttons.filter(n=>getComputedStyle(n).borderTopStyle==='outset').map(n=>n.textContent));assert.deepEqual(unstyled,[],label+': botão com aparência padrão do navegador');
  assert.deepEqual(await page.locator('.badge:visible').allTextContents().then(labels=>labels.filter(label=>/^(alta|media|média|baixa|critica|crítica)$/.test(label.trim()))),[],label+': prioridade em minúsculas');
  if(axe){const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();scans.push({label,violations:result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))});}
}
async function capture(page,name){await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(output,name+'.png'),fullPage:!(await page.locator('#ticket-dialog').isVisible())});captures.push(name);}
try{
  for(const width of [320,390,834,1440]){
    const context=await browser.newContext({viewport:{width,height:width===1440?1050:900},isMobile:width<768,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await enter(page,'supervisor.capital');
    for(const route of ['dashboard','chamados','meuschamados','novochamado','elevadores','tecnicos','usuarios','solicitacoes','banco','perfil']){
      await nav(page,route);if(route==='banco')await page.locator('.database-data tbody tr').first().waitFor();if(route==='usuarios')await page.locator('.users-panel tbody').waitFor();
      await check(page,width+' '+route,{axe:width===390||width===1440});if(width===390||width===1440)await capture(page,width+'-'+route);
      if(route==='usuarios'){
        assert.equal(await page.locator('[data-action="user-open"]').count(),0);assert.equal(await page.locator('th').filter({hasText:'CPF'}).count(),0);
        if(width<768){const search=await page.locator('.users-toolbar .search-input').boundingBox(),filter=await page.locator('.users-toolbar .select-wrap').boundingBox();assert.ok(filter.y>=search.y+search.height,'Filtro de usuário precisa de sua própria linha no celular');}
      }
      if(['chamados','meuschamados'].includes(route)){
        const bootstrap=await (await page.request.get(base+'/api/bootstrap')).json(),rank={A:0,B:1,C:2},expected=bootstrap.chamados.map(c=>rank[c.prioridade]);
        const shown=async()=>(await page.locator('.ticket-table tbody td[data-label="Prioridade"]').allTextContents()).map(text=>rank[text.trim()[0]]);
        for(const direction of ['asc','desc']){
          if(width===1440){const header=page.locator('.ticket-table .table-sort[data-key="prioridade"]');assert.equal(await header.evaluate(n=>getComputedStyle(n).borderTopWidth),'0px');assert.equal(await header.locator('svg').count(),1);await header.click();}
          else{await page.locator('[data-sort-controls="'+route+'"] [name="sort-key"]').selectOption('prioridade');await page.locator('[data-sort-controls="'+route+'"] [name="sort-direction"]').selectOption(direction);}
          const sorted=expected.slice().sort((a,b)=>direction==='asc'?a-b:b-a).slice(0,width<768?5:10);assert.deepEqual(await shown(),sorted,width+' '+route+' '+direction);
        }
      }
    }
    await nav(page,'tecnicos');await page.locator('[data-action="person-profile"][data-registration="TK-CAP-001"]').click();await page.locator('.technician-identity').waitFor();await check(page,width+' perfil detalhado',{axe:true});await capture(page,width+'-perfil-tecnico');
    assert.equal(await page.locator('.technician-metrics .metric-card').count(),6);await page.locator('[data-action="open-ticket"]').first().click();await page.locator('[data-action="ticket-tab"][data-tab="files"]').click();await page.locator('.attachment-upload').waitFor();await page.keyboard.press('Escape');
    const created=await page.request.post(base+'/api/chamados',{data:{titulo:'Equipe supervisionada '+width,elevador_id:1,prioridade:'B',sla_horas:12}});assert.equal(created.status(),201);const id=(await created.json()).id;
    await page.reload();await page.locator('#page-title').waitFor();await nav(page,'chamados');await page.locator('#ticket-search').fill('Equipe supervisionada '+width);await page.locator('[data-action="open-ticket"][data-id="'+id+'"]').click();
    await page.locator('#ticket-member').selectOption('TK-CAP-002');await page.locator('[data-action="ticket-add-member"]').click();await page.locator('.ticket-team-person').filter({hasText:'Ana Ferreira'}).waitFor();
    assert.equal((await db.query('SELECT status FROM chamados WHERE id=$1',[id])).rows[0].status,'aberto');
    await page.locator('[data-action="attendance-start"]').click();await page.locator('[data-action="attendance-pause"]').waitFor();
    await page.locator('#ticket-member').selectOption('TK-CAP-001');await page.locator('[data-action="ticket-add-member"]').click();await page.locator('.ticket-team-person').filter({hasText:'Carlos Mendes'}).waitFor();
    await page.locator('.ticket-team').scrollIntoViewIfNeeded();await check(page,width+' supervisor inclui sem responsável e em andamento',{axe:true});await capture(page,width+'-equipe-supervisor');
    await page.locator('[data-action="ticket-tab"][data-tab="history"]').click();assert.match(await page.locator('.timeline').innerText(),/Responsável principal definido pela gestão/);assert.match(await page.locator('.timeline').innerText(),/Participante adicionado à equipe/);await page.keyboard.press('Escape');
    await page.goto(base+'/#novochamado');await page.locator('#nc-prio').waitFor();assert.deepEqual(await page.locator('#nc-prio option').allTextContents(),['A · Crítica','B · Média','C · Leve']);
    await context.close();
  }
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await enter(page,'tecnico.capital');await nav(page,'meuschamados');
  const bootstrap=await (await page.request.get(base+'/api/bootstrap')).json(),own=bootstrap.chamados.filter(c=>c.tecnico===bootstrap.user.matricula||c.equipe_matriculas.includes(bootstrap.user.matricula));assert.ok(own.length>0);
  const ownIds=new Set(own.map(c=>c.id));assert.ok((await page.locator('[data-ticket-row]').evaluateAll(rows=>rows.map(n=>Number(n.dataset.ticketRow)))).every(id=>ownIds.has(id)));await check(page,'meus chamados técnico',{axe:true});await capture(page,'390-meus-chamados-tecnico');
  await context.close();
  assert.deepEqual(errors,[]);assert.ok(scans.every(s=>s.violations.length===0),JSON.stringify(scans.filter(s=>s.violations.length)));
  console.log(JSON.stringify({status:'passed',viewports:[320,390,834,1440],accessibilityScans:scans.length,captures:captures.length,output}));
}finally{await writeFile(path.join(output,'report.json'),JSON.stringify({errors,scans,captures},null,2));await browser.close();await new Promise(r=>server.close(r));await db.close();}
