import { supabase } from './supabaseClient';
import JSZip from 'jszip';

// ── Auto-discovery de migrations via Vite glob ────────────────────────────────
// Qualquer novo arquivo .sql em supabase/migrations/ e incluido automaticamente.
// Nao e necessario atualizar este arquivo ao criar novas migrations.
const migModules = import.meta.glob('../supabase/migrations/*.sql', { query: '?raw', import: 'default', eager: true });

// ── Auto-discovery do codigo-fonte via Vite glob ────────────────────────────
// Embutido no build para inclusao no backup ZIP.
// Exclui node_modules, dist, .git — apenas codigo-fonte do projeto.
const sourceModules = import.meta.glob(
    [
        '../pages/**/*.{ts,tsx}',
        '../components/**/*.{ts,tsx}',
        '../hooks/**/*.{ts,tsx}',
        '../services/**/*.{ts,tsx}',
        '../context/**/*.{ts,tsx}',
        '../utils/**/*.{ts,tsx}',
        '../supabase/**/*.{sql,ts}',
        '../App.tsx',
        '../index.tsx',
        '../index.css',
        '../types.ts',
        '../database.types.ts',
        '../version.ts',
        '../vite-env.d.ts',
        '../vite.config.ts',
        '../tsconfig.json',
        '../package.json',
        '../index.html',
        '../CLAUDE.md',
        '../README.md',
    ],
    { query: '?raw', import: 'default', eager: true }
);

const SOURCE_FILES: { relativePath: string; content: string }[] = Object.entries(sourceModules)
    .map(([path, content]) => ({
        // Remove o prefixo '../' para ter caminho relativo ao projeto
        relativePath: path.replace(/^\.\.\//, ''),
        content: content as string,
    }))
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath));

const MIGRATION_FILES: { filename: string; content: string }[] = Object.entries(migModules)
    .map(([path, content]) => ({
        filename: path.split('/').pop()!,
        content: content as string,
    }))
    .sort((a, b) => a.filename.localeCompare(b.filename));

// ── Fallback: lista de tabelas caso backup_introspect() nao esteja disponivel ─
// Usada apenas se a funcao RPC ainda nao foi criada no banco.
// Quando backup_introspect() existir, a lista e descoberta automaticamente.
const BACKUP_TABLES_FALLBACK = [
    'users',
    'user_biometrics',
    'system_config',
    'eventos',
    'eventos_edicoes',
    'clientes',
    'contatos',
    'enderecos',
    'contratos',
    'itens_opcionais',
    'planilha_configuracoes',
    'planilha_vendas_estandes',
    'atendimentos',
    'atendimentos_historico',
    'tarefas',
    'tarefas_historico',
    'tag_categories',
    'tags',
    'photos',
    'photo_tags',
    'edicao_imagens_config',
    'stand_imagens_status',
    'stand_imagem_recebimentos',
];

// ── Buckets do Storage a tentar ──────────────────────────────────────────────
const STORAGE_BUCKETS_TO_TRY = ['photos', 'avatars', 'assets', 'system', 'edicao-docs'];

// ── Extensoes de midia ja comprimidas (usar STORE, nao DEFLATE) ──────────────
const MEDIA_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi', 'webm', 'pdf']);

// ── Tipos do schema introspectado ─────────────────────────────────────────────
interface IntrospectedColumn {
    name: string;
    udt: string;        // postgres udt_name: uuid, text, bool, int4, timestamptz, jsonb, _text...
    nullable: boolean;
    has_default: boolean;
}

interface IntrospectedTable {
    name: string;
    columns: IntrospectedColumn[];
}

interface IntrospectedSchema {
    tables: IntrospectedTable[];
    fk_deps: Array<{ from_table: string; to_table: string }>;
    functions: Array<{ name: string; def: string }>;
    policies: Array<{
        tablename: string;
        policyname: string;
        permissive: string;   // 'PERMISSIVE' | 'RESTRICTIVE'
        cmd: string;           // 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL'
        roles: string[];
        qual: string | null;
        with_check: string | null;
    }>;
}

// ── Ordenacao topologica por dependencia de FK ────────────────────────────────
// Garante que tabelas referenciadas por FK sejam inseridas antes das dependentes.
function topoSort(tables: IntrospectedTable[], fkDeps: Array<{ from_table: string; to_table: string }>): string[] {
    const names = tables.map(t => t.name);
    const deps = new Map<string, Set<string>>();
    for (const name of names) deps.set(name, new Set());

    for (const dep of (fkDeps ?? [])) {
        if (dep.from_table !== dep.to_table && deps.has(dep.from_table) && deps.has(dep.to_table)) {
            deps.get(dep.from_table)!.add(dep.to_table);
        }
    }

    const sorted: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    function visit(name: string) {
        if (visited.has(name)) return;
        if (visiting.has(name)) return; // dependencia circular — ignorar
        visiting.add(name);
        for (const dep of (deps.get(name) ?? [])) visit(dep);
        visiting.delete(name);
        visited.add(name);
        sorted.push(name);
    }

    for (const name of names) visit(name);
    return sorted;
}

// ── Mapa de tipos Postgres (udt_name) para SQL legivel ───────────────────────
function udtToSqlType(udt: string): string {
    const map: Record<string, string> = {
        uuid: 'UUID', text: 'TEXT', varchar: 'TEXT', bpchar: 'TEXT',
        bool: 'BOOLEAN', int2: 'SMALLINT', int4: 'INTEGER', int8: 'BIGINT',
        float4: 'REAL', float8: 'DOUBLE PRECISION', numeric: 'NUMERIC',
        timestamptz: 'TIMESTAMPTZ', timestamp: 'TIMESTAMP', date: 'DATE',
        jsonb: 'JSONB', json: 'JSON',
        _text: 'TEXT[]', _uuid: 'UUID[]', _int4: 'INTEGER[]',
    };
    return map[udt] ?? 'TEXT';
}

