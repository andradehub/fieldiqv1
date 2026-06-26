// ============================================================
//  ZONAS
// ============================================================
const ZONAS = [
  {id:'cap-01', regiao:'capital',  nome:'Zona 01', local:'Centro'},
  {id:'cap-02', regiao:'capital',  nome:'Zona 02', local:'Zona Sul (Copacabana)'},
  {id:'cap-03', regiao:'capital',  nome:'Zona 03', local:'Tijuca'},
  {id:'cap-04', regiao:'capital',  nome:'Zona 04', local:'Barra da Tijuca'},
  {id:'cap-05', regiao:'capital',  nome:'Zona 05', local:'Botafogo'},
  {id:'int-01', regiao:'interior', nome:'Zona 01', local:'Niterói'},
  {id:'int-02', regiao:'interior', nome:'Zona 02', local:'Petrópolis'},
  {id:'int-03', regiao:'interior', nome:'Zona 03', local:'Volta Redonda'},
  {id:'int-04', regiao:'interior', nome:'Zona 04', local:'Campos dos Goytacazes'},
  {id:'int-05', regiao:'interior', nome:'Zona 05', local:'Cabo Frio'},
];
function zonaInfo(id){ return ZONAS.find(z=>z.id===id) || null; }
function zonaLabel(id){ const z=zonaInfo(id); return z ? `${z.nome} — ${z.local}` : '—'; }
function regiaoDeZona(id){ const z=zonaInfo(id); return z ? z.regiao : null; }

// Tempo de resolução é SEMPRE calculado a partir das datas reais (nunca de um valor fixo armazenado)
function minutosResolucao(c){
  if(!c.aberto_em || !c.resolvido_em) return null;
  return Math.round((new Date(c.resolvido_em) - new Date(c.aberto_em)) / 60000);
}

const CARGOS = ['Oficial de Manutenção I','Oficial de Manutenção II','Técnico de Serviços (Júnior)','Técnico de Serviços Pleno','Técnico de Serviços Sênior','Líder Técnico / Especialista','Supervisor de Operações de Zona'];

// ============================================================
//  PESSOAS (técnicos + supervisores)
// ============================================================
let PESSOAS = [
  {matricula:'TK-CAP-001', nome:'Carlos Mendes',   role:'tecnico',    cargo:'Técnico de Serviços Sênior',        zona_id:'cap-05', foto:null},
  {matricula:'TK-CAP-002', nome:'Ana Ferreira',    role:'tecnico',    cargo:'Técnico de Serviços Pleno',         zona_id:'cap-05', foto:null},
  {matricula:'TK-CAP-003', nome:'Bruno Tavares',   role:'tecnico',    cargo:'Oficial de Manutenção II',          zona_id:'cap-05', foto:null},
  {matricula:'TK-CAP-004', nome:'Patrícia Souza',  role:'tecnico',    cargo:'Técnico de Serviços (Júnior)',      zona_id:'cap-05', foto:null},
  {matricula:'TK-CAP-SUP-01', nome:'Fernanda Lopes', role:'supervisor', cargo:'Supervisor de Operações de Zona', zona_id:'cap-05', foto:null},

  {matricula:'TK-INT-001', nome:'Roberto Silva',   role:'tecnico',    cargo:'Técnico de Serviços Sênior',        zona_id:'int-01', foto:null},
  {matricula:'TK-INT-002', nome:'Juliana Costa',   role:'tecnico',    cargo:'Líder Técnico / Especialista',      zona_id:'int-01', foto:null},
  {matricula:'TK-INT-003', nome:'Marcos Oliveira', role:'tecnico',    cargo:'Oficial de Manutenção I',           zona_id:'int-01', foto:null},
  {matricula:'TK-INT-SUP-01', nome:'Marcelo Andrade', role:'supervisor', cargo:'Supervisor de Operações de Zona', zona_id:'int-01', foto:null},
];
function pessoaPorMatricula(m){ return PESSOAS.find(p=>p.matricula===m) || null; }
function nomeMat(m){ const p=pessoaPorMatricula(m); return p ? `${p.nome} <span class="mat">(${p.matricula})</span>` : '<span style="color:var(--t3)">A definir</span>'; }

// ============================================================
//  USUÁRIOS (login pré-definido)
// ============================================================
const USUARIOS = [
  {login:'tecnico.capital',     senha:'tk2026', matricula:'TK-CAP-001'},
  {login:'tecnico.interior',    senha:'tk2026', matricula:'TK-INT-001'},
  {login:'supervisor.capital',  senha:'tk2026', matricula:'TK-CAP-SUP-01'},
  {login:'supervisor.interior', senha:'tk2026', matricula:'TK-INT-SUP-01'},
];
let currentUser = null; // = pessoa resolvida (com .role, .zona_id, .matricula...)

