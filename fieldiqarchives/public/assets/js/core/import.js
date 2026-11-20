export function parseCSV(input){
  const text=input.replace(/^\uFEFF/,'');
  const first=text.split(/\r?\n/)[0];
  const delimiter=[',',';','\t','|'].sort((a,b)=>first.split(b).length-first.split(a).length)[0];
  const rows=[];let row=[],value='',quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}
    else if(c===delimiter&&!quoted){row.push(value);value='';}
    else if((c==='\n'||c==='\r')&&!quoted){
      if(c==='\r'&&text[i+1]==='\n')i++;
      row.push(value);if(row.some(x=>x.trim()))rows.push(row);row=[];value='';
    }else value+=c;
  }
  if(quoted)throw new Error('O CSV contém aspas não fechadas. Revise o arquivo.');
  row.push(value);if(row.some(x=>x.trim()))rows.push(row);
  const headers=rows.shift();
  if(!headers||!rows.length)throw new Error('O arquivo não contém linhas de dados.');
  return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h.trim(),r[i]??''])));
}
const normalize=s=>String(s??'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,'_');
export function normalizeRow(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Cada linha deve ser um objeto com as colunas do chamado.');
  const aliases={
    titulo:['titulo','title','assunto','chamado'],descricao:['descricao','description','detalhe'],
    tipo_obra:['tipo_obra','classificacao','tipo'],prioridade:['prioridade','priority'],status:['status','situacao'],
    elevador_codigo:['elevador_codigo','elevador','equipamento','codigo_elevador'],
    aberto_em:['aberto_em','abertura'],resolvido_em:['resolvido_em','resolucao'],
    solucao:['solucao','solucao_aplicada'],tecnico:['tecnico','matricula'],sla_horas:['sla_horas','sla']
  };
  const result={};
  for(const[key,value]of Object.entries(raw)){
    for(const[field,names]of Object.entries(aliases)){
      if(names.includes(normalize(key))&&value!=null){
        result[field]=value instanceof Date?value.toISOString():String(value).trim();break;
      }
    }
  }
  for(const field of ['tipo_obra','prioridade','status'])if(result[field])result[field]=normalize(result[field]);
  if(result.tipo_obra)result.tipo_obra=({modificacao_integral:'mod_integral',modificacao_parcial:'mod_parcial'})[result.tipo_obra]??result.tipo_obra;
  return result;
}
function migrationPackage(value){
  if(value?.formato!=='fieldiq-legado-v1')throw new Error('Use uma lista de chamados ou um pacote completo no modelo fieldiq-legado-v1.');
  return value;
}
export async function readMigration(file){
  if(file.size>2000000)throw new Error('Selecione um JSON de até 2 MB.');
  return migrationPackage(JSON.parse((await file.text()).replace(/^\uFEFF/,'')));
}
export async function readImport(file){
  if(file.size>2000000)throw new Error('Selecione um arquivo de até 2 MB.');
  const format=file.name.split('.').pop().toLowerCase();
  let rows;
  if(format==='json'){
    const value=JSON.parse((await file.text()).replace(/^\uFEFF/,''));
    if(value&&typeof value==='object'&&!Array.isArray(value)&&'formato' in value){
      return {kind:'migration',file,format,pack:migrationPackage(value)};
    }
    rows=Array.isArray(value)?value:[value];
  }
  else if(['csv','txt'].includes(format))rows=parseCSV(await file.text());
  else if(['xlsx','xls'].includes(format)){
    if(!window.XLSX)throw new Error('O leitor Excel ainda não está disponível. Tente novamente com conexão à internet ou utilize CSV/JSON.');
    const book=window.XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});
    rows=window.XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]]);
  }else throw new Error('Use um arquivo CSV, TXT, JSON, XLS ou XLSX.');
  if(!rows.length||rows.length>500)throw new Error('O arquivo deve conter entre 1 e 500 linhas.');
  const normalized=rows.map((row,index)=>{
    const result=normalizeRow(row);
    if(!Object.keys(result).length)throw new Error('Linha '+(index+1)+': nenhum campo de chamado reconhecido. Use as colunas do exemplo ou um pacote completo no modelo fieldiq-legado-v1.');
    return result;
  });
  return {kind:'tickets',file,format,rows:normalized,reading:false,error:null,result:null};
}
