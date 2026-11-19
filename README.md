# FieldIQ — chamados de elevadores com histórico e recorrência

Dashboard para técnicos e supervisores: chamados, locais, equipamentos, indicadores operacionais, equipes e assistência baseada em atendimentos anteriores.

## Interface e pesquisa de UX/UI

O redesign preserva o roxo e o laranja e reorganiza as oito áreas da aplicação. Inclui fonte Inter local, ícones Lucide, tabelas adaptadas para cartões, paginação, formulários em etapas e detalhes do chamado em abas.

A pesquisa documental e as decisões de indicadores, navegação e responsividade estão em [docs/PESQUISA-UX-UI.md](docs/PESQUISA-UX-UI.md). O frontend está separado em core, components e views; os estilos em tokens, layout, components e views.

A consulta continua seguindo as permissões atuais da API. O isolamento completo de consultas por zona foi reservado para a próxima etapa funcional.

## Executar no computador

Requisito: Node.js 22 ou superior.

```powershell
npm ci
npm start
```

Abra http://127.0.0.1:4173. No Windows, também é possível executar `INICIAR-FIELDIQ.cmd` na pasta do repositório.

Na primeira execução são criados dez zonas, nove colaboradores, cinco locais, seis elevadores e dezessete chamados fictícios. As datas são relativas à primeira inicialização. As execuções seguintes preservam os registros e as alterações.

| Perfil | Login local | Senha local |
| --- | --- | --- |
| Técnico — Barra da Tijuca | tecnico.capital | tk2026 |
| Supervisor — Barra da Tijuca | supervisor.capital | tk2026 |
| Técnico — Niterói | tecnico.interior | tk2026 |
| Supervisor — Niterói | supervisor.interior | tk2026 |

Os acessos rápidos são exclusivos da demonstração local. Em PostgreSQL remoto, defina sua própria `DEMO_PASSWORD` e informe-a no formulário de login.

## Banco real

