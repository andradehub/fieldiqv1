# Manutenção do FieldIQ

Estas instruções registram preferências explícitas do responsável pelo projeto.

- Mantenha o código, migrações, testes, exemplos fictícios e documentação necessários ao projeto versionados no GitHub. Ao concluir uma alteração autorizada, faça commit, publique na branch de trabalho e confira o estado remoto.
- Explique o **motivo** de cada commit e alteração: qual problema ou necessidade motivou a mudança, o que foi feito e como foi verificado. Use o padrão de [CONTRIBUTING.md](CONTRIBUTING.md).
- Atualize o [README.md](README.md) quando mudar função, permissão, fluxo, configuração, comando ou limite documentado. Registre entregas relevantes e seus motivos em [CHANGELOG.md](CHANGELOG.md).
- Preserve os arquivos locais do usuário. Não publique senhas reais, tokens, `.env`, sessões, dados reais de usuários, banco local, cópias de segurança ou resultados privados de testes. Respeite `.gitignore`; exemplos fictícios e `.env.example` podem ser versionados.
- Não reescreva commits já publicados apenas para mudar mensagens. Complemente a explicação no histórico e na revisão, preservando os identificadores compartilhados.
- Publicar commits não significa incorporar uma revisão à `main` nem implantar em produção. Mantenha clara a branch que contém a versão funcional e cumpra o escopo autorizado pelo usuário.
- Para alterações de documentação, confira as afirmações no código e valide links/rotas relevantes. Para mudanças funcionais, execute as verificações adequadas; não trate uma verificação não executada como aprovada.

O responsável prioriza uso em celular, preservação do roxo/laranja e comunicação em português. Neste estágio, o trabalho solicitado é a aplicação e sua documentação técnica; apresentações são uma etapa posterior, a ser solicitada separadamente.
