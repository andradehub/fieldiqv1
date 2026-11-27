CREATE TABLE inscricoes_push (
  id serial PRIMARY KEY,
  usuario_matricula text NOT NULL REFERENCES pessoas(matricula),
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  chave_publica text NOT NULL,
  vinculo text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX inscricoes_push_usuario ON inscricoes_push(usuario_matricula);
CREATE TABLE entregas_push (
  id serial PRIMARY KEY,
  notificacao_id integer NOT NULL REFERENCES notificacoes(id),
  inscricao_id integer NOT NULL REFERENCES inscricoes_push(id) ON DELETE CASCADE,
  estado text NOT NULL DEFAULT 'pendente' CHECK (estado IN ('pendente','enviando','enviado','cancelado','falha')),
  tentativas integer NOT NULL DEFAULT 0,
  proxima_em timestamptz NOT NULL DEFAULT now(),
  reserva text,
  reserva_ate timestamptz,
  enviado_em timestamptz,
  erro_codigo text,
  UNIQUE(notificacao_id,inscricao_id)
);
CREATE INDEX entregas_push_pendentes ON entregas_push(proxima_em,id) WHERE estado IN ('pendente','enviando');
