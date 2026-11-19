import {state} from '../core/state.js';
import {esc} from '../core/format.js';
import {button,icon,notice} from '../components/ui.js';
const names={zonas:'Zonas',pessoas:'Colaboradores',locais:'Locais',elevadores:'Elevadores',chamados:'Chamados',historicos:'Registros de histórico'};
export function renderMigration(){
  const m=state.ui.migration;
  return `<p class="body-copy">Reaproveite cadastros e histórico de outro sistema. Exporte os dados na origem e organize-os no modelo FieldIQ antes de enviar.</p>
    <a class="button button--secondary" href="/exemplo-migracao.json" download>${icon('Download',17)}Baixar exemplo completo JSON</a>
    <label class="attachment-upload" for="migration-file">${icon('Database',22)}<strong>Selecionar pacote de migração</strong><span>JSON no modelo FieldIQ · até 2 MB e 1.000 registros</span><input id="migration-file" data-change="migration-file" type="file" accept=".json"></label>
    ${m?.pack?`<div class="migration-source"><strong>${esc(m.file.name)}</strong><span>Origem: ${esc(m.pack.origem??'Não informada')}</span></div><div class="migration-counts">${Object.entries(names).map(([key,label])=>`<div><span>${label}</span><strong>${Array.isArray(m.pack[key])?m.pack[key].length:0}</strong></div>`).join('')}</div>`:''}
    ${m?.result?`${notice(m.result.ja_importado?'Este pacote já foi importado.':m.result.importado?'Migração concluída. Cadastros e vínculos preservados.':'Validação concluída. Confira as quantidades antes de importar.','CircleCheck','success')}<div class="table-wrap"><table class="data-table"><thead><tr><th>Cadastro</th><th>${m.result.importado?'Criados':'A criar'}</th><th>Reutilizados</th></tr></thead><tbody>${Object.entries(names).map(([key,label])=>`<tr><td>${label}</td><td>${m.result.resumo.criados[key]??0}</td><td>${m.result.resumo.reutilizados[key]??0}</td></tr>`).join('')}</tbody></table></div>`:''}
    ${notice('A importação é feita em uma única operação: um erro impede a gravação do pacote inteiro. Contas migradas começam inativas; ative-as na Gestão de usuários com novas senhas.','Info')}
    <p class="text-small text-muted">O arquivo precisa ser adaptado aos campos do modelo. Backups SQL, BAK e FDB não são enviados diretamente. Não há conexão automática com sistemas de terceiros.</p>
    <div class="migration-actions">${m?.pack&&!m.result?.importado&&!m.result?.ja_importado?button('Validar pacote',{action:'migration-validate',tone:'secondary',name:'ListChecks'}):''}${m?.result?.validado&&!m.result.importado&&!m.result.ja_importado?button('Importar cadastros e histórico',{action:'migration-confirm',tone:'primary',name:'DatabaseBackup'}):''}</div>`;
}
export function renderMigrationDialog(){
  return `<div class="utility-header"><div><p class="eyebrow">MIGRAÇÃO DE DADOS</p><h2 id="utility-title">Trazer dados de outro sistema</h2></div>${button('Fechar',{action:'close-utility',name:'X',tone:'quiet'})}</div><div class="utility-body form-stack" id="migration-content">${renderMigration()}</div>`;
}
