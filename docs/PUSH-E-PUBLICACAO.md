# Web Push: configuração e validação

O código de inscrição, envio e recebimento está implementado. Os testes usam bancos isolados e entrega simulada; ainda não houve entrega verificada em aparelho físico. A central pelo sino funciona independentemente da ativação push.

## Servidor

1. Publique a aplicação em HTTPS com PostgreSQL persistente. A Vercel não deve usar PGlite no disco efêmero da função. Configure a conexão privada, TLS e a senha da demonstração conforme o README.
2. Gere um par VAPID uma única vez, com contato de responsabilidade pelo serviço:

   ```powershell
   npm run push:keys -- --contato=mailto:seu-email@seu-dominio.com
   ```

   O comando cria `.fieldiq/push-vapid.json`, ignorado pelo Git. Não imprime nem substitui chaves existentes. O servidor local lê esse arquivo na inicialização. Não envie o arquivo ao chat ou repositório.
3. Na hospedagem, configure `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT` no ambiente privado do servidor. O arquivo local contém `publicKey`, `privateKey` e `subject`, respectivamente. Use o mesmo par em todas as instâncias; a chave privada nunca integra o build do frontend. Rotacionar o par exige reativação nos dispositivos.
4. Em execução local permanente, a rotina roda a cada minuto. Em função serverless, configure um agendador externo para `GET /api/tarefas/notificacoes`, com `Authorization: Bearer CRON_SECRET`. Configure um segredo aleatório de pelo menos 32 caracteres no servidor e no agendador. Não há cron remoto nem contratação de plano configurados automaticamente.

Cada execução avalia até 500 chamados candidatos e processa até 25 entregas, com cinco envios simultâneos. Dimensione o agendamento e acompanhe o volume; não existe garantia de entrega instantânea. A rota não aceita uma sessão comum como autorização. A execução não depende de o técnico deixar o aplicativo aberto.

## Dispositivo

Em **Meu perfil → Notificações no celular**, clique em **Ativar neste dispositivo** e aceite a permissão do navegador. A aplicação não pede essa permissão automaticamente ao carregar. O iPhone/iPad precisa de versão compatível e aplicação adicionada à tela inicial. O HTTP por IP da rede local não oferece o contexto seguro necessário. A interface explica a indisponibilidade e mantém a central utilizável.

Com a inscrição ativa, **Enviar teste** enfileira uma notificação individual, limitada a uma solicitação por minuto. A confirmação significa que entrou na fila. O estado `enviado` no servidor significa aceitação pelo serviço de push, não comprovação de exibição no aparelho. Permissões, conectividade, sistema operacional e políticas do navegador influenciam a entrega e sua aparência.

**Desativar neste dispositivo** remove a inscrição e seu vínculo local. Logout também revoga e limpa avisos desse dispositivo; alteração de senha, perfil, zona ou desativação da conta revoga todas as inscrições da conta. Uma conta pode ter até dez dispositivos. A central persistente continua disponível ao voltar a entrar.

## Privacidade e integridade

O corpo é cifrado por `web-push` e contém somente ID da notificação, vínculo opaco, título FieldIQ e mensagem genérica. Não inclui nome, CPF, cliente, endereço, descrição ou solução. O service worker confere o vínculo do dispositivo, usa título/texto genéricos e abre somente o destino interno autorizado. O servidor verifica sessão, perfil e zona novamente para exibir os detalhes. O vínculo opaco em IndexedDB não contém senha ou token de sessão.

O service worker não intercepta navegação nem guarda páginas/API em cache. As inscrições aceitam apenas HTTPS de provedores permitidos e chaves válidas; redirecionamentos são bloqueados e há prazo total por envio. Endpoints, chaves de inscrição, fila e VAPID privado não são expostos pelo catálogo operacional ou exportação de domínio.

Só eventos novos após ativação entram na fila. Ações próprias não produzem push redundante, exceto o teste solicitado. Leituras, perda de autorização, encerramento de SLA e alertas com prazo alterado cancelam entregas pendentes obsoletas. Há retentativas limitadas para falhas temporárias e remoção de inscrições expiradas. A unicidade é por notificação/dispositivo; uma falha entre aceitação e confirmação pode causar reenvio. A tag nativa identifica o mesmo aviso, sem nova sinalização sonora.

## Verificações reproduzíveis

`npm test` verifica propriedade da inscrição, isolamento, privacidade, criptografia do transporte, filas, retentativas, expiração e revogação de credenciais. `node test/browser-push.mjs` usa service worker real e simula permissão, inscrição e entrega: testa ativação por clique, vínculo, conteúdo genérico, abertura autorizada, preservação de formulário e logout. Não contata o provedor de push.

Ainda precisam ser verificados no ambiente publicado: banco remoto, agendamento recorrente, envio pelo provedor real e recepção/abertura em Android e iPhone físicos, inclusive depois do logout e da troca de conta.

## Referências

- [MDN — Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API).
- [MDN — Notification.requestPermission](https://developer.mozilla.org/en-US/docs/Web/API/Notification/requestPermission_static).
- [WebKit — Web Push no iOS/iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).
- [Biblioteca web-push](https://github.com/web-push-libs/web-push).

As limitações de publicação em acompanhamento estão na [revisão de requisitos](REVISAO-DE-REQUISITOS.md).
