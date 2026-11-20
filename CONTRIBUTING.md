# Como alterar e publicar o FieldIQ

O projeto deve permanecer reproduzível e documentado no GitHub. As mudanças precisam explicar sua finalidade, além de descrever os arquivos editados.

## Antes de alterar

1. Confira a branch atual, as alterações locais e o último estado remoto. Preserve trabalho que já exista.
2. Identifique o problema concreto, a regra de negócio e os perfis afetados.
3. Leia as partes correspondentes do README e do código. A documentação deve refletir o comportamento implementado.

Use a branch de trabalho existente quando estiver continuando a mesma revisão. Para uma nova branch de desenvolvimento, use o prefixo `codex/`, salvo orientação diferente do responsável.

## O que acompanhar uma mudança

- Código necessário para a função, sem arquivos de instalação ou dados privados.
- Migração nova para mudanças no esquema; preserve migrações já aplicadas e registre a nova no inicializador.
- Verificações compatíveis com o risco e o alcance da mudança.
- README atualizado se houver efeito em funcionalidades, permissões, telas, instalação, configuração, formatos ou limites.
- Entrada no CHANGELOG para entregas relevantes, explicando o motivo e o efeito observável.

Preserve o funcionamento por zona, a separação do portal do cliente e a prioridade para celular ao modificar seus respectivos fluxos.

## Mensagem de commit

O título descreve a mudança de forma concreta. O corpo deve explicar **por que ela é necessária** e quais evidências sustentam a entrega.

```text
Mostra todos os filtros de chamados no celular

Motivo:
Em telas estreitas, Cancelados ficava fora da área visível e o usuário
não descobria que havia outro filtro.

Alterações:
Reorganiza os filtros em grade e distribui os seletores pela largura
disponível, preservando o comportamento no computador.

Validação:
Conferidos limites dos elementos e seleção de Cancelados em 320,
390 e 834 px no Edge e em 390 px no WebKit.

Limites:
Emulação de navegador; teste em aparelho físico não executado.
```

O exemplo descreve uma alteração já existente; não representa uma obrigação de repetir esses mesmos testes em qualquer commit. Use validações que tenham sido realmente executadas.

Para uma correção pequena, o corpo pode ser curto. Não substitua a justificativa por expressões genéricas como “melhorias”, “ajustes gerais” ou “atualização”.

## Verificação

| Tipo de mudança | Verificação esperada |
| --- | --- |
| Somente documentação | Conferir fatos no código, links locais, âncoras e comandos mencionados; não é necessário repetir toda a suíte funcional sem motivo. |
| Regras/API/banco | Sintaxe e testes relevantes, incluindo autorização e persistência quando afetadas. |
| Interface | Fluxos afetados, responsividade e acessibilidade apropriadas ao escopo. |
| Build/configuração | Gerar/verificar o artefato ou configuração alterada; separar teste local de validação em nuvem. |

Os comandos disponíveis e as dependências dos testes de navegador estão no [README](README.md#testes-e-verificações).

## Publicar e conferir

1. Revise o diff e confirme os arquivos que entrarão no commit.
2. Faça o commit com motivo, alterações e validação.
3. Publique na branch correspondente do GitHub, preservando commits remotos existentes.
4. Confira que o SHA remoto corresponde ao commit publicado e que o diretório local não contém mudanças esquecidas.
5. Atualize a revisão relacionada para descrever o resultado final, o problema resolvido, os testes e os limites relevantes.
6. Informe o link do README, commit ou revisão ao responsável.

Não use força nem reescreva o histórico compartilhado para acrescentar justificativas a commits antigos. Os motivos das entregas anteriores ficam registrados no [CHANGELOG](CHANGELOG.md).

## Arquivos versionados e privados

São versionados: fontes, migrações SQL, scripts, testes, manifestos/lockfile de dependências, configuração reproduzível, documentação e dados **fictícios** de exemplo.

Permanecem locais ou no ambiente privado: `node_modules/`, `.env` e segredos, `.fieldiq/`, banco em uso, sessões, cópias de segurança, registros reais de pessoas, resultados privados de testes e credenciais de implantação. A pasta `public/` da raiz é gerada pelo build; o frontend-fonte está em `fieldiqarchives/public/`.

Um push publica o código na branch. Integração à `main` e implantação da aplicação são ações distintas e devem respeitar o escopo solicitado. Atualize a indicação da versão funcional no README quando a revisão for incorporada ou a branch de referência mudar.
