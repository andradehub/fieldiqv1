// Shared with the API. Job titles describe employment; roles determine access.
export const JOB_TITLES={
  tecnico:[
    'Técnico de campo I','Técnico de campo II','Técnico de campo III',
    'Técnico de manutenção','Técnico de manutenção de elevadores Júnior','Técnico de manutenção de elevadores Pleno','Técnico de manutenção de elevadores Sênior',
    'Técnico de Serviços Júnior','Técnico de Serviços Pleno','Técnico de Serviços Sênior',
    'Oficial de Manutenção I','Oficial de Manutenção II','Oficial de Manutenção III',
    'Ajustador de elevadores','Montador de elevadores','Técnico de segurança e qualidade de produtos','Especialista técnico e de qualidade',
    'Estagiário de campo'
  ],
  supervisor:['Supervisor de operações','Supervisor de manutenção de elevadores','Supervisor de Serviços','Supervisor de instalações','Supervisor de modernização','Supervisor de instalações, modernização e acessibilidade','Líder de equipe de novas instalações'],
  administrativo:['Administrativo / RH','Analista de Recursos Humanos','Coordenador administrativo'],
  cliente:['Representante de condomínio','Síndico','Gestor de manutenção predial','Administrador de imóvel']
};
export function jobTitles(role,current=''){
  const titles=[...(JOB_TITLES[role]??[])];
  if(current&&!titles.includes(current))titles.unshift(current);
  return Object.fromEntries(titles.map(title=>[title,title]));
}