// ── Gera DDL basico a partir do schema introspectado ─────────────────────────
// Alternativa ao arquivo de migrations. Nao inclui FKs nem constraints detalhadas.
// O restore usa session_replication_role=replica entao FKs nao sao necessarias.
function generateDDLFromSchema(tables: IntrospectedTable[]): string {
    const lines = [
        `-- ====================================================================`,
        `-- SCHEMA DDL AUTO-GERADO — Dbarros Rural`,
        `-- Gerado automaticamente a partir do schema atual do banco.`,
        `-- PREFERENCIA: use database/2_schema_all_migrations.sql para o schema completo`,
        `-- Este arquivo e uma alternativa simplificada (sem FKs, sem constraints).`,
        `-- O arquivo 4_database_backup.sql usa session_replication_role=replica`,
        `-- entao as FKs nao sao validadas durante o restore.`,
        `-- ====================================================================\n`,
        `SET client_encoding = 'UTF8';\n`,
    ];

    for (const table of tables) {
        lines.push(`-- Tabela: ${table.name}`);
        lines.push(`CREATE TABLE IF NOT EXISTS public."${table.name}" (`);
        const colDefs = (table.columns ?? []).map(col => {
            const type = udtToSqlType(col.udt);
            const nullable = col.nullable ? '' : ' NOT NULL';
            return `    "${col.name}" ${type}${nullable}`;
        });
        lines.push(colDefs.join(',\n'));
        lines.push(`);`);
        lines.push(`ALTER TABLE public."${table.name}" ENABLE ROW LEVEL SECURITY;`);
        lines.push('');
    }

    return lines.join('\n');
}

// ── Migrations combinadas em um unico arquivo ─────────────────────────────────
// Conveniencia: permite restaurar o schema completo com um unico execute no SQL Editor.
function generateCombinedMigrations(): string {
    const lines = [
        `-- ====================================================================`,
        `-- MIGRATIONS COMBINADAS — Dbarros Rural`,
        `-- ${MIGRATION_FILES.length} arquivo(s) de migration combinados em sequencia.`,
        `-- Execute APOS o 1_auth_users_restore.sql e ANTES do 4_database_backup.sql.`,
        `-- Cada migration usa IF NOT EXISTS — seguro rodar mais de uma vez.`,
        `-- ====================================================================\n`,
        `SET client_encoding = 'UTF8';\n`,
    ];

    for (const mig of MIGRATION_FILES) {
        lines.push(`-- ============================================================`);
        lines.push(`-- MIGRATION: ${mig.filename}`);
        lines.push(`-- ============================================================`);
        lines.push(mig.content.trim());
        lines.push('');
    }

    lines.push(`-- FIM DAS MIGRATIONS (${MIGRATION_FILES.length} arquivos)`);
    return lines.join('\n');
}

// ── DDL das funcoes PostgreSQL extraido ao vivo do banco ──────────────────────
// pg_get_functiondef() retorna o CREATE OR REPLACE FUNCTION completo.
// Inclui TODAS as funcoes do schema public (inclusive backup_introspect).
function generateFunctionsDDL(functions: IntrospectedSchema['functions']): string {
    const lines = [
        `-- ====================================================================`,
        `-- FUNCOES PostgreSQL — Dbarros Rural`,
        `-- Auto-gerado via backup_introspect() + pg_get_functiondef()`,
        `-- ${functions.length} funcao(s) no schema public`,
        `-- Execute APOS o 2_schema_all_migrations.sql se as funcoes nao existirem.`,
        `-- Este arquivo e extraido ao vivo do banco — sempre atualizado.`,
        `-- ====================================================================\n`,
        `SET client_encoding = 'UTF8';\n`,
    ];

    for (const fn of functions) {
        lines.push(`-- ── FUNCTION: ${fn.name} ──────────────────────────────────`);
        // pg_get_functiondef() nao inclui ponto-e-virgula final
        lines.push(fn.def.trim() + ';');
        lines.push('');
    }

    // Re-grant EXECUTE a todos os autenticados (padrao do sistema)
    lines.push(`-- Re-aplicar permissoes de execucao para role 'authenticated'`);
    lines.push(`DO $$`);
    lines.push(`DECLARE`);
    lines.push(`    fn_name text;`);
    lines.push(`    fn_args text;`);
    lines.push(`BEGIN`);
    lines.push(`    FOR fn_name, fn_args IN`);
    lines.push(`        SELECT p.proname, pg_get_function_identity_arguments(p.oid)`);
    lines.push(`        FROM pg_proc p`);
    lines.push(`        JOIN pg_namespace n ON p.pronamespace = n.oid`);
    lines.push(`        WHERE n.nspname = 'public'`);
    lines.push(`    LOOP`);
    lines.push(`        EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated', fn_name, fn_args);`);
    lines.push(`    END LOOP;`);
    lines.push(`END;$$;`);
    lines.push('');
    lines.push(`-- FIM DAS FUNCOES (${functions.length} total)`);
    return lines.join('\n');
}

