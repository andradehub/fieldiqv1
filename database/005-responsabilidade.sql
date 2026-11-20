UPDATE atendimentos a SET encerrado_em=now()
WHERE a.encerrado_em IS NULL AND EXISTS(SELECT 1 FROM chamados c WHERE c.id=a.chamado_id AND c.status='em_andamento' AND c.tecnico_matricula IS NULL);
WITH ajustados AS (
  UPDATE chamados SET status='aberto',revisao=revisao+1
  WHERE status='em_andamento' AND tecnico_matricula IS NULL RETURNING id,criado_por
)
INSERT INTO historico_chamados(chamado_id,usuario_matricula,alteracao)
SELECT id,criado_por,'Ajuste automático de versão: chamado sem responsável retornou a Aberto, com prazos e histórico preservados.' FROM ajustados;
