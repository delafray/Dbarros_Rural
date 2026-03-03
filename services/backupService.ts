import { supabase } from './supabaseClient';
import JSZip from 'jszip';

// ── Database tables (FK-safe order) ─────────────────────────────────────────
const BACKUP_TABLES = [
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
    'imagens_config',
    'stand_imagem_status',
    'edicao_docs',
    'app_users',
];

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
    return `INSERT INTO "${table}" (${cols}) VALUES (${vals}) ON CONFLICT (id) DO NOTHING;`;
}

async function fetchTable(table: string): Promise<{ rows: Record<string, unknown>[]; errorStr?: string }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).from(table).select('*');
    if (error) {
        console.warn(`[backup] Could not fetch table "${table}":`, error.message);
        return { rows: [], errorStr: error.message };
    }
    return { rows: (data ?? []) as Record<string, unknown>[] };
}

function buildSqlHeader(): string {
    const now = new Date().toLocaleString('pt-BR');
    return `-- ============================================================
-- BACKUP — Dbarros Rural
-- Gerado em: ${now}
-- Banco de dados: Supabase (PostgreSQL)
-- ============================================================
--
-- ► INSTRUCOES DE RESTAURACAO:
--   1. Crie um novo projeto em https://supabase.com
--   2. Execute as migrations: npx supabase db push
--   3. No SQL Editor do Supabase, cole e execute este arquivo
--
-- ► SEGURANCA:
--   Apenas INSERT com ON CONFLICT DO NOTHING.
--   Nenhum dado existente sera deletado ou sobrescrito.
--
-- ► MIGRACAO POSTGRES EXTERNO:
--   psql -h HOST -U USER -d DATABASE -f backup.sql
--
-- ============================================================

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

`;
}

// ── Storage helpers ──────────────────────────────────────────────────────────
interface StorageFile {
    bucket: string;
    path: string;
}

async function listBuckets(): Promise<string[]> {
    const { data, error } = await supabase.storage.listBuckets();
    if (error || !data) return [];
    return data.map((b) => b.name);
}

async function listAllFiles(bucket: string, folder = ''): Promise<StorageFile[]> {
    const { data, error } = await supabase.storage.from(bucket).list(folder, { limit: 1000 });
    if (error || !data) return [];

    const files: StorageFile[] = [];
    for (const item of data) {
        const fullPath = folder ? `${folder}/${item.name}` : item.name;
        if (item.id === null) {
            // folder — recurse
            const nested = await listAllFiles(bucket, fullPath);
            files.push(...nested);
        } else {
            files.push({ bucket, path: fullPath });
        }
    }
    return files;
}

// ── Progress callback type ────────────────────────────────────────────────────
export type BackupProgressCallback = (info: {
    phase: 'db' | 'storage' | 'zipping' | 'done';
    label: string;
    pct: number;
}) => void;

// ── Main export ───────────────────────────────────────────────────────────────
export const backupService = {
    /** SQL-only backup (without Storage files) */
    async download(): Promise<void> {
        const lines: string[] = [buildSqlHeader()];
        for (const table of BACKUP_TABLES) {
            lines.push(`-- ── TABLE: ${table} ──────────────────────────────────`);
            const res = await fetchTable(table);

            if (res.errorStr) {
                lines.push(`-- [ERROR] Falha ao extrair dados: ${res.errorStr}`);
            }

            if (res.rows.length === 0) {
                lines.push('-- (empty)\n');
                continue;
            }

            for (const row of res.rows) {
                lines.push(rowToInsert(table, row));
            }
            lines.push(`-- ${res.rows.length} row(s)\n`);
        }
        lines.push('-- END OF BACKUP');

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

    /** Full backup: SQL + Storage files → single ZIP with progress reporting */
    async downloadFull(onProgress?: BackupProgressCallback): Promise<void> {
        const zip = new JSZip();
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

        // Phase 1: Database (0–30%)
        onProgress?.({ phase: 'db', label: 'Exportando tabelas do banco...', pct: 0 });
        const sqlLines: string[] = [buildSqlHeader()];
        for (let i = 0; i < BACKUP_TABLES.length; i++) {
            const table = BACKUP_TABLES[i];
            onProgress?.({ phase: 'db', label: `Tabela: ${table}`, pct: Math.round((i / BACKUP_TABLES.length) * 30) });
            const res = await fetchTable(table);
            sqlLines.push(`-- ── TABLE: ${table} ──────────────────────────────────`);

            if (res.errorStr) {
                sqlLines.push(`-- [ERROR] Falha ao extrair dados: ${res.errorStr}`);
            }

            if (res.rows.length === 0) {
                sqlLines.push('-- (empty)\n');
                continue;
            }

            for (const row of res.rows) {
                sqlLines.push(rowToInsert(table, row));
            }
            sqlLines.push(`-- ${res.rows.length} row(s)\n`);
        }
        sqlLines.push('-- END OF BACKUP');
        zip.file(`database/dbarros_backup_${dateStr}.sql`, sqlLines.join('\n'));

        // Phase 2: Storage files (30–90%)
        onProgress?.({ phase: 'storage', label: 'Listando arquivos do Storage...', pct: 30 });
        const buckets = await listBuckets();

        // Garante que a pasta 'storage' exista no ZIP mesmo que vazia
        zip.folder('storage');

        const allFiles: StorageFile[] = [];
        for (const bucket of buckets) {
            const files = await listAllFiles(bucket);
            allFiles.push(...files);
        }

        for (let i = 0; i < allFiles.length; i++) {
            const file = allFiles[i];
            const pct = 30 + Math.round((i / Math.max(allFiles.length, 1)) * 60);
            onProgress?.({
                phase: 'storage',
                label: `Arquivo ${i + 1} de ${allFiles.length}: ${file.path}`,
                pct,
            });
            const { data, error } = await supabase.storage.from(file.bucket).download(file.path);
            if (error || !data) {
                console.warn(`[backup] Skipping ${file.bucket}/${file.path}:`, error?.message);
                continue;
            }
            zip.file(`storage/${file.bucket}/${file.path}`, data);
        }

        // Phase 3: ZIP compression (90–100%)
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
        a.download = `dbarros_backup_completo_${dateStr}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        onProgress?.({ phase: 'done', label: 'Backup concluído com sucesso!', pct: 100 });
    },
};
