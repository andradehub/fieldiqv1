CREATE TABLE inicializacoes_demo (
  versao text PRIMARY KEY,
  aplicada_em timestamptz NOT NULL DEFAULT now()
);
