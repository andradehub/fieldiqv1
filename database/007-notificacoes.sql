CREATE TABLE notificacoes (
  id serial PRIMARY KEY,
  usuario_matricula text NOT NULL REFERENCES pessoas(matricula),
  perfil_destinatario text NOT NULL,
  zona_id text REFERENCES zonas(id),
  chamado_id integer REFERENCES chamados(id),
  solicitacao_id integer REFERENCES solicitacoes_clientes(id),
  ator_matricula text REFERENCES pessoas(matricula),
  tipo text NOT NULL,
  titulo text NOT NULL,
  mensagem text NOT NULL,
  gravidade text NOT NULL DEFAULT 'info' CHECK (gravidade IN ('info','atencao','critica')),
  chave text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  lido_em timestamptz,
  UNIQUE(usuario_matricula,chave)
);
CREATE INDEX notificacoes_destinatario ON notificacoes(usuario_matricula,id DESC);
CREATE INDEX notificacoes_nao_lidas ON notificacoes(usuario_matricula,id DESC) WHERE lido_em IS NULL;
