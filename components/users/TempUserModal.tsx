import React, { useEffect } from 'react';
import { Modal, Button } from '../UI';
import { User } from '../../services/authService';
import { TempUserModalProps } from './types';
import { useTempUserFlow } from '../../hooks/useTempUserFlow';

export const TempUserModal: React.FC<TempUserModalProps> = ({
    isOpen,
    onClose,
    users,
    edicoesAtivas,
    formLoading,
    setFormLoading,
    onCreated,
    showAlert,
}) => {
    const {
        tempExpiresAt,
        setTempExpiresAt,
        tempEdicaoId,
        createdTempUser,
        existingTempForEdicao,
        setExistingTempForEdicao,
        confirmCreateAnother,
        setConfirmCreateAnother,
        whatsappCopied,
        reset,
        handleEdicaoChange,
        handleCreateTempUser,
        handleCopyTempUser,
        handleCopyExistingWhatsapp,
    } = useTempUserFlow({
        users,
        edicoesAtivas,
        formLoading,
        setFormLoading,
        onCreated,
        showAlert,
    });

    // Abre sempre limpo — o código original resetava os estados no clique de
    // "Gerar Temp."; isso garante o mesmo contrato mesmo se algum caminho de
    // fechamento não passar pelo handleClose.
    useEffect(() => {
        if (isOpen) reset();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const handleClose = () => {
        reset();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Acesso Temporário">
            {createdTempUser ? (
                <div className="space-y-6">
                    {/* Header Minimalista */}
                    <div className="pb-4 border-b border-slate-100">
                        <h3 className="text-[13px] font-black uppercase tracking-widest text-slate-900 leading-tight">
                            Acesso Criado com Sucesso
                        </h3>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                            Compartilhe as credenciais abaixo com o visitante.
                        </p>
                    </div>

                    {/* Credenciais Individuais */}
                    <div className="grid grid-cols-1 gap-3">
                        {/* Login */}
                        <div className="group relative">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Login de Acesso</label>
                            <div className="flex bg-slate-50 border-2 border-slate-200 focus-within:border-slate-400 transition-all p-1">
                                <code className="flex-1 px-3 py-2 text-sm font-black text-slate-800 break-all select-all">
                                    {createdTempUser.user.email.replace('@temp.local', '')}
                                </code>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(createdTempUser.user.email.replace('@temp.local', ''));
                                        showAlert('Sucesso', 'Login copiado!', 'success');
                                    }}
                                    className="p-2 text-slate-400 hover:text-slate-900 transition-colors"
                                    title="Copiar login"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Senha */}
                        <div className="group relative">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Senha Temporária</label>
                            <div className="flex bg-slate-50 border-2 border-slate-200 focus-within:border-slate-400 transition-all p-1">
                                <code className="flex-1 px-3 py-2 text-sm font-black text-slate-800 tracking-wider select-all">
                                    {createdTempUser.passwordRaw}
                                </code>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(createdTempUser.passwordRaw);
                                        showAlert('Sucesso', 'Senha copiada!', 'success');
                                    }}
                                    className="p-2 text-slate-400 hover:text-slate-900 transition-colors"
                                    title="Copiar senha"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Grid Validade + Site */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-amber-50 border-2 border-amber-100 p-3 flex flex-col justify-center">
                            <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-0.5">Expira em</span>
                            <span className="text-sm font-black text-amber-900 uppercase">
                                {new Date(createdTempUser.user.expiresAt!).toLocaleDateString('pt-BR')}
                            </span>
                        </div>
                        <div className="bg-blue-50 border-2 border-blue-100 p-3 flex flex-col justify-center">
                            <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-0.5">Endereço de Acesso</span>
                            <span className="text-[11px] font-black text-blue-800 leading-none">
                                dbarros.vercel.app
                            </span>
                        </div>
                    </div>

                    {/* Botões de Ação Final */}
                    <div className="flex flex-col gap-2 pt-2">
                        <button
                            onClick={handleCopyTempUser}
                            className={`w-full py-4 text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg ${whatsappCopied ? 'bg-green-500 shadow-green-200' : 'bg-slate-900 shadow-slate-200 hover:bg-slate-950'} text-white`}
                        >
                            {whatsappCopied ? (
                                <>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Copiado!
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    Copiar texto para WhatsApp
                                </>
                            )}
                        </button>
                        {whatsappCopied && (
                            <p className="text-center text-[11px] text-green-600 font-bold animate-pulse">
                                ✅ Texto copiado! Abra o WhatsApp e cole no contato que quiser.
                            </p>
                        )}
                        <button
                            onClick={handleClose}
                            className="w-full py-3 bg-white text-slate-500 hover:text-slate-800 text-[10px] font-black uppercase tracking-widest transition-colors"
                        >
                            Fechar Janela
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-5">
                    <p className="text-slate-500 text-sm">
                        Visitante temporário com acesso <strong>somente leitura</strong> à planilha e atendimentos de uma edição.
                    </p>

                    <div className="space-y-1.5">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Edição do Evento</label>
                        <select
                            value={tempEdicaoId}
                            onChange={e => handleEdicaoChange(e.target.value)}
                            className="w-full bg-slate-50 border-2 border-slate-200 focus:border-blue-600 text-sm font-bold text-slate-800 p-3 rounded-none outline-none transition-all"
                        >
                            <option value="">Selecione uma edição...</option>
                            {edicoesAtivas.map(ed => {
                                const fmtData = (d: string | null) => {
                                    if (!d) return '';
                                    const dt = new Date(d);
                                    return `${String(dt.getUTCDate()).padStart(2, '0')}/${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
                                };
                                const periodo = ed.data_inicio
                                    ? ed.data_fim
                                        ? ` · ${fmtData(ed.data_inicio)}–${fmtData(ed.data_fim)}`
                                        : ` · ${fmtData(ed.data_inicio)}`
                                    : '';
                                return (
                                    <option key={ed.id} value={ed.id}>{ed.titulo}{periodo}</option>
                                );
                            })}
                        </select>
                    </div>

                    {/* Aviso: já existe visitante ativo para esta edição */}
                    {existingTempForEdicao && !confirmCreateAnother && (
                        <div className="border-2 border-amber-300 bg-amber-50 p-4 space-y-4">
                            {/* Cabeçalho do aviso */}
                            <div className="flex items-start gap-2">
                                <span className="text-amber-500 text-lg leading-none flex-shrink-0">⚠️</span>
                                <div>
                                    <p className="text-xs font-black text-amber-800 uppercase tracking-wide">Já existe um visitante ativo para esta edição</p>
                                    <p className="text-[11px] text-amber-700 mt-0.5">O acesso abaixo já foi gerado anteriormente e ainda está válido.</p>
                                </div>
                            </div>

                            {/* Credenciais */}
                            <div className="bg-white border border-amber-200 p-3 space-y-2 text-xs font-mono">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 font-sans font-bold uppercase text-[10px]">Usuário:</span>
                                    <div className="flex items-center gap-2">
                                        <code className="text-slate-800 font-black">{existingTempForEdicao.email.replace('@temp.local', '')}</code>
                                        <button onClick={() => { navigator.clipboard.writeText(existingTempForEdicao.email.replace('@temp.local', '')); showAlert('Copiado', 'Login copiado!', 'success'); }} className="text-[10px] text-blue-600 hover:underline font-sans">Copiar</button>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 font-sans font-bold uppercase text-[10px]">Senha:</span>
                                    <div className="flex items-center gap-2">
                                        {existingTempForEdicao.tempPasswordPlain ? (
                                            <>
                                                <code className="text-slate-800 font-black tracking-wider">{existingTempForEdicao.tempPasswordPlain}</code>
                                                <button onClick={() => { navigator.clipboard.writeText(existingTempForEdicao.tempPasswordPlain!); showAlert('Copiado', 'Senha copiada!', 'success'); }} className="text-[10px] text-blue-600 hover:underline font-sans">Copiar</button>
                                            </>
                                        ) : (
                                            <span className="text-slate-400 italic font-sans text-[10px]">não disponível — crie novo acesso</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 font-sans font-bold uppercase text-[10px]">Expira em:</span>
                                    <code className="text-amber-700 font-black">{existingTempForEdicao.expiresAt ? new Date(existingTempForEdicao.expiresAt).toLocaleDateString('pt-BR') : '—'}</code>
                                </div>
                            </div>

                            {/* Botão principal: copiar tudo */}
                            <div className="space-y-1">
                                <button
                                    onClick={() => {
                                        const edicaoNome = edicoesAtivas.find(e => e.id === tempEdicaoId)?.titulo ?? '';
                                        handleCopyExistingWhatsapp(existingTempForEdicao, edicaoNome);
                                    }}
                                    className={`w-full flex items-center justify-center gap-2 py-3 text-xs font-black text-white transition-colors ${whatsappCopied ? 'bg-green-500' : 'bg-slate-800 hover:bg-slate-950'}`}
                                >
                                    {whatsappCopied ? (
                                        <>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                            Copiado!
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                            Copiar texto para WhatsApp
                                        </>
                                    )}
                                </button>
                                <p className={`text-[10px] text-center font-bold animate-pulse transition-colors ${whatsappCopied ? 'text-green-600' : 'text-slate-500'}`}>
                                    {whatsappCopied ? '✅ Texto copiado! Abra o WhatsApp e cole no contato que quiser.' : 'Clique para copiar. Depois abra o WhatsApp e cole a mensagem pronta.'}
                                </p>
                            </div>

                            {/* Ações secundárias */}
                            <div className="border-t border-amber-200 pt-3 space-y-2">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Ou escolha outra ação:</p>
                                <div className="flex gap-2 flex-wrap">
                                    <button onClick={() => { setExistingTempForEdicao(null); handleEdicaoChange(''); }} className="flex-1 text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-2 border border-slate-300 hover:border-slate-500 transition-colors text-center">
                                        OK, entendido
                                    </button>
                                    <button onClick={() => setConfirmCreateAnother(true)} className="flex-1 text-xs font-black text-white bg-amber-500 hover:bg-amber-600 px-3 py-2 transition-colors text-center">
                                        Gerar novo acesso
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400 text-center">"Gerar novo acesso" cria um segundo visitante — o anterior continua ativo.</p>
                            </div>
                        </div>
                    )}

                    {/* Formulário de data — só aparece se não há conflito ou usuário confirmou criar outro */}
                    {(!existingTempForEdicao || confirmCreateAnother) && tempEdicaoId && (
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Data Limite de Acesso</label>
                            <input
                                type="date"
                                value={tempExpiresAt}
                                onChange={e => setTempExpiresAt(e.target.value)}
                                className="w-full bg-slate-50 border-2 border-slate-200 focus:border-blue-600 text-sm font-bold text-slate-800 p-3 rounded-none outline-none transition-all"
                            />
                        </div>
                    )}

                    <div className="pt-2 flex justify-end gap-3">
                        <Button variant="outline" onClick={handleClose}>Cancelar</Button>
                        {(!existingTempForEdicao || confirmCreateAnother) && (
                            <Button
                                onClick={handleCreateTempUser}
                                disabled={formLoading || !tempExpiresAt || !tempEdicaoId}
                                className="px-8"
                            >
                                {formLoading ? 'Gerando...' : 'Gerar Acesso'}
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </Modal>
    );
};
