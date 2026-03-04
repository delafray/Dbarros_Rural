# PROMPT 21 — Sistema de Backup Completo e Automático (Dbarros Rural)

> **Para IA lendo este arquivo:** Você está prestes a entender o sistema de backup mais completo possível para uma aplicação Supabase + React. Leia este documento inteiro antes de agir. Ele explica o que já existe, como funciona, e o que você precisa fazer para restaurar o sistema do zero — sem perder nenhum dado, script, tabela ou política.

---

## O QUE É ESTE SISTEMA

O usuário clica em **"Backup BD"** na interface. Um único botão gera um arquivo ZIP completo que contém **tudo** que é necessário para recriar o sistema inteiro num projeto Supabase zerado. Nada é esquecido. Nada precisa de atualização manual.

O ZIP gerado contém:
- Todos os usuários (auth.users + public.users) com seus UUIDs originais
- Dados de todas as tabelas do banco em ordem correta (respeitando FK)
- Schema completo (migrations históricas + DDL auto-gerado)
- **Definições de todas as funções PostgreSQL** (extraídas ao vivo via `pg_get_functiondef`)
- **Todas as políticas RLS** (extraídas ao vivo via `pg_policies`)
- Todos os arquivos do Storage (fotos, documentos PDF, etc.)
- Um guia de restauração dinâmico gerado no momento do backup

---

## STACK DO PROJETO

- **Frontend:** React + TypeScript + Tailwind CSS + Vite
- **Backend:** Supabase (PostgreSQL + Auth + RLS + Storage)
- **Roteamento:** React Router com HashRouter
- **Backup:** `services/backupService.ts` + JSZip
- **Automação de schema:** RPC `backup_introspect()` no PostgreSQL

---

## ESTRUTURA DO ZIP GERADO

```
backup_dbarros_full_YYYYMMDD.zip
├── RESTORE_GUIDE.md                    ← Guia dinâmico gerado no momento do backup
├── database/
│   ├── 1_auth_users_restore.sql        ← CRÍTICO: usuários no auth.users com UUIDs originais
│   ├── 2_schema_all_migrations.sql     ← Todas as migrations combinadas em ordem
│   ├── 3_schema_ddl_auto.sql          ← DDL simplificado auto-gerado (alternativa)
│   ├── 4_database_backup.sql           ← Dados de todas as tabelas (INSERT statements)
│   ├── 5_functions_ddl.sql            ← Funções PostgreSQL (DDL extraído ao vivo)
│   └── 6_rls_policies.sql            ← Políticas RLS (extraídas ao vivo)
├── schema_migrations/
│   └── *.sql (arquivos individuais de referência)
└── storage_backup/
    ├── photos/
    ├── edicao-docs/
    └── (outros buckets encontrados)
```

---

## COMO O SISTEMA É 100% AUTOMÁTICO

### 1. Migrations → descoberta automática via Vite glob
```typescript
// Em services/backupService.ts — linha ~7
const migModules = import.meta.glob('../supabase/migrations/*.sql', { as: 'raw', eager: true });
```
Qualquer novo arquivo `.sql` em `supabase/migrations/` é incluído automaticamente no ZIP. **Não precisa atualizar nenhuma lista.**

### 2. Tabelas → descoberta automática via RPC `backup_introspect()`
A função PostgreSQL `backup_introspect()` (schema `public`) faz introspection do banco e retorna:
- **`tables`**: todas as tabelas do schema `public` com suas colunas
- **`fk_deps`**: dependências de FK entre tabelas (para ordenação topológica)
- **`functions`**: DDL completo de cada função via `pg_get_functiondef(oid)`
- **`policies`**: todas as políticas RLS via `pg_policies`

Quando uma nova tabela é criada, ela é automaticamente descoberta na próxima execução do backup. **Não precisa atualizar lista de tabelas.**

### 3. Ordenação por FK → topological sort
O `backupService.ts` ordena as tabelas em ordem de inserção segura: tabelas referenciadas por FK são inseridas antes das dependentes. O arquivo `4_database_backup.sql` desativa validação de FK durante o restore com `SET session_replication_role = 'replica'`.

### 4. Guia de restauração → gerado dinamicamente
A função `generateRestoreGuide()` gera um guia personalizado contendo a contagem real de tabelas, funções, políticas e buckets do backup atual. O RESTORE_GUIDE.md dentro do ZIP sempre está atualizado.

---

## A FUNÇÃO `backup_introspect()` — DEFINIÇÃO COMPLETA

Esta função **deve existir no banco** para que o backup seja 100% automático. Se não existir, o sistema usa a lista de tabelas hardcoded como fallback.

