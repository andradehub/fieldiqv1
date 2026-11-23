export class ApiError extends Error {
  constructor(message,status){super(message);this.status=status;}
}
export async function api(route,{method='GET',body}={}){
  let response;
  try{
    response=await fetch('/api'+route,{
      method,credentials:'same-origin',
      headers:body===undefined?{}:{'Content-Type':'application/json'},
      body:body===undefined?undefined:JSON.stringify(body),
      signal:AbortSignal.timeout(30000)
    });
  }catch(error){
    throw new ApiError(error.name==='TimeoutError'?'A consulta demorou mais que o esperado. Tente novamente.':'Não foi possível conectar. Verifique se o servidor está disponível.',0);
  }
  const data=await response.json();
  if(response.status===401&&route!=='/auth/login')window.dispatchEvent(new Event('fieldiq:session-expired'));
  if(!response.ok)throw new ApiError(data.error??'Não foi possível concluir a operação.',response.status);
  return data;
}