// ============================================================
//  CHAMADOS — exclusivamente elevadores
// ============================================================
let chamados = [
  {id:1, titulo:'Instalação de elevador — Edifício Atlântico',        tipo_obra:'obra_nova',   zona_id:'cap-05', prioridade:'alta',    status:'resolvido',    tecnico:'TK-CAP-001', aberto_em:'2025-03-01T08:00', resolvido_em:'2025-03-10T10:30', sla_cumprido:1, tempo_resolucao_min:13110, descricao:'Instalação completa de elevador novo — Ed. Atlântico, Torre A.', solucao:'Obra concluída e equipamento aprovado.', historico:[
    {usuario:'Sistema', matricula:'-', alteracao:'Chamado criado', data:'2025-03-01T08:00'},
    {usuario:'Carlos Mendes', matricula:'TK-CAP-001', alteracao:'Status alterado para Resolvido', data:'2025-03-10T10:30'}
  ]},
  {id:2, titulo:'Porta do elevador não fecha corretamente',           tipo_obra:'mod_parcial', zona_id:'cap-05', prioridade:'alta',    status:'resolvido',    tecnico:'TK-CAP-002', aberto_em:'2025-03-15T09:00', resolvido_em:'2025-03-15T11:00', sla_cumprido:1, tempo_resolucao_min:120, descricao:'Porta travando ao fechar — substituição do sensor.', solucao:'Substituição do sensor modelo X200 por X300.', historico:[
    {usuario:'Sistema', matricula:'-', alteracao:'Chamado criado', data:'2025-03-15T09:00'},
    {usuario:'Ana Ferreira', matricula:'TK-CAP-002', alteracao:'Status alterado para Resolvido', data:'2025-03-15T11:00'}
  ]},
  {id:3, titulo:'Modernização integral do quadro de comando',         tipo_obra:'mod_integral',zona_id:'cap-05', prioridade:'media',   status:'em_andamento', tecnico:'TK-CAP-001', aberto_em:'2025-03-18T09:00', resolvido_em:null, sla_cumprido:null, tempo_resolucao_min:null, descricao:'Troca integral do quadro de comando e cabos de tração do elevador.', solucao:null, historico:[
    {usuario:'Sistema', matricula:'-', alteracao:'Chamado criado', data:'2025-03-18T09:00'},
    {usuario:'Fernanda Lopes', matricula:'TK-CAP-SUP-01', alteracao:'Técnico designado: Carlos Mendes (TK-CAP-001)', data:'2025-03-18T09:10'}
  ]},
  {id:4, titulo:'Elevador apresentando ruído na cabine',               tipo_obra:'mod_parcial', zona_id:'cap-05', prioridade:'baixa',   status:'resolvido',    tecnico:'TK-CAP-003', aberto_em:'2025-03-10T08:00', resolvido_em:'2025-03-10T12:00', sla_cumprido:1, tempo_resolucao_min:240, descricao:'Barulho metálico durante a operação da cabine.', solucao:'Aperto dos parafusos do painel interno e cabos.', historico:[
    {usuario:'Sistema', matricula:'-', alteracao:'Chamado criado', data:'2025-03-10T08:00'},
    {usuario:'Bruno Tavares', matricula:'TK-CAP-003', alteracao:'Status alterado para Resolvido', data:'2025-03-10T12:00'}
  ]},
  {id:5, titulo:'Instalação de elevador social — Torre B',             tipo_obra:'obra_nova',   zona_id:'cap-05', prioridade:'critica', status:'em_andamento', tecnico:'TK-CAP-004', aberto_em:'2025-03-20T10:00', resolvido_em:null, sla_cumprido:null, tempo_resolucao_min:null, descricao:'Obra nova de elevador social — Torre B do condomínio.', solucao:null, historico:[
    {usuario:'Sistema', matricula:'-', alteracao:'Chamado criado', data:'2025-03-20T10:00'},
    {usuario:'Fernanda Lopes', matricula:'TK-CAP-SUP-01', alteracao:'Técnico designado: Patrícia Souza (TK-CAP-004)', data:'2025-03-20T10:15'}
  ]},
  {id:6, titulo:'Vazamento de óleo no sistema hidráulico do elevador', tipo_obra:'mod_parcial', zona_id:'cap-01', prioridade:'alta',    status:'aberto',       tecnico:null, aberto_em:'2025-03-22T07:30', resolvido_em:null, sla_cumprido:null, tempo_resolucao_min:null, descricao:'Mancha de óleo visível na base do pistão.', solucao:null, historico:[
    {usuario:'Sistema', matricula:'-', alteracao:'Chamado criado', data:'2025-03-22T07:30'}
  ]},
  {id:7, titulo:'Modernização integral do elevador panorâmico',        tipo_obra:'mod_integral',zona_id:'cap-03', prioridade:'media',   status:'aberto',       tecnico:null, aberto_em:'2025-03-21T08:00', resolvido_em:null, sla_cumprido:null, tempo_resolucao_min:null, descricao:'Substituição completa de máquina de tração e cabine panorâmica.', solucao:null, historico:[
    {usuario:'Sistema', matricula:'-', alteracao:'Chamado criado', data:'2025-03-21T08:00'}
  ]},

  {id:8, titulo:'Instalação de elevador — Edifício Comercial Niterói', tipo_obra:'obra_nova',   zona_id:'int-01', prioridade:'media',   status:'resolvido',    tecnico:'TK-INT-001', aberto_em:'2025-03-08T08:00', resolvido_em:'2025-03-20T14:00', sla_cumprido:1, tempo_resolucao_min:17640, descricao:'Obra nova — instalação completa, vistoria aprovada.', solucao:'Aprovado. Certificado emitido.', historico:[
    {usuario:'Sistema', matricula:'-', alteracao:'Chamado criado', data:'2025-03-08T08:00'},
    {usuario:'Roberto Silva', matricula:'TK-INT-001', alteracao:'Status alterado para Resolvido', data:'2025-03-20T14:00'}
  ]},
  {id:9, titulo:'Substituição parcial da botoeira do elevador',        tipo_obra:'mod_parcial', zona_id:'int-01', prioridade:'baixa',   status:'resolvido',    tecnico:'TK-INT-002', aberto_em:'2025-03-09T08:00', resolvido_em:'2025-03-09T11:00', sla_cumprido:1, tempo_resolucao_min:180, descricao:'Botoeira do térreo com defeito.', solucao:'Peça substituída e testada.', historico:[
    {usuario:'Sistema', matricula:'-', alteracao:'Chamado criado', data:'2025-03-09T08:00'},
    {usuario:'Juliana Costa', matricula:'TK-INT-002', alteracao:'Status alterado para Resolvido', data:'2025-03-09T11:00'}
  ]},
  {id:10,titulo:'Modernização integral da máquina de tração',         tipo_obra:'mod_integral',zona_id:'int-01', prioridade:'media',   status:'em_andamento', tecnico:'TK-INT-001', aberto_em:'2025-03-18T09:00', resolvido_em:null, sla_cumprido:null, tempo_resolucao_min:null, descricao:'Troca completa de máquina de tração do elevador.', solucao:null, historico:[
    {usuario:'Sistema', matricula:'-', alteracao:'Chamado criado', data:'2025-03-18T09:00'},
    {usuario:'Marcelo Andrade', matricula:'TK-INT-SUP-01', alteracao:'Técnico designado: Roberto Silva (TK-INT-001)', data:'2025-03-18T09:05'}
  ]},
  {id:11,titulo:'Elevador parado entre pavimentos',                    tipo_obra:'mod_parcial', zona_id:'int-01', prioridade:'critica', status:'resolvido',    tecnico:'TK-INT-003', aberto_em:'2025-03-12T16:00', resolvido_em:'2025-03-12T17:30', sla_cumprido:1, tempo_resolucao_min:90, descricao:'Cabine parou entre pavimentos com passageiro.', solucao:'Reset do sistema de controle e calibração de sensores.', historico:[
    {usuario:'Sistema', matricula:'-', alteracao:'Chamado criado', data:'2025-03-12T16:00'},
    {usuario:'Marcos Oliveira', matricula:'TK-INT-003', alteracao:'Status alterado para Resolvido', data:'2025-03-12T17:30'}
  ]},
  {id:12,titulo:'Instalação de elevador panorâmico — Hotel Petrópolis',tipo_obra:'obra_nova',   zona_id:'int-02', prioridade:'baixa',   status:'aberto',       tecnico:null, aberto_em:'2025-03-19T09:00', resolvido_em:null, sla_cumprido:null, tempo_resolucao_min:null, descricao:'Instalação de elevador panorâmico para o saguão do hotel.', solucao:null, historico:[
    {usuario:'Sistema', matricula:'-', alteracao:'Chamado criado', data:'2025-03-19T09:00'}
  ]},
  {id:13,titulo:'Modificação parcial do painel de comando do elevador',tipo_obra:'mod_parcial', zona_id:'int-04', prioridade:'media',   status:'aberto',       tecnico:null, aberto_em:'2025-03-21T08:00', resolvido_em:null, sla_cumprido:null, tempo_resolucao_min:null, descricao:'Painel de comando com botões intermitentes.', solucao:null, historico:[
    {usuario:'Sistema', matricula:'-', alteracao:'Chamado criado', data:'2025-03-21T08:00'}
  ]},
];
let nextChamadoId = 14;

let ncPassoAtual = 1;
let impHist = [];
let chartTend = null, chartTipo = null;
let parsedImportRows = null;

// ============================================================
//  LOGIN / LOGOUT
// ============================================================
function loginRapido(login){ document.getElementById('login-user').value=login; document.getElementById('login-pass').value='tk2026'; fazerLogin(); }

function fazerLogin(){
  const login = document.getElementById('login-user').value.trim().toLowerCase();
  const senha = document.getElementById('login-pass').value;
  const u = USUARIOS.find(x=>x.login===login && x.senha===senha);
  const errEl = document.getElementById('login-err');
  if(!u){ errEl.classList.add('show'); return; }
  errEl.classList.remove('show');

  const p = pessoaPorMatricula(u.matricula);
  currentUser = p; // {matricula, nome, role, cargo, zona_id, foto}

  document.getElementById('login-wrap').style.display='none';
  document.getElementById('app-shell').classList.add('show');

  atualizarSidebarUser();
  aplicarPermissoesUI();
  navTo('dashboard');
}

function logout(){
  currentUser=null;
  document.getElementById('app-shell').classList.remove('show');
  document.getElementById('login-wrap').style.display='flex';
  document.getElementById('login-user').value='';
  document.getElementById('login-pass').value='';
  document.getElementById('login-err').classList.remove('show');
}

