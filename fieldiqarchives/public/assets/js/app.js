'use strict';
let ZONAS=[], PESSOAS=[], LOCAIS=[], ELEVADORES=[], chamados=[], impHist=[];
let currentUser=null, currentPage='dashboard', activeTicketId=null, ncPassoAtual=1, demoMode=true;
let chartTend=null, chartTipo=null, importFile=null;
const el = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const OBRA_MAP={obra_nova:{label:'Obra Nova',cls:'pi'},mod_integral:{label:'Modificação Integral',cls:'pw'},mod_parcial:{label:'Modificação Parcial',cls:'pd'}};
const STATUS={aberto:'Aberto',em_andamento:'Em andamento',resolvido:'Resolvido',cancelado:'Cancelado'};
const PRIORIDADE={baixa:'Baixa',media:'Média',alta:'Alta',critica:'Crítica'};
const isSupervisor=()=>currentUser?.role==='supervisor';
const canEdit=c=>isSupervisor()?c.zona_id===currentUser.zona_id:c.tecnico===currentUser.matricula&&c.status!=='cancelado';
const zonaInfo=id=>ZONAS.find(z=>z.id===id);
const zonaLabel=id=>{const z=zonaInfo(id);return z?z.nome+' — '+z.local:'Sem zona';};
const pessoaPorMatricula=mat=>PESSOAS.find(p=>p.matricula===mat);
const nomeMatTexto=mat=>{const p=pessoaPorMatricula(mat);return p?p.nome+' ('+p.matricula+')':'A definir';};
const equipeDoSupervisor=()=>PESSOAS.filter(p=>p.role==='tecnico'&&p.zona_id===currentUser.zona_id);
const fData=value=>value?new Date(value).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—';
const fTempo=n=>n==null?'—':n<60?n+' min':Math.floor(n/60)+'h'+(n%60?' '+n%60+'min':'');
const fBytes=n=>n<1024?n+' B':Math.round(n/1024)+' KB';
const iniciais=n=>String(n).split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
const minutosResolucao=c=>c.tempo_resolucao_min;
const pill=(value,labels,colors={})=>'<span class="pl '+(colors[value]||'pg')+'">'+esc(labels[value]||value)+'</span>';
const statPill=s=>pill(s,STATUS,{aberto:'pi',em_andamento:'pw',resolvido:'ps2',cancelado:'pg'});
const prioPill=p=>pill(p,PRIORIDADE,{media:'pi',alta:'pw',critica:'pd'});
const obraPill=t=>pill(t,Object.fromEntries(Object.entries(OBRA_MAP).map(([k,v])=>[k,v.label])),{obra_nova:'pi',mod_integral:'pw',mod_parcial:'pd'});
const slaPill=c=>c.sla_cumprido===true?'<span class="pl ps2">Cumprido</span>':c.sla_cumprido===false||c.sla_vencido?'<span class="pl pd">Fora do prazo</span>':c.status==='cancelado'?'—':'<span class="pl pi">Em prazo</span>';
function toast(message){el('toast').textContent=message;el('toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el('toast').classList.remove('show'),5000);}
async function run(action){try{return await action();}catch(error){toast(error.message);}}
async function busy(button,action){if(button?.disabled)return;const label=button?.textContent;if(button){button.disabled=true;button.textContent='Salvando...';}try{return await action();}finally{if(button){button.disabled=false;button.textContent=label;}}}
async function api(route,{method='GET',body}={}){
  const response=await fetch('/api'+route,{method,headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
  const data=await response.json();
  if(!response.ok){if(response.status===401&&route!=='/auth/login')showLogin();throw new Error(data.error||'Não foi possível concluir.');}
  return data;
}
function showLogin(){currentUser=null;fecharModal();el('app-shell').classList.remove('show');el('login-wrap').style.display='flex';}
async function reloadData(){
  const data=await api('/bootstrap');
  currentUser=data.user;ZONAS=data.zonas;PESSOAS=data.pessoas;LOCAIS=data.locais;ELEVADORES=data.elevadores;chamados=data.chamados;impHist=data.importacoes;
  el('login-wrap').style.display='none';el('app-shell').classList.add('show');
  atualizarSidebarUser();aplicarPermissoesUI();
}
async function loginRapido(login){el('login-user').value=login;el('login-pass').value='tk2026';await fazerLogin();}
async function fazerLogin(){
  const button=el('login-submit');
  await run(()=>busy(button,async()=>{
    el('login-err').classList.remove('show');
    try{await api('/auth/login',{method:'POST',body:{login:el('login-user').value,senha:el('login-pass').value}});await reloadData();navTo('dashboard');}
    catch(error){el('login-err').textContent=error.message;el('login-err').classList.add('show');}
  }));
}
async function logout(){await run(async()=>{await api('/auth/logout',{method:'POST'});showLogin();el('login-pass').value='';});}
function setAvatarEl(node,person){node.replaceChildren();if(person.foto){const img=document.createElement('img');img.src=person.foto;img.alt='';node.append(img);}else node.textContent=iniciais(person.nome);}
function atualizarSidebarUser(){el('user-nome').textContent=currentUser.nome;el('user-perfil').textContent=(isSupervisor()?'Supervisor':'Técnico')+' · '+zonaLabel(currentUser.zona_id);setAvatarEl(el('user-avatar'),currentUser);}
function aplicarPermissoesUI(){for(const id of ['nav-novo','nav-imp','nav-banco','btn-novo-cham'])el(id).classList.toggle('hidden-role',!isSupervisor());}
function navTo(page){
  if(!currentUser)return;
  if(['novochamado','importacao','banco'].includes(page)&&!isSupervisor()){toast('Área exclusiva do supervisor.');return;}
  currentPage=page;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.ni').forEach(n=>n.classList.remove('active'));
  el('page-'+page).classList.add('active');
  const nav={dashboard:'dash',chamados:'cham',novochamado:'novo',importacao:'imp',tecnicos:'tec',elevadores:'elevadores',banco:'banco'}[page];
  if(nav)el('nav-'+nav).classList.add('active');
  if(page==='dashboard')renderDashboard();
  if(page==='chamados')filtrarChamados();
  if(page==='novochamado')prepararFormNovo();
  if(page==='tecnicos')renderTecnicos();
  if(page==='perfil')renderPerfil();
  if(page==='importacao')renderImpHist();
  if(page==='elevadores')renderElevadores();
  if(page==='banco')run(renderBanco);
  closeSidebar();window.scrollTo({top:0});
}
function toggleSidebar(){el('sidebar').classList.toggle('open');el('sb-overlay').classList.toggle('show');}
function closeSidebar(){el('sidebar').classList.remove('open');el('sb-overlay').classList.remove('show');}
async function atualizarDados(){await run(async()=>{await reloadData();navTo(currentPage);toast('Dados atualizados.');});}
function average(list){return list.length?Math.round(list.reduce((a,b)=>a+b,0)/list.length):null;}
function weekKey(iso){const d=new Date(iso);d.setUTCHours(0,0,0,0);d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return d.toISOString().slice(0,10);}
function renderDashboard(){
  const active=chamados.filter(c=>c.status!=='cancelado');
  const resolved=active.filter(c=>c.status==='resolvido');
  const open=active.filter(c=>c.status==='aberto');
  const pending=active.filter(c=>c.status==='em_andamento');
  const percent=active.length?Math.round(resolved.length/active.length*100):0;
  const sla=resolved.length?Math.round(resolved.filter(c=>c.sla_cumprido).length/resolved.length*100):0;
  el('dash-sub').textContent='Visão da '+(currentUser.regiao==='capital'?'Capital':'região Interior')+' · '+(demoMode?'dados de demonstração persistidos':'dados atualizados do banco');
  const kpi=(name,value,detail)=>'<div class="kc"><div class="kl">'+name+'</div><div class="kv">'+value+'</div><div class="kd">'+detail+'</div></div>';
  el('kpi-g').innerHTML=kpi('Chamados abertos',open.length,pending.length+' em andamento')+kpi('Taxa de resolução',percent+'%',resolved.length+' de '+active.length+' chamados ativos')+kpi('SLA cumprido',resolved.length?sla+'%':'—',active.filter(c=>c.sla_vencido).length+' pendentes fora do prazo')+kpi('Tempo médio',fTempo(average(resolved.map(minutosResolucao))),resolved.length+' chamados resolvidos');
  const weeks=new Map();
  for(const c of active){const k=weekKey(c.aberto_em);if(!weeks.has(k))weeks.set(k,{total:0,resol:0});weeks.get(k).total++;if(c.status==='resolvido')weeks.get(k).resol++;}
  const ordered=[...weeks].sort(([a],[b])=>a.localeCompare(b));
  if(typeof Chart!=='undefined'){
    chartTend?.destroy();
    chartTend=new Chart(el('ch-tend'),{type:'bar',data:{labels:ordered.map(([k])=>k.slice(8)+'/'+k.slice(5,7)+'/'+k.slice(0,4)),datasets:[{label:'Abertos na semana',data:ordered.map(([,v])=>v.total),backgroundColor:'#d8dce6',borderRadius:4},{label:'Já resolvidos',data:ordered.map(([,v])=>v.resol),backgroundColor:'#ff5f00',borderRadius:4}]},options:{animation:false,responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{font:{size:12}}}},scales:{y:{beginAtZero:true,ticks:{stepSize:1}}}}});
    const keys=Object.keys(OBRA_MAP), colors=['#1d6fe0','#f1b300','#e02424'];
    chartTipo?.destroy();chartTipo=new Chart(el('ch-tipo'),{type:'doughnut',data:{labels:keys.map(k=>OBRA_MAP[k].label),datasets:[{data:keys.map(k=>active.filter(c=>c.tipo_obra===k).length),backgroundColor:colors,borderWidth:0}]},options:{animation:false,responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},cutout:'68%'}});
    el('leg-tipos').innerHTML=keys.map((k,i)=>'<span class="cli"><span class="cld" style="background:'+colors[i]+'"></span>'+esc(OBRA_MAP[k].label)+'</span>').join('');
  }
  el('tb-reg').innerHTML='<div class="table-responsive"><table class="ft"><thead><tr><th>Zona</th><th>Total</th><th>Resolvidos</th><th>SLA cumprido</th></tr></thead><tbody>'+ZONAS.map(z=>{const list=active.filter(c=>c.zona_id===z.id);return '<tr><td>'+esc(zonaLabel(z.id))+'</td><td>'+list.length+'</td><td>'+list.filter(c=>c.status==='resolvido').length+'</td><td>'+list.filter(c=>c.sla_cumprido===true).length+'</td></tr>';}).join('')+'</tbody></table></div>';
  el('rank-box').style.display=isSupervisor()?'':'none';
  if(isSupervisor()){
    const rank=PESSOAS.filter(p=>p.role==='tecnico').map(p=>{const list=active.filter(c=>c.tecnico===p.matricula);return {...p,total:list.length,rate:list.length?Math.round(list.filter(c=>c.status==='resolvido').length/list.length*100):0};}).sort((a,b)=>b.rate-a.rate||b.total-a.total);
    el('rank').innerHTML=rank.map((p,i)=>'<div class="ri"><div class="rp">'+(i+1)+'</div><div style="flex:1"><div class="rnm">'+esc(p.nome)+'</div><div class="rmt">'+p.total+' chamados · '+esc(zonaLabel(p.zona_id))+'</div></div><strong>'+p.rate+'%</strong></div>').join('');
  }
}
function renderChamados(list=chamados){
  el('cham-total').textContent=list.length+' chamado(s) na sua região';
  el('tb-cham').innerHTML=list.length?list.map(c=>'<tr class="clickable" onclick="abrirChamado('+c.id+')"><td>#'+c.id+'</td><td><strong>'+esc(c.titulo)+'</strong><div class="fhint">'+esc(c.elevador_codigo)+' · '+esc(c.local_nome)+'</div></td><td>'+obraPill(c.tipo_obra)+'</td><td>'+esc(zonaLabel(c.zona_id))+'</td><td>'+prioPill(c.prioridade)+'</td><td>'+statPill(c.status)+'</td><td>'+esc(nomeMatTexto(c.tecnico))+'</td><td>'+fData(c.aberto_em)+'</td><td>'+slaPill(c)+'</td><td><button class="btn-g btn-sm" onclick="event.stopPropagation();abrirChamado('+c.id+')">Ver</button></td></tr>').join(''):'<tr><td colspan="10" class="empty-state">Nenhum chamado encontrado.</td></tr>';
}
function filtrarChamados(){const q=el('f-busca').value.toLowerCase();renderChamados(chamados.filter(c=>(!q||[c.titulo,c.descricao,c.elevador_codigo,c.local_nome].some(v=>String(v).toLowerCase().includes(q)))&&(!el('f-status').value||c.status===el('f-status').value)&&(!el('f-obra').value||c.tipo_obra===el('f-obra').value)));}
function fecharModal(){el('modal-ov').classList.remove('open');activeTicketId=null;}
function selectOptions(labels,current){return Object.entries(labels).map(([v,label])=>'<option value="'+esc(v)+'"'+(v===current?' selected':'')+'>'+esc(label)+'</option>').join('');}
function abrirChamado(id){
  const c=chamados.find(x=>x.id===id);if(!c)return;
  activeTicketId=id;el('modal-t').textContent='#'+c.id+' — '+c.titulo;
  const editable=canEdit(c);
  const field=(name,value)=>'<div><span class="fhint">'+name+'</span><div>'+value+'</div></div>';
  let edit='';
  if(editable){
    const statusOptions=isSupervisor()?STATUS:c.status==='resolvido'?{resolvido:STATUS.resolvido}:{aberto:STATUS.aberto,em_andamento:STATUS.em_andamento,resolvido:STATUS.resolvido};
    edit='<div class="rcard" style="margin-top:1rem"><h3 class="ct">Atendimento</h3><div class="fg"><label class="flabel" for="ed-desc">Descrição</label><textarea class="fi" id="ed-desc" rows="3">'+esc(c.descricao)+'</textarea></div><div class="frow"><div class="fg"><label class="flabel" for="ed-status">Status</label><select class="fi" id="ed-status">'+selectOptions(statusOptions,c.status)+'</select></div>';
    if(isSupervisor())edit+='<div class="fg"><label class="flabel" for="ed-tec">Técnico responsável</label><select class="fi" id="ed-tec"><option value="">A definir</option>'+equipeDoSupervisor().map(p=>'<option value="'+esc(p.matricula)+'"'+(c.tecnico===p.matricula?' selected':'')+'>'+esc(p.nome)+'</option>').join('')+'</select></div>';
    edit+='</div>';
    if(isSupervisor())edit+='<div class="frow"><div class="fg"><label class="flabel" for="ed-obra">Classificação</label><select class="fi" id="ed-obra">'+selectOptions(Object.fromEntries(Object.entries(OBRA_MAP).map(([k,v])=>[k,v.label])),c.tipo_obra)+'</select></div><div class="fg"><label class="flabel" for="ed-prio">Prioridade</label><select class="fi" id="ed-prio">'+selectOptions(PRIORIDADE,c.prioridade)+'</select></div></div><div class="fg"><label class="flabel" for="ed-sla">SLA (horas)</label><input class="fi" type="number" min="1" max="8760" id="ed-sla" value="'+c.sla_horas+'"></div>';
    edit+='<div class="fg"><label class="flabel" for="ed-solucao">Solução aplicada</label><textarea class="fi" id="ed-solucao" rows="3" placeholder="Registre o diagnóstico e a solução efetivamente aplicada.">'+esc(c.solucao)+'</textarea><span class="fhint">Obrigatória para encerrar. O registro alimenta o histórico do equipamento.</span></div><button class="btn-p" onclick="salvarEdicaoChamado('+c.id+',this)">Salvar atendimento</button></div>';
  }
  el('modal-b').innerHTML='<div class="detail-grid">'+field('Elevador',esc(c.elevador_codigo)+' · '+esc(c.elevador_modelo))+field('Local',esc(c.local_nome)+' · '+esc(c.bairro))+field('Zona',esc(zonaLabel(c.zona_id)))+field('Classificação',obraPill(c.tipo_obra))+field('Prioridade',prioPill(c.prioridade))+field('Status',statPill(c.status))+field('Responsável',esc(nomeMatTexto(c.tecnico)))+field('Prazo de SLA',c.sla_horas+' horas · '+slaPill(c))+field('Abertura',fData(c.aberto_em))+field('Resolução',fData(c.resolvido_em))+'</div><div class="readable-text"><strong>Descrição</strong><p>'+esc(c.descricao||'Sem descrição.')+'</p>'+(c.solucao?'<strong>Solução registrada</strong><p>'+esc(c.solucao)+'</p>':'')+'</div><div id="ai-box" class="ai-panel" aria-live="polite">Analisando o histórico do elevador…</div>'+edit+'<h3 class="ct" style="margin-top:1.5rem">Histórico de alterações</h3><div class="hist-list">'+c.historico.slice().reverse().map(h=>'<div class="hist-item"><div class="hist-dot"></div><div class="hist-txt"><strong>'+esc(h.usuario)+'</strong> — '+esc(h.alteracao)+'<div class="hist-meta">'+fData(h.data)+'</div></div></div>').join('')+'</div>';
  el('modal-ov').classList.add('open');
  run(async()=>{try{const result=await api('/chamados/'+c.id+'/sugestao',{method:'POST'});if(activeTicketId===c.id)renderSugestao(result,c);}catch(error){if(activeTicketId===c.id)el('ai-box').textContent='Não foi possível consultar o histórico: '+error.message;}});
}
async function salvarEdicaoChamado(id,button){await run(()=>busy(button,async()=>{const c=chamados.find(x=>x.id===id);const body={revisao:c.revisao,descricao:el('ed-desc').value,status:el('ed-status').value,solucao:el('ed-solucao').value};if(isSupervisor())Object.assign(body,{tipo_obra:el('ed-obra').value,prioridade:el('ed-prio').value,tecnico:el('ed-tec').value||null,sla_horas:Number(el('ed-sla').value)});await api('/chamados/'+id,{method:'PATCH',body});await reloadData();fecharModal();navTo(currentPage);toast('Atendimento salvo no banco de dados.');}));}
function renderSugestao(s,c){
  const refs=new Set(s.evidencias_ids);
  el('ai-box').innerHTML='<div class="ai-header"><strong>Assistente de diagnóstico</strong><span class="pl pi">'+(s.provedor==='openai'?'Síntese por IA':'Análise local · TF-IDF')+'</span></div><p><strong>'+esc(s.resumo)+'</strong></p><p>'+esc(s.hipotese)+'</p>'+(s.intervalo_medio_dias!=null?'<p class="fhint">Intervalo médio entre ocorrências anteriores: '+s.intervalo_medio_dias+' dias.</p>':'')+'<p>'+esc(s.sugestao)+'</p>'+(s.evidencias.length?'<details><summary>Ver atendimentos que fundamentam a análise</summary><div class="evidence-list">'+s.evidencias.filter(e=>refs.has(e.id)).map(e=>'<div class="evidence"><button class="btn-g btn-sm" onclick="abrirChamado('+e.id+')">Ver chamado #'+e.id+'</button> <span class="pl '+(e.mesmo_elevador?'ps2':'pg')+'">'+(e.mesmo_elevador?'Mesmo elevador':esc(e.elevador_codigo))+'</span><p>'+esc(e.solucao)+'</p><span class="fhint">Resolvido em '+fData(e.resolvido_em)+'</span></div>') .join('')+'</div></details>':'')+'<p class="fhint">'+esc(s.limites)+'</p>'+(s.aviso?'<p class="a-block">'+esc(s.aviso)+'</p>':'')+(canEdit(c)?'<div class="ai-feedback">Esta análise ajudou? <button class="btn-g btn-sm" onclick="avaliarSugestao('+s.id+',true,this)">Sim</button> <button class="btn-g btn-sm" onclick="avaliarSugestao('+s.id+',false,this)">Não</button></div>':'');
}
async function avaliarSugestao(id,util,button){await run(()=>busy(button,async()=>{await api('/sugestoes/'+id+'/avaliacao',{method:'POST',body:{util}});toast('Avaliação registrada.');}));}
function prepararFormNovo(){
  ncPassoAtual=1;ncRenderPasso(1);
  el('nc-zona').value=zonaLabel(currentUser.zona_id);
  el('nc-elevador').innerHTML='<option value="">Selecione o equipamento</option>'+ELEVADORES.filter(e=>e.ativo&&e.zona_id===currentUser.zona_id).map(e=>'<option value="'+e.id+'">'+esc(e.codigo)+' · '+esc(e.local_nome)+'</option>').join('');
  el('nc-tec').innerHTML='<option value="">A definir</option>'+equipeDoSupervisor().map(p=>'<option value="'+esc(p.matricula)+'">'+esc(p.nome)+'</option>').join('');
  el('nc-titulo').value='';el('nc-desc').value='';el('nc-sla').value=24;el('nc-alerta').replaceChildren();
}
function ncRenderPasso(p){for(let i=1;i<=3;i++){el('fs'+i).classList.toggle('hidden',i!==p);el('sd'+i).classList.toggle('active',i===p);el('sd'+i).classList.toggle('done',i<p);}ncPassoAtual=p;}
function ncPasso(p){if(p>1&&(!el('nc-titulo').value.trim()||!el('nc-elevador').value||!el('nc-sla').checkValidity())){toast('Preencha título, elevador e um SLA válido.');return;}if(p===3)ncMontaResumo();ncRenderPasso(p);}
function ncMontaResumo(){
  const e=ELEVADORES.find(e=>e.id===Number(el('nc-elevador').value));
  const past=chamados.filter(c=>c.elevador_id===e.id);
  el('nc-resumo').innerHTML='<p><strong>'+esc(el('nc-titulo').value)+'</strong></p><p>'+esc(e.codigo)+' · '+esc(e.local_nome)+'</p><p>Responsável: '+esc(nomeMatTexto(el('nc-tec').value))+'</p><p>SLA: '+Number(el('nc-sla').value)+' horas</p>';
  el('nc-alerta').innerHTML=past.length?'<div class="a-rec">'+past.length+' atendimento(s) no histórico deste elevador. O assistente analisará sintomas semelhantes após a abertura.</div>':'';
}
async function abrirChamado_novo(){await run(()=>busy(el('btn-abrir'),async()=>{const body={titulo:el('nc-titulo').value,descricao:el('nc-desc').value,elevador_id:Number(el('nc-elevador').value),tipo_obra:el('nc-tipo').value,prioridade:el('nc-prio').value,sla_horas:Number(el('nc-sla').value),tecnico:el('nc-tec').value||null};const result=await api('/chamados',{method:'POST',body});await reloadData();navTo('chamados');abrirChamado(result.id);toast('Chamado criado e salvo.');}));}
function renderTecnicos(){
  const team=equipeDoSupervisor();
  el('tec-sub').textContent='Colaboradores da sua região';
  el('team-box-wrap').innerHTML=isSupervisor()?'<div class="team-box"><h3 class="ct">Minha equipe · '+esc(zonaLabel(currentUser.zona_id))+'</h3>'+team.map(p=>'<div class="team-row"><div style="flex:1">'+esc(p.nome)+' <span class="mat">'+esc(p.matricula)+'</span></div><button class="btn-g btn-sm" onclick="removerDaEquipe('+esc(JSON.stringify(p.matricula))+')">Remover</button></div>').join('')+'<div class="team-add"><input class="fi" id="team-mat-input" aria-label="Matrícula do técnico" placeholder="Matrícula de um técnico"><button class="btn-p" onclick="adicionarNaEquipe()">Adicionar</button></div><p class="fhint">Reatribua atendimentos pendentes antes de transferir um técnico.</p></div>':'';
  el('tb-tec').innerHTML='<div class="table-responsive"><table class="ft"><thead><tr><th>Técnico</th><th>Cargo</th><th>Zona</th><th>Chamados</th><th>Tempo médio</th><th>Resolução</th></tr></thead><tbody>'+PESSOAS.filter(p=>p.role==='tecnico').map(p=>{const list=chamados.filter(c=>c.tecnico===p.matricula&&c.status!=='cancelado'),solved=list.filter(c=>c.status==='resolvido');return '<tr><td>'+esc(p.nome)+'<div class="mat">'+esc(p.matricula)+'</div></td><td>'+esc(p.cargo)+'</td><td>'+esc(zonaLabel(p.zona_id))+'</td><td>'+list.length+'</td><td>'+fTempo(average(solved.map(minutosResolucao)))+'</td><td>'+(list.length?Math.round(solved.length/list.length*100)+'%':'—')+'</td></tr>';}).join('')+'</tbody></table></div>';
}
async function adicionarNaEquipe(){await run(async()=>{await api('/equipe',{method:'POST',body:{matricula:el('team-mat-input').value}});await reloadData();renderTecnicos();toast('Equipe atualizada.');});}
async function removerDaEquipe(matricula){await run(async()=>{await api('/equipe',{method:'POST',body:{matricula,remover:true}});await reloadData();renderTecnicos();toast('Vínculo removido.');});}
function renderPerfil(){
  const u=currentUser;setAvatarEl(el('profile-av'),u);
  for(const [id,value] of Object.entries({'profile-nome':u.nome,'profile-mat':'Matrícula: '+u.matricula,'profile-cargo':u.cargo,'profile-zona':zonaLabel(u.zona_id),'profile-regiao':u.regiao==='capital'?'Capital — RJ':'Interior — RJ','profile-role':isSupervisor()?'Supervisor':'Técnico'}))el(id).textContent=value;
  el('profile-badges').innerHTML='<span class="pl pi">'+esc(zonaLabel(u.zona_id))+'</span>';
  const own=chamados.filter(c=>c.tecnico===u.matricula&&c.status!=='cancelado');
  el('profile-chamados').textContent=own.length;el('profile-taxa').textContent=own.length?Math.round(own.filter(c=>c.status==='resolvido').length/own.length*100)+'%':'—';
}
async function trocarFoto(input){await run(async()=>{const file=input.files[0];if(!file)return;if(file.size>1400000||!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Use PNG, JPEG ou WebP de até 1,4 MB.');const foto=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});await api('/perfil',{method:'PATCH',body:{foto}});await reloadData();renderPerfil();toast('Foto salva.');});}
function renderElevadores(){
  el('lift-list').innerHTML='<div class="table-responsive"><table class="ft"><thead><tr><th>Código</th><th>Local</th><th>Modelo / série</th><th>Zona</th><th>Histórico</th></tr></thead><tbody>'+ELEVADORES.map(e=>'<tr><td><strong>'+esc(e.codigo)+'</strong><div class="fhint">'+e.capacidade_kg+' kg</div></td><td>'+esc(e.local_nome)+'</td><td>'+esc(e.modelo)+'<div class="fhint">'+esc(e.numero_serie)+'</div></td><td>'+esc(zonaLabel(e.zona_id))+'</td><td>'+chamados.filter(c=>c.elevador_id===e.id).length+' chamados</td></tr>').join('')+'</tbody></table></div>';
  el('asset-forms').classList.toggle('hidden-role',!isSupervisor());
  el('lift-local').innerHTML=LOCAIS.filter(l=>l.zona_id===currentUser.zona_id).map(l=>'<option value="'+l.id+'">'+esc(l.nome)+'</option>').join('');
}
async function salvarLocal(event){event.preventDefault();await run(()=>busy(event.submitter,async()=>{await api('/locais',{method:'POST',body:{nome:el('local-nome').value,endereco:el('local-endereco').value,bairro:el('local-bairro').value}});event.target.reset();await reloadData();renderElevadores();toast('Local cadastrado.');}));}
async function salvarElevador(event){event.preventDefault();await run(()=>busy(event.submitter,async()=>{await api('/elevadores',{method:'POST',body:{codigo:el('lift-codigo').value,local_id:Number(el('lift-local').value),fabricante:el('lift-fabricante').value,modelo:el('lift-modelo').value,numero_serie:el('lift-serie').value,capacidade_kg:Number(el('lift-capacidade').value)}});event.target.reset();await reloadData();renderElevadores();toast('Elevador cadastrado.');}));}
function impSel(input){if(input.files[0])impPreview(input.files[0]);}
function impDrop(event){event.preventDefault();el('uz').classList.remove('dv');if(event.dataTransfer.files[0])impPreview(event.dataTransfer.files[0]);}
function impPreview(file){if(file.size>2000000){toast('O arquivo deve ter até 2 MB.');return;}importFile=file;el('f-nome').textContent=file.name;el('f-tam').textContent=fBytes(file.size);el('f-ico').textContent=file.name.split('.').pop().toUpperCase();el('uz').style.display='none';el('f-prev').style.display='block';}
function impRem(){importFile=null;el('f-inp').value='';el('uz').style.display='';el('f-prev').style.display='none';}
function parseCSV(input){
  const text=input.replace(/^\uFEFF/,'');
  const first=text.split(/\r?\n/)[0];
  const delimiter=[',',';','\t','|'].sort((a,b)=>first.split(b).length-first.split(a).length)[0];
  const rows=[];let row=[],value='',quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}
    else if(c===delimiter&&!quoted){row.push(value);value='';}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(value);if(row.some(x=>x.trim()))rows.push(row);row=[];value='';}
    else value+=c;
  }
  if(quoted)throw new Error('CSV com aspas não fechadas.');
  row.push(value);if(row.some(x=>x.trim()))rows.push(row);
  const header=rows.shift();if(!header||!rows.length)throw new Error('Arquivo sem linhas de dados.');
  return rows.map(r=>Object.fromEntries(header.map((h,i)=>[h.trim(),r[i]??''])));
}
const normalized=s=>String(s??'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,'_');
function normalizarLinha(raw){
  const aliases={titulo:['titulo','title','assunto','chamado'],descricao:['descricao','description','detalhe'],tipo_obra:['tipo_obra','classificacao','tipo'],prioridade:['prioridade','priority'],status:['status','situacao'],elevador_codigo:['elevador_codigo','elevador','equipamento','codigo_elevador'],aberto_em:['aberto_em','abertura'],resolvido_em:['resolvido_em','resolucao'],solucao:['solucao','solucao_aplicada'],tecnico:['tecnico','matricula'],sla_horas:['sla_horas','sla']};
  const result={};
  for(const [key,value] of Object.entries(raw)){for(const [field,names] of Object.entries(aliases)){if(names.includes(normalized(key))&&value!=null){result[field]=String(value).trim();break;}}}
  for(const field of ['tipo_obra','prioridade','status'])if(result[field])result[field]=normalized(result[field]);
  const works={obra_nova:'obra_nova',modificacao_integral:'mod_integral',mod_integral:'mod_integral',modificacao_parcial:'mod_parcial',mod_parcial:'mod_parcial'};
  if(result.tipo_obra)result.tipo_obra=works[result.tipo_obra]||result.tipo_obra;
  return result;
}
async function impExec(){await run(()=>busy(el('import-submit'),async()=>{
  if(!importFile)throw new Error('Selecione um arquivo.');
  const ext=importFile.name.split('.').pop().toLowerCase();let rows;
  if(ext==='json'){const parsed=JSON.parse(await importFile.text());rows=Array.isArray(parsed)?parsed:[parsed];}
  else if(['csv','txt'].includes(ext))rows=parseCSV(await importFile.text());
  else if(['xlsx','xls'].includes(ext)){if(typeof XLSX==='undefined')throw new Error('Leitor Excel indisponível. Use CSV ou JSON.');const book=XLSX.read(await importFile.arrayBuffer(),{type:'array',cellDates:true});rows=XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]]);}
  else throw new Error('Formato não suportado.');
  const result=await api('/importacoes',{method:'POST',body:{nome:importFile.name,formato:ext,linhas:rows.map(normalizarLinha)}});
  await reloadData();renderImpHist();el('imp-res').style.display='block';el('imp-res').innerHTML='<div class="a-rec">'+result.importadas+' importados · '+result.erros+' ignorados.</div>'+result.detalhes.map(d=>'<p class="fhint">Linha '+d.linha+': '+esc(d.erro)+'</p>').join('');impRem();toast('Importação concluída.');
}));}
function renderImpHist(){el('imp-hist').innerHTML=impHist.length?'<div class="table-responsive"><table class="ft"><thead><tr><th>Arquivo</th><th>Formato</th><th>Importados</th><th>Erros/duplicados</th><th>Data</th></tr></thead><tbody>'+impHist.map(i=>'<tr><td>'+esc(i.nome)+'</td><td>'+esc(i.formato)+'</td><td>'+i.importadas+'</td><td>'+i.erros+'</td><td>'+fData(i.data)+'</td></tr>').join('')+'</tbody></table></div>':'<p class="empty-state">Nenhuma importação registrada.</p>';}
async function renderBanco(){
  el('db-summary').textContent='Consultando o banco…';
  const info=await api('/banco');
  el('db-summary').textContent=info.engine+' · '+info.version;
  el('db-schema').textContent=info.schema;
  el('db-tables').innerHTML=info.tabelas.map(t=>'<button class="db-table" onclick="selecionarTabela(\''+t.nome+'\')"><strong>'+esc(t.nome)+'</strong><span>'+t.total+' registro(s)</span></button>').join('');
  await selecionarTabela('chamados');
}
async function selecionarTabela(name){await run(async()=>{
  const result=await api('/banco/'+name);
  el('db-table-title').textContent=result.tabela+' · até 100 registros da sua região';
  el('db-columns').textContent=result.colunas.map(c=>c.column_name+' · '+c.data_type+(c.is_nullable==='NO'?' · obrigatório':'')).join('\n');
  const columns=result.linhas.length?Object.keys(result.linhas[0]):result.colunas.map(c=>c.column_name);
  el('db-rows').innerHTML=result.linhas.length?'<table class="ft"><thead><tr>'+columns.map(k=>'<th>'+esc(k)+'</th>').join('')+'</tr></thead><tbody>'+result.linhas.map(row=>'<tr>'+columns.map(k=>'<td class="db-cell">'+esc(row[k]==null?'NULL':typeof row[k]==='object'?JSON.stringify(row[k]):row[k])+'</td>').join('')+'</tr>').join('')+'</tbody></table>':'<p class="empty-state">Tabela sem registros.</p>';
});}
(async()=>{
  try{const config=await api('/config');demoMode=config.demo;el('demo-access').style.display=config.quickDemo?'':'none';el('demo-password').style.display=config.quickDemo?'':'none';await reloadData();navTo('dashboard');}
  catch(error){showLogin();if(error.name==='TypeError')el('login-err').textContent='Não foi possível conectar ao servidor. Execute npm start.';}
})();
