# Guia de Restauração — Dbarros Rural

> **Ultima atualizacao:** 2026-03-03
>
> Este arquivo e uma referencia permanente. O guia **dentro do ZIP de backup** e
> sempre mais preciso (gerado automaticamente no momento do backup com dados reais).
>
> ### Tudo e automatico — nada precisa de atualizacao manual
>
> | O que acontece ao criar uma nova tabela | Automatico? |
> |---|---|
> | Nova migration em `supabase/migrations/*.sql` incluida no ZIP | **Sim** — via `import.meta.glob` |
> | Nova tabela descoberta e incluida no backup de dados | **Sim** — via `backup_introspect()` RPC |
> | DDL auto-gerado inclui a nova tabela | **Sim** — via `backup_introspect()` RPC |
> | Guia de restauracao dentro do ZIP reflete a nova tabela | **Sim** — gerado dinamicamente |
> | Politica RLS de admin aplicada na nova tabela (Passo 6) | **Sim** — usa `information_schema.tables` |
> | Checklist de verificacao inclui a nova tabela | **Sim** — gerado dinamicamente |
> | Funcoes PostgreSQL exportadas (DDL completo via `pg_get_functiondef`) | **Sim** — `5_functions_ddl.sql` |
> | Politicas RLS exportadas (via `pg_policies`) | **Sim** — `6_rls_policies.sql` |
>
> **Resumo: crie a tabela, crie a migration, rode o backup — nada mais.**

---

## ⚠️ LEIA ANTES DE COMEÇAR

### Ordem de execução é CRÍTICA

O sistema usa `auth.users.id` como chave primária de `public.users`.
Todos os vínculos (fotos, tarefas, atendimentos, planilhas) dependem desse UUID.
**Se os UUIDs mudarem, tudo quebra.** Execute sempre na ordem indicada.

### Pré-requisito: função `backup_introspect()`

Para que backups futuros sejam 100% automáticos, a função `backup_introspect()`
precisa existir no banco. Execute o SQL da **Seção 5F** no novo projeto
ou rode a migration `20260303000000_create_backup_introspect.sql`.

---

## Estrutura do ZIP de backup

```
backup_dbarros_full_YYYYMMDD.zip
├── RESTORE_GUIDE.md                       ← cópia do guia (gerado no momento do backup)
├── database/
│   ├── 1_auth_users_restore.sql           ← PRIMEIRO: usuários no Auth com UUIDs originais
│   ├── 2_schema_all_migrations.sql        ← SEGUNDO: todas as migrations combinadas
│   ├── 3_schema_ddl_auto.sql             ← ALTERNATIVA: DDL simplificado auto-gerado
│   ├── 4_database_backup.sql              ← QUARTO: dados de todas as tabelas
│   ├── 5_functions_ddl.sql               ← QUINTO: funções PostgreSQL (DDL extraído ao vivo)
│   └── 6_rls_policies.sql               ← SEXTO: políticas RLS (extraídas ao vivo)
├── schema_migrations/
│   └── *.sql (arquivos individuais — referência)
└── storage_backup/
    ├── photos/
    └── edicao-docs/
```

---

## Passo a passo de restauração

### Passo 1 — Criar novo projeto no Supabase

