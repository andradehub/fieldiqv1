# Cargos, atendimento em equipe e portal do cliente

Atualização de implementação de 20/11/2026.

## Pesquisa de cargos

O catálogo usa funções documentadas por empresas do setor e as nomenclaturas internas solicitadas para o FieldIQ. Não é uma tabela salarial, uma equivalência de senioridade entre empregadores nem uma classificação profissional oficial.

- A [Atlas Schindler descreve carreiras em operações de campo](https://www.schindler.com.br/pt/carreiras/quem-procuramos/profissionais-com-experiencia/operacoes-de-campo.html): manutenção, montagem, segurança e qualidade de produtos, supervisão de serviços, liderança de novas instalações e especialidade técnica/qualidade.
- A [TK Elevator publica vagas de manutenção no nível Sênior](https://jobs.tkelevator.com/pt/job/T%C3%A9cnico-a-em-Manuten%C3%A7%C3%A3o-de-Elevadores-S%C3%AAnior-Porto-Alegre?id=954231) e de [supervisão de manutenção de elevadores](https://jobs.tkelevator.com/pt/job/Supervisor-a-de-Manuten%C3%A7%C3%A3o-de-Elevadores-S%C3%A3o-Paulo_SP-S%C3%A3o-Paulo?id=957800).
- Há também uma [vaga de supervisão de instalações, modernização e acessibilidade](https://jobs.tkelevator.com/pt/job/Supervisor-a-de-Instala%C3%A7%C3%B5es-Moderniza%C3%A7%C3%A3o-e-Acessibilidade-Elevadores-Juiz-de-Fora-_MG-Juiz-de-Fora?id=963006), mostrando que supervisão não se limita à manutenção.
- **Técnico de campo I, II e III**, **Estagiário de campo** e as opções de oficial de manutenção foram incluídos por solicitação do usuário e compatibilidade com os registros existentes. Não se afirma que essas nomenclaturas ou níveis sejam universais no setor.

As listas são separadas por perfil em `core/jobs.js`, compartilhado entre interface e API. Técnico, supervisor, Administrativo e cliente determinam as permissões. O cargo selecionado descreve o vínculo e não concede acesso extra. Um estagiário de campo utiliza o perfil técnico; não se presume qualificação para procedimentos físicos a partir do cargo.

Novos cadastros exigem um cargo do perfil escolhido. Cargos antigos podem permanecer ao editar um registro sem mudar seu perfil; isso preserva o histórico. Migrações mantêm nomenclaturas da origem. Novas opções não são criadas digitando texto livre no formulário.

## Cadastro e rascunho

Cliques fora do diálogo de cadastro não o fecham. Selecionar texto e soltar o ponteiro fora também não descarta o conteúdo. Fechar pelo botão ou por Esc mantém o rascunho em memória durante a sessão, separado entre novo cadastro e cada registro em edição. Reabrir recupera os campos. Salvar ou escolher **Descartar rascunho** limpa o rascunho correspondente.

Os rascunhos não são gravados em localStorage, arquivos ou banco; uma saída da conta ou recarga da página os limpa. Isso evita deixar CPF e senhas em armazenamento persistente do navegador. Trocar o perfil atualiza apenas a lista de cargos e os campos específicos, preservando os demais dados preenchidos.

## Imagens dos chamados

Miniaturas usam enquadramento proporcional, sem cortar a imagem para preencher o cartão. O botão **Ampliar imagem** abre um visualizador dentro da aplicação, com imagem completa, ampliação/redução e rolagem quando necessário. O download continua opcional. O visualizador usa a mesma rota autenticada e o mesmo escopo de zona dos anexos.

## Atendimento em equipe

O responsável principal continua no chamado. Outros técnicos ativos da mesma zona podem escolher **Participar do atendimento**, inclusive colaboradores com cargo de estagiário de campo. A Visão geral mostra a equipe e seus cargos.

Cada participante inicia ou pausa o próprio período. Vários participantes podem trabalhar simultaneamente; a pausa de um não encerra a atividade dos demais. A soma representa horas de pessoas: duas pessoas durante uma hora totalizam duas horas de trabalho, enquanto a duração do chamado continua sendo uma hora.

O responsável principal e a gestão alteram o status global e concluem o chamado. A conclusão fecha todos os períodos ativos, exige solução e registra o encerramento. Participantes podem contribuir com os detalhes e anexos enquanto o chamado está aberto, sem reatribuir o responsável nem encerrá-lo por conta própria.

Um participante pode sair da equipe, encerrando seu período ativo e preservando os registros de trabalho. A gestão pode remover participantes; o responsável principal precisa ser reatribuído antes de ser removido. Transferências de zona e desativação são bloqueadas enquanto houver responsabilidade ou participação em chamados pendentes.

O SLA de resolução continua sendo abertura até encerramento em horas corridas, sem suspensão por pausas. A equipe não duplica chamados nos indicadores globais. A visão individual considera a responsabilidade e as participações. Revisões impedem sobrescrita concorrente; quando há conflito no detalhe, a interface recarrega os dados e preserva os textos em edição para conferência.

## Assumir, liberar e desatribuir

Pausar encerra somente o período de trabalho e mantém a responsabilidade. Liberar chamado remove o responsável principal, pausa os períodos ativos da equipe e muda o status para Aberto. Abertura, histórico, períodos anteriores e prazo de SLA são preservados. Participantes adicionais continuam vinculados, com seus períodos pausados; o responsável que liberou deixa sua participação.

Qualquer técnico ativo da mesma zona pode assumir um chamado sem responsável. A operação usa bloqueio e revisão: se duas pessoas tentarem assumir ao mesmo tempo, somente uma recebe a responsabilidade. Assumir não inicia o cronômetro; Iniciar atendimento registra o começo do trabalho. A gestão também pode selecionar Não atribuído: o servidor impede que o registro continue Em andamento sem responsável. Chamados encerrados precisam ser reabertos antes de trocar a responsabilidade.

## Prioridade para celular

Todos os filtros de status, incluindo Cancelados, se reorganizam em uma grade no celular. As abas dos detalhes usam duas colunas. Em telas de até 430 px, os seletores de prioridade e classificação ocupam linhas completas para mostrar os rótulos. Controles principais e ações de imagem têm área de toque de pelo menos 44 px. A verificação automatizada cobre 320 a 1440 px e WebKit em dimensões de iPhone; não substitui avaliação em aparelhos físicos.

## Portal do cliente

O portal é uma interface separada, em `/cliente.html`. Ele não apresenta indicadores de produtividade nem o diretório de funcionários. O cliente consulta apenas os locais vinculados, seus elevadores e as solicitações da própria conta.

O Administrativo cadastra o perfil Cliente na Gestão de usuários e seleciona um ou mais locais. O supervisor não cadastra clientes nem modifica esses vínculos. Não existe cadastro público autônomo.

Fluxo:

1. O cliente informa elevador, título e descrição. O servidor registra a abertura e deixa a solicitação aguardando triagem.
2. O supervisor da zona, ou o Administrativo, recebe a solicitação em **Solicitações de clientes**.
3. A triagem define prioridade, classificação, SLA e responsável. Aceitar cria um único chamado; retornar exige justificativa visível ao cliente.
4. A abertura original da solicitação é preservada no chamado: o tempo aguardando triagem não é apagado do SLA. O aceite tem seu próprio horário.
5. O cliente acompanha o status e a conclusão no portal, sem acesso ao diagnóstico interno, equipe técnica ou anexos internos.
6. Enquanto aguarda triagem, pode enviar **Lembrar a empresa**, com intervalo de uma hora entre lembretes. O lembrete e seu horário aparecem no painel interno. Não são enviados e-mails, WhatsApp ou notificações push.

O acesso local fictício é `cliente.barra`, senha `tk2026`, vinculado ao local demonstrativo da Barra. Acesso rápido com senha conhecida é exclusivo do modo local de demonstração; o modo remoto usa a senha de demonstração configurada no servidor.

## Arquivo de demonstração

`fieldiqarchives/public/demonstracao-fieldiq.json` pode ser baixado em **Administrativo → Importar dados → Migrar cadastros e histórico → Baixar base fictícia com equipes e fotos**.

Inclui 10 zonas, 40 colaboradores, 20 locais, 40 elevadores, 160 chamados, 280 registros de histórico, 40 participações adicionais e 160 períodos de trabalho. Os perfis incluem supervisores, técnicos de diferentes níveis e estagiários de campo, com nomes, CPFs sintéticos, contatos reservados para exemplo e datas de admissão. As fotos de perfil são **avatares ilustrados gerados localmente**, não retratos de pessoas reais.

Entre os chamados há casos resolvidos dentro e fora do SLA, chamados abertos, atendimentos pausados e recorrência no mesmo elevador. Os períodos encerrados da origem são preservados, sem inventar atividade em execução.

Para importar, entre como Administrativo, selecione o arquivo, valide e confirme. O pacote foi preparado para coexistir com a demonstração inicial: reutiliza as zonas e cria matrículas, locais, equipamentos e chamados com identificadores próprios. O reenvio não duplica registros. Colaboradores importados ficam inativos; para testar um login deles, o Administrativo precisa ativá-lo e definir uma senha. O arquivo não é importado automaticamente na base do usuário.

`scripts/generate-demo.mjs` permite regenerar o arquivo; as datas de referência são fixas para manter o teste reproduzível. Não altere uma origem já importada para sobrescrever registros: use as telas de edição ou uma origem nova para outro conjunto fictício.
