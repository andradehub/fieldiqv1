function binding(value,write=false){
  return new Promise((resolve,reject)=>{
    const open=indexedDB.open('fieldiq-push',1);
    open.onupgradeneeded=()=>open.result.createObjectStore('estado');
    open.onerror=()=>reject(open.error);
    open.onsuccess=()=>{
      const db=open.result,tx=db.transaction('estado',write?'readwrite':'readonly'),store=tx.objectStore('estado');
      const request=write?store.put(value,'vinculo'):store.get('vinculo');
      tx.oncomplete=()=>{const result=request.result;db.close();resolve(result);};tx.onerror=()=>{db.close();reject(tx.error);};
    };
  });
}
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('message',event=>{
  if(event.data?.tipo!=='fieldiq-vinculo'||!event.source?.url?.startsWith(self.location.origin+'/'))return;
  const value=event.data.vinculo;
  if(value!==null&&(typeof value!=='string'||!/^[a-f0-9]{48}$/.test(value)))return;
  event.waitUntil(binding(value,true).then(()=>event.ports[0]?.postMessage({ok:true})).catch(()=>event.ports[0]?.postMessage({ok:false})));
});
self.addEventListener('push',event=>{
  event.waitUntil((async()=>{
    let payload;try{payload=event.data?.json();}catch{return;}
    if(!Number.isInteger(payload?.id)||payload.id<1||!payload.vinculo||await binding()!==payload.vinculo)return;
    await self.registration.showNotification('FieldIQ',{
      body:'Há uma atualização na sua área. Abra o FieldIQ para consultar.',
      icon:'/assets/icons/icon-192.png',badge:'/assets/icons/badge-96.png',tag:'fieldiq-notificacao-'+payload.id,
      renotify:false,silent:true,data:{id:payload.id}
    });
  })());
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();const id=event.notification.data?.id;
  if(!Number.isInteger(id)||id<1)return;
  event.waitUntil((async()=>{
    const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const client=clients.find(c=>{const url=new URL(c.url);return url.origin===self.location.origin&&['/','/index.html'].includes(url.pathname);});
    if(client){await client.focus();client.postMessage({tipo:'fieldiq-notificacao',id});}
    else await self.clients.openWindow('/#notificacao/'+id);
  })());
});
// No fetch handler or application-data cache: private API responses and
// authenticated pages must not be retained by this service worker.
