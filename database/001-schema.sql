-- PostgreSQL: mesmo esquema no modo local (PGlite) e no servidor PostgreSQL.
-- As tabelas ficam em fieldiq; nenhum dado do antigo esquema public e apagado.
CREATE SCHEMA IF NOT EXISTS fieldiq;
SET search_path TO fieldiq, public;

CREATE TABLE IF NOT EXISTS zonas (
  id text PRIMARY KEY,
  regiao text NOT NULL CHECK (regiao IN ('capital','interior')),
  nome text NOT NULL,
  local text NOT NULL
);
CREATE TABLE IF NOT EXISTS pessoas (
  matricula text PRIMARY KEY,
  nome text NOT NULL,
  role text NOT NULL CHECK (role IN ('tecnico','supervisor')),
  cargo text NOT NULL,
  regiao text NOT NULL CHECK (regiao IN ('capital','interior')),
  zona_id text REFERENCES zonas(id),
  login text UNIQUE,
  senha_hash text,
  foto text,
  ativo boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS locais (
  id serial PRIMARY KEY,
  nome text NOT NULL,
  endereco text NOT NULL,
  bairro text NOT NULL,
  zona_id text NOT NULL REFERENCES zonas(id)
);
CREATE TABLE IF NOT EXISTS elevadores (
  id serial PRIMARY KEY,
  codigo text NOT NULL UNIQUE,
  local_id integer NOT NULL REFERENCES locais(id),
  fabricante text NOT NULL,
  modelo text NOT NULL,
  numero_serie text NOT NULL UNIQUE,
  capacidade_kg integer NOT NULL CHECK (capacidade_kg > 0),
  ativo boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS chamados (
  id serial PRIMARY KEY,
  elevador_id integer NOT NULL REFERENCES elevadores(id),
  titulo text NOT NULL CHECK (length(trim(titulo)) BETWEEN 1 AND 200),
  descricao text NOT NULL DEFAULT '',
  tipo_obra text NOT NULL CHECK (tipo_obra IN ('obra_nova','mod_integral','mod_parcial')),
  prioridade text NOT NULL CHECK (prioridade IN ('baixa','media','alta','critica')),
  status text NOT NULL CHECK (status IN ('aberto','em_andamento','resolvido','cancelado')),
  sla_horas integer NOT NULL CHECK (sla_horas BETWEEN 1 AND 8760),
  tecnico_matricula text REFERENCES pessoas(matricula),
  aberto_em timestamptz NOT NULL DEFAULT now(),
  resolvido_em timestamptz,
  solucao text,
  criado_por text NOT NULL REFERENCES pessoas(matricula),
  revisao integer NOT NULL DEFAULT 1,
  chave_importacao text UNIQUE,
  CHECK (resolvido_em IS NULL OR resolvido_em >= aberto_em),
  CHECK (
    (status = 'resolvido' AND resolvido_em IS NOT NULL AND solucao IS NOT NULL AND length(trim(solucao)) > 0)
    OR (status <> 'resolvido' AND resolvido_em IS NULL)
  )
);
CREATE TABLE IF NOT EXISTS historico_chamados (
  id serial PRIMARY KEY,
  chamado_id integer NOT NULL REFERENCES chamados(id),
  usuario_matricula text NOT NULL REFERENCES pessoas(matricula),
  alteracao text NOT NULL,
  data timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS importacoes (
  id serial PRIMARY KEY,
  usuario_matricula text NOT NULL REFERENCES pessoas(matricula),
  nome text NOT NULL,
  formato text NOT NULL,
  importadas integer NOT NULL,
  erros integer NOT NULL,
  detalhes jsonb NOT NULL DEFAULT '[]',
  data timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessoes (
  token_hash text PRIMARY KEY,
  usuario_matricula text NOT NULL REFERENCES pessoas(matricula),
  expira_em timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS sugestoes_ia (
  id serial PRIMARY KEY,
  chamado_id integer NOT NULL REFERENCES chamados(id),
  fingerprint text NOT NULL,
  provedor text NOT NULL,
  resposta jsonb NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE(chamado_id, fingerprint)
);
CREATE TABLE IF NOT EXISTS avaliacoes_ia (
  id serial PRIMARY KEY,
  sugestao_id integer NOT NULL REFERENCES sugestoes_ia(id),
  usuario_matricula text NOT NULL REFERENCES pessoas(matricula),
  util boolean NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE(sugestao_id, usuario_matricula)
);
CREATE INDEX IF NOT EXISTS idx_chamados_elevador ON chamados(elevador_id, aberto_em DESC);
CREATE INDEX IF NOT EXISTS idx_chamados_tecnico ON chamados(tecnico_matricula, status);
CREATE INDEX IF NOT EXISTS idx_locais_zona ON locais(zona_id);
CREATE INDEX IF NOT EXISTS idx_historico_chamado ON historico_chamados(chamado_id, data);
CREATE INDEX IF NOT EXISTS idx_sessoes_expira ON sessoes(expira_em);

CREATE OR REPLACE VIEW vw_chamados_metricas AS
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
         ELSE NULL END AS tempo_resolucao_min
FROM chamados c
JOIN elevadores e ON e.id = c.elevador_id
JOIN locais l ON l.id = e.local_id
JOIN zonas z ON z.id = l.zona_id;
