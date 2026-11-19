# Migração de dados e sistemas usados no setor de elevadores

Pesquisa documental consultada em 19/11/2026. Este documento descreve a implementação da aplicação e suas referências; não é uma apresentação.

## O que foi possível confirmar

Não foi encontrado um levantamento representativo que estabeleça qual SGBD é o mais utilizado pelas empresas de elevadores no Brasil. Um software de gestão, seu banco interno e seu formato de exportação são coisas diferentes. Não é adequado escolher um “banco legado padrão” e prometer compatibilidade universal.

| Referência primária | O que a fonte documenta | Consequência para o FieldIQ |
| --- | --- | --- |
| [Liftflex — aplicativo de campo](https://liftflex.com/recursos/app/) | Chamados, ordens de serviço, fotos e marcação de início/fim com timestamp. | Fundamenta a combinação de evidências, responsável e registro de horários. Não demonstra o formato de uma exportação completa. |
| [Eleve — software para manutenção de elevadores](https://www.eleveapp.com.br/) | Histórico por elevador, responsável por chamado, fotos, visitas e relatórios exportados para Excel. | Relatórios podem ser uma fonte de dados tabulares. A disponibilidade de relatórios não garante exportação de todas as tabelas. |
| [FIELDBOSS para empresas de elevadores](https://www.fieldboss.com/p/elevator-contractor-management-software/) | Gestão do setor construída em Microsoft Dynamics 365. | É um exemplo real de plataforma de gestão, sem implicar que todo usuário tenha acesso direto ao banco. |
| [Caso Murphy Elevator, publicado pelo FIELDBOSS](https://www.fieldboss.com/wp-content/uploads/2024/06/FIELDBOSS-Case_Study-Murphy-Elevators.pdf) | A empresa utilizava Total Service e QuickBooks; o caso descreve um banco proprietário no sistema anterior. | É um exemplo concreto de origem legada no setor. Não há conector Total Service implementado no FieldIQ. |

As referências são fontes dos fornecedores, não uma comparação independente de participação de mercado. A solução adotada é uma decisão de arquitetura: receber exportações autorizadas, mapear os campos e validar os vínculos antes da gravação.

## O que a aplicação recebe

Há dois fluxos separados:

- **Importar chamados:** CSV/TXT, Excel ou lista JSON, até 500 linhas. Usado quando os elevadores já estão cadastrados. Disponível ao supervisor da zona e ao Administrativo.
- **Migrar cadastros e histórico:** pacote JSON `fieldiq-legado-v1`, até 1.000 registros e 2 MB. Exclusivo do Administrativo. Inclui zonas, técnicos/supervisores, locais, elevadores, chamados e registros de histórico. CSVs de várias tabelas podem ser convertidos pelo utilitário descrito abaixo.

O modelo completo está em `fieldiqarchives/public/exemplo-migracao.json` e pode ser baixado na interface. Seus dados são fictícios e não representam uma exportação oficial de qualquer fornecedor.

## Etapas da migração

1. O responsável pelo sistema de origem exporta os cadastros e o histórico por relatório, ferramenta de administração ou API autorizada.
2. Os nomes de colunas, códigos de status, datas e referências são adaptados ao modelo FieldIQ. Uma planilha de indicadores agregados não substitui o histórico individual dos atendimentos.
3. O Administrativo seleciona o JSON e executa **Validar pacote**. A validação usa as regras do banco e reverte a transação ao final: os registros de domínio não ficam gravados.
4. A tela apresenta quantidades a criar e reutilizar. Depois de conferir, o Administrativo seleciona **Importar cadastros e histórico**. O servidor revalida o arquivo nessa etapa.
5. A gravação é atômica: se houver um erro, o pacote inteiro é revertido. A mensagem identifica a entidade e a posição do registro.
6. Os IDs da origem são relacionados aos IDs locais. Reenviar o mesmo pacote não duplica os dados. Um ID já importado com conteúdo diferente gera conflito, em vez de sobrescrever o cadastro.
7. Colaboradores migrados começam inativos. O Administrativo define acesso e uma senha nova na Gestão de usuários. Não são importados hashes ou senhas do sistema anterior.

A prévia pode consumir números de sequências PostgreSQL mesmo após a reversão; lacunas de numeração não representam chamados gravados.

## Campos e referências

Cada registro tem `id`, que identifica o registro na origem. As referências a outras entidades usam esses IDs da origem, não os números internos do FieldIQ.

| Entidade | Campos principais |
| --- | --- |
| zonas | id, codigo, regiao (`capital`/`interior`), nome, local |
| pessoas | id, matricula, nome, role (`tecnico`/`supervisor`), zona_id; opcionais: cargo, cpf, email, telefone, admissao |
| locais | id, nome, endereco, bairro, zona_id |
| elevadores | id, codigo, local_id, fabricante, modelo, numero_serie, capacidade_kg |
| chamados | id, elevador_id, titulo, aberto_em; opcionais: tecnico_id, descricao, tipo_obra, prioridade, status, sla_horas, iniciado_em, resolvido_em, solucao |
| historicos | id, chamado_id, alteracao, data; opcional: usuario_id |

Chamados resolvidos exigem solução e data de resolução. Use datas ISO 8601 com fuso. Os valores aceitos de status são `aberto`, `em_andamento`, `resolvido`, `cancelado`; prioridade: `baixa`, `media`, `alta`, `critica`; tipo_obra: `obra_nova`, `mod_integral`, `mod_parcial`.

Um primeiro início histórico não comprova o tempo efetivamente trabalhado. Por isso, a migração preserva `iniciado_em`, mas não inventa períodos de trabalho ou pausas. O SLA e o tempo de resolução são calculados a partir da abertura e do encerramento originais.

## Conversão de CSVs de um sistema anterior

O utilitário `scripts/convert-legacy.mjs` lê `zonas.csv`, `pessoas.csv`, `locais.csv`, `elevadores.csv`, `chamados.csv` e `historicos.csv` de uma pasta. Arquivos ausentes são omitidos. Use UTF-8; os delimitadores vírgula, ponto e vírgula, tabulação e barra vertical são reconhecidos.

Exemplo em PowerShell, a partir da pasta do projeto:

```powershell
node scripts/convert-legacy.mjs 'D:\dados-legado' 'Empresa demonstrativa — sistema anterior' 'D:\dados-legado\pacote-fieldiq.json' 'D:\dados-legado\mapeamento.json'
```

O arquivo de mapeamento é opcional quando as colunas já usam os nomes do modelo. Exemplo de adaptação de um CSV de chamados:

```json
{
  "chamados": {
    "colunas": {
      "id": "NUM_OS",
      "elevador_id": "COD_EQUIPAMENTO",
      "titulo": "ASSUNTO",
      "status": "SITUACAO",
      "aberto_em": "DATA_ABERTURA",
      "resolvido_em": "DATA_FECHAMENTO",
      "solucao": "SOLUCAO"
    },
    "padroes": {"sla_horas": 24, "tipo_obra": "mod_parcial"},
    "valores": {"status": {"A": "aberto", "F": "resolvido"}}
  }
}
```

Esse mapeamento é ilustrativo. Não corresponde ao esquema proprietário de Liftflex, Eleve, FIELDBOSS ou Total Service. A coluna de data precisa ser convertida para ISO com fuso caso a origem use outro formato.

## Extração de bancos e limites

Quando a empresa tem acesso autorizado ao banco, a extração deve ser feita com ferramentas do SGBD e consultas ajustadas ao esquema. O [PostgreSQL documenta exportação CSV por COPY](https://www.postgresql.org/docs/current/sql-copy.html); o [SQL Server documenta importação e exportação de arquivos e outras fontes](https://learn.microsoft.com/en-us/sql/relational-databases/import-export/overview-import-export?view=sql-server-ver16). Isso não significa que esses SGBDs predominem no setor.

O FieldIQ não executa SQL recebido por upload, não restaura arquivos BAK/FDB e não se conecta automaticamente a fornecedores. A migração foi validada com dados fictícios no modelo fornecido; uma migração real exige amostra de exportação, mapeamento e conferência com a empresa. Anexos binários e períodos completos de trabalho anteriores não fazem parte deste pacote de migração.
