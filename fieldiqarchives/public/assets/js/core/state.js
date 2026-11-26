export const state = {
  user:null, zonas:[], pessoas:[], locais:[], elevadores:[], chamados:[], solicitacoes:[],
  config:{demo:true,quickDemo:false}, updatedAt:null, usuarios:[],
  ui:{
    route:'dashboard', period:'all', sidebar:false,
    filters:{search:'',status:'',priority:'',work:'',technician:'',equipment:''},
    assets:{tab:'elevadores',search:'',zone:''}, team:'mine',
    newTicket:{step:1,titulo:'',descricao:'',elevador_id:'',tipo_obra:'mod_parcial',prioridade:'media',sla_horas:24,tecnico:''},
    ticket:null,
    database:{info:null,table:'chamados',data:null,search:'',error:null}
  }
};
export const routes = {
  dashboard:{label:'Visão geral',icon:'LayoutDashboard',section:'Operação'},
  chamados:{label:'Chamados',icon:'Tickets',section:'Operação'},
  novochamado:{label:'Novo chamado',icon:'CirclePlus',section:'Operação',supervisor:true},
  elevadores:{label:'Elevadores e locais',icon:'Building2',section:'Operação'},
  tecnicos:{label:'Equipe de campo',icon:'UsersRound',section:'Gestão'},
  usuarios:{label:'Gestão de usuários',icon:'UserRoundCog',section:'Gestão',supervisor:true},
  solicitacoes:{label:'Solicitações de clientes',icon:'Inbox',section:'Operação',supervisor:true},
  banco:{label:'Banco de dados',icon:'Database',section:'Sistema',supervisor:true},
  perfil:{label:'Meu perfil',icon:'UserRound',section:'Sistema'}
};
export const isAdmin=()=>state.user?.role==='administrativo';
export const isSupervisor=()=>['supervisor','administrativo'].includes(state.user?.role);
export const roleName=role=>({administrativo:'Administrativo / RH',supervisor:'Supervisor',tecnico:'Técnico de campo',cliente:'Cliente'})[role]??role;
export const isOnTicket=(ticket,matricula)=>ticket.tecnico===matricula||ticket.equipe_matriculas?.includes(matricula);
export const canClose=ticket=>isAdmin()||(isSupervisor()?ticket.zona_id===state.user.zona_id:ticket.tecnico===state.user.matricula&&ticket.status!=='cancelado');
export const canEdit=ticket=>canClose(ticket)||(state.user?.role==='tecnico'&&ticket.zona_id===state.user.zona_id&&['aberto','em_andamento'].includes(ticket.status)&&isOnTicket(ticket,state.user.matricula));
export const attendanceWorker=ticket=>state.user?.role==='tecnico'?state.user.matricula:ticket.tecnico;
export const team=()=>{const lift=state.elevadores.find(e=>String(e.id)===String(state.ui.newTicket.elevador_id));const zone=isAdmin()?(state.ui.ticket?.record.zona_id??lift?.zona_id):state.user?.zona_id;return state.pessoas.filter(p=>p.role==='tecnico'&&p.ativo&&p.zona_id===zone);};
export const regionName=()=>isAdmin()?'Todas as regiões':state.user?.regiao==='capital'?'Capital · Rio de Janeiro':'Interior · Rio de Janeiro';
export const zoneName=id=>{const z=state.zonas.find(z=>z.id===id);return z?z.nome+' · '+z.local:'Sem zona vinculada';};
export const personName=id=>state.pessoas.find(p=>p.matricula===id)?.nome??'Não atribuído';
export function acceptData(data){
  state.user=data.user;
  for(const key of ['zonas','pessoas','locais','elevadores','chamados'])state[key]=data[key];
  state.solicitacoes=data.solicitacoes??[];
  state.updatedAt=new Date();
}