function atualizarSidebarUser(){
  document.getElementById('user-nome').textContent = currentUser.nome;
  document.getElementById('user-perfil').textContent = (currentUser.role==='supervisor'?'Supervisor':'Técnico') + ' · ' + zonaLabel(currentUser.zona_id);
  setAvatarEl(document.getElementById('user-avatar'), currentUser);
}

function setAvatarEl(el, pessoa){
  if(pessoa.foto){ el.innerHTML = `<img src="${pessoa.foto}">`; }
  else { el.textContent = iniciais(pessoa.nome); el.innerHTML = iniciais(pessoa.nome); }
}

// Esconde/mostra itens de navegação e botões conforme a permissão
function aplicarPermissoesUI(){
  const isSup = currentUser.role==='supervisor';
  document.getElementById('nav-novo').classList.toggle('hidden-role', !isSup);
  document.getElementById('nav-imp').classList.toggle('hidden-role', !isSup);
}

function isSupervisor(){ return currentUser && currentUser.role==='supervisor'; }

// ============================================================
//  VISIBILIDADE
// ============================================================
// Supervisor: vê chamados/técnicos da própria região (capital OU interior)
// Técnico: vê apenas chamados/técnicos da própria região
function chamadosVisiveis(){
  if(!currentUser) return [];
  const regiao = regiaoDeZona(currentUser.zona_id);
  return chamados.filter(c => regiaoDeZona(c.zona_id) === regiao);
}
function pessoasVisiveis(){
  if(!currentUser) return [];
  const regiao = regiaoDeZona(currentUser.zona_id);
  return PESSOAS.filter(p => p.role==='tecnico' && regiaoDeZona(p.zona_id) === regiao);
}
// Equipe direta do supervisor: apenas técnicos da própria zona
function equipeDoSupervisor(){
  if(!currentUser) return [];
  return PESSOAS.filter(p => p.role==='tecnico' && p.zona_id===currentUser.zona_id);
}

// ============================================================
//  NAVEGAÇÃO
// ============================================================
function showPage(p){
  document.querySelectorAll('.page').forEach(el=>el.classList.remove('active'));
  document.querySelectorAll('.ni').forEach(el=>el.classList.remove('active'));
  document.getElementById('page-'+p).classList.add('active');
  const navId = {novochamado:'novo', importacao:'imp', tecnicos:'tec', chamados:'cham', dashboard:'dash', perfil:null}[p];
  if(navId) document.getElementById('nav-'+navId).classList.add('active');

  if(p==='dashboard')    renderDashboard();
  if(p==='chamados'){    renderChamados(); }
  if(p==='tecnicos')     renderTecnicos();
  if(p==='importacao')   { renderImpHist(); aplicarBloqueioImportacao(); }
  if(p==='novochamado')  { ncPassoAtual=1; ncRenderPasso(1); prepararFormNovo(); }
  if(p==='perfil')       renderPerfil();
  window.scrollTo({top:0});
}
function navTo(p){
  if((p==='novochamado' || p==='importacao') && !isSupervisor()){
    toast('Apenas supervisores têm acesso a esta área.');
    return;
  }
  showPage(p);
  if(window.innerWidth<=768) closeSidebar();
}
function toggleSidebar(){ document.getElementById('sidebar').classList.toggle('open'); document.getElementById('sb-overlay').classList.toggle('show'); }
function closeSidebar(){ document.getElementById('sidebar').classList.remove('open'); document.getElementById('sb-overlay').classList.remove('show'); }

// ============================================================
//  DASHBOARD
// ============================================================
function renderDashboard(){
  if(!currentUser) return;
  const chList = chamadosVisiveis();
  const regiaoNome = regiaoDeZona(currentUser.zona_id)==='capital' ? 'Capital — RJ' : 'Interior — RJ';
  document.getElementById('dash-sub').textContent = `Dados reais — ${regiaoNome}`;

  const total = chList.length;
  const abertos = chList.filter(c=>c.status==='aberto').length;
  const emAndamento = chList.filter(c=>c.status==='em_andamento').length;
  const resol = chList.filter(c=>c.status==='resolvido').length;
  const slaOk = chList.filter(c=>c.sla_cumprido===1).length;
  const slaTot= chList.filter(c=>c.sla_cumprido!==null).length;
  const tempos= chList.filter(c=>c.status==='resolvido').map(c=>minutosResolucao(c)).filter(m=>m!==null);
  const tMed  = tempos.length ? Math.round(tempos.reduce((a,b)=>a+b,0)/tempos.length) : 0;

  document.getElementById('kpi-g').innerHTML = `
    <div class="kc" style="animation-delay:.05s"><div class="kl">Chamados abertos</div><div class="kv">${abertos}</div><div class="kd dn">${emAndamento} em andamento · ${total} no total</div></div>
    <div class="kc" style="animation-delay:.1s"><div class="kl">Taxa de resolução</div><div class="kv">${total?Math.round(resol/total*100):0}%</div><div class="kd up">${resol} resolvidos</div></div>
    <div class="kc" style="animation-delay:.15s"><div class="kl">SLA cumprido</div><div class="kv">${slaTot?Math.round(slaOk/slaTot*100):0}%</div><div class="kd ${slaTot&&slaOk/slaTot>=.9?'up':'wn'}">${slaTot} chamado(s) avaliado(s)</div></div>
    <div class="kc" style="animation-delay:.2s"><div class="kl">Tempo médio</div><div class="kv">${fTempo(tMed)}</div><div class="kd">${tempos.length} chamado(s) resolvido(s)</div></div>
  `;

  // Tendência semanal — calculada a partir das datas reais dos chamados
  const semanas = {};
  chList.forEach(c=>{
    const lbl = semanaLabel(c.aberto_em);
    if(!semanas[lbl]) semanas[lbl] = {total:0, resol:0, ordem:new Date(c.aberto_em).getTime()};
    semanas[lbl].total++;
    if(c.status==='resolvido') semanas[lbl].resol++;
  });
  const semOrdenadas = Object.entries(semanas).sort((a,b)=>a[1].ordem-b[1].ordem);
  const ctxT = document.getElementById('ch-tend').getContext('2d');
  if(chartTend) chartTend.destroy();
  chartTend = new Chart(ctxT,{type:'bar',data:{labels:semOrdenadas.map(s=>s[0]),datasets:[
    {label:'Total',data:semOrdenadas.map(s=>s[1].total),backgroundColor:'#e2e8f0',borderRadius:4,borderSkipped:false},
    {label:'Resolvidos',data:semOrdenadas.map(s=>s[1].resol),backgroundColor:'#FF5F00',borderRadius:4,borderSkipped:false}
  ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{font:{size:11},color:'#9ca3af'}},y:{grid:{color:'#f0f1f3'},ticks:{font:{size:11},color:'#9ca3af',stepSize:1},beginAtZero:true}}}});

  // Classificação de obra
  const obras = {obra_nova:0, mod_integral:0, mod_parcial:0};
  chList.forEach(c=>{ if(obras[c.tipo_obra]!==undefined) obras[c.tipo_obra]++; });
  const coresObra = {obra_nova:'#1d6fe0', mod_integral:'#f1b300', mod_parcial:'#e02424'};
  const labelsObra = {obra_nova:'Obra Nova', mod_integral:'Mod. Integral', mod_parcial:'Mod. Parcial'};
  const oTot = Object.values(obras).reduce((a,b)=>a+b,0) || 1;
  document.getElementById('leg-tipos').innerHTML = Object.entries(obras).map(([k,v])=>`<span class="cli"><span class="cld" style="background:${coresObra[k]}"></span>${labelsObra[k]} ${Math.round(v/oTot*100)}%</span>`).join('');
  const ctxTi = document.getElementById('ch-tipo').getContext('2d');
  if(chartTipo) chartTipo.destroy();
  chartTipo = new Chart(ctxTi,{type:'doughnut',data:{labels:Object.values(labelsObra),datasets:[{data:Object.values(obras),backgroundColor:Object.keys(obras).map(k=>coresObra[k]),borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},cutout:'68%'}});

  // Desempenho por Zona
  const regs = {};
  chList.forEach(c=>{
    const key = c.zona_id;
    if(!regs[key]) regs[key] = {total:0, resol:0, sla:0};
    regs[key].total++;
    if(c.status==='resolvido') regs[key].resol++;
    if(c.sla_cumprido===1) regs[key].sla++;
  });
  document.getElementById('tb-reg').innerHTML = Object.keys(regs).length
    ? `<table class="ft"><thead><tr><th>Zona</th><th>Total</th><th>Resolvidos</th><th>SLA ok</th></tr></thead><tbody>${Object.entries(regs).map(([zid,v])=>`<tr><td>${zonaLabel(zid)}</td><td><strong>${v.total}</strong></td><td>${v.resol}</td><td>${v.sla}</td></tr>`).join('')}</tbody></table>`
    : '<p style="color:var(--t3);text-align:center;padding:1rem">Nenhum chamado encontrado</p>';

  // Ranking — apenas para supervisores
  const rankBox = document.getElementById('rank-box');
  if(!isSupervisor()){
    rankBox.style.display='none';
  } else {
    rankBox.style.display='';
    const tcList = pessoasVisiveis();
    const ranking = tcList.map(t=>{
      const chTec = chList.filter(c=>c.tecnico===t.matricula);
      const resolTec = chTec.filter(c=>c.status==='resolvido');
      const taxa = chTec.length ? Math.round(resolTec.length/chTec.length*100) : 0;
      const tempos2 = resolTec.map(c=>minutosResolucao(c)).filter(m=>m!==null);
      const tMedTec = tempos2.length ? Math.round(tempos2.reduce((a,b)=>a+b,0)/tempos2.length) : 0;
      return {...t, totalCh:chTec.length, taxa, tMedTec};
    }).sort((a,b)=>b.taxa-a.taxa || b.totalCh-a.totalCh);

    document.getElementById('rank').innerHTML = ranking.length ? ranking.map((t,i)=>{
      const cor = t.taxa>=85?'#22c55e':t.taxa>=65?'#f59e0b':'#ef4444';
      return `<div class="ri"><div class="rp">${i+1}</div><div class="rav" id="rank-av-${t.matricula}"></div><div style="flex:1"><div class="rnm">${t.nome} <span class="mat">(${t.matricula})</span></div><div class="rmt">${t.totalCh} chamado(s) · ${fTempo(t.tMedTec)} médio · ${zonaLabel(t.zona_id)}</div></div><div style="width:120px"><div class="pb"><div class="bt"><div class="bf" style="width:${t.taxa}%;background:${cor}"></div></div><span style="font-size:12px;color:var(--t2);min-width:32px">${t.taxa}%</span></div></div></div>`;
    }).join('') : '<p style="color:var(--t3);text-align:center;padding:1rem">Nenhum técnico nesta região</p>';
    ranking.forEach(t=>{ const el=document.getElementById('rank-av-'+t.matricula); if(el) setAvatarEl(el,t); });
  }
}

