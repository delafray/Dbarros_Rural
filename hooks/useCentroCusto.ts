/**
 * Hook do workspace do Centro de Custo (uma edição) — orquestra o
 * custosService (páginas não importam supabase, RNF-007).
 * Carrega catálogo + dados da edição e expõe ações com atualização otimista
 * simples (recarrega a coleção afetada após gravar).
 */

import { useCallback, useEffect, useState } from 'react';
import { custosService, type PedidoComItens } from '../services/custosService';
import type {
    CustoCategoria,
    CustoChecklistResposta,
    CustoComposto,
    CustoEspacoTemplate,
    CustoEspacoTemplateItem,
    CustoFornecedor,
    CustoItem,
    CustoItemInput,
    CustoPerfilEdicao,
} from '../types/custos';

export interface CentroCustoData {
    carregando: boolean;
    erro: string | null;
    categorias: CustoCategoria[];
    fornecedores: CustoFornecedor[];
    templates: (CustoEspacoTemplate & { itens: CustoEspacoTemplateItem[] })[];
    perfil: CustoPerfilEdicao | null;
    respostas: CustoChecklistResposta[];
    compostos: CustoComposto[];
    itens: CustoItem[];
    pedidos: PedidoComItens[];
}

export function useCentroCusto(edicaoId: string | null) {
    const [data, setData] = useState<CentroCustoData>({
        carregando: true, erro: null,
        categorias: [], fornecedores: [], templates: [],
        perfil: null, respostas: [], compostos: [], itens: [], pedidos: [],
    });

    const recarregar = useCallback(async () => {
        if (!edicaoId) return;
        setData(d => ({ ...d, carregando: true, erro: null }));
        try {
            const [categorias, fornecedores, templates, perfil, respostas, compostos, itens, pedidos] =
                await Promise.all([
                    custosService.getCategorias(),
                    custosService.getFornecedores(),
                    custosService.getEspacosTemplate(),
                    custosService.getPerfil(edicaoId),
                    custosService.getChecklist(edicaoId),
                    custosService.getCompostos(edicaoId),
                    custosService.getItens(edicaoId),
                    custosService.getPedidos(edicaoId),
                ]);
            setData({
                carregando: false, erro: null,
                categorias, fornecedores, templates, perfil, respostas, compostos, itens, pedidos,
            });
        } catch (e) {
            setData(d => ({ ...d, carregando: false, erro: e instanceof Error ? e.message : String(e) }));
        }
    }, [edicaoId]);

    useEffect(() => { void recarregar(); }, [recarregar]);

    // ── Ações da grade ──────────────────────────────────────────────────────
    const criarItem = useCallback(async (input: Omit<CustoItemInput, 'edicao_id'>) => {
        if (!edicaoId) return;
        const novo = await custosService.createItem({ ...input, edicao_id: edicaoId });
        setData(d => ({ ...d, itens: [...d.itens, novo] }));
        return novo;
    }, [edicaoId]);

    const atualizarItem = useCallback(async (id: string, patch: Partial<CustoItemInput>) => {
        const salvo = await custosService.updateItem(id, patch);
        setData(d => ({ ...d, itens: d.itens.map(i => (i.id === id ? salvo : i)) }));
    }, []);

    const excluirItem = useCallback(async (id: string) => {
        await custosService.deleteItem(id);
        setData(d => ({ ...d, itens: d.itens.filter(i => i.id !== id) }));
    }, []);

    const criarItensEmLote = useCallback(async (lote: Omit<CustoItemInput, 'edicao_id'>[]) => {
        for (const item of lote) {
            // sequencial: mantém a ordem da colagem
            // eslint-disable-next-line no-await-in-loop
            await criarItem(item);
        }
    }, [criarItem]);

    // ── Wizard/perfil/checklist ─────────────────────────────────────────────
    const salvarPerfil = useCallback(async (perfil: Partial<CustoPerfilEdicao>) => {
        if (!edicaoId) return;
        const salvo = await custosService.savePerfil({ ...perfil, edicao_id: edicaoId });
        setData(d => ({ ...d, perfil: salvo }));
    }, [edicaoId]);

    const salvarResposta = useCallback(async (r: Partial<CustoChecklistResposta> & { chave: string }) => {
        if (!edicaoId) return;
        const salvo = await custosService.saveChecklistResposta({ ...r, edicao_id: edicaoId });
        setData(d => ({
            ...d,
            respostas: [...d.respostas.filter(x => x.chave !== r.chave), salvo],
        }));
    }, [edicaoId]);

    const instanciarTemplate = useCallback(async (templateId: string, nome: string, quantidade: number) => {
        if (!edicaoId) return;
        await custosService.instanciarTemplate({ edicaoId, templateId, nome, quantidade });
        await recarregar();
    }, [edicaoId, recarregar]);

    // ── Cotações ────────────────────────────────────────────────────────────
    const criarPedido = useCallback(async (nome: string, categoriaId: string | null, itens: { itemId: string; quantidade: number }[]) => {
        if (!edicaoId) return;
        await custosService.createPedido({ edicaoId, nome, categoriaId, itens });
        await recarregar();
    }, [edicaoId, recarregar]);

    const importarCotacao = useCallback(async (params: {
        pedidoId: string; fornecedorId: string;
        linhas: { itemId: string; precoUnitario: number; quantidade: number }[];
        exclusoes: { chave: string; resposta: string }[];
    }) => {
        if (!edicaoId) return;
        await custosService.registrarCotacaoImportada({ edicaoId, ...params });
        await recarregar();
    }, [edicaoId, recarregar]);

    const contratarLinha = useCallback(async (cotacaoId: string, itemId: string) => {
        await custosService.marcarVencedor(cotacaoId, itemId);
        await recarregar();
    }, [recarregar]);

    return {
        ...data,
        recarregar,
        criarItem, atualizarItem, excluirItem, criarItensEmLote,
        salvarPerfil, salvarResposta, instanciarTemplate,
        criarPedido, importarCotacao, contratarLinha,
    };
}
