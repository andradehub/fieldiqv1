# FieldIQ — gestão de chamados de elevadores

Aplicação web para registrar problemas em elevadores, organizar técnicos por zona, acompanhar atendimentos em equipe e apoiar o diagnóstico pela consulta de casos anteriores. Inclui uma área interna para técnicos, supervisores e Administrativo / RH e um portal separado para clientes.

O projeto usa PostgreSQL persistente, API Node.js / Express e interface HTML, CSS e JavaScript. A experiência prioriza celulares, preservando o uso em tablet e computador.

**Versão funcional atual:** [branch codex/banco-e-recorrencias](https://github.com/andradehub/fieldiqv1/tree/codex/banco-e-recorrencias). Consulte as [alterações em relação à main](https://github.com/andradehub/fieldiqv1/compare/main...codex/banco-e-recorrencias). A main ainda não contém todas as alterações desta etapa. Publicar esta branch não atualiza automaticamente a aplicação hospedada.

## Sumário

- [Executar o projeto](#executar-o-projeto)
- [Contas e dados de demonstração](#contas-e-dados-de-demonstração)
- [Perfis, zonas e permissões](#perfis-zonas-e-permissões)
- [Funções de cada área](#funções-de-cada-área)
- [Fluxo dos chamados e atendimento em equipe](#fluxo-dos-chamados-e-atendimento-em-equipe)
- [Tempos, SLA e indicadores](#tempos-sla-e-indicadores)
- [Anexos e visualização de imagens](#anexos-e-visualização-de-imagens)
- [Portal do cliente e triagem](#portal-do-cliente-e-triagem)
- [Identificação de recorrências](#identificação-de-recorrências)
- [Revisão dos pedidos e pendências](docs/REVISAO-DE-REQUISITOS.md)
- [Segurança e privacidade](docs/SEGURANCA-E-PRIVACIDADE.md)
- [Dados da demonstração e escopo atual](#dados-da-demonstração-e-escopo-atual)
- [Banco de dados e persistência](#banco-de-dados-e-persistência)
- [Configuração do ambiente](#configuração-do-ambiente)
- [Arquitetura, linguagens e arquivos](#arquitetura-linguagens-e-arquivos)
- [API e regras de autenticação](#api-e-regras-de-autenticação)
- [Testes e verificações](#testes-e-verificações)
- [Publicação](#publicação)
- [Solução de problemas](#solução-de-problemas)
- [Limites da versão](#limites-da-versão)
- [Histórico e manutenção no GitHub](#histórico-e-manutenção-no-github)

## Executar o projeto

### Requisitos

- Node.js **22 ou superior**, conforme `package.json`.
- npm, fornecido com o Node.js.
- Navegador atualizado.
- Git, para clonar o repositório.
- Docker é opcional e serve apenas para executar um PostgreSQL convencional separado.

A conexão com a internet é necessária para instalar as dependências. Depois da instalação, interface, ícones, fontes, gráficos e análise local do histórico funcionam sem uma API externa. A identificação de recorrências é local e não usa LLM.

### Obter a versão funcional

Execute na pasta/unidade em que deseja guardar o projeto:

```powershell
git clone --branch codex/banco-e-recorrencias https://github.com/andradehub/fieldiqv1.git
cd fieldiqv1
npm ci
npm start
```

Se o repositório já está no computador, execute `npm ci` e `npm start` na sua raiz, onde fica `package.json`.

- Área interna: [http://127.0.0.1:4173](http://127.0.0.1:4173).
- Portal do cliente: [http://127.0.0.1:4173/cliente.html](http://127.0.0.1:4173/cliente.html).
- No Windows, [INICIAR-FIELDIQ.cmd](INICIAR-FIELDIQ.cmd) instala dependências se necessário e inicia o servidor a partir da pasta correta.
- `Ctrl+C` no terminal encerra o servidor.
- `npm run dev` inicia o servidor com observação de alterações do Node.

Abrir `index.html` diretamente pelo explorador de arquivos não inicia a API nem o banco.

Para abrir em celulares e outros computadores da mesma rede no Windows:

1. Feche o servidor anterior com `Ctrl+C`, se estiver aberto.
2. Execute [INICIAR-FIELDIQ-REDE.cmd](INICIAR-FIELDIQ-REDE.cmd). Na primeira configuração do firewall, clique com o botão direito e escolha **Executar como administrador**. Nas próximas vezes, isso só será necessário se a configuração da rede mudar.
3. O inicializador mostra o endereço `http://IP-DO-COMPUTADOR:4173`. Abra esse endereço nos aparelhos conectados à mesma rede Wi-Fi ou cabo. Para clientes, acrescente `/cliente.html`.
4. Mantenha o computador ligado e a janela do servidor aberta. Cada acesso continua sujeito ao login e às permissões da aplicação. As contas fictícias da demonstração continuam disponíveis; use somente dados fictícios nesse modo HTTP local.

O [script de rede](scripts/local-network.ps1) identifica a conexão com gateway e vincula o servidor ao IPv4 dessa conexão. Cria ou atualiza apenas a regra `FieldIQ-LAN-TCP-4173`, limitada ao Node, à porta, ao endereço, à interface, ao perfil atual e à sub-rede IPv4 identificada. Não muda o perfil geral da rede nem desativa o firewall. O inicializador original continua usando o endereço local padrão. Isso disponibiliza uma demonstração na rede local; não publica o site na internet.

Para conferir o endereço sem iniciar o servidor nem alterar o firewall, execute `powershell -NoProfile -File scripts/local-network.ps1 -CheckOnly`. Se houver várias conexões com gateway, informe `-InterfaceIndex NUMERO`, consultando os índices com `Get-NetIPConfiguration`. É possível usar `-Port NUMERO`; o inicializador de rede usa `4173` por padrão, independentemente do `PORT` do `.env`. Para preparar somente o firewall, use `-ConfigureOnly` em PowerShell como administrador. Para desativar a regra posteriormente, use `-Disable` como administrador e feche o servidor. As opções operam apenas na regra da porta informada.

O IP pode mudar ao reconectar a rede; confira o endereço exibido em cada inicialização. No celular, `127.0.0.1` aponta para o próprio aparelho. Se não abrir, confira se ambos estão na mesma rede e se o roteador bloqueia a comunicação entre clientes (comum em redes de visitantes). O script não configura roteador, encaminhamento de portas ou acesso externo.

### Comandos disponíveis

| Comando | Finalidade |
| --- | --- |
| `npm ci` | Instalar as versões registradas em `package-lock.json`. |
| `npm start` | Executar a aplicação e carregar `.env`, quando existir. |
| `npm run dev` | Executar com reinicialização ao alterar o servidor. |
| `npm run build` | Gerar a interface e os recursos locais em `public/`. |
| `npm run check` | Verificar a sintaxe dos arquivos JavaScript da aplicação, API e scripts. |
| `npm test` | Executar os testes automatizados de API, dados, regras e lógica de apresentação. |
| `npm run test:browser` | Executar a suíte geral de interface. |
| `npm run db:init` | Inicializar/atualizar o esquema e informar a quantidade de chamados. |
| `npm run db:export` | Exportar dados de domínio para `.fieldiq/exports/fieldiq-dominio.sql`. |
| `npm run admin:create` | Criar uma conta Administrativo usando variáveis de ambiente. |
| `node test/browser-operations.mjs` | Verificar operações e filtros em celular/tablet. |
| `node test/browser-followups.mjs` | Verificar rascunhos, cargos, imagens, portal e triagem. |
| `node test/browser-review.mjs` | Verificar visual dos cabeçalhos, prioridades, Meus chamados, perfil detalhado e inclusão pela supervisão. |
| `node test/browser-team.mjs` | Verificar colaboração entre contas, conflito de edição, assumir e liberar. |

Scripts que acessam o PGlite local, como `db:init`, `db:export` e `admin:create`, devem ser usados com o servidor encerrado. A exportação da interface pode ser usada enquanto ele está aberto.

## Contas e dados de demonstração

Sem `DATABASE_URL`, o modo local cria dados fictícios e persiste as alterações em `.fieldiq/data`.

Na primeira inicialização da base demonstrativa são criadas **10 zonas, 11 contas — 10 colaboradores e 1 cliente —, 5 locais, 6 elevadores e 17 chamados**. As datas dessa base inicial são relativas à sua criação. Inicializações seguintes preservam os dados; migrações atualizam o esquema sem recriar os chamados.

| Perfil | Usuário local | Senha local | Escopo inicial |
| --- | --- | --- | --- |
| Técnico | `tecnico.capital` | `tk2026` | Barra da Tijuca, `cap-04`. |
| Supervisor | `supervisor.capital` | `tk2026` | Barra da Tijuca, `cap-04`. |
| Técnico | `tecnico.interior` | `tk2026` | Niterói, `int-01`. |
| Supervisor | `supervisor.interior` | `tk2026` | Niterói, `int-01`. |
| Administrativo / RH | `administrativo` | `tk2026` | Todas as zonas. |
| Cliente | `cliente.barra` | `tk2026` | Local demonstrativo da Barra. |

A tela interna oferece acessos rápidos para os perfis principais. Outros colaboradores, como Ana Ferreira, também possuem login na base fictícia; o conjunto está em [server/seed.mjs](server/seed.mjs). O portal oferece o acesso rápido do cliente.

As senhas acima pertencem apenas à demonstração local. Em banco remoto demonstrativo, configure sua própria `DEMO_PASSWORD`; os botões de entrada com senha local conhecida não são exibidos.

## Perfis, zonas e permissões

A cadeia de localização é **zona → local → elevador → chamado**. Cada técnico e supervisor pertence a uma zona. Capital e Interior são agrupamentos regionais; o limite de consulta operacional é a **zona**, não toda a região.

A API aplica a autorização em cada operação, inclusive nas consultas de anexos, recorrências e exportação. Esconder um botão na interface não é a única proteção.

| Operação | Técnico | Supervisor | Administrativo / RH | Cliente |
| --- | --- | --- | --- | --- |
| Consultar chamados e equipamentos | Própria zona. | Própria zona. | Todas as zonas. | Portal: elevadores vinculados e solicitações da própria conta. |
| Criar chamado interno | Não. | Própria zona. | Todas as zonas. | Envia uma solicitação para triagem. |
| Assumir chamado sem responsável | Para si, na própria zona. | Atribui um técnico pelo formulário. | Atribui um técnico pelo formulário. | Não. |
| Participar de atendimento | Própria conta, na mesma zona. | Gerencia participantes da zona. | Gerencia participantes de todas as zonas. | Não. |
| Editar detalhes e anexar evidências | Responsável ou participante autorizado de chamado aberto. | Própria zona. | Todas as zonas. | Sem acesso aos detalhes/anexos internos. |
| Iniciar e pausar trabalho | Próprio período, em chamado sob sua responsabilidade ou participação. | Pode operar o período do responsável principal. | Pode operar o período do responsável principal. | Não. |
| Concluir chamado | Somente o responsável principal. | Própria zona. | Todas as zonas. | Não. |
| Liberar responsabilidade | Somente o responsável principal. | Própria zona. | Todas as zonas. | Não. |
| Sair da equipe | Própria participação adicional. | Pode remover participantes da zona. | Pode remover participantes de todas as zonas. | Não. |
| Reabrir, cancelar e reatribuir | Não. | Própria zona. | Todas as zonas. | Não. |
| Cadastrar locais e elevadores | Não. | Própria zona. | Todas as zonas. | Não. |
| Cadastrar/editar técnicos | Não. | Somente consulta de contatos da própria zona, sem CPF ou login. | Todas as zonas. | Não. |
| Cadastrar/editar supervisores e transferir zonas | Não. | Não. | Sim. | Não. |
| Cadastrar clientes e vincular locais | Não. | Não. | Sim. | Não há cadastro público autônomo. |
| Fazer triagem das solicitações | Não. | Própria zona. | Todas as zonas. | Acompanha o retorno. |
| Consultar banco/exportar domínio | Não. | Própria zona. | Todas as zonas. | Não. |

O responsável técnico mantém a possibilidade de revisar descrição e solução de seu chamado resolvido; participantes adicionais deixam de ter edição quando ele é encerrado. Reabrir e cancelar continuam exclusivos da gestão.

## Funções de cada área

As áreas internas são exibidas conforme o perfil. O perfil detalhado é aberto pela Equipe de campo. O cliente usa outra interface.

| Área | Funções implementadas |
| --- | --- |
| **Visão geral** | Pendências, SLA cumprido, tempo médio e taxa de resolução; períodos de 7, 30 e 90 dias ou todo o histórico; evolução semanal; distribuição por status e zona; fila de atenção; carga da equipe; atalhos para chamados críticos, vencidos e sem responsável. |
| **Chamados** | Busca por número, título, descrição, equipamento e local; filtros de status, prioridade e classificação; recortes por técnico/participação, equipamento e prazo; paginação; cartões no celular; detalhes com abas Visão geral, Atendimento, Anexos e Histórico. |
| **Meus chamados** | Técnico: responsabilidade ou participação. Supervisor: chamados da zona supervisionada. Busca, filtros, ordenação nos dois sentidos e paginação. |
| **Perfil do técnico** | Equipe de campo → Ver perfil: indicadores, chamados associados, trabalho registrado, busca, situação, paginação e acesso a detalhes/histórico/anexos autorizados. |
| **Novo chamado** | Cadastro em três etapas: identificação, detalhes e revisão; seleção do elevador, título, descrição, classificação, prioridade, prazo e técnico da zona do equipamento. |
| **Elevadores e locais** | Consulta, busca e filtros; cadastro de local e equipamento; código, fabricante, modelo, série e capacidade; vínculo do elevador ao local; acesso ao histórico de chamados do equipamento. |
| **Equipe de campo** | Colaboradores, cargos, zona, foto e situação; pendências, resolução e tempo médio individual; consulta dos chamados em que a pessoa é responsável ou participante. |
| **Gestão de usuários** | Administrativo: cadastro/edição, cargos por perfil, contatos, admissão, acesso, situação, zonas e vínculos de cliente; rascunhos na sessão. Supervisor: consulta somente leitura dos contatos dos técnicos da sua zona, sem CPF ou login. Ordenação por coluna, com ativos primeiro por padrão. |
| **Solicitações de clientes** | Caixa de entrada da área autorizada; relato, equipamento, cliente, abertura e lembretes; aceite com atribuição/prazo/prioridade ou retorno justificado; acesso ao chamado gerado. |
| **Banco de dados** | Catálogo permitido, quantidades, consulta de até 100 registros por tabela, busca nos registros exibidos, estrutura de colunas, esquema SQL, versão do banco e exportação de domínio. |
| **Meu perfil** | Informações profissionais, cargo, matrícula, zona e resumo de atuação; alteração de foto em PNG, JPEG ou WebP, de até 1,4 MB na interface. |

### Cadastro, cargos e rascunhos

O cadastro inclui nome, matrícula, perfil, cargo, CPF, e-mail comercial, telefone, admissão, login, senha e situação. Técnico/supervisor recebem uma zona; cliente recebe um ou mais locais vinculados.

- Cargo é **selecionado** conforme o perfil, incluindo Técnico de campo I/II/III e Estagiário de campo.
- Cargo descreve a função profissional; **perfil** determina as permissões.
- A pesquisa e a distinção entre cargos documentados no setor e nomenclaturas internas estão em [CARGOS-E-PORTAL.md](docs/CARGOS-E-PORTAL.md).
- CPF usa verificação de dígitos e aparece mascarado na listagem; não há consulta à Receita.
- Matrícula não é alterada depois do cadastro. Login, CPF e e-mail possuem regras de unicidade quando informados.
- Novas senhas têm de 12 a 200 caracteres. Contas antigas de demonstração preservam sua senha local.
- Transferir, alterar perfil ou desativar um técnico exige resolver sua responsabilidade/participação em chamados pendentes.
- Mudanças de senha, perfil, zona ou desativação revogam as sessões da conta afetada.
- O último Administrativo ativo é protegido contra desativação ou remoção desse perfil.
- Administrativo é provisionado pelo comando de configuração inicial; não há promoção para esse perfil na tela.
- Cargos antigos podem ser mantidos ao editar sem mudar o perfil, preservando registros legados.

Cliques fora do cadastro e gestos de seleção de texto não fecham o diálogo. Fechar pelo botão ou usar Esc mantém o rascunho **em memória durante a sessão**, separado por novo cadastro e usuário em edição. Trocar o perfil preserva os demais campos. Salvar, descartar, sair da conta ou recarregar a página limpa o rascunho; CPF e senha não são persistidos em `localStorage`.

## Fluxo dos chamados e atendimento em equipe

Na Visão geral do chamado, supervisor/Administrativo pode selecionar um técnico ativo da zona mesmo quando ainda não existe responsável. O primeiro técnico se torna responsável principal; depois, a ação Adicionar à equipe inclui participantes sem trocar o responsável. Funciona em Aberto/Em andamento, registra autoria e horário no histórico e preserva abertura/SLA. Incluir alguém não inicia trabalho automaticamente.

Cabeçalhos de tabelas alternam ordenação crescente/decrescente; no celular/tablet, as tabelas em cartões têm seletores próprios. Chamados são ordenados antes da paginação.

### Estados e classificação

| Estado | Significado |
| --- | --- |
| `aberto` | Registrado e aguardando início ou nova atribuição. Pode ter responsável ou estar disponível para assumir. |
| `em_andamento` | Atendimento iniciado. Pode conter períodos ativos ou pausados. |
| `resolvido` | Encerrado com solução e data de resolução. |
| `cancelado` | Cancelado pela gestão; não entra na taxa de resolução. |

Prioridades: **A · Crítica**, **B · Média**, **C · Leve**. A migração 006 converte `critica`/`alta` em A, `media` em B e `baixa` em C, preservando chamados, datas e SLA. Classificações registradas: `obra_nova`, `mod_integral` e `mod_parcial`. O prazo de resolução é informado em horas, de 1 a 8.760.

### Ações

1. **Atribuir:** supervisor/Administrativo seleciona um técnico da zona do equipamento.
2. **Assumir chamado:** um técnico ativo da zona assume para si um registro sem responsável. Isso não inicia automaticamente o trabalho.
3. **Iniciar/retomar:** cria um período com horário do servidor e registra o primeiro início.
4. **Participar do atendimento:** outro técnico ativo da zona entra na equipe sem substituir o responsável principal.
5. **Pausar:** encerra somente o período de quem acionou e mantém sua responsabilidade/participação.
6. **Sair da equipe:** encerra a participação adicional e pausa seu período ativo; o histórico de trabalho permanece.
7. **Liberar chamado:** o responsável ou a gestão remove a responsabilidade, pausa todos os períodos ativos e deixa o chamado **Aberto**, sem concluir. Participantes adicionais continuam vinculados, com períodos pausados.
8. **Concluir:** o responsável principal ou a gestão registra a solução, fecha os períodos ativos da equipe e grava o encerramento.
9. **Reabrir/cancelar:** operação da gestão, com histórico; reabrir não troca a data de abertura nem renova o SLA.

O supervisor também pode escolher **Não atribuído** no formulário. Em um chamado aberto/em andamento, o servidor normaliza o status para Aberto. Registros encerrados precisam ser reabertos antes de trocar o responsável.

A Visão geral mostra o responsável principal e a equipe com nomes e cargos. Um estagiário de campo usa o perfil técnico e pode participar conforme as mesmas regras de zona; seu cargo não equivale a uma autorização técnica para procedimentos no equipamento.

Cada participante tem seus períodos. Duas pessoas trabalhando uma hora somam **duas horas de trabalho de equipe**, enquanto a duração do chamado avança uma hora. A equipe não duplica o chamado nos indicadores globais.

### Histórico e concorrência

Criação, alterações, mudanças de status, anexos, equipe e responsabilidade registram autoria e horário. Operações relacionadas usam transações. O campo `revisao` impede uma gravação antiga de sobrescrever outra atualização. Em conflito no detalhe, a interface recarrega o registro e preserva os textos em edição para conferência e nova tentativa.

## Tempos, SLA e indicadores

O SLA implementado é o **prazo de resolução em horas corridas**. Não há calendário comercial, suspensão de SLA em pausas ou contrato automático de resposta.

| Indicador | Cálculo/regra |
| --- | --- |
| Pendentes | Chamados com status Aberto ou Em andamento no recorte. |
| Tempo de resolução | Encerramento menos abertura; a média considera os resolvidos do recorte. |
| Trabalho da equipe | Soma dos períodos de cada participante, excluindo pausas. Períodos simultâneos de pessoas diferentes são somados. |
| SLA cumprido | Resolvidos até `abertura + sla_horas` divididos pelo total de resolvidos no recorte. |
| Fora do prazo | Pendentes que ultrapassaram o prazo; resolvidos atrasados continuam identificados como fora do prazo. |
| Taxa de resolução | Resolvidos divididos pelos chamados não cancelados no mesmo recorte. |
| Distribuição por zona | Quantidade de chamados no recorte e na área autorizada. |
| Indicadores individuais | Chamados associados à responsabilidade ou participação do colaborador. |

Quando não há denominador, a interface apresenta ausência de dados, sem fabricar percentual. O seletor de período recorta pela **data de abertura**. O gráfico usa aberturas e conclusões dos registros selecionados, com semana e ano para não misturar exercícios diferentes.

- Pausar, liberar, reatribuir ou reabrir não reinicia o SLA.
- O aceite de uma solicitação de cliente preserva sua abertura original.
- O painel e as listagens em repouso atualizam a cada 30 segundos.
- Contadores do detalhe avançam a cada segundo; a indicação de vencimento também muda com o detalhe aberto.
- Formulários abertos não são substituídos pela atualização automática.

A view `vw_chamados_metricas` fornece os valores a partir do banco. Não são exibidas métricas de disponibilidade física, MTBF ou custos sem os dados necessários.

## Anexos e visualização de imagens

A aba Anexos permite registrar evidências do atendimento.

| Regra | Implementação |
| --- | --- |
| Formatos | JPG/JPEG, PNG, WebP, PDF, TXT, CSV, DOCX e XLSX. |
| Limite individual | 2 MB por arquivo. |
| Limite do chamado | Até 20 arquivos e 20 MB no total. |
| Armazenamento | Conteúdo binário `bytea` no PostgreSQL; metadados, hash, autor e horário. |
| Acesso | Download/visualização autenticados e sujeitos ao escopo de zona. |
| Inclusão | Responsável, participante autorizado de chamado aberto ou gestão do escopo. |
| Exclusão | Técnico autorizado exclui somente arquivos enviados por ele; a gestão pode excluir no próprio escopo. |
| Imagens | Miniatura proporcional, visualização ampliada, zoom e rolagem; baixar é opcional. |
| Documentos | Disponíveis para download. |

O servidor verifica tamanho, extensão, assinatura/formato admitido e duplicidade. Inclusão e exclusão entram no histórico. Essa validação de formato não constitui um serviço de antivírus.

O cliente não acessa anexos internos. A identificação de recorrências usa textos de chamados; não lê fotos ou documentos automaticamente.

## Portal do cliente e triagem

O portal `/cliente.html` possui layout e dados próprios: locais vinculados, elevadores, solicitações pendentes, atendimentos concluídos e formulário de nova solicitação. Não mostra indicadores de funcionários ou diretório interno.

O formulário de nova solicitação mantém espaçamento uniforme entre campos, aviso de encaminhamento e botão de envio. No celular, o botão usa a largura disponível para facilitar o toque.

### Cadastro e vínculo

O Administrativo cria o perfil Cliente na Gestão de usuários e marca os locais autorizados. Não há cadastro público. A conta pode estar vinculada a mais de um local, inclusive em zonas diferentes. O cliente acompanha solicitações **da própria conta**, dentro dos locais atualmente vinculados.

### Fluxo

1. O cliente escolhe um elevador vinculado e informa título e descrição.
2. O servidor grava `aberto_em` e o estado `aguardando_triagem`.
3. A solicitação aparece na caixa do supervisor da zona e do Administrativo.
4. A gestão aceita e define técnico, prioridade, classificação e SLA, ou retorna ao cliente com justificativa.
5. O aceite cria um único chamado e mantém o horário original de abertura da solicitação.
6. O portal acompanha o status do chamado e seus horários de aceite/conclusão.

Estados da solicitação: `aguardando_triagem`, `aceita` e `recusada`. O cliente não escolhe a equipe, o prazo nem a prioridade interna.

### Lembretes

Enquanto aguarda triagem, o cliente pode usar **Lembrar a empresa**, com intervalo mínimo de uma hora por solicitação. O sistema registra o lembrete e exibe quantidade e último horário na fila interna. Depois da triagem, a ação deixa de estar disponível.

Os lembretes são internos: não há envio de e-mail, WhatsApp, SMS ou push nessa versão.

## Identificação de recorrências

O recurso consulta chamados anteriores da zona autorizada para direcionar a investigação de sintomas recorrentes. O exemplo inicial é o chamado **#5**, do elevador **BAR-001**, com quatro ocorrências anteriores semelhantes.

1. Recupera registros anteriores à abertura do chamado, dentro da zona autorizada.
2. Normaliza os textos e usa TF-IDF, similaridade de cosseno e termos de componentes.
3. Prioriza o mesmo elevador, distinguindo casos de outros equipamentos.
4. Exibe recorrências, intervalo médio, soluções anteriores e referências aos chamados utilizados.
5. Persiste a sugestão e recebe avaliação de utilidade de usuários autorizados.

A indicação é apenas um direcionamento: o técnico deve avaliar o equipamento e as outras causas possíveis. Similaridade não confirma diagnóstico; repetição de uma solução não comprova eficácia ou redução de custos. Sem histórico suficiente, o sistema informa essa limitação.

A versão atual funciona **sem LLM, chave externa ou envio de textos a um provedor generativo**. O complemento opcional anterior foi removido. Variáveis antigas de provedor não o reativam. Nomes históricos como `sugestoes_ia` e `avaliacoes_ia` permanecem para preservar os registros existentes. Implementação: [server/ai.mjs](server/ai.mjs).

## Dados da demonstração e escopo atual

A versão final do TCC não oferece importação de chamados nem migração de bases externas. O menu, as rotas, o leitor CSV/Excel/JSON, o conversor de arquivos e os exemplos de upload foram retirados. Os cadastros são feitos nas telas da aplicação; o histórico cresce com os atendimentos registrados. A demonstração inicial usa os dados fictícios de server/seed.mjs, criados somente quando a base está vazia.

Esta alteração não apaga nem recria a base existente. Pessoas, fotos, zonas, locais, elevadores, chamados, participações e históricos já gravados continuam disponíveis conforme as permissões normais. A exportação de domínio na área Banco de dados é uma consulta de saída e continua disponível; não oferece restauração ou importação pela aplicação.

A importação poderá ser reconsiderada como trabalho futuro, com análise da origem, mapeamento e transformação de campos, conferência de vínculos e tratamento de erros. Não há promessa de compatibilidade automática com bancos de terceiros. O motivo é concentrar a entrega atual na gestão de atendimentos, indicadores e identificação de recorrências, com um escopo que possa ser demonstrado e explicado. A pesquisa documental anterior está em [Sistemas do setor e evolução futura](docs/MIGRACAO-E-SISTEMAS-DO-SETOR.md).

## Banco de dados e persistência

### PGlite local

O servidor usa **PostgreSQL compilado para WebAssembly, via PGlite**, persistido em `.fieldiq/data`. Não é armazenamento de chamados no navegador. É uma distribuição embutida, diferente de um serviço PostgreSQL convencional separado.

O diretório local deve ser aberto por um processo por vez. A trava `.fieldiq/data.lock` evita duas instâncias concorrentes; uma trava de processo já encerrado é verificada na inicialização.

### PostgreSQL convencional

Configure `DATABASE_URL` para usar o adaptador `pg`. O mesmo esquema é aplicado dentro de `fieldiq`. Pode ser um PostgreSQL próprio ou hospedado; não há dependência do SDK/Auth do Supabase.

O [compose.yaml](compose.yaml) oferece PostgreSQL 17 com volume persistente e porta restrita ao próprio computador:

```powershell
docker compose up -d
```

Configure o ambiente local demonstrativo:

```dotenv
DATABASE_URL=postgresql://fieldiq:fieldiq_local_tcc@127.0.0.1:5432/fieldiq
DEMO_MODE=1
DEMO_PASSWORD=tk2026
```

Encerre o servidor, execute `npm run db:init` e inicie novamente. O serviço separado pode ser consultado com psql, pgAdmin ou DBeaver. Trocar `DATABASE_URL` **não transfere automaticamente** o conteúdo do PGlite.

### Modelo de dados

| Grupo | Tabelas |
| --- | --- |
| Organização e patrimônio | `zonas`, `pessoas`, `locais`, `elevadores`. |
| Operação | `chamados`, `historico_chamados`, `equipe_chamado`, `atendimentos`. |
| Evidências | `anexos_chamados`. |
| Recorrências | `sugestoes_ia`, `avaliacoes_ia` — nomes históricos preservados. |
| Estruturas históricas sem função ativa | `importacoes`, `migracoes_legado`, `referencias_legado`: mantidas apenas por compatibilidade, fora do catálogo operacional. |
| Identidade/auditoria | `sessoes`, `auditoria_usuarios`. |
| Cliente | `cliente_locais`, `solicitacoes_clientes`, `lembretes_solicitacoes`. |
| Controle de esquema | `schema_migrations`, criada pelo inicializador. |

As views `vw_chamados_metricas_base` e `vw_chamados_metricas` agregam identificação, SLA, tempos, anexos e participações. Chaves estrangeiras e restrições garantem vínculos e coerência de dados, incluindo solução/data para encerramento.

### Migrações de esquema

| Arquivo | Finalidade |
| --- | --- |
| [001-schema.sql](database/001-schema.sql) | Estrutura inicial de organização, chamados, autenticação, importação e IA. |
| [002-operacao.sql](database/002-operacao.sql) | Administrativo, contatos, auditoria, anexos, períodos de atendimento e migração de legado. |
| [003-equipes.sql](database/003-equipes.sql) | Participantes e períodos simultâneos por técnico. |
| [004-clientes.sql](database/004-clientes.sql) | Perfil Cliente, vínculos, solicitações e lembretes. |
| [005-responsabilidade.sql](database/005-responsabilidade.sql) | Corrigir chamados Em andamento sem responsável, preservando histórico e prazos. |
| [006-prioridades-abc.sql](database/006-prioridades-abc.sql) | Converter prioridades para A/B/C sem reiniciar SLA, períodos ou datas. |

O inicializador aplica cada migração pendente uma vez, em transação. Alterações posteriores de esquema devem receber arquivo novo e entrada na lista do inicializador.

### Consulta, exportação e cópia de segurança

A tela Banco de dados expõe um catálogo limitado, sem SQL arbitrário ou dados de autenticação. Ela não expõe todas as tabelas internas. CPF e contatos não fazem parte da consulta operacional compartilhada nem da exportação de domínio.

O SQL exportado pela interface ou pelo comando contém o esquema e **dados de domínio selecionados**. Não inclui senhas, sessões, CPF, contatos, fotos de perfil, binários de anexos nem todos os dados do portal/auditoria/migração. **Não é um backup completo nem uma forma de restaurar acessos de usuários.**

Para uma cópia completa do modo local, encerre o servidor e preserve o diretório `.fieldiq/data`. Não copie/restaure uma base em uso. No PostgreSQL convencional, use as ferramentas de backup do próprio serviço e valide a restauração.

Atualizar código não exige apagar `.fieldiq/data`. Esse diretório e suas cópias podem conter dados privados e permanecem fora do GitHub.

## Configuração do ambiente

Copie [`.env.example`](.env.example) para `.env` quando precisar personalizar o ambiente. O servidor e os scripts npm de banco carregam esse arquivo.

| Variável | Uso |
| --- | --- |
| `PORT` | Porta do servidor local; padrão `4173`. |
| `HOST` | Endereço de escuta; padrão `127.0.0.1`. |
| `DATABASE_URL` | Conexão de PostgreSQL convencional; ausente, usa PGlite. |
| `FIELDIQ_DATA_DIR` | Diretório alternativo do PGlite; padrão `.fieldiq/data`. |
| `DEMO_MODE` | Em banco remoto, `1` habilita os dados fictícios. Sem URL, o modo local é demonstrativo por padrão. |
| `DEMO_PASSWORD` | Senha das contas criadas na base demonstrativa remota; obrigatória para esse preenchimento. |
| `PGSSLMODE` | Configuração TLS do adaptador PostgreSQL; use o modo e certificados exigidos pelo provedor. |
| `APP_ORIGIN` | Origem adicional explicitamente admitida pela verificação de origem das operações de escrita. |
| `NODE_ENV` | Em produção, ativa cookie seguro e configuração de proxy do servidor. |
| `ADMIN_LOGIN`, `ADMIN_NAME` | Login e nome para `admin:create`. |
| `ADMIN_PASSWORD` | Senha de 12 a 200 caracteres para `admin:create`. |
| `ADMIN_REGISTRATION` | Matrícula opcional do Administrativo; padrão `ADM-001`. |

Para criar o primeiro Administrativo em uma base sem demonstração, configure `DATABASE_URL`, `DEMO_MODE=0` e as variáveis `ADMIN_*` no ambiente privado, e execute:

```powershell
npm run admin:create
```

Depois, remova `ADMIN_PASSWORD` do ambiente. Zonas e locais precisam existir antes dos vínculos de colaboradores e clientes; são cadastrados pelos fluxos disponíveis na aplicação.

Não publique `.env`, chaves de API, senhas reais ou URLs de conexão com credenciais.

## Arquitetura, linguagens e arquivos

```mermaid
flowchart LR
  T[Técnico e supervisor] --> I[Interface interna]
  A[Administrativo / RH] --> I
  C[Cliente] --> P[Portal do cliente]
  I --> API[API Node.js / Express]
  P --> API
  API --> DB[(PostgreSQL)]
  API --> R[Recuperação de casos por equipamento e texto]
  DB --> R
```

### Linguagens, formatos e bibliotecas

| Tecnologia | Onde é utilizada |
| --- | --- |
| JavaScript, módulos `.js`/`.mjs` | Interface, portal, API, autenticação, recorrências, persistência, scripts e testes. |
| HTML | `index.html` e `cliente.html`, com composição dinâmica das telas. |
| CSS | Cores, tipografia, componentes, layouts, formulários, celular/tablet e portal. |
| SQL / PostgreSQL | Tabelas, relacionamentos, índices, restrições, views, migrações e consultas parametrizadas. |
| Batch `.cmd` | Inicializador para Windows. |
| JSON | Dependências, configuração Vercel, dados fictícios e comunicação da API. |
| YAML | Docker Compose. |
| Markdown e Mermaid | Documentação, tabelas e diagrama de arquitetura. |
| CSV/TXT | Podem acompanhar chamados como anexos; não há leitura para importar cadastros e não são linguagens de programação. |
| PowerShell | Exemplos de execução para Windows na documentação. |

Bibliotecas principais: Express, PGlite, `pg`, Chart.js, Lucide e Inter local. Verificação de interface: Playwright e axe. As versões instaláveis estão em [package.json](package.json) e [package-lock.json](package-lock.json). Licenças e avisos estão em [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

### Organização do repositório

```text
fieldiqv1/
├── server/                     API, autenticação, banco e regras de domínio
├── api/index.mjs                Entrada para execução serverless
├── database/                   Migrações SQL 001 a 005
├── fieldiqarchives/public/
│   ├── index.html              Área interna
│   ├── cliente.html            Portal do cliente
│   ├── assets/js/core/         Estado, API, formatação e catálogo de cargos
│   ├── assets/js/components/   Componentes de interface
│   ├── assets/js/views/        Telas internas
│   ├── assets/js/client-app.js Portal
│   ├── assets/css/             Estilos compartilhados e por área
├── scripts/                    Build, banco, Administrativo, conversão e demonstração
├── test/                       Testes de regras, API e navegadores
├── docs/                       Pesquisas e detalhamento funcional
├── compose.yaml                PostgreSQL separado opcional
├── vercel.json                 Configuração de publicação
├── INICIAR-FIELDIQ.cmd          Inicializador Windows
├── INICIAR-FIELDIQ-REDE.cmd     Inicializador Windows para a rede local
├── CONTRIBUTING.md             Processo de alteração, commits e validação
├── CHANGELOG.md                Evolução e motivos das alterações
└── AGENTS.md                   Instruções de manutenção para agentes
```

`fieldiqarchives/public` contém o frontend atual, apesar do nome histórico da pasta. `public/` na raiz é uma **saída gerada pelo build**, ignorada no Git. Fontes, ícones, gráficos e licenças são copiados das dependências durante o build.

## API e regras de autenticação

Todas as rotas abaixo usam o prefixo `/api`. A sessão é um cookie `fieldiq_session` HTTP-only, com `SameSite=Lax`, duração de 12 horas e atributo `Secure` em produção. O banco guarda o hash do token, não o token original.

### Rotas públicas e sessão

| Método e rota | Função |
| --- | --- |
| `GET /health` | Estado básico da API; não representa uma verificação completa do banco. |
| `GET /config` | Indicar modo demonstrativo e disponibilidade de acessos rápidos locais. |
| `POST /auth/login` | Autenticar `login` e `senha` de uma conta ativa. |
| `POST /auth/logout` | Invalidar a sessão autenticada. |
| `GET /bootstrap` | Dados internos autorizados; para cliente, retorna indicação de uso do portal. |

### Chamados, equipes e patrimônio

| Método e rota | Função |
| --- | --- |
| `POST /chamados` | Criar chamado pela gestão. |
| `PATCH /chamados/:id` | Editar campos permitidos ao perfil, com `revisao`. |
| `POST /chamados/:id/responsabilidade` | `acao: assumir` ou `liberar`, com revisão atual. |
| `POST /chamados/:id/equipe` | Participar com a própria conta; a gestão pode indicar `matricula`. |
| `DELETE /chamados/:id/equipe/:matricula` | Sair/remover participação permitida. |
| `GET /chamados/:id/atendimentos` | Consultar períodos e autoria do trabalho. |
| `POST /chamados/:id/atendimento` | `acao: iniciar`, `pausar` ou `concluir`; revisão e solução quando exigidas. |
| `POST /locais` | Cadastrar local no escopo da gestão. |
| `POST /elevadores` | Cadastrar equipamento vinculado a local autorizado. |
| `PATCH /perfil` | Alterar a foto da própria conta interna. |
| `GET /usuarios` | Administrativo: cadastros com CPF mascarado. Supervisor: apenas contatos de técnicos da própria zona, sem CPF ou login. |
| `POST /usuarios` | Administrativo cadastra usuário. Supervisor/técnico recebem 403. |
| `PATCH /usuarios/:matricula` | Exclusivo do Administrativo: cadastro, acesso, zona, situação ou vínculos admitidos. |
| `GET /tecnicos/:matricula` | Perfil detalhado e chamados associados, limitado à zona; técnico consulta apenas o próprio perfil. |

A rota antiga `POST /equipe` não deve ser usada para transferências. Ela bloqueia supervisores e, para Administrativo, responde com orientação de usar Gestão de usuários.

### Arquivos, análise de recorrências e banco

| Método e rota | Função |
| --- | --- |
| `GET /chamados/:id/anexos` | Listar metadados dos anexos. |
| `POST /chamados/:id/anexos` | Enviar um arquivo binário. |
| `GET /anexos/:id/arquivo` | Baixar; `?preview=1` permite visualização inline de imagem autorizada. |
| `DELETE /anexos/:id` | Excluir anexo permitido, com histórico. |
| `POST /chamados/:id/sugestao` | Recuperar evidências e gerar análise de recorrência. |
| `POST /sugestoes/:id/avaliacao` | Registrar `util: true` ou `false`. |
| `GET /banco` | Catálogo e informações do banco. |
| `GET /banco/:table` | Consultar tabela permitida no escopo. |
| `GET /banco/export` | Exportar SQL de domínio. |

O upload de anexo usa `Content-Type: application/octet-stream` e o cabeçalho `X-File-Name` com o nome codificado por `encodeURIComponent`. O corpo é o arquivo, não um JSON.

### Portal e triagem

| Método e rota | Função |
| --- | --- |
| `GET /portal/bootstrap` | Locais, elevadores e solicitações da conta Cliente. |
| `POST /portal/solicitacoes` | Enviar `elevador_id`, `titulo` e `descricao`. |
| `POST /portal/solicitacoes/:id/lembrete` | Registrar lembrete ainda permitido. |
| `GET /solicitacoes` | Caixa de triagem da gestão. |
| `POST /solicitacoes/:id/triagem` | Aceitar com parâmetros operacionais ou retornar com justificativa. |

Cliente é bloqueado nas rotas operacionais internas. São usados códigos de erro para dados inválidos (`400`), sessão ausente/expirada (`401`), ação proibida (`403`), recurso indisponível no escopo (`404`), conflito de revisão/estado (`409`), limite de envio (`413`) e limite de tentativas/lembretes (`429`).

## Testes e verificações

### Regras, API e build

```powershell
npm run check
npm test
npm run build
```

A revisão atual inclui **39 arquivos JavaScript e 32 testes automatizados**, além do build. Os testes cobrem autenticação, autorização por zona/perfil, cargos, clientes, equipes, desatribuição, anexos, SLA, métricas, retirada das rotas de importação, preservação dos dados, exportação e persistência/atualização de banco.

### Interface

As suítes usam Edge instalado no computador e WebKit quando disponível. A suíte operacional e a de novos fluxos requerem WebKit instalado no diretório de navegadores usado pelo projeto.

No Windows, para preparar essa engine de teste:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) '.fieldiq\browsers'
npx playwright install webkit
npm run test:browser
node test/browser-operations.mjs
node test/browser-followups.mjs
node test/browser-team.mjs
```

Cobertura registrada: dez áreas internas e perfil detalhado em larguras de 320, 375, 390, 430, 768, 834, 1024 e 1440 px; WebKit em dimensões de iPhone; fluxos de cadastro, rascunho, cargos, visualização/zoom, cliente/triagem, colaboração entre contas e assumir/liberar.

Na verificação da versão sem importação foram concluídas **14 verificações axe gerais e 18 dos fluxos de cadastro, imagens e portal**, sem violações detectadas nos cenários avaliados. Isso não substitui uso em aparelho físico nem certificação integral de acessibilidade. As entregas anteriores e seus resultados históricos permanecem registrados no CHANGELOG.


Capturas e relatórios são gerados em `test-results/redesign`, `test-results/operations` e `test-results/followups`, fora do Git. A interface móvel usa cartões, cinco chamados por página, navegação inferior, filtros completos em grade e abas reorganizadas. No computador, são dez chamados por página.

## Publicação

A configuração da Vercel está versionada, mas **a implantação em nuvem e o banco remoto ainda precisam ser configurados e validados**.

1. Importe a versão/branch do repositório que deseja publicar, usando a **raiz** como diretório do projeto.
2. Selecione framework Other. `npm run build` gera `public/`.
3. Configure `DATABASE_URL` de um PostgreSQL persistente acessível ao servidor, com TLS/certificados válidos e conexão recomendada pelo provedor.
4. Não use o disco efêmero de uma função serverless como armazenamento PGlite.
5. Para demonstração, configure `DEMO_MODE=1` e uma `DEMO_PASSWORD` própria. Para base sem preenchimento fictício, use `DEMO_MODE=0` e provisione o primeiro Administrativo no mesmo banco.
6. Confira permissões e dados de demonstração antes de usar o ambiente publicado.
7. Depois de publicar, valide login, isolamento de clientes/zonas, triagem, trabalho em equipe, anexos, encerramento e persistência.

A API serverless usa [api/index.mjs](api/index.mjs). Não coloque credenciais em HTML, no repositório ou na saída de build. A publicação do código no GitHub não representa, por si só, implantação da aplicação.

## Solução de problemas

| Situação | O que verificar |
| --- | --- |
| Não abre em `127.0.0.1:4173` | Servidor iniciado na raiz; dependências instaladas; porta/host configurados. |
| Porta em uso ou banco local travado | Pode haver outra instância. Encerre-a antes de iniciar outro processo sobre o mesmo PGlite. |
| Abrir HTML mostra erros de API | Use `npm start`; o projeto depende de servidor e banco. |
| Cliente entra na página interna | A autenticação o encaminha a `cliente.html`; confirme o perfil da conta. |
| Técnico não vê registros de outra zona | É a regra de isolamento. Ajustes de zona são feitos pelo Administrativo. |
| Técnico não consegue iniciar | Precisa ser responsável/participante autorizado e o chamado deve ter responsável principal. |
| Não consegue concluir | Apenas responsável principal/gestão; solução obrigatória e revisão atual. |
| Transferência ou desativação bloqueada | Reatribua responsabilidades e encerre participações em chamados pendentes. |
| Conta inativa não entra | Defina senha e ativação pela gestão autorizada. |
| CPF duplicado/inválido | Confira dígitos e cadastros existentes; a verificação não consulta cadastro oficial. |
| Anexo rejeitado | Confira formato real, extensão, duplicidade, tamanho e permissões. |
| Lembrete indisponível | Solicitação já triada ou ainda dentro do intervalo de uma hora. |
| Vercel informa banco indisponível | Verifique `DATABASE_URL`, rede, certificados e configuração do serviço PostgreSQL. |
| Mudou de banco e os dados sumiram | PGlite e PostgreSQL remoto têm armazenamentos separados; a configuração não migra os registros. |

## Limites da versão

- Dados demonstrativos são fictícios; a qualidade da análise precisa ser avaliada com histórico real autorizado.
- A aplicação registra e acompanha manutenção; não controla o elevador nem recebe telemetria/sensores.
- Não existe integração direta com ERP, fornecedores legados, e-mail, WhatsApp, SMS ou push.
- Não há funcionamento offline completo com sincronização posterior, cadastro público ou recuperação de senha por e-mail.
- A identificação de recorrências não interpreta anexos automaticamente e não confirma diagnóstico ou eficácia de reparo.
- O SLA é de resolução em horas corridas, sem calendários contratuais comerciais.
- Cargos não determinam qualificação técnica nem ampliam permissões automaticamente.
- A exportação SQL de domínio não substitui backup completo.
- PGlite local atende ao desenvolvimento/demonstração em um processo; múltiplas instâncias exigem banco compartilhado apropriado.
- Testes de nuvem e de dispositivos físicos permanecem separados das verificações locais registradas.
- Central de notificações, lembretes automáticos e push ainda não foram implementados; consulte a [lista completa de pendências](docs/REVISAO-DE-REQUISITOS.md#o-que-continua-pendente).

## Histórico e manutenção no GitHub

Toda alteração do projeto deve ser registrada em commit e sincronizada na branch de trabalho no GitHub. O commit e a revisão devem explicar **por que a mudança é necessária**, o que mudou e como foi verificado. Arquivos locais privados, senhas e dados reais não fazem parte desse envio.

- [CONTRIBUTING.md](CONTRIBUTING.md): padrão para alterações, mensagens de commit, validação e publicação do código.
- [CHANGELOG.md](CHANGELOG.md): histórico das principais entregas e seus motivos.
- [AGENTS.md](AGENTS.md): instruções para agentes que trabalharem neste repositório.
- [PESQUISA-UX-UI.md](docs/PESQUISA-UX-UI.md): decisões de interface, indicadores e responsividade.
- [CARGOS-E-PORTAL.md](docs/CARGOS-E-PORTAL.md): cargos, equipes, rascunhos, portal e base fictícia.
- [MIGRACAO-E-SISTEMAS-DO-SETOR.md](docs/MIGRACAO-E-SISTEMAS-DO-SETOR.md): pesquisa histórica do setor e possibilidades de evolução futura.

Código-fonte, migrações, scripts, testes, dependências declaradas e exemplos fictícios são versionados. `node_modules/`, `public/` gerada, `.env`, `.fieldiq/`, resultados de testes e credenciais de implantação são ignorados conforme [.gitignore](.gitignore).
