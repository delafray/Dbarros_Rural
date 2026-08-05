/**
 * Hook da BIBLIOTECA de espaços padrão fora do contexto de evento (RF-056/059)
 * — tela de Cadastros do Centro de Custo. Tudo nível empresa.
 */

import { useCallback, useEffect, useState } from 'react';
import { custosService } from '../services/custosService';
import type { ProdutoCatalogoLeve } from '../utils/descritivoSugestoes';
import type {
    CustoEspacoTemplate,
    CustoEspacoTemplateItem,
    CustoProdutoGrupo,
} from '../types/custos';

type TemplateComItens = CustoEspacoTemplate & { itens: CustoEspacoTemplateItem[] };

export function useEspacosPadrao(aberto: boolean) {
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const [templates, setTemplates] = useState<TemplateComItens[]>([]);
    const [grupos, setGrupos] = useState<CustoProdutoGrupo[]>([]);
    const [produtos, setProdutos] = useState<ProdutoCatalogoLeve[]>([]);

    const recarregar = useCallback(async () => {
        setCarregando(true);
        setErro(null);
        try {
            const [t, g, p] = await Promise.all([
                custosService.getEspacosTemplate(),
                custosService.getGrupos(),
                custosService.getProdutosCatalogo(),
            ]);
            setTemplates(t); setGrupos(g); setProdutos(p);
        } catch (e) {
            setErro(e instanceof Error ? e.message : String(e));
        } finally {
            setCarregando(false);
        }
    }, []);

    useEffect(() => { if (aberto) void recarregar(); }, [aberto, recarregar]);

    const refreshTemplates = useCallback(async () => {
        setTemplates(await custosService.getEspacosTemplate());
    }, []);

    const criar = useCallback(async (nome: string) => {
        await custosService.createTemplate({ nome });
        await refreshTemplates();
    }, [refreshTemplates]);

    const renomear = useCallback(async (id: string, nome: string) => {
        await custosService.updateTemplate(id, { nome });
        await refreshTemplates();
    }, [refreshTemplates]);

    const arquivar = useCallback(async (id: string) => {
        await custosService.updateTemplate(id, { ativo: false });
        await refreshTemplates();
    }, [refreshTemplates]);

    const addItem = useCallback(async (item: Parameters<typeof custosService.addTemplateItem>[0]) => {
        await custosService.addTemplateItem(item);
        await refreshTemplates();
    }, [refreshTemplates]);

    const updateItem = useCallback(async (id: string, patch: { quantidade?: number; formato?: string | null }) => {
        await custosService.updateTemplateItem(id, patch);
        await refreshTemplates();
    }, [refreshTemplates]);

    const deleteItem = useCallback(async (id: string) => {
        await custosService.deleteTemplateItem(id);
        await refreshTemplates();
    }, [refreshTemplates]);

    const buscarSugestoes = useCallback(async (termo: string): Promise<{ id: string }[]> => {
        const r = await custosService.buscarProdutos(termo, 20);
        return r.map(x => ({ id: x.id }));
    }, []);

    const registrarUso = useCallback((produtoId: string) => {
        void custosService.registrarUsoProduto(produtoId).catch(() => { /* best-effort */ });
        setProdutos(list => list.map(p =>
            p.id === produtoId ? { ...p, frequencia_uso: p.frequencia_uso + 1 } : p));
    }, []);

    return {
        carregando, erro, templates, grupos, produtos, recarregar,
        criar, renomear, arquivar, addItem, updateItem, deleteItem,
        buscarSugestoes, registrarUso,
    };
}
