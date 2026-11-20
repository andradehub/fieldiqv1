ALTER TABLE pessoas DROP CONSTRAINT pessoas_role_check;
ALTER TABLE pessoas ADD CONSTRAINT pessoas_role_check CHECK (role IN ('tecnico','supervisor','administrativo','cliente'));
CREATE TABLE cliente_locais (
  cliente_matricula text NOT NULL REFERENCES pessoas(matricula),
  local_id integer NOT NULL REFERENCES locais(id),
  PRIMARY KEY(cliente_matricula,local_id)
);
CREATE TABLE solicitacoes_clientes (
  id serial PRIMARY KEY,
  cliente_matricula text NOT NULL REFERENCES pessoas(matricula),
  elevador_id integer NOT NULL REFERENCES elevadores(id),
  titulo text NOT NULL,
  descricao text NOT NULL,
  status text NOT NULL DEFAULT 'aguardando_triagem' CHECK (status IN ('aguardando_triagem','aceita','recusada')),
  aberto_em timestamptz NOT NULL DEFAULT now(),
  triado_em timestamptz,
  triado_por text REFERENCES pessoas(matricula),
  retorno text,
  chamado_id integer UNIQUE REFERENCES chamados(id),
  CHECK ((status='aguardando_triagem' AND triado_em IS NULL AND chamado_id IS NULL) OR (status='aceita' AND triado_em IS NOT NULL AND chamado_id IS NOT NULL) OR (status='recusada' AND triado_em IS NOT NULL AND retorno IS NOT NULL AND chamado_id IS NULL))
);
CREATE INDEX solicitacoes_cliente ON solicitacoes_clientes(cliente_matricula,aberto_em DESC);
CREATE TABLE lembretes_solicitacoes (
  id serial PRIMARY KEY,
  solicitacao_id integer NOT NULL REFERENCES solicitacoes_clientes(id),
  cliente_matricula text NOT NULL REFERENCES pessoas(matricula),
  data timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lembretes_solicitacao ON lembretes_solicitacoes(solicitacao_id,data DESC);
