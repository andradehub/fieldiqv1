# FieldIQ — Integração com Supabase + Vercel (via GitHub)

Esta versão já está organizada (HTML / CSS / JS separados) e pronta para ser
publicada online através do seu repositório no GitHub. Esse é o caminho
**recomendado** — mais simples que publicar manualmente, porque toda vez que
você atualizar o código no GitHub, a Vercel republica automaticamente.

---

## PARTE 1 — Subir este projeto para o seu repositório

Você já tem o repositório: `github.com/andradehub/fieldiq`

No seu computador, dentro da pasta `fieldiq-cloud` (esta pasta extraída do zip):

```bash
git init
git remote add origin https://github.com/andradehub/fieldiq.git
git add .
git commit -m "FieldIQ - versão inicial"
git branch -M main
git push -u origin main
```

Se o repositório já tiver algum conteúdo (ex.: um README criado pelo GitHub),
rode `git pull origin main --allow-unrelated-histories` antes do `push`.

---

## PARTE 2 — Conectar o repositório à Vercel (deploy automático)

1. Acesse https://vercel.com → **Add New → Project**.
2. Escolha **Import Git Repository** e selecione `andradehub/fieldiq`.
3. Em **Root Directory**, deixe a raiz do projeto (a Vercel detecta o `vercel.json`,
   que já aponta a pasta `public/` como saída).
4. Clique em **Deploy**.
5. Em poucos segundos você recebe uma URL pública, do tipo
   `https://fieldiq.vercel.app` — acessível de qualquer lugar, sem precisar
   abrir nada no seu computador.

A partir de agora, **todo `git push` para o branch `main` republica o site
automaticamente** — não é preciso repetir o processo manualmente.

> Neste ponto, o app está 100% online, mas ainda usando os dados de
> demonstração em memória (cada pessoa que acessa vê os dados resetados).
> Para persistência real e dados compartilhados entre todos os usuários,
> siga a Parte 3.

---

## PARTE 3 — Conectar ao Supabase (banco de dados real)

### 3.1 Criar o projeto
1. Acesse https://supabase.com → "New Project".
2. Em **Settings → API**, anote:
   - `Project URL` (ex: `https://xxxxx.supabase.co`)
   - `anon public key`

### 3.2 Criar as tabelas
No painel do Supabase, abra **SQL Editor** e execute, na ordem:
1. `supabase/schema.sql` (cria as tabelas: zonas, pessoas, chamados, historico_chamados)
2. `supabase/seed.sql` (popula com os dados de demonstração)

### 3.3 Conectar o front-end ao Supabase
No arquivo `public/index.html`, adicione o script do cliente Supabase **antes**
da tag que carrega o `app.js`:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
  const SUPABASE_URL = 'https://xxxxx.supabase.co';
  const SUPABASE_KEY = 'sua-anon-key-aqui';
  const supa = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
</script>
<script src="assets/js/app.js"></script>
```

### 3.4 Onde trocar os dados em memória por chamadas reais
O arquivo `assets/js/app.js` guarda tudo em variáveis (`chamados`, `PESSOAS`,
`ZONAS`). Os pontos exatos onde trocar isso por chamadas ao Supabase:

| Função em `app.js`         | O que faz hoje                  | O que ela deve fazer com Supabase |
|------------------------------|-----------------------------------|-------------------------------------|
| `chamadosVisiveis()`         | Filtra o array `chamados`         | `await supa.from('chamados').select('*, historico_chamados(*)')` |
| `abrirChamado_novo()`        | `chamados.unshift(novo)`          | `await supa.from('chamados').insert(novo)` |
| `salvarEdicaoChamado(id)`    | Edita o objeto em memória         | `await supa.from('chamados').update({...}).eq('id', id)` |
| `salvarDescricao(id)`        | Edita `c.descricao`               | `await supa.from('chamados').update({descricao}).eq('id', id)` |
| `fazerLogin()`               | Compara com array `USUARIOS`      | Usar **Supabase Auth** ou consultar a tabela `pessoas` |
| `adicionarNaEquipe()`        | Muda `p.zona_id` em memória       | `await supa.from('pessoas').update({zona_id}).eq('matricula', mat)` |
| `minutosResolucao(c)`        | Calcula no navegador              | Pode usar a view `vw_chamados_metricas` (já calcula no banco) |

Exemplo de como ficaria `chamadosVisiveis()` usando Supabase:

```javascript
async function chamadosVisiveis() {
  const regiao = regiaoDeZona(currentUser.zona_id);
  const zonasDaRegiao = ZONAS.filter(z => z.regiao === regiao).map(z => z.id);
  const { data, error } = await supa
    .from('chamados')
    .select('*, historico_chamados(*)')
    .in('zona_id', zonasDaRegiao);
  if (error) { console.error(error); return []; }
  return data;
}
```

> Atenção: essas funções passam a ser **assíncronas** (`async`/`await`). As
> funções que as chamam (`renderChamados`, `renderDashboard`, etc.) também
> precisam usar `await`. Esse é o principal ajuste estrutural da migração.

### 3.5 Storage para a foto de perfil
1. No Supabase: **Storage → New Bucket** → crie um bucket `fotos` (público).
2. Ajuste `trocarFoto()` em `app.js`:
```javascript
async function trocarFoto(input) {
  const file = input.files[0];
  const path = `${currentUser.matricula}.jpg`;
  await supa.storage.from('fotos').upload(path, file, { upsert: true });
  const { data } = supa.storage.from('fotos').getPublicUrl(path);
  await supa.from('pessoas').update({ foto_url: data.publicUrl }).eq('matricula', currentUser.matricula);
}
```

### 3.6 Publicar a versão conectada
Depois de editar `app.js`/`index.html`, basta:
```bash
git add .
git commit -m "Conecta ao Supabase"
git push
```
A Vercel republica automaticamente.

---

## Variáveis de ambiente (mais seguro que deixar a chave no HTML)
No painel da Vercel → **Settings → Environment Variables**, adicione
`SUPABASE_URL` e `SUPABASE_ANON_KEY`. Use a função em `api/` (Python) para
servir essas chaves ao front-end sem expor segredos direto no código público.

---

## Resumo do caminho completo
1. `git push` para `andradehub/fieldiq` → conecta na Vercel → app já está online.
2. Rodar `schema.sql` + `seed.sql` no Supabase → banco pronto.
3. Colar as 3 linhas do client Supabase no `index.html`.
4. Trocar as funções da tabela acima em `app.js` para usar `supa.from(...)`.
5. `git push` de novo → Vercel republica automaticamente.
