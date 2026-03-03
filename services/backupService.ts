import { supabase } from './supabaseClient';
import JSZip from 'jszip';

// ── Vite raw imports — migration SQL files embedded at build time ─────────────
import mig001 from '../supabase/migrations/20240221150000_create_user_biometrics.sql?raw';
import mig002 from '../supabase/migrations/20260222003052_add_storage_location_to_photos.sql?raw';
import mig003 from '../supabase/migrations/20260225003600_create_events_system.sql?raw';
import mig004 from '../supabase/migrations/20260227120000_create_tarefas.sql?raw';
import mig005 from '../supabase/migrations/20260227130000_fix_tarefas_fk.sql?raw';
import mig006 from '../supabase/migrations/20260227140000_add_edicao_docs_paths.sql?raw';
import mig007 from '../supabase/migrations/20260227150000_create_imagens_system.sql?raw';
import mig008 from '../supabase/migrations/20260227160000_create_imagem_recebimentos.sql?raw';
import mig009 from '../supabase/migrations/20260227160000_rename_opcional_item_rpc.sql?raw';
import mig010 from '../supabase/migrations/20260227170000_add_status_timestamps.sql?raw';
import mig011 from '../supabase/migrations/20260227170000_add_tipo_padrao_itens_opcionais.sql?raw';
import mig012 from '../supabase/migrations/20260227170000_enable_realtime_planilha.sql?raw';
import mig013 from '../supabase/migrations/20260228_add_edicao_id_and_admin_policies_to_users.sql?raw';
import mig014 from '../supabase/migrations/20260228_add_edicao_id_to_users.sql?raw';
import mig015 from '../supabase/migrations/20260228_add_temp_password_plain.sql?raw';
import mig016 from '../supabase/migrations/20260228_visitor_read_clientes.sql?raw';

// ── Migration files registry ─────────────────────────────────────────────────
const MIGRATION_FILES: { filename: string; content: string }[] = [
    { filename: '001_create_user_biometrics.sql', content: mig001 },
    { filename: '002_add_storage_location_to_photos.sql', content: mig002 },
    { filename: '003_create_events_system.sql', content: mig003 },
    { filename: '004_create_tarefas.sql', content: mig004 },
    { filename: '005_fix_tarefas_fk.sql', content: mig005 },
    { filename: '006_add_edicao_docs_paths.sql', content: mig006 },
    { filename: '007_create_imagens_system.sql', content: mig007 },
    { filename: '008_create_imagem_recebimentos.sql', content: mig008 },
    { filename: '009_rename_opcional_item_rpc.sql', content: mig009 },
    { filename: '010_add_status_timestamps.sql', content: mig010 },
    { filename: '011_add_tipo_padrao_itens_opcionais.sql', content: mig011 },
    { filename: '012_enable_realtime_planilha.sql', content: mig012 },
    { filename: '013_add_edicao_id_and_admin_policies_to_users.sql', content: mig013 },
    { filename: '014_add_edicao_id_to_users.sql', content: mig014 },
    { filename: '015_add_temp_password_plain.sql', content: mig015 },
    { filename: '016_visitor_read_clientes.sql', content: mig016 },
];

