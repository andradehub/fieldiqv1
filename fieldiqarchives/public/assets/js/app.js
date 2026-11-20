import {state,routes,isSupervisor,isAdmin,acceptData,canEdit} from './core/state.js';
import {api} from './core/api.js';
import {esc} from './core/format.js';
import {readImport,readMigration} from './core/import.js';
import {icon,button,slaBadge,options} from './components/ui.js';
import {jobTitles} from './core/jobs.js';
import {renderLogin,renderSidebar,renderTopbar,renderBottomNav} from './views/shell.js';
import {renderDashboard,mountCharts,disposeCharts} from './views/dashboard.js';
import {renderTickets,renderTicketDialog,renderAi} from './views/tickets.js';
import {renderNewTicket,renderNewContext,renderAssetDialog,renderTeamDialog} from './views/forms.js';
import {renderAssets,renderTeam,renderProfile} from './views/operations.js';
import {renderImports} from './views/imports.js';
import {renderDatabase} from './views/database.js';
import {renderUsers,renderUserDialog} from './views/users.js';
import {renderMigration,renderMigrationDialog} from './views/migration.js';
import {renderRequests,renderReview} from './views/requests.js';
import {duration,renderImageViewer} from './views/attachments.js';

const $=id=>document.getElementById(id);
const jobs=new Set();
const userDrafts=new Map();
const draftKey=registration=>(registration??'')||'$new';
function rememberUserDraft(){
  const form=$('utility-dialog').querySelector('form[data-form="user"]');
  if(!form||!state.user)return;
  const draft=Object.fromEntries(new FormData(form));
  draft.role=$('user-role').value;draft.zona_id=$('user-zone').value;
  draft.locais_ids=[...form.querySelectorAll('[name="locais_ids"]:checked')].map(n=>n.value);
  userDrafts.set(draftKey(form.dataset.registration),draft);
}
function updateJobChoices(){
  const role=$('user-role')?.value,select=$('user-position');if(!select)return;
  const registration=$('utility-dialog').querySelector('form')?.dataset.registration;
  const existing=state.usuarios.find(p=>p.matricula===registration);
  select.innerHTML=options(jobTitles(role,existing?.role===role?existing.cargo:''),select.value);
  const client=role==='cliente';$('user-client-locals').hidden=!client;
  const zone=$('user-zone');zone.closest('label').hidden=client;zone.disabled=client||!isAdmin()||role==='administrativo';zone.required=!zone.disabled;
  $('user-cpf').required=!registration&&!client;
}
let databaseRequest=0;
const freshFilters=()=>({search:'',status:'',priority:'',work:'',technician:'',equipment:'',flag:'',period:'all'});
const freshTicket=()=>({step:1,titulo:'',descricao:'',elevador_id:'',tipo_obra:'mod_parcial',prioridade:'media',sla_horas:24,tecnico:''});
const views={dashboard:renderDashboard,chamados:renderTickets,novochamado:renderNewTicket,elevadores:renderAssets,tecnicos:renderTeam,usuarios:renderUsers,solicitacoes:renderRequests,perfil:renderProfile,importacao:renderImports,banco:renderDatabase};

