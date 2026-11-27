# Histórico de alterações e seus motivos

Este histórico registra o problema que motivou cada entrega e seu efeito na aplicação. Os commits publicados mantêm seus identificadores; as explicações abaixo complementam suas mensagens.

## 2026-11-26 — revisão visual, inclusão pela supervisão e conferência dos pedidos

**Motivo:** cabeçalhos ordenáveis usavam botões sem estilo; prioridades antigas eram mostradas como códigos em minúsculas e faziam a seta mudar sem reorganizar chamados. Supervisores não tinham o seletor de inclusão de técnicos. Outros pedidos recentes estavam apenas parcialmente implementados e sem uma relação honesta das pendências.

**Alterações:** estilos e ícones compartilhados para ordenação, ordenação antes da paginação, controles para celular/tablet, leitura compatível com prioridades antigas e migração 006 para A/B/C. Na Visão geral, a gestão define o primeiro responsável mesmo sem atribuição anterior e inclui participantes em Aberto/Em andamento, com autoria, nome e horário no histórico, sem reiniciar SLA. Concluídos Meus chamados, perfil detalhado e consulta de contatos pelo supervisor; cadastro/alteração de usuários é exclusivo do Administrativo, sem CPF/login nas respostas ao supervisor. CPF e credenciais também ficam fora das consultas de banco e dos dados de sessão compartilhados. Corrigidos filtros contextuais de navegação, rótulos, seletores estreitos e organização do histórico no celular. A identificação de recorrências usa somente comparação local; o complemento LLM foi retirado. Acrescentados CSP, documentação de segurança/privacidade e auditoria dos requisitos, com notificações e seed ampliado explicitamente pendentes.

**Verificação:** 39 arquivos JavaScript, build e 32 testes de regras/API aprovados. Suíte geral em dez áreas e oito larguras (320–1440 px), incluindo WebKit; suites de operações, rascunhos/portal e equipe aprovadas. Ao todo, 77 verificações axe sem violações nos cenários executados. Revisão dedicada com 29 capturas em 320/390/834/1440 px; inspeção das capturas e correções de campos cortados no celular. Na base em uso, conferida a ordenação real crescente/decrescente em Meus chamados para supervisor e técnico. Cópia completa local com banco encerrado; após atualização, comparação confirmou preservação de 179 chamados, históricos/equipes, 52 pessoas, 25 locais, 46 elevadores, 10 zonas e duas solicitações, além da conversão autorizada das prioridades. Backups, capturas e dados privados não são publicados.

**Pendências e limites:** central de notificações, eventos individuais, lembretes de SLA, Web Push e seed ampliado com fotos/contatos ainda precisam ser implementados. Publicação HTTPS, validação de banco remoto e testes em aparelhos físicos continuam separados da verificação local. Detalhes em [Revisão de requisitos](docs/REVISAO-DE-REQUISITOS.md) e [Segurança e privacidade](docs/SEGURANCA-E-PRIVACIDADE.md). Sem integração automática à main ou implantação externa.

## 2026-11-26 — retirada da importação do escopo final do TCC

**Motivo:** o responsável decidiu concentrar a apresentação na gestão dos chamados, indicadores e identificação de recorrências. A compatibilização de bases externas depende de análise e mapeamento de cada origem e fica como possibilidade futura, em vez de compor a entrega atual.

**Alterações:** removidos menu, tela, estado, leitura CSV/Excel/JSON, conversor, gerador do pacote adicional, exemplos públicos e endpoints de importação e migração de dados. Retirada a biblioteca Excel carregada por CDN e seus estilos exclusivos. O catálogo operacional do banco não apresenta mais o histórico de importações. Os cadastros continuam pelas telas próprias, e a exportação de domínio permanece disponível. A triagem do cliente preserva a abertura original por uma opção interna específica, mantendo o SLA. README, guias e testes foram alinhados ao escopo; a pesquisa de sistemas permanece como referência para uma eventual evolução futura.

**Preservação:** as migrações de esquema 001 a 005 e as estruturas históricas permanecem por compatibilidade, sem função de importação ativa. Não houve exclusão de registros nem recriação da base. Antes da atualização foi feita cópia local de segurança. A comparação anterior/posterior preservou 10 zonas, 52 pessoas com suas fotos, 25 locais, 46 elevadores, 179 chamados com históricos e vínculos de equipe e 2 solicitações de clientes.

**Verificação:** 32 arquivos JavaScript e 26 testes automatizados aprovados, incluindo tentativas nas rotas retiradas sem alteração dos dados e preservação do SLA na triagem. A suíte geral passou nas nove telas e oito larguras, de 320 a 1440 px, incluindo WebKit e 14 verificações axe sem violações. Outros 18 cenários axe em 320, 390 e 1440 px conferiram rascunhos, cargos, fotos, cliente e triagem, também sem violações. Build, links locais e diff conferidos. Na instância em rede, os endpoints retirados responderam 404 e o resumo criptográfico dos dados comparados permaneceu idêntico.

## 2026-11-20 — espaçamento da nova solicitação no portal

