import {state} from './state.js';
import {api} from './api.js';
export function createPushController({render,toast,onNotification}){
  let user=null,epoch=0,registration=null;
  const update=()=>{if(state.ui.route==='perfil')render(true);};
  function support(){
    if(!window.isSecureContext)return 'Para ativar no celular, abra o FieldIQ em um endereço HTTPS. Na rede local, os avisos continuam dentro do aplicativo.';
    const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
    if(ios&&!navigator.standalone&&!matchMedia('(display-mode: standalone)').matches)return 'No iPhone ou iPad, adicione o FieldIQ à Tela de Início e abra por esse ícone para ativar os avisos.';
    if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window))return 'Este navegador não oferece os avisos push necessários. A central dentro do aplicativo continua disponível.';
    return null;
  }
  async function worker(){registration??=await navigator.serviceWorker.register('/sw.js',{scope:'/'});return await navigator.serviceWorker.ready;}
  async function setBinding(value){
    const reg=await worker(),active=reg.active;if(!active)throw Error('Não foi possível preparar os avisos. Recarregue a página.');
    await new Promise((resolve,reject)=>{const channel=new MessageChannel(),timeout=setTimeout(()=>reject(Error('Não foi possível confirmar os avisos neste dispositivo.')),5000);channel.port1.onmessage=event=>{clearTimeout(timeout);channel.port1.close();event.data?.ok?resolve():reject(Error('Não foi possível salvar a preferência.'));};active.postMessage({tipo:'fieldiq-vinculo',vinculo:value},[channel.port2]);});
  }
  async function refresh(){
    const current=epoch,p=state.ui.push;
    try{
      const config=await api('/push/config');if(current!==epoch)return;
      p.devices=config.dispositivos;p.publicKey=config.chave_publica;p.reason=support()||(!config.disponivel?'A empresa ainda precisa concluir a configuração dos avisos no celular.':null);p.available=!p.reason;
      if(!support()){
        const reg=await worker(),sub=await reg.pushManager.getSubscription();if(current!==epoch)return;
        if(sub){const check=await api('/push/estado',{method:'POST',body:{endpoint:sub.endpoint}});if(current!==epoch)return;p.active=check.ativo;
          if(check.ativo)await setBinding(check.vinculo);else{await setBinding(null);await sub.unsubscribe();}
        }else p.active=false;
      }
    }catch(error){if(current===epoch){p.error=error.message;p.available=false;}}
    if(current===epoch)update();
  }
  function start(){if(!state.user||state.user.role==='cliente'||!state.config.push_configuravel||user===state.user.matricula)return;epoch++;user=state.user.matricula;state.ui.push={active:false,available:false,devices:0,reason:'Conferindo os avisos deste dispositivo…'};void refresh();}
  function stop(){user=null;epoch++;state.ui.push={};}
  async function disable({logout=false}={}){
    if(!('serviceWorker' in navigator)||!window.isSecureContext)return;
    const reg=await navigator.serviceWorker.getRegistration('/');if(!reg)return;
    const sub=await reg.pushManager.getSubscription();
    try{await setBinding(null);}catch{await reg.unregister();}
    if(sub){try{await api('/push/inscricoes',{method:'DELETE',body:{endpoint:sub.endpoint}});}finally{await sub.unsubscribe();if(state.ui.push)state.ui.push.active=false;}}
    for(const item of await reg.getNotifications())item.close();
  }
  async function logout(){try{await disable({logout:true});}catch{}finally{stop();}}
  document.addEventListener('click',event=>{
    const target=event.target.closest('[data-push]');if(!target||!user||state.ui.push.busy)return;
    const action=target.dataset.push,p=state.ui.push,current=epoch;p.busy=true;p.error=null;update();
    void (async()=>{
      try{
        if(action==='enable'){
          if(!p.available)return;
          const permission=await Notification.requestPermission();if(current!==epoch)return;
          if(permission!=='granted')throw Error(permission==='denied'?'Os avisos foram bloqueados. Você pode alterar essa permissão nas configurações do navegador.':'A permissão não foi concedida. A central interna continua disponível.');
          const reg=await worker();let sub=await reg.pushManager.getSubscription();if(sub){await setBinding(null);await sub.unsubscribe();}
          const bytes=Uint8Array.from(atob(p.publicKey.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(p.publicKey.length/4)*4,'=')),c=>c.charCodeAt(0));
          sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});
          try{const saved=await api('/push/inscricoes',{method:'POST',body:{...sub.toJSON(),chave_publica:p.publicKey}});if(current!==epoch){await sub.unsubscribe();return;}await setBinding(saved.vinculo);p.active=true;toast('Avisos ativados neste dispositivo.');}
          catch(error){await sub.unsubscribe();throw error;}
        }else if(action==='disable'){await disable();p.active=false;toast('Avisos desativados neste dispositivo.');}
        else if(action==='test'){const result=await api('/push/teste',{method:'POST'});toast(result.mensagem);}
        if(current===epoch)await refresh();
      }catch(error){if(current===epoch)p.error=error.message;}
      finally{if(current===epoch){p.busy=false;update();}}
    })();
  });
  navigator.serviceWorker?.addEventListener('message',event=>{if(event.data?.tipo==='fieldiq-notificacao'&&Number.isInteger(event.data.id))void onNotification(event.data.id);});
  return {start,stop,logout,refresh};
}
