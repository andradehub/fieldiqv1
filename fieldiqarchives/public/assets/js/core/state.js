export const state = {
  user:null, zonas:[], pessoas:[], locais:[], elevadores:[], chamados:[], importacoes:[],
  config:{demo:true,quickDemo:false}, updatedAt:null,
  ui:{
    route:'dashboard', period:'all', sidebar:false,
    filters:{search:'',status:'',priority:'',work:'',technician:'',equipment:''},
    assets:{tab:'elevadores',search:'',zone:''}, team:'mine',
    newTicket:{step:1,titulo:'',descricao:'',elevador_id:'',tipo_obra:'mod_parcial',prioridade:'media',sla_horas:24,tecnico:''},
    ticket:null, upload:null,
    database:{info:null,table:'chamados',data:null,search:'',error:null}
  }
};
export const routes = {
  dashboard:{label:'Visão geral',icon:'LayoutDashboard',section:'Operação'},
  chamados:{label:'Chamados',icon:'Tickets',section:'Operação'},
  novochamado:{label:'Novo chamado',icon:'CirclePlus',section:'Operação',supervisor:true},
  elevadores:{label:'Elevadores e locais',icon:'Building2',section:'Operação'},
  tecnicos:{label:'Equipe de campo',icon:'UsersRound',section:'Gestão'},
  importacao:{label:'Importar dados',icon:'Upload',section:'Gestão',supervisor:true},
  banco:{label:'Banco de dados',icon:'Database',section:'Sistema',supervisor:true},
  perfil:{label:'Meu perfil',icon:'UserRound',section:'Sistema'}
};
export const isSupervisor=()=>state.user?.role==='supervisor';
export const canEdit=ticket=>isSupervisor()?ticket.zona_id===state.user.zona_id:ticket.tecnico===state.user.matricula&&ticket.status!=='cancelado';
export const team=()=>state.pessoas.filter(p=>p.role==='tecnico'&&p.zona_id===state.user?.zona_id);
export const regionName=()=>state.user?.regiao==='capital'?'Capital · Rio de Janeiro':'Interior · Rio de Janeiro';
export const zoneName=id=>{const z=state.zonas.find(z=>z.id===id);return z?z.nome+' · '+z.local:'Sem zona vinculada';};
export const personName=id=>state.pessoas.find(p=>p.matricula===id)?.nome??'Não atribuído';
export function acceptData(data){
  state.user=data.user;
  for(const key of ['zonas','pessoas','locais','elevadores','chamados'])state[key]=data[key];
  state.importacoes=data.importacoes;
  state.updatedAt=new Date();
}
