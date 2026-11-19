import {state,team,zoneName} from '../core/state.js';
import {esc} from '../core/format.js';
import {icon,heading,button,options,notice,priorityBadge,WORKS,PRIORITIES,workBadge} from '../components/ui.js';
export function renderNewContext(){
  const form=state.ui.newTicket;
  const lift=state.elevadores.find(e=>String(e.id)===String(form.elevador_id));
  const local=lift?state.locais.find(l=>l.id===lift.local_id):null;
  const person=team().find(p=>p.matricula===form.tecnico);
  const row=(label,value)=>`<div><span>${label}</span><strong>${value}</strong></div>`;
  return `<div class="context-card"><div class="context-card__heading">${icon('ClipboardList',19)}Contexto do atendimento</div>
    <div class="context-equipment"><span>${icon('Building2',25)}</span><div><strong>${lift?esc(lift.codigo):'Selecione um elevador'}</strong><small>${lift?esc(lift.local_nome):'O histórico acompanha o equipamento'}</small></div></div>
    <div class="context-rows">${row('Sua zona',esc(zoneName(state.user.zona_id)))}${row('Modelo',lift?esc(lift.modelo):'—')}${row('Local',local?esc(local.bairro):'—')}${row('Responsável',person?esc(person.nome):'Ainda não atribuído')}${row('Prazo de SLA',Number(form.sla_horas)+' horas')}</div>
    <p class="context-hint">${icon('Info',16)}A identificação correta permite consultar recorrências no mesmo elevador.</p>
  </div>`;
}
export function renderNewTicket(){
  const f=state.ui.newTicket;
  const lifts=state.elevadores.filter(e=>e.zona_id===state.user.zona_id&&e.ativo);
  const steps=['Identificação','Detalhes','Revisão'];
  let content='';
  if(f.step===1)content=`
    <div class="form-section-heading"><h2>Identifique o atendimento</h2><p>Selecione o equipamento e classifique a solicitação.</p></div>
    <label class="field" for="nc-elevador"><span class="field__label">Elevador <em>*</em></span><span class="select-wrap"><select id="nc-elevador" name="elevador_id" data-newfield="elevador_id" required>${options({'':'Selecione o equipamento',...Object.fromEntries(lifts.map(e=>[e.id,e.codigo+' · '+e.local_nome]))},f.elevador_id)}</select>${icon('ChevronDown',16)}</span><span class="field__hint">Equipamentos cadastrados na zona da sua equipe.</span></label>
    <label class="field" for="nc-titulo"><span class="field__label">Título do chamado <em>*</em></span><input id="nc-titulo" name="titulo" data-newfield="titulo" required maxlength="200" value="${esc(f.titulo)}" placeholder="Ex.: Porta volta a abrir durante o fechamento"><span class="field__hint">Descreva o sintoma de forma objetiva.</span></label>
    <fieldset class="choice-field"><legend>Classificação da solicitação</legend><div class="work-choices">${Object.entries(WORKS).map(([value,label])=>`<label class="work-choice"><input type="radio" name="tipo_obra" data-newfield="tipo_obra" value="${value}" ${f.tipo_obra===value?'checked':''}>${icon(value==='obra_nova'?'Building2':value==='mod_integral'?'RefreshCw':'Wrench',20)}<span>${label}</span></label>`).join('')}</div></fieldset>
    <label class="field" for="nc-prio"><span class="field__label">Prioridade</span><span class="select-wrap"><select id="nc-prio" name="prioridade" data-newfield="prioridade">${options(PRIORITIES,f.prioridade)}</select>${icon('ChevronDown',16)}</span></label>`;
  if(f.step===2)content=`
    <div class="form-section-heading"><h2>Detalhe o problema</h2><p>O contexto ajuda a equipe a preparar o atendimento.</p></div>
    <label class="field" for="nc-desc"><span class="field__label">Descrição do problema</span><textarea id="nc-desc" name="descricao" data-newfield="descricao" rows="6" maxlength="10000" placeholder="Quais são os sintomas? Quando começou? Em quais condições acontece?">${esc(f.descricao)}</textarea><span class="field__hint">Inclua os detalhes observados e evite informações pessoais desnecessárias.</span></label>
    <div class="field-grid"><label class="field" for="nc-tec"><span class="field__label">Técnico responsável</span><span class="select-wrap"><select id="nc-tec" name="tecnico" data-newfield="tecnico">${options({'':'Definir depois',...Object.fromEntries(team().map(p=>[p.matricula,p.nome]))},f.tecnico)}</select>${icon('ChevronDown',16)}</span></label>
    <label class="field" for="nc-sla"><span class="field__label">SLA em horas <em>*</em></span><input id="nc-sla" name="sla_horas" type="number" min="1" max="8760" required data-newfield="sla_horas" value="${f.sla_horas}"><span class="field__hint">Prazo contado a partir da abertura.</span></label></div>
    ${notice('A solução será registrada pelo técnico durante o atendimento.','ClipboardCheck','purple')}`;
  if(f.step===3){
    const lift=lifts.find(e=>String(e.id)===String(f.elevador_id));
    const past=state.chamados.filter(c=>c.elevador_id===lift?.id).length;
    const person=team().find(p=>p.matricula===f.tecnico);
    content=`<div class="form-section-heading"><h2>Revise antes de abrir</h2><p>Confira os dados que serão enviados à equipe.</p></div>
      <div class="review-ticket"><div class="review-ticket__heading"><h3>${esc(f.titulo)}</h3>${priorityBadge(f.prioridade)}</div><p>${esc(lift?.codigo)} · ${esc(lift?.local_nome)}</p><div class="review-grid"><div><span>Classificação</span>${workBadge(f.tipo_obra)}</div><div><span>Responsável</span><strong>${person?esc(person.nome):'Ainda não atribuído'}</strong></div><div><span>Prazo de atendimento</span><strong>${Number(f.sla_horas)} horas</strong></div><div><span>Status inicial</span><strong>Aberto</strong></div></div><div class="review-description"><span>Descrição</span><p>${esc(f.descricao||'Sem descrição adicional.')}</p></div></div>
      ${past?notice('Este elevador tem '+past+' registro(s) anterior(es). O assistente poderá consultar os sintomas e soluções do histórico.','History','purple'):''}`;
  }
  return heading('OPERAÇÃO','Novo chamado','Um registro claro é o primeiro passo para um bom atendimento.',button('Voltar aos chamados',{route:'chamados',name:'X'}))+`
    <div class="new-ticket-layout">
      <section class="panel">
        <ol class="form-steps" aria-label="Etapas do cadastro">${steps.map((label,i)=>`<li class="${f.step===i+1?'is-current':f.step>i+1?'is-done':''}" ${f.step===i+1?'aria-current="step"':''}><span>${f.step>i+1?icon('Check',15):i+1}</span><div><small>ETAPA ${i+1}</small><strong>${label}</strong></div></li>`).join('')}</ol>
        <form id="new-ticket-form" data-form="new-ticket"><div class="new-ticket-body form-stack">${lifts.length?content:notice('Cadastre um elevador da sua zona antes de abrir um chamado.','Building2','warning')}<p class="field-error" data-form-error role="alert" hidden></p></div>
        <div class="form-footer"><span>${f.step<3?'Campos com * são obrigatórios.':'O chamado será salvo no histórico do equipamento.'}</span><div>${f.step>1?button('Voltar',{action:'new-back'}):''}${lifts.length?`<button type="submit" class="button button--primary" id="new-ticket-next">${f.step===3?icon('Check',18):''}${f.step===3?'Abrir chamado':'Continuar'}</button>`:button('Cadastrar elevador',{route:'elevadores',tone:'primary'})}</div></div></form>
      </section><aside id="new-context">${renderNewContext()}</aside>
    </div>`;
}
export function renderAssetDialog(tab='lift'){
  const lift=tab==='lift';
  const locals=state.locais.filter(l=>l.zona_id===state.user.zona_id);
  return `<div class="utility-header"><div><p class="eyebrow">CADASTRO DA EQUIPE</p><h2 id="utility-title">${lift?'Novo elevador':'Novo local'}</h2></div>${button('Fechar',{action:'close-utility',name:'X',tone:'quiet'})}</div>
    <div class="utility-tabs tabs"><button class="tab ${lift?'is-active':''}" type="button" data-action="asset-tab" data-tab="lift">Elevador</button><button class="tab ${!lift?'is-active':''}" type="button" data-action="asset-tab" data-tab="local">Local / cliente</button></div>
    <form id="asset-form" data-form="asset" data-kind="${tab}"><div class="utility-body form-stack">
    ${lift?`
      <div class="field-grid"><label class="field" for="lift-codigo"><span class="field__label">Código do equipamento <em>*</em></span><input id="lift-codigo" name="codigo" required maxlength="40" pattern="[A-Za-z0-9_-]+" placeholder="Ex.: BAR-003"></label><label class="field" for="lift-local"><span class="field__label">Local <em>*</em></span><span class="select-wrap"><select id="lift-local" name="local_id" required>${options({'':'Selecione o local',...Object.fromEntries(locals.map(l=>[l.id,l.nome]))},'')}</select>${icon('ChevronDown',16)}</span></label></div>
      ${!locals.length?notice('Cadastre primeiro um local na aba Local / cliente.','Info','warning'):''}
      <div class="field-grid"><label class="field" for="lift-fabricante"><span class="field__label">Fabricante <em>*</em></span><input id="lift-fabricante" name="fabricante" required maxlength="100"></label><label class="field" for="lift-modelo"><span class="field__label">Modelo <em>*</em></span><input id="lift-modelo" name="modelo" required maxlength="100"></label></div>
      <div class="field-grid"><label class="field" for="lift-serie"><span class="field__label">Número de série <em>*</em></span><input id="lift-serie" name="numero_serie" required maxlength="100"></label><label class="field" for="lift-capacidade"><span class="field__label">Capacidade em kg <em>*</em></span><input id="lift-capacidade" name="capacidade_kg" type="number" min="100" max="5000" required value="750"></label></div>`:`
      <label class="field" for="local-nome"><span class="field__label">Nome do local ou cliente <em>*</em></span><input id="local-nome" name="nome" required maxlength="150" placeholder="Ex.: Condomínio Parque da Barra"></label>
      <label class="field" for="local-endereco"><span class="field__label">Endereço <em>*</em></span><input id="local-endereco" name="endereco" required maxlength="300"></label>
      <label class="field" for="local-bairro"><span class="field__label">Bairro <em>*</em></span><input id="local-bairro" name="bairro" required maxlength="100"></label>`}
      ${notice('O cadastro será vinculado a '+zoneName(state.user.zona_id)+'.','MapPin','purple')}
      <p class="field-error" data-form-error role="alert" hidden></p>
    </div><div class="utility-footer">${button('Cancelar',{action:'close-utility'})}<button type="submit" class="button button--primary">${icon('Plus',18)}${lift?'Cadastrar elevador':'Cadastrar local'}</button></div></form>`;
}
export function renderTeamDialog(){
  return `<div class="utility-header"><div><p class="eyebrow">MINHA EQUIPE</p><h2 id="utility-title">Vincular técnico</h2></div>${button('Fechar',{action:'close-utility',tone:'quiet',name:'X'})}</div>
    <form data-form="team"><div class="utility-body form-stack"><p class="body-copy">Informe a matrícula de um técnico cadastrado para vinculá-lo à sua equipe.</p><label class="field" for="team-registration"><span class="field__label">Matrícula do técnico <em>*</em></span><input id="team-registration" name="matricula" required maxlength="40" placeholder="Ex.: TK-CAP-002"></label>${notice('Técnicos com atendimentos pendentes precisam ter os chamados reatribuídos antes da transferência.','Info')}<p class="field-error" data-form-error role="alert" hidden></p></div><div class="utility-footer">${button('Cancelar',{action:'close-utility'})}<button type="submit" class="button button--primary">Vincular à equipe</button></div></form>`;
}
