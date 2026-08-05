/**
 * Hook da GESTÃO DE PRODUTOS do catálogo (RF-059) — tela inicial do Centro de
 * Custo. Lógica fora da página (RNF-007); dados via custosService.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { custosService } from '../services/custosService';
import { agruparHistoricoPorProduto, interpretarErroExclusao } from '../utils/produtosGestao';
import type {
    CustoCategoria,
    CustoProduto,
    CustoProdutoGrupo,
    CustoProdutoNomeHistorico,
    CustoUnidade,
} from '../types/custos';

export function useCustosProdutos(aberto: boolean) {
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const [produtos, setProdutos] = useState<CustoProduto[]>([]);
    const [grupos, setGrupos] = useState<CustoProdutoGrupo[]>([]);
    const [categorias, setCategorias] = useState<CustoCategoria[]>([]);
    const [unidades, setUnidades] = useState<CustoUnidade[]>([]);
    const [historico, setHistorico] = useState<CustoProdutoNomeHistorico[]>([]);

    const recarregar = useCallback(async () => {
        setCarregando(true);
        setErro(null);
        try {
            const [p, g, c, u, h] = await Promise.all([
                custosService.getProdutosGestao(),
                custosService.getGrupos(),
                custosService.getCategorias(),
                custosService.getUnidades(),
                custosService.getNomeHistorico(),
            ]);
            setProdutos(p); setGrupos(g); setCategorias(c); setUnidades(u); setHistorico(h);
        } catch (e) {
            setErro(e instanceof Error ? e.message : String(e));
        } finally {
            setCarregando(false);
        }
    }, []);

    useEffect(() => { if (aberto) void recarregar(); }, [aberto, recarregar]);

    /** produto_id → renomeações em ordem cronológica (subitem + tooltip). */
    const historicoPorProduto = useMemo(() => agruparHistoricoPorProduto(historico), [historico]);

    const adicionar = useCallback(async (p: {
        nome: string; grupo_id: string | null; categoria_id: string | null; unidade: string;
    }) => {
        const unidadeId = unidades.find(u => u.sigla === p.unidade)?.id ?? null;
        const novo = await custosService.createProduto({ ...p, unidade_id: unidadeId });
        setProdutos(list => [...list, novo].sort((a, b) => a.nome.localeCompare(b.nome)));
    }, [unidades]);

    const renomear = useCallback(async (id: string, novoNome: string) => {
        const salvo = await custosService.renomearProduto(id, novoNome);
        setProdutos(list => list.map(p => (p.id === id ? salvo : p)));
        setHistorico(await custosService.getNomeHistorico());
    }, []);

    /** true = excluiu; false = estava em uso (bloqueado — UI oferece desativar). */
    const excluir = useCallback(async (id: string): Promise<{ ok: boolean; motivo?: string }> => {
        try {
            await custosService.deleteProduto(id);
            setProdutos(list => list.filter(p => p.id !== id));
            return { ok: true };
        } catch (e) {
            const r = interpretarErroExclusao(e);
            if (r.bloqueado) return { ok: false, motivo: r.motivo };
            throw e;
        }
    }, []);

    const setAtivo = useCallback(async (id: string, ativo: boolean) => {
        const salvo = await custosService.setProdutoAtivo(id, ativo);
        setProdutos(list => list.map(p => (p.id === id ? salvo : p)));
    }, []);

    return {
        carregando, erro, produtos, grupos, categorias, unidades,
        historicoPorProduto, recarregar,
        adicionar, renomear, excluir, setAtivo,
    };
}
