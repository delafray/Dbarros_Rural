import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import {
  cardapioProjetosService,
  CardapioProjeto as Projeto,
} from '../services/cardapioProjetosService';
import { exportCardapiosCsv } from '../services/cardapiosExportService';
import AbaMenuA4 from '../components/cardapioProjeto/AbaMenuA4';
import AbaBanner from '../components/cardapioProjeto/AbaBanner';
import AbaPainelDuplo from '../components/cardapioProjeto/AbaPainelDuplo';
import AbaConfiguracao from '../components/cardapioProjeto/AbaConfiguracao';

type TabId = 'a4' | 'banner' | 'painel' | 'config';

const TABS: { id: TabId; label: string }[] = [
  { id: 'a4',     label: 'Menu A4' },
  { id: 'banner', label: 'Banner' },
  { id: 'painel', label: 'Painel Duplo' },
  { id: 'config', label: 'Configuração' },
];

const CardapioProjeto: React.FC = () => {
  const { projetoId } = useParams<{ projetoId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab') as TabId | null;
  const activeTab: TabId = TABS.some((t) => t.id === tabParam) ? (tabParam as TabId) : 'a4';

  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!projetoId) return;
    setIsLoading(true);
    cardapioProjetosService
      .buscar(projetoId)
      .then((p) => {
        if (!p) {
          navigate('/cardapios', { replace: true });
          return;
        }
        setProjeto(p);
      })
      .catch((e) => setError(e.message || 'Erro ao carregar projeto'))
      .finally(() => setIsLoading(false));
  }, [projetoId, navigate]);

  const setTab = (tab: TabId) => setSearchParams({ tab }, { replace: true });

  const handleExportExcel = async () => {
    if (!projeto) return;
    try {
      setIsExporting(true);
      await exportCardapiosCsv({ id: projeto.id, nome: projeto.nome });
    } catch (e: any) {
      alert(e.message || 'Erro ao exportar');
    } finally {
      setIsExporting(false);
    }
  };

  const headerActions = projeto ? (
    <button
      onClick={handleExportExcel}
      disabled={isExporting}
      title="Exporta os itens deste projeto (A4 + banner) com códigos e marcação de duplicados"
      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-sm px-4 py-2 rounded-lg shadow transition-all"
    >
      <ExcelIcon className="w-4 h-4" />
      {isExporting ? 'Exportando...' : 'Exportar Excel'}
    </button>
  ) : undefined;

  if (isLoading) {
    return (
      <Layout title="Cardápios">
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (error || !projeto) {
    return (
      <Layout title="Cardápios">
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error || 'Projeto não encontrado.'}{' '}
          <Link to="/cardapios" className="font-bold underline">Voltar aos projetos</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={projeto.nome} headerActions={headerActions}>
      {/* Breadcrumb + abas */}
      <div className="mb-5">
        <Link
          to="/cardapios"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors mb-3"
        >
          <BackIcon className="w-3.5 h-3.5" />
          Todos os projetos
        </Link>

        <div className="flex items-center gap-1 border-b border-slate-200">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-bold rounded-t-lg border-b-2 -mb-px transition-colors ${
                activeTab === tab.id
                  ? 'border-amber-500 text-amber-600 bg-amber-50/50'
                  : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'a4' && <AbaMenuA4 projeto={projeto} />}
      {activeTab === 'banner' && <AbaBanner projeto={projeto} />}
      {activeTab === 'painel' && <AbaPainelDuplo projeto={projeto} />}
      {activeTab === 'config' && (
        <AbaConfiguracao projeto={projeto} onProjetoChange={setProjeto} />
      )}
    </Layout>
  );
};

const ExcelIcon = (props: any) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
const BackIcon = (props: any) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

export default CardapioProjeto;