function semanaLabel(dateStr){
  const d = new Date(dateStr);
  const onejan = new Date(d.getFullYear(),0,1);
  const week = Math.ceil((((d-onejan)/86400000)+onejan.getDay()+1)/7);
  return 'Sem '+week;
}

// ============================================================
//  CHAMADOS
// ============================================================

function renderChamados(lista){
  lista = lista || chamadosVisiveis();
  document.getElementById('cham-total').textContent = `${lista.length} chamado(s)`;
  document.getElementById('tb-cham').innerHTML = lista.map(c=>`
    <tr class="clickable" onclick="abrirChamado(${c.id})">
      <td class="obra-borda ${obraBorda(c.tipo_obra)}" style="color:var(--t3);font-size:12px;padding-left:10px">#${c.id}</td>
      <td><div style="font-weight:500;font-size:13px">${c.titulo}</div></td>
      <td>${obraPill(c.tipo_obra)}</td>
      <td><span class="zona-badge ${regiaoDeZona(c.zona_id)==='capital'?'cap':'intr'}">${zonaLabel(c.zona_id)}</span></td>
      <td>${prioPill(c.prioridade)}</td><td>${statPill(c.status)}</td>
      <td style="font-size:13px">${nomeMat(c.tecnico)}</td>
      <td style="font-size:12px;color:var(--t3)">${fData(c.aberto_em)}</td>
      <td>${c.sla_cumprido===1?'<span class="pl ps2">✓ OK</span>':c.sla_cumprido===0?'<span class="pl pd">✗ Fora</span>':'<span style="color:var(--t3);font-size:12px">—</span>'}</td>
      <td><button class="btn-g btn-sm" onclick="event.stopPropagation();abrirChamado(${c.id})">Ver</button></td>
    </tr>`).join('');
}

function filtrarChamados(){
  const busca = document.getElementById('f-busca').value.toLowerCase();
  const status = document.getElementById('f-status').value;
  const obra = document.getElementById('f-obra').value;
  renderChamados(chamadosVisiveis().filter(c=>{
    if(busca && !c.titulo.toLowerCase().includes(busca)) return false;
    if(status && c.status!==status) return false;
    if(obra && c.tipo_obra!==obra) return false;
    return true;
  }));
}

function fecharModal(){ document.getElementById('modal-ov').classList.remove('open'); }

