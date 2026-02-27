import { supabase } from './supabaseClient';

const BUCKET = 'edicao-docs';

export type DocTipo = 'proposta_comercial' | 'planta_baixa';

export const edicaoDocsService = {
    async upload(edicaoId: string, tipo: DocTipo, file: File): Promise<string> {
        const ext = file.name.split('.').pop() || 'pdf';
        const newPath = `${edicaoId}/${tipo}.${ext}`;
        const column = tipo === 'proposta_comercial' ? 'proposta_comercial_path' : 'planta_baixa_path';

        // Delete old file first if it has a different path (e.g. different extension)
        const { data: row } = await supabase
            .from('eventos_edicoes')
            .select(column)
            .eq('id', edicaoId)
            .single();

        const oldPath = (row as any)?.[column] as string | null;
        if (oldPath && oldPath !== newPath) {
            await supabase.storage.from(BUCKET).remove([oldPath]);
        }

        const { error } = await supabase.storage
            .from(BUCKET)
            .upload(newPath, file, { upsert: true });

        if (error) throw new Error(`Erro ao enviar arquivo: ${error.message}`);

        const { error: dbError } = await supabase
            .from('eventos_edicoes')
            .update({ [column]: newPath } as any)
            .eq('id', edicaoId);

        if (dbError) throw new Error(`Erro ao salvar referencia: ${dbError.message}`);

        return newPath;
    },

    getPublicUrl(path: string): string {
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        return data.publicUrl;
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
            await supabase.storage.from(BUCKET).remove([currentPath]);
        }

        const { error } = await supabase
            .from('eventos_edicoes')
            .update({ [column]: null } as any)
            .eq('id', edicaoId);

        if (error) throw new Error(`Erro ao remover referencia: ${error.message}`);
    }
};