function toast(message){
  $('toast').textContent=message;
  $('toast').classList.add('is-visible');
  clearTimeout(toast.timeout);
  toast.timeout=setTimeout(()=>$('toast').classList.remove('is-visible'),5000);
}
function showFormError(form,message){
  const target=form?.querySelector('[data-form-error]')??(form?.id==='login-form'?$('login-error'):null);
  if(target){target.textContent=message;target.hidden=false;target.scrollIntoView({block:'nearest',behavior:'smooth'});}
  else toast(message);
}
async function execute(trigger,key,callback){
  if(jobs.has(key))return;
  jobs.add(key);
  const label=trigger?.innerHTML;
  if(trigger){trigger.disabled=true;trigger.setAttribute('aria-busy','true');trigger.innerHTML='<span class="spinner"></span><span>Aguarde…</span>';}
  const form=trigger?.form??trigger?.closest('form');
  form?.querySelectorAll('[data-form-error],#login-error').forEach(error=>error.hidden=true);
  try{return await callback();}
  catch(error){
    if(error.status===401&&state.user){showLogin();toast('Sua sessão expirou. Entre novamente.');}
    else if(error.status===409&&state.ui.ticket){
      const current=state.ui.ticket;
      try{await reloadData();const latest=state.chamados.find(c=>c.id===current.record.id);if(latest&&state.ui.ticket===current){if(current.draft.status===current.record.status)current.draft.status=latest.status;current.record=latest;current.clockLoadedAt=Date.now();renderTicket(true);void loadTicketExtras();}}catch{}
      toast(error.message+' Seus textos foram preservados; confira os dados e tente novamente.');
    }
    else if(form?.isConnected)showFormError(form,error.message);
    else toast(error.message);
  }finally{
    jobs.delete(key);
    if(trigger?.isConnected){trigger.disabled=false;trigger.removeAttribute('aria-busy');trigger.innerHTML=label;}
  }
}
function preserveFocus(callback){
  const active=document.activeElement;
  const id=active?.id;
  let selection;
  try{selection=[active.selectionStart,active.selectionEnd];}catch{}
  callback();
  if(id){
    const replacement=$(id);
    replacement?.focus({preventScroll:true});
    if(replacement&&selection?.[0]!=null)try{replacement.setSelectionRange(...selection);}catch{}
  }
}
function renderShell(){
  $('sidebar').innerHTML=renderSidebar();
  $('topbar').innerHTML=renderTopbar();
  $('bottom-nav').innerHTML=renderBottomNav();
  syncMenu();
}
function renderView(preserve=false){
  const draw=()=>{
    disposeCharts();
    $('app-view').innerHTML=(views[state.ui.route]??renderDashboard)();
    if(state.ui.route==='dashboard')mountCharts();
  };
  if(preserve)preserveFocus(draw);else draw();
}
function focusNewStep(){
  const title=document.querySelector('#new-ticket-form .form-section-heading h2');
  if(title){title.tabIndex=-1;title.focus({preventScroll:true});}
  $('new-ticket-form')?.scrollIntoView({block:'start'});
}
function navigate(route,{replace=false,focus=true}={}){
  if(!state.user)return;
  if(!routes[route])route='dashboard';
  if(routes[route].supervisor&&!isSupervisor()){toast('Esta área é exclusiva do supervisor.');return;}
  state.ui.route=route;
  if(route==='chamados')state.ui.ticketPage=1;
  const url='#'+route;
  if(location.hash!==url)history[replace?'replaceState':'pushState'](null,'',url);
  closeMenu(false);
  renderShell();renderView();
  if(focus){window.scrollTo({top:0,behavior:'auto'});$('page-title')?.focus({preventScroll:true});}
  if(route==='banco'&&!state.ui.database.info)void loadDatabase();
  if(route==='usuarios')void loadUsers();
}
async function reloadData(){
  const data=await api('/bootstrap');
  if(data.portal){location.replace('/cliente.html');return false;}
  acceptData(data);
  state.ui.database.info=null;state.ui.database.data=null;
}
function showLogin(){
  userDrafts.clear();
  $('image-dialog').close();
  disposeCharts();
  $('ticket-dialog').close();$('utility-dialog').close();
  closeMenu(false);
  state.user=null;
  for(const key of ['zonas','pessoas','locais','elevadores','chamados','importacoes','usuarios','solicitacoes'])state[key]=[];
  state.ui.users={};state.ui.migration=null;
  state.ui.ticket=null;state.ui.upload=null;state.ui.newTicket=freshTicket();state.ui.filters=freshFilters();
  databaseRequest++;
  Object.assign(state.ui.database,{info:null,data:null,search:'',error:null});
  $('app-shell').hidden=true;
  $('login-root').hidden=false;
  $('login-root').innerHTML=renderLogin();
}
async function enterAccount(login,password){
  const data=await api('/auth/login',{method:'POST',body:{login,senha:password}});
  if(data.user.role==='cliente'){location.assign('/cliente.html');return;}
  await reloadData();
  $('login-root').hidden=true;$('app-shell').hidden=false;
  const initial=location.hash.slice(1);
  navigate(routes[initial]&&(!routes[initial].supervisor||isSupervisor())?initial:'dashboard',{replace:true});
}
function syncMenu(){
  const mobile=window.matchMedia('(max-width:767px)').matches;
  const open=mobile&&state.ui.sidebar;
  $('sidebar').classList.toggle('is-open',open);
  $('sidebar').inert=mobile&&!open;
  $('nav-backdrop').classList.toggle('is-open',open);
  $('menu-toggle')?.setAttribute('aria-expanded',String(open));
  document.body.classList.toggle('menu-open',open);
}
function openMenu(){
  state.ui.sidebar=true;syncMenu();
  $('sidebar').querySelector('a[aria-current="page"]')?.focus();
}
function closeMenu(focus=true){
  state.ui.sidebar=false;syncMenu();
  if(focus)$('menu-toggle')?.focus();
}
function renderTicket(preserve=false){
  const draw=()=>{
    const scroll=$('ticket-body')?.scrollTop??0;
    $('ticket-dialog').innerHTML=renderTicketDialog();
    if($('ticket-body'))$('ticket-body').scrollTop=scroll;
  };
  if(preserve)preserveFocus(draw);else draw();
}
async function loadSuggestion(){
  const current=state.ui.ticket;
  if(!current)return;
  const id=current.record.id;
  current.ai=null;
  if(current.tab==='overview')$('ai-panel').innerHTML=renderAi(null,current.record);
  try{
    const result=await api('/chamados/'+id+'/sugestao',{method:'POST'});
    if(state.ui.ticket!==current)return;
    current.ai=result;
  }catch(error){
    if(state.ui.ticket!==current)return;
    current.ai={error:error.message};
  }
  if(state.ui.ticket===current&&current.tab==='overview'&&$('ai-panel'))$('ai-panel').innerHTML=renderAi(current.ai,current.record);
}
function openTicket(id){
  const c=state.chamados.find(c=>c.id===Number(id));
  if(!c)return;
  state.ui.ticket={record:c,tab:'overview',ai:null,feedback:null,attachments:null,intervals:null,clockLoadedAt:Date.now(),draft:{
    descricao:c.descricao??'',solucao:c.solucao??'',status:c.status,tecnico:c.tecnico??'',tipo_obra:c.tipo_obra,prioridade:c.prioridade,sla_horas:c.sla_horas
  }};
  renderTicket();
  if(!$('ticket-dialog').open)$('ticket-dialog').showModal();
  void loadSuggestion();
  void loadTicketExtras();
}
async function loadTicketExtras(){
  const current=state.ui.ticket;if(!current)return;
  try{
    const [files,times]=await Promise.all([api('/chamados/'+current.record.id+'/anexos'),api('/chamados/'+current.record.id+'/atendimentos')]);
    if(state.ui.ticket!==current)return;
    current.attachments=files.anexos;current.intervals=times.atendimentos;current.filesError=null;
  }catch(error){if(state.ui.ticket===current){current.attachments=[];current.filesError=error.message;}}
  if(state.ui.ticket===current)renderTicket(true);
}
async function loadUsers(){
  const actor=state.user;
  state.ui.users??={};state.ui.users.loading=true;state.ui.users.error=null;
  try{const result=await api('/usuarios');if(state.user===actor)state.usuarios=result.usuarios;}
  catch(error){if(state.user===actor)state.ui.users.error=error.message;}
  if(state.user===actor){state.ui.users.loading=false;if(state.ui.route==='usuarios')renderView(true);}
}
async function refreshTicket(id,tab='overview'){
  await reloadData();renderShell();renderView();
  openTicket(id);if(state.ui.ticket){state.ui.ticket.tab=tab;renderTicket();}
}
async function attachFiles(files){
  const current=state.ui.ticket;if(!current)return;
  let done=0;const errors=[];
  for(const file of files){
    if(file.size>2097152){errors.push(file.name+': máximo 2 MB.');continue;}
    try{
      const response=await fetch('/api/chamados/'+current.record.id+'/anexos',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/octet-stream','X-File-Name':encodeURIComponent(file.name)},body:file,signal:AbortSignal.timeout(30000)});
      const result=await response.json();if(!response.ok)throw new Error(result.error);done++;
    }catch(error){errors.push(file.name+': '+error.message);}
  }
  if(state.ui.ticket!==current)return;
  await refreshTicket(current.record.id,'files');
  if(state.ui.ticket){state.ui.ticket.filesError=errors.join(' ');renderTicket();}
  toast(done+' arquivo(s) anexado(s).'+(errors.length?' Confira os arquivos não enviados.':''));
}
function openUtility(kind,tab){
  state.ui.utility={kind,tab};
  $('utility-dialog').innerHTML=kind==='team'?renderTeamDialog():renderAssetDialog(tab??'lift');
  if(!$('utility-dialog').open)$('utility-dialog').showModal();
}
async function loadDatabase(table=state.ui.database.table){
  const request=++databaseRequest,db=state.ui.database;
  db.table=table;db.data=null;db.error=null;db.search='';
  if(state.ui.route==='banco')renderView(true);
  try{
    const [info,data]=await Promise.all([db.info?Promise.resolve(db.info):api('/banco'),api('/banco/'+table)]);
    if(request!==databaseRequest)return;
    db.info=info;db.data=data;
  }catch(error){if(request===databaseRequest)db.error=error.message;}
  if(request===databaseRequest&&state.ui.route==='banco')renderView(true);
}
function quickFilter(value){
  state.ui.filters=freshFilters();
  const f=state.ui.filters;
  f.period=state.ui.period;
  if(value==='mine'){f.technician=state.user.matricula;f.status='pending';}
  if(value==='pending')f.status='pending';
  if(value==='resolved')f.status='resolvido';
  if(value==='critical'){f.priority='critica';f.status='pending';}
  if(value==='sla'){f.flag='sla';f.status='pending';}
  if(value==='unassigned'){f.flag='unassigned';f.status='pending';}
  navigate('chamados');
}
function openMigration(migration=null){
  state.ui.migration=migration;$('utility-dialog').innerHTML=renderMigrationDialog();state.ui.utility={kind:'migration'};$('utility-dialog').showModal();
}
async function chooseFile(file){
  if(!file)return;
  const pending={file,reading:true,rows:null};
  state.ui.upload=pending;
  renderView();
  try{
    const result=await readImport(file);if(state.ui.upload!==pending)return;
    if(result.kind==='migration'){
      if(!isAdmin())throw new Error('Este arquivo é uma base completa com cadastros e histórico de várias zonas. Entre com o perfil Administrativo / RH para importá-lo. Supervisores podem importar somente chamados da própria zona.');
      state.ui.upload=null;
      if(state.ui.route==='importacao'){renderView();openMigration({file,pack:result.pack,result:null});}
      return;
    }
    state.ui.upload=result;
  }
  catch(error){if(state.ui.upload!==pending)return;state.ui.upload={file,reading:false,error:error.message};}
  if(state.ui.route==='importacao')renderView();
}
async function changePhoto(file){
  if(!file)return;
  if(file.size>1400000||!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Use PNG, JPEG ou WebP de até 1,4 MB.');
  const photo=await new Promise((resolve,reject)=>{
    const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Não foi possível ler a imagem.'));reader.readAsDataURL(file);
  });
  await api('/perfil',{method:'PATCH',body:{foto:photo}});
  await reloadData();renderShell();renderView();toast('Foto de perfil atualizada.');
}

document.addEventListener('click',event=>{
  if(event.target.closest('.skip-link')){event.preventDefault();$('main').focus({preventScroll:true});window.scrollTo({top:0});return;}
  const target=event.target.closest('[data-action],[data-route]');
  if(!target)return;
  if(target.dataset.route){event.preventDefault();navigate(target.dataset.route);return;}
  const action=target.dataset.action;
  if(action==='open-ticket'){openTicket(target.dataset.id);return;}
  if(action==='user-open'){
    const person=state.usuarios.find(p=>p.matricula===target.dataset.registration);
    const draft=userDrafts.get(draftKey(person?.matricula));
    $('utility-dialog').innerHTML=renderUserDialog(person,draft);state.ui.utility={kind:'user'};
    if(draft){for(const[name,value]of Object.entries(draft)){if(name==='locais_ids'){for(const check of $('utility-dialog').querySelectorAll('[name="locais_ids"]'))check.checked=value.includes(check.value);continue;}const field=$('utility-dialog').querySelector('form').elements.namedItem(name);if(field)field.value=value;}}
    updateJobChoices();
    $('utility-dialog').showModal();return;
  }
  if(action==='user-discard'){
    const form=$('utility-dialog').querySelector('form[data-form="user"]');
    userDrafts.delete(draftKey(form.dataset.registration));state.ui.utility={discard:true};$('utility-dialog').close();return;
  }
  if(action==='image-preview'){
    const a=state.ui.ticket?.attachments?.find(a=>a.id===Number(target.dataset.id));if(!a||!a.tipo.startsWith('image/'))return;
    $('image-dialog').innerHTML=renderImageViewer(a);$('image-dialog').dataset.zoom='1';$('image-dialog').showModal();return;
  }
  if(action==='image-close'){$('image-dialog').close();return;}
  if(action==='image-zoom'){
    const dialog=$('image-dialog'),picture=$('image-viewer-img');
    const zoom=Math.max(1,Math.min(3,Number(dialog.dataset.zoom??1)+Number(target.dataset.step)));
    dialog.dataset.zoom=String(zoom);picture.style.width=zoom===1?'':picture.naturalWidth*zoom+'px';picture.classList.toggle('is-zoomed',zoom>1);$('image-zoom-value').textContent=Math.round(zoom*100)+'%';return;
  }
  if(action==='migration-open'){
    openMigration();return;
  }
  if(action==='request-review'){
    const request=state.solicitacoes.find(s=>s.id===Number(target.dataset.id));if(!request)return;
    $('utility-dialog').innerHTML=renderReview(request);state.ui.utility={kind:'review'};$('utility-dialog').showModal();return;
  }
  if(action==='attendance-finish'){
    const current=state.ui.ticket;if(!current)return;
    current.tab='edit';current.draft.status='resolvido';renderTicket();$('ed-solucao')?.focus();return;
  }
  if(action==='close-ticket'){$('ticket-dialog').close();return;}
  if(action==='ticket-tab'){if(state.ui.ticket){state.ui.ticket.tab=target.dataset.tab;renderTicket();$('ticket-dialog').querySelector('.sheet-tabs [data-tab="'+state.ui.ticket.tab+'"]')?.focus();}return;}
  if(action==='toggle-menu'){state.ui.sidebar?closeMenu():openMenu();return;}
  if(action==='close-menu'){closeMenu();return;}
  if(action==='toggle-password'){
    const input=$('login-pass');input.type=input.type==='password'?'text':'password';target.setAttribute('aria-label',input.type==='password'?'Mostrar senha':'Ocultar senha');target.innerHTML=icon(input.type==='password'?'Eye':'EyeOff');return;
  }
  if(action==='quick-filter'){quickFilter(target.dataset.filter);return;}
  if(action==='ticket-page'){state.ui.ticketPage=Number(target.dataset.page);renderView();document.querySelector('.tickets-panel')?.scrollIntoView({block:'start'});return;}
  if(action==='ticket-status'){state.ui.ticketPage=1;state.ui.filters.status=target.dataset.status;state.ui.filters.flag='';renderView();return;}
  if(action==='clear-ticket-filters'){state.ui.ticketPage=1;state.ui.filters=freshFilters();renderView();return;}
  if(action==='new-back'){state.ui.newTicket.step=Math.max(1,state.ui.newTicket.step-1);renderView();focusNewStep();return;}
  if(action==='asset-open'){openUtility('asset',target.dataset.tab);return;}
  if(action==='asset-tab'){openUtility('asset',target.dataset.tab);return;}
  if(action==='team-open'){openUtility('team');return;}
  if(action==='close-utility'){$('utility-dialog').close();return;}
  if(action==='asset-view'){state.ui.assets.tab=target.dataset.tab;renderView();return;}
  if(action==='team-view'){state.ui.team=target.dataset.tab;renderView();return;}
  if(action==='clear-upload'){state.ui.upload=null;renderView();return;}
  if(action==='equipment-tickets'){state.ui.filters=freshFilters();state.ui.filters.equipment=target.dataset.id;navigate('chamados');return;}
  if(action==='person-tickets'){state.ui.filters=freshFilters();state.ui.filters.technician=target.dataset.registration;navigate('chamados');return;}
  if(action==='location-equipment'){
    const place=state.locais.find(l=>l.id===Number(target.dataset.id));
    state.ui.assets.tab='elevadores';state.ui.assets.search=place?.nome??'';renderView();return;
  }
  if(action==='db-table'){void loadDatabase(target.dataset.table);return;}
  if(action==='reload-database'){void loadDatabase();return;}
  if(action==='retry-ai'){void loadSuggestion();return;}
  if(action==='import-details'){
    const row=state.importacoes.find(i=>i.id===Number(target.dataset.id));
    $('utility-dialog').innerHTML=`<div class="utility-header"><div><p class="eyebrow">RESULTADO DA IMPORTAÇÃO</p><h2 id="utility-title">Linhas ignoradas</h2></div>${button('Fechar',{action:'close-utility',name:'X',tone:'quiet'})}</div><div class="utility-body"><p class="body-copy">${esc(row.nome)}</p><ul class="import-errors">${row.detalhes.map(d=>`<li><strong>Linha ${d.linha}</strong><span>${esc(d.erro)}</span></li>`).join('')}</ul></div>`;
    $('utility-dialog').showModal();return;
  }
  void execute(target,action,async()=>{
    if(action==='demo-login'){await enterAccount(target.dataset.login,'tk2026');}
    else if(action==='logout'){await api('/auth/logout',{method:'POST'});showLogin();}
    else if(action==='ticket-join'){
      const id=state.ui.ticket.record.id;await api('/chamados/'+id+'/equipe',{method:'POST'});await refreshTicket(id);toast('Você agora participa da equipe deste chamado.');
    }
    else if(action==='ticket-leave'){
      const id=state.ui.ticket.record.id;await api('/chamados/'+id+'/equipe/'+encodeURIComponent(target.dataset.registration),{method:'DELETE'});await refreshTicket(id);toast('Participação encerrada. Os períodos de trabalho foram preservados.');
    }
    else if(action==='ticket-claim'||action==='ticket-release'){
      const c=state.ui.ticket.record;
      await api('/chamados/'+c.id+'/responsabilidade',{method:'POST',body:{acao:action==='ticket-claim'?'assumir':'liberar',revisao:c.revisao}});
      await refreshTicket(c.id);toast(action==='ticket-claim'?'Você assumiu o chamado. Inicie o atendimento quando começar.':'Chamado liberado e aberto para outro técnico assumir.');
    }
    else if(action==='attendance-start'||action==='attendance-pause'){
      const c=state.ui.ticket.record;
      await api('/chamados/'+c.id+'/atendimento',{method:'POST',body:{revisao:c.revisao,acao:action==='attendance-start'?'iniciar':'pausar'}});
      await refreshTicket(c.id);toast(action==='attendance-start'?'Atendimento iniciado. Horário registrado.':'Atendimento pausado. O SLA continua contando.');
    }else if(action==='attachment-delete'){
      const id=state.ui.ticket.record.id;await api('/anexos/'+target.dataset.id,{method:'DELETE'});await refreshTicket(id,'files');toast('Anexo excluído.');
    }else if(action==='migration-validate'||action==='migration-confirm'){
      const current=state.ui.migration;if(!current?.pack)throw new Error('Selecione um pacote JSON.');
      current.result=await api('/migracoes',{method:'POST',body:{pacote:current.pack,confirmar:action==='migration-confirm'}});
      $('migration-content').innerHTML=renderMigration();
      if(current.result.importado){await reloadData();renderShell();renderView();toast('Migração concluída.');}
    }
    else if(action==='refresh'){
      await reloadData();renderShell();renderView();
      if(state.ui.route==='banco')await loadDatabase();
      toast('Dados atualizados.');
    }else if(action==='team-remove'){
      await api('/equipe',{method:'POST',body:{matricula:target.dataset.registration,remover:true}});
      await reloadData();renderShell();renderView();toast('Vínculo removido da equipe.');
    }else if(action==='submit-import'){
      const upload=state.ui.upload;
      if(!upload?.rows||upload.result)return;
      upload.result=await api('/importacoes',{method:'POST',body:{nome:upload.file.name,formato:upload.format,linhas:upload.rows}});
      await reloadData();renderShell();renderView();toast('Importação processada. Confira o resultado.');
    }else if(action==='ai-feedback'){
      const current=state.ui.ticket,helpful=target.dataset.helpful==='true';
      await api('/sugestoes/'+target.dataset.id+'/avaliacao',{method:'POST',body:{util:helpful}});
      if(state.ui.ticket===current){current.feedback=helpful;if($('ai-panel'))$('ai-panel').innerHTML=renderAi(current.ai,current.record);}
      toast('Obrigado. Sua avaliação foi registrada.');
    }
  });
});

document.addEventListener('submit',event=>{
  const form=event.target;
  if(!form.dataset.form)return;
  event.preventDefault();
  const type=form.dataset.form;
  if(!form.reportValidity())return;
  if(type==='global-search'){
    state.ui.filters=freshFilters();state.ui.filters.search=new FormData(form).get('search')??'';navigate('chamados');return;
  }
  if(type==='new-ticket'&&state.ui.newTicket.step<3){
    if(state.ui.newTicket.step===1&&!state.ui.newTicket.titulo.trim()){showFormError(form,'Informe um título para o chamado.');return;}
    state.ui.newTicket.step++;renderView();focusNewStep();return;
  }
  void execute(event.submitter,type,async()=>{
    const data=Object.fromEntries(new FormData(form));
    if(type==='login'){await enterAccount(data.login,data.senha);}
    else if(type==='new-ticket'){
      const {step,...draft}=state.ui.newTicket;
      const created=await api('/chamados',{method:'POST',body:{...draft,elevador_id:Number(draft.elevador_id),sla_horas:Number(draft.sla_horas),tecnico:draft.tecnico||null}});
      await reloadData();state.ui.newTicket=freshTicket();navigate('chamados');openTicket(created.id);toast('Chamado aberto e enviado para a equipe.');
    }else if(type==='ticket-edit'){
      const current=state.ui.ticket;
      const body={revisao:current.record.revisao,...current.draft};
      if(!isSupervisor()){delete body.tecnico;delete body.tipo_obra;delete body.prioridade;delete body.sla_horas;}
      else {body.tecnico=body.tecnico||null;body.sla_horas=Number(body.sla_horas);}
      await api('/chamados/'+current.record.id,{method:'PATCH',body});
      await reloadData();$('ticket-dialog').close();renderShell();renderView();toast('Atendimento salvo no histórico.');
    }else if(type==='asset'){
      const isLift=form.dataset.kind==='lift';
      if(isLift){data.local_id=Number(data.local_id);data.capacidade_kg=Number(data.capacidade_kg);}
      await api(isLift?'/elevadores':'/locais',{method:'POST',body:data});
      await reloadData();$('utility-dialog').close();renderShell();renderView();toast(isLift?'Elevador cadastrado.':'Local cadastrado.');
    }else if(type==='team'){
      await api('/equipe',{method:'POST',body:data});
      await reloadData();$('utility-dialog').close();renderShell();renderView();toast('Técnico vinculado à equipe.');
    }else if(type==='user'){
      const registration=form.dataset.registration;
      if(!isAdmin()){data.zona_id=state.user.zona_id;data.role='tecnico';}
      else if(state.usuarios.find(p=>p.matricula===registration)?.role==='administrativo'){data.role='administrativo';data.zona_id=null;}
      data.ativo=data.ativo==='true';
      if(data.role==='cliente'){data.locais_ids=new FormData(form).getAll('locais_ids').map(Number);data.zona_id=null;}
      else delete data.locais_ids;
      if(!data.cpf&&registration)delete data.cpf;
      if(!data.senha)delete data.senha;
      await api(registration?'/usuarios/'+encodeURIComponent(registration):'/usuarios',{method:registration?'PATCH':'POST',body:data});
      userDrafts.delete(draftKey(registration));state.ui.utility={discard:true};$('utility-dialog').close();await reloadData();await loadUsers();renderShell();renderView();toast('Colaborador salvo.');
    }else if(type==='request-review'){
      data.sla_horas=Number(data.sla_horas);data.tecnico=data.tecnico||null;
      await api('/solicitacoes/'+form.dataset.id+'/triagem',{method:'POST',body:data});$('utility-dialog').close();await reloadData();renderShell();renderView();toast('Triagem registrada e disponível ao cliente.');
    }
  });
});

document.addEventListener('input',event=>{
  const target=event.target;
  if(target.closest('form[data-form="user"]'))rememberUserDraft();
  if(target.dataset.newfield){
    state.ui.newTicket[target.dataset.newfield]=target.value;
    if($('new-context'))$('new-context').innerHTML=renderNewContext();
  }
  if(target.dataset.draft&&state.ui.ticket)state.ui.ticket.draft[target.dataset.draft]=target.value;
  if(target.dataset.input==='ticket-search'){state.ui.ticketPage=1;state.ui.filters.search=target.value;renderView(true);}
  if(target.dataset.input==='asset-search'){state.ui.assets.search=target.value;renderView(true);}
  if(target.dataset.input==='db-search'){state.ui.database.search=target.value;renderView(true);}
  if(target.dataset.input==='user-search'){state.ui.users??={};state.ui.users.search=target.value;renderView(true);}
});
document.addEventListener('change',event=>{
  const target=event.target;
  if(target.id==='user-role')updateJobChoices();
  if(target.id==='review-action'){
    const accept=target.value==='aceitar';$('review-accept').hidden=!accept;$('review-return-field').hidden=accept;$('review-return').required=!accept;$('review-sla').required=accept;
  }
  if(target.closest('form[data-form="user"]'))rememberUserDraft();
  if(target.dataset.filter){state.ui.ticketPage=1;state.ui.filters[target.dataset.filter]=target.value;renderView(true);}
  if(target.dataset.draft&&state.ui.ticket){
    state.ui.ticket.draft[target.dataset.draft]=target.value;
    if(target.dataset.draft==='status')renderTicket(true);
  }
  if(target.dataset.newfield){
    state.ui.newTicket[target.dataset.newfield]=target.value;
    if($('new-context'))$('new-context').innerHTML=renderNewContext();
  }
  if(target.dataset.change==='period'){state.ui.period=target.value;renderView(true);}
  if(target.dataset.change==='asset-zone'){state.ui.assets.zone=target.value;renderView(true);}
  if(target.dataset.change==='import-file')void chooseFile(target.files[0]);
  if(target.dataset.change==='ticket-files')void execute(null,'ticket-files',()=>attachFiles([...target.files]));
  if(target.dataset.change==='user-role'||target.dataset.change==='user-zone'){state.ui.users??={};state.ui.users[target.dataset.change==='user-role'?'role':'zone']=target.value;renderView(true);}
  if(target.dataset.change==='migration-file')void execute(null,'migration-file',async()=>{
    const file=target.files[0];if(!file)return;
    const pack=await readMigration(file);
    state.ui.migration={file,pack,result:null};$('migration-content').innerHTML=renderMigration();
  });
  if(target.dataset.change==='profile-photo')void execute(null,'profile-photo',()=>changePhoto(target.files[0]));
});
document.addEventListener('dragover',event=>{
  const zone=event.target.closest('#drop-zone');
  if(zone){event.preventDefault();zone.classList.add('is-dragging');}
});
document.addEventListener('dragleave',event=>event.target.closest('#drop-zone')?.classList.remove('is-dragging'));
document.addEventListener('drop',event=>{
  if(event.target.closest('#drop-zone')){event.preventDefault();void chooseFile(event.dataTransfer.files[0]);}
});
for(const id of ['ticket-dialog','utility-dialog']){
  let startedOnBackdrop=false;
  $(id).addEventListener('pointerdown',event=>{const box=$(id).getBoundingClientRect();startedOnBackdrop=event.target===$(id)&&(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom);});
  $(id).addEventListener('click',event=>{
    if(id==='utility-dialog')return;
    if(!startedOnBackdrop)return;
    if(event.target!==$(id))return;
    const box=$(id).getBoundingClientRect();
    if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)$(id).close();
  });
}
$('ticket-dialog').addEventListener('close',()=>{state.ui.ticket=null;});
$('utility-dialog').addEventListener('cancel',()=>{rememberUserDraft();});
$('utility-dialog').addEventListener('close',()=>{if(!state.ui.utility?.discard)rememberUserDraft();state.ui.utility=null;});
$('image-dialog').addEventListener('close',()=>{$('image-dialog').innerHTML='';});
document.addEventListener('keydown',event=>{
  if(!state.ui.sidebar)return;
  if(event.key==='Escape'){closeMenu();return;}
  if(event.key!=='Tab')return;
  const focusable=[...$('sidebar').querySelectorAll('a,button')].filter(n=>n.getClientRects().length);
  const first=focusable[0],last=focusable.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
});
window.matchMedia('(max-width:767px)').addEventListener('change',syncMenu);
window.addEventListener('fieldiq:session-expired',()=>{if(state.user){showLogin();toast('Sua sessão expirou. Entre novamente.');}});
window.addEventListener('popstate',()=>{if(state.user)navigate(location.hash.slice(1),{replace:true});});
setInterval(()=>{
  const current=state.ui.ticket;if(!current)return;
  const c=current.record,work=document.querySelector('[data-attendance-duration]'),elapsed=document.querySelector('[data-ticket-elapsed]');
  if(work)work.textContent=duration(Number(c.tempo_atendimento_seg)+(current.intervals?.filter(a=>!a.encerrado_em).length??0)*(Date.now()-current.clockLoadedAt)/1000);
  if(elapsed&&['aberto','em_andamento'].includes(c.status))elapsed.textContent=duration((Date.now()-new Date(c.aberto_em))/1000);
  if(['aberto','em_andamento'].includes(c.status)){
    const overdue=Date.now()>new Date(c.aberto_em).getTime()+c.sla_horas*3600000;
    if(overdue!==c.sla_vencido){c.sla_vencido=overdue;if($('ticket-sla'))$('ticket-sla').innerHTML=slaBadge(c);}
  }
},1000);
setInterval(()=>{
  if(!state.user||document.hidden||$('ticket-dialog').open||$('utility-dialog').open||jobs.size)return;
  if(!['dashboard','chamados','tecnicos','perfil','solicitacoes'].includes(state.ui.route))return;
  void execute(null,'auto-refresh',async()=>{await reloadData();renderView(true);});
},30000);

(async()=>{
  $('login-root').innerHTML='<div class="loading-state"><span class="spinner"></span>Preparando sua operação…</div>';
  try{
    state.config=await api('/config');
    if(await reloadData()===false)return;
    $('login-root').hidden=true;$('app-shell').hidden=false;
    navigate(location.hash.slice(1)||'dashboard',{replace:true,focus:false});
  }catch(error){
    showLogin();
    if(error.status!==401){$('login-error').hidden=false;$('login-error').textContent=error.message;}
  }
})();
