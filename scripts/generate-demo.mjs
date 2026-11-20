import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {JOB_TITLES} from '../fieldiqarchives/public/assets/js/core/jobs.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const zones=[['cap-01','capital','Zona 01','Centro'],['cap-02','capital','Zona 02','Copacabana'],['cap-03','capital','Zona 03','Tijuca'],['cap-04','capital','Zona 04','Barra da Tijuca'],['cap-05','capital','Zona 05','Botafogo'],['int-01','interior','Zona 01','Niterói'],['int-02','interior','Zona 02','Petrópolis'],['int-03','interior','Zona 03','Volta Redonda'],['int-04','interior','Zona 04','Campos dos Goytacazes'],['int-05','interior','Zona 05','Cabo Frio']];
const first=['Beatriz','Diego','Camila','Hugo','Lívia','Rafael','Isabela','Caio','Sofia','André','Helena','Lucas','Marina','Gustavo','Alice','Eduardo','Laura','Vinícius','Cecília','Daniel','Elisa','Gabriel','Luana','Felipe','Clara','Henrique','Yasmin','Pedro','Manuela','Thiago','Bianca','Leandro','Valentina','Otávio','Natália','Igor','Lorena','Samuel','Letícia','Davi'];
const last=['Almeida','Barbosa','Carvalho','Dias','Esteves','Freitas','Gomes','Henriques','Ibrahim','Junqueira'];
const pack={formato:'fieldiq-legado-v1',origem:'FieldIQ — operação fictícia completa v1',zonas:[],pessoas:[],locais:[],elevadores:[],chamados:[],historicos:[],equipes:[],atendimentos:[]};
const cpf=index=>{let s=String(900100000+index);for(let n=9;n<11;n++){let sum=0;for(let k=0;k<n;k++)sum+=Number(s[k])*(n+1-k);s+=(sum*10%11)%10;}return s;};
const baseline=Date.parse('2026-11-19T12:00:00-03:00'),iso=ms=>new Date(ms).toISOString();
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();
 for(const [z,zone]of zones.entries()){
  const [codigo,regiao,nome,local]=zone,zid='z'+z;pack.zonas.push({id:zid,codigo,regiao,nome,local});
  for(let t=0;t<4;t++){
   const i=z*4+t,role=t===0?'supervisor':'tecnico';
   const cargo=t===0?JOB_TITLES.supervisor[z%JOB_TITLES.supervisor.length]:t===3?'Estagiário de campo':t===1?JOB_TITLES.tecnico[z%3]:JOB_TITLES.tecnico[4+z%3];
   const foto=await page.evaluate(i=>{
    const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
    const skin=['#d9a27c','#b77b57','#8f5c43','#efc6a6'][i%4],back=['#e6ddf6','#dcecf3','#f5e4d6','#deeee5'][i%4];
    x.fillStyle=back;x.fillRect(0,0,128,128);x.fillStyle=i%2?'#30263e':'#352b27';x.beginPath();x.ellipse(64,52,28,33,0,0,Math.PI*2);x.fill();
    x.fillStyle=i%3?'#383267':'#d15b24';x.beginPath();x.ellipse(64,131,48,45,0,Math.PI,2*Math.PI);x.fill();x.fillStyle=skin;x.fillRect(55,77,18,22);x.beginPath();x.ellipse(64,57,23,29,0,0,Math.PI*2);x.fill();
    x.fillStyle='#27242c';for(const y of [55,73]){if(y===55){x.beginPath();x.arc(55,y,2,0,7);x.arc(73,y,2,0,7);x.fill();}else{x.strokeStyle='#714432';x.lineWidth=2;x.beginPath();x.arc(64,67,7,0.2,Math.PI-0.2);x.stroke();}}
    x.fillStyle=i%2?'#f5b23e':'#f2c658';x.beginPath();x.ellipse(64,36,29,19,0,Math.PI,2*Math.PI);x.fill();x.fillRect(32,33,64,6);x.fillStyle='#fff4ce';x.fillRect(61,18,6,14);
    x.strokeStyle='#f6c348';x.lineWidth=6;x.beginPath();x.moveTo(43,103);x.lineTo(43,128);x.moveTo(85,103);x.lineTo(85,128);x.stroke();return c.toDataURL('image/png');
   },i);
   pack.pessoas.push({id:'p'+i,matricula:'DEMO2-'+String(i+1).padStart(3,'0'),nome:first[i]+' '+last[z],role,cargo,zona_id:zid,cpf:cpf(i),email:'colaborador'+(i+1)+'@example.com',telefone:'(21) 00000-'+String(1000+i),admissao:'2025-'+String(1+i%10).padStart(2,'0')+'-10',login:'demonstracao.'+(i+1),foto});
  }
  for(let l=0;l<2;l++){
   const lid='local-'+z+'-'+l;pack.locais.push({id:lid,nome:(l?'Centro Empresarial ':'Residencial ')+['Horizonte','Aurora','Jardins','Marés','Primavera','Mirante','Serra','Ipê','Estrela','Brisa'][z]+' — fictício',endereco:'Rua de Demonstração, '+(100+z*10+l)+' — endereço fictício',bairro:local,zona_id:zid});
   for(let e=0;e<2;e++){
    const eid='e-'+z+'-'+l+'-'+e,ec='DEMO2-'+codigo.toUpperCase()+'-'+l+e;pack.elevadores.push({id:eid,codigo:ec,local_id:lid,fabricante:['Fabricante Alfa — fictício','Fabricante Beta — fictício'][e],modelo:e?'Serviço 750':'Social 600',numero_serie:'FICTICIO-'+ec,capacidade_kg:e?750:600});
    for(let k=0;k<4;k++){
     const id='c-'+eid+'-'+k,worker='p'+(z*4+1+k%2),open=baseline-[35,14,1,2][k]*86400000-(l*2+e)*3600000,status=k<2?'resolvido':k===2?'aberto':'em_andamento';
     const close=status==='resolvido'?open+(k===0&&z%3===0?30:3)*3600000:null,start=open+3600000;
     const row={id,elevador_id:eid,tecnico_id:worker,titulo:k===3?'Ruído intermitente na cabine':'Porta interrompe o fechamento',descricao:'Dados fictícios: '+(k===3?'ruído relatado na cabine durante deslocamento.':'sensor de presença da porta com comportamento intermitente no térreo.'),tipo_obra:z%4===0&&k===3?'mod_integral':'mod_parcial',prioridade:k===2&&z%3===0?'critica':k===3?'media':'alta',status,sla_horas:k<2?24:z%2?24:168,aberto_em:iso(open)};
     if(k!==2)row.iniciado_em=iso(start);
     if(close){row.resolvido_em=iso(close);row.solucao='Registro fictício: equipe identificou falha no conjunto de detecção da porta e documentou a correção e a validação do funcionamento.';}
     pack.chamados.push(row);pack.historicos.push({id:'h-'+id,chamado_id:id,usuario_id:'p'+(z*4),alteracao:'Registro fictício da operação anterior: chamado aberto e atribuído à equipe.',data:iso(open)});
     if(k!==2){
      const end=close??start+3600000;pack.atendimentos.push({id:'a-'+id,chamado_id:id,tecnico_id:worker,iniciado_em:iso(start),encerrado_em:iso(end)});
      pack.historicos.push({id:'hf-'+id,chamado_id:id,usuario_id:worker,alteracao:close?'Solução fictícia registrada e chamado encerrado.':'Inspeção fictícia pausada para acompanhamento da equipe.',data:iso(end)});
     }
     if(k===3){const intern='p'+(z*4+3);pack.equipes.push({id:'eq-'+id,chamado_id:id,tecnico_id:intern});pack.atendimentos.push({id:'ai-'+id,chamado_id:id,tecnico_id:intern,iniciado_em:iso(start+900000),encerrado_em:iso(start+2700000)});}
    }
   }
  }
 }
 await writeFile(path.join(root,'fieldiqarchives/public/demonstracao-fieldiq.json'),JSON.stringify(pack),'utf8');
 console.log(JSON.stringify({bytes:Buffer.byteLength(JSON.stringify(pack)),registros:Object.fromEntries(Object.entries(pack).filter(([,v])=>Array.isArray(v)).map(([k,v])=>[k,v.length]))}));
}finally{await browser.close();}