O modo local usa **PostgreSQL compilado para WebAssembly (PGlite)** no servidor Node, com armazenamento em disco na pasta `.fieldiq/data`. Não é um array no navegador nem uma simulação de SQL. É uma distribuição embutida do PostgreSQL, diferente de um serviço PostgreSQL convencional separado. Veja a [documentação do PGlite](https://pglite.dev/docs/about) e sua [persistência no sistema de arquivos](https://pglite.dev/docs/filesystems).

O mesmo esquema e as consultas podem usar um serviço PostgreSQL convencional por `DATABASE_URL`, incluindo um PostgreSQL hospedado no Supabase. Não são usados Supabase Auth, SDK ou tabelas do antigo exemplo.

- Esquema: `database/001-schema.sql`, dentro do schema PostgreSQL `fieldiq`.
- Relacionamento central: `zonas → locais → elevadores → chamados → historico_chamados`.
- Pessoas se relacionam com zona, responsabilidade pelos chamados e autoria das alterações.
- Senhas possuem hash scrypt; sessões usam token aleatório com apenas o hash no banco.
- Alterações e eventos de histórico são gravados na mesma transação.
- Métricas de tempo e SLA vêm da view `vw_chamados_metricas`.

O supervisor pode abrir **Banco de Dados** para consultar tabelas, colunas e SQL, além de exportar os registros da própria região. Essa consulta não permite SQL arbitrário, não mostra senhas/sessões e não substitui um backup completo.

O PGlite local deve ser aberto por **um processo por vez**. A aplicação usa uma trava de processo. Encerre o servidor antes de rodar `npm run db:export`; com o servidor aberto, use a exportação da interface. O modo local é voltado à apresentação e ao desenvolvimento; uma publicação com múltiplas instâncias deve usar PostgreSQL remoto.

### PostgreSQL convencional opcional

Se houver Docker disponível:

```powershell
docker compose up -d
```

Copie `.env.example` para `.env` e configure, para este ambiente fictício local:

```dotenv
DATABASE_URL=postgresql://fieldiq:fieldiq_local_tcc@127.0.0.1:5432/fieldiq
DEMO_MODE=1
DEMO_PASSWORD=tk2026
```

Depois execute `npm run db:init` e `npm start`. O banco estará disponível para psql, pgAdmin ou DBeaver, no schema `fieldiq`. O banco local PGlite e esse serviço têm armazenamentos separados: essa troca de configuração não transfere dados automaticamente.

## Permissões

| Ação | Técnico | Supervisor |
| --- | --- | --- |
| Consultar chamados/equipamentos | Própria região | Própria região |
| Editar descrição e solução | Chamado atribuído a ele | Chamado da própria zona |
| Iniciar e encerrar atendimento | Chamado atribuído a ele | Chamado da própria zona |
| Criar, atribuir, reabrir e cancelar | Não | Própria zona |
| Cadastrar local/elevador e importar | Não | Própria zona |
| Administrar equipe | Não | Própria zona, com proteção de pendências |
| Consultar tabelas/exportar SQL | Não | Dados da própria região |

O servidor verifica essas regras em cada operação. Encerramento exige solução registrada; apenas o supervisor reabre um chamado. Revisões impedem que uma gravação antiga sobrescreva outra alteração. Cancelados são excluídos dos denominadores dos indicadores de resolução.

## Assistente de diagnóstico

O caso demonstrativo principal é o chamado **#5**, no elevador **BAR-001**, no Condomínio Parque da Barra. Existem quatro ocorrências anteriores semelhantes nesse equipamento.

A análise local:

1. Recupera atendimentos anteriores da mesma região, excluindo o próprio chamado e registros posteriores à sua abertura.
2. Calcula similaridade textual com TF-IDF e cosseno, complementada por termos de componentes.
3. Prioriza o mesmo elevador e distingue evidências de outros equipamentos.
4. Apresenta recorrências, intervalo entre ocorrências, soluções registradas e links para os atendimentos usados.
5. Registra a análise e permite que o responsável avalie sua utilidade.

O escore de recuperação **não é probabilidade de diagnóstico**. Frequência de soluções registradas não demonstra eficácia técnica. O sistema informa quando não há evidência suficiente.

### Síntese generativa opcional

A recuperação local já funciona sem serviço externo. Para acrescentar uma síntese por modelo de linguagem, configure no servidor:

```dotenv
OPENAI_API_KEY=sua-chave-no-ambiente-do-servidor
OPENAI_MODEL=gpt-5-mini
```

A chave nunca é enviada ao navegador. São enviados os sintomas e as evidências recuperadas, sem campos de login ou dados de autenticação. Textos livres dos chamados podem conter informações inseridas pelos usuários; revise-os antes de usar dados reais.

A integração usa a Responses API, saída estruturada, `store: false`, tempo limite e validação dos IDs citados. Em falha do provedor ou referências inválidas, a interface identifica o retorno à análise local. Consulte o [guia da API](https://developers.openai.com/api/docs/quickstart) e o [modelo de exemplo](https://developers.openai.com/api/docs/models/gpt-5-mini).

Uma conexão com ChatGPT/Codex não configura automaticamente a chave dessa API. A geração externa requer sua própria configuração e pode ter custos do provedor. Ela não foi chamada nos testes locais.

## Importação

JSON, CSV/TXT e Excel. O leitor Excel utiliza o CDN já presente na interface; sem conexão, use CSV ou JSON. O restante da aplicação e os gráficos locais não dependem desse leitor.

Obrigatórios: `titulo` e `elevador_codigo`, com o equipamento previamente cadastrado. Para registros resolvidos, são obrigatórios `solucao` e `resolvido_em`; informe também `aberto_em` para preservar o histórico. Use datas ISO 8601, com fuso, como `2026-11-01T10:00:00-03:00`.

O código do elevador e o técnico devem pertencer à zona do supervisor. O sistema relata linhas inválidas e duplicadas. Limites: 500 linhas e 2 MB no arquivo da interface. Existe um exemplo para download na tela de importação.

## Publicar novamente

A demonstração local está pronta para execução; nenhuma conta antiga no Supabase ou Vercel precisa ser apagada. A configuração da publicação está em `vercel.json` e `api/index.mjs`.

Para Vercel:

1. Selecione a **raiz do repositório**, com framework **Other**. O comando `npm run build` prepara a interface em `public/`.
2. Configure `DATABASE_URL` de um PostgreSQL hospedado com conexão TLS válida. Não use o PGlite em disco efêmero de função serverless. Se o provedor oferecer pool de conexões compatível, use o endereço recomendado por ele.
3. Para demonstração fictícia, configure `DEMO_MODE=1` e uma `DEMO_PASSWORD` própria. As tabelas e os dados serão inicializados somente se a tabela de pessoas estiver vazia.
4. Para uma base sem demonstração, use `DEMO_MODE=0`. Crie o primeiro supervisor com `npm run admin:create` em ambiente apontado ao mesmo banco, configurando `ADMIN_LOGIN`, `ADMIN_NAME`, `ADMIN_PASSWORD` (12+ caracteres), `ADMIN_REGION`, `ADMIN_ZONE` e, opcionalmente, `ADMIN_ZONE_NAME`.
5. Publique e valide login, abertura e encerramento de um chamado e persistência após recarregar. A variante remota e o deploy não foram executados nesta implementação local.

As variáveis ficam no ambiente do servidor. Não coloque credenciais em HTML, no Git ou em arquivos de build. O schema `fieldiq` é acessado pela API do servidor, que aplica a autorização; não conceda acesso direto de escrita a visitantes.

## Verificação

```powershell
npm run check
npm test
npm run build
npm run test:browser
```

Os testes de API verificam autenticação, regiões, atribuição, encerramento, SLA, concorrência, evidências, importação, exportação e persistência após fechar/reabrir o banco. Os testes de geração usam respostas simuladas: nenhuma chave nem chamada externa é necessária.

A suíte de interface usa Edge/Chromium, oito larguras entre 320 e 1440 px e treze verificações axe. WebKit é usado quando instalado para verificar a engine em dimensões de iPhone. Isso não substitui teste em aparelho físico nem certificação integral de acessibilidade. Capturas e relatórios ficam em test-results/redesign.

Para apresentar o projeto, veja [docs/APRESENTACAO-TCC.md](docs/APRESENTACAO-TCC.md).
