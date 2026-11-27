# Segurança e privacidade do FieldIQ

Documento técnico para explicar as medidas implementadas no protótipo. Os testes usam bases fictícias isoladas. A proteção precisa ser avaliada também no ambiente em que a aplicação for publicada.

## DevTools e autorização

O usuário consegue inspecionar a interface e repetir requisições pelo DevTools. A segurança depende de o servidor verificar cada pedido: a sessão identifica a pessoa no banco, e as regras usam esse perfil e sua zona. Alterar HTML, esconder/mostrar botões ou enviar `role: administrativo` no corpo de uma requisição não modifica a conta autenticada.

Dados já entregues legitimamente ao navegador podem ser lidos por seu usuário. Por isso, esconder uma coluna de CPF com CSS seria insuficiente: o servidor não inclui CPF ou login nos dados enviados ao supervisor. Uma conta comprometida conserva as permissões daquela conta até a sessão ser revogada; o sistema não identifica automaticamente quem está fisicamente usando um navegador autenticado.

## Medidas e implementação

| Medida | Implementação e limite |
| --- | --- |
| Autenticação | Senha verificada por scrypt, salt aleatório e comparação de tempo constante em `server/auth.mjs`. O banco armazena hash de senha. |
| Sessão | Token aleatório de 32 bytes; apenas SHA-256 do token é persistido. Cookie HTTP-only, SameSite=Lax, expiração em 12 horas e Secure em produção. Logout invalida a sessão no banco. |
| Tentativas de login | Limite de 10 falhas por IP em janela de 15 minutos. Contador em memória por processo: não é um controle distribuído para múltiplas instâncias. |
| Autorização | Regras no servidor para perfil, zona, responsabilidade/participação e vínculos de clientes. IDs de outra zona não permitem consultar detalhes ou baixar anexos. |
| Gestão de acesso | Somente Administrativo cadastra, altera ou desativa usuários. Troca de senha/perfil/zona e desativação revogam sessões conforme regras de `server/users.mjs`. |
| Minimização | Bootstrap e sessão usam listas explícitas de campos. Supervisor consulta contatos da própria zona sem CPF, login ou hashes; consulta de banco e exportação não entregam credenciais. Administrativo recebe CPF mascarado na lista. |
| SQL injection | Valores externos são passados como parâmetros (`$1`, `$2` etc.). A tabela de consulta é escolhida de um catálogo fixo, sem aceitar SQL arbitrário ou concatenar nomes livres do usuário. |
| XSS | Textos externos são escapados para HTML/atributos por `esc()`. Arquivos não são executados como HTML. CSP permite scripts locais, bloqueia script inline e objetos; estilos inline ainda são permitidos para recursos de apresentação. |
| Origem de escrita | POST/PATCH/DELETE/PUT com cabeçalho Origin externo não autorizado são recusados. Cookie SameSite=Lax complementa essa medida. Não se declara existência de token CSRF dedicado. |
| Cabeçalhos | CSP, X-Content-Type-Options=nosniff, X-Frame-Options=DENY, Referrer-Policy=same-origin. API usa Cache-Control=no-store. |
| Anexos | Autenticação e escopo de zona para lista, conteúdo e download; autorização para alteração, inspeção de tipos/conteúdo e limites de upload. Não há antivírus integrado. |
| Integridade e histórico | Transações, chaves estrangeiras, restrições no banco, revisão para conflitos de edição e histórico com autoria/horário. Não é um registro externo inviolável: administradores do próprio banco podem alterar dados. |
| Segredos e dados locais | `.env`, banco `.fieldiq/`, sessões, backups e resultados privados são ignorados pelo Git. A exportação de domínio não é um backup completo. |

Consultas parametrizadas e catálogo permitido seguem os controles descritos pela [OWASP para prevenção de SQL injection](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html). Escape conforme o contexto e uso de CSP como defesa complementar são abordados pela [OWASP para prevenção de XSS](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html).

## CPF e LGPD

CPF é um dado pessoal. Ele não integra automaticamente a categoria legal de dados pessoais sensíveis. A LGPD estabelece princípios como necessidade e segurança e exige medidas técnicas e administrativas de proteção. Consultar [Lei 13.709/2018, artigos 5º, 6º e 46](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm).

O protótipo restringe a coleta/exposição por perfil e registra alterações de usuários. O CPF permanece armazenado no banco sem criptografia específica de campo; mascarar na interface não equivale a criptografá-lo. Criptografia do disco, backups e infraestrutura depende da implantação. Senhas são tratadas com hash, que tem finalidade diferente de criptografia reversível.

Uma implantação real exige definir finalidade/base legal, prazo de retenção, pessoas autorizadas, atendimento aos direitos dos titulares e processo de incidentes. O código sozinho não comprova conformidade integral. Textos livres e anexos podem conter dados pessoais digitados pelos usuários; não existe classificação ou remoção automática desses dados.

## Recorrências e serviços externos

A identificação de recorrências é local: normalização, TF-IDF, similaridade de cosseno, termos de componentes e referências aos chamados anteriores da zona. Não existe chamada a LLM nesta versão, mesmo que configurações antigas de provedor permaneçam no ambiente. Os nomes históricos `sugestoes_ia`/`avaliacoes_ia` foram mantidos para preservar os dados e os relacionamentos.

Push é uma pendência de implementação. Antes de ativá-lo, as inscrições precisam pertencer ao usuário correto, ser revogáveis e evitar dados pessoais nas telas bloqueadas. Também exige contexto seguro e integração com service worker, conforme [MDN — Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API).

## Evidências de testes para explicar no TCC

Executar em ambiente de demonstração com `npm test`:

1. Tentar login com texto de SQL injection: resposta 401, sem cookie de sessão.
2. Acessar API sem sessão: 401. Usar sessão de outra zona em detalhes, anexos ou perfil: 404.
3. Como supervisor, enviar PATCH de usuário manualmente: 403. Conferir que as respostas de sessão, bootstrap, usuários e consulta de pessoas não contêm os campos privados vedados.
4. Enviar escrita com Origin externo e consultar nome arbitrário de tabela: operações recusadas.
5. Conferir persistência, conflitos de revisão, regras de equipe e preservação de dados na migração.

`test/browser.mjs` cria um título com tentativa de HTML/script e verifica que aparece como texto sem execução. `test/browser-review.mjs` verifica a ausência dos controles administrativos no supervisor e os fluxos de equipe. `test/review.test.mjs` reúne as verificações adicionais de privacidade e acesso direto.

Essas verificações documentam os cenários exercitados; não constituem auditoria de invasão completa ou promessa de ausência de vulnerabilidades. HTTPS público, recuperação de backup remoto e operação em infraestrutura de produção exigem verificações próprias.
