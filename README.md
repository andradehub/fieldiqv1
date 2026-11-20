# FieldIQ — chamados de elevadores com histórico e recorrência

Dashboard para técnicos, supervisores e Administrativo / RH: chamados, locais, equipamentos, indicadores operacionais, equipes e assistência baseada em atendimentos anteriores.

## Interface e pesquisa de UX/UI

O redesign preserva o roxo e o laranja e reorganiza as dez áreas da aplicação. Inclui fonte Inter local, ícones Lucide, tabelas adaptadas para cartões, paginação, formulários em etapas e detalhes do chamado em abas.

A pesquisa documental e as decisões de indicadores, navegação e responsividade estão em [docs/PESQUISA-UX-UI.md](docs/PESQUISA-UX-UI.md). O frontend está separado em core, components e views; os estilos em tokens, layout, components e views.

As consultas são isoladas por zona na API: técnicos e supervisores acessam a própria zona. O Administrativo / RH tem visão de todas as zonas. A pesquisa de migração está em [docs/MIGRACAO-E-SISTEMAS-DO-SETOR.md](docs/MIGRACAO-E-SISTEMAS-DO-SETOR.md).

## Executar no computador

Requisito: Node.js 22 ou superior.

```powershell
npm ci
npm start
```

Abra http://127.0.0.1:4173. No Windows, também é possível executar `INICIAR-FIELDIQ.cmd` na pasta do repositório.

Na primeira execução são criados dez zonas, onze contas (dez colaboradores e um cliente), cinco locais, seis elevadores e dezessete chamados fictícios. As datas são relativas à primeira inicialização. As execuções seguintes preservam os registros e as alterações.

| Perfil | Login local | Senha local |
| --- | --- | --- |
| Técnico — Barra da Tijuca | tecnico.capital | tk2026 |
| Supervisor — Barra da Tijuca | supervisor.capital | tk2026 |
| Técnico — Niterói | tecnico.interior | tk2026 |
| Supervisor — Niterói | supervisor.interior | tk2026 |
| Administrativo / RH — todas as zonas | administrativo | tk2026 |
| Cliente — local da Barra | cliente.barra | tk2026 |

Os acessos rápidos são exclusivos da demonstração local. Em PostgreSQL remoto, defina sua própria `DEMO_PASSWORD` e informe-a no formulário de login.

## Banco real