function abrirChamado(id){
  const c = chamados.find(x=>x.id===id);
  if(!c) return;
  document.getElementById('modal-t').textContent = `#${c.id} — ${c.titulo}`;

  // ---- IA autoavaliativa: sintetiza padrões de solução, não cita um chamado específico ----
  const sugestao = gerarSugestaoIA(c);

  const descEditavel = `
    <div style="margin-bottom:1rem">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <span style="font-size:11px;color:var(--t3);text-transform:uppercase">Descrição (qualquer colaborador pode editar)</span>
      </div>
      <textarea class="fi" id="desc-edit-${c.id}" rows="3">${c.descricao||''}</textarea>
      <button class="btn-g btn-sm" style="margin-top:6px" onclick="salvarDescricao(${c.id})">Salvar descrição</button>
    </div>`;

  const historicoHtml = `<div class="hist-list">${c.historico.slice().reverse().map(h=>`
    <div class="hist-item"><div class="hist-dot"></div><div class="hist-txt"><strong>${h.usuario}</strong>${h.matricula!=='-' ? ` <span class="mat">(${h.matricula})</span>` : ''} — ${h.alteracao}<div class="hist-meta">${fData(h.data)}</div></div></div>
  `).join('')}</div>`;

  const editForm = isSupervisor() ? `
    <div class="rcard" style="margin-top:1rem">
      <div class="fhint" style="margin-bottom:10px;font-weight:600;color:var(--t2);text-transform:uppercase;font-size:11px">Editar chamado (somente supervisor)</div>
      <div class="frow">
        <div class="fg"><label class="flabel">Classificação</label><select class="fi" id="ed-obra">
          <option value="obra_nova" ${c.tipo_obra==='obra_nova'?'selected':''}>Obra Nova</option>
          <option value="mod_integral" ${c.tipo_obra==='mod_integral'?'selected':''}>Modificação Integral</option>
          <option value="mod_parcial" ${c.tipo_obra==='mod_parcial'?'selected':''}>Modificação Parcial</option>
        </select></div>
        <div class="fg"><label class="flabel">Status</label><select class="fi" id="ed-status">
          <option value="aberto" ${c.status==='aberto'?'selected':''}>Aberto</option>
          <option value="em_andamento" ${c.status==='em_andamento'?'selected':''}>Em andamento</option>
          <option value="resolvido" ${c.status==='resolvido'?'selected':''}>Resolvido</option>
        </select></div>
      </div>
      <div class="fg"><label class="flabel">Técnico responsável</label><select class="fi" id="ed-tec">
        <option value="">A definir</option>
        ${equipeDoSupervisor().map(t=>`<option value="${t.matricula}" ${c.tecnico===t.matricula?'selected':''}>${t.nome} (${t.matricula})</option>`).join('')}
      </select></div>
      <div class="fg"><label class="flabel">Solução aplicada</label><textarea class="fi" id="ed-solucao" rows="2">${c.solucao||''}</textarea></div>
      <button class="btn-p" style="width:100%;justify-content:center" onclick="salvarEdicaoChamado(${c.id})">Salvar alteração</button>
    </div>` : '';

  document.getElementById('modal-b').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;font-size:13px;margin-bottom:1.25rem">
      <div><span style="color:var(--t3)">Classificação</span><br>${obraPill(c.tipo_obra)}</div>
      <div><span style="color:var(--t3)">Zona</span><br><span class="zona-badge ${regiaoDeZona(c.zona_id)==='capital'?'cap':'intr'}">${zonaLabel(c.zona_id)}</span></div>
      <div><span style="color:var(--t3)">Prioridade</span><br>${prioPill(c.prioridade)}</div>
      <div><span style="color:var(--t3)">Status</span><br>${statPill(c.status)}</div>
      <div><span style="color:var(--t3)">SLA</span><br>${c.sla_cumprido===1?'<span class="pl ps2">Cumprido</span>':c.sla_cumprido===0?'<span class="pl pd">Fora</span>':'<span style="color:var(--t3)">—</span>'}</div>
      <div><span style="color:var(--t3)">Técnico</span><br><strong>${nomeMat(c.tecnico)}</strong></div>
      <div><span style="color:var(--t3)">Aberto em</span><br>${fData(c.aberto_em)}</div>
      <div><span style="color:var(--t3)">Resolvido em</span><br>${fData(c.resolvido_em)}</div>
    </div>
    ${descEditavel}
    ${c.solucao?`<div style="margin-bottom:1rem;padding:12px;background:rgba(34,197,94,.06);border-radius:8px;border:1px solid rgba(34,197,94,.2)"><div style="font-size:11px;color:var(--t3);text-transform:uppercase;margin-bottom:4px">Solução aplicada</div><p style="font-size:13px">${c.solucao}</p></div>`:''}
    ${sugestao}
    <div style="margin-top:1.25rem"><div class="fhint" style="margin-bottom:6px;font-weight:600;color:var(--t2);text-transform:uppercase;font-size:11px">Histórico de alterações</div>${historicoHtml}</div>
    ${editForm}
  `;
  document.getElementById('modal-ov').classList.add('open');
}

function salvarEdicaoChamado(id){
  const c = chamados.find(x=>x.id===id);
  if(!c || !isSupervisor()) return;

  const novaObra = document.getElementById('ed-obra').value;
  const novoStatus = document.getElementById('ed-status').value;
  const novoTec = document.getElementById('ed-tec').value;
  const novaSolucao = document.getElementById('ed-solucao').value;

  const mudancas = [];
  if(novaObra !== c.tipo_obra) mudancas.push(`Classificação alterada para "${OBRA_MAP[novaObra].label}"`);
  if(novoStatus !== c.status) mudancas.push(`Status alterado para "${statPillTexto(novoStatus)}"`);
  if(novoTec !== (c.tecnico||'')) mudancas.push(`Técnico alterado para ${novoTec ? nomeMatTexto(novoTec) : 'A definir'}`);
  if(novaSolucao !== (c.solucao||'')) mudancas.push('Solução aplicada atualizada');

  c.tipo_obra = novaObra;
  c.status = novoStatus;
  c.tecnico = novoTec || null;
  c.solucao = novaSolucao;

  if(novoStatus==='resolvido' && !c.resolvido_em){
    c.resolvido_em = new Date().toISOString();
    c.sla_cumprido = 1;
    const minutos = Math.round((new Date(c.resolvido_em)-new Date(c.aberto_em))/60000);
    c.tempo_resolucao_min = minutos;
  }

  if(mudancas.length){
    c.historico.push({usuario:currentUser.nome, matricula:currentUser.matricula, alteracao:mudancas.join('; '), data:new Date().toISOString()});
  }

  toast('Chamado atualizado com sucesso.');
  fecharModal();
  renderChamados();
  if(document.getElementById('page-dashboard').classList.contains('active')) renderDashboard();
}

// Descrição: editável por qualquer colaborador (técnico ou supervisor), a qualquer momento
function salvarDescricao(id){
  const c = chamados.find(x=>x.id===id);
  if(!c) return;
  const novaDesc = document.getElementById('desc-edit-'+id).value;
  if(novaDesc === (c.descricao||'')){ toast('Nenhuma alteração para salvar.'); return; }
  c.descricao = novaDesc;
  c.historico.push({usuario:currentUser.nome, matricula:currentUser.matricula, alteracao:'Descrição atualizada', data:new Date().toISOString()});
  toast('Descrição atualizada com sucesso.');
  abrirChamado(id); // reabre o modal já atualizado, mantendo o histórico visível
}
function statPillTexto(s){ return {aberto:'Aberto',em_andamento:'Em andamento',resolvido:'Resolvido'}[s]||s; }
function nomeMatTexto(m){ const p=pessoaPorMatricula(m); return p?`${p.nome} (${p.matricula})`:m; }

// ============================================================
//  NOVO CHAMADO (somente supervisor)
// ============================================================
function prepararFormNovo(){
  const block = !isSupervisor();
  document.getElementById('nc-block-msg').style.display = block ? '' : 'none';
  document.getElementById('nc-form-wrap').style.display = block ? 'none' : '';
  if(block) return;
  document.getElementById('nc-zona').value = zonaLabel(currentUser.zona_id);
}
function ncPasso(p){
  if(p>1){
    const t = document.getElementById('nc-titulo').value.trim();
    if(!t){ document.getElementById('nc-titulo').style.borderColor='var(--err)'; document.getElementById('nc-titulo').focus(); return; }
    document.getElementById('nc-titulo').style.borderColor='';
  }
  if(p===2) ncPopularTecnicos();
  if(p===3) ncMontaResumo();
  document.getElementById('fs'+ncPassoAtual).classList.add('hidden');
  document.getElementById('fs'+p).classList.remove('hidden');
  for(let i=1;i<=3;i++){
    const d=document.getElementById('sd'+i);
    d.classList.remove('active','done');
    if(i<p) d.classList.add('done');
    if(i===p) d.classList.add('active');
  }
  ncPassoAtual=p;
}
function ncPopularTecnicos(){
  const sel = document.getElementById('nc-tec');
  sel.innerHTML = '<option value="">A definir</option>' + equipeDoSupervisor().map(t=>`<option value="${t.matricula}">${t.nome} (${t.matricula})</option>`).join('');
}
function ncRenderPasso(p){
  for(let i=1;i<=3;i++){
    document.getElementById('fs'+i).classList.toggle('hidden', i!==p);
    const d=document.getElementById('sd'+i);
    d.classList.remove('active','done');
    if(i===p) d.classList.add('active');
  }
}
function ncMontaResumo(){
  const g = id=>document.getElementById(id);
  const prioMap={baixa:'Baixa',media:'Média',alta:'Alta',critica:'Crítica'};
  const titulo = g('nc-titulo').value;

  const sim = chamadosVisiveis().filter(c=>c.titulo.toLowerCase().includes(titulo.toLowerCase().substring(0,20)));
  document.getElementById('nc-alerta').innerHTML = sim.length
    ? `<div class="a-rec">⚠ <strong>Possível recorrência detectada:</strong> ${sim.length} chamado(s) com título similar nesta região.</div>` : '';

  const tecVal = g('nc-tec').value;
  g('nc-resumo').innerHTML = `
    <div class="rrow"><span class="rk">Título</span><span class="rv">${titulo}</span></div>
    <div class="rrow"><span class="rk">Classificação</span><span class="rv">${obraPill(g('nc-tipo').value)}</span></div>
    <div class="rrow"><span class="rk">Zona</span><span class="rv">${zonaLabel(currentUser.zona_id)}</span></div>
    <div class="rrow"><span class="rk">Prioridade</span><span class="rv">${prioMap[g('nc-prio').value]}</span></div>
    <div class="rrow"><span class="rk">Técnico</span><span class="rv">${tecVal?nomeMatTexto(tecVal):'A definir'}</span></div>
    <div class="rrow"><span class="rk">SLA</span><span class="rv">${g('nc-sla').value} horas</span></div>
    ${g('nc-desc').value?`<div class="rrow"><span class="rk">Descrição</span><span class="rv" style="max-width:300px">${g('nc-desc').value.substring(0,100)}…</span></div>`:''}`;
}
function abrirChamado_novo(){
  if(!isSupervisor()) return;
  const btn=document.getElementById('btn-abrir');
  btn.disabled=true; btn.textContent='Abrindo...';
  setTimeout(()=>{
    const tecVal = document.getElementById('nc-tec').value || null;
    const novo = {
      id: nextChamadoId++,
      titulo: document.getElementById('nc-titulo').value,
      tipo_obra: document.getElementById('nc-tipo').value,
      zona_id: currentUser.zona_id,
      prioridade: document.getElementById('nc-prio').value,
      status:'aberto',
      tecnico: tecVal,
      aberto_em: new Date().toISOString(),
      resolvido_em:null, sla_cumprido:null, tempo_resolucao_min:null,
      descricao: document.getElementById('nc-desc').value,
      solucao:null,
      historico:[{usuario:currentUser.nome, matricula:currentUser.matricula, alteracao:'Chamado criado'+(tecVal?` e técnico designado: ${nomeMatTexto(tecVal)}`:''), data:new Date().toISOString()}]
    };
    chamados.unshift(novo);
    toast(`Chamado #${novo.id} aberto com sucesso!`);
    btn.disabled=false; btn.textContent='Abrir Chamado';
    setTimeout(()=>navTo('chamados'),900);
  },700);
}

