# Revisão dos pedidos do FieldIQ

Revisão de 26/11/2026. Esta lista compara os pedidos da conversa com a implementação e os testes da branch `codex/banco-e-recorrencias`. A existência de código parcial ou de uma dependência instalada não conta como funcionalidade entregue. Publicar a branch, integrar à `main` e disponibilizar um endereço HTTPS são etapas diferentes.

## Problemas corrigidos nesta revisão

| Pedido/problema | Resultado verificável |
| --- | --- |
| Cabeçalhos de ordenação com botões padrão do navegador | Botões sem moldura, tipografia herdada da tabela, ícones Lucide, foco por teclado e indicação da direção. Aplicados às tabelas de chamados, usuários, histórico do técnico, equipamentos e consulta do banco. |
| Prioridade só mudava a seta, especialmente em Meus chamados do supervisor | Valores anteriores (`critica`, `alta`, `media`, `baixa`) eram incompatíveis com o comparador A/B/C. Leitura, filtro e ordenação agora normalizam os valores; a migração 006 converte o armazenamento. Ordenação acontece antes da paginação. Testados os dois sentidos para supervisor e técnico. |
| Prioridades apareciam em minúsculas | Badges, filtros, cadastro, atendimento e triagem usam **A · Crítica**, **B · Média**, **C · Leve**. Dados anteriores também recebem rótulos legíveis. Textos de componentes, avisos e navegação revisados. |
| Supervisor não encontrava como incluir técnico no chamado | A Visão geral do chamado contém seletor de técnicos ativos da zona e ação de inclusão. Funciona em Aberto e Em andamento. |
| Inclusão não pode depender de já existir responsável | Sem responsável, o primeiro técnico escolhido assume a responsabilidade principal; depois podem ser adicionados participantes. A ação não inicia trabalho automaticamente. Chamado legado em andamento sem responsável volta a Aberto ao receber o responsável. Abertura e SLA permanecem. |
| Autoria das inclusões | Histórico guarda o supervisor/Administrativo que efetuou a inclusão, horário, nome e matrícula da pessoa incluída. Inclusão repetida não duplica participação ou histórico. |
| Cadastro e alterações de usuários exclusivamente do Administrativo | API e tela aplicam a regra. Supervisor consulta apenas contatos dos técnicos da própria zona, sem botão de edição, CPF, CPF mascarado ou login, inclusive na resposta da API. |
| Tabelas ordenáveis e ativos primeiro | Usuários começam por situação ativa e nome. Colunas permitem alternar direção; perfil usa hierarquia dos perfis e zona usa comparação numérica natural. Celular/tablet têm seletores de coluna e direção quando os cabeçalhos ficam ocultos. Banco ordena os até 100 registros consultados, conforme limite informado na tela. |
| Meus chamados | Área própria no menu. Técnico vê responsabilidade e participação; supervisor vê chamados da zona que supervisiona, conforme recomendação aceita. Não altera o escopo da área geral Chamados. |
| Perfil detalhado do técnico | Acesso em Equipe de campo → Ver perfil. Indicadores, busca, filtro, paginação e acesso aos detalhes/histórico/anexos dos chamados. Períodos de técnicos que saíram de uma equipe permanecem no histórico individual. API limita consulta pela zona; técnico acessa apenas o próprio perfil detalhado. |
| Identificação de recorrências, sem LLM | Interface usa essa denominação; removido o complemento generativo opcional. Comparação local de textos, componentes e equipamento, com referências aos registros anteriores. Orientação explícita para avaliação completa do técnico. Tabelas históricas com sufixo `_ia` preservadas por compatibilidade dos dados; o nome não representa integração ativa com LLM. |
| Explicação das medidas de segurança para o TCC | Documento [Segurança e privacidade](SEGURANCA-E-PRIVACIDADE.md), testes de autorização, minimização de dados, consultas parametrizadas, origem externa e XSS no navegador. |

## Pedidos anteriores conferidos e mantidos

