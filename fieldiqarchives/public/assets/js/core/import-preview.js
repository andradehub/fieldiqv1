export const IMPORT_GROUPS={zonas:'Zonas',pessoas:'Pessoas e fotos',locais:'Locais',elevadores:'Elevadores',chamados:'Chamados',historicos:'Histórico',equipes:'Equipes dos chamados',atendimentos:'Períodos de atendimento'};
const labels={id:'Identificação na origem',nome:'Nome',codigo:'Código',regiao:'Região',local:'Área',matricula:'Matrícula',role:'Perfil',cargo:'Cargo',zona_id:'Zona',cpf:'CPF',email:'E-mail',telefone:'Telefone',admissao:'Admissão',login:'Usuário',endereco:'Endereço',bairro:'Bairro',local_id:'Local',fabricante:'Fabricante',modelo:'Modelo',numero_serie:'Número de série',capacidade_kg:'Capacidade (kg)',elevador_id:'Elevador',elevador_codigo:'Elevador',tecnico_id:'Responsável',tecnico:'Responsável',titulo:'Título',descricao:'Descrição',tipo_obra:'Classificação',prioridade:'Prioridade',status:'Situação',sla_horas:'Prazo de resolução (h)',aberto_em:'Abertura',iniciado_em:'Início',resolvido_em:'Resolução',encerrado_em:'Fim',solucao:'Solução',chamado_id:'Chamado',usuario_id:'Autor',alteracao:'Registro',data:'Data',entrou_em:'Entrada',saiu_em:'Saída'};
const values={tecnico:'Técnico',supervisor:'Supervisor',administrativo:'Administrativo / RH',aberto:'Aberto',em_andamento:'Em andamento',resolvido:'Resolvido',cancelado:'Cancelado',baixa:'Baixa',media:'Média',alta:'Alta',critica:'Crítica',obra_nova:'Obra nova',mod_integral:'Modificação integral',mod_parcial:'Modificação parcial'};
export const normalizeSearch=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export const safePreviewPhoto=value=>typeof value==='string'&&value.length<=140000&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)?value:null;
const validRow=value=>value&&typeof value==='object'&&!Array.isArray(value);
export function previewGroups(upload){
  const pack=upload.kind==='migration'?upload.pack:{chamados:upload.rows};
  const maps=Object.fromEntries(Object.keys(IMPORT_GROUPS).map(key=>[key,new Map((Array.isArray(pack[key])?pack[key]:[]).filter(validRow).map(row=>[String(row.id),key==='zonas'?[row.nome,row.local,row.codigo].filter(Boolean).join(' · '):row.nome??row.codigo??row.titulo??row.id]))]));
  const references={zona_id:'zonas',local_id:'locais',elevador_id:'elevadores',tecnico_id:'pessoas',usuario_id:'pessoas',chamado_id:'chamados'};
  return Object.entries(IMPORT_GROUPS).filter(([key])=>Array.isArray(pack[key])&&pack[key].length).map(([key,label])=>({key,label,rows:pack[key].map((raw,index)=>{
    if(!validRow(raw))return {title:'Registro '+(index+1)+' inválido',fields:[['Conteúdo',String(raw)]],photo:null,search:normalizeSearch(raw)};
    const fields=Object.entries(raw).filter(([field,value])=>field!=='foto'&&value!==undefined&&value!==null&&value!=='').map(([field,value])=>{
      const ref=references[field],resolved=ref?maps[ref].get(String(value)):null;
      const displayed=resolved?resolved+' · '+value:typeof value==='object'?JSON.stringify(value):Object.hasOwn(values,value)?values[value]:String(value);
      return [Object.hasOwn(labels,field)?labels[field]:field.replaceAll('_',' '),displayed];
    });
    const title=String(raw.nome??raw.titulo??raw.codigo??raw.alteracao??(key==='equipes'?'Participação em equipe ':key==='atendimentos'?'Atendimento ':'Registro ')+(index+1));
    if(raw.foto&&!safePreviewPhoto(raw.foto))fields.push(['Foto','Formato da foto precisa ser validado']);
    return {title,fields,photo:safePreviewPhoto(raw.foto),search:normalizeSearch(title+' '+fields.flat().join(' '))};
  })}));
}
export function previewPage(rows,{search='',page=1}={}){
  const filtered=rows.filter(row=>row.search.includes(normalizeSearch(search)));
  const pages=Math.max(1,Math.ceil(filtered.length/5)),current=Math.max(1,Math.min(pages,Number(page)||1));
  return {rows:filtered.slice((current-1)*5,current*5),total:filtered.length,pages,page:current};
}