O modo local usa **PostgreSQL compilado para WebAssembly (PGlite)** no servidor Node, com armazenamento em disco na pasta `.fieldiq/data`. Não é um array no navegador nem uma simulação de SQL. É uma distribuição embutida do PostgreSQL, diferente de um serviço PostgreSQL convencional separado. Veja a [documentação do PGlite](https://pglite.dev/docs/about) e sua [persistência no sistema de arquivos](https://pglite.dev/docs/filesystems).

O mesmo esquema e as consultas podem usar um serviço PostgreSQL convencional por `DATABASE_URL`, incluindo um PostgreSQL hospedado no Supabase. Não são usados Supabase Auth, SDK ou tabelas do antigo exemplo.

- Esquema: `database/001-schema.sql` a `database/005-responsabilidade.sql`, dentro do schema PostgreSQL `fieldiq`.
- Relacionamento central: `zonas → locais → elevadores → chamados → historico_chamados`.
- Pessoas se relacionam com zona, responsabilidade pelos chamados e autoria das alterações.
- Senhas possuem hash scrypt; sessões usam token aleatório com apenas o hash no banco.
- Alterações e eventos de histórico são gravados na mesma transação.
- Métricas de tempo e SLA vêm da view `vw_chamados_metricas`.

O supervisor pode abrir **Banco de Dados** para consultar tabelas, colunas e SQL, além de exportar os registros da própria zona. Essa consulta não permite SQL arbitrário, não mostra senhas/sessões, CPF ou contatos pessoais e não substitui um backup completo. Anexos binários não fazem parte da exportação de domínio. O Administrativo consulta todas as zonas.

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

| Ação | Técnico | Supervisor | Administrativo / RH |
| --- | --- | --- | --- |
| Consultar chamados/equipamentos | Própria zona | Própria zona | Todas as zonas |
| Editar, iniciar, pausar e concluir | Chamado atribuído a ele | Própria zona | Todas as zonas |
| Criar, atribuir, reabrir e cancelar | Não | Própria zona | Todas as zonas |
| Anexar fotos/documentos | Próprios chamados | Própria zona | Todas as zonas |
| Cadastrar local/elevador e importar chamados | Não | Própria zona | Todas as zonas |
| Cadastrar/editar técnicos | Não | Própria zona, sem transferir | Todas as zonas |
| Cadastrar/editar supervisores e transferir zonas | Não | Não | Sim |
| Consultar tabelas/exportar SQL | Não | Própria zona | Todas as zonas |
| Migrar cadastros e histórico de outro sistema | Não | Não | Sim |

O servidor verifica as regras em cada operação. Encerramento exige solução; a gestão pode reabrir. Revisões impedem gravações concorrentes de versões antigas. Transferir ou desativar um técnico exige reatribuir os chamados pendentes. Mudanças de senha, perfil, zona ou desativação revogam sessões do usuário afetado.

### Cadastro de colaboradores

A Gestão de usuários inclui nome completo, matrícula, perfil, zona, cargo, CPF, e-mail comercial, telefone, admissão, usuário, senha e situação ativo/inativo. O CPF é validado por dígitos verificadores e aparece mascarado na listagem. Não há consulta de regularidade na Receita. Contatos e CPF não são enviados no catálogo operacional compartilhado com técnicos. Novas senhas têm no mínimo 12 caracteres e são armazenadas com scrypt. O primeiro perfil Administrativo é criado pelo comando de configuração; não há promoção para esse perfil na tela de cadastro. Cargos são selecionados a partir de listas por perfil, incluindo Estagiário de campo. A pesquisa e as regras estão em [docs/CARGOS-E-PORTAL.md](docs/CARGOS-E-PORTAL.md).

Cliques fora do cadastro não fecham o diálogo. Fechar ou usar Esc mantém um rascunho em memória da sessão; salvar, descartar, sair da conta ou recarregar a página limpa o rascunho. Dados sensíveis do formulário não são guardados em localStorage.

### Horários, SLA e indicadores

- Iniciar/retomar cria um período de trabalho com horário do servidor e grava o primeiro início. Outros técnicos da mesma zona podem participar do chamado sem trocar o responsável principal. Pausar encerra somente o período de quem acionou. A conclusão, pelo responsável principal ou pela gestão, grava a solução e fecha todos os períodos ativos.
- SLA de resolução: prazo em horas corridas desde a abertura. Pausas não suspendem o prazo; reabrir não altera a abertura nem concede prazo novo.
- Tempo de resolução: encerramento menos abertura. A média considera chamados resolvidos no recorte de abertura escolhido no painel.
- Trabalho registrado: soma dos períodos de cada participante, excluindo pausas. Duas pessoas por uma hora somam duas horas de trabalho, enquanto o tempo do chamado permanece uma hora. É mostrado no detalhe, separado do tempo de resolução.
- SLA cumprido: resolvidos dentro do prazo dividido pelo total de resolvidos no recorte. Pendentes vencidos aparecem no contador de atrasos.
- Taxa de resolução: resolvidos dividido pelos chamados não cancelados no mesmo recorte. Cancelados não entram nesse denominador.
- Após ações, os dados são recarregados do banco. O painel e as listagens em repouso se atualizam a cada 30 segundos; os contadores do detalhe avançam a cada segundo. Formulários em edição não são substituídos automaticamente.

### Fotos e documentos

A aba Anexos aceita JPG/JPEG, PNG, WebP, PDF, TXT, CSV, DOCX e XLSX. Limites: 2 MB por arquivo; 20 arquivos e 20 MB por chamado. O servidor verifica conteúdo e extensão, permissões, duplicidade e tamanho. Fotos têm miniatura proporcional e visualizador ampliado com zoom; documentos são baixados. Arquivos são persistidos como bytea no PostgreSQL e não ficam disponíveis como caminhos públicos. Inclusão e exclusão ficam no histórico com autoria. O técnico responsável exclui apenas os anexos que enviou; a gestão pode excluir os anexos do seu escopo. A IA continua usando o texto dos chamados e das soluções, sem leitura automática dos anexos.

## Assistente de diagnóstico

O caso demonstrativo principal é o chamado **#5**, no elevador **BAR-001**, no Condomínio Parque da Barra. Existem quatro ocorrências anteriores semelhantes nesse equipamento.

A análise local:

1. Recupera atendimentos anteriores da mesma zona, excluindo o próprio chamado e registros posteriores à sua abertura.
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

O código do elevador e o técnico devem pertencer à mesma zona, dentro do escopo do usuário. O sistema relata linhas inválidas e duplicadas. Limites: 500 linhas e 2 MB no arquivo da interface. Existe um exemplo para download na tela de importação.

A migração completa preserva cadastros relacionados e datas originais em uma transação. O Administrativo seleciona **Migrar cadastros e histórico**, valida um pacote JSON e confirma a importação. O exemplo completo é fictício. Para CSVs de várias tabelas, há conversor com mapeamento de colunas e valores. Consulte [o guia de migração e a pesquisa do setor](docs/MIGRACAO-E-SISTEMAS-DO-SETOR.md).

### Assumir e liberar chamados

Pausar mantém a responsabilidade. **Liberar chamado** remove o responsável, pausa os períodos ativos da equipe e deixa o registro Aberto, sem concluir nem reiniciar o SLA. Outro técnico da mesma zona pode escolher **Assumir chamado** e iniciar o próprio atendimento. A gestão também pode desatribuir pelo formulário; Não atribuído em um chamado em andamento normaliza o status para Aberto. Registros antigos com essa inconsistência são ajustados na migração 005.

No celular, todos os filtros de situação ficam visíveis em uma grade, incluindo Cancelados. As abas de detalhe também se reorganizam, e os filtros completos ocupam a largura disponível em telas pequenas.

## Portal do cliente

O endereço `/cliente.html` apresenta uma interface própria, com locais e elevadores vinculados, solicitações pendentes e atendimentos concluídos da conta. O Administrativo cadastra clientes e vincula os locais na Gestão de usuários.

O cliente envia uma solicitação, que fica aguardando triagem. O supervisor da zona ou o Administrativo define prioridade, prazo e responsável, ou retorna com justificativa. Ao aceitar, a abertura original é preservada no SLA. O cliente acompanha o andamento sem ver informações internas de produtividade, diagnóstico ou equipe. Lembretes ficam registrados na fila interna, com intervalo mínimo de uma hora por solicitação; não são enviados e-mails.

## Base fictícia completa para importar

Baixe [demonstracao-fieldiq.json](fieldiqarchives/public/demonstracao-fieldiq.json) ou use o botão na tela de migração. Inclui 10 zonas, 40 colaboradores com avatares ilustrados, contatos e cargos, 20 locais, 40 elevadores, 160 chamados e registros de equipe e trabalho. Não foi importada automaticamente na base existente. Entre como Administrativo, selecione **Importar dados → Migrar cadastros e histórico**, valide e confirme. As contas migradas ficam inativas até definir senha e ativação. Mais detalhes em [docs/CARGOS-E-PORTAL.md](docs/CARGOS-E-PORTAL.md).

## Publicar novamente

A demonstração local está pronta para execução; nenhuma conta antiga no Supabase ou Vercel precisa ser apagada. A configuração da publicação está em `vercel.json` e `api/index.mjs`.

Para Vercel:

1. Selecione a **raiz do repositório**, com framework **Other**. O comando `npm run build` prepara a interface em `public/`.
2. Configure `DATABASE_URL` de um PostgreSQL hospedado com conexão TLS válida. Não use o PGlite em disco efêmero de função serverless. Se o provedor oferecer pool de conexões compatível, use o endereço recomendado por ele.
3. Para demonstração fictícia, configure `DEMO_MODE=1` e uma `DEMO_PASSWORD` própria. Os dados iniciais são criados se a tabela de pessoas estiver vazia; a conta Administrativo da demonstração também é acrescentada na atualização de uma base demonstrativa anterior. Migrações de esquema preservam os registros existentes.
4. Para uma base sem demonstração, use `DEMO_MODE=0`. Crie o primeiro Administrativo com `npm run admin:create` em ambiente apontado ao mesmo banco, configurando `ADMIN_LOGIN`, `ADMIN_NAME`, `ADMIN_PASSWORD` (12 a 200 caracteres) e, opcionalmente, `ADMIN_REGISTRATION`. Cadastre zonas pelo pacote de migração antes de cadastrar colaboradores em uma base nova.
5. Publique e valide login, abertura e encerramento de um chamado e persistência após recarregar. A variante remota e o deploy não foram executados nesta implementação local.

As variáveis ficam no ambiente do servidor. Não coloque credenciais em HTML, no Git ou em arquivos de build. O schema `fieldiq` é acessado pela API do servidor, que aplica a autorização; não conceda acesso direto de escrita a visitantes.

## Verificação

```powershell
npm run check
npm test
npm run build
npm run test:browser
node test/browser-operations.mjs
node test/browser-followups.mjs
node test/browser-team.mjs
```

Os testes de API verificam autenticação, zonas, papéis, cadastro, atribuição, encerramento, SLA, concorrência, evidências, importação, exportação e persistência após fechar/reabrir o banco. Os testes de geração usam respostas simuladas: nenhuma chave nem chamada externa é necessária.

A suíte de interface usa Edge/Chromium, oito larguras entre 320 e 1440 px e dezessete verificações axe. WebKit é usado quando instalado para verificar a engine em dimensões de iPhone. Isso não substitui teste em aparelho físico nem certificação integral de acessibilidade. Os fluxos novos também são testados em 320, 390 e 834 px, incluindo WebKit, com verificações de acessibilidade nos formulários, anexos, migração e atendimento. Capturas e relatórios ficam em test-results/redesign, test-results/operations e test-results/followups. A suíte adicional cobre rascunhos, seleção de cargos, imagens proporcionais/zoom, a base de importação completa e o ciclo cliente–triagem no Edge e WebKit.

Para apresentar o projeto, veja [docs/APRESENTACAO-TCC.md](docs/APRESENTACAO-TCC.md).
