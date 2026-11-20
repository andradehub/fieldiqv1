import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseCSV} from '../fieldiqarchives/public/assets/js/core/import.js';
export async function convertFolder(folder,source,mapping={}){
  if(!source?.trim())throw new Error('Informe um nome para identificar o sistema de origem.');
  const pack={formato:'fieldiq-legado-v1',origem:source};
  for(const entity of ['zonas','pessoas','locais','elevadores','chamados','historicos','equipes','atendimentos']){
    let content;
    try{content=await readFile(path.join(folder,entity+'.csv'),'utf8');}catch(error){if(error.code==='ENOENT')continue;throw error;}
    pack[entity]=parseCSV(content).map(raw=>{
      const config=mapping[entity]??{},row={...config.padroes};
      if(config.colunas){for(const[field,column]of Object.entries(config.colunas)){if(!Object.hasOwn(raw,column))throw new Error(entity+': coluna não encontrada: '+column);row[field]=raw[column];}}
      else Object.assign(row,raw);
      for(const[field,values]of Object.entries(config.valores??{})){if(Object.hasOwn(values,row[field]))row[field]=values[row[field]];}
      for(const field of ['capacidade_kg','sla_horas'])if(row[field]!==undefined&&row[field]!=='')row[field]=Number(row[field]);
      return Object.fromEntries(Object.entries(row).filter(([,v])=>v!==''&&v!==undefined));
    });
  }
  if(Object.keys(pack).length===2)throw new Error('Não encontrei arquivos CSV das entidades na pasta informada.');
  return pack;
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url))){
  const [folder,source,output,mappingFile]=process.argv.slice(2);
  if(!folder||!source||!output)throw new Error('Use node scripts/convert-legacy.mjs <pasta-csv> <origem> <arquivo-saida.json> [mapeamento.json]');
  const mapping=mappingFile?JSON.parse(await readFile(mappingFile,'utf8')):{};
  const pack=await convertFolder(path.resolve(folder),source,mapping);
  await mkdir(path.dirname(path.resolve(output)),{recursive:true});await writeFile(output,JSON.stringify(pack,null,2),'utf8');
  console.log('Pacote criado. Valide e importe pela área Administrativo → Importar dados → Migrar cadastros e histórico.');
}
