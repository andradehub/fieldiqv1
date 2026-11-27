import {priorityCode} from '../core/priorities.js';
import {state,isSupervisor,regionName,personName,zoneName,isOnTicket} from '../core/state.js';
import {esc,average,fmtTime,percent,fmtNumber,currentPeriod,attentionScore,weekKey} from '../core/format.js';
import {icon,heading,button,metricCard,panelHeader,statusBadge,priorityBadge,emptyState,avatar} from '../components/ui.js';
import {scopeLine} from './shell.js';
let trendChart=null,statusChart=null;
export function disposeCharts(){trendChart?.destroy();statusChart?.destroy();trendChart=statusChart=null;}
export function dashboardData(){
  const selected=currentPeriod(state.chamados,state.ui.period);
  const active=selected.filter(c=>c.status!=='cancelado');
  const pending=active.filter(c=>['aberto','em_andamento'].includes(c.status));
  const resolved=active.filter(c=>c.status==='resolvido');
  return {selected,active,pending,resolved};
}
export function renderDashboard(){
  const {selected,active,pending,resolved}=dashboardData();
  const sla=percent(resolved.filter(c=>c.sla_cumprido===true).length,resolved.length);
  const rate=percent(resolved.length,active.length);
  const period=`<label class="period-select"><span class="sr-only">Período dos indicadores</span>${icon('CalendarDays',17)}<select id="dash-period" data-change="period"><option value="all" ${state.ui.period==='all'?'selected':''}>Todo o histórico</option><option value="week" ${state.ui.period==='week'?'selected':''}>Últimos 7 dias</option><option value="month" ${state.ui.period==='month'?'selected':''}>Últimos 30 dias</option><option value="quarter" ${state.ui.period==='quarter'?'selected':''}>Últimos 90 dias</option></select>${icon('ChevronDown',15)}</label>`;
  const primary=isSupervisor()?button('Novo chamado',{route:'novochamado',name:'Plus',tone:'primary'}):button('Meus atendimentos',{action:'quick-filter',name:'Wrench',tone:'primary',attrs:'data-filter="mine"'});
  const alert=(name,label,n,filter,tone)=>`<button type="button" class="attention-chip attention-chip--${tone}" data-action="quick-filter" data-filter="${filter}">${icon(name,17)}<strong>${n}</strong><span>${label}</span>${icon('ChevronRight',15)}</button>`;
  const queue=pending.slice().sort((a,b)=>attentionScore(b)-attentionScore(a)||new Date(a.aberto_em)-new Date(b.aberto_em)).slice(0,4);
  const zones=state.zonas.map(z=>({...z,list:active.filter(c=>c.zona_id===z.id)})).filter(z=>z.list.length).sort((a,b)=>b.list.length-a.list.length);
  return heading('PAINEL OPERACIONAL','Visão geral','Os indicadores e atendimentos que merecem sua atenção.',period+primary)+scopeLine()+`
    <div class="metrics-grid">
      ${metricCard('Chamados pendentes',fmtNumber(pending.length),pending.filter(c=>c.status==='aberto').length+' abertos · '+pending.filter(c=>c.status==='em_andamento').length+' em andamento',{name:'Tickets',action:'quick-filter',attrs:'data-filter="pending"'})}
      ${metricCard('SLA cumprido',sla==null?'—':sla+'%',resolved.length+' chamados encerrados no recorte',{name:'ShieldCheck',tone:'green',action:'quick-filter',attrs:'data-filter="resolved"'})}
      ${metricCard('Tempo de resolução',fmtTime(average(resolved.map(c=>c.tempo_resolucao_min).filter(n=>n!=null))),'Média entre abertura e encerramento',{name:'Timer',tone:'orange'})}
      ${metricCard('Taxa de resolução',rate==null?'—':rate+'%',resolved.length+' resolvidos de '+active.length+' chamados válidos',{name:'CircleCheck',action:'quick-filter',attrs:'data-filter="resolved"'})}
    </div>
    <div class="attention-strip">${alert('TriangleAlert','pendentes de prioridade A',pending.filter(c=>priorityCode(c.prioridade)==='A').length,'critical','red')}${alert('ClockAlert','fora do prazo',pending.filter(c=>c.sla_vencido).length,'sla','amber')}${alert('UserRound','sem responsável',pending.filter(c=>!c.tecnico).length,'unassigned','neutral')}<span class="period-note">Aberturas no período selecionado</span></div>
    <div class="dashboard-charts">
      <section class="panel">${panelHeader('Evolução dos atendimentos','Aberturas e conclusões dos chamados selecionados',`<div class="chart-key"><span><i class="key-purple"></i>Abertos</span><span><i class="key-orange"></i>Concluídos</span></div>`)}<div class="trend-chart"><canvas id="chart-trend" role="img" aria-label="Gráfico semanal de aberturas e conclusões de chamados"></canvas></div></section>
      <section class="panel">${panelHeader('Situação dos chamados',selected.length+' registros no período')}<div class="status-chart"><div class="status-chart__canvas"><canvas id="chart-status" role="img" aria-label="Distribuição dos chamados por status"></canvas><div class="chart-center"><strong>${selected.length}</strong><span>chamados</span></div></div><div class="status-legend">${[['aberto','Abertos','blue'],['em_andamento','Em andamento','orange'],['resolvido','Resolvidos','green'],['cancelado','Cancelados','gray']].map(([s,label,color])=>`<div><span><i class="key-${color}"></i>${label}</span><strong>${selected.filter(c=>c.status===s).length}</strong></div>`).join('')}</div></div></section>
    </div>
    <div class="dashboard-bottom">
      <section class="panel">${panelHeader('Fila de atenção','Prioridade, prazo e responsabilidade',button('Ver chamados',{route:'chamados',tone:'quiet',name:'ChevronRight'}))}
        ${queue.length?`<div class="attention-list">${queue.map(c=>`<button class="attention-row" type="button" data-action="open-ticket" data-id="${c.id}"><span class="attention-row__icon">${icon(c.sla_vencido?'ClockAlert':'Ticket',20)}</span><span class="attention-row__body"><strong>${esc(c.titulo)}</strong><small>${esc(c.elevador_codigo)} · ${esc(c.local_nome)}</small></span><span class="attention-row__status">${priorityBadge(c.prioridade)}<small>${c.sla_vencido?'Prazo excedido':esc(personName(c.tecnico))}</small></span>${icon('ChevronRight',17)}</button>`).join('')}</div>`:emptyState('Tudo em dia neste período','Não há chamados pendentes no recorte selecionado.',{name:'CircleCheck'})}
      </section>
      <section class="panel">${panelHeader('Chamados por zona','Distribuição dos registros selecionados')}<div class="zone-bars">${zones.length?zones.map(z=>`<div class="zone-bar"><div class="zone-bar__label"><strong>${esc(z.local)}</strong><span>${z.list.length} chamados</span></div><div class="zone-bar__track"><span style="width:${Math.max(3,Math.round(z.list.length/Math.max(active.length,1)*100))}%"></span></div><small>${esc(z.nome)} · ${z.list.filter(c=>c.status==='resolvido').length} resolvidos</small></div>`).join(''):`<p class="text-muted">Sem registros para o período.</p>`}</div></section>
    </div>
    ${isSupervisor()?`<section class="panel">${panelHeader('Carga de atendimento da equipe','Técnicos da área autorizada · volume de chamados atribuídos',button('Ver equipe',{route:'tecnicos',tone:'quiet',name:'ChevronRight'}))}<div class="workload-grid">${state.pessoas.filter(p=>p.role==='tecnico').map(p=>{const list=active.filter(c=>isOnTicket(c,p.matricula));return `<div class="workload-person">${avatar(p)}<div><strong>${esc(p.nome)}</strong><span>${list.filter(c=>['aberto','em_andamento'].includes(c.status)).length} pendentes · ${list.filter(c=>c.status==='resolvido').length} resolvidos</span></div></div>`;}).join('')}</div></section>`:''}
    <p class="dashboard-footnote">Indicadores calculados a partir dos registros do banco. Chamados cancelados não entram na taxa de resolução.</p>`;
}
export function mountCharts(){
  if(!window.Chart||!document.getElementById('chart-trend'))return;
  const {selected}=dashboardData();
  const weeks=new Map();
  const add=(value,key)=>{const week=weekKey(value);if(!weeks.has(week))weeks.set(week,{open:0,closed:0});weeks.get(week)[key]++;};
  for(const c of selected){add(c.aberto_em,'open');if(c.status==='resolvido'&&c.resolvido_em)add(c.resolvido_em,'closed');}
  const sorted=[...weeks].sort(([a],[b])=>a.localeCompare(b));
  window.Chart.defaults.font.family='Inter, sans-serif';
  window.Chart.defaults.color='#647188';
  trendChart=new window.Chart(document.getElementById('chart-trend'),{
    type:'bar',
    data:{labels:sorted.map(([w])=>w.slice(8)+'/'+w.slice(5,7)),datasets:[
      {label:'Abertos',data:sorted.map(([,v])=>v.open),backgroundColor:'#7000bd',borderRadius:4,maxBarThickness:24},
      {label:'Concluídos',data:sorted.map(([,v])=>v.closed),backgroundColor:'#ff5f00',borderRadius:4,maxBarThickness:24}
    ]},
    options:{animation:false,responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'#242033',padding:12}},scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:11},maxRotation:0}},y:{beginAtZero:true,grid:{color:'#eff1f6'},border:{display:false,dash:[4,4]},ticks:{stepSize:1,font:{size:11},padding:9}}}}
  });
  statusChart=new window.Chart(document.getElementById('chart-status'),{
    type:'doughnut',
    data:{labels:['Abertos','Em andamento','Resolvidos','Cancelados'],datasets:[{data:['aberto','em_andamento','resolvido','cancelado'].map(s=>selected.filter(c=>c.status===s).length),backgroundColor:['#4987e2','#ff8c48','#24976a','#b8bfcc'],borderWidth:4,borderColor:'#fff',hoverOffset:2,borderRadius:3}]},
    options:{animation:false,responsive:true,maintainAspectRatio:false,cutout:'78%',plugins:{legend:{display:false}}}
  });
}