```sql
CREATE OR REPLACE FUNCTION public.backup_introspect()
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT json_build_object(

    'tables', (
      SELECT json_agg(
        json_build_object(
          'name', t.table_name,
          'columns', (
            SELECT json_agg(
              json_build_object(
                'name', c.column_name,
                'udt',  c.udt_name,
                'nullable', (c.is_nullable = 'YES'),
                'has_default', (c.column_default IS NOT NULL)
              ) ORDER BY c.ordinal_position
            )
            FROM information_schema.columns c
            WHERE c.table_schema = 'public' AND c.table_name = t.table_name
          )
        ) ORDER BY t.table_name
      )
      FROM information_schema.tables t
      WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
    ),

    'fk_deps', (
      SELECT COALESCE(
        json_agg(json_build_object('from_table', fd.from_table, 'to_table', fd.to_table)),
        '[]'::json
      )
      FROM (
        SELECT DISTINCT kcu.table_name AS from_table, ccu.table_name AS to_table
        FROM information_schema.key_column_usage kcu
        JOIN information_schema.referential_constraints rc
          ON  kcu.constraint_name   = rc.constraint_name
          AND kcu.constraint_schema = rc.constraint_schema
        JOIN information_schema.constraint_column_usage ccu
          ON  rc.unique_constraint_name   = ccu.constraint_name
          AND rc.unique_constraint_schema = ccu.constraint_schema
        WHERE kcu.table_schema = 'public'
          AND ccu.table_schema = 'public'
          AND kcu.table_name  != ccu.table_name
      ) fd
    ),

    'functions', (
      SELECT COALESCE(
        json_agg(
          json_build_object('name', p.proname, 'def', pg_get_functiondef(p.oid))
          ORDER BY p.proname
        ),
        '[]'::json
      )
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
    ),

    'policies', (
      SELECT COALESCE(
        json_agg(
          json_build_object(
            'tablename',  pol.tablename,
            'policyname', pol.policyname,
            'permissive', pol.permissive,
            'cmd',        pol.cmd,
            'roles',      pol.roles,
            'qual',       pol.qual,
            'with_check', pol.with_check
          ) ORDER BY pol.tablename, pol.policyname
        ),
        '[]'::json
      )
      FROM pg_policies pol
      WHERE pol.schemaname = 'public'
    )

  );
$$;

GRANT EXECUTE ON FUNCTION public.backup_introspect() TO authenticated;
```

**ATENÇÃO:** Execute este SQL no Supabase Studio → SQL Editor uma única vez para ativar o sistema. Para atualizar, basta re-executar (CREATE OR REPLACE).

---

## ARQUIVO `services/backupService.ts` — O QUE FAZ CADA PARTE

### `BACKUP_TABLES_FALLBACK`
Lista hardcoded de tabelas usada SOMENTE quando `backup_introspect()` não está disponível. Não é a fonte de verdade quando o RPC funciona.

### `generateFunctionsDDL(functions)`
Gera `5_functions_ddl.sql` com:
- `CREATE OR REPLACE FUNCTION` completo de cada função (DDL extraído ao vivo)
- Bloco `DO $$` no final que re-aplica `GRANT EXECUTE ... TO authenticated` para todas as funções

