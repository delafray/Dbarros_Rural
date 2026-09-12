import React, { useState } from 'react';
import { useAppDialog } from '../context/DialogContext';
import { planilhaVendasService, CategoriaSetup } from '../services/planilhaVendasService';
import { itensOpcionaisService } from '../services/itensOpcionaisService';
import { clientesService } from '../services/clientesService';
import type { EdicaoComDocsPDF } from './useDashboardExportPDF';
import type { EstandeRelatorio } from '../utils/relatorioVendasXlsx';

/**
 * Botão "XLS" do card da edição no dashboard — irmão do "PDF".
 * Orquestrador fino: busca os mesmos dados do PDF via services e delega a
 * montagem (pura e testada) para utils/relatorioVendasXlsx.ts.
 * O ExcelJS (~1 MB) só é carregado quando o usuário clica.
 */
export const useDashboardExportXlsx = (setDocModal: React.Dispatch<React.SetStateAction<any>>) => {
    const appDialog = useAppDialog();
    const [xlsxProgress, setXlsxProgress] = useState<number | null>(null);
    const [xlsxTitle, setXlsxTitle] = useState('');

    const handleExportXlsx = async (e: React.MouseEvent, edicao: EdicaoComDocsPDF) => {
        e.stopPropagation();
        setXlsxProgress(0);
        setXlsxTitle(edicao.titulo);
        try {
            const config = await planilhaVendasService.getConfig(edicao.id);
            if (!config) {
                setXlsxProgress(null);
                await appDialog.alert({ title: 'Aviso', message: 'Esta edição não possui configuração de planilha.', type: 'warning' });
                return;
            }
            setXlsxProgress(10);

            const [estandes, allOpcionais, listaClientes] = await Promise.all([
                planilhaVendasService.getEstandes(config.id),
                itensOpcionaisService.getItens(),
                clientesService.getClientesComContatos(),
            ]);
            setXlsxProgress(40);

            const categorias = (config.categorias_config as unknown as CategoriaSetup[]) || [];
            const opcionaisAtivos = allOpcionais.filter(item => config.opcionais_ativos?.includes(item.id));
            const precosEdicao = (config.opcionais_precos as Record<string, number>) || {};

            // Import dinâmico: exceljs fica fora do bundle inicial
            const { gerarPlanilhaVendasXlsx } = await import('../utils/relatorioVendasXlsx');
            setXlsxProgress(60);

            const buffer = await gerarPlanilhaVendasXlsx({
                titulo: edicao.titulo,
                categorias,
                // Row do banco tem os JSON como `Json`; o cálculo lê como Record (mesmo cast do PDF)
                estandes: estandes as unknown as EstandeRelatorio[],
                opcionaisAtivos,
                precosEdicao,
                clientes: listaClientes,
            });
            setXlsxProgress(90);

            const blob = new Blob([buffer as ArrayBuffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });
            const url = URL.createObjectURL(blob);
            setXlsxProgress(100);
            await new Promise(r => setTimeout(r, 400));
            setXlsxProgress(null);
            setDocModal({ tipo: 'relatorio_xlsx', url, edicaoTitulo: edicao.titulo, isPdfBlob: false });
        } catch (err: any) {
            setXlsxProgress(null);
            await appDialog.alert({ title: 'Erro ao gerar Excel', message: err?.message || 'Erro desconhecido.', type: 'danger' });
        }
    };

    return { xlsxProgress, xlsxTitle, handleExportXlsx };
};
