import {state} from './state.js';
import {api} from './api.js';
import {renderNotifications} from '../views/notifications.js';

export function createNotificationCenter({toast,navigate,openTicket,reload}){
  const dialog=document.getElementById('notification-dialog');let timer,user=null,epoch=0,request=0,latest=null,busy=false,controller=null;
  const fresh=()=>({unread:0,filter:'todas',page:1,data:null,error:null,loading:false});
  function bell(){const n=state.ui.notifications?.unread??0;document.querySelectorAll('.notification-bell').forEach(button=>{button.setAttribute('aria-label','Notificações'+(n?', '+n+' não lidas':''));const count=button.querySelector('.notification-count');count.hidden=!n;count.textContent=n>99?'99+':n;});}
  function draw(){if(!dialog.open)return;const top=document.getElementById('notification-body')?.scrollTop??0,focused=dialog.contains(document.activeElement)?document.activeElement.id:null;dialog.innerHTML=renderNotifications();const body=document.getElementById('notification-body');body.scrollTop=top;if(focused)document.getElementById(focused)?.focus({preventScroll:true});}
  async function load({poll=false}={}){
    if(!user||!state.user)return;const current=epoch,serial=++request,n=state.ui.notifications;n.loading=true;
    controller?.abort();controller=new AbortController();
    if(!poll)draw();
    try{
      const data=await api('/notificacoes?status='+(poll?'todas':n.filter)+'&pagina='+(poll?1:n.page)+'&limite=15',{signal:controller.signal});
      if(current!==epoch||serial!==request)return;
      if(poll&&latest!==null&&data.ultima_id>latest){const personal=data.notificacoes.find(item=>item.id>latest&&!item.lido_em&&!item.propria_acao&&(item.gravidade==='critica'||['atribuicao','equipe_inclusao'].includes(item.tipo)));if(personal)toast(personal.titulo);}
      latest=Math.max(latest??0,data.ultima_id);n.unread=data.nao_lidas;n.error=null;
      if(poll&&(n.filter!=='todas'||n.page!==1)){if(dialog.open)return await load();return;}
      n.data=data;
      if(data.pagina>data.paginas){n.page=data.paginas;return await load();}
    }catch(error){if(current!==epoch||serial!==request)return;n.error=error.message;}
    finally{if(current===epoch&&serial===request){n.loading=false;bell();draw();}}
  }
  function stop(){clearInterval(timer);controller?.abort();user=null;epoch++;request++;latest=null;busy=false;dialog.close();dialog.innerHTML='';state.ui.notifications=fresh();bell();}
  function start(){if(!state.user||state.user.role==='cliente'||!state.config.notificacoes)return;if(user===state.user.matricula)return;stop();user=state.user.matricula;void load();timer=setInterval(()=>{if(!document.hidden&&!busy)void load({poll:true});},20000);}
  function open(){if(!user)return;dialog.innerHTML=renderNotifications();if(!dialog.open)dialog.showModal();void load();}
  async function fromPush(id){
    if(!user||!Number.isInteger(Number(id))||Number(id)<1)return;
    if(document.getElementById('ticket-dialog').open||document.getElementById('utility-dialog').open){toast('Há uma atualização na central. Termine ou salve o formulário atual e consulte o sino.');void load({poll:true});return;}
    try{const current=epoch,item=await api('/notificacoes/'+Number(id));if(current===epoch)await follow(item);}catch(error){toast(error.message);}
  }
  async function follow(item){
    if(!item)return;
    const ticket=state.ui.ticket,dirty=ticket&&Object.entries(ticket.draft).some(([key,value])=>String(value??'')!==String(ticket.record[key]??''));
    if(ticket&&item.chamado_id!==ticket.record.id&&dirty&&!window.confirm('Há alterações não salvas no atendimento atual. Deseja abrir outro registro e descartar essas alterações?'))return;
    const current=epoch;await api('/notificacoes/'+item.id,{method:'PATCH',body:{lida:true}});
    if(ticket&&item.chamado_id===ticket.record.id){dialog.close();void load();return;}
    await reload();if(current!==epoch)return;dialog.close();if(ticket)document.getElementById('ticket-dialog').close();
    if(item.chamado_id){navigate('chamados');openTicket(item.chamado_id);}else if(item.solicitacao_id)navigate('solicitacoes');void load();
  }
  document.addEventListener('click',event=>{
    const target=event.target.closest('[data-notification]');if(!target||!state.user)return;
    const action=target.dataset.notification,n=state.ui.notifications;
    if(action==='open'){open();return;}if(action==='close'){dialog.close();return;}if(action==='settings'){dialog.close();navigate('perfil');return;}if(busy)return;
    if(action==='filter'){n.filter=target.dataset.value;n.page=1;void load();return;}
    if(action==='page'){n.page=Number(target.dataset.value);void load();return;}
    if(action==='refresh'){void load();return;}
    const current=epoch;busy=true;n.busy=true;target.disabled=true;
    void (async()=>{
      try{
        if(action==='read-all')await api('/notificacoes/lidas',{method:'PATCH',body:{ate_id:n.data?.ultima_id??0}});
        if(action==='read')await api('/notificacoes/'+target.dataset.id,{method:'PATCH',body:{lida:target.dataset.read==='true'}});
        if(action==='follow')await follow(n.data?.notificacoes.find(item=>item.id===Number(target.dataset.id)));
        if(current===epoch)await load();
      }catch(error){if(current===epoch){n.error=error.message;draw();}}
      finally{if(current===epoch){busy=false;n.busy=false;draw();}}
    })();
  });
  return {start,stop,open,load,follow,fromPush};
}