**Motivo:** detalhes do problema, aviso de encaminhamento e botão de envio apareciam encostados. A classe de organização do formulário estava definida apenas no CSS do painel interno, que não é carregado pelo portal do cliente.

**Alterações:** o CSS do próprio portal organiza o formulário em grade com 24 px entre blocos, sem margem adicional no aviso. O botão de envio tem altura mínima de 44 px e ocupa a largura disponível no celular. O ajuste é restrito ao formulário de nova solicitação.

**Verificação:** medidos 24 px entre detalhes/aviso e aviso/botão no Edge em 320, 390, 768 e 1440 px e no WebKit em 390 px, sem rolagem horizontal e com cinco verificações axe sem violações. Capturas locais do formulário revisadas; build e diff conferidos. Nenhuma solicitação foi enviada durante essa verificação visual.

## 2026-11-20 — importação unificada com revisão dos registros

**Motivo:** “Importar uma base completa” e “Importar um arquivo” levavam ao mesmo resultado para o JSON de demonstração, mas sugeriam operações distintas. O responsável pediu uma única área e a possibilidade de conferir o conteúdo incluído antes de gravar.

**Alterações:** um campo de seleção/arraste identifica chamados ou uma base completa e mantém toda a revisão no painel. Removido o formulário separado de migração. Resumo de categorias, fotos incorporadas, referências identificadas por nome/código, campos dos registros, categorias expansíveis, busca sem acentos e paginação de cinco registros. O fluxo é selecionar → conferir/validar → confirmar. A validação de chamados usa transação com pontos de recuperação por linha e reversão final, detectando duplicados/erros sem gravar domínio ou histórico de importação. A confirmação revalida e preserva o tratamento por linha; a base completa permanece atômica. Supervisores continuam limitados à zona; bases completas exigem Administrativo. Requisições concorrentes pelo botão são impedidas e erros ficam no painel. Exemplos continuam disponíveis para download.

**Verificação:** 40 arquivos JavaScript, build e 37 testes automatizados aprovados. Teste dedicado no Edge/WebKit em 320, 390 e 1440 px, com 15 verificações axe sem violações nos cenários finais, cobrindo entrada única, fotos, busca, paginação, validação sem gravação, confirmação, duplicados e orientação de supervisor. Testes de importação usaram banco separado em memória. Scripts de navegador anteriores foram adaptados ao novo fluxo. Após cópia local de segurança e reinicialização do servidor, a revisão e validação também foram conferidas no endereço da rede, preservando os 17 chamados e as zero importações da base em uso. A rota exclusiva de validação sempre simula, mesmo com sinalização de confirmação; um servidor antigo a rejeita sem gravar. Não foi feita importação automática na base em uso.

## 2026-11-20 — reconhecimento da base fictícia na importação

**Motivo:** selecionar `demonstracao-fieldiq.json` no campo comum convertia o pacote inteiro em um único chamado vazio, mostrando “Título não informado” e equipamento ausente. O fluxo de migração existia em uma entrada separada e não era descoberto pelo reconhecimento do arquivo.

**Alterações:** o campo comum identifica o formato `fieldiq-legado-v1` e abre a prévia completa para o Administrativo, com as quantidades reais de cadastros. Supervisores recebem orientação sobre o perfil necessário, sem tratar o pacote como chamado nem ampliar permissões. JSONs incompatíveis são rejeitados na leitura; listas e chamados individuais continuam aceitos. A tela destaca a base completa, mantém validação e confirmação explícitas e dá nome acessível ao botão de remover arquivo no celular. Reenvios já importados mostram quantidades como criadas, sem sugerir nova criação.

**Verificação:** 39 arquivos JavaScript, build e 33 testes automatizados aprovados. Teste específico no Edge/WebKit em 320, 390 e 1440 px, com 9 verificações axe sem violações: seleção pelo campo comum, validação sem gravação, confirmação com 160 chamados, reenvio sem duplicação, bloqueio orientado para supervisor e prévia de chamados simples. Toda importação de teste usou banco isolado em memória; a base do usuário não foi importada automaticamente. O servidor local já entrega os arquivos atualizados; o navegador precisa recarregar a página.

## 2026-11-20 — acesso pela rede local no Windows

**Motivo:** o responsável pediu acesso para outras pessoas na mesma rede. O servidor padrão escuta apenas em `127.0.0.1`, endereço que não aceita conexões de outros aparelhos.

**Alterações:** inicializador `INICIAR-FIELDIQ-REDE.cmd` e script PowerShell que detectam uma conexão IPv4 com gateway, mostram os endereços das áreas interna e do cliente e vinculam o servidor ao IP selecionado. A regra de firewall é limitada ao executável Node, porta, endereço, interface, perfil e sub-rede detectados, sem mudar o perfil geral do Windows. Inclui consulta sem alterações, configuração isolada, desativação e escolha explícita de interface/porta. O inicializador original permanece disponível; não há publicação na internet.

**Verificação:** sintaxe PowerShell, detecção da rede, configuração e reaplicação da regra, inspeção dos filtros e vínculo TCP no IPv4 da rede aprovados. O inicializador recusou iniciar uma segunda instância enquanto a porta estava ocupada. O servidor local existente respondeu `200` em saúde e `401` na consulta de dados sem sessão. `git diff --check` aprovado. A instância existente foi preservada: é preciso encerrá-la com `Ctrl+C` e usar o inicializador de rede. Acesso HTTP da aplicação a partir de outro aparelho ainda não testado.