// ── Politicas RLS extraidas ao vivo do banco via pg_policies ─────────────────
// Reconstroi CREATE POLICY statements a partir dos metadados do PostgreSQL.
// Inclui todas as politicas do schema public — nao precisa de lista manual.
function generatePoliciesDDL(policies: IntrospectedSchema['policies']): string {
    const lines = [
        `-- ====================================================================`,
        `-- POLITICAS RLS — Dbarros Rural`,
        `-- Auto-gerado via backup_introspect() + pg_policies`,
        `-- ${policies.length} politica(s) no schema public`,
        `-- Execute APOS o 2_schema_all_migrations.sql`,
        `-- DROP IF EXISTS + CREATE garante idempotencia — seguro rodar mais de uma vez`,
        `-- ====================================================================\n`,
        `SET client_encoding = 'UTF8';\n`,
    ];

    // Agrupar por tabela para melhor legibilidade
    const byTable = new Map<string, typeof policies>();
    for (const pol of policies) {
        if (!byTable.has(pol.tablename)) byTable.set(pol.tablename, []);
        byTable.get(pol.tablename)!.push(pol);
    }

    for (const [table, pols] of byTable) {
        lines.push(`-- ── TABLE: ${table} ──────────────────────────────────`);
        lines.push(`ALTER TABLE public."${table}" ENABLE ROW LEVEL SECURITY;`);
        for (const pol of pols) {
            const roles = Array.isArray(pol.roles) ? pol.roles.join(', ') : String(pol.roles || 'PUBLIC');
            lines.push(`DROP POLICY IF EXISTS "${pol.policyname}" ON public."${table}";`);
            const parts: string[] = [`CREATE POLICY "${pol.policyname}" ON public."${table}"`];
            parts.push(`  FOR ${pol.cmd}`);
            parts.push(`  TO ${roles}`);
            if (pol.qual) parts.push(`  USING (${pol.qual})`);
            if (pol.with_check) parts.push(`  WITH CHECK (${pol.with_check})`);
            lines.push(parts.join('\n') + ';');
            lines.push('');
        }
    }

    lines.push(`-- FIM DAS POLITICAS (${policies.length} total)`);
    return lines.join('\n');
}

// ── SQL helpers ──────────────────────────────────────────────────────────────
function toSqlLiteral(value: unknown): string {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
    return `'${String(value).replace(/'/g, "''")}'`;
}

function rowToInsert(table: string, row: Record<string, unknown>): string {
    const cols = Object.keys(row).map((c) => `"${c}"`).join(', ');
    const vals = Object.values(row).map(toSqlLiteral).join(', ');
    // ON CONFLICT DO NOTHING: funciona com PKs simples e compostas (ex: photo_tags)
    return `INSERT INTO public."${table}" (${cols}) VALUES (${vals}) ON CONFLICT DO NOTHING;`;
}

async function fetchTable(table: string): Promise<{ rows: Record<string, unknown>[]; errorStr?: string }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).from(table).select('*');
    if (error) {
        console.warn(`[backup] Nao foi possivel ler a tabela "${table}":`, error.message);
        return { rows: [], errorStr: error.message };
    }
    return { rows: (data ?? []) as Record<string, unknown>[] };
}

// ── SQL para restaurar auth.users com UUIDs originais ────────────────────────
// CRITICO: auth.users.id = public.users.id. Se mudar, todos os vinculos quebram.
// Senha temporaria para todos os usuarios restaurados: GaleriaRestore2024!
const TEMP_PASSWORD_HASH = `\$2a\$10\$PnSCvLdEJmBFDkdFr.johuDQSRBCdQBi8NTRVB7q3CkMjMCXaELnC`;

function generateAuthRestoreSQL(users: Record<string, unknown>[]): string {
    const now = new Date().toLocaleString('pt-BR');
    const lines: string[] = [
        `-- ====================================================================`,
        `-- RESTAURACAO DO auth.users — Dbarros Rural`,
        `-- Gerado em: ${now}`,
        `--`,
        `-- CRITICO: Execute este arquivo PRIMEIRO, antes de qualquer outro.`,
        `-- Ele recria os usuarios no Supabase Auth com os mesmos UUIDs originais.`,
        `-- Sem isso, todos os vinculos (fotos, tarefas, atendimentos) ficam quebrados.`,
        `--`,
        `-- Senha temporaria de todos os usuarios restaurados: GaleriaRestore2024!`,
        `-- Solicite que cada usuario redefina sua senha apos o primeiro login.`,
        `-- ====================================================================`,
        ``,
        `SET client_encoding = 'UTF8';`,
        ``,
    ];

    for (const user of users) {
        const id = String(user.id ?? '');
        const email = String(user.email ?? '');
        const createdAt = String(user.created_at ?? new Date().toISOString());

        if (!id || !email) continue;

        lines.push(`-- Usuario: ${String(user.name ?? email)}`);
        lines.push(`INSERT INTO auth.users (`);
        lines.push(`  instance_id, id, aud, role, email, encrypted_password,`);
        lines.push(`  email_confirmed_at, created_at, updated_at,`);
        lines.push(`  raw_app_meta_data, raw_user_meta_data,`);
        lines.push(`  is_super_admin, confirmation_token, recovery_token,`);
        lines.push(`  email_change_token_new, email_change`);
        lines.push(`) VALUES (`);
        lines.push(`  '00000000-0000-0000-0000-000000000000',`);
        lines.push(`  '${id}',`);
        lines.push(`  'authenticated', 'authenticated',`);
        lines.push(`  '${email.replace(/'/g, "''")}',`);
        lines.push(`  '${TEMP_PASSWORD_HASH}',`);
        lines.push(`  '${createdAt}', '${createdAt}', '${createdAt}',`);
        lines.push(`  '{"provider":"email","providers":["email"]}',`);
        lines.push(`  '{}', false, '', '', '', ''`);
        lines.push(`) ON CONFLICT (id) DO NOTHING;`);
        lines.push(``);
        lines.push(`INSERT INTO auth.identities (`);
        lines.push(`  id, user_id, identity_data, provider,`);
        lines.push(`  last_sign_in_at, created_at, updated_at, provider_id`);
        lines.push(`) VALUES (`);
        lines.push(`  '${id}',`);
        lines.push(`  '${id}',`);
        lines.push(`  '{"sub":"${id}","email":"${email.replace(/'/g, "''")}"}',`);
        lines.push(`  'email', '${createdAt}', '${createdAt}', '${createdAt}',`);
        lines.push(`  '${email.replace(/'/g, "''")}'`);
        lines.push(`) ON CONFLICT (id) DO NOTHING;`);
        lines.push(``);
    }

    lines.push(`-- ${users.length} usuario(s) processado(s)`);
    return lines.join('\n');
}

