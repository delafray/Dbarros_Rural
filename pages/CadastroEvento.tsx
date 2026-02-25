import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Button } from '../components/UI';
import { eventosService, Evento, EventoEdicao } from '../services/eventosService';

type TabType = 'dados' | 'edicoes';

const CadastroEvento: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabType>('dados');
    const [eventoId, setEventoId] = useState<string | null>(id || null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [dados, setDados] = useState<Partial<Evento>>({
        nome: '',
        promotor_nome: '',
        promotor_email: '',
        promotor_telefone: '',
        promotor_endereco: '',
        promotor_redes_sociais: {}
    });

    const [edicoes, setEdicoes] = useState<EventoEdicao[]>([]);

    useEffect(() => {
        if (id) {
            fetchEvento(id);
        }
    }, [id]);

    const fetchEvento = async (uid: string) => {
        try {
            setIsLoading(true);
            const data = await eventosService.getEventoById(uid);
            if (data) {
                const { eventos_edicoes, ...eventoData } = data as any;
                setDados(eventoData);
                setEdicoes(eventos_edicoes || []);
            }
        } catch (error) {
            console.error('Erro ao buscar evento:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchEdicoes = async (uid: string) => {
        try {
            const data = await eventosService.getEdicoes(uid);
            setEdicoes(data);
        } catch (error) {
            console.error('Erro ao buscar edições:', error);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setDados({ ...dados, [e.target.name]: e.target.value });
    };

    const handleSaveEvento = async () => {
        try {
            setIsSaving(true);
            const savedEvento = await eventosService.saveEvento(dados);
            setEventoId(savedEvento.id);
            setDados(savedEvento);

            if (!id) {
                navigate(`/eventos/editar/${savedEvento.id}`, { replace: true });
            }
            alert('Evento salvo com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar evento:', error);
            alert('Erro ao salvar evento.');
        } finally {
            setIsSaving(false);
        }
    };

    const [editingEdicao, setEditingEdicao] = useState<Partial<EventoEdicao> | null>(null);

    const handleEditEdicao = (edicao: Partial<EventoEdicao>) => {
        setEditingEdicao(edicao);
    };

    const handleSaveEdicao = async () => {
        if (!eventoId || !editingEdicao) return;
        if (!editingEdicao.ano || !editingEdicao.titulo) {
            alert('Ano e Título são obrigatórios.');
            return;
        }

        try {
            setIsSaving(true);
            await eventosService.saveEdicao({
                ...editingEdicao,
                evento_id: eventoId
            });
            await fetchEdicoes(eventoId);
            setEditingEdicao(null);
        } catch (error) {
            console.error('Erro ao salvar edição:', error);
            alert('Erro ao salvar edição.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteEdicao = async (edicaoId: string) => {
        if (!confirm('Deseja realmente excluir esta edição?')) return;

        try {
            setIsSaving(true);
            await eventosService.deleteEdicao(edicaoId);
            if (eventoId) await fetchEdicoes(eventoId);
        } catch (error) {
            console.error('Erro ao excluir edição:', error);
            alert('Erro ao excluir edição.');
        } finally {
            setIsSaving(false);
        }
    };

    const isTabLocked = (tab: TabType) => {
        return tab === 'edicoes' && !eventoId;
    };

    return (
        <Layout
            title={id ? `Editar: ${dados.nome}` : "Novo Evento"}
            headerActions={
                <Button variant="secondary" onClick={() => navigate('/eventos')}>
                    Voltar
                </Button>
            }
        >
            <div className="bg-white border border-slate-300 rounded-none shadow-sm overflow-hidden flex flex-col min-h-[600px]">
                {/* Tabs Header */}
                <div className="flex bg-slate-50 border-b border-slate-300">
                    <button
                        onClick={() => { setActiveTab('dados'); setEditingEdicao(null); }}
                        className={`px-6 py-2.5 text-[12px] font-bold uppercase tracking-wider border-r border-slate-300 transition-colors ${activeTab === 'dados' ? 'bg-white text-blue-600 border-b-2 border-b-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                        Dados do Evento
                    </button>
                    <button
                        onClick={() => !isTabLocked('edicoes') && setActiveTab('edicoes')}
                        disabled={isTabLocked('edicoes')}
                        className={`px-6 py-2.5 text-[12px] font-bold uppercase tracking-wider border-r border-slate-300 transition-colors flex items-center gap-2 ${activeTab === 'edicoes' ? 'bg-white text-blue-600 border-b-2 border-b-blue-600' : 'text-slate-500 hover:bg-slate-100'} ${isTabLocked('edicoes') ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isTabLocked('edicoes') && <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>}
                        Edições do Evento
                        <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-none text-[10px]">{edicoes.length}</span>
                    </button>
                </div>

                {/* Tab Content */}
                <div className="p-6 flex-1">
                    {activeTab === 'dados' && (
                        <div className="max-w-4xl space-y-8 animate-in fade-in duration-300">
                            {/* Sessão: Informações Principais */}
                            <section>
                                <h3 className="text-[11px] font-black uppercase tracking-widest text-blue-600 mb-4 border-b border-blue-100 pb-1">Identificação</h3>
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nome do Evento</label>
                                        <input
                                            name="nome"
                                            value={dados.nome || ''}
                                            onChange={handleInputChange}
                                            type="text"
                                            className="w-full border border-slate-300 rounded-none px-3 py-1.5 text-[13px] focus:ring-1 focus:ring-blue-500 outline-none font-semibold text-slate-800"
                                            placeholder="Nome oficial do evento..."
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Sessão: Dados do Promotor */}
                            <section>
                                <h3 className="text-[11px] font-black uppercase tracking-widest text-blue-600 mb-4 border-b border-blue-100 pb-1">Dados do Promotor</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nome / Razão Social</label>
                                        <input
                                            name="promotor_nome"
                                            value={dados.promotor_nome || ''}
                                            onChange={handleInputChange}
                                            type="text"
                                            className="w-full border border-slate-300 rounded-none px-3 py-1.5 text-[13px] focus:ring-1 focus:ring-blue-500 outline-none"
                                            placeholder="Nome do responsável ou empresa organizadora"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">E-mail</label>
                                        <input
                                            name="promotor_email"
                                            value={dados.promotor_email || ''}
                                            onChange={handleInputChange}
                                            type="email"
                                            className="w-full border border-slate-300 rounded-none px-3 py-1.5 text-[13px] focus:ring-1 focus:ring-blue-500 outline-none"
                                            placeholder="email@promotor.com.br"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Telefone</label>
                                        <input
                                            name="promotor_telefone"
                                            value={dados.promotor_telefone || ''}
                                            onChange={handleInputChange}
                                            type="text"
                                            className="w-full border border-slate-300 rounded-none px-3 py-1.5 text-[13px] focus:ring-1 focus:ring-blue-500 outline-none"
                                            placeholder="(00) 00000-0000"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Endereço do Promotor</label>
                                        <input
                                            name="promotor_endereco"
                                            value={dados.promotor_endereco || ''}
                                            onChange={handleInputChange}
                                            type="text"
                                            className="w-full border border-slate-300 rounded-none px-3 py-1.5 text-[13px] focus:ring-1 focus:ring-blue-500 outline-none"
                                            placeholder="Logradouro, número, bairro, cidade - UF"
                                        />
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {activeTab === 'edicoes' && (
                        <div className="animate-in fade-in duration-300">
                            {editingEdicao ? (
                                <div className="border border-blue-200 bg-blue-50/30 p-4 space-y-4">
                                    <div className="flex justify-between items-center border-b border-blue-200 pb-2 mb-4">
                                        <h3 className="text-[12px] font-black uppercase text-blue-700">
                                            {editingEdicao.id ? `Editando Edição: ${editingEdicao.ano}` : 'Nova Edição'}
                                        </h3>
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="secondary" onClick={() => setEditingEdicao(null)}>Cancelar</Button>
                                            <Button size="sm" onClick={handleSaveEdicao} isLoading={isSaving} className="bg-blue-600">Salvar Edição</Button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Ano</label>
                                            <input
                                                type="number"
                                                value={editingEdicao.ano || ''}
                                                onChange={e => setEditingEdicao({ ...editingEdicao, ano: parseInt(e.target.value) })}
                                                className="w-full border border-slate-300 rounded-none px-2 py-1 text-[12px] focus:ring-1 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                        <div className="md:col-span-3">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Título da Edição</label>
                                            <input
                                                type="text"
                                                value={editingEdicao.titulo || ''}
                                                onChange={e => setEditingEdicao({ ...editingEdicao, titulo: e.target.value })}
                                                className="w-full border border-slate-300 rounded-none px-2 py-1 text-[12px] focus:ring-1 focus:ring-blue-500 outline-none font-bold"
                                                placeholder={`Ex: ${dados.nome} ${editingEdicao.ano || ''}`}
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Local (Cidade / UF)</label>
                                            <input
                                                type="text"
                                                value={editingEdicao.local_resumido || ''}
                                                onChange={e => setEditingEdicao({ ...editingEdicao, local_resumido: e.target.value })}
                                                className="w-full border border-slate-300 rounded-none px-2 py-1 text-[12px] focus:ring-1 focus:ring-blue-500 outline-none"
                                                placeholder="Ex: São Paulo / SP"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Local Completo (Pavilhão/Endereço)</label>
                                            <input
                                                type="text"
                                                value={editingEdicao.local_completo || ''}
                                                onChange={e => setEditingEdicao({ ...editingEdicao, local_completo: e.target.value })}
                                                className="w-full border border-slate-300 rounded-none px-2 py-1 text-[12px] focus:ring-1 focus:ring-blue-500 outline-none"
                                                placeholder="Ex: São Paulo Expo - Rod. dos Imigrantes, km 1.5"
                                            />
                                        </div>

                                        {/* Datas do Evento */}
                                        <div className="border-t border-slate-200 mt-2 pt-2 md:col-span-4">
                                            <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2">Cronograma do Evento</h4>
                                        </div>
                                        <div className="md:col-span-1">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Início (Data)</label>
                                            <input
                                                type="date"
                                                value={editingEdicao.data_inicio ? editingEdicao.data_inicio.split('T')[0] : ''}
                                                onChange={e => {
                                                    const date = e.target.value;
                                                    const time = editingEdicao.data_inicio ? editingEdicao.data_inicio.split('T')[1]?.substring(0, 5) || '10:00' : '10:00';
                                                    setEditingEdicao({ ...editingEdicao, data_inicio: `${date}T${time}:00Z` });
                                                }}
                                                className="w-full border border-slate-300 rounded-none px-2 py-1 text-[12px] focus:ring-1 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                        <div className="md:col-span-1">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Início (Hora)</label>
                                            <input
                                                type="time"
                                                value={editingEdicao.data_inicio ? editingEdicao.data_inicio.split('T')[1]?.substring(0, 5) || '' : ''}
                                                onChange={e => {
                                                    const time = e.target.value;
                                                    const date = editingEdicao.data_inicio ? editingEdicao.data_inicio.split('T')[0] : new Date().toISOString().split('T')[0];
                                                    setEditingEdicao({ ...editingEdicao, data_inicio: `${date}T${time}:00Z` });
                                                }}
                                                className="w-full border border-slate-300 rounded-none px-2 py-1 text-[12px] focus:ring-1 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                        <div className="md:col-span-1">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fim (Data)</label>
                                            <input
                                                type="date"
                                                value={editingEdicao.data_fim ? editingEdicao.data_fim.split('T')[0] : ''}
                                                onChange={e => {
                                                    const date = e.target.value;
                                                    const time = editingEdicao.data_fim ? editingEdicao.data_fim.split('T')[1]?.substring(0, 5) || '18:00' : '18:00';
                                                    setEditingEdicao({ ...editingEdicao, data_fim: `${date}T${time}:00Z` });
                                                }}
                                                className="w-full border border-slate-300 rounded-none px-2 py-1 text-[12px] focus:ring-1 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                        <div className="md:col-span-1">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fim (Hora)</label>
                                            <input
                                                type="time"
                                                value={editingEdicao.data_fim ? editingEdicao.data_fim.split('T')[1]?.substring(0, 5) || '' : ''}
                                                onChange={e => {
                                                    const time = e.target.value;
                                                    const date = editingEdicao.data_fim ? editingEdicao.data_fim.split('T')[0] : new Date().toISOString().split('T')[0];
                                                    setEditingEdicao({ ...editingEdicao, data_fim: `${date}T${time}:00Z` });
                                                }}
                                                className="w-full border border-slate-300 rounded-none px-2 py-1 text-[12px] focus:ring-1 focus:ring-blue-500 outline-none"
                                            />
                                        </div>

                                        {/* Montagem e Desmontagem */}
                                        <div className="border-t border-slate-200 mt-2 pt-2 md:col-span-4">
                                            <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2">Montagem e Desmontagem (Apenas Data)</h4>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Início Montagem</label>
                                            <input
                                                type="date"
                                                value={editingEdicao.montagem_inicio ? editingEdicao.montagem_inicio.split('T')[0] : ''}
                                                onChange={e => setEditingEdicao({ ...editingEdicao, montagem_inicio: e.target.value ? `${e.target.value}T10:00:00Z` : null })}
                                                className="w-full border border-slate-300 rounded-none px-2 py-1 text-[12px] focus:ring-1 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fim Montagem</label>
                                            <input
                                                type="date"
                                                value={editingEdicao.montagem_fim ? editingEdicao.montagem_fim.split('T')[0] : ''}
                                                onChange={e => setEditingEdicao({ ...editingEdicao, montagem_fim: e.target.value ? `${e.target.value}T18:00:00Z` : null })}
                                                className="w-full border border-slate-300 rounded-none px-2 py-1 text-[12px] focus:ring-1 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Início Desmontagem</label>
                                            <input
                                                type="date"
                                                value={editingEdicao.desmontagem_inicio ? editingEdicao.desmontagem_inicio.split('T')[0] : ''}
                                                onChange={e => setEditingEdicao({ ...editingEdicao, desmontagem_inicio: e.target.value ? `${e.target.value}T10:00:00Z` : null })}
                                                className="w-full border border-slate-300 rounded-none px-2 py-1 text-[12px] focus:ring-1 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fim Desmontagem</label>
                                            <input
                                                type="date"
                                                value={editingEdicao.desmontagem_fim ? editingEdicao.desmontagem_fim.split('T')[0] : ''}
                                                onChange={e => setEditingEdicao({ ...editingEdicao, desmontagem_fim: e.target.value ? `${e.target.value}T18:00:00Z` : null })}
                                                className="w-full border border-slate-300 rounded-none px-2 py-1 text-[12px] focus:ring-1 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-[12px] font-bold text-slate-700 uppercase">Lista de Edições (Anuais)</h3>
                                        <Button size="sm" onClick={() => setEditingEdicao({ ano: new Date().getFullYear(), titulo: `${dados.nome} ${new Date().getFullYear()}` })} isLoading={isSaving}>
                                            Adicionar Edição
                                        </Button>
                                    </div>

                                    <div className="border border-slate-300">
                                        <table className="w-full border-collapse">
                                            <thead>
                                                <tr className="bg-slate-100 text-[11px] font-bold uppercase text-slate-600">
                                                    <th className="px-3 py-1 border-b border-r border-slate-300 text-left">Ano</th>
                                                    <th className="px-3 py-1 border-b border-r border-slate-300 text-left">Título da Edição</th>
                                                    <th className="px-3 py-1 border-b border-r border-slate-300 text-left">Local</th>
                                                    <th className="px-3 py-1 border-b border-r border-slate-300 text-left">Período</th>
                                                    <th className="px-3 py-1 border-b border-slate-300 text-right">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {edicoes.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="px-3 py-8 text-center text-slate-400 text-[12px]">Nenhuma edição cadastrada.</td>
                                                    </tr>
                                                ) : (
                                                    edicoes.map(ed => (
                                                        <tr key={ed.id} className="hover:bg-slate-50 even:bg-slate-100/50 text-[12px]">
                                                            <td className="px-3 py-1 border-b border-r border-slate-300 font-bold">{ed.ano}</td>
                                                            <td className="px-3 py-1 border-b border-r border-slate-300">{ed.titulo}</td>
                                                            <td className="px-3 py-1 border-b border-r border-slate-300">{ed.local_resumido || '-'}</td>
                                                            <td className="px-3 py-1 border-b border-r border-slate-300">
                                                                {ed.data_inicio ? new Date(ed.data_inicio).toLocaleDateString('pt-BR') : '-'} a {ed.data_fim ? new Date(ed.data_fim).toLocaleDateString('pt-BR') : '-'}
                                                            </td>
                                                            <td className="px-3 py-1 border-b border-slate-300 text-right">
                                                                <div className="flex justify-end gap-1 items-center">
                                                                    <button
                                                                        onClick={() => navigate(`/configuracao-vendas/${ed.id}`)}
                                                                        className="px-2 py-0.5 text-[10px] font-bold border border-blue-200 text-blue-600 hover:bg-blue-50"
                                                                        title="Configurar Planilha de Vendas"
                                                                    >
                                                                        CONFIGURAR
                                                                    </button>
                                                                    <button
                                                                        onClick={() => navigate(`/planilha-vendas/${ed.id}`)}
                                                                        className="px-2 py-0.5 text-[10px] font-bold border border-green-200 text-green-600 hover:bg-green-50"
                                                                        title="Ver Planilha de Vendas"
                                                                    >
                                                                        PLANILHA
                                                                    </button>
                                                                    <div className="w-4"></div>
                                                                    <button
                                                                        onClick={() => handleEditEdicao(ed)}
                                                                        className="p-1 text-slate-400 hover:text-blue-600"
                                                                        title="Editar Edição"
                                                                    >
                                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                                        </svg>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteEdicao(ed.id)}
                                                                        className="p-1 text-slate-400 hover:text-red-600"
                                                                        title="Excluir Edição"
                                                                    >
                                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                        </svg>
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Barra de Ações */}
                <div className="p-4 bg-slate-50 border-t border-slate-300 flex justify-end gap-3">
                    <Button variant="secondary" onClick={() => navigate('/eventos')}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSaveEvento} isLoading={isSaving} className="bg-green-600 hover:bg-green-700">
                        {id ? 'Salvar Alterações' : 'Criar Evento'}
                    </Button>
                </div>
            </div>
        </Layout>
    );
};

export default CadastroEvento;