1. Acesse [https://supabase.com](https://supabase.com) e crie um novo projeto
2. Anote: **URL**, **ANON_KEY**, **SERVICE_ROLE_KEY**

---

### Passo 2 — Restaurar usuários no Auth (CRÍTICO — execute PRIMEIRO)

No **SQL Editor** do novo projeto, execute:

```
database/1_auth_users_restore.sql
```

Este arquivo recria todos os usuários no `auth.users` com seus **UUIDs originais**.
Sem este passo, todos os vínculos do banco ficam corrompidos.

> **Senha temporária de todos os usuários restaurados:** `GaleriaRestore2024!`

---

### Passo 3 — Recriar o schema completo

No SQL Editor, execute:

```
database/2_schema_all_migrations.sql
```

Este arquivo combina todas as migrations em sequência única.
Cria todas as tabelas, chaves estrangeiras, políticas RLS e funções PostgreSQL.

> Se o arquivo 2 falhar, use `database/3_schema_ddl_auto.sql` como alternativa
> (DDL simplificado sem FKs — funciona com `session_replication_role=replica`).

---

### Passo 4 — Restaurar os dados

No SQL Editor, execute:

```
database/4_database_backup.sql
```

O arquivo já inclui:
- `SET session_replication_role = 'replica'` → ignora FKs durante o insert
- `ON CONFLICT DO NOTHING` em todos os INSERTs → seguro rodar mais de uma vez
- `SET session_replication_role = DEFAULT` no final → reativa validações

---

### Passo 5 — Recriar as funções PostgreSQL

**Primário** — execute o arquivo auto-gerado (DDL extraído ao vivo do banco):

```
database/5_functions_ddl.sql
```

Inclui todas as funções do schema `public` + re-grant automático de `EXECUTE` para `authenticated`.

> **Nota para IA fazendo o restore:** não pule este passo. O arquivo `5_functions_ddl.sql`
> captura as funções exatamente como estavam no banco original, incluindo qualquer função
> criada diretamente no Supabase Studio (fora das migrations). Execute-o no SQL Editor.

---

**Fallback** — se o arquivo 5 não estiver no ZIP, execute os blocos manualmente:

#### 5A — `is_admin()` — SECURITY DEFINER (evita recursão infinita de RLS)

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.users WHERE id = auth.uid()),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
```

#### 5B — `create_user_admin(...)`

```sql
CREATE OR REPLACE FUNCTION public.create_user_admin(
    user_name       TEXT,
    user_email      TEXT,
    user_password   TEXT,
    is_admin_flag       BOOLEAN DEFAULT false,
    is_visitor_flag     BOOLEAN DEFAULT false,
    can_manage_tags_flag BOOLEAN DEFAULT false,
    is_projetista_flag  BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_user_id UUID;
BEGIN
    INSERT INTO auth.users (
        instance_id, id, aud, role,
        email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        is_super_admin, confirmation_token, recovery_token,
        email_change_token_new, email_change
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated', 'authenticated',
        user_email,
        crypt(user_password, gen_salt('bf')),
        NOW(), NOW(), NOW(),
        '{"provider":"email","providers":["email"]}',
        '{}',
        false, '', '', '', ''
    )
    RETURNING id INTO new_user_id;

    INSERT INTO auth.identities (
        id, user_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at, provider_id
    ) VALUES (
        new_user_id, new_user_id,
        json_build_object('sub', new_user_id::text, 'email', user_email),
        'email', NOW(), NOW(), NOW(),
        user_email
    );

    INSERT INTO public.users (
        id, name, email,
        is_admin, is_visitor, can_manage_tags, is_projetista,
        is_active, is_temp
    ) VALUES (
        new_user_id, user_name, user_email,
        is_admin_flag, is_visitor_flag, can_manage_tags_flag, is_projetista_flag,
        true, false
    );

    RETURN new_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_user_admin(TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated;
```

#### 5C — `update_user_password_admin(...)`

```sql
CREATE OR REPLACE FUNCTION public.update_user_password_admin(
    target_user_id UUID,
    new_password    TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE auth.users
    SET encrypted_password = crypt(new_password, gen_salt('bf')),
        updated_at = NOW()
    WHERE id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_password_admin(UUID, TEXT) TO authenticated;
```

#### 5D — `delete_user_admin(...)`

```sql
CREATE OR REPLACE FUNCTION public.delete_user_admin(
    target_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.users WHERE id = target_user_id;
    DELETE FROM auth.identities WHERE user_id = target_user_id;
    DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_admin(UUID) TO authenticated;
```

#### 5E — `rename_opcional_item(...)`

```sql
CREATE OR REPLACE FUNCTION public.rename_opcional_item(
    old_nome TEXT,
    new_nome TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE planilha_vendas_estandes
    SET opcionais_selecionados =
        (opcionais_selecionados - old_nome) ||
        jsonb_build_object(new_nome, opcionais_selecionados->old_nome)
    WHERE opcionais_selecionados ? old_nome;

    UPDATE edicao_imagens_config
    SET origem_ref = new_nome
    WHERE origem_tipo = 'item_opcional' AND origem_ref = old_nome;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rename_opcional_item(TEXT, TEXT) TO authenticated;
```

#### 5F — `backup_introspect()` — necessária para backups futuros serem automáticos

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
        json_agg(
          json_build_object(
            'from_table', fd.from_table,
            'to_table',   fd.to_table
          )
        ),
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
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.backup_introspect() TO authenticated;
```

---

### Passo 6 — Restaurar políticas RLS

**Primário** — execute o arquivo auto-gerado (políticas extraídas ao vivo via `pg_policies`):

```
database/6_rls_policies.sql
```

Contém todas as políticas RLS do schema `public`, reconstruídas como `DROP IF EXISTS` + `CREATE POLICY`.
Idempotente — seguro rodar mais de uma vez.

> **Nota para IA fazendo o restore:** não pule este passo. O arquivo `6_rls_policies.sql`
> captura as políticas exatamente como estavam no banco original. Execute-o no SQL Editor
> **após** o arquivo 2 (schema) e **após** o arquivo 5 (funções, pois algumas políticas
> usam `public.is_admin()`).

---

**Suplemento** — aplica política admin genérica em **todas** as tabelas (cobre tabelas
criadas após o último backup que ainda não têm política no arquivo 6):

Este bloco **não precisa de lista de tabelas** — aplica a política em todas as tabelas
existentes automaticamente. Qualquer nova tabela é coberta sem edição manual.

```sql
-- Politicas RLS: admin pode ler qualquer registro em todas as tabelas
DO $$
DECLARE
    tbl_name text;
BEGIN
    FOR tbl_name IN
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format(
            'DROP POLICY IF EXISTS "Admins bypass RLS for SELECT in %s" ON public.%I',
            tbl_name, tbl_name
        );
        EXECUTE format(
            'CREATE POLICY "Admins bypass RLS for SELECT in %s" '
            'ON public.%I FOR SELECT TO authenticated '
            'USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));',
            tbl_name, tbl_name
        );
    END LOOP;
END;
$$;

-- Politica para admin ler arquivos no bucket 'photos'
DROP POLICY IF EXISTS "Admins bypass RLS for SELECT in storage.objects" ON storage.objects;
CREATE POLICY "Admins bypass RLS for SELECT in storage.objects"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'photos' AND
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);
```

---

### Passo 7 — Corrigir RLS da tabela `users` + política de login anon

```sql
-- Substitui politica recursiva por funcao SECURITY DEFINER
DROP POLICY IF EXISTS "Admin pode ler qualquer usuario" ON public.users;
CREATE POLICY "Admin pode ler qualquer usuario"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id OR public.is_admin());

-- Permite que usuarios nao autenticados (anon) busquem o perfil pelo email/nome
-- Necessario para o fluxo de login (lookup antes do signInWithPassword)
DROP POLICY IF EXISTS "Allow anon to lookup active users for login" ON public.users;
CREATE POLICY "Allow anon to lookup active users for login"
ON public.users
FOR SELECT
TO anon
USING (is_active = true);
```

---

### Passo 8 — Restaurar arquivos do Storage

1. Crie os buckets no novo projeto (mesmos nomes, mesma configuração):
   - `photos` — público
   - `edicao-docs` — privado (acesso via signed URLs)

2. Via Supabase CLI (mais rápido):

```bash
supabase storage cp --recursive ./storage_backup/photos/ supabase://photos/
supabase storage cp --recursive ./storage_backup/edicao-docs/ supabase://edicao-docs/
```

3. Ou upload manual via Supabase Studio → Storage.

---

### Passo 9 — Atualizar variáveis de ambiente

Edite `.env.local` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://SEU-NOVO-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-nova-anon-key
```

---

### Passo 10 — Atualizar URLs das fotos no banco

```sql
-- Primeiro, descubra o dominio antigo:
SELECT url FROM public.photos LIMIT 1;

-- Depois substitua (troque os dominios):
UPDATE public.photos
SET
    url = REPLACE(url,
        'https://PROJETO-ANTIGO.supabase.co',
        'https://SEU-NOVO-PROJETO.supabase.co'),
    thumbnail_url = REPLACE(thumbnail_url,
        'https://PROJETO-ANTIGO.supabase.co',
        'https://SEU-NOVO-PROJETO.supabase.co')
WHERE
    url LIKE '%PROJETO-ANTIGO.supabase.co%'
    OR thumbnail_url LIKE '%PROJETO-ANTIGO.supabase.co%';
```

---

### Passo 11 — Reimplantar a Edge Function de biometria

```bash
supabase link --project-ref SEU-NOVO-PROJECT-REF
supabase secrets set SUPABASE_URL=https://SEU-NOVO-PROJETO.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
supabase functions deploy passkey-auth
```

> ⚠️ **Passkeys ficam vinculadas ao domínio original e não podem ser migradas.**
> Os registros em `public.user_biometrics` são restaurados, mas as credenciais
> salvas no dispositivo são inválidas no novo domínio.
> Cada usuário precisará re-registrar sua passkey após a migração.

---

### Passo 12 — Solicitar redefinição de senhas

Todos os usuários restaurados têm a senha temporária `GaleriaRestore2024!`.
Instrua cada usuário a alterar a senha após o primeiro login.

---

## Checklist de verificação pós-restauração

```sql
-- Contagem de registros (compare com o backup anterior):
SELECT 'users' AS tabela, COUNT(*) FROM public.users
UNION ALL SELECT 'eventos', COUNT(*) FROM public.eventos
UNION ALL SELECT 'eventos_edicoes', COUNT(*) FROM public.eventos_edicoes
UNION ALL SELECT 'clientes', COUNT(*) FROM public.clientes
UNION ALL SELECT 'planilha_vendas_estandes', COUNT(*) FROM public.planilha_vendas_estandes
UNION ALL SELECT 'atendimentos', COUNT(*) FROM public.atendimentos
UNION ALL SELECT 'tarefas', COUNT(*) FROM public.tarefas
UNION ALL SELECT 'photos', COUNT(*) FROM public.photos
UNION ALL SELECT 'tags', COUNT(*) FROM public.tags
ORDER BY tabela;

-- Verificar funcoes criticas:
SELECT routine_name, security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'is_admin', 'create_user_admin', 'update_user_password_admin',
    'delete_user_admin', 'rename_opcional_item', 'backup_introspect'
  )
ORDER BY routine_name;

-- Sincronizacao auth x public (devem ser iguais):
SELECT COUNT(*) AS auth_count FROM auth.users;
SELECT COUNT(*) AS public_count FROM public.users;

-- Verificar policies na tabela users:
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'users'
ORDER BY policyname;
```

---

## Notas importantes

| Tópico | Detalhe |
|---|---|
| **UUIDs** | `auth.users.id = public.users.id` — nunca deixe mudar na restauração |
| **Passkeys** | Ficam vinculadas ao domínio original — precisam ser re-registradas |
| **Senhas** | Todos os usuários restaurados recebem `GaleriaRestore2024!` |
| **Ordem** | 1→auth → 2→schema → 3→dados → 4→funções(5) → 5→RLS(6) → 6→storage |
| **ON CONFLICT DO NOTHING** | Todos os INSERTs são idempotentes — seguro rodar mais de uma vez |
| **session_replication_role** | Arquivo 4 desativa validação de FK durante restore |
| **Edge Function** | `passkey-auth` precisa ser reimplantada via CLI |
| **Funções SQL** | Auto-exportadas em `5_functions_ddl.sql` (DDL extraído ao vivo via `pg_get_functiondef`) |
| **Políticas RLS** | Auto-exportadas em `6_rls_policies.sql` (extraídas ao vivo via `pg_policies`) |
| **Storage URLs** | Após migrar, execute o UPDATE do Passo 10 para corrigir URLs |
| **psql externo** | `psql -h HOST -U USER -d DB -f 4_database_backup.sql` |
| **backup_introspect()** | Execute o SQL da Seção 5F para habilitar backups 100% automáticos |
