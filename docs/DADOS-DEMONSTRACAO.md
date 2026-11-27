# Base fictícia reproduzível

Uma instalação demonstrativa nova cria dez zonas, 51 contas, 25 locais, 46 elevadores e 177 chamados. São os registros iniciais mais 40 colaboradores, 20 locais, 40 elevadores e 160 chamados adicionais. Há supervisão, técnicos e estágio em cada zona; chamados abertos, em andamento e resolvidos, prioridades A/B/C, períodos de trabalho, participação de estagiário e casos recorrentes por equipamento.

Os avatares são ilustrações claramente fictícias, servidas como oito arquivos PNG compartilhados. As 51 contas possuem foto, CPF com dígitos verificadores, e-mail de demonstração, telefone e admissão. O CPF gerado não passa por consulta oficial; não representa uma pessoa real identificada. Contatos usam `example.com` e números deliberadamente não discáveis. Não use os registros para contatar pessoas ou demonstrar dados de clientes reais.

As contas usuais do README continuam disponíveis. As adicionais têm login `demonstracao.1` a `demonstracao.40`, na ordem do catálogo de dez zonas, quatro por zona: supervisor, dois técnicos e estagiário. Cada senha recebe salt individual, mesmo quando a senha da demonstração é igual. No modo remoto, é obrigatório configurar `DEMO_PASSWORD`; o padrão local conhecido é exclusivo de demonstração.

## Instalação nova

`npm start` inicializa e preenche uma base demonstrativa vazia. `DEMO_MODE=0` com banco remoto não cria esse catálogo. Reiniciar preserva registros e datas; a versão `operacao-ampliada-v1` em `inicializacoes_demo` impede repetir a ampliação. O preenchimento não cria notificações de atribuição retrospectivas. A rotina normal de SLA poderá criar alertas de registros vencidos existentes.

## Base demonstrativa existente

Não apague o banco para atualizar. Encerre o servidor, faça uma cópia completa de `.fieldiq/data` e execute:

```powershell
npm run demo:expandir
```

O comando é exclusivo do modo demonstrativo e usa transação. Reconhece o conjunto anterior de 40 colaboradores/elevadores `DEMO2-` para não repetir os 160 chamados. Se houver conjunto parcial, interrompe sem completar arbitrariamente. O marcador impede reaplicação.

Para as onze identidades conhecidas do seed original, matrícula, nome e login precisam corresponder. Apenas foto/CPF/contatos/admissão nulos são complementados; campos já preenchidos não são substituídos. Chamados, datas, históricos e equipes existentes não são reescritos. Se a base antiga já tiver registros adicionados pelo usuário, sua contagem final pode ser diferente de 177/51.

Isso é preparação de dados fictícios do próprio projeto, não importação nem compatibilidade com bases empresariais externas. Não existe menu ou arquivo de upload dessa função.

## Evidência

`test/demo.test.mjs` verifica quantidades, imagens existentes, CPF válido e único no catálogo, salt individual, contatos, isolamento, estágio e preservação na reaplicação. `test/browser-demo.mjs` verifica imagens decodificadas, pesquisa, gestão e catálogo de cargos em 390 e 1440 pixels. A identificação de recorrências continua sendo orientação; os exemplos não comprovam redução de custos ou eficácia em campo.
