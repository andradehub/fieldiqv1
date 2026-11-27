export class ApiError extends Error {
  constructor(message,status){super(message);this.status=status;}
}
export async function api(route,{method='GET',body,signal}={}){
  let response,data,timedOut=false;
  const controller=new AbortController(),cancel=()=>controller.abort();
  if(signal?.aborted)cancel();else signal?.addEventListener('abort',cancel,{once:true});
  const timer=setTimeout(()=>{timedOut=true;controller.abort();},30000);
  try{
    response=await fetch('/api'+route,{
      method,credentials:'same-origin',
      headers:body===undefined?{}:{'Content-Type':'application/json'},
      body:body===undefined?undefined:JSON.stringify(body),
      signal:controller.signal
    });
    data=await response.json();
  }catch(error){
    if(signal?.aborted)throw new ApiError('Consulta cancelada.',499);
    throw new ApiError(timedOut?'A consulta demorou mais que o esperado. Tente novamente.':'Não foi possível conectar. Verifique se o servidor está disponível.',0);
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
  if(signal?.aborted)throw new ApiError('Consulta cancelada.',499);
  if(response.status===401&&route!=='/auth/login')window.dispatchEvent(new Event('fieldiq:session-expired'));
  if(!response.ok)throw new ApiError(data.error??'Não foi possível concluir a operação.',response.status);
  return data;
}