| Pedido | Estado atual e evidência |
| --- | --- |
| Banco real e persistente | PostgreSQL local via PGlite ou remoto via `pg`. Persistência e evolução de esquema testadas; tela de consulta e exportação SQL disponíveis conforme perfil. |
| Isolamento por zonas | API limita chamados, equipamentos, técnicos, anexos, solicitações, recorrências e exportação. Administrativo possui escopo geral. Testes incluem tentativas de acesso direto fora da zona. |
| Técnico registra solução e conclui | Responsável principal e gestão podem concluir; solução obrigatória. Participante adicional contribui sem concluir por conta própria. |
| Botões de atendimento e horários | Assumir, iniciar, pausar, retomar e concluir com períodos individuais e autoria. |
| SLA e KPIs interligados | Abertura até resolução; pausa e desatribuição não reiniciam SLA. Resolução, prazo e indicadores são recalculados a partir dos mesmos registros. Solicitação aceita mantém a abertura original do cliente. |
| Atendimento com vários técnicos e estagiário | Responsável principal e participantes, períodos simultâneos, entrada própria e inclusão pela gestão. Estagiário de campo está no catálogo de cargos. |
| Sair do chamado sem concluir | Participante sai da equipe; responsável libera o chamado, que volta a Aberto. Gestão remove participantes e desatribui responsável. Trabalho anterior e SLA preservados. |
| Anexar fotos e documentos | Upload autenticado, limites de tipo/tamanho/quantidade e histórico de inclusão/exclusão. Cliente não acessa anexos internos. |
| Imagem visível sem baixar | Miniatura proporcional, visualizador, zoom e rolagem. Testado com imagem panorâmica em Edge e WebKit. |
| Cadastro não perder dados por clique fora | Clique externo não fecha o formulário. Fechar/Esc preserva rascunho na sessão; salvar/descartar o limpa. Recarregar ou sair da conta limpa o rascunho. |
| Cargos selecionáveis por perfil | Catálogo compartilhado entre API e interface, incluindo campo I/II/III, manutenção, serviços, supervisão e estágio. Pesquisa de nomenclaturas em [Cargos e portal](CARGOS-E-PORTAL.md). |
| Portal separado do cliente | Cadastro pelo Administrativo, locais vinculados, elevadores, solicitações próprias, triagem pelo supervisor e lembrete interno com intervalo mínimo de uma hora. |
| Espaçamento da nova solicitação | Formulário do portal tem espaçamento próprio entre campos, aviso e envio; testes de responsividade e acessibilidade mantidos. |
| Celular prioritário e Cancelados acessível | Abas reorganizadas, cartões, seletores e menus adaptados. Testes em 320–1440 px e WebKit em dimensões de iPhone. |
| Pesquisa de UX/UI e sistemas do setor | Documentos [Pesquisa de UX/UI](PESQUISA-UX-UI.md) e [Sistemas do setor](MIGRACAO-E-SISTEMAS-DO-SETOR.md). Pesquisa não comprova qual sistema uma empresa específica utiliza. |
| README, linguagens e motivos dos commits | README descreve funções, permissões, arquitetura e linguagens. CONTRIBUTING/CHANGELOG registram a justificativa das mudanças. Dados locais, sessões e segredos ficam fora do GitHub. |
| Retirar importação | Retirada por solicitação posterior explícita: menu, rotas, leitura e arquivos de exemplo indisponíveis. Pedidos antigos de unificar importação ou entregar JSON importável foram substituídos por essa decisão. Dados já cadastrados preservados. |

## O que continua pendente

1. **Central de notificações dentro da aplicação:** sino, contador de não lidas, histórico, marcar como lida e acesso ao chamado relacionado. O toast de confirmação atual não substitui essa central.
2. **Eventos de notificação:** avisar o técnico incluído/atribuído; avisar o supervisor sobre novas solicitações, lembretes dos clientes, alterações de responsável/equipe e chamados sem responsável. Hoje o histórico registra ações e o painel mostra solicitações/lembretes, mas isso não gera notificações individuais.
3. **Lembretes automáticos e alertas de SLA:** rotina no servidor, controle de duplicação e encerramento dos lembretes após resolução/cancelamento. A recomendação discutida foi aviso ao assumir, em 75% do prazo e ao vencer; os alertas ainda não são enviados.
4. **Push no celular:** service worker, inscrições dos dispositivos, envio Web Push, chaves/configuração, revogação e testes. O recurso ainda não está preparado nem ativado. Instalar uma biblioteca não conclui essa implementação. Endereço HTTPS e autorização do navegador também serão necessários; o usuário informou ainda não possuir endereço publicado para isso. HTTP por IP da rede local não oferece essa entrega no celular.
5. **Demonstração ampliada reproduzível em uma instalação nova:** o seed versionado cria 17 chamados, 10 zonas e 11 contas, sem fotos iniciais ou contatos completos de todos. A base local pode conter mais cadastros já existentes, mas não é enviada ao GitHub. O pedido antigo de um conjunto amplo com fotos e cadastros completos ainda não está integralmente incorporado ao seed; o arquivo de importação foi retirado junto da funcionalidade. Isso pode ser concluído futuramente sem restaurar importação.

## Limites da verificação e etapas externas

- As verificações móveis usam emulação de tamanho/toque e o motor WebKit. Revisão em iPhone e tablet físicos ainda não foi executada pelo agente.
- Aplicação publicada em HTTPS, PostgreSQL remoto de produção e push em aparelho físico ainda precisam de configuração e validação próprias. A branch no GitHub não é uma implantação.
- A avaliação quantitativa da identificação de recorrências usa exemplos fictícios; não foi realizado estudo de campo que comprove redução de custos, falhas ou tempo de diagnóstico. Esses ganhos permanecem objetivos a avaliar no TCC.
- Medidas técnicas implementadas e documentadas não representam certificação LGPD. Política de retenção, finalidade/base legal, atendimento aos titulares e governança da organização dependem do contexto de implantação.
- Apresentações permanecem para a etapa futura solicitada pelo responsável.

## Como verificar as correções

`npm test` verifica regras, privacidade, migração e os dois sentidos da ordenação. `npm run test:browser` percorre as áreas internas e larguras responsivas. `node test/browser-review.mjs` confere cabeçalhos, prioridades, Meus chamados, perfil detalhado e inclusão pelo supervisor, inclusive sem responsável e em andamento. As suítes de operações, equipe e followups verificam atendimento, rascunhos, anexos, cliente e triagem.

Capturas e relatórios privados são gravados em `test-results/`; não fazem parte do repositório público.
