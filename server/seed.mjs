import { hashPassword } from './auth.mjs';

export async function seedDatabase(db, password) {
  const zones = [
    ['cap-01','capital','Zona 01','Centro'], ['cap-02','capital','Zona 02','Copacabana'],
    ['cap-03','capital','Zona 03','Tijuca'], ['cap-04','capital','Zona 04','Barra da Tijuca'],
    ['cap-05','capital','Zona 05','Botafogo'], ['int-01','interior','Zona 01','Niterói'],
    ['int-02','interior','Zona 02','Petrópolis'], ['int-03','interior','Zona 03','Volta Redonda'],
    ['int-04','interior','Zona 04','Campos dos Goytacazes'], ['int-05','interior','Zona 05','Cabo Frio']
  ];
  for (const z of zones) await db.query('INSERT INTO zonas VALUES ($1,$2,$3,$4)', z);
  const people = [
    ['TK-CAP-001','Carlos Mendes','tecnico','Técnico de Serviços Sênior','capital','cap-04','tecnico.capital'],
    ['TK-CAP-002','Ana Ferreira','tecnico','Técnica de Serviços Pleno','capital','cap-04','ana.capital'],
    ['TK-CAP-003','Bruno Tavares','tecnico','Oficial de Manutenção II','capital','cap-04','bruno.capital'],
    ['TK-CAP-004','Patrícia Souza','tecnico','Técnica de Serviços Júnior','capital','cap-05','patricia.capital'],
    ['TK-CAP-SUP-01','Fernanda Lopes','supervisor','Supervisora de Operações','capital','cap-04','supervisor.capital'],
    ['TK-INT-001','Roberto Silva','tecnico','Técnico de Serviços Sênior','interior','int-01','tecnico.interior'],
    ['TK-INT-002','Juliana Costa','tecnico','Líder Técnica','interior','int-01','juliana.interior'],
    ['TK-INT-003','Marcos Oliveira','tecnico','Oficial de Manutenção I','interior','int-01','marcos.interior'],
    ['TK-INT-SUP-01','Marcelo Andrade','supervisor','Supervisor de Operações','interior','int-01','supervisor.interior']
  ];
  for (const p of people) {
    await db.query('INSERT INTO pessoas (matricula,nome,role,cargo,regiao,zona_id,login,senha_hash) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [...p, await hashPassword(password)]);
  }
  const places = [
    ['Condomínio Parque da Barra','Av. das Américas, 1000 — endereço fictício','Barra da Tijuca','cap-04'],
    ['Edifício Atlântico','Rua Voluntários, 200 — endereço fictício','Botafogo','cap-05'],
    ['Comercial Centro','Av. Rio Branco, 100 — endereço fictício','Centro','cap-01'],
    ['Empresarial Niterói','Rua da Conceição, 300 — endereço fictício','Centro de Niterói','int-01'],
    ['Hotel Serra','Rua das Flores, 50 — endereço fictício','Centro de Petrópolis','int-02']
  ];
  for (const p of places) await db.query('INSERT INTO locais (nome,endereco,bairro,zona_id) VALUES ($1,$2,$3,$4)', p);
  const lifts = [
    ['BAR-001',1,'TK Elevator','Modelo demonstrativo A','DEMO-BAR-001',750],
    ['BAR-002',1,'TK Elevator','Modelo demonstrativo A','DEMO-BAR-002',750],
    ['BOT-001',2,'TK Elevator','Modelo demonstrativo B','DEMO-BOT-001',600],
    ['CEN-001',3,'TK Elevator','Modelo demonstrativo C','DEMO-CEN-001',900],
    ['NIT-001',4,'TK Elevator','Modelo demonstrativo A','DEMO-NIT-001',750],
    ['PET-001',5,'TK Elevator','Modelo demonstrativo B','DEMO-PET-001',600]
  ];
  for (const l of lifts) await db.query('INSERT INTO elevadores (codigo,local_id,fabricante,modelo,numero_serie,capacidade_kg) VALUES ($1,$2,$3,$4,$5,$6)', l);

  const now = Date.now();
  async function ticket({lift = 1, title, desc, days, hours = 2, status = 'resolvido', solution = null, tech = 'TK-CAP-001', sla = 24, type = 'mod_parcial', priority = 'media'}) {
    const open = new Date(now - days * 86400000).toISOString();
    const resolved = status === 'resolvido' ? new Date(new Date(open).getTime() + hours * 3600000).toISOString() : null;
    const creator = lift >= 5 ? 'TK-INT-SUP-01' : 'TK-CAP-SUP-01';
    const row = await db.query(
      'INSERT INTO chamados (elevador_id,titulo,descricao,tipo_obra,prioridade,status,sla_horas,tecnico_matricula,aberto_em,resolvido_em,solucao,criado_por) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id',
      [lift,title,desc,type,priority,status,sla,tech,open,resolved,solution,creator]
    );
    const id = row.rows[0].id;
    await db.query('INSERT INTO historico_chamados (chamado_id,usuario_matricula,alteracao,data) VALUES ($1,$2,$3,$4)', [id,creator,'Chamado fictício registrado para demonstração.',open]);
    if (resolved) await db.query('INSERT INTO historico_chamados (chamado_id,usuario_matricula,alteracao,data) VALUES ($1,$2,$3,$4)', [id,tech ?? creator,'Encerrado com solução registrada pelo técnico.',resolved]);
  }
  const door = 'Porta interrompe o fechamento no térreo, com acionamento intermitente do sensor de presença.';
  const doorSolution = 'Registro fictício: equipe identificou falha intermitente no conjunto de detecção da porta; correção documentada e funcionamento validado conforme procedimento técnico.';
  for (const [days, tech, hours] of [[35,'TK-CAP-001',2],[24,'TK-CAP-002',3],[14,'TK-CAP-001',28],[6,'TK-CAP-003',2]]) {
    await ticket({title:'Porta não fecha — sensor intermitente',desc:door,days,tech,hours,solution:doorSolution,priority:'alta'});
  }
  await ticket({title:'Porta volta a abrir durante fechamento',desc:door,days:0.15,status:'aberto',priority:'alta'});
  await ticket({lift:2,title:'Ruído na cabine durante deslocamento',desc:'Ruído metálico relatado na cabine do elevador de serviço.',days:8,tech:'TK-CAP-002',solution:'Registro fictício: origem do ruído identificada e correção validada pela equipe.'});
  await ticket({lift:2,title:'Iluminação da cabine intermitente',desc:'Luzes da cabine oscilando durante o uso.',days:0.3,status:'em_andamento',tech:'TK-CAP-002'});
  await ticket({lift:3,title:'Porta apresenta falha no sensor',desc:door,days:18,tech:'TK-CAP-004',solution:'Registro fictício: conjunto de detecção revisado e funcionamento validado.'});
  await ticket({lift:3,title:'Modernização do quadro de comando',desc:'Atualização planejada do equipamento.',days:3,status:'em_andamento',tech:'TK-CAP-004',type:'mod_integral',sla:120});
  await ticket({lift:4,title:'Instalação de elevador comercial',desc:'Acompanhamento de entrega de equipamento novo.',days:15,hours:72,tech:null,solution:'Registro fictício: instalação concluída e entrega documentada.',type:'obra_nova',sla:120});
  await ticket({lift:4,title:'Verificação de botoeira',desc:'Acionamento intermitente relatado na botoeira do hall.',days:2,status:'aberto',tech:null,priority:'baixa'});
  for (const days of [28,12]) await ticket({lift:5,title:'Porta não fecha — sensor intermitente',desc:door,days,tech:'TK-INT-001',solution:'Registro fictício exclusivo do Interior: componente inspecionado pela equipe local.'});
  await ticket({lift:5,title:'Porta volta a abrir no térreo',desc:door,days:0.2,status:'aberto',tech:'TK-INT-001',priority:'alta'});
  await ticket({lift:5,title:'Ruído na cabine',desc:'Ruído durante deslocamento.',days:7,tech:'TK-INT-002',solution:'Registro fictício: causa registrada e atendimento validado.'});
  await ticket({lift:5,title:'Modernização do painel',desc:'Atualização programada do painel.',days:4,status:'em_andamento',tech:'TK-INT-003',type:'mod_integral',sla:120});
  await ticket({lift:6,title:'Instalação de elevador panorâmico',desc:'Obra nova em hotel demonstrativo.',days:10,hours:96,tech:null,solution:'Registro fictício: obra concluída e entrega aprovada.',type:'obra_nova',sla:168});
}
