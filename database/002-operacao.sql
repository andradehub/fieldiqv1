ALTER TABLE pessoas DROP CONSTRAINT IF EXISTS pessoas_role_check;
ALTER TABLE pessoas ADD CONSTRAINT pessoas_role_check CHECK (role IN ('tecnico','supervisor','administrativo'));
ALTER TABLE pessoas ALTER COLUMN regiao DROP NOT NULL;
ALTER TABLE pessoas ADD COLUMN cpf text;
ALTER TABLE pessoas ADD COLUMN email text;
ALTER TABLE pessoas ADD COLUMN telefone text;
ALTER TABLE pessoas ADD COLUMN admissao date;
ALTER TABLE pessoas ADD COLUMN criado_em timestamptz NOT NULL DEFAULT now();
CREATE UNIQUE INDEX pessoas_cpf_unique ON pessoas(cpf) WHERE cpf IS NOT NULL;
CREATE UNIQUE INDEX pessoas_email_unique ON pessoas(lower(email)) WHERE email IS NOT NULL;

CREATE TABLE auditoria_usuarios (
  id serial PRIMARY KEY,
  usuario_matricula text NOT NULL REFERENCES pessoas(matricula),
  alvo_matricula text NOT NULL REFERENCES pessoas(matricula),
  acao text NOT NULL,
  data timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE chamados ADD COLUMN iniciado_em timestamptz;
CREATE TABLE atendimentos (
  id serial PRIMARY KEY,
  chamado_id integer NOT NULL REFERENCES chamados(id),
  tecnico_matricula text NOT NULL REFERENCES pessoas(matricula),
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  encerrado_em timestamptz,
  CHECK (encerrado_em IS NULL OR encerrado_em >= iniciado_em)
);
CREATE UNIQUE INDEX atendimento_aberto_por_chamado ON atendimentos(chamado_id) WHERE encerrado_em IS NULL;
CREATE INDEX atendimentos_chamado ON atendimentos(chamado_id);
CREATE TABLE anexos_chamados (
  id serial PRIMARY KEY,
  chamado_id integer NOT NULL REFERENCES chamados(id),
  usuario_matricula text NOT NULL REFERENCES pessoas(matricula),
  nome text NOT NULL,
  tipo text NOT NULL,
  tamanho integer NOT NULL CHECK (tamanho > 0 AND tamanho <= 2097152),
  sha256 text NOT NULL,
  conteudo bytea NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE(chamado_id,sha256)
);
CREATE TABLE migracoes_legado (
  id serial PRIMARY KEY,
  origem text NOT NULL,
  fingerprint text NOT NULL UNIQUE,
  usuario_matricula text NOT NULL REFERENCES pessoas(matricula),
  resumo jsonb NOT NULL,
  data timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE referencias_legado (
  origem text NOT NULL,
  entidade text NOT NULL,
  id_legado text NOT NULL,
  id_destino text NOT NULL,
  dados_hash text NOT NULL,
  PRIMARY KEY(origem,entidade,id_legado)
);

DROP VIEW vw_chamados_metricas;
CREATE VIEW vw_chamados_metricas AS
SELECT c.*, e.codigo AS elevador_codigo, e.modelo AS elevador_modelo,
       l.id AS local_id, l.nome AS local_nome, l.bairro, l.endereco,
       l.zona_id, z.regiao,
       CASE WHEN c.status = 'resolvido'
         THEN c.resolvido_em <= c.aberto_em + c.sla_horas * interval '1 hour'
         ELSE NULL END AS sla_cumprido,
       CASE WHEN c.status IN ('aberto','em_andamento')
         THEN now() > c.aberto_em + c.sla_horas * interval '1 hour'
         ELSE false END AS sla_vencido,
       CASE WHEN c.status = 'resolvido'
         THEN round(extract(epoch FROM (c.resolvido_em - c.aberto_em)) / 60)::integer
         ELSE NULL END AS tempo_resolucao_min,
       CASE WHEN c.status IN ('aberto','em_andamento')
         THEN greatest(0,extract(epoch FROM (now() - c.aberto_em)) / 60)
         ELSE NULL END AS tempo_decorrido_min,
       (SELECT min(a.iniciado_em) FROM atendimentos a WHERE a.chamado_id=c.id AND a.encerrado_em IS NULL) AS atendimento_ativo_desde,
       (SELECT COALESCE(sum(extract(epoch FROM (COALESCE(a.encerrado_em,now()) - a.iniciado_em))),0) FROM atendimentos a WHERE a.chamado_id=c.id) AS tempo_atendimento_seg,
       (SELECT count(*)::integer FROM anexos_chamados a WHERE a.chamado_id=c.id) AS total_anexos
FROM chamados c
JOIN elevadores e ON e.id=c.elevador_id
JOIN locais l ON l.id=e.local_id
JOIN zonas z ON z.id=l.zona_id;
