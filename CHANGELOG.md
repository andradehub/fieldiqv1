# Histórico de alterações e seus motivos

Este histórico registra o problema que motivou cada entrega e seu efeito na aplicação. Os commits publicados mantêm seus identificadores; as explicações abaixo complementam suas mensagens.

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
