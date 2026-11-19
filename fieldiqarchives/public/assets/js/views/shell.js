import {state,routes,isSupervisor,regionName,zoneName} from '../core/state.js';
import {esc} from '../core/format.js';
import {icon,brandMark,avatar,button,iconButton} from '../components/ui.js';
export function renderLogin(){
  return `<section class="login">
    <div class="login-story">
      <a class="brand" href="#" aria-label="FieldIQ">${brandMark()}<span>FieldIQ</span></a>
      <div class="login-story__body"><span class="login-story__tag">GESTÃO DE ATENDIMENTOS</span>
        <h1>Clareza para gerir.<br>Contexto para atender.</h1>
        <p>Equipes, elevadores e histórico de atendimento em uma operação conectada.</p>
        <div class="login-preview" aria-hidden="true">
          <div class="login-preview__top"><span>Visão da operação</span>${icon('Activity',17)}</div>
          <div class="login-preview__grid"><div>${icon('Tickets',20)}<strong>Chamados</strong><span>Do registro à solução</span></div><div>${icon('Building2',20)}<strong>Equipamentos</strong><span>Um histórico por elevador</span></div></div>
          <div class="login-preview__bottom">${icon('Sparkles',18)}<span>Mais contexto em cada atendimento</span></div>
        </div>
      </div><p class="login-story__footer">FieldIQ · Gestão de manutenção de elevadores</p>
    </div>
    <div class="login-content"><div class="login-card">
      <div class="login-mobile-brand brand">${brandMark()}<span>FieldIQ</span></div>
      <p class="eyebrow">BEM-VINDO AO FIELDIQ</p><h2>Acesse sua operação</h2>
      <p class="login-description">Entre com o usuário da sua equipe para continuar.</p>
      <form id="login-form" data-form="login">
        <label class="field" for="login-user"><span class="field__label">Usuário</span><input id="login-user" name="login" autocomplete="username" required placeholder="Seu usuário"></label>
        <label class="field" for="login-pass"><span class="field__label">Senha</span><span class="password-field"><input id="login-pass" name="senha" type="password" autocomplete="current-password" required placeholder="Digite sua senha">${iconButton('Eye','Mostrar senha','toggle-password')}</span></label>
        <p class="field-error" id="login-error" role="alert" hidden></p>
        <button class="button button--brand button--full" id="login-submit" type="submit">Entrar na plataforma</button>
      </form>
      ${state.config.quickDemo?`<details class="demo-access" open><summary>Acessos de demonstração</summary><p>Dados fictícios para conhecer a plataforma.</p><div class="demo-grid">
        ${[['tecnico.capital','Técnico','Capital · Barra'],['tecnico.interior','Técnico','Interior · Niterói'],['supervisor.capital','Supervisor','Capital · Barra'],['supervisor.interior','Supervisor','Interior · Niterói']].map(([login,role,zone])=>`<button type="button" class="demo-button" data-action="demo-login" data-login="${login}">${icon(role==='Supervisor'?'UserRoundCog':'Wrench',18)}<span><strong>${role}</strong><small>${zone}</small></span></button>`).join('')}
      </div><p class="demo-password">Senha local: <code>tk2026</code></p></details>`:''}
      <div class="login-security">${icon('ShieldCheck',15)}<span>Acesso para técnicos e supervisores</span></div>
    </div></div>
  </section>`;
}
export function renderSidebar(){
  const pending=state.chamados.filter(c=>['aberto','em_andamento'].includes(c.status)).length;
  const links=section=>Object.entries(routes).filter(([,r])=>r.section===section&&(!r.supervisor||isSupervisor())).map(([key,r])=>`<a href="#${key}" data-route="${key}" class="nav-link ${state.ui.route===key?'is-active':''}" ${state.ui.route===key?'aria-current="page"':''} aria-label="${r.label}" title="${r.label}">${icon(r.icon,19)}<span>${r.label}</span>${key==='chamados'&&pending?`<span class="nav-count">${pending}</span>`:''}</a>`).join('');
  return `<a class="brand" href="#dashboard" data-route="dashboard">${brandMark()}<span class="brand__words">FieldIQ<span class="sidebar__subtitle">GESTÃO DE OPERAÇÕES</span></span></a>
    <nav class="sidebar-nav">${['Operação','Gestão','Sistema'].map(s=>`<div class="nav-section"><p class="nav-section__label">${s}</p>${links(s)}</div>`).join('')}</nav>
    <div class="sidebar-context"><div class="sidebar-context__title">${icon('MapPin',16)}Sua equipe</div><p>${esc(zoneName(state.user.zona_id))}</p></div>
    <div class="sidebar-account"><button class="sidebar-account__profile" type="button" data-route="perfil">${avatar(state.user)}<span class="sidebar-account__words"><span class="sidebar-account__name">${esc(state.user.nome)}</span><span class="sidebar-account__role">${isSupervisor()?'Supervisor':'Técnico de campo'}</span></span></button>${iconButton('LogOut','Sair da conta','logout')}</div>`;
}
export function renderTopbar(){
  const route=routes[state.ui.route]??routes.dashboard;
  return `<div class="topbar__left">${iconButton('Menu','Abrir menu de navegação','toggle-menu','id="menu-toggle" aria-controls="sidebar" aria-expanded="false"')}
    <span class="mobile-brand brand">${brandMark()}<span>FieldIQ</span></span>
    <nav class="breadcrumb" aria-label="Localização"><span>${route.section}</span>${icon('ChevronRight',14)}<strong>${route.label}</strong></nav></div>
    <div class="topbar__right"><form class="topbar-search" data-form="global-search" role="search">${icon('Search',17)}<input id="global-search" name="search" aria-label="Buscar chamado ou elevador" placeholder="Buscar chamado ou elevador"></form>
    ${state.config.demo?`<span class="topbar-demo">${icon('FlaskConical',14)}Demonstração</span>`:''}
    <span class="topbar-divider"></span>${iconButton('RefreshCw','Atualizar dados','refresh')}
    <button class="topbar-user" type="button" data-route="perfil" aria-label="Abrir meu perfil">${avatar(state.user,'small')}</button></div>`;
}
export function renderBottomNav(){
  return [['dashboard','LayoutDashboard','Visão geral'],['chamados','Tickets','Chamados'],['elevadores','Building2','Elevadores'],['more','Menu','Mais']].map(([key,name,label])=>`<button type="button" ${key==='more'?'data-action="toggle-menu"':'data-route="'+key+'"'} class="${state.ui.route===key?'is-active':''}" ${state.ui.route===key?'aria-current="page"':''}>${icon(name,22)}<span>${label}</span></button>`).join('');
}
export function scopeLine(){
  return `<div class="scope-line">${icon('MapPin',15)}<strong>${esc(regionName())}</strong><span>·</span><span>Equipe: ${esc(zoneName(state.user.zona_id))}</span></div>`;
}
