-- ============================================================
--  FieldIQ — Schema para Supabase (PostgreSQL)
--  Execute este arquivo no SQL Editor do seu projeto Supabase
-- ============================================================

create extension if not exists "uuid-ossp";

create table zonas (
  id          text primary key,
  regiao      text not null check (regiao in ('capital','interior')),
  nome        text not null,
  local       text not null
);

create table pessoas (
  matricula   text primary key,
  nome        text not null,
  role        text not null check (role in ('tecnico','supervisor')),
  cargo       text not null,
  zona_id     text references zonas(id),
  foto_url    text,
  login       text unique,
  senha_hash  text
);

create table chamados (
  id                  bigserial primary key,
  titulo              text not null,
  descricao           text,
  tipo_obra           text not null check (tipo_obra in ('obra_nova','mod_integral','mod_parcial')),
  zona_id             text references zonas(id),
  prioridade          text not null default 'media' check (prioridade in ('baixa','media','alta','critica')),
  status              text not null default 'aberto' check (status in ('aberto','em_andamento','resolvido','cancelado')),
  sla_horas           int default 24,
  tecnico_matricula   text references pessoas(matricula),
  aberto_em           timestamptz default now(),
  resolvido_em        timestamptz,
  sla_cumprido        boolean,
  solucao             text,
  criado_por          text references pessoas(matricula)
);
-- Observação: "tempo de resolução" e "chamados abertos" NUNCA são armazenados como
-- número fixo — são sempre calculados a partir de aberto_em/resolvido_em e do status,
-- tanto no front-end quanto em qualquer consulta SQL (veja exemplo de VIEW abaixo).

create table historico_chamados (
  id                bigserial primary key,
  chamado_id        bigint references chamados(id) on delete cascade,
  usuario_nome      text not null,
  usuario_matricula text,
  alteracao         text not null,
  data              timestamptz default now()
);

create index idx_chamados_zona   on chamados(zona_id);
create index idx_chamados_status on chamados(status);
create index idx_pessoas_zona    on pessoas(zona_id);
create index idx_hist_chamado    on historico_chamados(chamado_id);

-- View auxiliar: calcula o tempo de resolução sempre dinamicamente (nunca fixo)
create or replace view vw_chamados_metricas as
select
  c.*,
  z.regiao,
  case when c.resolvido_em is not null
    then round(extract(epoch from (c.resolvido_em - c.aberto_em)) / 60)
    else null
  end as tempo_resolucao_min
from chamados c
join zonas z on z.id = c.zona_id;

alter table chamados enable row level security;
alter table pessoas  enable row level security;

-- Exemplo de policy: cada usuário só vê chamados da própria região (capital OU interior)
-- create policy "Visivel pela regiao do usuario"
--   on chamados for select
--   using (
--     zona_id in (
--       select z.id from zonas z
--       where z.regiao = (
--         select zz.regiao from zonas zz
--         join pessoas p on p.zona_id = zz.id
--         where p.login = auth.jwt() ->> 'email'
--       )
--     )
--   );