// ── Schema DDL — tabelas conhecidas sem migration dedicada ───────────────────
// Inclui TODAS as tabelas (com IF NOT EXISTS) para restauracao completa independente de migrations.
const SCHEMA_DDL = `-- ====================================================================
-- SCHEMA DDL — Dbarros Rural
-- Gerado automaticamente pelo sistema de backup.
-- Execute este arquivo APOS o 1_auth_users_restore.sql e ANTES do 4_database_backup.sql.
-- ====================================================================

SET client_encoding = 'UTF8';

-- Usuarios da aplicacao (espelha auth.users com campos extras)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    is_admin BOOLEAN NOT NULL DEFAULT false,
    is_visitor BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_temp BOOLEAN NOT NULL DEFAULT false,
    is_projetista BOOLEAN NOT NULL DEFAULT false,
    can_manage_tags BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMPTZ,
    edicao_id UUID,
    temp_password_plain TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Biometria / WebAuthn
CREATE TABLE IF NOT EXISTS public.user_biometrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    credential_id TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    counter INTEGER NOT NULL DEFAULT 0,
    friendly_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    last_used_at TIMESTAMPTZ
);
ALTER TABLE public.user_biometrics ENABLE ROW LEVEL SECURITY;

-- Configuracao global do sistema
CREATE TABLE IF NOT EXISTS public.system_config (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Eventos (feiras/exposicoes)
CREATE TABLE IF NOT EXISTS public.eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    contato_principal TEXT,
    promotor_nome TEXT,
    promotor_email TEXT,
    promotor_telefone TEXT,
    promotor_endereco TEXT,
    promotor_redes_sociais JSONB DEFAULT '[]',
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;

-- Edicoes de eventos (por ano)
CREATE TABLE IF NOT EXISTS public.eventos_edicoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evento_id UUID REFERENCES public.eventos(id) ON DELETE CASCADE,
    ano INTEGER NOT NULL,
    titulo TEXT NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT true,
    local_completo TEXT,
    local_resumido TEXT,
    data_inicio TIMESTAMPTZ,
    data_fim TIMESTAMPTZ,
    montagem_inicio TIMESTAMPTZ,
    montagem_fim TIMESTAMPTZ,
    desmontagem_inicio TIMESTAMPTZ,
    desmontagem_fim TIMESTAMPTZ,
    proposta_comercial_path TEXT,
    planta_baixa_path TEXT,
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.eventos_edicoes ENABLE ROW LEVEL SECURITY;

-- Clientes
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_pessoa TEXT NOT NULL,
    nome_completo TEXT,
    nome_fantasia TEXT,
    razao_social TEXT,
    cpf TEXT,
    cnpj TEXT,
    rg TEXT,
    inscricao_estadual TEXT,
    data_nascimento TEXT,
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- Contatos
CREATE TABLE IF NOT EXISTS public.contatos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    nome TEXT,
    cargo TEXT,
    telefone TEXT,
    email TEXT,
    principal BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.contatos ENABLE ROW LEVEL SECURITY;

-- Enderecos
CREATE TABLE IF NOT EXISTS public.enderecos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    cep TEXT,
    logradouro TEXT,
    numero TEXT,
    complemento TEXT,
    bairro TEXT,
    cidade TEXT,
    estado TEXT,
    tema TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.enderecos ENABLE ROW LEVEL SECURITY;

-- Contratos
CREATE TABLE IF NOT EXISTS public.contratos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    numero TEXT,
    status TEXT,
    data_inicio TEXT,
    data_fim TEXT,
    valor NUMERIC,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

-- Itens opcionais de stand
CREATE TABLE IF NOT EXISTS public.itens_opcionais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    preco_base NUMERIC NOT NULL DEFAULT 0,
    tipo_padrao TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.itens_opcionais ENABLE ROW LEVEL SECURITY;

-- Planilha: configuracoes por edicao
CREATE TABLE IF NOT EXISTS public.planilha_configuracoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    edicao_id UUID REFERENCES public.eventos_edicoes(id) ON DELETE CASCADE,
    categorias_config JSONB NOT NULL DEFAULT '[]',
    opcionais_ativos TEXT[] DEFAULT '{}',
    opcionais_precos JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.planilha_configuracoes ENABLE ROW LEVEL SECURITY;

-- Planilha: estandes vendidos
CREATE TABLE IF NOT EXISTS public.planilha_vendas_estandes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID REFERENCES public.planilha_configuracoes(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    cliente_nome_livre TEXT,
    stand_nr TEXT NOT NULL,
    tipo_venda TEXT NOT NULL DEFAULT 'avista',
    desconto NUMERIC DEFAULT 0,
    valor_pago NUMERIC,
    observacoes TEXT,
    opcionais_selecionados JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.planilha_vendas_estandes ENABLE ROW LEVEL SECURITY;

-- Atendimentos (CRM)
CREATE TABLE IF NOT EXISTS public.atendimentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    edicao_id UUID NOT NULL REFERENCES public.eventos_edicoes(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    cliente_nome TEXT,
    contato_id UUID REFERENCES public.contatos(id) ON DELETE SET NULL,
    contato_nome TEXT,
    telefone TEXT,
    probabilidade INTEGER NOT NULL DEFAULT 0,
    ultima_obs TEXT,
    ultima_obs_at TIMESTAMPTZ,
    data_retorno TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.atendimentos ENABLE ROW LEVEL SECURITY;

-- Historico de atendimentos
CREATE TABLE IF NOT EXISTS public.atendimentos_historico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    atendimento_id UUID NOT NULL REFERENCES public.atendimentos(id) ON DELETE CASCADE,
    descricao TEXT NOT NULL,
    probabilidade INTEGER,
    data_retorno TIMESTAMPTZ,
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.atendimentos_historico ENABLE ROW LEVEL SECURITY;

-- Tarefas
CREATE TABLE IF NOT EXISTS public.tarefas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    edicao_id UUID NOT NULL REFERENCES public.eventos_edicoes(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    descricao TEXT,
    status TEXT NOT NULL DEFAULT 'pendente',
    prioridade TEXT NOT NULL DEFAULT 'media',
    data_prazo TIMESTAMPTZ,
    user_id UUID,
    responsavel_id UUID,
    ultima_obs TEXT,
    ultima_obs_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;

-- Historico de tarefas
CREATE TABLE IF NOT EXISTS public.tarefas_historico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tarefa_id UUID NOT NULL REFERENCES public.tarefas(id) ON DELETE CASCADE,
    descricao TEXT NOT NULL,
    status_anterior TEXT,
    status_novo TEXT,
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.tarefas_historico ENABLE ROW LEVEL SECURITY;

-- Categorias de tags (galeria)
CREATE TABLE IF NOT EXISTS public.tag_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    is_required BOOLEAN NOT NULL DEFAULT false,
    peer_category_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.tag_categories ENABLE ROW LEVEL SECURITY;

-- Tags (galeria)
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    category_id UUID NOT NULL REFERENCES public.tag_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Fotos e videos (galeria)
CREATE TABLE IF NOT EXISTS public.photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    video_url TEXT,
    local_path TEXT,
    storage_location TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

-- Relacao foto-tag
CREATE TABLE IF NOT EXISTS public.photo_tags (
    photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (photo_id, tag_id)
);
ALTER TABLE public.photo_tags ENABLE ROW LEVEL SECURITY;

-- Requisitos de imagens por edicao
CREATE TABLE IF NOT EXISTS public.edicao_imagens_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    edicao_id UUID NOT NULL REFERENCES public.eventos_edicoes(id) ON DELETE CASCADE,
    origem_tipo TEXT NOT NULL,
    origem_ref TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'imagem',
    descricao TEXT NOT NULL,
    dimensoes TEXT,
    avulso_status TEXT NOT NULL DEFAULT 'pendente',
    avulso_obs TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.edicao_imagens_config ENABLE ROW LEVEL SECURITY;

-- Status de imagens por estande
CREATE TABLE IF NOT EXISTS public.stand_imagens_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estande_id UUID NOT NULL UNIQUE REFERENCES public.planilha_vendas_estandes(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pendente',
    observacoes TEXT,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.stand_imagens_status ENABLE ROW LEVEL SECURITY;

-- Controle de recebimento de imagens por item e estande
CREATE TABLE IF NOT EXISTS public.stand_imagem_recebimentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estande_id UUID NOT NULL REFERENCES public.planilha_vendas_estandes(id) ON DELETE CASCADE,
    imagem_config_id UUID NOT NULL REFERENCES public.edicao_imagens_config(id) ON DELETE CASCADE,
    recebido BOOLEAN NOT NULL DEFAULT FALSE,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(estande_id, imagem_config_id)
);
ALTER TABLE public.stand_imagem_recebimentos ENABLE ROW LEVEL SECURITY;
`;

