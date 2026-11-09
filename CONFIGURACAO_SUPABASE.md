# SIGEP — Configuração do Supabase

## 1. Executar as migrations SQL

No painel do Supabase, acesse **SQL Editor** e execute os arquivos nesta ordem:

1. `supabase/migrations/001_initial_schema.sql` — Cria todas as tabelas
2. `supabase/migrations/002_rls_policies.sql` — Configura as políticas de segurança
3. `supabase/migrations/003_seed_data.sql` — Insere cursos padrão

## 2. Configurar autenticação

No painel do Supabase:
1. Vá em **Authentication > Providers**
2. Certifique-se que **Email** está habilitado
3. Em **Authentication > URL Configuration**, adicione:
   - Site URL: `https://seu-projeto.vercel.app`
   - Redirect URLs: `https://seu-projeto.vercel.app/auth/callback`

## 3. Variáveis de ambiente no Vercel

No painel da Vercel, acesse o projeto SIGEP > Settings > Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://ixlaamxxelytxjobslpf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_461_hRyhbwkPMfvaciBfdg_6ch7QftP
SUPABASE_SERVICE_ROLE_KEY=<sua_service_role_key>
```

**⚠️ IMPORTANTE:** A `SUPABASE_SERVICE_ROLE_KEY` é encontrada em:
Supabase Dashboard > Project Settings > API > **service_role** (secret)

Nunca exponha essa chave no frontend!

## 4. Criar o primeiro usuário administrador

Após o deploy, no Supabase SQL Editor:

```sql
-- 1. Criar usuário via Auth (faça pelo painel Auth > Users > Add user)
-- Email: adm@sestsenat.org.br
-- Senha: (escolha uma senha segura)

-- 2. Após criar, atualizar o perfil para adm:
UPDATE usuarios SET perfil = 'adm', nome = 'Administrador' 
WHERE email = 'adm@sestsenat.org.br';
```

Ou via Supabase Dashboard > Authentication > Users > Create new user

## 5. Verificar RLS

Teste as permissões em SQL Editor:

```sql
-- Verificar se RLS está ativo
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public';
```

Todas as tabelas devem ter `rowsecurity = true`.