// ============================================================
//  IMPORTAÇÃO — funcional (parse real de CSV/JSON/XLSX)
// ============================================================
function aplicarBloqueioImportacao(){
  const block = !isSupervisor();
  document.getElementById('imp-block-msg').style.display = block ? '' : 'none';
  document.getElementById('imp-wrap').style.display = block ? 'none' : '';
}
function impSel(input){ if(input.files[0]) impPreview(input.files[0]); }
function impDrop(e){ e.preventDefault(); document.getElementById('uz').classList.remove('dv'); if(e.dataTransfer.files[0]) impPreview(e.dataTransfer.files[0]); }
function impPreview(f){
  parsedImportRows = null;
  const ext = f.name.split('.').pop().toLowerCase();
  const cores={xlsx:'#217346',xls:'#217346',csv:'#0066cc',json:'#f59e0b',txt:'#6b7280'};
  document.getElementById('f-ico').style.background = cores[ext]||'#6b7280';
  document.getElementById('f-ico').textContent = ext.toUpperCase();
  document.getElementById('f-nome').textContent = f.name;
  document.getElementById('f-tam').textContent = fBytes(f.size);
  document.getElementById('uz').style.display='none';
  document.getElementById('f-prev').style.display='block';
  document.getElementById('imp-res').style.display='none';
  window.__impFile = f;
}
function impRem(){ document.getElementById('uz').style.display=''; document.getElementById('f-prev').style.display='none'; document.getElementById('f-inp').value=''; window.__impFile=null; }

const MAPA_COLUNAS = {
  titulo:['titulo','título','title','chamado','assunto'],
  descricao:['descricao','descrição','description','detalhe'],
  tipo_obra:['tipo_obra','classificacao','classificação','tipo'],
  prioridade:['prioridade','priority'],
  status:['status','situacao','situação'],
};
function normalizarLinha(obj){
  const out = {};
  Object.entries(obj).forEach(([k,v])=>{
    const key = k.toString().trim().toLowerCase();
    for(const [campo,variantes] of Object.entries(MAPA_COLUNAS)){
      if(variantes.includes(key)){ out[campo]=String(v).trim(); break; }
    }
  });
  return out;
}
function mapObraValor(v){
  if(!v) return 'mod_parcial';
  const s = v.toLowerCase();
  if(s.includes('nova')) return 'obra_nova';
  if(s.includes('integral')) return 'mod_integral';
  if(s.includes('parcial')) return 'mod_parcial';
  return 'mod_parcial';
}
function mapPrioridade(v){
  const ops=['baixa','media','média','alta','critica','crítica'];
  if(v && ops.includes(v.toLowerCase())) return v.toLowerCase().replace('é','e').replace('í','i');
  return 'media';
}
function mapStatus(v){
  const ops={aberto:'aberto','em andamento':'em_andamento','em_andamento':'em_andamento',resolvido:'resolvido'};
  if(v && ops[v.toLowerCase()]) return ops[v.toLowerCase()];
  return 'aberto';
}

function impExec(){
  const f = window.__impFile;
  if(!f || !isSupervisor()) return;
  const ext = f.name.split('.').pop().toLowerCase();
  const prog=document.getElementById('imp-prog'), bar=document.getElementById('ipb'), msg=document.getElementById('ips');
  prog.style.display='block'; bar.style.width='10%'; msg.textContent='Lendo arquivo...';

  const finalizar = (linhasBrutas)=>{
    bar.style.width='60%'; msg.textContent='Normalizando colunas...';
    let importadas=0, erros=0;
    linhasBrutas.forEach(raw=>{
      const linha = normalizarLinha(raw);
      if(!linha.titulo){ erros++; return; }
      const novo = {
        id: nextChamadoId++,
        titulo: linha.titulo,
        tipo_obra: mapObraValor(linha.tipo_obra),
        zona_id: currentUser.zona_id,
        prioridade: mapPrioridade(linha.prioridade),
        status: mapStatus(linha.status),
        tecnico: null,
        aberto_em: new Date().toISOString(),
        resolvido_em:null, sla_cumprido:null, tempo_resolucao_min:null,
        descricao: linha.descricao || '',
        solucao:null,
        historico:[{usuario:currentUser.nome, matricula:currentUser.matricula, alteracao:`Importado via arquivo "${f.name}"`, data:new Date().toISOString()}]
      };
      chamados.unshift(novo);
      importadas++;
    });

    bar.style.width='100%'; msg.textContent='Concluído!';
    setTimeout(()=>{ prog.style.display='none'; bar.style.width='0'; },500);

    const registro={nome:f.name, formato:ext, importadas, erros, data:new Date().toISOString()};
    impHist.unshift(registro);
    document.getElementById('imp-res').style.display='block';
    document.getElementById('imp-res').innerHTML = `<div style="padding:1rem;background:rgba(34,197,94,.07);border-radius:8px;border:1px solid rgba(34,197,94,.2)"><div style="font-weight:600;color:#15803d;margin-bottom:6px">✓ Importação concluída</div><div style="font-size:13px;color:var(--t2)">Importados: <strong>${importadas}</strong> &nbsp;·&nbsp; Ignorados (sem título): <strong>${erros}</strong></div></div>`;
    renderImpHist();
    if(document.getElementById('page-chamados').classList.contains('active')) renderChamados();
  };

  if(ext==='json'){
    const r = new FileReader();
    r.onload = ()=>{ try{ const data=JSON.parse(r.result); finalizar(Array.isArray(data)?data:[data]); }catch(e){ toast('Erro ao ler JSON: '+e.message); prog.style.display='none'; } };
    r.readAsText(f);
  } else if(ext==='csv' || ext==='txt'){
    const r = new FileReader();
    r.onload = ()=>{
      const text = r.result;
      const delim = [',',';','\t','|'].find(d=>text.split('\n')[0].includes(d)) || ',';
      const linhas = text.split(/\r?\n/).filter(l=>l.trim());
      const headers = linhas[0].split(delim).map(h=>h.trim());
      const rows = linhas.slice(1).map(l=>{
        const vals = l.split(delim);
        const obj={}; headers.forEach((h,i)=>obj[h]=vals[i]); return obj;
      });
      finalizar(rows);
    };
    r.readAsText(f);
  } else if(ext==='xlsx' || ext==='xls'){
    const r = new FileReader();
    r.onload = ()=>{
      try{
        const wb = XLSX.read(new Uint8Array(r.result), {type:'array'});
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);
        finalizar(rows);
      }catch(e){ toast('Erro ao ler planilha: '+e.message); prog.style.display='none'; }
    };
    r.readAsArrayBuffer(f);
  }
}
function renderImpHist(){
  const el = document.getElementById('imp-hist');
  el.innerHTML = impHist.length
    ? `<table class="ft"><thead><tr><th>Arquivo</th><th>Formato</th><th>Importados</th><th>Ignorados</th><th>Data</th></tr></thead><tbody>${impHist.map(i=>`<tr><td style="font-size:13px;font-weight:500">${i.nome}</td><td><span class="pl ps2">${i.formato}</span></td><td>${i.importadas}</td><td>${i.erros}</td><td style="font-size:12px;color:var(--t3)">${fData(i.data)}</td></tr>`).join('')}</tbody></table>`
    : '<p style="color:var(--t3);text-align:center;padding:1.5rem">Nenhuma importação ainda</p>';
}