// ── Database tables — ordem FK-safe ─────────────────────────────────────────
const BACKUP_TABLES = [
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
    return `INSERT INTO public."${table}" (${cols}) VALUES (${vals}) ON CONFLICT (id) DO NOTHING;`;
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

// ── Geracao de DDL inferida a partir dos dados ───────────────────────────────
function generateInferredDDL(tableName: string, rows: Record<string, unknown>[]): string {
    if (rows.length === 0) return `-- Tabela: ${tableName} (vazia, schema desconhecido)\n`;
    const sample = rows[0];
    const columns = Object.entries(sample).map(([col, val]) => {
        let type = 'TEXT';
        if (val === null) {
            if (col === 'id' || col.endsWith('_id')) type = 'UUID';
            else if (col.endsWith('_at') || col.endsWith('_date')) type = 'TIMESTAMPTZ';
        } else if (typeof val === 'boolean') type = 'BOOLEAN';
        else if (typeof val === 'number') type = Number.isInteger(val) ? 'INTEGER' : 'NUMERIC';
        else if (typeof val === 'object') type = 'JSONB';
        else if (typeof val === 'string') {
            if (col === 'id' || col.endsWith('_id')) type = 'UUID';
            else if (col.endsWith('_at') || col.endsWith('_date')) type = 'TIMESTAMPTZ';
        }
        return `    ${col} ${type}`;
    }).join(',\n');
    return `CREATE TABLE IF NOT EXISTS public."${tableName}" (\n${columns}\n);\n`;
}

// ── SQL para restaurar auth.users com UUIDs originais ────────────────────────
// CRITICO: auth.users.id = public.users.id — se mudar, todos os vinculos quebram.
// A senha temporaria para todos os usuarios restaurados eh: GaleriaRestore2024!
const TEMP_PASSWORD_HASH = `\$2a\$10\$PnSCvLdEJmBFDkdFr.johuDQSRBCdQBi8NTRVB7q3CkMjMCXaELnC`;

function generateAuthRestoreSQL(users: Record<string, unknown>[]): string {
    const now = new Date().toLocaleString('pt-BR');
    const lines: string[] = [
        `-- ====================================================================`,
        `-- RESTAURACAO DO auth.users — Dbarros Rural`,
        `-- Gerado em: ${now}`,
        `-- `,
        `-- CRITICO: Execute este arquivo PRIMEIRO, antes de qualquer outro.`,
        `-- Ele recria os usuarios no Supabase Auth com os mesmos UUIDs originais.`,
        `-- Sem isso, todos os vinculos (fotos, tarefas, atendimentos) ficam quebrados.`,
        `-- `,
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
    for (const item of data) {
        const fullPath = folder ? `${folder}/${item.name}` : item.name;
        if (item.id === null) {
            const nested = await listAllFiles(bucket, fullPath);
            files.push(...nested);
        } else {
            files.push({ bucket, path: fullPath });
        }
    }
    return files;
}

async function discoverBuckets(): Promise<string[]> {
    const found: string[] = [];
    for (const bucket of STORAGE_BUCKETS_TO_TRY) {
        try {
            const { error } = await supabase.storage.from(bucket).list('', { limit: 1 });
            if (!error) found.push(bucket);
        } catch {
            // Bucket nao existe ou sem acesso — ignorar
        }
    }
    return found;
}

function getZipCompression(filename: string): { compression: 'STORE' | 'DEFLATE'; compressionOptions?: { level: number } } {
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    if (MEDIA_EXTENSIONS.has(ext)) return { compression: 'STORE' };
    return { compression: 'DEFLATE', compressionOptions: { level: 3 } };
}

// ── RESTORE_GUIDE.md ─────────────────────────────────────────────────────────
function generateRestoreGuide(dateStr: string, buckets: string[]): string {
    return `# Guia de Restauracao — Dbarros Rural
## Backup gerado em: ${dateStr}

## Estrutura do ZIP

\`\`\`
backup_dbarros_full_${dateStr}.zip
├── RESTORE_GUIDE.md              ← Este arquivo
├── database/
│   ├── 1_auth_users_restore.sql  ← PRIMEIRO: recria usuarios no Supabase Auth
│   ├── 2_schema_ddl.sql          ← SEGUNDO: cria as tabelas (CREATE TABLE IF NOT EXISTS)
│   ├── 3_schema_inferred_extras.sql ← TERCEIRO: tabelas extras inferidas dos dados
│   └── 4_database_backup.sql     ← QUARTO: insere todos os dados (INSERT ... ON CONFLICT DO NOTHING)
├── schema_migrations/
│   └── 001_*.sql, 002_*.sql ...  ← Migrations historicas (referencia)
└── storage_backup/
${buckets.map(b => `    └── ${b}/                     ← Arquivos do bucket "${b}"`).join('\n')}
\`\`\`

---

## Passo a passo de restauracao

### 1. Criar novo projeto no Supabase
- Acesse https://supabase.com e crie um novo projeto
- Copie a URL e a ANON_KEY do novo projeto
- Atualize o arquivo \`.env\` da aplicacao com os novos valores

### 2. Restaurar usuarios (auth.users) — CRITICO
No **SQL Editor** do Supabase Studio, execute:
\`database/1_auth_users_restore.sql\`

> **Por que e critico?** O sistema usa \`auth.users.id\` como chave primaria de \`public.users\`.
> Se os UUIDs mudarem, TODOS os vinculos (fotos, tarefas, atendimentos) ficam quebrados.

**Senha temporaria de todos os usuarios restaurados:** \`GaleriaRestore2024!\`
Solicite que cada usuario redefina sua senha apos o primeiro login.

### 3. Criar as tabelas (schema)
No SQL Editor, execute:
\`database/2_schema_ddl.sql\`

Se houver tabelas extras nao reconhecidas:
\`database/3_schema_inferred_extras.sql\`

### 4. Restaurar os dados
No SQL Editor, execute:
\`database/4_database_backup.sql\`

> Todos os INSERTs usam \`ON CONFLICT DO NOTHING\` — seguro para rodar multiplas vezes.

### 5. Restaurar arquivos do Storage
Para cada bucket em \`storage_backup/\`:
- Crie o bucket no Supabase Storage (mesmo nome, mesmas configuracoes de acesso publico)
- Faca upload manual ou via CLI dos arquivos mantendo a estrutura de pastas

Via Supabase CLI:
\`\`\`bash
supabase storage cp --recursive storage_backup/photos/ supabase://photos/
\`\`\`

### 6. Atualizar variaveis de ambiente
Atualize o \`.env\` com a nova URL do projeto:
\`\`\`
VITE_SUPABASE_URL=https://novo-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=nova-anon-key
\`\`\`

### 7. Atualizar URLs de fotos no banco (se necessario)
Se a URL do projeto mudou, as URLs das fotos no campo \`photos.url\` precisam ser atualizadas:
\`\`\`sql
UPDATE public.photos
SET url = REPLACE(url, 'https://projeto-antigo.supabase.co', 'https://projeto-novo.supabase.co'),
    thumbnail_url = REPLACE(thumbnail_url, 'https://projeto-antigo.supabase.co', 'https://projeto-novo.supabase.co');
\`\`\`

### 8. Funcoes PostgreSQL personalizadas
As funcoes SQL customizadas (RPCs) nao estao incluidas no backup de dados.
Consulte as migrations em \`schema_migrations/\` e recrie-as manualmente se necessario.

### 9. Passkeys / WebAuthn
Passkeys ficam vinculadas ao dominio original e **nao podem ser migradas**.
Os usuarios precisarao re-registrar suas passkeys apos a restauracao.
Os dados em \`public.user_biometrics\` sao restaurados, mas as credenciais do browser
sao invalidas no novo dominio — isso e esperado e nao representa perda de dados.

---

## Notas importantes

- Este backup foi gerado com \`ON CONFLICT DO NOTHING\` em todos os INSERTs — nenhum dado existente e sobrescrito
- As migrations em \`schema_migrations/\` sao fornecidas como referencia historica
- Para migracao para PostgreSQL externo: \`psql -h HOST -U USER -d DATABASE -f 4_database_backup.sql\`
`;
}

// ── Helpers de progresso ─────────────────────────────────────────────────────
export type BackupProgressCallback = (info: {
    phase: 'db' | 'storage' | 'zipping' | 'done';
    label: string;
    pct: number;
}) => void;

// ── Main export ───────────────────────────────────────────────────────────────
export const backupService = {
    /** SQL-only backup (sem arquivos do Storage) */
    async download(): Promise<void> {
        const lines: string[] = [
            `-- Backup SQL — Dbarros Rural — ${new Date().toLocaleString('pt-BR')}\n`,
            `SET client_encoding = 'UTF8';\n`,
        ];

        for (const table of BACKUP_TABLES) {
            lines.push(`-- ── TABLE: ${table} ──────────────────────────────────`);
            const res = await fetchTable(table);
            if (res.errorStr) {
                lines.push(`-- [ERROR] ${res.errorStr}`);
            }
            if (res.rows.length === 0) {
                lines.push('-- (vazia)\n');
                continue;
            }
            for (const row of res.rows) {
                lines.push(rowToInsert(table, row));
            }
            lines.push(`-- ${res.rows.length} linha(s)\n`);
        }
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

        // ── Fase 1: Banco de dados (0–30%) ────────────────────────────────────
        onProgress?.({ phase: 'db', label: 'Exportando tabelas do banco...', pct: 0 });

        const sqlLines: string[] = [
            `-- ====================================================================`,
            `-- BACKUP DE DADOS — Dbarros Rural`,
            `-- Gerado em: ${new Date().toLocaleString('pt-BR')}`,
            `-- Execute APOS o 2_schema_ddl.sql`,
            `-- ====================================================================\n`,
            `SET client_encoding = 'UTF8';\n`,
        ];

        // Buscar dados de todos os usuarios (necessario para auth.users restore)
        const usersRes = await fetchTable('users');

        for (let i = 0; i < BACKUP_TABLES.length; i++) {
            const table = BACKUP_TABLES[i];
            onProgress?.({
                phase: 'db',
                label: `Tabela: ${table}`,
                pct: Math.round((i / BACKUP_TABLES.length) * 30),
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

            for (const row of res.rows) {
                sqlLines.push(rowToInsert(table, row));
            }
            sqlLines.push(`-- ${res.rows.length} linha(s)\n`);
        }
        sqlLines.push('-- FIM DO BACKUP');

        // Arquivos numerados na pasta database/
        zip.file('database/1_auth_users_restore.sql', generateAuthRestoreSQL(usersRes.rows));
        zip.file('database/2_schema_ddl.sql', SCHEMA_DDL);

        // Schema inferido para tabelas nao conhecidas (usando dados reais)
        const inferredLines: string[] = [
            `-- Schema inferido a partir dos dados — tabelas nao cobertas pelo SCHEMA_DDL principal\n`,
        ];
        let inferredCount = 0;
        for (const table of BACKUP_TABLES) {
            const knownTables = SCHEMA_DDL.match(/CREATE TABLE IF NOT EXISTS public\."?(\w+)"?/g)
                ?.map(s => s.replace(/CREATE TABLE IF NOT EXISTS public\."?(\w+)"?/, '$1')) ?? [];
            if (!knownTables.includes(table)) {
                const res = await fetchTable(table);
                inferredLines.push(generateInferredDDL(table, res.rows));
                inferredCount++;
            }
        }
        if (inferredCount > 0) {
            zip.file('database/3_schema_inferred_extras.sql', inferredLines.join('\n'));
        }

        zip.file('database/4_database_backup.sql', sqlLines.join('\n'));

        // Migrations como referencia
        for (const mig of MIGRATION_FILES) {
            zip.file(`schema_migrations/${mig.filename}`, mig.content);
        }

        // ── Fase 2: Storage (30–90%) ───────────────────────────────────────────
        onProgress?.({ phase: 'storage', label: 'Descobrindo buckets do Storage...', pct: 30 });

        const availableBuckets = await discoverBuckets();
        zip.folder('storage_backup');

        const allFiles: StorageFile[] = [];
        for (const bucket of availableBuckets) {
            const files = await listAllFiles(bucket);
            allFiles.push(...files);
        }

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

                    const pct = 30 + Math.round((downloadedCount / Math.max(allFiles.length, 1)) * 60);
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

        // ── RESTORE_GUIDE.md ──────────────────────────────────────────────────
        zip.file('RESTORE_GUIDE.md', generateRestoreGuide(dateStr, availableBuckets));

        // ── Fase 3: Compressao (90–100%) ──────────────────────────────────────
        onProgress?.({ phase: 'zipping', label: 'Compactando...', pct: 90 });

        const blob = await zip.generateAsync(
            { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
            (meta) => {
                onProgress?.({
                    phase: 'zipping',
                    label: `Compactando... ${Math.round(meta.percent)}%`,
                    pct: 90 + Math.round(meta.percent * 0.1),
                });
            },
        );

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_dbarros_full_${dateStr.replace(/-/g, '')}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        onProgress?.({ phase: 'done', label: 'Backup concluido com sucesso!', pct: 100 });
    },
};
