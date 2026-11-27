import {state} from '../core/state.js';
import {esc} from '../core/format.js';
import {panelHeader,button,badge,notice} from '../components/ui.js';
export function renderPushPreferences(){
  if(!state.config.push_configuravel)return '';
  const p=state.ui.push??{};
  return `<section class="panel push-preferences">${panelHeader('Notificações no celular','Controle os avisos deste dispositivo',badge(p.active?'Ativadas':'Não ativadas',p.active?'green':'neutral'))}<div class="push-preferences-body"><p>Receba avisos mesmo com o FieldIQ fechado. Na tela bloqueada, a mensagem é genérica e os detalhes ficam protegidos pelo seu acesso.</p>${p.reason?notice(p.reason,'Info'):''}${p.error?notice(p.error,'Info','warning'):''}<div class="row-actions">${button(p.busy?'Aguarde…':p.active?'Desativar neste dispositivo':'Ativar neste dispositivo',{attrs:'data-push="'+(p.active?'disable':'enable')+'" '+(p.busy||(!p.active&&!p.available)?'disabled':''),tone:p.active?'secondary':'primary',name:p.active?'BellOff':'BellRing'})}${p.active?button('Enviar teste',{attrs:'data-push="test" '+(p.busy?'disabled':''),name:'Send'}):''}</div><p class="field__hint">${p.devices??0} ${(p.devices??0)===1?'dispositivo cadastrado':'dispositivos cadastrados'} na sua conta. Sair da conta desativa os avisos neste navegador. O formato do aviso é definido pelo Android ou iOS.</p></div></section>`;
}