// ============================================================
//  TÉCNICOS
// ============================================================
function renderTecnicos(){
  document.getElementById('tec-sub').textContent = isSupervisor() ? 'Sua equipe e técnicos da região' : 'Técnicos da sua região';

  // Caixa "Minha Equipe" — apenas supervisor
  const teamWrap = document.getElementById('team-box-wrap');
  if(isSupervisor()){
    const equipe = equipeDoSupervisor();
    teamWrap.innerHTML = `
      <div class="team-box">
        <div class="ch" style="margin-bottom:.5rem"><h3 class="ct">Minha Equipe — ${zonaLabel(currentUser.zona_id)}</h3></div>
        ${equipe.map(t=>`<div class="team-row"><div class="rav" id="team-av-${t.matricula}" style="width:30px;height:30px"></div><div style="flex:1"><div style="font-size:13px;font-weight:500">${t.nome} <span class="mat">(${t.matricula})</span></div><div style="font-size:11px;color:var(--t3)">${t.cargo}</div></div><button class="btn-g btn-sm btn-danger" onclick="removerDaEquipe('${t.matricula}')">Remover</button></div>`).join('') || '<p style="color:var(--t3);font-size:13px">Nenhum técnico na equipe ainda.</p>'}
        <div class="team-add">
          <input type="text" class="fi" id="team-mat-input" placeholder="Matrícula do técnico (ex: TK-CAP-005)">
          <button class="btn-p" onclick="adicionarNaEquipe()">Adicionar</button>
        </div>
        <p class="fhint" style="margin-top:8px">Apenas técnicos já cadastrados no sistema podem ser vinculados pela matrícula.</p>
      </div>`;
    equipe.forEach(t=>{ const el=document.getElementById('team-av-'+t.matricula); if(el) setAvatarEl(el,t); });
  } else {
    teamWrap.innerHTML='';
  }

  document.getElementById('tec-list-title').textContent = isSupervisor() ? 'Todos os técnicos — Região' : 'Técnicos';
  const lista = pessoasVisiveis();
  document.getElementById('tb-tec').innerHTML = `
    <table class="ft"><thead><tr><th>Técnico</th><th>Cargo</th><th>Zona</th><th>Chamados</th><th>Tempo médio</th><th>Desempenho</th></tr></thead>
    <tbody>${lista.map(t=>{
      const chTec = chamadosVisiveis().filter(c=>c.tecnico===t.matricula);
      const resolTec = chTec.filter(c=>c.status==='resolvido');
      const taxa = chTec.length ? Math.round(resolTec.length/chTec.length*100) : 0;
      const tempos = resolTec.map(c=>minutosResolucao(c)).filter(m=>m!==null);
      const tMed = tempos.length ? Math.round(tempos.reduce((a,b)=>a+b,0)/tempos.length) : 0;
      const cor = taxa>=85?'#22c55e':taxa>=65?'#f59e0b':'#ef4444';
      return `<tr>
        <td><div style="display:flex;align-items:center;gap:10px"><div class="rav" id="tec-av-${t.matricula}"></div><div><div style="font-weight:500;font-size:13px">${t.nome} <span class="mat">(${t.matricula})</span></div><span class="zona-badge ${regiaoDeZona(t.zona_id)==='capital'?'cap':'intr'}" style="margin-top:2px">${zonaLabel(t.zona_id)}</span></div></div></td>
        <td style="font-size:12px">${t.cargo}</td>
        <td style="font-size:12px;color:var(--t2)">${regiaoDeZona(t.zona_id)==='capital'?'Capital':'Interior'}</td>
        <td>${chTec.length}</td><td>${fTempo(tMed)}</td>
        <td style="min-width:140px"><div class="pb"><div class="bt"><div class="bf" style="width:${taxa}%;background:${cor}"></div></div><span style="font-size:12px;color:var(--t2);min-width:32px">${taxa}%</span></div></td>
      </tr>`;
    }).join('')}</tbody></table>`;
  lista.forEach(t=>{ const el=document.getElementById('tec-av-'+t.matricula); if(el) setAvatarEl(el,t); });
}

function adicionarNaEquipe(){
  const input = document.getElementById('team-mat-input');
  const mat = input.value.trim().toUpperCase();
  const p = pessoaPorMatricula(mat);
  if(!p){ toast('Matrícula não encontrada no sistema.'); return; }
  if(p.role!=='tecnico'){ toast('Apenas técnicos podem ser vinculados a uma equipe.'); return; }
  p.zona_id = currentUser.zona_id;
  toast(`${p.nome} adicionado à equipe.`);
  input.value='';
  renderTecnicos();
}
function removerDaEquipe(matricula){
  const p = pessoaPorMatricula(matricula);
  if(!p) return;
  p.zona_id = null;
  toast(`${p.nome} removido da equipe.`);
  renderTecnicos();
}

