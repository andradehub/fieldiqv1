import {readFile} from 'node:fs/promises';
import {hashPassword} from './auth.mjs';
import {JOB_TITLES} from '../fieldiqarchives/public/assets/js/core/jobs.js';
const avatars=JSON.parse(await readFile(new URL('./demo-avatars.json',import.meta.url),'utf8'));
const version='operacao-ampliada-v1';
const first=['Beatriz','Diego','Camila','Hugo','Lívia','Rafael','Isabela','Caio','Sofia','André','Helena','Lucas','Marina','Gustavo','Alice','Eduardo','Laura','Vinícius','Cecília','Daniel','Elisa','Gabriel','Luana','Felipe','Clara','Henrique','Yasmin','Pedro','Manuela','Thiago','Bianca','Leandro','Valentina','Otávio','Natália','Igor','Lorena','Samuel','Letícia','Davi'];
const last=['Almeida','Barbosa','Carvalho','Dias','Esteves','Freitas','Gomes','Henriques','Ibrahim','Junqueira'];
const places=['Horizonte','Aurora','Jardins','Marés','Primavera','Mirante','Serra','Ipê','Estrela','Brisa'];
function cpf(index){let value=String(900100000+index);for(let n=9;n<11;n++){let sum=0;for(let k=0;k<n;k++)sum+=Number(value[k])*(n+1-k);value+=(sum*10%11)%10;}return value;}
export async function seedDemoExtra(db,password,{fresh=false}={}){
  const initialized=(await db.query('SELECT versao FROM inicializacoes_demo WHERE versao=$1',[version])).rows.length;
  if(initialized)return {adicionada:false,motivo:'já inicializada'};
  const zones=(await db.query('SELECT * FROM zonas ORDER BY id')).rows;
  if(zones.length!==10)throw Error('A demonstração ampliada precisa das dez zonas do seed inicial.');
  const baseline=[['TK-CAP-001','Carlos Mendes','tecnico.capital'],['TK-CAP-002','Ana Ferreira','ana.capital'],['TK-CAP-003','Bruno Tavares','bruno.capital'],['TK-CAP-004','Patrícia Souza','patricia.capital'],['TK-CAP-SUP-01','Fernanda Lopes','supervisor.capital'],['TK-INT-001','Roberto Silva','tecnico.interior'],['TK-INT-002','Juliana Costa','juliana.interior'],['TK-INT-003','Marcos Oliveira','marcos.interior'],['TK-INT-SUP-01','Marcelo Andrade','supervisor.interior'],['ADM-DEMO-001','Alex Ribeiro','administrativo'],['CLI-DEMO-001','Cliente demonstração Barra','cliente.barra']];
  for(const [i,p]of baseline.entries())await db.query(`UPDATE pessoas SET foto=COALESCE(foto,$4),cpf=COALESCE(cpf,$5),email=COALESCE(email,$6),telefone=COALESCE(telefone,$7),admissao=COALESCE(admissao,'2025-01-10'::date)
    WHERE matricula=$1 AND nome=$2 AND login=$3`,[...p,avatars[i%avatars.length],cpf(100+i),'equipe.base.'+(i+1)+'@example.com','(21) 00000-'+String(1100+i)]);
  // An older demonstration may already contain this exact fictional catalogue.
  // Reuse it rather than duplicating calls or changing their dates/history.
  const existing=(await db.query("SELECT count(*)::int AS n FROM pessoas WHERE matricula LIKE 'DEMO2-%'")).rows[0].n;
  const lifts=(await db.query("SELECT count(*)::int AS n FROM elevadores WHERE codigo LIKE 'DEMO2-%'")).rows[0].n;
  if(existing===40&&lifts===40){await db.query('INSERT INTO inicializacoes_demo(versao) VALUES ($1)',[version]);return {adicionada:false,motivo:'base fictícia ampliada anterior preservada',camposVaziosComplementados:true};}
  if(existing||lifts)throw Error('Há uma demonstração parcial anterior. Confira os registros antes de ampliar a base.');
  const now=Date.now();
  for(const [z,zone]of zones.entries()){
    const workers=[];
    for(let t=0;t<4;t++){
      const i=z*4+t,mat='DEMO2-'+String(i+1).padStart(3,'0'),role=t===0?'supervisor':'tecnico',cargo=t===0?JOB_TITLES.supervisor[z%JOB_TITLES.supervisor.length]:t===3?'Estagiário de campo':t===1?JOB_TITLES.tecnico[z%3]:JOB_TITLES.tecnico[4+z%3];workers.push(mat);
      await db.query('INSERT INTO pessoas(matricula,nome,role,cargo,regiao,zona_id,cpf,email,telefone,admissao,login,foto,senha_hash) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',[mat,first[i]+' '+last[z],role,cargo,zone.regiao,zone.id,cpf(i),'colaborador'+(i+1)+'@example.com','(21) 00000-'+String(1000+i),'2025-'+String(1+i%10).padStart(2,'0')+'-10','demonstracao.'+(i+1),avatars[i],await hashPassword(password)]);
    }
    for(let l=0;l<2;l++){
      const local=(await db.query('INSERT INTO locais(nome,endereco,bairro,zona_id) VALUES ($1,$2,$3,$4) RETURNING id',[(l?'Centro Empresarial ':'Residencial ')+places[z]+' — fictício','Rua de Demonstração, '+(100+z*10+l)+' — endereço fictício',zone.local,zone.id])).rows[0].id;
      for(let e=0;e<2;e++){
        const code='DEMO2-'+zone.id.toUpperCase()+'-'+l+e;
        const lift=(await db.query('INSERT INTO elevadores(codigo,local_id,fabricante,modelo,numero_serie,capacidade_kg) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',[code,local,e?'Fabricante Beta — fictício':'Fabricante Alfa — fictício',e?'Serviço 750':'Social 600','FICTICIO-'+code,e?750:600])).rows[0].id;
        for(let k=0;k<4;k++){
          const open=new Date(now-[35,14,.1,2][k]*86400000-(l*2+e)*3600000),status=k<2?'resolvido':k===2?'aberto':'em_andamento',start=new Date(open.getTime()+3600000),close=k<2?new Date(open.getTime()+(k===0&&z%3===0?30:3)*3600000):null,tech=workers[1+k%2];
          const row=(await db.query(`INSERT INTO chamados(elevador_id,titulo,descricao,tipo_obra,prioridade,status,sla_horas,tecnico_matricula,aberto_em,iniciado_em,resolvido_em,solucao,criado_por)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,[lift,k===3?'Ruído intermitente na cabine':'Porta interrompe o fechamento','Dados fictícios: '+(k===3?'ruído relatado na cabine durante deslocamento.':'sensor de presença da porta com comportamento intermitente no térreo.'),z%4===0&&k===3?'mod_integral':'mod_parcial',k===2&&z%3===0?'A':k===3?'B':k===1&&z%2?'C':'A',status,k<2?24:z%2?24:168,tech,open.toISOString(),k===2?null:start.toISOString(),close?.toISOString()??null,close?'Registro fictício: equipe identificou falha no conjunto de detecção da porta e documentou a correção e a validação do funcionamento.':null,workers[0]])).rows[0].id;
          await db.query('INSERT INTO historico_chamados(chamado_id,usuario_matricula,alteracao,data) VALUES ($1,$2,$3,$4)',[row,workers[0],'Registro fictício: chamado aberto e atribuído à equipe.',open.toISOString()]);
          if(k!==2){const end=close??new Date(start.getTime()+3600000);await db.query('INSERT INTO atendimentos(chamado_id,tecnico_matricula,iniciado_em,encerrado_em) VALUES ($1,$2,$3,$4)',[row,tech,start.toISOString(),end.toISOString()]);await db.query('INSERT INTO historico_chamados(chamado_id,usuario_matricula,alteracao,data) VALUES ($1,$2,$3,$4)',[row,tech,close?'Solução fictícia registrada e chamado encerrado.':'Inspeção fictícia pausada para acompanhamento da equipe.',end.toISOString()]);}
          if(k===3){await db.query('INSERT INTO equipe_chamado(chamado_id,tecnico_matricula,adicionado_por) VALUES ($1,$2,$3)',[row,workers[3],workers[0]]);await db.query('INSERT INTO atendimentos(chamado_id,tecnico_matricula,iniciado_em,encerrado_em) VALUES ($1,$2,$3,$4)',[row,workers[3],new Date(start.getTime()+900000).toISOString(),new Date(start.getTime()+2700000).toISOString()]);}
        }
      }
    }
  }
  if(fresh){
    await db.query("UPDATE chamados c SET criado_por='ADM-DEMO-001' FROM vw_chamados_metricas v,pessoas p WHERE v.id=c.id AND p.matricula=c.criado_por AND p.role='supervisor' AND p.zona_id<>v.zona_id");
    await db.query("UPDATE historico_chamados h SET usuario_matricula='ADM-DEMO-001' FROM vw_chamados_metricas c,pessoas p WHERE c.id=h.chamado_id AND p.matricula=h.usuario_matricula AND p.role='supervisor' AND p.zona_id<>c.zona_id");
  }
  await db.query('INSERT INTO inicializacoes_demo(versao) VALUES ($1)',[version]);
  return {adicionada:true,pessoas:40,locais:20,elevadores:40,chamados:160};
}