### `generatePoliciesDDL(policies)`
Gera `6_rls_policies.sql` com:
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` por tabela
- `DROP POLICY IF EXISTS` + `CREATE POLICY` para cada política
- Política reconstruída com cmd, roles, USING e WITH CHECK

### `generateAuthRestoreSQL(users)`
Gera `1_auth_users_restore.sql` com:
- INSERT em `auth.users` com UUID original preservado
- INSERT em `auth.identities` vinculado ao mesmo UUID
- Senha temporária `GaleriaRestore2024!` (hash bcrypt hardcoded)
- **CRÍTICO:** Se os UUIDs mudarem, TODOS os vínculos quebram (fotos, tarefas, atendimentos, planilhas)

### `generateCombinedMigrations()`
Combina todos os arquivos `.sql` de `supabase/migrations/` em ordem alfabética num único arquivo.

### `topoSort(tables, fkDeps)`
Ordena tabelas em ordem de inserção segura respeitando dependências de FK.

---

## PASSO A PASSO COMPLETO DE RESTAURAÇÃO

Execute na ordem exata abaixo. Pular qualquer passo pode corromper os vínculos do banco.

### PASSO 1 — Criar novo projeto no Supabase
1. Acesse https://supabase.com e crie um novo projeto
2. Anote: **URL**, **ANON_KEY**, **SERVICE_ROLE_KEY**

### PASSO 2 — Restaurar usuários no Auth (EXECUTE PRIMEIRO — CRÍTICO)
No SQL Editor, execute:
```
database/1_auth_users_restore.sql
```
Este arquivo recria todos os usuários com seus **UUIDs originais**. Sem este passo, todos os vínculos do banco ficam corrompidos irreversivelmente.

> Senha temporária de todos os usuários: `GaleriaRestore2024!`

### PASSO 3 — Recriar o schema completo
```
database/2_schema_all_migrations.sql
```
Cria todas as tabelas, chaves estrangeiras, políticas RLS e funções PostgreSQL a partir das migrations históricas.

Se o arquivo 2 falhar: use `database/3_schema_ddl_auto.sql` como alternativa (DDL simplificado sem FKs).

### PASSO 4 — Restaurar os dados
```
database/4_database_backup.sql
```
O arquivo já inclui:
- `SET session_replication_role = 'replica'` → desativa validação de FK durante insert
- `ON CONFLICT DO NOTHING` em todos os INSERTs → idempotente, seguro rodar mais de uma vez
- `SET session_replication_role = DEFAULT` no final → reativa validações

### PASSO 5 — Recriar funções PostgreSQL (NÃO PULE)
**Primário:**
```
database/5_functions_ddl.sql
```
Contém o DDL exato das funções que existiam no banco, incluindo funções criadas diretamente no Supabase Studio fora das migrations. Inclui re-grant automático de EXECUTE para `authenticated`.

**Fallback manual (se o arquivo 5 não existir no ZIP):**

```sql
-- is_admin() — SECURITY DEFINER (evita recursão infinita de RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE((SELECT is_admin FROM public.users WHERE id = auth.uid()), false);
$$;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- create_user_admin(...)
CREATE OR REPLACE FUNCTION public.create_user_admin(
    user_name TEXT, user_email TEXT, user_password TEXT,
    is_admin_flag BOOLEAN DEFAULT false, is_visitor_flag BOOLEAN DEFAULT false,
    can_manage_tags_flag BOOLEAN DEFAULT false, is_projetista_flag BOOLEAN DEFAULT false
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE new_user_id UUID;
BEGIN
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        is_super_admin, confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
        'authenticated', 'authenticated', user_email, crypt(user_password, gen_salt('bf')),
        NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}',
        '{}', false, '', '', '', ''
    ) RETURNING id INTO new_user_id;
    INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id)
    VALUES (new_user_id, new_user_id,
            json_build_object('sub', new_user_id::text, 'email', user_email),
            'email', NOW(), NOW(), NOW(), user_email);
    INSERT INTO public.users (id, name, email, is_admin, is_visitor, can_manage_tags, is_projetista, is_active, is_temp)
    VALUES (new_user_id, user_name, user_email, is_admin_flag, is_visitor_flag, can_manage_tags_flag, is_projetista_flag, true, false);
    RETURN new_user_id;
END;$$;
GRANT EXECUTE ON FUNCTION public.create_user_admin(TEXT,TEXT,TEXT,BOOLEAN,BOOLEAN,BOOLEAN,BOOLEAN) TO authenticated;

