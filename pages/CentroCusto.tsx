/**
 * Centro de Custo do Evento — página orquestradora (RNF-007).
 * /custos            → escolher a edição (Evento + Ano) ou criar novo
 * /custos/:edicaoId  → workspace: Grade | Cotações | Dashboard (+ wizard)
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { Button, Card, LoadingSpinner } from '../components/UI';
import { custosService } from '../services/custosService';
import { useCentroCusto } from '../hooks/useCentroCusto';
import { WizardEvento } from '../components/custos/WizardEvento';
import { GradeCustos } from '../components/custos/GradeCustos';
import { CotacoesTab } from '../components/custos/CotacoesTab';
import { DashboardTab } from '../components/custos/DashboardTab';
import { EspacosTab } from '../components/custos/EspacosTab';
import { PagamentosTab } from '../components/custos/PagamentosTab';

type Aba = 'grade' | 'cotacoes' | 'pagamentos' | 'espacos' | 'dashboard';

interface EdicaoLista {
    id: string;
    titulo: string;
    ano: number;
    data_inicio: string | null;
    eventoNome: string;
}

const SeletorEdicao: React.FC = () => {
    const navigate = useNavigate();
    const [edicoes, setEdicoes] = useState<EdicaoLista[] | null>(null);
    const [criando, setCriando] = useState(false);
    const [novo, setNovo] = useState({ nome: '', ano: String(new Date().getFullYear() + 1) });

    const [erro, setErro] = useState<string | null>(null);
    useEffect(() => {
        void (async () => {
            try {
                setEdicoes(await custosService.getEdicoesSelecao());
            } catch (e) {
                setErro(e instanceof Error ? e.message : String(e));
                setEdicoes([]);
            }
        })();
    }, []);

    const criar = async () => {
        if (!novo.nome.trim()) return;
        setCriando(true);
        try {
            const r = await custosService.criarEventoComEdicao({
                nomeEvento: novo.nome.trim(),
                tituloEdicao: `${novo.nome.trim()} ${novo.ano}`,
                ano: Number(novo.ano) || new Date().getFullYear(),
                status: 'simulacao',
            });
            navigate(`/custos/${r.edicao_id}?wizard=1`);
        } finally { setCriando(false); }
    };

    if (edicoes === null) return <LoadingSpinner />;
    return (
        <div className="mx-auto max-w-2xl space-y-4">
            <Card className="p-4">
                <h3 className="mb-2 font-semibold">Novo evento (simulação de custos)</h3>
                <p className="mb-3 text-xs text-slate-500">
                    Cria o evento e o ano juntos — dá para orçar ANTES de decidir se o evento acontece.
                </p>
                <div className="flex gap-2">
                    <input
                        className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
                        placeholder="Nome do evento (ex.: Agroleite Perdizes)"
                        value={novo.nome}
                        onChange={e => setNovo(n => ({ ...n, nome: e.target.value }))}
                    />
                    <input
                        className="w-24 rounded border border-slate-300 px-3 py-2 text-sm"
                        value={novo.ano}
                        onChange={e => setNovo(n => ({ ...n, ano: e.target.value }))}
                    />
                    <Button onClick={() => void criar()} disabled={criando}>Criar</Button>
                </div>
            </Card>
            <Card className="divide-y divide-slate-100 p-0">
                {edicoes.map(ed => (
                    <button key={ed.id}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                        onClick={() => navigate(`/custos/${ed.id}`)}>
                        <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold">{ed.ano}</span>
                        <span className="flex-1">
                            <span className="block text-sm font-medium">{ed.eventoNome}</span>
                            <span className="block text-xs text-slate-400">{ed.titulo}</span>
                        </span>
                        <span className="text-slate-300">→</span>
                    </button>
                ))}
                {edicoes.length === 0 && (
                    <p className="p-4 text-sm text-slate-400">
                        {erro ? `Erro ao carregar: ${erro}` : 'Nenhuma edição ainda — crie acima.'}
                    </p>
                )}
            </Card>
        </div>
    );
};

const Workspace: React.FC<{ edicaoId: string }> = ({ edicaoId }) => {
    const cc = useCentroCusto(edicaoId);
    const [aba, setAba] = useState<Aba>('grade');
    const [wizardAberto, setWizardAberto] = useState(
        () => new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('wizard') === '1',
    );

    const slugParaId = useMemo(
        () => Object.fromEntries(cc.categorias.map(c => [c.slug, c.id])),
        [cc.categorias],
    );
    const slugParaSecao = useMemo(
        () => Object.fromEntries(cc.secoes.map(s => [s.slug, s.id])),
        [cc.secoes],
    );

    // Sem perfil ainda → o wizard é o caminho natural
    useEffect(() => {
        if (!cc.carregando && !cc.perfil && cc.itens.length === 0) setWizardAberto(true);
    }, [cc.carregando, cc.perfil, cc.itens.length]);

    if (cc.carregando) return <LoadingSpinner />;
    if (cc.erro) return <p className="p-4 text-sm text-red-600">Erro: {cc.erro}</p>;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                {([
                    ['grade', `Grade (${cc.itens.length})`],
                    ['cotacoes', `Cotações (${cc.pedidos.length})`],
                    ['pagamentos', `Pagamentos (${cc.pagamentos.length})`],
                    ['espacos', 'Espaços'],
                    ['dashboard', 'Dashboard'],
                ] as [Aba, string][]).map(([id, rotulo]) => (
                    <button key={id}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium ${aba === id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        onClick={() => setAba(id)}>
                        {rotulo}
                    </button>
                ))}
                <Button variant="outline" className="ml-auto" onClick={() => setWizardAberto(true)}>
                    ☑ Reabrir questionário
                </Button>
            </div>

            {aba === 'grade' && (
                <GradeCustos
                    itens={cc.itens}
                    categorias={cc.categorias}
                    compostos={cc.compostos}
                    secoes={cc.secoes}
                    onCriar={cc.criarItem}
                    onCriarLote={cc.criarItensEmLote}
                    onAtualizar={cc.atualizarItem}
                    onExcluir={cc.excluirItem}
                />
            )}
            {aba === 'cotacoes' && (
                <CotacoesTab
                    itens={cc.itens}
                    categorias={cc.categorias}
                    compostos={cc.compostos}
                    fornecedores={cc.fornecedores}
                    pedidos={cc.pedidos}
                    onSalvarFornecedor={cc.salvarFornecedor}
                    onCriarPedido={cc.criarPedido}
                    onImportarCotacao={cc.importarCotacao}
                    onContratar={cc.contratarLinha}
                />
            )}
            {aba === 'pagamentos' && (
                <PagamentosTab
                    pagamentos={cc.pagamentos}
                    pedidos={cc.pedidos}
                    onCriarParcelas={cc.criarParcelas}
                    onMarcarPago={cc.marcarPago}
                />
            )}
            {aba === 'espacos' && (
                <EspacosTab
                    templates={cc.templates}
                    categorias={cc.categorias}
                    onAddItem={cc.addTemplateItem}
                    onUpdateItem={cc.updateTemplateItem}
                    onDeleteItem={cc.deleteTemplateItem}
                    onCreateTemplate={cc.createTemplate}
                    onInstanciar={cc.instanciarTemplate}
                />
            )}
            {aba === 'dashboard' && (
                <DashboardTab
                    itens={cc.itens}
                    compostos={cc.compostos}
                    categorias={cc.categorias}
                    realizadoPagamentos={cc.pagamentos
                        .filter(p => p.status === 'pago')
                        .reduce((s, p) => s + Number(p.valor), 0)}
                />
            )}

            <WizardEvento
                aberto={wizardAberto}
                onFechar={() => setWizardAberto(false)}
                dataEventoISO={null}
                perfilAtual={cc.perfil}
                respostas={cc.respostas}
                templates={cc.templates}
                categorias={cc.categorias}
                onSalvarPerfil={cc.salvarPerfil}
                onSalvarResposta={cc.salvarResposta}
                onInstanciarTemplate={cc.instanciarTemplate}
                onCriarItemAvulso={async p => {
                    await cc.criarItem({
                        descricao: p.descricao,
                        quantidade: p.quantidade,
                        categoria_id: slugParaId[p.categoriaSlug] ?? null,
                        secao_id: slugParaSecao[p.secaoSlug] ?? null,
                        prazo_limite: p.prazoLimite,
                        avulso: p.avulso,
                        alocacao: 'verba_fechada',
                    });
                }}
            />
        </div>
    );
};

const CentroCusto: React.FC = () => {
    const { edicaoId } = useParams<{ edicaoId: string }>();
    return (
        <Layout title="Centro de Custo do Evento">
            {edicaoId ? <Workspace edicaoId={edicaoId} /> : <SeletorEdicao />}
        </Layout>
    );
};

export default CentroCusto;
