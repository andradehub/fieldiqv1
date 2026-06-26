-- ============================================================
--  FieldIQ — Dados iniciais (Supabase / PostgreSQL)
-- ============================================================

insert into zonas (id, regiao, nome, local) values
('cap-01','capital','Zona 01','Centro'),
('cap-02','capital','Zona 02','Zona Sul (Copacabana)'),
('cap-03','capital','Zona 03','Tijuca'),
('cap-04','capital','Zona 04','Barra da Tijuca'),
('cap-05','capital','Zona 05','Botafogo'),
('int-01','interior','Zona 01','Niterói'),
('int-02','interior','Zona 02','Petrópolis'),
('int-03','interior','Zona 03','Volta Redonda'),
('int-04','interior','Zona 04','Campos dos Goytacazes'),
('int-05','interior','Zona 05','Cabo Frio');

insert into pessoas (matricula, nome, role, cargo, zona_id, login, senha_hash) values
('TK-CAP-001','Carlos Mendes','tecnico','Técnico de Serviços Sênior','cap-05','tecnico.capital','tk2026'),
('TK-CAP-002','Ana Ferreira','tecnico','Técnico de Serviços Pleno','cap-05',null,null),
('TK-CAP-003','Bruno Tavares','tecnico','Oficial de Manutenção II','cap-05',null,null),
('TK-CAP-004','Patrícia Souza','tecnico','Técnico de Serviços (Júnior)','cap-05',null,null),
('TK-CAP-SUP-01','Fernanda Lopes','supervisor','Supervisor de Operações de Zona','cap-05','supervisor.capital','tk2026'),
('TK-INT-001','Roberto Silva','tecnico','Técnico de Serviços Sênior','int-01','tecnico.interior','tk2026'),
('TK-INT-002','Juliana Costa','tecnico','Líder Técnico / Especialista','int-01',null,null),
('TK-INT-003','Marcos Oliveira','tecnico','Oficial de Manutenção I','int-01',null,null),
('TK-INT-SUP-01','Marcelo Andrade','supervisor','Supervisor de Operações de Zona','int-01','supervisor.interior','tk2026');

insert into chamados (titulo, descricao, tipo_obra, zona_id, prioridade, status, tecnico_matricula, aberto_em, resolvido_em, sla_cumprido, solucao, criado_por) values
('Instalação de elevador — Edifício Atlântico','Instalação completa de elevador novo — Ed. Atlântico, Torre A.','obra_nova','cap-05','alta','resolvido','TK-CAP-001','2025-03-01 08:00','2025-03-10 10:30',true,'Obra concluída e equipamento aprovado.','TK-CAP-SUP-01'),
('Porta do elevador não fecha corretamente','Porta travando ao fechar — substituição do sensor.','mod_parcial','cap-05','alta','resolvido','TK-CAP-002','2025-03-15 09:00','2025-03-15 11:00',true,'Substituição do sensor modelo X200 por X300.','TK-CAP-SUP-01'),
('Modernização integral do quadro de comando','Troca integral do quadro de comando e cabos de tração do elevador.','mod_integral','cap-05','media','em_andamento','TK-CAP-001','2025-03-18 09:00',null,null,null,'TK-CAP-SUP-01'),
('Elevador apresentando ruído na cabine','Barulho metálico durante a operação da cabine.','mod_parcial','cap-05','baixa','resolvido','TK-CAP-003','2025-03-10 08:00','2025-03-10 12:00',true,'Aperto dos parafusos do painel interno e cabos.','TK-CAP-SUP-01'),
('Instalação de elevador social — Torre B','Obra nova de elevador social — Torre B do condomínio.','obra_nova','cap-05','critica','em_andamento','TK-CAP-004','2025-03-20 10:00',null,null,null,'TK-CAP-SUP-01'),
('Vazamento de óleo no sistema hidráulico do elevador','Mancha de óleo visível na base do pistão.','mod_parcial','cap-01','alta','aberto',null,'2025-03-22 07:30',null,null,null,'TK-CAP-SUP-01'),
('Modernização integral do elevador panorâmico','Substituição completa de máquina de tração e cabine panorâmica.','mod_integral','cap-03','media','aberto',null,'2025-03-21 08:00',null,null,null,'TK-CAP-SUP-01'),
('Instalação de elevador — Edifício Comercial Niterói','Obra nova — instalação completa, vistoria aprovada.','obra_nova','int-01','media','resolvido','TK-INT-001','2025-03-08 08:00','2025-03-20 14:00',true,'Aprovado. Certificado emitido.','TK-INT-SUP-01'),
('Substituição parcial da botoeira do elevador','Botoeira do térreo com defeito.','mod_parcial','int-01','baixa','resolvido','TK-INT-002','2025-03-09 08:00','2025-03-09 11:00',true,'Peça substituída e testada.','TK-INT-SUP-01'),
('Modernização integral da máquina de tração','Troca completa de máquina de tração do elevador.','mod_integral','int-01','media','em_andamento','TK-INT-001','2025-03-18 09:00',null,null,null,'TK-INT-SUP-01'),
('Elevador parado entre pavimentos','Cabine parou entre pavimentos com passageiro.','mod_parcial','int-01','critica','resolvido','TK-INT-003','2025-03-12 16:00','2025-03-12 17:30',true,'Reset do sistema de controle e calibração de sensores.','TK-INT-SUP-01'),
('Instalação de elevador panorâmico — Hotel Petrópolis','Instalação de elevador panorâmico para o saguão do hotel.','obra_nova','int-02','baixa','aberto',null,'2025-03-19 09:00',null,null,null,'TK-INT-SUP-01'),
('Modificação parcial do painel de comando do elevador','Painel de comando com botões intermitentes.','mod_parcial','int-04','media','aberto',null,'2025-03-21 08:00',null,null,null,'TK-INT-SUP-01');