// ── Storage helpers ──────────────────────────────────────────────────────────
interface StorageFile {
    bucket: string;
    path: string;
}

async function listAllFiles(bucket: string, folder = ''): Promise<StorageFile[]> {
    const { data, error } = await supabase.storage.from(bucket).list(folder, { limit: 1000 });
    if (error || !data) return [];

    const files: StorageFile[] = [];
    const subfolderPromises: Promise<StorageFile[]>[] = [];
    for (const item of data) {
        const fullPath = folder ? `${folder}/${item.name}` : item.name;
        if (item.id === null) {
            subfolderPromises.push(listAllFiles(bucket, fullPath));
        } else {
            files.push({ bucket, path: fullPath });
        }
    }
    if (subfolderPromises.length > 0) {
        const nested = await Promise.all(subfolderPromises);
        for (const n of nested) files.push(...n);
    }
    return files;
}

async function discoverBuckets(): Promise<string[]> {
    const results = await Promise.all(
        STORAGE_BUCKETS_TO_TRY.map(async (bucket) => {
            try {
                const { error } = await supabase.storage.from(bucket).list('', { limit: 1 });
                return error ? null : bucket;
            } catch { return null; }
        })
    );
    return results.filter((b): b is string => b !== null);
}

function getZipCompression(filename: string): { compression: 'STORE' | 'DEFLATE'; compressionOptions?: { level: number } } {
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    if (MEDIA_EXTENSIONS.has(ext)) return { compression: 'STORE' };
    return { compression: 'DEFLATE', compressionOptions: { level: 3 } };
}