-- update_user_password_admin(...)
CREATE OR REPLACE FUNCTION public.update_user_password_admin(target_user_id UUID, new_password TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE auth.users SET encrypted_password = crypt(new_password, gen_salt('bf')), updated_at = NOW()
    WHERE id = target_user_id;
END;$$;
GRANT EXECUTE ON FUNCTION public.update_user_password_admin(UUID,TEXT) TO authenticated;

-- delete_user_admin(...)
CREATE OR REPLACE FUNCTION public.delete_user_admin(target_user_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    DELETE FROM public.users WHERE id = target_user_id;
    DELETE FROM auth.identities WHERE user_id = target_user_id;
    DELETE FROM auth.users WHERE id = target_user_id;
END;$$;
GRANT EXECUTE ON FUNCTION public.delete_user_admin(UUID) TO authenticated;

-- rename_opcional_item(...)
CREATE OR REPLACE FUNCTION public.rename_opcional_item(old_nome TEXT, new_nome TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE planilha_vendas_estandes
    SET opcionais_selecionados = (opcionais_selecionados - old_nome) ||
        jsonb_build_object(new_nome, opcionais_selecionados->old_nome)
    WHERE opcionais_selecionados ? old_nome;
    UPDATE edicao_imagens_config SET origem_ref = new_nome
    WHERE origem_tipo = 'item_opcional' AND origem_ref = old_nome;
END;$$;
GRANT EXECUTE ON FUNCTION public.rename_opcional_item(TEXT,TEXT) TO authenticated;

-- search_clientes(...) — busca fuzzy sem acentos
CREATE OR REPLACE FUNCTION public.search_clientes(search_term TEXT)
RETURNS SETOF public.clientes LANGUAGE sql STABLE AS $$
  SELECT * FROM public.clientes
  WHERE unaccent(lower(nome)) LIKE '%' || unaccent(lower(search_term)) || '%'
     OR unaccent(lower(COALESCE(razao_social, ''))) LIKE '%' || unaccent(lower(search_term)) || '%'
     OR cpf_cnpj LIKE '%' || search_term || '%'
  ORDER BY nome;
$$;
GRANT EXECUTE ON FUNCTION public.search_clientes(TEXT) TO authenticated;

-- backup_introspect() — necessário para backups futuros serem automáticos
-- (ver SQL completo no início deste documento ou em supabase/migrations/20260303000000_create_backup_introspect.sql)
```

### PASSO 6 — Restaurar políticas RLS (NÃO PULE)
**Primário:**
```
database/6_rls_policies.sql
```
Contém todas as políticas RLS do schema `public` reconstruídas. Execute **após** o arquivo 5 (funções), pois algumas políticas usam `public.is_admin()`.

**Suplemento** — aplica política admin genérica em todas as tabelas (cobre tabelas novas):
```sql
DO $$
DECLARE tbl_name text;
BEGIN
    FOR tbl_name IN
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Admins bypass RLS for SELECT in %s" ON public.%I', tbl_name, tbl_name);
        EXECUTE format(
            'CREATE POLICY "Admins bypass RLS for SELECT in %s" ON public.%I FOR SELECT TO authenticated '
            'USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));',
            tbl_name, tbl_name
        );
    END LOOP;
END;$$;
```

**Políticas especiais da tabela `users`:**
```sql
DROP POLICY IF EXISTS "Admin pode ler qualquer usuario" ON public.users;
CREATE POLICY "Admin pode ler qualquer usuario" ON public.users
FOR SELECT TO authenticated
USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Allow anon to lookup active users for login" ON public.users;
CREATE POLICY "Allow anon to lookup active users for login" ON public.users
FOR SELECT TO anon
USING (is_active = true);
```

### PASSO 7 — Restaurar arquivos do Storage
1. Crie os buckets no novo projeto (mesmos nomes):
   - `photos` — público
   - `edicao-docs` — público
2. Via CLI:
```bash
supabase storage cp --recursive ./storage_backup/photos/ supabase://photos/
supabase storage cp --recursive ./storage_backup/edicao-docs/ supabase://edicao-docs/
```
Ou upload manual via Supabase Studio → Storage.

### PASSO 8 — Atualizar variáveis de ambiente
Edite `.env.local` na raiz do projeto:
```
VITE_SUPABASE_URL=https://SEU-NOVO-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-nova-anon-key
```

### PASSO 9 — Corrigir URLs das fotos no banco
```sql
-- Primeiro, descubra o domínio antigo:
SELECT url FROM public.photos LIMIT 1;

-- Depois substitua (troque os domínios):
UPDATE public.photos SET
    url = REPLACE(url, 'https://PROJETO-ANTIGO.supabase.co', 'https://SEU-NOVO.supabase.co'),
    thumbnail_url = REPLACE(thumbnail_url, 'https://PROJETO-ANTIGO.supabase.co', 'https://SEU-NOVO.supabase.co')
WHERE url LIKE '%PROJETO-ANTIGO.supabase.co%'
   OR thumbnail_url LIKE '%PROJETO-ANTIGO.supabase.co%';
```

### PASSO 10 — Reimplantar Edge Function de biometria
```bash
supabase link --project-ref SEU-NOVO-PROJECT-REF
supabase secrets set SUPABASE_URL=https://SEU-NOVO-PROJETO.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
supabase functions deploy passkey-auth
```
⚠️ Passkeys ficam vinculadas ao domínio original — cada usuário precisará re-registrar a digital/FaceID.

### PASSO 11 — Solicitar redefinição de senhas
Todos os usuários restaurados têm a senha temporária `GaleriaRestore2024!`. Instrua cada um a trocar após o primeiro login.

---

## CHECKLIST DE VERIFICAÇÃO PÓS-RESTAURAÇÃO

Execute este SQL para confirmar que tudo está correto:

```sql
-- Contagem de registros principais:
SELECT 'users' AS tabela, COUNT(*) FROM public.users
UNION ALL SELECT 'eventos', COUNT(*) FROM public.eventos
UNION ALL SELECT 'eventos_edicoes', COUNT(*) FROM public.eventos_edicoes
UNION ALL SELECT 'clientes', COUNT(*) FROM public.clientes
UNION ALL SELECT 'planilha_vendas_estandes', COUNT(*) FROM public.planilha_vendas_estandes
UNION ALL SELECT 'atendimentos', COUNT(*) FROM public.atendimentos
UNION ALL SELECT 'tarefas', COUNT(*) FROM public.tarefas
UNION ALL SELECT 'photos', COUNT(*) FROM public.photos
ORDER BY tabela;

-- Verificar funções críticas:
SELECT routine_name, security_type FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('is_admin','create_user_admin','update_user_password_admin',
                       'delete_user_admin','rename_opcional_item','search_clientes','backup_introspect')
ORDER BY routine_name;

-- Sincronização auth x public (devem ser iguais):
SELECT COUNT(*) AS auth_count FROM auth.users;
SELECT COUNT(*) AS public_count FROM public.users;

-- Verificar políticas na tabela users:
SELECT policyname, cmd, roles FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'users'
ORDER BY policyname;
```

---

## AUDITORIA DO BANCO — VERIFICAR SCRIPTS OCULTOS

Quando suspeitar que outro processo ou IA criou objetos não autorizados no banco, execute estes blocos:

### Verificar tabelas fora do padrão:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

### Verificar todas as funções criadas:
```sql
SELECT routine_name, security_type, routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;
```

### Verificar triggers:
```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY trigger_name;
```

### Verificar extensions instaladas:
```sql
SELECT extname, extversion FROM pg_extension ORDER BY extname;
```

### Verificar event triggers (Supabase-level):
```sql
SELECT evtname, evtevent, evtenabled FROM pg_event_trigger ORDER BY evtname;
```

### Verificar jobs agendados (pg_cron):
```sql
SELECT jobname, schedule, command FROM cron.job ORDER BY jobname;
```
*(Retornará erro se pg_cron não estiver instalado — isso é normal e esperado)*

---

## REGRAS CRÍTICAS DO SISTEMA (NUNCA VIOLAR)

| Regra | Detalhe |
|---|---|
| **FKs para usuários** | SEMPRE `REFERENCES public.users(id)` — NUNCA `auth.users(id)`. PostgREST só enxerga FKs dentro de `public` |
| **UUIDs dos usuários** | auth.users.id = public.users.id — nunca deixe mudar na restauração |
| **Ordem de restauração** | 1→auth → 2→schema → 3→dados → 4→funções(5) → 5→RLS(6) → 6→storage |
| **session_replication_role** | Arquivo 4 desativa validação de FK durante restore — reativado no final |
| **ON CONFLICT DO NOTHING** | Todos os INSERTs são idempotentes — seguro rodar múltiplas vezes |
| **Passkeys** | Vinculadas ao domínio original — precisam ser re-registradas após migração |
| **backup_introspect()** | Deve existir no banco para backups serem 100% automáticos |
| **Senha temporária** | `GaleriaRestore2024!` — todos os usuários restaurados recebem esta senha |

---

## TABELAS CONHECIDAS DO SISTEMA

Lista de referência (pode haver mais caso `backup_introspect()` não esteja disponível):

```
users, user_biometrics, system_config,
eventos, eventos_edicoes,
clientes, contatos, enderecos, contratos,
itens_opcionais, planilha_configuracoes, planilha_vendas_estandes,
atendimentos, atendimentos_historico,
tarefas, tarefas_historico,
tag_categories, tags, photos, photo_tags,
edicao_imagens_config, stand_imagens_status, stand_imagem_recebimentos
```

## BUCKETS DE STORAGE CONHECIDOS

```
photos, avatars, assets, system, edicao-docs
```

## ARQUIVOS-CHAVE NO PROJETO

| Arquivo | Função |
|---|---|
| `services/backupService.ts` | Lógica completa do backup — gera o ZIP |
| `supabase/migrations/20260303000000_create_backup_introspect.sql` | Criação da função RPC de introspection |
| `RESTORE_GUIDE.md` | Guia estático (o ZIP tem um guia mais atualizado) |
| `supabase/migrations/*.sql` | Histórico completo de migrations — incluídos automaticamente |

---

## COMO GERAR UM NOVO BACKUP

1. Abrir o sistema no navegador
2. Ir para a seção de configurações / admin
3. Clicar no botão **"Backup BD"**
4. Aguardar a barra de progresso completar (exporta tabelas → storage → compacta)
5. O arquivo `backup_dbarros_full_YYYYMMDD.zip` será baixado automaticamente

**O backup é completamente automático.** Não é necessário atualizar nenhum arquivo de código ao criar novas tabelas, funções ou políticas — tudo é descoberto automaticamente via `backup_introspect()`.
