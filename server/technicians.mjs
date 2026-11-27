import {insist,isAdmin,canReadZone,text} from './permissions.mjs';
export function registerTechnicianRoutes(api,db){
  api.get('/tecnicos/:matricula',async(req,res)=>{
    const registration=text(req.params.matricula,'Matrícula',40);
    const person=(await db.query("SELECT matricula,nome,cargo,role,zona_id,foto,ativo FROM pessoas WHERE matricula=$1 AND role='tecnico'",[registration])).rows[0];
    insist(person&&canReadZone(req.user,person.zona_id)&&(req.user.role!=='tecnico'||req.user.matricula===registration),404,'Perfil não encontrado ou indisponível para sua conta.');
    const {rows}=await db.query(`SELECT c.*,c.tecnico_matricula AS tecnico,
      COALESCE((SELECT sum(extract(epoch FROM COALESCE(a.encerrado_em,now())-a.iniciado_em)) FROM atendimentos a WHERE a.chamado_id=c.id AND a.tecnico_matricula=$1),0) AS segundos_do_tecnico
      FROM vw_chamados_metricas c WHERE ($2::boolean OR c.zona_id=$3) AND
      (c.tecnico_matricula=$1 OR $1=ANY(c.equipe_matriculas) OR EXISTS(SELECT 1 FROM atendimentos a WHERE a.chamado_id=c.id AND a.tecnico_matricula=$1))
      ORDER BY c.aberto_em DESC,c.id DESC`,[registration,isAdmin(req.user),req.user.zona_id]);
    res.json({pessoa:person,chamados:rows});
  });
}