// ── Guia de restauracao dinamico ──────────────────────────────────────────────
// Gerado automaticamente: tabelas, contagens e instrucoes refletem o estado atual.
// Nao requer nenhuma atualizacao manual ao adicionar novas tabelas.
function generateRestoreGuide(dateStr: string, tables: string[], buckets: string[], functionsCount = 0, policiesCount = 0): string {
    const storageLines = buckets.length > 0
        ? buckets.map(b => `│   └── ${b}/`).join('\n')
        : '│   (sem buckets disponiveis)';

    const checklistUnion = tables
        .filter(t => !['user_biometrics', 'system_config', 'photo_tags',
            'tarefas_historico', 'atendimentos_historico', 'stand_imagem_recebimentos'].includes(t))
        .map((t, i) => i === 0
            ? `SELECT '${t}' AS tabela, COUNT(*) FROM public.${t}`
            : `UNION ALL SELECT '${t}', COUNT(*) FROM public.${t}`)
        .join('\n');

    return `# Guia de Restauracao — Dbarros Rural
## Backup gerado em: ${dateStr}
## Tabelas incluidas: ${tables.length} | Migrations: ${MIGRATION_FILES.length} | Buckets: ${buckets.join(', ') || 'nenhum'}

---

## LEIA ANTES DE COMECAR

### Por que a ordem importa

O sistema usa auth.users.id como chave primaria de public.users.
Todos os vinculos (fotos, tarefas, atendimentos, planilhas) dependem desse UUID.
Se os UUIDs mudarem, tudo quebra. Execute SEMPRE na ordem indicada.

### O que este backup contem

- Todos os usuarios (auth.users + public.users) com UUIDs originais preservados
- Todas as ${tables.length} tabelas do banco com dados completos
- ${MIGRATION_FILES.length} migrations historicas combinadas em um arquivo unico
- DDL auto-gerado como alternativa
- ${functionsCount} funcoes PostgreSQL (DDL completo extraido ao vivo do banco)
- ${policiesCount} politicas RLS (extraidas ao vivo — arquivo idempotente)
- Todos os arquivos do Storage (fotos, documentos)
- Codigo-fonte completo do projeto (pages, components, hooks, services, etc.)
- Este guia de restauracao

### Senhas apos restauracao

Todos os usuarios restaurados recebem a senha temporaria: GaleriaRestore2024!
Instrua cada usuario a redefinir sua senha apos o primeiro login.

---

## Estrutura do ZIP

\`\`\`
Sistema_Dbarros_Rural_Backup_completo_${dateStr}.zip
├── RESTORE_GUIDE.md                       <- Este arquivo
├── database/
│   ├── 1_auth_users_restore.sql           <- PRIMEIRO: usuarios no Auth com UUIDs originais
│   ├── 2_schema_all_migrations.sql        <- SEGUNDO: schema completo (FKs + RLS + funcoes)
│   ├── 3_schema_ddl_auto.sql             <- ALTERNATIVA ao 2: DDL simplificado auto-gerado
│   ├── 4_database_backup.sql              <- QUARTO: dados de todas as ${tables.length} tabelas
│   ├── 5_functions_ddl.sql               <- QUINTO: ${functionsCount} funcao(s) PostgreSQL (auto-gerado)
│   └── 6_rls_policies.sql               <- SEXTO: ${policiesCount} politica(s) RLS (auto-gerado)
├── schema_migrations/
│   └── *.sql (${MIGRATION_FILES.length} arquivos — referencia individual)
├── source_code/
│   ├── pages/              <- Telas do app
│   ├── components/         <- Componentes reutilizaveis
│   ├── hooks/              <- Hooks customizados
│   ├── services/           <- Logica de dados e APIs
│   ├── context/            <- Context providers
│   ├── utils/              <- Utilitarios
│   ├── supabase/           <- Migrations e edge functions
│   └── *.tsx, *.ts, *.json <- Arquivos raiz (App, config, types)
└── storage_backup/
${storageLines}
\`\`\`

---

## PASSO 1 — Criar novo projeto no Supabase

1. Acesse https://supabase.com e crie um novo projeto
2. Anote: URL, ANON_KEY, SERVICE_ROLE_KEY

---

## PASSO 2 — Restaurar usuarios no Auth (CRITICO — execute PRIMEIRO)

No SQL Editor do novo projeto, execute o arquivo completo:

    database/1_auth_users_restore.sql

Este arquivo recria todos os usuarios no auth.users com seus UUIDs originais.
Sem este passo, TODOS os vinculos do banco ficam corrompidos.

---

## PASSO 3 — Recriar o schema completo

No SQL Editor, execute:

    database/2_schema_all_migrations.sql

Este arquivo combina todas as ${MIGRATION_FILES.length} migrations em sequencia unica.
Cria todas as tabelas, chaves estrangeiras, politicas RLS e funcoes PostgreSQL.

Se o arquivo 2 falhar por algum motivo, use como alternativa:

    database/3_schema_ddl_auto.sql

(DDL simplificado sem FKs. O arquivo 4 usa session_replication_role=replica,
entao as FKs nao sao validadas durante o restore de qualquer forma.)

---

## PASSO 4 — Restaurar os dados

No SQL Editor, execute:

    database/4_database_backup.sql

O arquivo ja inclui:
- SET session_replication_role = 'replica' (ignora FKs durante insert)
- ON CONFLICT DO NOTHING em todos os INSERTs (seguro rodar mais de uma vez)
- SET session_replication_role = DEFAULT no final (reativa validacoes)

---

## PASSO 5 — Recriar funcoes PostgreSQL

PRIMARIO — execute o arquivo auto-gerado (definicoes extraidas ao vivo do banco):

    database/5_functions_ddl.sql

Inclui todas as ${functionsCount} funcao(s) do schema public + re-grant automatico para 'authenticated'.

FALLBACK — se o arquivo 5 nao estiver no ZIP (ex: backup_introspect() indisponivel),
execute os blocos abaixo manualmente no SQL Editor:

### 5A — is_admin() — SECURITY DEFINER (evita recursao infinita)

\`\`\`sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE((SELECT is_admin FROM public.users WHERE id = auth.uid()), false);
$$;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
\`\`\`

### 5B — create_user_admin(...)

\`\`\`sql
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
    VALUES (new_user_id, new_user_id, json_build_object('sub', new_user_id::text, 'email', user_email),
            'email', NOW(), NOW(), NOW(), user_email);
    INSERT INTO public.users (id, name, email, is_admin, is_visitor, can_manage_tags, is_projetista, is_active, is_temp)
    VALUES (new_user_id, user_name, user_email, is_admin_flag, is_visitor_flag, can_manage_tags_flag, is_projetista_flag, true, false);
    RETURN new_user_id;
END;$$;
GRANT EXECUTE ON FUNCTION public.create_user_admin(TEXT,TEXT,TEXT,BOOLEAN,BOOLEAN,BOOLEAN,BOOLEAN) TO authenticated;
\`\`\`

### 5C — update_user_password_admin(...)

\`\`\`sql
CREATE OR REPLACE FUNCTION public.update_user_password_admin(target_user_id UUID, new_password TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE auth.users SET encrypted_password = crypt(new_password, gen_salt('bf')), updated_at = NOW()
    WHERE id = target_user_id;
END;$$;
GRANT EXECUTE ON FUNCTION public.update_user_password_admin(UUID,TEXT) TO authenticated;
\`\`\`

### 5D — delete_user_admin(...)

\`\`\`sql
CREATE OR REPLACE FUNCTION public.delete_user_admin(target_user_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    DELETE FROM public.users WHERE id = target_user_id;
    DELETE FROM auth.identities WHERE user_id = target_user_id;
    DELETE FROM auth.users WHERE id = target_user_id;
END;$$;
GRANT EXECUTE ON FUNCTION public.delete_user_admin(UUID) TO authenticated;
\`\`\`

### 5E — rename_opcional_item(...)

\`\`\`sql
CREATE OR REPLACE FUNCTION public.rename_opcional_item(old_nome TEXT, new_nome TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE planilha_vendas_estandes
    SET opcionais_selecionados = (opcionais_selecionados - old_nome) || jsonb_build_object(new_nome, opcionais_selecionados->old_nome)
    WHERE opcionais_selecionados ? old_nome;
    UPDATE edicao_imagens_config SET origem_ref = new_nome WHERE origem_tipo = 'item_opcional' AND origem_ref = old_nome;
END;$$;
GRANT EXECUTE ON FUNCTION public.rename_opcional_item(TEXT,TEXT) TO authenticated;
\`\`\`

### 5F — backup_introspect() (necessario para backups futuros serem automaticos)

\`\`\`sql
CREATE OR REPLACE FUNCTION public.backup_introspect()
RETURNS JSON LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT json_build_object(
    'tables', (
      SELECT json_agg(json_build_object('name', t.table_name, 'columns', (
        SELECT json_agg(json_build_object('name', c.column_name, 'udt', c.udt_name,
          'nullable', (c.is_nullable = 'YES'), 'has_default', (c.column_default IS NOT NULL))
          ORDER BY c.ordinal_position)
        FROM information_schema.columns c
        WHERE c.table_schema = 'public' AND c.table_name = t.table_name
      )) ORDER BY t.table_name)
      FROM information_schema.tables t
      WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
    ),
    'fk_deps', (
      SELECT COALESCE(json_agg(json_build_object(
        'from_table', fd.from_table, 'to_table', fd.to_table)), '[]'::json)
      FROM (
        SELECT DISTINCT kcu.table_name AS from_table, ccu.table_name AS to_table
        FROM information_schema.key_column_usage kcu
        JOIN information_schema.referential_constraints rc
          ON kcu.constraint_name = rc.constraint_name AND kcu.constraint_schema = rc.constraint_schema
        JOIN information_schema.constraint_column_usage ccu
          ON rc.unique_constraint_name = ccu.constraint_name AND rc.unique_constraint_schema = ccu.constraint_schema
        WHERE kcu.table_schema = 'public' AND ccu.table_schema = 'public' AND kcu.table_name != ccu.table_name
      ) fd
    )
  );
$$;
GRANT EXECUTE ON FUNCTION public.backup_introspect() TO authenticated;
\`\`\`

---

## PASSO 6 — Restaurar politicas RLS

PRIMARIO — execute o arquivo auto-gerado (extrai ${policiesCount} politica(s) ao vivo do banco):

    database/6_rls_policies.sql

DROP IF EXISTS + CREATE garante idempotencia — seguro rodar mais de uma vez.

SUPLEMENTO — aplica politica admin generica em TODAS as tabelas (cobre eventuais tabelas
criadas apos o ultimo backup que ainda nao tem politica propria no arquivo 6):

\`\`\`sql
DO $$
DECLARE
    tbl_name text;
BEGIN
    FOR tbl_name IN
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Admins bypass RLS for SELECT in %s" ON public.%I', tbl_name, tbl_name);
        EXECUTE format(
            'CREATE POLICY "Admins bypass RLS for SELECT in %s" '
            'ON public.%I FOR SELECT TO authenticated '
            'USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));',
            tbl_name, tbl_name
        );
    END LOOP;
END;$$;

DROP POLICY IF EXISTS "Admins bypass RLS for SELECT in storage.objects" ON storage.objects;
CREATE POLICY "Admins bypass RLS for SELECT in storage.objects"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='photos' AND EXISTS (SELECT 1 FROM public.users WHERE id=auth.uid() AND is_admin=true));
\`\`\`

---

## PASSO 7 — Corrigir RLS da tabela users + politica de login anon

\`\`\`sql
DROP POLICY IF EXISTS "Admin pode ler qualquer usuario" ON public.users;
CREATE POLICY "Admin pode ler qualquer usuario"
ON public.users FOR SELECT TO authenticated
USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Allow anon to lookup active users for login" ON public.users;
CREATE POLICY "Allow anon to lookup active users for login"
ON public.users FOR SELECT TO anon
USING (is_active = true);
\`\`\`

---

## PASSO 8 — Restaurar arquivos do Storage

Para cada bucket, crie no novo projeto (mesmos nomes, mesma configuracao publica/privada):

Via Supabase CLI:

\`\`\`bash
supabase storage cp --recursive ./storage_backup/photos/ supabase://photos/
supabase storage cp --recursive ./storage_backup/edicao-docs/ supabase://edicao-docs/
\`\`\`

Ou faca upload manual pelo Supabase Studio (Storage > Upload files).

---

## PASSO 9 — Atualizar variaveis de ambiente

Edite .env.local na raiz do projeto:

\`\`\`
VITE_SUPABASE_URL=https://SEU-NOVO-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-nova-anon-key
\`\`\`

---

## PASSO 10 — Atualizar URLs das fotos no banco

Execute no SQL Editor (substitua os dominios):

\`\`\`sql
-- Primeiro, descubra o dominio antigo:
SELECT url FROM public.photos LIMIT 1;

-- Depois substitua:
UPDATE public.photos SET
    url = REPLACE(url,
        'https://PROJETO-ANTIGO.supabase.co',
        'https://SEU-NOVO-PROJETO.supabase.co'),
    thumbnail_url = REPLACE(thumbnail_url,
        'https://PROJETO-ANTIGO.supabase.co',
        'https://SEU-NOVO-PROJETO.supabase.co')
WHERE url LIKE '%PROJETO-ANTIGO.supabase.co%'
   OR thumbnail_url LIKE '%PROJETO-ANTIGO.supabase.co%';
\`\`\`

---

## PASSO 11 — Reimplantar Edge Function passkey-auth

\`\`\`bash
supabase link --project-ref SEU-NOVO-PROJECT-REF
supabase secrets set SUPABASE_URL=https://SEU-NOVO-PROJETO.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
supabase functions deploy passkey-auth
\`\`\`

Passkeys ficam vinculadas ao dominio original e nao podem ser migradas.
Os registros em public.user_biometrics sao restaurados, mas as credenciais
salvas no dispositivo do usuario sao invalidas no novo dominio.
Cada usuario precisara re-registrar sua passkey apos a migracao.

---

## PASSO 12 — Solicitar redefincao de senhas

Todos os usuarios restaurados tem a senha temporaria: GaleriaRestore2024!
Instrua cada usuario a alterar a senha apos o primeiro login.

---

## Checklist de verificacao pos-restauracao

\`\`\`sql
-- Contagens esperadas (compare com o backup anterior):
${checklistUnion}
ORDER BY tabela;

-- Verificar funcoes criticas:
SELECT routine_name, security_type FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('is_admin', 'create_user_admin', 'update_user_password_admin',
                       'delete_user_admin', 'rename_opcional_item', 'backup_introspect')
ORDER BY routine_name;

-- Sincronizacao auth x public (devem ser iguais):
SELECT COUNT(*) AS auth_count FROM auth.users;
SELECT COUNT(*) AS public_count FROM public.users;

-- Verificar policies ativas na tabela users:
SELECT policyname, cmd, roles FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'users'
ORDER BY policyname;
\`\`\`

---

## Notas importantes

| Topico | Detalhe |
|---|---|
| UUIDs | auth.users.id = public.users.id — nunca deixe mudar na restauracao |
| Passkeys | Vinculadas ao dominio original — precisam ser re-registradas |
| Senhas | Todos os usuarios restaurados recebem GaleriaRestore2024! |
| Ordem | 1→auth → 2→schema → 3→dados → 4→funcoes(5) → 5→RLS(6) → 6→storage |
| ON CONFLICT DO NOTHING | Todos os INSERTs sao idempotentes — seguro rodar multiplas vezes |
| session_replication_role | Arquivo 4 desativa FKs durante restore — reativado no final |
| Edge Function | passkey-auth precisa ser reimplantada via CLI |
| Funcoes SQL | Auto-exportadas em 5_functions_ddl.sql (DDL extraido ao vivo do banco) |
| Politicas RLS | Auto-exportadas em 6_rls_policies.sql (pg_policies extraido ao vivo) |
| Storage URLs | Apos migrar o projeto execute o UPDATE do Passo 10 |
| psql externo | psql -h HOST -U USER -d DB -f 4_database_backup.sql |
`;
}

