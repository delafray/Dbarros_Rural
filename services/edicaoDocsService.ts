import { supabase } from './supabaseClient';

const BUCKET = 'edicao-docs';

export type DocTipo = 'proposta_comercial' | 'planta_baixa';

export const edicaoDocsService = {
    async upload(edicaoId: string, tipo: DocTipo, file: File): Promise<string> {
        const ext = file.name.split('.').pop() || 'pdf';
        const newPath = `${edicaoId}/${tipo}.${ext}`;
        const column = tipo === 'proposta_comercial' ? 'proposta_comercial_path' : 'planta_baixa_path';

        // Delete old file first if it has a different path (e.g. different extension)
        const { data: row, error: selectError } = await supabase
            .from('eventos_edicoes')
            .select(column)
            .eq('id', edicaoId)
            .single();

        if (selectError) throw new Error(`Erro ao consultar documento atual: ${selectError.message}`);

        const oldPath = (row as any)?.[column] as string | null;
        if (oldPath && oldPath !== newPath) {
            const { error: removeError } = await supabase.storage.from(BUCKET).remove([oldPath]);
            if (removeError) throw new Error(`Erro ao remover arquivo anterior: ${removeError.message}`);
        }

        const { error } = await supabase.storage
            .from(BUCKET)
            .upload(newPath, file, { upsert: true });

        if (error) throw new Error(`Erro ao enviar arquivo: ${error.message}`);

        const { error: dbError } = await supabase
            .from('eventos_edicoes')
            .update({ [column]: newPath } as any)
            .eq('id', edicaoId);

        if (dbError) {
            // Rollback best-effort: sem a referência no banco o arquivo novo ficaria órfão
            if (oldPath !== newPath) {
                await supabase.storage.from(BUCKET).remove([newPath]).catch(() => {});
            }
            throw new Error(`Erro ao salvar referencia: ${dbError.message}`);
        }

        return newPath;
    },

    async getSignedUrl(path: string): Promise<string> {
        const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
        if (error || !data?.signedUrl) throw new Error('Erro ao gerar URL do documento');
        return data.signedUrl;
    },

    async remove(edicaoId: string, tipo: DocTipo): Promise<void> {
        const column = tipo === 'proposta_comercial' ? 'proposta_comercial_path' : 'planta_baixa_path';

        const { data: row } = await supabase
            .from('eventos_edicoes')
            .select(column)
            .eq('id', edicaoId)
            .single();

        const currentPath = (row as any)?.[column] as string | null;
        if (currentPath) {
            // Falha aqui aborta ANTES de limpar a referência — evita arquivo órfão no Storage
            const { error: removeError } = await supabase.storage.from(BUCKET).remove([currentPath]);
            if (removeError) throw new Error(`Erro ao remover arquivo do Storage: ${removeError.message}`);
        }

        const { error } = await supabase
            .from('eventos_edicoes')
            .update({ [column]: null } as any)
            .eq('id', edicaoId);

        if (error) throw new Error(`Erro ao remover referencia: ${error.message}`);
    }
};
