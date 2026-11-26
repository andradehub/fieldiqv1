# FieldIQ — pesquisa exploratória e decisões de interface

Data: 19/11/2026.

Nota de escopo de 26/11/2026: a importação foi retirada da versão final. As observações sobre ela descrevem a etapa histórica de pesquisa; a arquitetura e os fluxos atuais não incluem esse módulo.

## Escopo e método

Esta etapa prioriza o redesign solicitado: manter roxo e laranja, melhorar leitura e arquitetura da interface e adaptar os fluxos a computador, celular e tablet.

A pesquisa é documental: comparação de materiais públicos de produtos do setor, referências de UX e recomendações de acessibilidade. Não houve acesso a áreas privadas dos produtos concorrentes, entrevistas com técnicos, teste com participantes ou medição de satisfação. As decisões abaixo são hipóteses de design aplicadas ao FieldIQ, verificadas por inspeção visual e testes funcionais.

## Referências consultadas

| Referência | O que informa | Aplicação no FieldIQ |
| --- | --- | --- |
| [TK Elevator — Customer Portal](https://www.tkelevator.com/cn-en/products/digital-solutions/max/customer-portal/) | Acompanhamento de solicitações, equipamentos, relatórios, histórico de manutenção e indicadores de serviço. | Organizar o trabalho em chamados, equipamentos e histórico; destacar pendências e prazos. |
| [TK Elevator — material público do portal e aplicativo](https://www.tkelevator.com/media/usa_canada/customer-service-portal-cutsheet-us-ca-en.pdf) | Consulta de estado dos equipamentos, visitas e solicitações em computador e dispositivo móvel. | Navegação consistente nos dois formatos e acesso direto ao histórico por equipamento. |
| [KONE — comunicação com o cliente](https://elevatorplanner.kone.com/existing-buildings/maintenance-new-offering/customer-communication/) | Dados de manutenção, desempenho, disponibilidade, reparos e resposta a solicitações. | Separar os indicadores que podem ser calculados hoje dos que dependem de dados adicionais. |
| [Salesforce — experiência móvel de Field Service](https://help.salesforce.com/s/articleView?id=release-notes.rn_fieldservice_mobile.htm&language=en_US&release=244&type=5) | Organização móvel de registros com linhas rotuladas e empilhadas. | Chamados apresentados como cartões rotulados em telas pequenas, preservando as ações. |
| [Nielsen Norman Group — dashboards](https://www.nngroup.com/articles/dashboards-preattentive/) | Leitura rápida, codificação visual e compreensão das quantidades. | Quatro indicadores principais, gráficos simples, dados reais e fila de atenção acionável. |
| [Nielsen Norman Group — princípios visuais](https://www.nngroup.com/articles/principles-visual-design/) | Escala, hierarquia, equilíbrio, contraste e agrupamento. | Menos estilos concorrentes, espaçamento uniforme, títulos e metadados com papéis distintos. |
| [W3C — Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) | Reorganização do conteúdo para uma largura equivalente a 320 CSS pixels; tabelas de dados têm necessidades específicas. | Páginas sem rolagem horizontal global; cartões para operação e rolagem interna apenas na consulta tabular do banco. |
| [W3C — tamanho mínimo de alvo](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) | Critério de alvos e espaçamento para interação. | Controles principais de 44 px, espaços entre ações e navegação móvel com rótulos. Os 44 px são uma decisão do projeto, não o mínimo de 24 px do critério AA citado. |
| [Material Design — adaptação de navegação](https://m3.material.io/foundations/desktop/components) | Adaptação entre barra, trilho e navegação para diferentes larguras. | Barra inferior no celular, trilho no tablet e menu completo no computador. |

As referências orientam a organização. O visual é próprio do FieldIQ e preserva sua identidade; não reproduz telas privadas dos fornecedores.

## Diagnóstico da interface anterior

- Títulos, valores e textos operacionais competiam com tags e cores de classificação.
- A tabela principal exigia rolagem horizontal também para o técnico consultar uma tarefa no celular.
- Descrição, sugestão automática, edição e histórico eram exibidos em uma única sequência longa.
- Os formulários de cadastro de local e elevador ficavam sempre expostos, mesmo quando a tarefa era apenas consultar.
- A importação enviava os dados sem uma prévia clara do conteúdo.
- A lógica de navegação, dados, renderização e eventos estava concentrada em um arquivo com templates extensos.
- O visual utilizava folhas de estilo sobrepostas, com regras antigas e ajustes adicionais.

## Arquitetura de informação

### Operação

- **Visão geral:** pendências, SLA, tempo, resolução e fila de atenção.
- **Chamados:** busca, filtros e detalhes de atendimento.
- **Novo chamado:** identificação, detalhes e revisão, para supervisor.
- **Elevadores e locais:** cadastro e consulta do patrimônio atendido.

### Gestão

- **Equipe de campo:** responsáveis, carga e acesso aos seus chamados.
- **Importar dados:** envio, prévia e resultado, para supervisor.

### Sistema

- **Banco de dados:** consulta somente leitura e exportação, para supervisor.
- **Meu perfil:** identidade, foto e vínculo profissional.

A navegação usa rótulos previsíveis e mantém a posição dos itens. No celular, as três consultas principais ficam na barra inferior; “Mais” abre o menu completo.

## Indicadores: o que apresentar agora

| Indicador | Cálculo / origem | Cuidado de interpretação |
| --- | --- | --- |
| Chamados pendentes | Abertos + em andamento no recorte de aberturas escolhido. | Não significa equipamentos parados. |
| SLA cumprido | Resolvidos dentro do prazo / resolvidos avaliados no recorte. | Depende do prazo e das datas registradas. |
| Tempo médio de resolução | Média entre abertura e encerramento de chamados resolvidos. | Não é tempo de reparo medido em campo nem tempo de resposta. |
| Taxa de resolução | Resolvidos / chamados não cancelados do recorte. | Depende da idade e complexidade da carteira; não é nota isolada de um técnico. |
| Pendentes fora do prazo | Pendentes cujo prazo calculado já venceu. | Direciona a fila de atenção. |
| Pendentes críticos | Chamados críticos ainda abertos ou em andamento. | Não é um diagnóstico técnico de segurança do elevador. |
| Sem responsável | Pendentes ainda não atribuídos. | Ajuda o supervisor a distribuir o trabalho. |
| Distribuição por zona | Quantidade de chamados por zona no recorte. | A política de consulta atual continua sendo a da API. |
| Carga por técnico | Pendentes e resolvidos atribuídos a cada profissional. | Não afirma disponibilidade presencial ou capacidade de assumir outro caso. |

O seletor de período recorta **chamados pela data de abertura**. No gráfico semanal, aberturas são contadas em aberto_em e conclusões em resolvido_em dos registros selecionados. As semanas incluem o ano na chave dos dados, evitando misturar anos.

Não foram inventadas setas de crescimento, metas, percentuais de melhora ou séries de telemetria.

### Indicadores futuros pesquisados

| Possibilidade | Dados necessários antes de exibir |
| --- | --- |
| Disponibilidade / uptime | Intervalos efetivos de operação e indisponibilidade do equipamento. |
| MTBF | Identificação de falha, falhas distintas e horas reais de operação. |
| Tempo de primeira resposta | Data/hora de aceite, despacho ou primeira resposta, conforme definição operacional. |
| Tempo técnico de reparo | Início e término efetivos do reparo; distinguir espera de deslocamento e peças. |
| Solução na primeira visita | Registro de visitas, reabertura e resultado validado. |
| Custo por equipamento | Materiais, mão de obra, deslocamento e custos registrados. |

Esses indicadores não foram adicionados como números fictícios ao painel.

## Sistema visual

- Identidade preservada: roxo principal #7000BD, roxo profundo #5B0A8A e laranja #FF5F00.
- Superfícies brancas sobre fundo frio claro; separação por bordas suaves e espaçamento.
- Laranja destaca a ação principal; roxo identifica navegação, contexto e seleção.
- Status e prioridade têm texto e ícone quando necessário, além da cor. Classificação de obra usa um tratamento discreto, sem sugerir que “modificação parcial” seja um erro.
- Fonte Inter variável, hospedada localmente, com fallback de sistema.
- Ícones Lucide com o mesmo traço e tamanho de referência.
- Controles principais com altura mínima de 44 px; inputs móveis com texto de 16 px para leitura e para evitar zoom automático em formulários do iOS.
- Foco visível, link para pular navegação, rótulos explícitos e mensagens de estado.

## Decisões por tela

| Tela | Decisão |
| --- | --- |
| Login | Formulário direto, senha visível por escolha e acessos fictícios separados da autenticação comum. |
| Visão geral | Indicadores no primeiro nível, alertas acionáveis, gráficos e fila ordenada por atenção. |
| Chamados | Menos colunas, busca por equipamento/local, filtros com contagem, cartões e paginação: cinco registros por página no celular e dez nas demais larguras. |
| Detalhes | Painel lateral no computador e tela integral no celular; abas para visão geral, atendimento e histórico. |
| Assistente | Evidências recolhidas por padrão, distinção entre análise do histórico e síntese generativa, avaliação de utilidade. |
| Novo chamado | Três etapas com revisão e contexto do equipamento, sem expor todo o formulário ao mesmo tempo. |
| Elevadores / locais | Consulta em primeiro plano; cadastros abertos sob demanda e histórico acessível por equipamento. |
| Equipe | Volume de atendimento e filtros claros; sem classificação simplista por cor de “bom” ou “ruim”. |
| Escopo final | Importação retirada em 26/11/2026; a versão atual mantém os cadastros e atendimentos feitos na aplicação. |
| Banco | Catálogo de tabelas, busca nos registros, estrutura sob demanda e rolagem confinada à tabela. |
| Perfil | Identidade, vínculo profissional e indicadores associados à atuação. |

## Arquitetura do frontend

```text
assets/js/
  app.js                 controlador de navegação, eventos e operações
  core/
    state.js             estado, perfis e contexto
    api.js               comunicação HTTP e erros
    format.js            datas, tempos e cálculos de apresentação
  components/ui.js       ícones, badges, botões, cabeçalhos e estados vazios
  views/
    shell.js             login e navegação
    dashboard.js         indicadores e gráficos
    tickets.js           listagem, detalhes e assistente
    forms.js             chamado e cadastros
    operations.js        equipamentos, equipe e perfil
    database.js          consulta ao banco
assets/css/
  tokens.css             identidade, tipografia e regras básicas
  layout.css             menu, cabeçalho e estrutura responsiva
  components.css         controles e componentes comuns
  views.css              composição das telas e suas adaptações
```

Os eventos são delegados por atributos de ação, sem handlers JavaScript embutidos no HTML. Dados livres são escapados antes de entrar nos templates. Os diálogos usam o elemento nativo dialog, com foco modal e fechamento por Escape.

## Responsividade e validação

- Celular até 767 px: navegação inferior, menu completo sob demanda, cartões e formulário em uma coluna.
- Tablet de 768 a 1099 px: trilho lateral compacto; painéis se reorganizam conforme o espaço disponível.
- Desktop a partir de 1100 px: navegação completa e painéis lado a lado.
- Os testes cobrem larguras de 320, 375, 390, 430, 768, 834, 1024 e 1440 CSS pixels.
- Além do Edge/Chromium, a suíte pode executar WebKit instalado para verificar a engine em dimensões de iPhone. Emulação não substitui teste em aparelho físico.
- A suíte executa verificações axe dos fluxos principais; isso não constitui certificação integral de conformidade WCAG nem teste com usuários.
- Os relatórios e capturas ficam em test-results/redesign e não são publicados no Git.

## Próxima etapa funcional preservada

O redesign foi seguido pela etapa funcional de 19/11/2026. As consultas agora são isoladas por zona na API para técnicos e supervisores; o Administrativo / RH tem visão geral. Gestão de usuários, anexos e registro de períodos de atendimento reutilizam o mesmo sistema visual. A pesquisa de sistemas do setor e migração está em MIGRACAO-E-SISTEMAS-DO-SETOR.md.