## 2026-11-20 — documentação completa e padrão de manutenção

**Motivo:** o responsável solicitou que todos os arquivos e commits do projeto estivessem no GitHub, com um README completo e a justificativa das alterações atuais e futuras.

**Alterações:** README reorganizado com as funções das dez áreas e do portal, permissões de responsáveis e participantes, fluxos de atendimento, indicadores, arquivos, IA, importação, modelo de dados, configuração, API, comandos, testes e limites. Acrescentados CONTRIBUTING, AGENTS e este histórico. A documentação distingue código publicado, integração à branch principal, implantação e dados que precisam permanecer privados.

**Verificação:** revisão das descrições contra as rotas, módulos, migrações, scripts e configuração do repositório; 51 links/âncoras locais, 36 rotas, 9 scripts npm e 4 commits históricos conferidos. Esta entrega é documental e não altera as funções da aplicação.

## Entregas funcionais já publicadas

### Portal do cliente, equipes, desatribuição e celular

Commit: [fca474d](https://github.com/andradehub/fieldiqv1/commit/fca474d454675d5217b95bf00d8d8fe4e065736a).

**Motivo:** o cadastro perdia conteúdo em cliques acidentais, imagens não podiam ser examinadas adequadamente, cargos precisavam ser digitados e os filtros cortavam opções no celular. O atendimento precisava comportar equipe, saída sem conclusão e solicitação do cliente em uma interface própria.

**Efeito:** rascunhos em memória, visualizador com zoom, cargos por perfil com estagiário de campo, base fictícia completa, participantes com tempos individuais, assumir/liberar sem reiniciar SLA e portal com triagem e lembretes internos. Filtros móveis passaram a exibir todas as situações.

**Verificação registrada:** 39 arquivos JavaScript, build e 29 testes automatizados aprovados; fluxos em Edge/WebKit e 58 verificações axe nos cenários finais. A atualização local preservou os 17 chamados e as 10 contas anteriores, com cópia de segurança. O arquivo fictício foi validado em banco separado, sem importação automática na base do usuário.

### Anexos, gestão de usuários e migração de legado

Commit: [8aee3bd](https://github.com/andradehub/fieldiqv1/commit/8aee3bdd251e7f96044660d22bef640d41237307).

**Motivo:** o feedback sobre a demonstração exigia persistência verificável e atualização do atendimento pelo técnico. O responsável acrescentou evidências por arquivos, um perfil Administrativo / RH, cadastro por zona e reaproveitamento de dados anteriores.

**Efeito:** anexos autenticados no PostgreSQL, gestão de técnicos/supervisores com CPF e contatos, isolamento de consultas por zona, botões e horários de atendimento, migração atômica e conversão de CSV. Os tempos e indicadores passaram a usar os eventos de trabalho e datas do chamado.

**Verificação registrada:** 22 testes automatizados aprovados e fluxos de interface verificados. O isolamento regional anterior passou a ser por zona; a conta administrativa recebeu visão geral.

### Reorganização da interface

Commit: [e922e78](https://github.com/andradehub/fieldiqv1/commit/e922e78ea4870ce3d21f8003e30ab036babcf69f).

**Motivo:** o responsável pediu uma interface profissional e limpa, preservando as cores e priorizando consulta e atendimento em celulares e tablets.

**Efeito:** navegação por tarefas, componentes reutilizáveis, fonte e ícones locais, cartões no celular, paginação, filtros, formulários em etapas e detalhes em abas. O frontend foi separado em estado/serviços, componentes e telas, com estilos organizados por responsabilidade.

**Verificação registrada:** sintaxe, build, 13 testes automatizados e verificações de interface em oito larguras, incluindo WebKit em dimensões de iPhone.

### Banco persistente e recuperação de recorrências

Commit: [b496666](https://github.com/andradehub/fieldiqv1/commit/b4966663d1baad9f8e658a13b3ce8be085cd13c6).

**Motivo:** o protótipo precisava de banco funcional, histórico por elevador e apoio ao técnico com base em problemas recorrentes, em vez de depender de dados voláteis de demonstração.

**Efeito:** API Node/Express, PostgreSQL persistente local ou remoto configurável, autenticação, permissões, equipamentos, histórico transacional, encerramento com solução, importação e análise de casos anteriores com evidências. A síntese generativa ficou opcional.

**Limites preservados nas entregas seguintes:** testes locais não comprovam uma implantação em nuvem. A análise por similaridade não confirma diagnóstico, e testes com respostas simuladas não equivalem à avaliação de um provedor generativo real.

## Próximas entradas

Novas entregas relevantes devem registrar **Motivo**, **Alterações/Efeito**, **Verificação** e limites materiais. Não liste uma função planejada como implementada nem um teste não executado como aprovado. O padrão das mensagens de commit e da publicação está em [CONTRIBUTING.md](CONTRIBUTING.md).