// ── Helpers de progresso ─────────────────────────────────────────────────────
export type BackupProgressCallback = (info: {
    phase: 'db' | 'storage' | 'source' | 'zipping' | 'done';
    label: string;
    pct: number;
}) => void;

// ── Main export ───────────────────────────────────────────────────────────────
export const backupService = {

    /** SQL-only backup (sem arquivos do Storage) */
    async download(): Promise<void> {
        // Descobre tabelas via RPC backup_introspect() com fallback para lista estatica
        let tables: string[] = BACKUP_TABLES_FALLBACK;
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data } = await (supabase as any).rpc('backup_introspect');
            if (data?.tables?.length) {
                const schema = data as IntrospectedSchema;
                tables = topoSort(schema.tables, schema.fk_deps);
            }
        } catch { /* fallback para lista estatica */ }

        const lines: string[] = [
            `-- Backup SQL — Dbarros Rural — ${new Date().toLocaleString('pt-BR')}`,
            `-- Tabelas: ${tables.length}`,
            ``,
            `SET client_encoding = 'UTF8';`,
            `SET session_replication_role = 'replica';`,
            ``,
        ];

        for (const table of tables) {
            lines.push(`-- ── TABLE: ${table} ──────────────────────────────────`);
            const res = await fetchTable(table);
            if (res.errorStr) { lines.push(`-- [ERROR] ${res.errorStr}`); }
            if (res.rows.length === 0) { lines.push('-- (vazia)\n'); continue; }
            for (const row of res.rows) lines.push(rowToInsert(table, row));
            lines.push(`-- ${res.rows.length} linha(s)\n`);
        }

        lines.push(`SET session_replication_role = DEFAULT;`);
        lines.push('-- FIM DO BACKUP');

        const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        a.href = url;
        a.download = `dbarros_backup_${dateStr}.sql`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    /** Backup completo: SQL + Storage → ZIP com progresso */
    async downloadFull(onProgress?: BackupProgressCallback): Promise<void> {
        const zip = new JSZip();
        const dateStr = new Date().toISOString().slice(0, 10);

        // ── Descobrir schema e tabelas via RPC ────────────────────────────────
        onProgress?.({ phase: 'db', label: 'Descobrindo schema do banco...', pct: 0 });

        let tables: string[] = BACKUP_TABLES_FALLBACK;
        let schema: IntrospectedSchema | null = null;

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data } = await (supabase as any).rpc('backup_introspect');
            if (data?.tables?.length) {
                schema = data as IntrospectedSchema;
                tables = topoSort(schema.tables, schema.fk_deps);
                console.log(`[backup] Schema descoberto via RPC: ${tables.length} tabelas`);
            } else {
                console.log('[backup] backup_introspect() sem dados — usando lista de fallback');
            }
        } catch {
            console.log('[backup] backup_introspect() nao disponivel — usando lista de fallback');
        }

        // ── Banco de dados (0–30%) ─────────────────────────────────────────────
        onProgress?.({ phase: 'db', label: `Exportando ${tables.length} tabelas...`, pct: 5 });

        const sqlLines: string[] = [
            `-- ====================================================================`,
            `-- BACKUP DE DADOS — Dbarros Rural`,
            `-- Gerado em: ${new Date().toLocaleString('pt-BR')}`,
            `-- Tabelas: ${tables.length} | Migrations: ${MIGRATION_FILES.length}`,
            `-- Execute APOS o 2_schema_all_migrations.sql`,
            `-- ====================================================================`,
            ``,
            `SET client_encoding = 'UTF8';`,
            `-- Desativa validacao de FK durante o restore (reativado no final do arquivo)`,
            `SET session_replication_role = 'replica';`,
            ``,
        ];

        // Buscar users primeiro (necessario para auth.users restore)
        const usersRes = await fetchTable('users');

        for (let i = 0; i < tables.length; i++) {
            const table = tables[i];
            onProgress?.({
                phase: 'db',
                label: `Tabela: ${table} (${i + 1}/${tables.length})`,
                pct: Math.round(5 + (i / tables.length) * 25),
            });

            const res = table === 'users' ? usersRes : await fetchTable(table);
            sqlLines.push(`-- ── TABLE: ${table} ──────────────────────────────────`);

            if (res.errorStr) {
                sqlLines.push(`-- [ERROR] Falha ao extrair dados: ${res.errorStr}`);
            }

            if (res.rows.length === 0) {
                sqlLines.push('-- (vazia)\n');
                continue;
            }

            for (const row of res.rows) sqlLines.push(rowToInsert(table, row));
            sqlLines.push(`-- ${res.rows.length} linha(s)\n`);
        }

        sqlLines.push(`SET session_replication_role = DEFAULT;`);
        sqlLines.push('-- FIM DO BACKUP');

        // Arquivos na pasta database/
        zip.file('database/1_auth_users_restore.sql', generateAuthRestoreSQL(usersRes.rows));
        zip.file('database/2_schema_all_migrations.sql', generateCombinedMigrations());

        if (schema?.tables?.length) {
            // DDL auto-gerado so incluido quando introspeccao funcionou
            const relevantTables = schema.tables.filter(t => tables.includes(t.name));
            zip.file('database/3_schema_ddl_auto.sql', generateDDLFromSchema(relevantTables));

            // Funcoes PostgreSQL (pg_get_functiondef ao vivo)
            if (schema.functions?.length) {
                zip.file('database/5_functions_ddl.sql', generateFunctionsDDL(schema.functions));
            }

            // Politicas RLS (pg_policies ao vivo — reconstruidas como CREATE POLICY)
            if (schema.policies?.length) {
                zip.file('database/6_rls_policies.sql', generatePoliciesDDL(schema.policies));
            }
        }

        zip.file('database/4_database_backup.sql', sqlLines.join('\n'));

        // Migrations individuais como referencia
        for (const mig of MIGRATION_FILES) {
            zip.file(`schema_migrations/${mig.filename}`, mig.content);
        }

        // ── Storage (30–80%) ──────────────────────────────────────────────────
        onProgress?.({ phase: 'storage', label: 'Descobrindo buckets do Storage...', pct: 30 });

        const availableBuckets = await discoverBuckets();
        zip.folder('storage_backup');

        const filesPerBucket = await Promise.all(availableBuckets.map((b) => listAllFiles(b)));
        const allFiles = filesPerBucket.flat();

        const CHUNK_SIZE = 8;
        let downloadedCount = 0;

        for (let i = 0; i < allFiles.length; i += CHUNK_SIZE) {
            const chunk = allFiles.slice(i, i + CHUNK_SIZE);

            await Promise.all(
                chunk.map(async (file) => {
                    const { data, error } = await supabase.storage.from(file.bucket).download(file.path);
                    downloadedCount++;

                    if (error || !data) {
                        console.warn(`[backup] Pulando ${file.bucket}/${file.path}:`, error?.message);
                        return;
                    }

                    const pct = 30 + Math.round((downloadedCount / Math.max(allFiles.length, 1)) * 48);
                    onProgress?.({
                        phase: 'storage',
                        label: `Arquivo ${downloadedCount}/${allFiles.length}: ${file.path}`,
                        pct,
                    });

                    const zipPath = `storage_backup/${file.bucket}/${file.path}`;
                    const { compression, compressionOptions } = getZipCompression(file.path);
                    zip.file(zipPath, data, { compression, compressionOptions });
                })
            );
        }

        // ── Codigo-fonte (80–88%) ───────────────────────────────────────────────
        onProgress?.({ phase: 'source', label: `Incluindo codigo-fonte (${SOURCE_FILES.length} arquivos)...`, pct: 80 });

        for (let i = 0; i < SOURCE_FILES.length; i++) {
            const sf = SOURCE_FILES[i];
            zip.file(`source_code/${sf.relativePath}`, sf.content);
        }

        onProgress?.({ phase: 'source', label: `Codigo-fonte: ${SOURCE_FILES.length} arquivos incluidos`, pct: 88 });

        // ── RESTORE_GUIDE.md dentro do ZIP ────────────────────────────────────
        zip.file('RESTORE_GUIDE.md', generateRestoreGuide(
            dateStr, tables, availableBuckets,
            schema?.functions?.length ?? 0,
            schema?.policies?.length ?? 0,
        ));

        // ── Compressao (88–100%) ───────────────────────────────────────────────
        onProgress?.({ phase: 'zipping', label: 'Compactando...', pct: 88 });

        const blob = await zip.generateAsync(
            { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
            (meta) => {
                onProgress?.({
                    phase: 'zipping',
                    label: `Compactando... ${Math.round(meta.percent)}%`,
                    pct: 88 + Math.round(meta.percent * 0.12),
                });
            },
        );

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Sistema_Dbarros_Rural_Backup_completo_${dateStr.replace(/-/g, '')}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        onProgress?.({
            phase: 'done',
            label: `Backup concluido! ${tables.length} tabelas, ${allFiles.length} arquivo(s) de storage, ${SOURCE_FILES.length} arquivos de codigo-fonte.`,
            pct: 100,
        });
    },
};
