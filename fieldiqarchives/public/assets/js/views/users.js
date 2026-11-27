import {state,isAdmin,zoneName,roleName} from '../core/state.js';
import {esc,fmtDate} from '../core/format.js';
import {heading,button,icon,badge,options,notice,emptyState} from '../components/ui.js';
import {jobTitles} from '../core/jobs.js';
export {renderUsers} from './user-list.js';
export function renderUserDialog(p=null,draft=null){
  const selectedRole=draft?.role??p?.role??'tecnico';
  const selectedJob=draft?.cargo??p?.cargo??Object.keys(jobTitles(selectedRole))[0];
  const zoneOptions=Object.fromEntries(state.zonas.map(z=>[z.id,z.nome+' · '+z.local]));
  const input=(id,label,name,value='',extra='')=>`<label class="field" for="user-${id}"><span class="field__label">${label}</span><input id="user-${id}" name="${name}" value="${esc(value??'')}" ${extra}></label>`;
  return `<div class="utility-header"><div><p class="eyebrow">GESTÃO DE USUÁRIOS</p><h2 id="utility-title">${p?'Editar colaborador':'Cadastrar colaborador'}</h2></div>${button('Fechar',{action:'close-utility',name:'X',tone:'quiet'})}</div>
    <form data-form="user" data-registration="${esc(p?.matricula??'')}"><div class="utility-body form-stack">
    <div class="field-grid">${input('name','Nome completo *','nome',p?.nome,'required maxlength="150" autocomplete="name"')}${input('registration','Matrícula *','matricula',p?.matricula,'required maxlength="40" '+(p?'readonly':''))}</div>
    <div class="field-grid"><label class="field" for="user-role"><span class="field__label">Perfil *</span><span class="select-wrap"><select id="user-role" name="role" required ${p?.role==='administrativo'?'disabled':''}>${options(p?.role==='administrativo'?{administrativo:'Administrativo / RH'}:isAdmin()?{tecnico:'Técnico',supervisor:'Supervisor',cliente:'Cliente'}:{tecnico:'Técnico'},p?.role??'tecnico')}</select>${icon('ChevronDown',16)}</span></label>
    <label class="field" for="user-zone"><span class="field__label">Zona *</span><span class="select-wrap"><select id="user-zone" name="zona_id" ${isAdmin()&&p?.role!=='administrativo'?'required':'disabled'}>${options(p?.role==='administrativo'?{'':'Todas as zonas'}:zoneOptions,p?.zona_id??state.user.zona_id)}</select>${icon('ChevronDown',16)}</span></label></div>
    <label class="field" for="user-position"><span class="field__label">Cargo *</span><span class="select-wrap"><select id="user-position" name="cargo" required>${options(jobTitles(selectedRole,p?.role===selectedRole?p?.cargo:''),selectedJob)}</select>${icon('ChevronDown',16)}</span><span class="field__hint">Os cargos acompanham o perfil selecionado.</span></label>
    <fieldset id="user-client-locals" class="client-local-choices" hidden><legend>Locais vinculados ao cliente *</legend><p class="text-small text-muted">O cliente só consulta os elevadores destes locais.</p>${state.locais.map(l=>`<label><input type="checkbox" name="locais_ids" value="${l.id}" ${(p?.locais_ids??[]).includes(l.id)?'checked':''}><span>${esc(l.nome)}<small>${esc(zoneName(l.zona_id))}</small></span></label>`).join('')||'<p>Cadastre um local antes de criar o cliente.</p>'}</fieldset>
    <div class="field-grid">${input('cpf',p?'CPF — preencha para substituir':'CPF *','cpf','',`inputmode="numeric" maxlength="14" ${p?'':'required'} placeholder="${esc(p?.cpf_mascarado??'000.000.000-00')}" autocomplete="off"`)}${input('admission','Data de admissão','admissao',p?.admissao?.slice(0,10),'type="date" max="'+new Date().toISOString().slice(0,10)+'"')}</div>
    <div class="field-grid">${input('email','E-mail comercial','email',p?.email,'type="email" maxlength="200" autocomplete="email"')}${input('phone','Telefone','telefone',p?.telefone,'type="tel" maxlength="30" autocomplete="tel"')}</div>
    <div class="form-section-heading"><h3>Acesso à plataforma</h3><p>${p?'Deixe a senha em branco para manter a atual.':'Defina o usuário e uma senha com pelo menos 12 caracteres.'}</p></div>
    <div class="field-grid">${input('login','Usuário de acesso','login',p?.login,'maxlength="100" autocomplete="off"')}${input('password',p?'Nova senha':'Senha *','senha','','type="password" minlength="12" maxlength="200" autocomplete="new-password" '+(p?'':'required'))}</div>
    <label class="field" for="user-active"><span class="field__label">Situação</span><span class="select-wrap"><select id="user-active" name="ativo">${options({true:'Ativo',false:'Inativo'},String(p?.ativo??true))}</select>${icon('ChevronDown',16)}</span></label>
    ${notice('O CPF aparece mascarado na listagem. Desativar uma conta preserva o histórico do colaborador.','LockKeyhole')}
    <p class="text-small text-muted">O rascunho fica disponível ao reabrir este cadastro durante a sessão.</p><p class="field-error" data-form-error role="alert" hidden></p></div><div class="utility-footer">${button('Descartar rascunho',{action:'user-discard',tone:'quiet'})}${button('Fechar',{action:'close-utility'})}<button type="submit" class="button button--primary">${icon('Check',18)}Salvar colaborador</button></div></form>`;
}
