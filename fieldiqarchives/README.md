# FieldIQ — Versão CLOUD (Supabase + Vercel)

## Estrutura
```
fieldiq-cloud/
├── public/
│   ├── index.html              ← HTML enxuto (sem CSS/JS inline)
│   └── assets/
│       ├── css/style.css       ← todo o visual da aplicação
│       └── js/app.js           ← toda a lógica (dados, permissões, IA, etc.)
├── api/sugestao.py             ← exemplo de backend Python (função serverless na Vercel)
├── supabase/schema.sql         ← cria as tabelas no Supabase (PostgreSQL)
├── supabase/seed.sql           ← popula com os dados de demonstração
├── vercel.json                 ← configuração de deploy (aponta para /public)

```

## Logins de demonstração (iguais à versão local)
| Perfil                | Login                | Senha   |
|------------------------|-----------------------|---------|
| Técnico — Capital      | tecnico.capital       | tk2026  |
| Técnico — Interior     | tecnico.interior      | tk2026  |
| Supervisor — Capital   | supervisor.capital    | tk2026  |
| Supervisor — Interior  | supervisor.interior   | tk2026  |
