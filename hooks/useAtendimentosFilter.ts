import { useMemo } from 'react';
import { Atendimento, atendimentosService } from '../services/atendimentosService';
import { SortKey } from '../components/atendimentos/types';

interface UseAtendimentosFilterParams {
    atendimentos: Atendimento[];
    search: string;
    sortKey: SortKey | null;
    sortDir: 'asc' | 'desc';
}

/**
 * Filtra e ordena a lista de atendimentos com base na busca e na coluna/direção de ordenação.
 * Recebe a lista bruta e os estados de filtro; devolve a lista filtrada+ordenada.
 */
export function useAtendimentosFilter({
    atendimentos,
    search,
    sortKey,
    sortDir,
}: UseAtendimentosFilterParams): Atendimento[] {
    return useMemo(() => {
        const q = search.toLowerCase().trim();
        let result = atendimentos;

        if (q) {
            result = atendimentos.filter(a => {
                const nome = atendimentosService.getNomeExibicao(a).toLowerCase();
                const cont = atendimentosService.getContatoExibicao(a).toLowerCase();
                const tel = atendimentosService.getTelefoneExibicao(a).toLowerCase();
                const obs = (a.ultima_obs || '').toLowerCase();
                return nome.includes(q) || cont.includes(q) || tel.includes(q) || obs.includes(q);
            });
        }

        // Ordenação padrão (quando não há sortKey): 1º Maior probabilidade, 2º Alfabético
        if (!sortKey) {
            return [...result].sort((a, b) => {
                const probA = a.probabilidade === null ? -1 : a.probabilidade;
                const probB = b.probabilidade === null ? -1 : b.probabilidade;
                if (probA !== probB) return probB - probA;
                return atendimentosService.getNomeExibicao(a).toLowerCase()
                    .localeCompare(atendimentosService.getNomeExibicao(b).toLowerCase(), 'pt-BR');
            });
        }

        // Ordenação por coluna selecionada
        const dir = sortDir === 'asc' ? 1 : -1;
        return [...result].sort((a, b) => {
            if (sortKey === 'nome') {
                const sA = atendimentosService.getNomeExibicao(a).toLowerCase();
                const sB = atendimentosService.getNomeExibicao(b).toLowerCase();
                return dir * sA.localeCompare(sB, 'pt-BR');
            }
            if (sortKey === 'contato') {
                const sA = atendimentosService.getContatoExibicao(a).toLowerCase();
                const sB = atendimentosService.getContatoExibicao(b).toLowerCase();
                return dir * sA.localeCompare(sB, 'pt-BR');
            }
            if (sortKey === 'obs') {
                const sA = (a.ultima_obs || '').toLowerCase();
                const sB = (b.ultima_obs || '').toLowerCase();
                return dir * sA.localeCompare(sB, 'pt-BR');
            }
            if (sortKey === 'prob') {
                const nA = a.probabilidade === null ? -1 : a.probabilidade;
                const nB = b.probabilidade === null ? -1 : b.probabilidade;
                return dir * (nA - nB);
            }
            if (sortKey === 'registro') {
                const nA = a.ultima_obs_at ? new Date(a.ultima_obs_at).getTime() : 0;
                const nB = b.ultima_obs_at ? new Date(b.ultima_obs_at).getTime() : 0;
                return dir * (nA - nB);
            }
            if (sortKey === 'retorno') {
                const nA = a.data_retorno ? new Date(a.data_retorno).getTime() : 0;
                const nB = b.data_retorno ? new Date(b.data_retorno).getTime() : 0;
                return dir * (nA - nB);
            }
            return 0;
        });
    }, [atendimentos, search, sortKey, sortDir]);
}
