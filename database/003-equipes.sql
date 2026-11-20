CREATE TABLE equipe_chamado (
  chamado_id integer NOT NULL REFERENCES chamados(id),
  tecnico_matricula text NOT NULL REFERENCES pessoas(matricula),
  adicionado_por text NOT NULL REFERENCES pessoas(matricula),
  adicionado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(chamado_id,tecnico_matricula)
);
DROP INDEX atendimento_aberto_por_chamado;
CREATE UNIQUE INDEX atendimento_aberto_por_tecnico ON atendimentos(chamado_id,tecnico_matricula) WHERE encerrado_em IS NULL;
ALTER VIEW vw_chamados_metricas RENAME TO vw_chamados_metricas_base;
CREATE VIEW vw_chamados_metricas AS
SELECT c.*,ARRAY(SELECT e.tecnico_matricula FROM equipe_chamado e WHERE e.chamado_id=c.id ORDER BY e.adicionado_em,e.tecnico_matricula) AS equipe_matriculas
FROM vw_chamados_metricas_base c;
