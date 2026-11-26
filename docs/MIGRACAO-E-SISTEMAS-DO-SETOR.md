# Sistemas do setor e evolução futura

Pesquisa documental consultada em 19/11/2026, preservada como referência. Escopo atualizado em 26/11/2026: a importação de dados foi retirada da versão final do TCC. Este arquivo não descreve uma função disponível na aplicação.

## O que foi possível confirmar

Não foi encontrado um levantamento representativo que estabeleça qual SGBD é o mais utilizado pelas empresas de elevadores no Brasil. Um software de gestão, seu banco interno e seu formato de exportação são coisas diferentes. Não é adequado escolher um “banco legado padrão” e prometer compatibilidade universal.

| Referência primária | O que a fonte documenta | Consequência para o FieldIQ |
| --- | --- | --- |
| [Liftflex — aplicativo de campo](https://liftflex.com/recursos/app/) | Chamados, ordens de serviço, fotos e marcação de início/fim com timestamp. | Fundamenta a combinação de evidências, responsável e registro de horários. Não demonstra o formato de uma exportação completa. |
| [Eleve — software para manutenção de elevadores](https://www.eleveapp.com.br/) | Histórico por elevador, responsável por chamado, fotos, visitas e relatórios exportados para Excel. | Relatórios podem ser uma fonte de dados tabulares. A disponibilidade de relatórios não garante exportação de todas as tabelas. |
| [FIELDBOSS para empresas de elevadores](https://www.fieldboss.com/p/elevator-contractor-management-software/) | Gestão do setor construída em Microsoft Dynamics 365. | É um exemplo real de plataforma de gestão, sem implicar que todo usuário tenha acesso direto ao banco. |
| [Caso Murphy Elevator, publicado pelo FIELDBOSS](https://www.fieldboss.com/wp-content/uploads/2024/06/FIELDBOSS-Case_Study-Murphy-Elevators.pdf) | A empresa utilizava Total Service e QuickBooks; o caso descreve um banco proprietário no sistema anterior. | É um exemplo concreto de origem legada no setor. Não há conector Total Service implementado no FieldIQ. |

As referências são fontes dos fornecedores, sem comparação independente de participação de mercado. Nenhuma delas comprova a existência de um formato universal de banco de dados ou arquivo de exportação do setor.

## Possibilidade futura

Uma futura integração dependerá de amostras autorizadas, análise do esquema de origem, mapeamento de campos, transformação de valores e conferência das referências entre equipamentos, pessoas e chamados. O projeto atual não contém conectores nem conversores para bancos externos. O histórico de versões do GitHub preserva a implementação anterior para eventual estudo, sem apresentar essa funcionalidade como parte da entrega atual.
