# Notificações do FieldIQ

## Decisões confirmadas

Em 27/11/2026, o responsável escolheu a opção A: sino no topo, central lateral no computador e tela completa no celular, sem página adicional no menu. Avisos breves de atribuições pessoais e alertas críticos ficam sem som. Lembretes: confirmação ao assumir, 75% do SLA e vencimento, sem repetir o mesmo evento. Push deve usar mensagem genérica, sem dados do cliente. A base demonstrativa terá avatares ilustrados.

## Central e leitura

A central armazena notificações por usuário no PostgreSQL. Possui contador, Todas/Não lidas, paginação, leitura individual, voltar a não lida e marcar todas como lidas. Abrir o sino não marca a lista automaticamente. Abrir o registro relacionado marca a notificação como lida. Marcar todas se limita ao último identificador já recebido: uma notificação nova, que chegou depois da consulta, permanece não lida.

O sino também aparece nos detalhes do chamado. Consultar a central preserva o formulário do atendimento; abrir o mesmo chamado preserva o rascunho. Abrir outro registro com alterações não salvas pede confirmação. A sessão limpa os dados visuais ao sair; consultas antigas são canceladas. Notificações da zona ou do perfil anterior não são disponibilizadas depois de transferência/mudança de perfil.

## Eventos e destinatários

| Evento | Destinatários |
| --- | --- |
| Atribuição/primeiro responsável | Técnico escolhido; demais gestores autorizados da zona. |
| Assumir | Confirmação no histórico do técnico e aviso à gestão. |
| Inclusão/saída da equipe | Técnico afetado e demais gestores autorizados. |
| Liberação/sem responsável | Antigo responsável e gestão da zona, com indicação de pendência. |
| Nova solicitação do cliente | Supervisores da zona e Administrativo. |
| Lembrete do cliente | Supervisores da zona e Administrativo; intervalo do portal preservado. |
| 75% do SLA/vencimento | Responsável, participantes atuais, supervisores da zona e Administrativo. |

Cada alteração e suas notificações são persistidas na mesma transação. Inclusão repetida, falha de validação ou conflito não gera avisos duplicados. A chave de cada evento impede repetição por destinatário. Ações próprias continuam no histórico, mas não provocam aviso breve redundante. Clientes continuam usando somente o portal e não recebem dados internos de equipe ou SLA pela central.

## Rotina de SLA

O servidor local avalia a cada minuto, independentemente de um navegador aberto. A rotina não altera abertura, prazo, revisão ou status do chamado. Pausas de trabalho não suspendem o SLA. Se a primeira avaliação já ocorrer depois do vencimento, gera apenas o aviso de vencimento, sem enviar um aviso de 75% atrasado. Resolvidos/cancelados saem da avaliação.

A deduplicação é persistente por chamado, prazo, etapa e destinatário. Alterar o SLA cria outro prazo; reabrir sem alterar a abertura/SLA não repete o alerta antigo. A consulta exclui alertas já entregues para não deixar chamados novos esperando atrás dos mesmos registros vencidos em cada lote.

Em execução sem servidor permanente, a rota `GET /api/tarefas/notificacoes` precisa de agendamento externo e `Authorization: Bearer CRON_SECRET`, com segredo de pelo menos 32 caracteres. Uma sessão normal não autoriza a rotina. Não existe agendamento remoto configurado automaticamente por esta etapa.

## API

- `GET /api/notificacoes?status=todas|nao_lidas&pagina=1&limite=15`: lista e contadores do próprio usuário.
- `PATCH /api/notificacoes/:id` com `lida: true|false`: leitura individual.
- `PATCH /api/notificacoes/lidas` com `ate_id`: marca as notificações já consultadas.
- `GET /api/tarefas/notificacoes`: rotina autenticada por segredo, para agendador.

Usuário, perfil e zona são obtidos da sessão. Não há endpoint público que permita criar uma notificação para qualquer colaborador. Tokens de sessão, CPF e dados de inscrição push não fazem parte da central ou da exportação de domínio.

## Referências de desenho e comportamento

O [Carbon — Notification](https://www.carbondesignsystem.com/building-blocks/core/components/notification/guidelines) orienta a distinguir avisos temporários de outras apresentações. A [Atlassian — Badge](https://atlassian.design/components/badge/usage) fundamenta o indicador numérico. O [Zendesk — Automations](https://support.zendesk.com/hc/en-us/articles/4408832701850-About-automations-and-how-they-work) distingue regras por tempo de regras por eventos. O intervalo de um minuto e o marco de 75% são decisões do FieldIQ, não regras atribuídas a esses produtos.

O push e sua ativação em HTTPS são uma etapa separada. Na [documentação WebKit para iOS/iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/), a experiência de instalação na tela inicial e a permissão do usuário fazem parte das condições de uso. O visual nativo da notificação depende do sistema operacional; não recebe o CSS da central.