// ============================================================
//  PERFIL
// ============================================================
function renderPerfil(){
  const u = currentUser;
  setAvatarEl(document.getElementById('profile-av'), u);
  document.getElementById('profile-nome').textContent = u.nome;
  document.getElementById('profile-mat').textContent = 'Matrícula: '+u.matricula;
  document.getElementById('profile-badges').innerHTML = `<span class="zona-badge ${regiaoDeZona(u.zona_id)==='capital'?'cap':'intr'}">${zonaLabel(u.zona_id)}</span><span class="pl ${u.role==='supervisor'?'pp':'pi'}">${u.role==='supervisor'?'Supervisor':'Técnico'}</span>`;
  document.getElementById('profile-cargo').textContent = u.cargo;
  document.getElementById('profile-zona').textContent = zonaLabel(u.zona_id);
  document.getElementById('profile-regiao').textContent = regiaoDeZona(u.zona_id)==='capital' ? 'Capital — RJ' : 'Interior — RJ';
  document.getElementById('profile-role').textContent = u.role==='supervisor' ? 'Supervisor' : 'Técnico';

  const chTec = chamadosVisiveis().filter(c=>c.tecnico===u.matricula);
  const resolTec = chTec.filter(c=>c.status==='resolvido');
  document.getElementById('profile-chamados').textContent = chTec.length;
  document.getElementById('profile-taxa').textContent = chTec.length ? Math.round(resolTec.length/chTec.length*100)+'%' : '—';
}
function trocarFoto(input){
  const file = input.files[0];
  if(!file) return;
  const r = new FileReader();
  r.onload = ()=>{
    currentUser.foto = r.result;
    renderPerfil();
    atualizarSidebarUser();
    toast('Foto atualizada com sucesso.');
  };
  r.readAsDataURL(file);
}

// ============================================================
//  IA — autoavaliação baseada em padrões de problemas no elevador
//  (sintetiza causas e soluções; nunca aponta para um chamado específico)
// ============================================================
const COMPONENTES_ELEVADOR = [
  {chave:'porta',     termos:['porta','portas']},
  {chave:'cabine',    termos:['cabine','ruido','ruído','barulho']},
  {chave:'cabo',      termos:['cabo','cabos','tração','tracao']},
  {chave:'painel',    termos:['painel','quadro','comando','botoeira','botão','botao']},
  {chave:'hidraulico',termos:['óleo','oleo','hidráulico','hidraulico','pistão','pistao','vazamento']},
  {chave:'sensor',    termos:['sensor','sensores','calibração','calibracao']},
  {chave:'motor',     termos:['motor','máquina','maquina']},
  {chave:'instalacao',termos:['instalação','instalacao','obra nova']},
];
const STOPWORDS = ['de','da','do','das','dos','no','na','nos','nas','o','a','os','as','com','para','e','que','um','uma','em','por'];

function tokenizar(txt){
  return (txt||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w.length>2 && !STOPWORDS.includes(w));
}

function detectarComponentes(chamado){
  const texto = tokenizar(chamado.titulo+' '+(chamado.descricao||'')).join(' ');
  const norm = (chamado.titulo+' '+(chamado.descricao||'')).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  return COMPONENTES_ELEVADOR.filter(c => c.termos.some(t => norm.includes(t.normalize('NFD').replace(/[\u0300-\u036f]/g,''))));
}

function gerarSugestaoIA(chamado){
  const componentes = detectarComponentes(chamado);
  // Base completa (Capital + Interior) — a IA nunca se restringe à região do chamado
  const baseTotal = chamados.filter(x=>x.id!==chamado.id);

  let relacionados;
  if(componentes.length){
    const chaves = componentes.map(c=>c.chave);
    relacionados = baseTotal.filter(x => detectarComponentes(x).some(c=>chaves.includes(c.chave)));
  } else {
    relacionados = baseTotal.filter(x => x.tipo_obra===chamado.tipo_obra);
  }

  const resolvidos = relacionados.filter(x=>x.status==='resolvido' && x.solucao);
  const totalCasos = relacionados.length;
  const taxaSucesso = totalCasos ? Math.round(resolvidos.length/totalCasos*100) : 0;

  if(!totalCasos){
    return `<div style="font-size:13px;color:var(--t3);text-align:center;padding:.75rem;background:var(--bdr2);border-radius:8px;margin-top:1rem">Ainda não há histórico suficiente na base para gerar uma autoavaliação sobre este tipo de problema.</div>`;
  }

  // Sintetiza causas e soluções recorrentes (deduplicadas), sem citar chamados específicos
  const causasMap = {};
  resolvidos.forEach(x=>{
    const sol = (x.solucao||'').trim();
    if(!sol) return;
    const chave = sol.toLowerCase();
    causasMap[chave] = causasMap[chave] || {texto:sol, ocorrencias:0};
    causasMap[chave].ocorrencias++;
  });
  const padroesSolucao = Object.values(causasMap).sort((a,b)=>b.ocorrencias-a.ocorrencias).slice(0,3);

  const labelComponente = componentes.length ? componentes.map(c=>c.chave).join(', ') : OBRA_MAP[chamado.tipo_obra].label.toLowerCase();

  const diagnostico = componentes.length
    ? `Os termos do chamado indicam possível origem relacionada a: <strong>${labelComponente}</strong>.`
    : `Não foi possível identificar um componente específico pelo texto; a análise considerou casos da mesma classificação (${OBRA_MAP[chamado.tipo_obra].label}).`;

  return `<div style="padding:14px;background:rgba(59,130,246,.05);border-radius:8px;border:1px solid rgba(59,130,246,.15);margin-top:1rem">
    <div style="font-size:11px;color:var(--info);text-transform:uppercase;margin-bottom:8px">Autoavaliação da IA — base completa (Capital + Interior)</div>
    <div style="font-size:12px;margin-bottom:8px">${diagnostico}</div>
    <div style="font-size:12px;margin-bottom:8px"><strong>Histórico:</strong> ${totalCasos} caso(s) semelhante(s) na base, com <strong>${taxaSucesso}%</strong> de taxa de resolução.</div>
    ${padroesSolucao.length ? `
      <div style="font-size:12px;margin-bottom:4px"><strong>Padrões de solução mais eficazes observados:</strong></div>
      <ul style="font-size:12px;color:var(--t2);margin:0 0 4px 1.1rem;padding:0">
        ${padroesSolucao.map(p=>`<li>${p.texto} <span style="color:var(--t3)">(observado em ${p.ocorrencias} caso${p.ocorrencias>1?'s':''})</span></li>`).join('')}
      </ul>
      <div style="font-size:11px;color:var(--t3);margin-top:6px">Sugestão gerada por similaridade de padrões — recomenda-se validação técnica antes da aplicação.</div>
    ` : `<div style="font-size:12px;color:var(--t3)">Ainda não há soluções registradas suficientes para sugerir um padrão específico.</div>`}
  </div>`;
}

function statPill(s){const m={aberto:['pi','Aberto'],em_andamento:['pw','Em andamento'],resolvido:['ps2','Resolvido']};const[c,l]=m[s]||['pg',s];return`<span class="pl ${c}">${l}</span>`}
function prioPill(p){const m={baixa:['pg','Baixa'],media:['pi','Média'],alta:['pw','Alta'],critica:['pd','Crítica']};const[c,l]=m[p]||['pg',p];return`<span class="pl ${c}">${l}</span>`}
const OBRA_MAP = {
  obra_nova:    {cls:'po-azul',    label:'Obra Nova',            borda:'ob-nova'},
  mod_integral: {cls:'po-amarela', label:'Modificação Integral', borda:'ob-int'},
  mod_parcial:  {cls:'po-vermelha',label:'Modificação Parcial',  borda:'ob-parc'},
};
function obraPill(t){ const o=OBRA_MAP[t]||{cls:'pg',label:t}; return `<span class="pl ${o.cls}"><span class="po-dot"></span>${o.label}</span>`; }
function obraBorda(t){ return (OBRA_MAP[t]||{}).borda||''; }
function fData(iso){if(!iso)return'—';return new Date(iso).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}
function fTempo(m){if(!m)return'—';if(m<60)return m+' min';const h=Math.floor(m/60),r=m%60;return r?`${h}h ${r}min`:`${h}h`}
function fBytes(b){if(b<1024)return b+' B';if(b<1048576)return(b/1024).toFixed(1)+' KB';return(b/1048576).toFixed(1)+' MB'}
function iniciais(n){if(!n)return'?';return n.split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase()}
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3500)}